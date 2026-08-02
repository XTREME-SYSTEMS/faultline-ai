import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { discoverAllPages, extractExternalScripts, detectExposedSecrets, deepExtract, fetchPageDeep, fetchScript } from '../../shared/deepScraper.ts';
import { detectTechStack, calcHealthScore } from '../../shared/scraper.ts';

// Deep Discovery Scan — the deepest level of discovery, scrape, and clone:
//  1. Scrapes the homepage + ALL discovered internal pages (up to 15)
//  2. Extracts and fetches external JS bundles, scans them for exposed secrets
//  3. Detects exposed API keys, tokens, passwords, private keys in HTML + JS
//  4. Enumerates every fault: security, performance, accessibility, SEO, conversion, trust
//  5. Stores exposed secrets as critical findings (with the key value noted in the report)
//  6. Creates an audit, findings, evidence, and a scan snapshot

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { company_id } = body;
    if (!company_id) return Response.json({ error: 'company_id required' }, { status: 400 });

    const company = await base44.asServiceRole.entities.Company.get(company_id);
    if (!company || company.organization_id !== orgId) throw new Error('Company not found');

    const websites = await base44.asServiceRole.entities.Website.filter({ organization_id: orgId, company_id });
    if (websites.length === 0) return Response.json({ error: 'No website found for company. Run discovery first.' }, { status: 400 });
    const url = websites[0].url;

    const findings = [];
    const exposedSecrets = [];
    let uniqueSecretsList = [];
    const pageResults = [];

    // 1. Fetch homepage
    const home = await fetchPageDeep(url);
    if (!home.ok) {
      findings.push({ title: 'Website Unreachable', category: 'security', severity: 'critical', description: `Deep scan could not reach ${url}: ${home.error}`, business_impact: 'No leads, no sales, damaged trust.', recommended_repair: 'Check DNS, server, and firewall immediately.', confidence: 100 });
    } else {
      pageResults.push({ url, status: home.status, extract: deepExtract(home.html, url) });

      // 2. Scan homepage HTML for exposed secrets
      const homeSecrets = detectExposedSecrets(home.html, url);
      exposedSecrets.push(...homeSecrets);

      // 3. Discover and fetch all internal pages
      const pages = discoverAllPages(home.html, url);
      const pageFetches = await Promise.all(pages.map(p => fetchPageDeep(p, 8000)));
      for (let i = 0; i < pages.length; i++) {
        const pf = pageFetches[i];
        if (pf.ok) {
          pageResults.push({ url: pages[i], status: pf.status, extract: deepExtract(pf.html, pages[i]) });
          const pageSecrets = detectExposedSecrets(pf.html, pages[i]);
          exposedSecrets.push(...pageSecrets);
        }
      }

      // 4. Fetch external JS bundles and scan for secrets
      const scripts = extractExternalScripts(home.html, url);
      const scriptFetches = await Promise.all(scripts.map(s => fetchScript(s, 8000)));
      for (let i = 0; i < scripts.length; i++) {
        const sf = scriptFetches[i];
        if (sf.ok && sf.text) {
          const scriptSecrets = detectExposedSecrets(sf.text, scripts[i]);
          exposedSecrets.push(...scriptSecrets);
        }
      }

      // 5. Deduplicate exposed secrets
      const seenSecrets = new Set();
      uniqueSecretsList = exposedSecrets.filter(s => {
        const key = `${s.type}:${s.value}`;
        if (seenSecrets.has(key)) return false;
        seenSecrets.add(key);
        return true;
      });

      // Store exposed secrets as critical findings
      for (const s of uniqueSecretsList) {
        findings.push({
          title: `Exposed ${s.type} Detected`,
          category: 'exposed_secret',
          severity: s.severity,
          description: `A ${s.type} was found exposed in the page source at ${s.source}.\n\nVISIBLE KEY VALUE: ${s.value}\n\nThis credential is publicly readable by anyone who views the site source or inspects network requests.`,
          business_impact: s.severity === 'critical' ? 'Exposed credentials allow attackers to take over services, access customer data, and impersonate the business. This is an active breach risk.' : 'Exposed keys can be abused for billing fraud, data theft, or service abuse.',
          recommended_repair: `Immediately rotate/revoke the exposed ${s.type}, remove it from client-side code, move it to a server-side environment variable, and audit access logs for abuse.`,
          confidence: 99
        });
      }

      // 6. Security header checks on homepage
      const headers = home.headers || {};
      const securityHeaders = [
        { key: 'content-security-policy', name: 'Content-Security-Policy', severity: 'high' },
        { key: 'strict-transport-security', name: 'HSTS', severity: 'high' },
        { key: 'x-frame-options', name: 'X-Frame-Options', severity: 'medium' },
        { key: 'x-content-type-options', name: 'X-Content-Type-Options', severity: 'medium' },
        { key: 'referrer-policy', name: 'Referrer-Policy', severity: 'low' },
        { key: 'permissions-policy', name: 'Permissions-Policy', severity: 'low' }
      ];
      for (const h of securityHeaders) {
        if (!headers[h.key] && !headers[h.key.replace(/-/g, '_')]) {
          findings.push({ title: `Missing ${h.name} Header`, category: 'security', severity: h.severity, description: `The ${h.name} security header is not set.`, business_impact: 'Missing security headers leave the site vulnerable to XSS, clickjacking, and downgrade attacks.', recommended_repair: `Add the ${h.name} response header.`, confidence: 95 });
        }
      }

      // 7. Sensitive file exposure
      const sensitivePaths = ['/wp-admin/', '/admin', '/.git/config', '/.env', '/wp-config.php', '/phpinfo.php', '/.DS_Store', '/backup/', '/.htaccess', '/server-status', '/.svn/entries', '/composer.json', '/package.json', '/robots.txt'];
      const pathChecks = await Promise.all(sensitivePaths.map(async (p) => {
        try {
          const checkUrl = new URL(p, url).href;
          const res = await fetch(checkUrl, { method: 'GET', headers: { 'User-Agent': 'FaultLine-AI-DeepScanner/1.0' }, signal: AbortSignal.timeout(6000), redirect: 'follow' });
          return { path: p, status: res.status, ok: res.ok };
        } catch { return { path: p, status: 0, ok: false }; }
      }));
      for (const check of pathChecks) {
        if (check.ok && check.status === 200) {
          const isCritical = check.path.match(/\.git|\.env|config|htaccess|svn|composer|package\.json/);
          findings.push({
            title: `Exposed ${isCritical ? 'Sensitive File' : 'Path'}: ${check.path}`,
            category: 'security',
            severity: isCritical ? 'critical' : 'high',
            description: `The path ${check.path} is publicly accessible (HTTP 200).`,
            business_impact: isCritical ? 'Attackers can read source code, credentials, and configuration — leading to full system compromise.' : 'Exposed paths reveal system information that aids targeted attacks.',
            recommended_repair: `Restrict access to ${check.path} via server configuration.`,
            confidence: 97
          });
        }
      }

      // 8. Performance & accessibility faults across all pages
      for (const page of pageResults) {
        const e = page.extract;
        if (!e.hasViewport) findings.push({ title: `No Viewport Meta Tag on ${page.url}`, category: 'mobile', severity: 'high', description: 'The page has no viewport meta tag.', business_impact: 'The site is not mobile-friendly. Over 60% of visitors on mobile will have a poor experience.', recommended_repair: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.', confidence: 95 });
        if (e.imagesWithoutAlt > 3) findings.push({ title: `${e.imagesWithoutAlt} Images Without Alt Text on ${page.url}`, category: 'accessibility', severity: 'medium', description: `${e.imagesWithoutAlt} images lack alt attributes.`, business_impact: 'Accessibility violations (WCAG) and lost SEO image-search traffic.', recommended_repair: 'Add descriptive alt text to all meaningful images.', confidence: 90 });
        if (e.h1Count === 0) findings.push({ title: `No H1 Heading on ${page.url}`, category: 'seo', severity: 'high', description: 'The page has no H1 tag.', business_impact: 'Missing H1 hurts SEO rankings and page clarity.', recommended_repair: 'Add a single descriptive H1 heading.', confidence: 92 });
        if (e.h1Count > 1) findings.push({ title: `Multiple H1 Tags (${e.h1Count}) on ${page.url}`, category: 'seo', severity: 'low', description: `The page has ${e.h1Count} H1 tags.`, business_impact: 'Multiple H1s dilute SEO focus and confuse screen readers.', recommended_repair: 'Use exactly one H1 per page.', confidence: 85 });
        if (!e.hasAnalytics) findings.push({ title: `No Web Analytics on ${page.url}`, category: 'operations', severity: 'high', description: 'No analytics detected.', business_impact: 'The company is blind to traffic sources, conversion rates, and user behavior.', recommended_repair: 'Install Google Analytics 4 and set up conversion tracking.', confidence: 95 });
        if (!e.hasStructuredData) findings.push({ title: `No Structured Data on ${page.url}`, category: 'seo', severity: 'medium', description: 'No schema.org structured data found.', business_impact: 'Missing rich snippets reduce search visibility and click-through rates.', recommended_repair: 'Add schema.org JSON-LD structured data.', confidence: 88 });
        if (!e.hasOpenGraph) findings.push({ title: `No Open Graph Tags on ${page.url}`, category: 'marketing', severity: 'medium', description: 'No og:title/og:image tags found.', business_impact: 'Links shared on social media show no preview image or title — reducing click-through.', recommended_repair: 'Add Open Graph meta tags for social sharing.', confidence: 88 });
        if (e.hasMixedContent) findings.push({ title: `Mixed Content on ${page.url}`, category: 'security', severity: 'high', description: 'HTTPS page loads HTTP resources.', business_impact: 'Browsers block mixed content and show security warnings.', recommended_repair: 'Update all resource URLs to HTTPS.', confidence: 95 });
        if (e.ctaCount === 0 && page.url === url) findings.push({ title: 'No Clear Call-to-Action on Homepage', category: 'conversion', severity: 'high', description: 'No recognizable CTA phrases found on the homepage.', business_impact: 'Visitors don\'t know what to do next — lost conversions.', recommended_repair: 'Add clear, prominent CTAs (e.g. "Book a Call", "Get Started").', confidence: 90 });
        if (!e.trustSignals.privacy) findings.push({ title: 'No Privacy Policy Link', category: 'trust', severity: 'medium', description: 'No privacy policy detected.', business_impact: 'GDPR/CCPA non-compliance risk and reduced visitor trust.', recommended_repair: 'Add a privacy policy page and link it in the footer.', confidence: 88 });
        if (!e.trustSignals.terms) findings.push({ title: 'No Terms of Service Link', category: 'trust', severity: 'low', description: 'No terms of service detected.', business_impact: 'Legal exposure without clear terms.', recommended_repair: 'Add a terms of service page.', confidence: 80 });
        if (!e.hasCookieBanner && e.hasAnalytics) findings.push({ title: 'No Cookie Consent Banner', category: 'compliance', severity: 'medium', description: 'Analytics detected but no cookie consent banner.', business_impact: 'GDPR/CCPA requires consent for tracking cookies — non-compliance risk.', recommended_repair: 'Add a cookie consent banner.', confidence: 85 });
        if (e.pageSize > 500000) findings.push({ title: `Large Page Size (${Math.round(e.pageSize/1024)}KB) on ${page.url}`, category: 'performance', severity: 'medium', description: `Page size is ${Math.round(e.pageSize/1024)}KB.`, business_impact: 'Slow page load reduces conversions and hurts SEO rankings.', recommended_repair: 'Optimize images, minify CSS/JS, enable compression.', confidence: 85 });
        if (!e.hasLazyLoad && e.imageCount > 5) findings.push({ title: `No Lazy Loading on ${page.url}`, category: 'performance', severity: 'low', description: `${e.imageCount} images but no lazy loading.`, business_impact: 'All images load immediately, slowing initial page render.', recommended_repair: 'Add loading="lazy" to below-the-fold images.', confidence: 80 });
      }

      // 9. Tech stack detection
      const techStack = detectTechStack(home.html);
      if (techStack.includes('WordPress')) {
        const versionMatch = home.html.match(/wp-includes\/[^?]*\?ver=([0-9.]+)/i);
        if (versionMatch && parseFloat(versionMatch[1]) < 6.0) {
          findings.push({ title: `Outdated WordPress (${versionMatch[1]})`, category: 'security', severity: 'high', description: `WordPress version ${versionMatch[1]} detected.`, business_impact: 'Outdated WordPress is the #1 cause of website compromises.', recommended_repair: 'Update WordPress to the latest version.', confidence: 88 });
        }
      }
    }

    // 10. Create audit + findings + evidence + snapshot
    const audit = await base44.asServiceRole.entities.Audit.create({
      organization_id: orgId, company_id, audit_type: 'deep_discovery_scan',
      title: `Deep Discovery Scan — ${company.name}`, status: 'completed',
      scope: { url, pages_scanned: pageResults.length, exposed_secrets: uniqueSecretsList.length, findings_count: findings.length, scan_type: 'deep_discovery' }
    });

    for (const f of findings) {
      await base44.asServiceRole.entities.Finding.create({
        organization_id: orgId, audit_id: audit.id, title: f.title, description: f.description,
        category: f.category, severity: f.severity,
        evidence_state: f.confidence >= 85 ? 'verified' : 'supported_inference',
        confidence: f.confidence, business_impact: f.business_impact, recommended_repair: f.recommended_repair, approval_status: 'pending'
      });
    }

    await base44.asServiceRole.entities.Evidence.create({
      organization_id: orgId, audit_id: audit.id, source_type: 'deep_discovery_scan', source_uri: url,
      captured_at: new Date().toISOString(),
      content_summary: `Deep scan of ${pageResults.length} pages. Exposed secrets: ${uniqueSecretsList.length}. Findings: ${findings.length}.`,
      content_hash: `${Date.now()}`
    });

    const healthScore = calcHealthScore(findings);
    await base44.asServiceRole.entities.ScanSnapshot.create({
      organization_id: orgId, company_id, audit_id: audit.id,
      health_score: healthScore, finding_count: findings.length,
      critical_count: findings.filter(f => f.severity === 'critical').length, scanned_at: new Date().toISOString()
    });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId, system: 'deep_discovery', action: 'deep_scan',
      status: 'success',
      summary: `Deep discovery scan: ${findings.length} findings, ${uniqueSecretsList.length} exposed secrets, ${pageResults.length} pages, health ${healthScore}`,
      evidence: { company_id, audit_id: audit.id }
    });

    return Response.json({
      status: 'success',
      audit_id: audit.id,
      company_id,
      pages_scanned: pageResults.length,
      exposed_secrets: uniqueSecretsList.map(s => ({ type: s.type, value: s.value, source: s.source, severity: s.severity })),
      findings_created: findings.length,
      health_score: healthScore,
      findings: findings.map(f => ({ title: f.title, category: f.category, severity: f.severity, description: f.description, recommended_repair: f.recommended_repair }))
    });
  } catch (error) {
    console.error('deepDiscoveryScan error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}