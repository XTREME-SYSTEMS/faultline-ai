import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Finish Stalled Clones — the "they actually finish" engine.
//
// Problem: 69 clones were marked "Stalled — process terminated" by
// resumeStuckClones and just sat there forever. The heal process got
// killed mid-flight (platform timeout / 524) and nobody re-triggered it.
//
// This function:
// 1. DEDUPLICATES — groups clones by target URL, keeps the best-scoring
//    clone per target, deletes redundant copies (17 centimark clones → 1).
//    This frees heal cycles from being wasted on duplicate targets.
// 2. RESUMES — finds all stalled clones (score 1-99, status failed, not
//    quarantined) and re-triggers autonomousCloneTo100 in HEAL mode for
//    each, in small batches with 524-aware handling.
// 3. CONFIRMS — clones already at 80+ just need 1-2 more iterations; the
//    heal engine will push them over the line.
//
// Called by the "Finish Stalled Clones" workflow every 30 min, and by the
// dashboard "Finish Stalled" button.

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms)
    )
  ]);

const isGatewayTimeout = (err) => {
  const msg = (err?.message || '').toLowerCase();
  return msg.includes('524') || msg.includes('gateway') || msg.includes('timed out') || msg.includes('timeout');
};

const isStalled = (p) => {
  if (!p.vercel_deployment_url && !p.metadata?.vercel_deployment_url) return false;
  const s = p.parity_score || 0;
  if (s >= 100) return false; // already done
  if (s === 0) return false; // score-0 needs rebuild, not resume (forceClonesTo100 handles)
  const sum = (p.last_validation_summary || '').toLowerCase();
  if (sum.includes('quarantined') || sum.includes('target dead')) return false; // dead target
  if (['validating', 'generating', 'provisioning'].includes(p.status)) return false; // already running
  return true; // score 1-99, not running, not quarantined → stalled and needs resume
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const healBatch = body.heal_batch || 3; // clones to resume per invocation
    const maxIterations = body.max_iterations || 3;

    // 1. Gather all gallery clones
    const projects = await base44.asServiceRole.entities.LaunchProject.filter(
      { organization_id: orgId }, '-created_date', 300
    );
    const gallery = projects.filter(p => p.vercel_deployment_url || p.metadata?.vercel_deployment_url);

    // 2. DEDUPLICATE by target URL — keep best clone per target, delete rest
    const byTarget = {};
    for (const p of gallery) {
      const target = p.benchmark_url || p.metadata?.target_url;
      if (!target) continue;
      const norm = target.replace(/\/$/, '').toLowerCase();
      if (!byTarget[norm]) byTarget[norm] = [];
      byTarget[norm].push(p);
    }

    const duplicatesRemoved = [];
    for (const [target, clones] of Object.entries(byTarget)) {
      if (clones.length <= 1) continue;
      // Sort by score descending — keep the best one
      clones.sort((a, b) => (b.parity_score || 0) - (a.parity_score || 0));
      const keep = clones[0];
      const toDelete = clones.slice(1);
      for (const d of toDelete) {
        try {
          await base44.asServiceRole.entities.LaunchProject.delete(d.id);
          duplicatesRemoved.push({ id: d.id, name: d.project_name, score: d.parity_score || 0, target });
        } catch (e) { /* ignore */ }
      }
    }

    console.log(`finishStalledClones: dedup removed ${duplicatesRemoved.length} duplicate clones`);

    // 3. Re-fetch gallery after dedup and find stalled clones
    const freshProjects = await base44.asServiceRole.entities.LaunchProject.filter(
      { organization_id: orgId }, '-created_date', 300
    );
    const freshGallery = freshProjects.filter(p => p.vercel_deployment_url || p.metadata?.vercel_deployment_url);
    const stalled = freshGallery.filter(isStalled).sort((a, b) => (b.parity_score || 0) - (a.parity_score || 0));

    console.log(`finishStalledClones: ${stalled.length} stalled clones to resume (after dedup)`);

    // 4. Resume stalled clones in small batches — heal the highest-scoring
    // first (they're closest to 100, cheapest to push over the line).
    const toResume = stalled.slice(0, healBatch);
    const results = [];
    let healed = 0;
    let stillFailing = 0;
    let stillRunning = 0;

    for (const clone of toResume) {
      console.log(`Resuming ${clone.project_name} (score ${clone.parity_score})…`);
      try {
        const healRes = await withTimeout(
          base44.functions.invoke('autonomousCloneTo100', {
            launch_project_id: clone.id,
            max_iterations: maxIterations,
          }),
          600000, `resume heal ${clone.project_name}`
        );
        const hd = healRes?.data || healRes;
        const afterScore = hd.score ?? 0;
        const passed = afterScore >= 100;

        results.push({
          id: clone.id,
          name: clone.project_name,
          before: clone.parity_score || 0,
          after: afterScore,
          passed,
          vercel_url: hd.vercel_url || clone.vercel_deployment_url,
        });

        if (passed) {
          healed++;
          console.log(`  → ${clone.project_name}: ${clone.parity_score} → ${afterScore} ✓ FINISHED`);
        } else {
          stillFailing++;
          console.log(`  → ${clone.project_name}: ${clone.parity_score} → ${afterScore} still failing`);
        }
      } catch (e) {
        if (isGatewayTimeout(e)) {
          // 524 = heal is still running server-side, not a failure.
          // The next run will pick up the result.
          results.push({
            id: clone.id,
            name: clone.project_name,
            before: clone.parity_score || 0,
            after: clone.parity_score || 0,
            passed: false,
            running: true,
            error: 'Heal in progress (524 — running in background)',
          });
          stillRunning++;
          console.log(`  → ${clone.project_name}: heal still running (524)`);
        } else {
          results.push({
            id: clone.id,
            name: clone.project_name,
            before: clone.parity_score || 0,
            after: clone.parity_score || 0,
            passed: false,
            error: e.message,
          });
          stillFailing++;
          console.error(`  → ${clone.project_name}: resume failed — ${e.message}`);
        }
      }
    }

    // 5. Log receipt
    const at100 = freshGallery.filter(p => (p.parity_score || 0) >= 100).length;
    const healthPct = freshGallery.length ? Math.round((at100 / freshGallery.length) * 100) : 0;

    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'finish_stalled', action: 'dedup_resume',
        status: stillFailing === 0 ? 'success' : 'partial',
        summary: `Finish stalled: ${duplicatesRemoved.length} duplicates removed, ${stalled.length} stalled, ${healed} finished, ${stillFailing} still failing, ${stillRunning} running — health ${healthPct}%`,
        evidence: {
          total_gallery: freshGallery.length,
          at100,
          health_pct: healthPct,
          duplicates_removed: duplicatesRemoved.length,
          stalled_found: stalled.length,
          resumed: toResume.length,
          healed,
          stillFailing,
          stillRunning,
          results: results.slice(0, 20),
        },
      });
    } catch (e) { /* ignore */ }

    return Response.json({
      status: stillFailing === 0 && stillRunning === 0 ? (healed > 0 ? 'all_finished' : 'nothing_to_do') : 'partial',
      total_gallery: freshGallery.length,
      at_100: at100,
      health_pct: healthPct,
      duplicates_removed: duplicatesRemoved.length,
      stalled_found: stalled.length,
      resumed: toResume.length,
      healed,
      still_failing: stillFailing,
      still_running: stillRunning,
      results,
    });
  } catch (error) {
    console.error('finishStalledClones error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}