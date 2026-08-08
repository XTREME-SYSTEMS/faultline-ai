import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Auto-recovery: detects autonomous clone projects that have stalled (no
// progress update in 10+ min — the background waitUntil process was killed)
// and resumes them once. Prevents permanently stuck projects from cluttering
// the pipeline. Called by the "Stuck Clone Recovery" workflow every 5 min.
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
  const resumed = [];
  const failed = [];

  for (const p of stuck) {
    const targetUrl = p.metadata?.target_url || p.benchmark_url;
    const alreadyRecovered = p.metadata?.auto_recovered === true;

    // Mark the stuck project as failed (the background process is dead)
    try {
      await base44.asServiceRole.entities.LaunchProject.update(p.id, {
        status: 'failed',
        last_validation_summary: alreadyRecovered
          ? 'Stalled after auto-recovery — manual intervention needed'
          : 'Stalled — background process terminated. Auto-recovery triggered.',
        metadata: { ...(p.metadata || {}), auto_recovered: true, stalled_at: new Date().toISOString() }
      });
    } catch (e) { /* ignore */ }

    if (targetUrl && !alreadyRecovered) {
      // Start a fresh autonomous clone for the same target (one-time recovery)
      try {
        await base44.functions.invoke('autonomousCloneTo100', {
          target_url: targetUrl,
          industry: p.industry,
          business_name: p.business_name,
          project_name: `${p.project_name} (recovery)`,
          max_iterations: 3
        });
        resumed.push(p.project_name);
      } catch (e) {
        failed.push({ name: p.project_name, error: e.message });
      }
    } else if (alreadyRecovered) {
      failed.push({ name: p.project_name, error: 'already auto-recovered once' });
    } else {
      failed.push({ name: p.project_name, error: 'no target url to resume' });
    }
  }

  return Response.json({
    checked: projects.length,
    stuck: stuck.length,
    resumed: resumed.length,
    failed: failed.length,
    details: { resumed, failed }
  });
}