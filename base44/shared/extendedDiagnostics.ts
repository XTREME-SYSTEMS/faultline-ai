import { fetchPage, extractData } from './scraper.ts';

// ===== Extended Diagnostics =====

async function dnsLookup(name, type = 'TXT') {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`);
    const data = await res.json();
    return (data.Answer || []).map(a => a.data);
  } catch { return []; }
}

async function runComplianceCheck(url, html) {
  const findings = [];
  const hasCookieBanner = /cookie-consent|cookie-banner|gdpr|ccpa|cookielaw|onetrup|osano/i.test(html);
  const hasPrivacyPolicy = /privacy policy|privacy-policy/i.test(html);
  const hasTermsRef = /terms of service|terms-and-conditions|terms of use/i.test(html);
  const hasDataProcessing = /data processing|dpa|data protection/i.test(html);
  const hasHealthDisclaimer = /hipaa|health insurance|medical disclaimer|phi/i.test(html);

  if (!hasCookieBanner) findings.push({ title: 'No Cookie Consent Banner (GDPR/CCPA Risk)', category: 'compliance', severity: 'high', description: 'No cookie consent banner detected.', business_impact: 'GDPR fines up to €20M or 4% of global revenue.', recommended_repair: 'Implement a cookie consent banner with granular preferences.', confidence: 90 });
  if (!hasPrivacyPolicy) findings.push({ title: 'No Privacy Policy Link Detected', category: 'compliance', severity: 'critical', description: 'No privacy policy was found.', business_impact: 'Missing privacy policy is a legal violation in most jurisdictions.', recommended_repair: 'Create and prominently link a comprehensive privacy policy.', confidence: 85 });
  if (!hasTermsRef) findings.push({ title: 'No Terms of Service Link', category: 'compliance', severity: 'medium', description: 'No terms of service link detected.', business_impact: 'Without terms, legal recourse is limited.', recommended_repair: 'Add a terms of service page linked in the footer.', confidence: 80 });
  if (!hasDataProcessing) findings.push({ title: 'No Data Processing Agreement Reference', category: 'compliance', severity: 'medium', description: 'No DPA or data protection language detected.', business_impact: 'B2B clients require a DPA for GDPR compliance.', recommended_repair: 'Add a data processing agreement template.', confidence: 75 });
  if (hasHealthDisclaimer) findings.push({ title: 'HIPAA-Related Content Without Compliance Indicators', category: 'compliance', severity: 'high', description: 'Health-related content detected but no HIPAA compliance indicators.', business_impact: 'HIPAA violations carry penalties up to $50,000 per violation.', recommended_repair: 'Add HIPAA compliance documentation.', confidence: 70 });
  return findings;
}

async function runEmailSecurityCheck(domain) {
  const findings = [];
  const [spf, dkim, dmarc] = await Promise.all([
    dnsLookup(domain, 'TXT'),
    dnsLookup(`default._domainkey.${domain}`, 'TXT'),
    dnsLookup(`_dmarc.${domain}`, 'TXT')
  ]);
  const spfRecord = spf.find(r => r.includes('v=spf1'));
  const dmarcRecord = dmarc.find(r => r.includes('v=DMARC1'));

  if (!spfRecord) findings.push({ title: 'No SPF Record (Email Spoofing Risk)', category: 'email_security', severity: 'high', description: 'No SPF DNS record found.', business_impact: 'Attackers can spoof emails from the domain.', recommended_repair: 'Add an SPF TXT record: v=spf1 include:_spf.google.com ~all', confidence: 95 });
  if (!dkim.length) findings.push({ title: 'No DKIM Record (Email Tampering Risk)', category: 'email_security', severity: 'high', description: 'No DKIM DNS record found.', business_impact: 'Emails can be tampered with in transit.', recommended_repair: 'Configure DKIM signing in your email provider.', confidence: 90 });
  if (!dmarcRecord) findings.push({ title: 'No DMARC Record (No Email Authentication Policy)', category: 'email_security', severity: 'critical', description: 'No DMARC DNS record found.', business_impact: 'No policy to reject spoofed emails.', recommended_repair: 'Add a DMARC TXT record: v=DMARC1; p=reject; rua=mailto:security@domain', confidence: 95 });
  return findings;
}

async function runSEOAudit(url, html, extracted) {
  const findings = [];
  if (!extracted.description) findings.push({ title: 'Missing Meta Description', category: 'seo', severity: 'high', description: 'No meta description tag found.', business_impact: 'Click-through rates drop 20-30%.', recommended_repair: 'Add a compelling 150-160 character meta description.', confidence: 95 });
  if (extracted.h1Count === 0) findings.push({ title: 'No H1 Heading', category: 'seo', severity: 'high', description: 'No H1 heading found.', business_impact: 'H1 is a top SEO signal.', recommended_repair: 'Add a single H1 with the primary keyword.', confidence: 95 });
  if (extracted.h1Count > 1) findings.push({ title: 'Multiple H1 Headings', category: 'seo', severity: 'medium', description: `${extracted.h1Count} H1 headings found.`, business_impact: 'Multiple H1s dilute SEO signal.', recommended_repair: 'Use exactly one H1 per page.', confidence: 90 });
  if (!extracted.hasViewport) findings.push({ title: 'No Viewport Meta Tag (Mobile SEO)', category: 'seo', severity: 'critical', description: 'No viewport meta tag detected.', business_impact: 'Google deprioritizes non-mobile-friendly sites.', recommended_repair: 'Add viewport meta tag.', confidence: 98 });
  if (!extracted.hasStructuredData) findings.push({ title: 'No Structured Data (Schema.org)', category: 'seo', severity: 'medium', description: 'No JSON-LD or schema.org structured data found.', business_impact: 'Rich snippets unavailable.', recommended_repair: 'Add Organization and WebSite schema.org JSON-LD.', confidence: 85 });
  if (extracted.imagesWithoutAlt > 5) findings.push({ title: `${extracted.imagesWithoutAlt} Images Without Alt Text`, category: 'seo', severity: 'medium', description: `${extracted.imagesWithoutAlt} images lack alt attributes.`, business_impact: 'Accessibility and image SEO suffer.', recommended_repair: 'Add descriptive alt text to all images.', confidence: 92 });
  if (extracted.wordCount < 300) findings.push({ title: 'Thin Content (Low Word Count)', category: 'seo', severity: 'medium', description: `Homepage has only ${extracted.wordCount} words.`, business_impact: 'Thin content ranks poorly.', recommended_repair: 'Expand homepage content to 500+ words.', confidence: 80 });
  return findings;
}

async function discoverSubdomains(domain) {
  const findings = [];
  try {
    const res = await fetch(`https://crt.sh/?q=%25.${domain}&output=json`, { signal: AbortSignal.timeout(15000) });
    const data = await res.json();
    const subdomains = [...new Set(data.map(e => e.name_value).filter(n => n.includes(domain) && !n.includes('*')))].slice(0, 20);
    const interesting = subdomains.filter(s => /admin|staging|dev|test|api|mail|vpn|portal|dashboard|internal|jenkins|grafana|kibana/i.test(s));
    if (interesting.length > 0) {
      findings.push({ title: `${interesting.length} Exposed Sensitive Subdomain${interesting.length > 1 ? 's' : ''}`, category: 'security', severity: 'high', description: `Certificate transparency logs reveal: ${interesting.join(', ')}`, business_impact: 'Attackers use these to find attack surfaces.', recommended_repair: 'Restrict access via VPN/IP allowlisting.', confidence: 88 });
    }
    return { subdomains: subdomains.length, findings };
  } catch { return { subdomains: 0, findings: [] }; }
}

function checkCredentialExposure(html, url) {
  const findings = [];
  const patterns = [
    { regex: /api[_-]?key["'\s:=]+["']([A-Za-z0-9_-]{32,})["']/gi, name: 'API Key' },
    { regex: /aws[_-]?access[_-]?key[_-]?id["'\s:=]+["'](AKIA[A-Z0-9]{16})["']/gi, name: 'AWS Access Key' },
    { regex: /secret[_-]?key["'\s:=]+["']([A-Za-z0-9+/=]{32,})["']/gi, name: 'Secret Key' },
    { regex: /Bearer\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/gi, name: 'Bearer Token' }
  ];
  for (const { regex, name } of patterns) {
    const matches = html.match(regex);
    if (matches && matches.length > 0) {
      findings.push({ title: `Exposed ${name} in Page Source`, category: 'security', severity: 'critical', description: `A ${name} was found in the HTML source.`, business_impact: 'Exposed credentials allow full account takeover.', recommended_repair: `Remove the ${name} from client-side code.`, confidence: 98 });
    }
  }
  return findings;
}

export async function runExtendedDiagnostics(base44, orgId, companyId, auditId) {
  const company = await base44.asServiceRole.entities.Company.get(companyId);
  const websites = await base44.asServiceRole.entities.Website.filter({ organization_id: orgId, company_id: companyId });
  let domain = company.domain || '';
  let allFindings = [];

  if (websites.length > 0) {
    const url = websites[0].url;
    if (!domain) { try { domain = new URL(url).hostname.replace(/^www\./, ''); } catch {} }
    const pageRes = await fetchPage(url);
    if (pageRes.ok && pageRes.html) {
      const extracted = extractData(pageRes.html, url);
      allFindings = allFindings.concat(await runComplianceCheck(url, pageRes.html));
      allFindings = allFindings.concat(await runSEOAudit(url, pageRes.html, extracted));
      allFindings = allFindings.concat(checkCredentialExposure(pageRes.html, url));
    }
  }

  if (domain) {
    allFindings = allFindings.concat(await runEmailSecurityCheck(domain));
    const subResult = await discoverSubdomains(domain);
    allFindings = allFindings.concat(subResult.findings);
  }

  let newFindings = 0;
  for (const f of allFindings) {
    await base44.asServiceRole.entities.Finding.create({
      organization_id: orgId, audit_id: auditId, title: f.title, description: f.description,
      category: f.category, severity: f.severity,
      evidence_state: f.confidence >= 85 ? 'verified' : 'supported_inference',
      confidence: f.confidence, business_impact: f.business_impact, recommended_repair: f.recommended_repair, approval_status: 'pending'
    });
    newFindings++;
  }
  return { new_findings: newFindings, categories: [...new Set(allFindings.map(f => f.category))] };
}

export async function quantifyRevenueLeaks(base44, orgId, auditId, company) {
  const findings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId, audit_id: auditId });
  if (findings.length === 0) return { quantified: 0, total_impact: 0 };

  const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are a revenue impact analyst. Quantify the annual dollar impact of each finding for ${company.name} (${company.industry || 'general'}).
FINDINGS: ${JSON.stringify(findings.map(f => ({ id: f.id, title: f.title, category: f.category, severity: f.severity, business_impact: f.business_impact })))}
For each: annual_impact_min, annual_impact_max, confidence (0-100), category (lost_leads, pricing_leakage, churn, operational_inefficiency, conversion_gap, other).`,
    response_json_schema: { type: 'object', properties: { quantifications: { type: 'array', items: { type: 'object', properties: {
      finding_id: { type: 'string' }, annual_impact_min: { type: 'number' }, annual_impact_max: { type: 'number' }, confidence: { type: 'number' }, category: { type: 'string' }
    }}}}}
  });

  const quants = llmResponse.quantifications || [];
  for (const q of quants) {
    await base44.asServiceRole.entities.RevenueLeak.create({ organization_id: orgId, finding_id: q.finding_id, category: q.category, annual_impact_min: q.annual_impact_min, annual_impact_max: q.annual_impact_max, confidence: q.confidence });
  }
  return { quantified: quants.length, total_annual_impact_max: quants.reduce((s, q) => s + (q.annual_impact_max || 0), 0) };
}

export async function benchmarkCompetitors(base44, orgId, company) {
  const competitorRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Find 3 real competitor companies to "${company.name}" in the ${company.industry || 'general'} industry. For each, provide the company name and website URL.`,
    add_context_from_internet: true,
    response_json_schema: { type: 'object', properties: { competitors: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, url: { type: 'string' }}}} }}
  });

  const competitors = (competitorRes.competitors || []).slice(0, 3);
  const scanResults = await Promise.all(competitors.map(async (comp) => {
    const pageResult = await fetchPage(comp.url);
    if (!pageResult.ok) return { name: comp.name, url: comp.url, score: 0, tech_stack: [], notes: ['Site unreachable'] };
    const extracted = extractData(pageResult.html, comp.url);
    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analyze this website for ${comp.name} (${comp.url}). Score 0-100. Data: ${JSON.stringify({ wordCount: extracted.wordCount, hasAnalytics: extracted.hasAnalytics, trustSignals: extracted.trustSignals, ctaCount: extracted.ctaCount })}. Return score and 3-5 notes.`,
      response_json_schema: { type: 'object', properties: { score: { type: 'number' }, notes: { type: 'array', items: { type: 'string' }}}}
    });
    return { name: comp.name, url: comp.url, score: analysis.score || 0, tech_stack: [], notes: analysis.notes || [] };
  }));

  const competitorScores = {};
  for (const r of scanResults) competitorScores[r.name] = { url: r.url, score: r.score, tech_stack: r.tech_stack, notes: r.notes };
  await base44.asServiceRole.entities.Company.update(company.id, { competitor_scores: competitorScores });
  return { competitors_scanned: scanResults.length, scores: scanResults.map(r => ({ name: r.name, score: r.score })) };
}