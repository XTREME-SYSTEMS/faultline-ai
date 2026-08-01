import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

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

    // Fetch website content
    let websiteContent = '';
    let fetchOk = false;
    try {
      const fetchRes = await fetch(website.url, {
        headers: { 'User-Agent': 'FaultLine-AI-Scanner/1.0 (+https://faultline.ai)' },
        signal: AbortSignal.timeout(15000)
      });
      websiteContent = await fetchRes.text();
      if (websiteContent.length > 20000) websiteContent = websiteContent.substring(0, 20000);
      fetchOk = true;
    } catch (e) {
      websiteContent = `Unable to fetch website content directly: ${e.message}. Analysis based on company name (${company.name}), domain (${company.domain}), and industry (${company.industry}).`;
    }

    // Create audit
    const audit = await base44.asServiceRole.entities.Audit.create({
      organization_id: orgId,
      company_id: companyId,
      audit_type: 'website_intelligence',
      title: `Website Intelligence Audit — ${company.name}`,
      status: 'scanning',
      scope: { url: website.url, industry: company.industry, fetch_ok: fetchOk }
    });

    // Capture evidence
    await base44.asServiceRole.entities.Evidence.create({
      organization_id: orgId,
      audit_id: audit.id,
      source_type: 'website_capture',
      source_uri: website.url,
      captured_at: new Date().toISOString(),
      content_summary: `Captured homepage of ${company.name} (${website.url}) — ${websiteContent.length} chars`,
      content_hash: websiteContent.length.toString()
    });

    // Analyze with LLM
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a business diagnostic expert. Analyze the following website for ${company.name} (a ${company.industry} company) and identify business-critical faults.

Website URL: ${website.url}
Industry: ${company.industry}

Website content:
${websiteContent}

Identify 3-7 specific, actionable findings. For each:
- title: Short specific finding name
- category: One of: positioning, conversion, trust, technical, content, mobile, operations
- severity: critical, high, medium, or low
- description: 2-3 sentence explanation of the fault
- business_impact: What this costs the business
- recommended_repair: Specific action to fix it
- confidence: 0-100 based on evidence strength

Focus on real observable issues. Do not invent problems not evident from the content.`,
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

    // Mark audit and website as scanned
    await base44.asServiceRole.entities.Audit.update(audit.id, { status: 'completed' });
    await base44.asServiceRole.entities.Website.update(website.id, { status: 'scanned', last_scanned_at: new Date().toISOString() });
    await base44.asServiceRole.entities.Company.update(companyId, { status: 'scanned' });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'scanner',
      action: 'scan_company',
      status: 'success',
      summary: `Scanned ${company.name} — ${findings.length} findings identified`,
      evidence: { company_id: companyId, audit_id: audit.id, website_url: website.url, fetch_ok: fetchOk }
    });

    return Response.json({ status: 'success', company_id: companyId, audit_id: audit.id, findings_created: findings.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}