import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { industry, location } = body;
    if (!industry) return Response.json({ error: 'industry required' }, { status: 400 });

    // Use LLM with web search to discover automation opportunities in this industry
    const opportunityResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an expert business analyst specializing in AI automation opportunities. Analyze the "${industry}" industry${location ? ` in ${location}` : ''} and identify ALL automation and AI enhancement opportunities.

For each opportunity, provide:
1. opportunity_title: Short name for the opportunity
2. opportunity_description: 2-3 sentence description of the inefficiency and how AI/automation can fix it
3. automation_potential: Score 0-100 (how automatable is this process)
4. revenue_impact_estimate: Estimated annual revenue impact in USD for a typical company
5. companies_affected_count: Estimated number of companies in this industry that have this problem
6. pain_points: Array of specific pain points this solves
7. automation_types: Array of automation types (e.g., "workflow_automation", "ai_agent", "data_pipeline", "customer_facing_ai", "predictive_analytics")
8. market_size: Market size description (e.g., "$2.3B TAM")
9. trend_direction: "growing", "stable", or "declining"

Generate 8-12 distinct opportunities covering different aspects: operations, customer experience, sales/marketing, compliance, data management, security, supply chain, etc.

Return as a JSON object with an "opportunities" array.`,
      add_context_from_internet: true,
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
                automation_potential: { type: 'number' },
                revenue_impact_estimate: { type: 'number' },
                companies_affected_count: { type: 'number' },
                pain_points: { type: 'array', items: { type: 'string' } },
                automation_types: { type: 'array', items: { type: 'string' } },
                market_size: { type: 'string' },
                trend_direction: { type: 'string' }
              }
            }
          },
          industry_summary: { type: 'string' },
          total_market_opportunity: { type: 'string' }
        }
      }
    });

    // Store each opportunity
    const created = [];
    for (const opp of (opportunityResponse.opportunities || [])) {
      const record = await base44.asServiceRole.entities.IndustryOpportunity.create({
        organization_id: orgId,
        industry,
        location: location || '',
        opportunity_title: opp.opportunity_title,
        opportunity_description: opp.opportunity_description,
        automation_potential: opp.automation_potential || 0,
        revenue_impact_estimate: opp.revenue_impact_estimate || 0,
        companies_affected_count: opp.companies_affected_count || 0,
        pain_points: opp.pain_points || [],
        automation_types: opp.automation_types || [],
        market_size: opp.market_size || '',
        trend_direction: opp.trend_direction || 'stable',
        status: 'discovered'
      });
      created.push(record.id);
    }

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId, system: 'opportunity_finder', action: 'discover_industry_opportunities',
      status: 'success',
      summary: `Discovered ${created.length} automation opportunities in ${industry}${location ? ` (${location})` : ''}`,
      evidence: { industry, location, opportunity_ids: created, industry_summary: opportunityResponse.industry_summary }
    });

    return Response.json({
      status: 'success',
      industry,
      location: location || '',
      industry_summary: opportunityResponse.industry_summary,
      total_market_opportunity: opportunityResponse.total_market_opportunity,
      opportunities_found: created.length,
      opportunity_ids: created
    });
  } catch (error) {
    console.error('discoverIndustryOpportunities error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}