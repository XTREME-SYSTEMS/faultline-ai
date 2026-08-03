import { createClientFromRequest } from "npm:@base44/sdk";

const ELIGIBLE = ["queued", "ready", "repairing"];

export default async function handler(request: Request) {
  const base44 = createClientFromRequest(request);
  const user = await base44.auth.me();
  const orgId = user.data?.organization_id;

  if (!orgId) {
    return Response.json({ ok: false, error: "No organization found" }, { status: 400 });
  }

  try {
    // Claim eligible queue items for this org, ordered by priority then position
    const jobs = await base44.asServiceRole.entities.BuildQueueItem.filter(
      { organization_id: orgId, status: { $in: ELIGIBLE } },
      "priority",
      10
    );

    const claimed = [];
    for (const job of jobs) {
      await base44.asServiceRole.entities.BuildQueueItem.update(job.id, {
        status: "analyzing",
        progress: 12,
        current_step: "Analyzing request"
      });
      claimed.push({
        id: job.id,
        name: job.name,
        build_type: job.build_type,
        previous_status: job.status
      });
    }

    // Log audit event
    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: orgId,
      actor_user_id: user.id,
      entity_type: "BuildQueueItem",
      entity_id: "batch",
      action: "queue_processed",
      metadata: { claimed_count: claimed.length, job_ids: claimed.map(c => c.id) }
    });

    return Response.json({
      ok: true,
      claimed,
      message: `Claimed ${claimed.length} job(s) for processing`
    });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}