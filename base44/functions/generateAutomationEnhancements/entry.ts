import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    let { industry, opportunity_id, company_id } = body;

    // Gather context: opportunity details + existing system nodes if company provided
    let opportunity = null;
    if (opportunity_id) {
      opportunity = await base44.asServiceRole.entities.IndustryOpportunity.get(opportunity_id);
      if (opportunity && !industry) industry = opportunity.industry;
    }

    // Derive industry from the company record when not explicitly provided
    if (!industry && company_id) {
      const company = await base44.asServiceRole.entities.Company.get(company_id);
      if (company && company.organization_id === orgId) industry = company.industry;
    }

    if (!industry) return Response.json({ error: 'industry required (pass industry, opportunity_id, or company_id)' }, { status: 400 });

    let systemNodes = [];
    if (company_id) {
      systemNodes = await base44.asServiceRole.entities.SystemNode.filter({ organization_id: orgId, company_id });
    }

    const systemContext = systemNodes.length > 0
      ? `Existing systems: ${systemNodes.map(n => `${n.name} (${n.node_type})`).join(', ')}`
      : 'No existing systems mapped yet.';

    const opportunityContext = opportunity
      ? `Opportunity: ${opportunity.opportunity_title} - ${opportunity.opportunity_description}. Pain points: ${(opportunity.pain_points || []).join('; ')}. Automation types: ${(opportunity.automation_types || []).join(', ')}`
      : `General automation opportunities for the ${industry} industry.`;

    // Generate automation blueprints
    const blueprintResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an expert automation architect. Generate detailed, deployable automation blueprints for the ${industry} industry.

Context:
- Industry: ${industry}
- ${opportunityContext}
- ${systemContext}

Generate 5-8 automation blueprints. Each blueprint should be a specific, implementable automation that enhances a business system. For each:

1. blueprint_name: Action-oriented name (e.g., "Automated Lead Qualification Pipeline")
2. blueprint_type: One of: "workflow", "integration", "ai_agent", "data_pipeline", "monitoring", "customer_facing"
3. description: 2-3 sentence description of what the automation does
4. systems_affected: Array of systems this touches (e.g., ["CRM", "Email", "Calendar"])
5. implementation_steps: Array of 4-6 concrete steps to build this
6. estimated_effort_hours: Hours to implement (number)
7. estimated_roi: Annual ROI percentage (number)
8. tech_stack: Array of technologies needed (e.g., ["OpenAI API", "Zapier", "HubSpot"])
9. before_state: Description of the manual/inefficient current state
10. after_state: Description of the automated enhanced state
11. demo_script: A 3-4 sentence script an operator can read to demo this to a client

Return as JSON with a "blueprints" array.`,
      response_json_schema: {
        type: 'object',
        properties: {
          blueprints: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                blueprint_name: { type: 'string' },
                blueprint_type: { type: 'string' },
                description: { type: 'string' },
                systems_affected: { type: 'array', items: { type: 'string' } },
                implementation_steps: { type: 'array', items: { type: 'string' } },
                estimated_effort_hours: { type: 'number' },
                estimated_roi: { type: 'number' },
                tech_stack: { type: 'array', items: { type: 'string' } },
                before_state: { type: 'string' },
                after_state: { type: 'string' },
                demo_script: { type: 'string' }
              }
            }
          }
        }
      }
    });

    // Store each blueprint
    const created = [];
    for (const bp of (blueprintResponse.blueprints || [])) {
      const record = await base44.asServiceRole.entities.AutomationBlueprint.create({
        organization_id: orgId,
        industry,
        opportunity_id: opportunity_id || '',
        company_id: company_id || '',
        blueprint_name: bp.blueprint_name,
        blueprint_type: bp.blueprint_type,
        description: bp.description,
        systems_affected: bp.systems_affected || [],
        implementation_steps: bp.implementation_steps || [],
        estimated_effort_hours: bp.estimated_effort_hours || 0,
        estimated_roi: bp.estimated_roi || 0,
        tech_stack: bp.tech_stack || [],
        before_state: bp.before_state || '',
        after_state: bp.after_state || '',
        demo_script: bp.demo_script || '',
        status: 'ready'
      });
      created.push(record.id);
    }

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId, system: 'enhancement_generator', action: 'generate_automation_blueprints',
      status: 'success',
      summary: `Generated ${created.length} automation blueprints for ${industry}`,
      evidence: { industry, opportunity_id, company_id, blueprint_ids: created }
    });

    return Response.json({
      status: 'success',
      industry,
      blueprints_generated: created.length,
      blueprint_ids: created
    });
  } catch (error) {
    console.error('generateAutomationEnhancements error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}