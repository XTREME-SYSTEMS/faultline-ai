import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found on user profile' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const auditId = body.audit_id;
    if (!auditId) return Response.json({ error: 'audit_id required' }, { status: 400 });

    const audit = await base44.asServiceRole.entities.Audit.get(auditId);
    if (!audit || audit.organization_id !== orgId) return Response.json({ error: 'Audit not found' }, { status: 404 });

    const findings = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId, audit_id: auditId });
    if (findings.length === 0) return Response.json({ error: 'No findings to quantify' }, { status: 400 });

    const company = audit.company_id ? await base44.asServiceRole.entities.Company.get(audit.company_id) : null;

    // LLM quantification
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a revenue impact analyst. Quantify the annual dollar impact of each business finding for ${company?.name || 'this company'} (a ${company?.industry || 'general'} company).

FINDINGS:
${JSON.stringify(findings.map(f => ({ id: f.id, title: f.title, category: f.category, severity: f.severity, description: f.description, business_impact: f.business_impact })), null, 2)}

For each finding, estimate the annual revenue impact in USD:
- annual_impact_min: Conservative estimate (lower bound)
- annual_impact_max: Optimistic estimate (upper bound)
- confidence: 0-100 based on evidence strength
- category: Revenue leak category (lost_leads, pricing_leakage, churn, operational_inefficiency, conversion_gap, other)

Base estimates on industry benchmarks. A small business might lose $50K-$200K per critical finding; mid-market $200K-$1M. Be realistic.`,
      response_json_schema: {
        type: 'object',
        properties: {
          quantifications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                finding_id: { type: 'string' },
                annual_impact_min: { type: 'number' },
                annual_impact_max: { type: 'number' },
                confidence: { type: 'number' },
                category: { type: 'string' }
              }
            }
          }
        }
      }
    });

    // Create RevenueLeak records
    const quantifications = llmResponse.quantifications || [];
    let created = 0;
    for (const q of quantifications) {
      await base44.asServiceRole.entities.RevenueLeak.create({
        organization_id: orgId,
        finding_id: q.finding_id,
        category: q.category,
        annual_impact_min: q.annual_impact_min,
        annual_impact_max: q.annual_impact_max,
        confidence: q.confidence
      });
      created++;
    }

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'quantifier',
      action: 'quantify_findings',
      status: 'success',
      summary: `Quantified ${created} findings for ${company?.name || 'audit'} — total impact $${quantifications.reduce((s, q) => s + (q.annual_impact_max || 0), 0).toLocaleString()}`,
      evidence: { audit_id: auditId, quantified: created, total_max_impact: quantifications.reduce((s, q) => s + (q.annual_impact_max || 0), 0) }
    });

    return Response.json({ status: 'success', audit_id: auditId, quantified: created, total_annual_impact_max: quantifications.reduce((s, q) => s + (q.annual_impact_max || 0), 0) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}