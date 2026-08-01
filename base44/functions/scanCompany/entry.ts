import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { extractData, fetchPage, discoverPageLinks, detectTechStack, calcHealthScore } from '../../shared/scraper.ts';

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

    // Phase 1: Fetch homepage
    const homeResult = await fetchPage(website.url);
    let pages = [{ url: website.url, label: 'homepage', ...homeResult }];

    // Phase 2: Discover and fetch subpages in parallel
    if (homeResult.ok && homeResult.html) {
      const subLinks = discoverPageLinks(homeResult.html, website.url);
      const subResults = await Promise.all(subLinks.map(l => fetchPage(l.url)));
      pages = pages.concat(subLinks.map((l, i) => ({ url: l.url, label: l.label, ...subResults[i] })));
    }

    // Phase 3: Extract data from each page + detect tech stack
    const pageData = pages.map(p => ({
      url: p.url,
      label: p.label,
      status: p.status,
      ok: p.ok,
      extracted: p.ok && p.html ? extractData(p.html, p.url) : null,
      htmlSample: p.ok && p.html ? p.html.substring(0, 5000) : ''
    }));
    const techStack = pageData[0]?.extracted ? detectTechStack(pages[0].html) : [];

    // Phase 4: Create audit
    const audit = await base44.asServiceRole.entities.Audit.create({
      organization_id: orgId,
      company_id: companyId,
      audit_type: 'website_intelligence',
      title: `Website Intelligence Audit — ${company.name}`,
      status: 'scanning',
      scope: { url: website.url, industry: company.industry, pages_crawled: pages.length, tech_stack: techStack, page_data: pageData.map(p => ({ url: p.url, label: p.label, status: p.status, extracted: p.extracted })) }
    });

    // Phase 5: Record evidence
    await base44.asServiceRole.entities.Evidence.create({
      organization_id: orgId,
      audit_id: audit.id,
      source_type: 'website_crawl',
      source_uri: website.url,
      captured_at: new Date().toISOString(),
      content_summary: `Crawled ${pages.length} pages for ${company.name}. Tech stack: ${techStack.join(', ') || 'unknown'}. Homepage: ${pageData[0]?.extracted?.wordCount || 0} words, ${pageData[0]?.extracted?.h1Count || 0} H1s, ${pageData[0]?.extracted?.imageCount || 0} images.`,
      content_hash: pages.map(p => p.html?.length || 0).join(',').toString()
    });

    // Phase 6: LLM analysis with all page data
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a business diagnostic expert. Analyze this multi-page website crawl for ${company.name} (a ${company.industry} company).

PAGES CRAWLED: ${pages.length}
TECH STACK: ${techStack.join(', ') || 'Not detected'}

PAGE DATA:
${JSON.stringify(pageData.map(p => ({ url: p.url, label: p.label, status: p.status, extracted: p.extracted, htmlSample: p.htmlSample })), null, 2)}

Identify 5-10 specific, actionable findings across these categories:
- positioning: Is the value proposition clear within seconds?
- conversion: CTAs, forms, conversion paths across pages
- trust: SSL, reviews, privacy, certifications, contact info
- technical: Performance, mobile, structured data, analytics, tech stack issues
- content: Quality, clarity, completeness, heading structure
- mobile: Viewport, responsive indicators
- operations: Business process signals, lead capture, service clarity

For each finding:
- title: Short specific name
- category: One of the above
- severity: critical, high, medium, or low
- description: 2-3 sentences citing specific evidence from the extracted data
- business_impact: What this costs the business
- recommended_repair: Specific actionable fix
- confidence: 0-100

Only report real issues evidenced by the data.`,
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

    // Phase 7: Create findings
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

    // Phase 8: Create scan snapshot
    const healthScore = calcHealthScore(findings);
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    await base44.asServiceRole.entities.ScanSnapshot.create({
      organization_id: orgId,
      company_id: companyId,
      audit_id: audit.id,
      health_score: healthScore,
      finding_count: findings.length,
      critical_count: criticalCount,
      scanned_at: new Date().toISOString()
    });

    // Phase 9: Update statuses
    await base44.asServiceRole.entities.Audit.update(audit.id, { status: 'completed' });
    await base44.asServiceRole.entities.Website.update(website.id, { status: 'scanned', last_scanned_at: new Date().toISOString() });
    await base44.asServiceRole.entities.Company.update(companyId, { status: 'scanned' });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'scanner',
      action: 'scan_company',
      status: 'success',
      summary: `Crawled ${pages.length} pages for ${company.name} — ${findings.length} findings, health score ${healthScore}, tech: ${techStack.join(', ') || 'unknown'}`,
      evidence: { company_id: companyId, audit_id: audit.id, pages_crawled: pages.length, tech_stack: techStack, health_score: healthScore }
    });

    return Response.json({ status: 'success', company_id: companyId, audit_id: audit.id, findings_created: findings.length, pages_crawled: pages.length, tech_stack: techStack, health_score: healthScore });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}