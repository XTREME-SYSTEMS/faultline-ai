// Continuous Improvement Heartbeat — called every 5 minutes by the
// "Continuous Improvement Heartbeat" workflow. Finds the latest clone,
// runs a coverage audit, and if any category is below 99%, triggers a
// re-clone with the latest engine improvements.
//
// This is the autonomous loop that drives the system toward 99% parity
// across all coverage categories without manual intervention.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization' }, { status: 400 });

    // 1. Find the latest clone with a Vercel deployment URL
    const projects = await base44.asServiceRole.entities.LaunchProject.list('-created_date', 10);
    const latestClone = projects.find(p => p.vercel_deployment_url && p.benchmark_url);
    if (!latestClone) {
      return Response.json({ status: 'no_clone', message: 'No clone with deployment URL found' });
    }

    const cloneUrl = latestClone.vercel_deployment_url;
    const sourceUrl = latestClone.benchmark_url;
    console.log(`[heartbeat] Auditing ${cloneUrl} (source: ${sourceUrl})`);

    // 2. Run coverage audit
    const auditRes = await fetch(`https://base44.app/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/runCoverageAudit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clone_url: cloneUrl }),
      signal: AbortSignal.timeout(30000),
    });
    const audit = await auditRes.json().catch(() => ({ error: 'audit failed' }));

    if (!audit.scorecard) {
      return Response.json({ status: 'audit_failed', clone_url: cloneUrl, error: audit.error });
    }

    // 3. Check if any category is below 99%
    const failingCategories = Object.entries(audit.scorecard)
      .filter(([, score]) => (score as number) < 99)
      .map(([cat, score]) => `${cat}: ${score}%`);

    const allPassing = failingCategories.length === 0;
    const overallScore = audit.overall_score || 0;

    console.log(`[heartbeat] Audit: ${overallScore}% — ${allPassing ? 'ALL PASS' : 'FAILING: ' + failingCategories.join(', ')}`);

    // 4. Update the LaunchProject with the audit results
    await base44.asServiceRole.entities.LaunchProject.update(latestClone.id, {
      parity_score: overallScore,
      last_validation_summary: `Coverage: ${overallScore}% — ${allPassing ? 'ALL PASS' : failingCategories.join('; ')}`,
    }).catch(() => {});

    // 5. If any category is below 99%, trigger a re-clone
    let recloneStatus = 'not_needed';
    if (!allPassing && latestClone.iteration < 50) {
      console.log(`[heartbeat] Triggering re-clone for ${latestClone.project_name}`);
      try {
        const recloneRes = await fetch(`https://base44.app/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/autonomousFullSiteClone`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_url: sourceUrl,
            project_name: latestClone.project_name + ' (heal-' + (latestClone.iteration + 1) + ')',
            business_name: latestClone.business_name || latestClone.project_name,
            organization_id: orgId,
            max_pages: 40,
            deploy: true,
          }),
          signal: AbortSignal.timeout(250000),
        });
        const reclone = await recloneRes.json().catch(() => ({ error: 're-clone failed' }));
        recloneStatus = reclone.vercel_url ? `re-cloned: ${reclone.vercel_url}` : `failed: ${reclone.error || 'unknown'}`;

        // Increment iteration on the original project
        await base44.asServiceRole.entities.LaunchProject.update(latestClone.id, {
          iteration: (latestClone.iteration || 0) + 1,
          status: 'retrying',
        }).catch(() => {});
      } catch (e) {
        recloneStatus = `error: ${e.message}`;
      }
    }

    return Response.json({
      status: 'success',
      clone_url: cloneUrl,
      source_url: sourceUrl,
      overall_score: overallScore,
      all_passing: allPassing,
      failing_categories: failingCategories,
      reclone_status: recloneStatus,
      project_name: latestClone.project_name,
      iteration: latestClone.iteration || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[heartbeat] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}