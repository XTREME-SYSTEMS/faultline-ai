import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Batch orchestrator: heals ALL launched clone sites below 100/100 parity.
// Iterates through every LaunchProject with 0 < score < 100 and invokes the
// autonomousCloneTo100 heal engine on each (max_iterations per project).
//
// Processes sequentially so each project gets full attention. The 30-min
// "Recursive Auto-Heal to 100" workflow continues picking up any that this
// run doesn't finish within the function lifetime.

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms)
    )
  ]);

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const maxIterationsPerProject = body.max_iterations || 3;
    // Process only N projects per invocation — the 30-min workflow cycle
    // picks up the rest. Without this limit the function blows the ~300s
    // platform timeout and returns 504, healing nothing.
    const batchLimit = body.batch_limit || 1; // 1 per run = safe under the ~300s platform timeout

    // Get ALL launched clone projects below 100/100
    const allProjects = await base44.asServiceRole.entities.LaunchProject.filter(
      { organization_id: orgId }, '-created_date', 200
    );

    // Healable = below 100 AND has a live URL to validate (target_url optional —
    // without it we can only validate, not re-clone, but validation alone can
    // still bump the score if the site has settled since last check).
    const needsHeal = allProjects.filter(
      p => (p.parity_score || 0) > 0 && (p.parity_score || 0) < 100 &&
           (p.vercel_deployment_url || p.metadata?.target_url)
    );

    const notStarted = allProjects.filter(
      p => (!p.parity_score || p.parity_score === 0) &&
           (p.vercel_deployment_url || p.metadata?.target_url)
    );

    // Dedupe by id
    const seen = new Set();
    const queue = [...needsHeal, ...notStarted].filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id); return true;
    });
    const results = [];
    let healed = 0;
    let stillBelow = 0;

    // Slice to batch limit — only process N per run to stay within platform timeout
    const batch = queue.slice(0, batchLimit);
    console.log(`healAllClonesTo100: ${queue.length} eligible, processing ${batch.length} this run (batch_limit=${batchLimit})`);

    for (const project of batch) {
      const startScore = project.parity_score || 0;
      console.log(`Healing: ${project.project_name} (current score: ${startScore})`);

      try {
        const healRes = await withTimeout(
          base44.functions.invoke('autonomousCloneTo100', {
            launch_project_id: project.id,
            max_iterations: maxIterationsPerProject,
            scan: false
          }),
          110000, // ~110s budget per project to fit several within function lifetime
          `heal ${project.project_name}`
        ).catch(e => ({ error: e.message }));

        const hd = healRes?.data || healRes;
        const finalScore = hd?.score ?? startScore;

        results.push({
          id: project.id,
          name: project.project_name,
          start_score: startScore,
          final_score: finalScore,
          status: finalScore >= 100 ? 'passed' : 'partial',
          error: hd?.error || null
        });

        if (finalScore >= 100) healed++;
        else stillBelow++;

        console.log(`  → ${project.project_name}: ${startScore} → ${finalScore} ${finalScore >= 100 ? '✓ PASSED' : ''}`);
      } catch (e) {
        results.push({
          id: project.id, name: project.project_name,
          start_score: startScore, final_score: startScore,
          status: 'error', error: e.message
        });
        stillBelow++;
        console.log(`  → ${project.project_name}: ERROR ${e.message}`);
      }
    }

    // Summary receipt
    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'batch_heal', action: 'heal_all',
        status: stillBelow === 0 ? 'success' : 'partial',
        summary: `Batch heal: ${healed}/${queue.length} reached 100/100, ${stillBelow} still below`,
        evidence: { total: queue.length, healed, stillBelow, results: results.slice(0, 30) }
      });
    } catch (e) { console.error('receipt failed:', e); }

    return Response.json({
      status: 'completed',
      total_processed: queue.length,
      reached_100: healed,
      still_below_100: stillBelow,
      results: results.slice(0, 50)
    });
  } catch (error) {
    console.error('healAllClonesTo100 error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}