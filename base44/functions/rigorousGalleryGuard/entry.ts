import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Rigorous Gallery Guard — scans every clone in the gallery and re-runs the
// rigorous recursive gate on any that have dropped below 100/100. This ensures
// the gallery never contains a broken or degraded clone. Called by the
// "Rigorous Gallery Guard" workflow every 2 hours.
//
// Processes up to heal_limit clones per invocation to stay within the function
// timeout. Clones at 100/100 are skipped (fast audit only).

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
    const healLimit = body.heal_limit || 3;

    // All gallery clones = LaunchProjects with a live Vercel URL
    const projects = await base44.asServiceRole.entities.LaunchProject.filter(
      { organization_id: orgId }, '-created_date', 200
    );

    const gallery = projects.filter(p =>
      p.vercel_deployment_url || p.metadata?.vercel_deployment_url
    );

    // Clones below 100/100 need the rigorous gate re-run
    const needsGate = gallery
      .filter(p => (p.parity_score || 0) < 100)
      .sort((a, b) => (a.parity_score || 0) - (b.parity_score || 0))
      .slice(0, healLimit);

    const at100 = gallery.length - needsGate.length;
    console.log(`rigorousGalleryGuard: ${gallery.length} gallery clones, ${at100} at 100/100, healing ${needsGate.length}`);

    const results = [];
    let healed = 0;
    let stillFailing = 0;

    for (const project of needsGate) {
      const before = project.parity_score || 0;
      const targetUrl = project.benchmark_url || project.metadata?.target_url;
      console.log(`Gallery guard: re-gating ${project.project_name} (score ${before})`);

      try {
        const gateRes = await withTimeout(
          base44.functions.invoke('rigorousCloneGate', {
            launch_project_id: project.id,
            target_url: targetUrl,
            max_iterations: 2,
          }), 600000, `gate ${project.project_name}`
        );
        const gd = gateRes?.data || gateRes;
        const after = gd.score ?? before;
        const passed = gd.passed === true;

        results.push({
          id: project.id, name: project.project_name,
          before, after, passed,
          failures: (gd.failures || []).slice(0, 3),
        });

        if (passed) healed++;
        else stillFailing++;
        console.log(`  → ${project.project_name}: ${before} → ${after} ${passed ? '✓ HEALED' : 'still failing'}`);
      } catch (e) {
        results.push({ id: project.id, name: project.project_name, before, after: before, passed: false, error: e.message });
        stillFailing++;
      }
    }

    // Receipt
    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'rigorous_gallery_guard', action: 'guard',
        status: stillFailing === 0 ? 'success' : 'partial',
        summary: `Gallery guard: ${at100} at 100/100, ${healed} healed, ${stillFailing} still failing of ${gallery.length} total`,
        evidence: { total: gallery.length, at100, healed, stillFailing, results: results.slice(0, 20) },
      });
    } catch (e) { /* ignore */ }

    return Response.json({
      status: 'completed',
      total_gallery: gallery.length,
      at_100: at100,
      healed,
      still_failing: stillFailing,
      results: results.slice(0, 30),
    });
  } catch (error) {
    console.error('rigorousGalleryGuard error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}