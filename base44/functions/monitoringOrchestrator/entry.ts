import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // Poll active monitoring rules (bounded, paginated)
    const rules = await svc.entities.MonitoringRule.filter({ active: true }, '-created_date', 50);
    let events = 0;

    // Bounded preview check: no live actions, no external calls.
    // In production each approved rule would run its bounded check and emit a
    // MonitoringEvent only when a meaningful change is detected.
    for (const rule of rules) {
      // Preview: classify as no-op (no meaningful change in preview mode)
    }

    // Record an idempotent run receipt
    const receipt = await svc.entities.Receipt.create({
      organization_id: 'system',
      system: 'monitoring',
      action: 'orchestrator-run',
      status: 'success',
      summary: `Orchestrator polled ${rules.length} active rule(s). No live actions taken (preview).`,
      evidence: { rules_polled: rules.length, events_emitted: events, idempotent: true },
      rollback: { required: false }
    });

    return Response.json({
      status: 'success',
      rules_polled: rules.length,
      events_emitted: events,
      receipt_id: receipt.id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}