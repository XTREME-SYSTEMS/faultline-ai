import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { runMandatoryQA } from '../../shared/mandatoryQA.ts';

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
    if (findings.length === 0) return Response.json({ error: 'No findings to plan' }, { status: 400 });

    const company = audit.company_id ? await base44.asServiceRole.entities.Company.get(audit.company_id) : null;

    // LLM generates prioritized repair plan
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are an operations repair strategist. Create a prioritized repair plan for ${company?.name || 'this company'} based on these findings.

FINDINGS (sorted by severity):
${JSON.stringify(findings.map(f => ({ id: f.id, title: f.title, severity: f.severity, category: f.category, recommended_repair: f.recommended_repair, business_impact: f.business_impact })), null, 2)}

Create a repair plan with:
- title: Plan name
- horizon_days: Total implementation window (30, 60, or 90)
- summary: A 2-3 sentence executive summary of the plan's goal, expected outcomes, and total estimated impact
- expected_outcomes: 3-5 measurable business outcomes this plan will deliver (e.g., "Reduce critical findings from 4 to 0", "Improve health score by 20+ points")
- actions: 5-15 specific repair actions, each with:
  - title: Action name
  - priority: 1 (highest) to 5 (lowest)
  - owner_role: A specific named role who should own it (e.g., "IT Security Lead", "Marketing Director", "Operations Manager" — not a generic department)
  - effort_estimate: "low", "medium", or "high"
  - target_day: Target completion day within the horizon (e.g., 15 = day 15)
  - success_metric: A measurable KPI with a target value to verify success (e.g., "SPF record present and valid", "Health score +10 points", "Lead form conversion tracked")
  - validation_criteria: How to verify the fix worked (specific test or re-scan method)
  - finding_id: Which finding this addresses

Prioritize by severity (critical first) and effort (quick wins first). Every action MUST have a named owner role, a measurable success metric with a target value, and a target completion day. No unowned or unmeasurable actions.`,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          horizon_days: { type: 'number' },
          summary: { type: 'string' },
          expected_outcomes: { type: 'array', items: { type: 'string' } },
          actions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                priority: { type: 'number' },
                owner_role: { type: 'string' },
                effort_estimate: { type: 'string' },
                target_day: { type: 'number' },
                success_metric: { type: 'string' },
                validation_criteria: { type: 'string' },
                finding_id: { type: 'string' }
              }
            }
          }
        }
      }
    });

    // Create RepairPlan
    const plan = await base44.asServiceRole.entities.RepairPlan.create({
      organization_id: orgId,
      audit_id: auditId,
      title: llmResponse.title || `Repair Plan — ${company?.name || 'Audit'}`,
      horizon_days: llmResponse.horizon_days || 90,
      status: 'active'
    });

    // Create RepairActions
    const actions = llmResponse.actions || [];
    for (const a of actions) {
      await base44.asServiceRole.entities.RepairAction.create({
        organization_id: orgId,
        repair_plan_id: plan.id,
        finding_id: a.finding_id,
        title: a.title,
        priority: a.priority,
        owner_role: a.owner_role,
        status: 'pending',
        validation_result: a.validation_criteria
      });
    }

    await base44.asServiceRole.entities.Audit.update(auditId, { status: 'analyzed' });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'planner',
      action: 'generate_repair_plan',
      status: 'success',
      summary: `Generated repair plan "${plan.title}" with ${actions.length} actions for ${company?.name || 'audit'}`,
      evidence: { audit_id: auditId, plan_id: plan.id, action_count: actions.length }
    });

    // MANDATORY QA GATE — validate the repair plan before it reaches anyone
    const planContent = `${plan.title} (${plan.horizon_days} days)\nSummary: ${llmResponse.summary || ''}\nExpected outcomes: ${(llmResponse.expected_outcomes || []).join('; ')}\nActions:\n${actions.map((a, i) => `${i + 1}. [P${a.priority}] ${a.title} — Owner: ${a.owner_role}, Effort: ${a.effort_estimate}, Target: Day ${a.target_day || '?'}\n   Success metric: ${a.success_metric || '—'}\n   Validation: ${a.validation_criteria}`).join('\n')}`;
    const qa = await runMandatoryQA(base44, orgId, {
      target_type: 'repair_plan', target_id: plan.id, target_title: plan.title,
      content: planContent, auto: true
    });

    return Response.json({ status: 'success', audit_id: auditId, plan_id: plan.id, actions_created: actions.length, qa });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}