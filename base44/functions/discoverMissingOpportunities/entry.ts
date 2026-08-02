import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Discover Missing Opportunities — analyzes a company's current state (findings,
// system map, competitor benchmarks, industry) and enumerates EVERY opportunity
// the company is missing: automation, revenue, system integration, competitive
// gaps, AI enhancement, marketing/growth, customer experience, operational efficiency.
// Stores each as an IndustryOpportunity linked to the company.

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

    // Gather all context: findings, system nodes, audits, competitor data, existing opportunities
    const [nodes, audits, existingOpps] = await Promise.all([
      base44.asServiceRole.entities.SystemNode.filter({ organization_id: orgId, company_id }),
      base44.asServiceRole.entities.Audit.filter({ organization_id: orgId, company_id }),
      base44.asServiceRole.entities.IndustryOpportunity.filter({ organization_id: orgId, company_id })
    ]);

    let allFindings = [];
    for (const a of audits) {
      const fs = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId, audit_id: a.id });
      allFindings = allFindings.concat(fs);
    }

    const findingsSummary = allFindings.slice(0, 20).map(f =>
      `- [${f.severity}] ${f.title} (${f.category}): ${f.business_impact || ''}`
    ).join('\n');

    const systemsSummary = nodes.map(n =>
      `- ${n.name} (${n.node_type}, health: ${n.health_status || 'unknown'}). Leaks: ${(n.leak_points || []).join('; ')}. AI enhancement: ${n.ai_enhancement || 'none'}`
    ).join('\n');

    const competitors = company.competitor_scores || {};
    const competitorSummary = Object.entries(competitors).slice(0, 5).map(([name, data]) =>
      `- ${name}: score ${data.score}, tech: ${(data.tech_stack || []).join(', ')}, notes: ${(data.notes || []).join('; ')}`
    ).join('\n');

    const existingTitles = existingOpps.map(o => o.opportunity_title);

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the FaultLine AI Opportunity Analyst. Analyze the company below and enumerate EVERY opportunity it is missing — be exhaustive and specific. The goal is to surface every revenue leak, every manual process that should be automated, every disconnected system, every competitive gap, every AI enhancement, and every growth channel they are not exploiting.

COMPANY: ${company.name}
INDUSTRY: ${company.industry || 'unknown'}
DOMAIN: ${company.domain || 'unknown'}

CURRENT FINDINGS (faults & leaks already identified):
${findingsSummary || '(no findings yet — run a deep discovery scan first)'}

CURRENT SYSTEM MAP:
${systemsSummary || '(no systems mapped yet)'}

COMPETITOR BENCHMARKS:
${competitorSummary || '(no competitor data yet)'}

EXISTING OPPORTUNITIES ALREADY LOGGED (do not duplicate these):
${existingTitles.join('\n') || '(none)'}

Generate a comprehensive list of EVERY missing opportunity. For each, provide:
1. opportunity_title: A specific, actionable title (e.g. "Automate lead routing with AI scoring", "Add abandoned-cart email recovery", "Integrate CRM with scheduling tool")
2. opportunity_description: 2-3 sentences explaining the opportunity and why it matters
3. opportunity_type: one of: automation, revenue, system_integration, competitive_gap, ai_enhancement, marketing_growth, customer_experience, operational_efficiency
4. automation_potential: 0-100 (how automatable is this)
5. revenue_impact_estimate: estimated annual revenue impact in USD (number)
6. pain_points: array of 2-3 specific pain points this solves
7. automation_types: array of suggested automation approaches (e.g. ["AI agent", "workflow automation", "integration"])

Aim for 10-20 opportunities covering all 8 types. Be specific to this company's industry and current state. Do not duplicate existing opportunities. Prioritize by revenue impact and automation potential.`,
      response_json_schema: {
        type: 'object',
        properties: {
          opportunities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                opportunity_title: { type: 'string' },
                opportunity_description: { type: 'string' },
                opportunity_type: { type: 'string', enum: ['automation', 'revenue', 'system_integration', 'competitive_gap', 'ai_enhancement', 'marketing_growth', 'customer_experience', 'operational_efficiency'] },
                automation_potential: { type: 'number' },
                revenue_impact_estimate: { type: 'number' },
                pain_points: { type: 'array', items: { type: 'string' } },
                automation_types: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          summary: { type: 'string' }
        }
      }
    });

    // Store each opportunity as an IndustryOpportunity linked to the company
    const created = [];
    for (const opp of (result.opportunities || [])) {
      const record = await base44.asServiceRole.entities.IndustryOpportunity.create({
        organization_id: orgId,
        company_id,
        industry: company.industry || 'general',
        opportunity_title: opp.opportunity_title,
        opportunity_description: opp.opportunity_description,
        opportunity_type: opp.opportunity_type,
        automation_potential: opp.automation_potential || 0,
        revenue_impact_estimate: opp.revenue_impact_estimate || 0,
        pain_points: opp.pain_points || [],
        automation_types: opp.automation_types || [],
        status: 'discovered'
      });
      created.push({ id: record.id, title: opp.opportunity_title, type: opp.opportunity_type, revenue_impact: opp.revenue_impact_estimate, automation_potential: opp.automation_potential });
    }

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId, system: 'opportunity_analyst', action: 'discover_missing_opportunities',
      status: 'success',
      summary: `Discovered ${created.length} missing opportunities for ${company.name}`,
      evidence: { company_id, count: created.length }
    });

    return Response.json({
      status: 'success',
      company_id,
      opportunities_created: created.length,
      opportunities: created,
      summary: result.summary
    });
  } catch (error) {
    console.error('discoverMissingOpportunities error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}