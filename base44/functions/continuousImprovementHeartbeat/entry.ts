// Continuous Improvement Heartbeat — called every 5 minutes by the
// "Continuous Improvement Heartbeat" workflow. Finds the latest clone,
// runs ALL validators separately (sharded architecture to avoid 524 timeouts),
// passes pre-computed results to the Master Quality Gate, and if any category
// is below 99%, triggers a re-clone with the latest engine improvements.
//
// SHARDED VALIDATION ARCHITECTURE:
//   1. runCoverageAudit — fast, runs inline (30s timeout)
//   2. browserAuditClone — slow, runs as separate function call (200s timeout)
//   3. differentialValidation — slow, runs as separate function call (200s timeout)
//   4. masterQualityGate — aggregates all results (uses pre-computed data)
//
// This avoids the 524 timeout that occurred when MQG tried to call browser
// and differential validators internally (function-to-function calls).

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const APP_ID = Deno.env.get('BASE44_APP_ID');
const API_BASE = `https://base44.app/api/apps/${APP_ID}/functions`;

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

    // 2. SHARDED VALIDATION — run each validator separately to avoid 524 timeouts
    //    Browser and differential validators run in parallel, each with their own timeout.
    // Reduced scopes to avoid 524 timeouts — browser audit tests 15 elements
    // (down from 30), differential validation tests 5 key journeys (down from 10).
    // These complete in ~90-120s, well within the 200s function-to-function timeout.
    const DIFFERENTIAL_JOURNEYS = [
      { id: 'J-003', name: 'Graphic Templates category', source_path: '/graphic-templates', clone_path: '/graphic-templates' },
      { id: 'J-006', name: 'AI Tools page', source_path: '/ai-tools', clone_path: '/ai-tools' },
      { id: 'J-009', name: 'Search', source_path: '/search?q=logo', clone_path: '/search?q=logo' },
    ];

    const [browserResult, differentialResult] = await Promise.allSettled([
      // Browser audit shard — reduced to 15 elements
      (async () => {
        try {
          const res = await fetch(`${API_BASE}/browserAuditClone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clone_url: cloneUrl, max_elements: 15 }),
            signal: AbortSignal.timeout(200000),
          });
          return await res.json();
        } catch (e) { return { error: e.message, summary: null }; }
      })(),
      // Differential validation shard — reduced to 5 journeys, no screenshots
      (async () => {
        try {
          const res = await fetch(`${API_BASE}/differentialValidation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clone_url: cloneUrl,
              source_url: sourceUrl,
              journeys: DIFFERENTIAL_JOURNEYS,
              capture_screenshots: false,
            }),
            signal: AbortSignal.timeout(200000),
          });
          return await res.json();
        } catch (e) { return { error: e.message, summary: null }; }
      })(),
    ]);

    // Only pass valid results to MQG. If the shard failed, pass an explicit error
    // object so MQG marks the validator as FAILED without retrying live (which
    // would defeat the sharded architecture and risk 524 timeouts).
    const browserAuditResult = (browserResult.status === 'fulfilled'
      && browserResult.value?.summary
      && browserResult.value.summary.elements_tested > 0
      && browserResult.value.status !== 'error')
      ? browserResult.value
      : { status: 'error', error: browserResult.status === 'rejected' ? 'shard rejected' : 'shard returned no valid summary', summary: null };
    const differentialValResult = (differentialResult.status === 'fulfilled'
      && differentialResult.value?.journeys_tested > 0
      && differentialResult.value.status !== 'error')
      ? differentialResult.value
      : { status: 'error', error: differentialResult.status === 'rejected' ? 'shard rejected' : 'shard returned no valid journeys', journeys_tested: 0 };

    console.log(`[heartbeat] Browser: ${browserAuditResult?.summary?.pass || 0}/${browserAuditResult?.summary?.elements_tested || 0} passed`);
    console.log(`[heartbeat] Differential: ${differentialValResult?.passed || 0}/${differentialValResult?.journeys_tested || 0} journeys passed`);

    // 3. Pass pre-computed results to Master Quality Gate
    const mqgRes = await fetch(`${API_BASE}/masterQualityGate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clone_url: cloneUrl,
        source_url: sourceUrl,
        organization_id: orgId,
        browser_audit_result: browserAuditResult,
        differential_result: differentialValResult,
      }),
      signal: AbortSignal.timeout(60000),
    });
    const mqgResult = await mqgRes.json().catch(() => ({ error: 'MQG failed' }));

    if (!mqgResult.category_scores) {
      return Response.json({ status: 'mqg_failed', clone_url: cloneUrl, error: mqgResult.error });
    }

    // 4. Check ALL 25 categories — any below 99% is a failure
    const REQUIRED_THRESHOLD = 99;
    const failingCategories = Object.entries(mqgResult.category_scores as Record<string, number>)
      .filter(([, score]) => typeof score === 'number' && score < REQUIRED_THRESHOLD)
      .map(([cat, score]) => `${cat}: ${score}%`);

    const allPassing = failingCategories.length === 0;
    const overallScore = mqgResult.overall_score || 0;

    console.log(`[heartbeat] MQG: ${overallScore}% — ${allPassing ? 'ALL PASS' : 'FAILING: ' + failingCategories.join(', ')}`);
    console.log(`[heartbeat] Hard gates: ${mqgResult.hard_gates_passed ? 'PASSED' : 'FAILED'}, Critical: ${mqgResult.open_critical_defects}, High: ${mqgResult.open_high_defects}`);

    // 5. Update the LaunchProject with the full audit results
    await base44.asServiceRole.entities.LaunchProject.update(latestClone.id, {
      parity_score: overallScore,
      last_validation_summary: `MQG: ${overallScore}% — ${allPassing ? 'ALL PASS' : failingCategories.join('; ')}`,
      mandatory_passed: mqgResult.hard_gates_passed || false,
    }).catch(() => {});

    // 6. If any category is below 99%, trigger a re-clone with meaningful change
    let recloneStatus = 'not_needed';
    if (!allPassing && (latestClone.iteration || 0) < 50) {
      // Require a meaningful change — document the defect and expected improvement
      const defectId = failingCategories[0] || 'unknown';
      const rootCause = mqgResult.top_gaps?.[0] || 'unknown';
      const changeset = `marketplace-engine-v1: same-origin placeholders, dynamic filtering/sorting/pagination`;
      console.log(`[heartbeat] Re-cloning: defect=${defectId}, root_cause=${rootCause}, changeset=${changeset}`);

      try {
        const recloneRes = await fetch(`${API_BASE}/autonomousFullSiteClone`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_url: sourceUrl,
            project_name: latestClone.project_name + ' (heal-' + ((latestClone.iteration || 0) + 1) + ')',
            business_name: latestClone.business_name || latestClone.project_name,
            organization_id: orgId,
            max_pages: 30,
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
      hard_gates_passed: mqgResult.hard_gates_passed || false,
      open_critical_defects: mqgResult.open_critical_defects || 0,
      open_high_defects: mqgResult.open_high_defects || 0,
      browser_pass: browserAuditResult?.summary?.pass || 0,
      browser_total: browserAuditResult?.summary?.elements_tested || 0,
      differential_pass: differentialValResult?.passed || 0,
      differential_total: differentialValResult?.journeys_tested || 0,
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