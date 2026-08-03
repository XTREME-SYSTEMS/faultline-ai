import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// LLM-powered Tool Advisor — analyzes the contractor's stage, goals, service focus,
// and budget against the full tool catalog, then returns ranked recommendations
// with personalized explanations of WHY each tool fits.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { stage, goals, focus, budget, current_tools } = body;

    if (!stage || !goals || !goals.length) {
      return Response.json({ error: 'stage and goals are required' }, { status: 400 });
    }

    // Load the full tool catalog and bundles
    const [tools, bundles] = await Promise.all([
      base44.asServiceRole.entities.AiTool.filter({ organization_id: orgId, status: 'published' }, '-rating', 50),
      base44.asServiceRole.entities.ToolBundle.filter({ organization_id: orgId, status: 'published' }, '-created_date', 20)
    ]);

    if (!tools.length) {
      return Response.json({ error: 'No tools available in catalog' }, { status: 404 });
    }

    // Build a compact catalog summary for the LLM
    const toolCatalog = tools.map(t => ({
      tool_id: t.tool_id,
      name: t.name,
      category: t.category,
      price: t.price,
      price_mode: t.price_mode,
      description: t.description,
      features: t.features,
      best_for: t.audience
    }));

    const bundleCatalog = bundles.map(b => ({
      bundle_id: b.bundle_id,
      name: b.name,
      price: b.price,
      description: b.description,
      tool_ids: b.tool_ids,
      audience: b.audience
    }));

    const stageLabels = {
      new_business: 'Launching a new flooring business',
      growth: 'Growing an existing flooring business',
      commercial: 'Moving into commercial / bid-based work',
      student: 'Currently a PCU training student'
    };

    const goalLabels = {
      needs_leads: 'Get more leads',
      close_more: 'Close more estimates',
      pricing: 'Price jobs correctly',
      brand: 'Build my brand',
      operations: 'Run jobs better',
      training: 'Learn faster'
    };

    const prompt = `You are an elite business systems advisor for flooring contractors. A contractor has asked for a personalized tool recommendation stack.

CONTRACTOR PROFILE:
- Stage: ${stageLabels[stage] || stage}
- Goals: ${goals.map(g => goalLabels[g] || g).join(', ')}
- Primary service focus: ${focus || 'General flooring'}
- Monthly software budget: $${budget}
- Current tools already in use: ${current_tools?.length ? current_tools.map(t => t.name).join(', ') : 'None'}

AVAILABLE TOOL CATALOG:
${JSON.stringify(toolCatalog, null, 2)}

AVAILABLE BUNDLES:
${JSON.stringify(bundleCatalog, null, 2)}

YOUR TASK:
Select the 3-5 tools (or ONE bundle if it's a better fit than individual tools) that will deliver the highest impact for this specific contractor. For each recommendation, explain WHY it fits their stage, goals, and service focus — not just what the tool does.

RULES:
1. Total monthly cost must stay within the $${budget}/mo budget (unless recommending a single bundle that exceeds it but delivers superior value — in that case, explain the justification)
2. Rank recommendations by impact (highest first)
3. Don't recommend tools the contractor already has
4. For each tool, the "why" explanation must reference the contractor's specific stage, goals, or service focus — generic descriptions are not acceptable
5. If a bundle covers most of the recommended tools at a better price, recommend the bundle instead and explain the savings
6. The "expected_outcome" should be a concrete, measurable result this contractor can expect

Return a JSON object with:
- summary: 2-3 sentence overview of the recommended strategy
- recommendations: array of { tool_id, name, price, price_mode, why, expected_outcome, priority (1-5) }
- bundle_alternative: { bundle_id, name, price, savings, why } or null if no bundle is a better fit
- total_monthly_cost: number
- implementation_order: array of tool_ids in the order they should be adopted`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                tool_id: { type: 'string' },
                name: { type: 'string' },
                price: { type: 'number' },
                price_mode: { type: 'string' },
                why: { type: 'string' },
                expected_outcome: { type: 'string' },
                priority: { type: 'number' }
              }
            }
          },
          bundle_alternative: {
            type: 'object',
            properties: {
              bundle_id: { type: 'string' },
              name: { type: 'string' },
              price: { type: 'number' },
              savings: { type: 'number' },
              why: { type: 'string' }
            }
          },
          total_monthly_cost: { type: 'number' },
          implementation_order: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    // Save the recommendation as a ToolRecommendation record
    try {
      await base44.asServiceRole.entities.ToolRecommendation.create({
        organization_id: orgId,
        stage,
        goals,
        focus: focus || '',
        budget,
        current_tools: current_tools || [],
        recommendations: res.recommendations || [],
        bundle_alternative: res.bundle_alternative,
        total_monthly_cost: res.total_monthly_cost,
        implementation_order: res.implementation_order || [],
        summary: res.summary,
        status: 'complete'
      });
    } catch (e) {
      console.log('ToolRecommendation save skipped:', e.message);
    }

    return Response.json({
      status: 'success',
      ...res
    });
  } catch (error) {
    console.error('recommendToolStack error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}