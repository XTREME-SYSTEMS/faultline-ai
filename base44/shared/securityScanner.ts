import { fetchPage, extractData, detectTechStack } from './scraper.ts';

// Shared security scanning logic — used by both deepSecurityScan and the pipeline orchestrator.
export async function runSecurityScan(base44, orgId, companyId) {
  const company = await base44.asServiceRole.entities.Company.get(companyId);
  if (!company || company.organization_id !== orgId) throw new Error('Company not found');

  const websites = await base44.asServiceRole.entities.Website.filter({ organization_id: orgId, company_id: companyId });
  if (websites.length === 0) throw new Error('No website found for company');
  const website = websites[0];
  const url = website.url;

  const findings = [];

  let homeRes = { ok: false };
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FaultLine-AI-SecurityScanner/1.0' },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow'
    });
    const html = await res.text();
    homeRes = { ok: true, html, status: res.status, headers: Object.fromEntries(res.headers.entries()) };
  } catch (e) {
    findings.push({ title: 'Website Unreachable', category: 'security', severity: 'critical', description: `The website could not be reached: ${e.message}`, business_impact: 'An unreachable site means no leads, no sales, and damaged trust.', recommended_repair: 'Check DNS, server status, and firewall rules immediately.', confidence: 100 });
  }

  if (homeRes.ok) {
    const headers = homeRes.headers || {};
    const extracted = extractData(homeRes.html, url);
    const techStack = detectTechStack(homeRes.html);

    const securityHeaders = [
      { key: 'content-security-policy', name: 'Content-Security-Policy', severity: 'high', impact: 'Without CSP, the site is vulnerable to XSS and data injection attacks.', fix: 'Implement a Content-Security-Policy header to restrict script sources.' },
      { key: 'strict-transport-security', name: 'Strict-Transport-Security (HSTS)', severity: 'high', impact: 'Without HSTS, users can be downgraded to insecure HTTP connections.', fix: 'Add the Strict-Transport-Security header to enforce HTTPS.' },
      { key: 'x-frame-options', name: 'X-Frame-Options', severity: 'medium', impact: 'Without X-Frame-Options, the site can be embedded by attackers for clickjacking.', fix: 'Add X-Frame-Options: DENY or SAMEORIGIN header.' },
      { key: 'x-content-type-options', name: 'X-Content-Type-Options', severity: 'medium', impact: 'Without this, browsers may MIME-sniff responses, enabling content-type attacks.', fix: 'Add X-Content-Type-Options: nosniff header.' },
      { key: 'referrer-policy', name: 'Referrer-Policy', severity: 'low', impact: 'Referrer data may leak to third parties, exposing internal URLs.', fix: 'Set a Referrer-Policy header (e.g. strict-origin-when-cross-origin).' },
      { key: 'permissions-policy', name: 'Permissions-Policy', severity: 'low', impact: 'Browser features (camera, mic, geolocation) are not restricted.', fix: 'Add a Permissions-Policy header to restrict sensitive browser features.' }
    ];

    for (const h of securityHeaders) {
      if (!headers[h.key] && !headers[h.key.replace(/-/g, '_')]) {
        findings.push({ title: `Missing ${h.name} Header`, category: 'security', severity: h.severity, description: `The ${h.name} security header is not set. ${h.impact}`, business_impact: h.impact, recommended_repair: h.fix, confidence: 95 });
      }
    }

    if (!url.startsWith('https://')) {
      findings.push({ title: 'No SSL/HTTPS Encryption', category: 'security', severity: 'critical', description: 'The website is not served over HTTPS.', business_impact: 'Browsers flag the site as "Not Secure". Customer data is exposed to interception.', recommended_repair: 'Install an SSL certificate and force HTTPS redirects.', confidence: 100 });
    }

    const sensitivePaths = ['/wp-admin/', '/admin', '/.git/config', '/.env', '/wp-config.php', '/phpinfo.php', '/.DS_Store', '/backup/', '/.htaccess'];
    const pathChecks = await Promise.all(sensitivePaths.map(async (p) => {
      try {
        const checkUrl = new URL(p, url).href;
        const res = await fetch(checkUrl, { method: 'GET', headers: { 'User-Agent': 'FaultLine-AI-SecurityScanner/1.0' }, signal: AbortSignal.timeout(8000), redirect: 'follow' });
        return { path: p, status: res.status, ok: res.ok };
      } catch { return { path: p, status: 0, ok: false }; }
    }));

    for (const check of pathChecks) {
      if (check.ok && check.status === 200) {
        const isGit = check.path.includes('.git');
        const isEnv = check.path.includes('.env');
        const isAdmin = check.path.includes('admin') || check.path.includes('wp-admin');
        const isConfig = check.path.includes('config') || check.path.includes('htaccess');
        if (isGit || isEnv || isConfig) {
          findings.push({ title: `Exposed Sensitive File: ${check.path}`, category: 'security', severity: 'critical', description: `The path ${check.path} is publicly accessible.`, business_impact: 'Attackers can read credentials and source code — leading to full system compromise.', recommended_repair: `Restrict access to ${check.path} via server configuration.`, confidence: 98 });
        } else if (isAdmin) {
          findings.push({ title: `Exposed Admin Panel: ${check.path}`, category: 'security', severity: 'high', description: `The admin panel at ${check.path} is publicly accessible.`, business_impact: 'Brute-force attacks on admin panels are a leading cause of site takeovers.', recommended_repair: 'Add IP restrictions, 2FA, and rate limiting to the admin panel.', confidence: 85 });
        }
      }
    }

    const formMatches = homeRes.html.match(/<form[^>]*>/gi) || [];
    for (const formTag of formMatches.slice(0, 5)) {
      const actionMatch = formTag.match(/action=["']([^"']*)["']/i);
      const action = actionMatch ? actionMatch[1] : '';
      if (action && action.startsWith('http://') && url.startsWith('https://')) {
        findings.push({ title: 'Insecure Form Submission (Mixed Protocol)', category: 'security', severity: 'high', description: `A form submits to ${action} over HTTP while the site uses HTTPS.`, business_impact: 'Form data including passwords is sent unencrypted.', recommended_repair: 'Update all form actions to use HTTPS URLs.', confidence: 90 });
      }
    }

    if (techStack.includes('WordPress')) {
      const versionMatch = homeRes.html.match(/wp-includes\/[^?]*\?ver=([0-9.]+)/i);
      if (versionMatch) {
        const ver = parseFloat(versionMatch[1]);
        if (ver < 6.0) {
          findings.push({ title: `Outdated WordPress Version (${versionMatch[1]})`, category: 'security', severity: 'high', description: `WordPress version ${versionMatch[1]} was detected.`, business_impact: 'Outdated WordPress is the #1 cause of website compromises.', recommended_repair: 'Update WordPress to the latest version immediately.', confidence: 88 });
        }
      }
    }

    const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
    const internalLinks = [];
    let m;
    while ((m = linkRegex.exec(homeRes.html)) !== null) {
      try {
        const fullUrl = new URL(m[1], url).href;
        if (fullUrl.startsWith(url.replace(/\/$/, '').split('#')[0])) internalLinks.push(fullUrl);
      } catch {}
    }
    const uniqueLinks = [...new Set(internalLinks)].slice(0, 8);
    const linkChecks = await Promise.all(uniqueLinks.map(async (l) => {
      try { const res = await fetch(l, { method: 'HEAD', headers: { 'User-Agent': 'FaultLine-AI-SecurityScanner/1.0' }, signal: AbortSignal.timeout(8000) }); return { url: l, status: res.status }; }
      catch { return { url: l, status: 0 }; }
    }));
    const brokenLinks = linkChecks.filter(c => c.status === 404 || c.status === 0);
    if (brokenLinks.length > 0) {
      findings.push({ title: `${brokenLinks.length} Broken Internal Link${brokenLinks.length > 1 ? 's' : ''}`, category: 'technical', severity: 'medium', description: `Found ${brokenLinks.length} broken internal link(s).`, business_impact: 'Broken links hurt SEO rankings and reduce conversions.', recommended_repair: 'Fix or redirect broken links. Set up 301 redirects.', confidence: 92 });
    }

    if (!extracted.hasAnalytics) {
      findings.push({ title: 'No Web Analytics Installed', category: 'operations', severity: 'high', description: 'No web analytics was detected on the site.', business_impact: 'Without analytics, the company is blind to traffic sources and conversion rates.', recommended_repair: 'Install Google Analytics 4. Set up conversion tracking.', confidence: 95 });
    }
  }

  const audit = await base44.asServiceRole.entities.Audit.create({
    organization_id: orgId, company_id: companyId, audit_type: 'deep_security_scan',
    title: `Deep Security Scan — ${company.name}`, status: 'completed',
    scope: { url, findings_count: findings.length, scan_type: 'deep_security' }
  });

  for (const f of findings) {
    await base44.asServiceRole.entities.Finding.create({
      organization_id: orgId, audit_id: audit.id, title: f.title, description: f.description,
      category: f.category, severity: f.severity,
      evidence_state: f.confidence >= 85 ? 'verified' : f.confidence >= 60 ? 'supported_inference' : 'needs_review',
      confidence: f.confidence, business_impact: f.business_impact, recommended_repair: f.recommended_repair, approval_status: 'pending'
    });
  }

  const healthScore = Math.max(0, 100 - findings.reduce((s, f) => s + (f.severity === 'critical' ? 12 : f.severity === 'high' ? 6 : f.severity === 'medium' ? 3 : 1), 0));
  await base44.asServiceRole.entities.ScanSnapshot.create({
    organization_id: orgId, company_id: companyId, audit_id: audit.id,
    health_score: healthScore, finding_count: findings.length,
    critical_count: findings.filter(f => f.severity === 'critical').length, scanned_at: new Date().toISOString()
  });

  return { audit_id: audit.id, findings_created: findings.length, health_score: healthScore, findings };
}