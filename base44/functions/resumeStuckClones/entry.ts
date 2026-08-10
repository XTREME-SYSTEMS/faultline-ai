import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Stalled-project cleanup: detects autonomous clone projects that haven't
// updated in 10+ min and marks them as failed. Does NOT auto-restart (that
// caused cascading "(recovery) (recovery)" chains). Called by the "Stuck
// Clone Recovery" workflow every 5 min as a safety net.
const STALE_MINUTES = 10;
const ACTIVE_STATUSES = ['queued', 'generating', 'provisioning', 'validating', 'testing', 'retrying'];

export default async function(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  const orgId = user?.data?.organization_id;
  if (!orgId) return Response.json({ error: 'No organization' }, { status: 400 });

  const cutoff = new Date(Date.now() - STALE_MINUTES * 60 * 1000).toISOString();
  const projects = await base44.asServiceRole.entities.LaunchProject.filter(
    { organization_id: orgId, status: { $in: ACTIVE_STATUSES } },
    '-updated_date', 50
  );

  const stuck = projects.filter(p => p.updated_date < cutoff);
  const failed = [];

  for (const p of stuck) {
    // Mark the stuck project as failed so the finishStalledClones engine can
    // pick it up and re-trigger healing. We do NOT auto-restart here (that
    // caused cascading "(recovery) (recovery)" chains). The finishStalledClones
    // workflow runs every 30 min and resumes these in controlled batches.
    try {
      await base44.asServiceRole.entities.LaunchProject.update(p.id, {
        status: 'failed',
        last_validation_summary: 'Stalled — process terminated. Re-trigger from Command Center to retry.',
        metadata: { ...(p.metadata || {}), stalled_at: new Date().toISOString() }
      });
      failed.push(p.project_name);
    } catch (e) { /* ignore */ }
  }

  return Response.json({
    checked: projects.length,
    stuck: stuck.length,
    cleaned: failed.length,
    details: { cleaned: failed }
  });
}