import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

function extractData(html, url) {
  const get = (re) => { const m = html.match(re); return m ? m[1].trim() : ''; };
  const count = (re) => (html.match(re) || []).length;
  const test = (re) => re.test(html);

  const title = get(/<title[^>]*>([^<]*)<\/title>/i);
  const description = get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || get(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i);
  const hasViewport = test(/<meta[^>]+name=["']viewport["']/i);
  const h1Count = count(/<h1[^>]*>/gi);
  const h2Count = count(/<h2[^>]*>/gi);
  const linkCount = count(/<a[^>]+href=/gi);
  const imageCount = count(/<img[^>]*>/gi);
  const imagesWithoutAlt = count(/<img(?![^>]*\salt=)[^>]*>/gi);
  const scriptCount = count(/<script[^>]*>/gi);
  const formCount = count(/<form[^>]*>/gi);
  const hasGA = test(/google-analytics|gtag\(|googletagmanager/i);
  const hasFB = test(/facebook\.com\/tr|fbq\(/i);
  const hasHotjar = test(/hotjar/i);
  const hasSchema = test(/application\/ld\+json|schema\.org/i);
  const hasFacebook = test(/facebook\.com/i);
  const hasTwitter = test(/twitter\.com|x\.com/i);
  const hasLinkedIn = test(/linkedin\.com/i);
  const hasInstagram = test(/instagram\.com/i);
  const hasPhone = test(/(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3,4}[\s.-]?\d{4}/);
  const hasEmail = test(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const ctaCount = count(/get started|contact us|request a quote|sign up|book a call|schedule|free consultation|learn more|get a demo|start free|try free/gi);
  const hasPrivacy = test(/privacy policy/i);
  const hasTerms = test(/terms of service|terms and conditions/i);
  const hasSSL = url.startsWith('https://');
  const hasReviews = test(/review|testimonial|rating/i);
  const hasCertifications = test(/certified|certification|accredited|award/i);
  const hasMixedContent = hasSSL && test(/<img[^>]+src=["']http:\/\//i);
  const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = textContent.split(' ').length;

  return {
    title, description, hasViewport,
    h1Count, h2Count, linkCount, imageCount, imagesWithoutAlt,
    scriptCount, formCount, ctaCount,
    hasAnalytics: hasGA || hasFB || hasHotjar,
    analyticsTools: { google: hasGA, facebook: hasFB, hotjar: hasHotjar },
    hasStructuredData: hasSchema,
    socialLinks: { facebook: hasFacebook, twitter: hasTwitter, linkedin: hasLinkedIn, instagram: hasInstagram },
    contactInfo: { phone: hasPhone, email: hasEmail },
    trustSignals: { privacy: hasPrivacy, terms: hasTerms, ssl: hasSSL, reviews: hasReviews, certifications: hasCertifications },
    hasMixedContent,
    pageSize: html.length, wordCount,
    textSample: textContent.substring(0, 3000)
  };
}

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
    if (!company || company.organization_id !== orgId) {
      return Response.json({ error: 'Company not found' }, { status: 404 });
    }

    const websites = await base44.asServiceRole.entities.Website.filter({ organization_id: orgId, company_id: companyId });
    if (websites.length === 0) {
      return Response.json({ error: 'No website found for company' }, { status: 400 });
    }
    const website = websites[0];

    // Phase 1: Scrape website
    let html = '';
    let extracted = null;
    let fetchOk = false;
    let httpStatus = 0;
    try {
      const fetchRes = await fetch(website.url, {
        headers: { 'User-Agent': 'FaultLine-AI-Scanner/1.0 (+https://faultline.ai)' },
        signal: AbortSignal.timeout(15000),
        redirect: 'follow'
      });
      httpStatus = fetchRes.status;
      html = await fetchRes.text();
      extracted = extractData(html, website.url);
      fetchOk = true;
    } catch (e) {
      html = `Unable to fetch website: ${e.message}`;
      extracted = null;
    }

    // Phase 2: Create audit
    const audit = await base44.asServiceRole.entities.Audit.create({
      organization_id: orgId,
      company_id: companyId,
      audit_type: 'website_intelligence',
      title: `Website Intelligence Audit — ${company.name}`,
      status: 'scanning',
      scope: { url: website.url, industry: company.industry, http_status: httpStatus, fetch_ok: fetchOk, extracted: extracted }
    });

    // Phase 3: Record evidence
    await base44.asServiceRole.entities.Evidence.create({
      organization_id: orgId,
      audit_id: audit.id,
      source_type: 'website_capture',
      source_uri: website.url,
      captured_at: new Date().toISOString(),
      content_summary: extracted
        ? `Scraped ${company.name}: ${extracted.wordCount} words, ${extracted.h1Count} H1s, ${extracted.imageCount} images (${extracted.imagesWithoutAlt} without alt), ${extracted.ctaCount} CTAs, analytics: ${extracted.hasAnalytics}, SSL: ${extracted.trustSignals.ssl}, structured data: ${extracted.hasStructuredData}`
        : `Fetch failed for ${company.name}: ${html}`,
      content_hash: html.length.toString()
    });

    // Phase 4: LLM analysis with extracted data
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a business diagnostic expert. Analyze this website for ${company.name} (a ${company.industry} company).

Website URL: ${website.url}
HTTP Status: ${httpStatus}

EXTRACTED TECHNICAL DATA:
${JSON.stringify(extracted || {}, null, 2)}

RAW HTML (truncated):
${html.substring(0, 10000)}

Identify 5-10 specific, actionable findings across these categories:
- positioning: Is the value proposition clear within seconds?
- conversion: Are there effective CTAs, forms, and conversion paths?
- trust: SSL, reviews, privacy policy, certifications, contact info
- technical: Performance indicators, mobile readiness, structured data, analytics
- content: Quality, clarity, completeness, heading structure
- mobile: Viewport, responsive indicators
- operations: Business process signals, lead capture, service clarity

For each finding provide:
- title: Short specific name
- category: One of the above
- severity: critical, high, medium, or low
- description: 2-3 sentences citing specific evidence from the extracted data
- business_impact: What this costs the business
- recommended_repair: Specific actionable fix
- confidence: 0-100 based on evidence strength

Only report real issues evidenced by the data. Be specific and cite actual values from the extracted data.`,
      response_json_schema: {
        type: 'object',
        properties: {
          findings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                category: { type: 'string' },
                severity: { type: 'string' },
                description: { type: 'string' },
                business_impact: { type: 'string' },
                recommended_repair: { type: 'string' },
                confidence: { type: 'number' }
              }
            }
          }
        }
      }
    });

    // Phase 5: Create findings
    const findings = llmResponse.findings || [];
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

    // Phase 6: Update statuses
    await base44.asServiceRole.entities.Audit.update(audit.id, { status: 'completed' });
    await base44.asServiceRole.entities.Website.update(website.id, { status: 'scanned', last_scanned_at: new Date().toISOString() });
    await base44.asServiceRole.entities.Company.update(companyId, { status: 'scanned' });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'scanner',
      action: 'scan_company',
      status: 'success',
      summary: `Scanned ${company.name} — ${findings.length} findings identified (${httpStatus ? 'HTTP ' + httpStatus : 'fetch failed'})`,
      evidence: { company_id: companyId, audit_id: audit.id, website_url: website.url, http_status: httpStatus, fetch_ok: fetchOk }
    });

    return Response.json({ status: 'success', company_id: companyId, audit_id: audit.id, findings_created: findings.length, http_status: httpStatus });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}