import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { fetchPage, extractData, detectTechStack } from '../../shared/scraper.ts';

// Deep security scan: checks security headers, SSL health, broken links,
// exposed sensitive paths, form security, and CMS version exposure.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found on user profile' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const companyId = body.company_id;
    if (!companyId) return Response.json({ error: 'company_id required' }, { status: 400 });

    const company = await base44.asServiceRole.entities.Company.get(companyId);
    if (!company || company.organization_id !== orgId) return Response.json({ error: 'Company not found' }, { status: 404 });

    const websites = await base44.asServiceRole.entities.Website.filter({ organization_id: orgId, company_id: companyId });
    if (websites.length === 0) return Response.json({ error: 'No website found for company' }, { status: 400 });
    const website = websites[0];
    const url = website.url;

    const findings: any[] = [];

    // Phase 1: Fetch homepage with response headers
    let homeRes: any = { ok: false };
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'FaultLine-AI-SecurityScanner/1.0' },
        signal: AbortSignal.timeout(15000),
        redirect: 'follow'
      });
      const html = await res.text();
      homeRes = { ok: true, html, status: res.status, headers: Object.fromEntries(res.headers.entries()) };
    } catch (e: any) {
      findings.push({ title: 'Website Unreachable', category: 'security', severity: 'critical', description: `The website could not be reached during the security scan: ${e.message}`, business_impact: 'An unreachable site means no leads, no sales, and damaged trust.', recommended_repair: 'Check DNS, server status, and firewall rules immediately.', confidence: 100 });
    }

    if (homeRes.ok) {
      const headers = homeRes.headers || {};
      const extracted = extractData(homeRes.html, url);
      const techStack = detectTechStack(homeRes.html);

      // Phase 2: Check security headers
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
          findings.push({
            title: `Missing ${h.name} Header`,
            category: 'security',
            severity: h.severity,
            description: `The ${h.name} security header is not set. ${h.impact}`,
            business_impact: h.impact,
            recommended_repair: h.fix,
            confidence: 95
          });
        }
      }

      // Phase 3: SSL check
      if (!url.startsWith('https://')) {
        findings.push({
          title: 'No SSL/HTTPS Encryption',
          category: 'security',
          severity: 'critical',
          description: 'The website is not served over HTTPS. All data between visitors and the server is transmitted in plaintext.',
          business_impact: 'Browsers flag the site as "Not Secure", destroying trust. Google ranks HTTPS sites higher. Customer data is exposed to interception.',
          recommended_repair: 'Install an SSL certificate and force HTTPS redirects. Let\'s Encrypt offers free certificates.',
          confidence: 100
        });
      }

      // Phase 4: Exposed sensitive paths
      const sensitivePaths = ['/wp-admin/', '/admin', '/.git/config', '/.env', '/wp-config.php', '/phpinfo.php', '/.DS_Store', '/backup/', '/.htaccess'];
      const pathChecks = await Promise.all(sensitivePaths.map(async (p) => {
        try {
          const checkUrl = new URL(p, url).href;
          const res = await fetch(checkUrl, {
            method: 'GET',
            headers: { 'User-Agent': 'FaultLine-AI-SecurityScanner/1.0' },
            signal: AbortSignal.timeout(8000),
            redirect: 'follow'
          });
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
            findings.push({
              title: `Exposed Sensitive File: ${check.path}`,
              category: 'security',
              severity: 'critical',
              description: `The path ${check.path} is publicly accessible and returns a 200 response. This exposes sensitive configuration data.`,
              business_impact: 'Attackers can read credentials, database configs, and source code — leading to full system compromise.',
              recommended_repair: `Restrict access to ${check.path} via server configuration. This file should never be publicly readable.`,
              confidence: 98
            });
          } else if (isAdmin) {
            findings.push({
              title: `Exposed Admin Panel: ${check.path}`,
              category: 'security',
              severity: 'high',
              description: `The admin panel at ${check.path} is publicly accessible without additional protection.`,
              business_impact: 'Brute-force attacks on admin panels are a leading cause of site takeovers.',
              recommended_repair: 'Add IP restrictions, 2FA, and rate limiting to the admin panel. Consider changing the default admin URL.',
              confidence: 85
            });
          }
        }
      }

      // Phase 5: Form security
      const formMatches = homeRes.html.match(/<form[^>]*>/gi) || [];
      for (const formTag of formMatches.slice(0, 5)) {
        const actionMatch = formTag.match(/action=["']([^"']*)["']/i);
        const action = actionMatch ? actionMatch[1] : '';
        if (action && action.startsWith('http://') && url.startsWith('https://')) {
          findings.push({
            title: 'Insecure Form Submission (Mixed Protocol)',
            category: 'security',
            severity: 'high',
            description: `A form submits to ${action} over HTTP while the site uses HTTPS. This causes mixed-content warnings and exposes submitted data.`,
            business_impact: 'Browsers block or warn about mixed content, and form data (including passwords) is sent unencrypted.',
            recommended_repair: 'Update all form actions to use HTTPS URLs.',
            confidence: 90
          });
        }
      }

      // Phase 6: Outdated CMS detection
      if (techStack.includes('WordPress')) {
        const versionMatch = homeRes.html.match(/wp-includes\/[^?]*\?ver=([0-9.]+)/i);
        if (versionMatch) {
          const ver = parseFloat(versionMatch[1]);
          if (ver < 6.0) {
            findings.push({
              title: `Outdated WordPress Version (${versionMatch[1]})`,
              category: 'security',
              severity: 'high',
              description: `WordPress version ${versionMatch[1]} was detected. This version is outdated and may have known vulnerabilities.`,
              business_impact: 'Outdated WordPress is the #1 cause of website compromises. Known exploits are publicly available.',
              recommended_repair: 'Update WordPress to the latest version immediately. Enable automatic updates for minor releases.',
              confidence: 88
            });
          }
        }
        if (!headers['x-frame-options'] && !extracted.trustSignals.privacy) {
          findings.push({
            title: 'WordPress Security Hardening Needed',
            category: 'security',
            severity: 'medium',
            description: 'WordPress was detected without key security hardening measures.',
            business_impact: 'WordPress sites without hardening are frequent targets for automated attacks.',
            recommended_repair: 'Install a security plugin (Wordfence/Sucuri), enable 2FA, limit login attempts, and remove default admin user.',
            confidence: 75
          });
        }
      }

      // Phase 7: Broken internal links
      const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
      const internalLinks: string[] = [];
      let m;
      while ((m = linkRegex.exec(homeRes.html)) !== null) {
        try {
          const fullUrl = new URL(m[1], url).href;
          if (fullUrl.startsWith(url.replace(/\/$/, '').split('#')[0])) {
            internalLinks.push(fullUrl);
          }
        } catch {}
      }
      const uniqueLinks = [...new Set(internalLinks)].slice(0, 8);
      const linkChecks = await Promise.all(uniqueLinks.map(async (l) => {
        try {
          const res = await fetch(l, { method: 'HEAD', headers: { 'User-Agent': 'FaultLine-AI-SecurityScanner/1.0' }, signal: AbortSignal.timeout(8000) });
          return { url: l, status: res.status };
        } catch { return { url: l, status: 0 }; }
      }));
      const brokenLinks = linkChecks.filter(c => c.status === 404 || c.status === 0);
      if (brokenLinks.length > 0) {
        findings.push({
          title: `${brokenLinks.length} Broken Internal Link${brokenLinks.length > 1 ? 's' : ''}`,
          category: 'technical',
          severity: 'medium',
          description: `Found ${brokenLinks.length} broken internal link(s): ${brokenLinks.slice(0, 3).map(b => b.url).join(', ')}${brokenLinks.length > 3 ? '...' : ''}`,
          business_impact: 'Broken links hurt SEO rankings and create dead ends that frustrate visitors and reduce conversions.',
          recommended_repair: 'Fix or redirect broken links. Set up 301 redirects for moved pages.',
          confidence: 92
        });
      }

      // Phase 8: Missing analytics / tracking
      if (!extracted.hasAnalytics) {
        findings.push({
          title: 'No Web Analytics Installed',
          category: 'operations',
          severity: 'high',
          description: 'No web analytics (Google Analytics, GTM, or equivalent) was detected on the site.',
          business_impact: 'Without analytics, the company is blind to traffic sources, visitor behavior, and conversion rates — making it impossible to optimize marketing ROI.',
          recommended_repair: 'Install Google Analytics 4 or an equivalent analytics platform. Set up conversion tracking for key actions.',
          confidence: 95
        });
      }
    }

    // Phase 9: Create audit + findings
    const audit = await base44.asServiceRole.entities.Audit.create({
      organization_id: orgId,
      company_id: companyId,
      audit_type: 'deep_security_scan',
      title: `Deep Security Scan — ${company.name}`,
      status: 'completed',
      scope: { url, findings_count: findings.length, scan_type: 'deep_security' }
    });

    for (const f of findings) {
      await base44.asServiceRole.entities.Finding.create({
        organization_id: orgId,
        audit_id: audit.id,
        title: f.title,
        description: f.description,
        category: f.category,
        severity: f.severity,
        evidence_state: f.confidence >= 85 ? 'verified' : f.confidence >= 60 ? 'supported_inference' : 'needs_review',
        confidence: f.confidence,
        business_impact: f.business_impact,
        recommended_repair: f.recommended_repair,
        approval_status: 'pending'
      });
    }

    await base44.asServiceRole.entities.ScanSnapshot.create({
      organization_id: orgId,
      company_id: companyId,
      audit_id: audit.id,
      health_score: Math.max(0, 100 - findings.reduce((s, f) => s + (f.severity === 'critical' ? 12 : f.severity === 'high' ? 6 : f.severity === 'medium' ? 3 : 1), 0)),
      finding_count: findings.length,
      critical_count: findings.filter(f => f.severity === 'critical').length,
      scanned_at: new Date().toISOString()
    });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'security_scanner',
      action: 'deep_security_scan',
      status: 'success',
      summary: `Deep security scan of ${company.name}: ${findings.length} findings (${findings.filter(f => f.severity === 'critical').length} critical, ${findings.filter(f => f.severity === 'high').length} high)`,
      evidence: { company_id: companyId, audit_id: audit.id, findings: findings.length }
    });

    return Response.json({ status: 'success', company_id: companyId, audit_id: audit.id, findings_created: findings.length, findings });
  } catch (error) {
    console.error('deepSecurityScan error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}