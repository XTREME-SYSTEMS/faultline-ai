import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Force Clones to 100 — the aggressive enforcer.
//
// The selfReflectAndHeal loop is good at incremental fixes, but it can't
// solve two classes of problems:
//   1. DEAD TARGETS — the original site is down, parked, or geo-blocked.
//      No amount of healing can match a dead site. These clones get stuck
//      at 50 forever, wasting heal cycles. We detect + quarantine them.
//   2. SCORE-0 CLONES — the clone deployed but renders blank/broken. An
//      incremental heal (re-host the same HTML) won't fix a fundamental
//      build failure. These need a full rebuild from scratch.
//
// This function:
//   1. Cleans up ghost trackers (no Vercel URL, stuck in queued/generating).
//   2. Checks target liveness for every gallery clone. Dead targets → quarantine.
//   3. Score-0 clones → full rebuild via autonomousCloneTo100 BUILD mode.
//   4. Score 1-99 clones → heal via autonomousCloneTo100 HEAL mode.
//   5. Clones at 100 → skip.
//   6. Returns a summary of what was enforced.
//
// Called by the "Force Clones to 100" workflow every 2 hours, and by the
// dashboard "Force All to 100" button.

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

// Check if a target URL is alive and serving real content (not a parking page).
async function checkTargetLiveness(url) {
  try {
    const res = await withTimeout(fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FaultLineBot/1.0)' },
    }), 15000, `liveness ${url}`);

    if (!res.ok && res.status !== 301 && res.status !== 302) {
      return { alive: false, reason: `HTTP ${res.status}` };
    }

    const html = await res.text();
    if (html.length < 500) {
      return { alive: false, reason: 'Page too small (likely error/parking)' };
    }

    // Detect common parking / error patterns
    const lower = html.toLowerCase();
    const parkingPatterns = [
      'godaddy domain parking',
      'domain is for sale',
      'buy this domain',
      'this site can\'t be reached',
      'err_tunnel_connection_failed',
      'this webpage is not available',
      'site can\u2019t be reached',
    ];
    for (const p of parkingPatterns) {
      if (lower.includes(p)) return { alive: false, reason: `Parking/error page detected` };
    }

    return { alive: true, html_chars: html.length };
  } catch (e) {
    return { alive: false, reason: e.message };
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const rebuildLimit = body.rebuild_limit || 2;   // max full rebuilds per run
    const healLimit = body.heal_limit || 5;          // max heals per run
    const quarantineLimit = body.quarantine_limit || 20; // max liveness checks per run
    const cleanupGhosts = body.cleanup_ghosts !== false; // default true

    // 1. Gather all projects
    const projects = await base44.asServiceRole.entities.LaunchProject.filter(
      { organization_id: orgId }, '-created_date', 200
    );

    const gallery = projects.filter(p =>
      p.vercel_deployment_url || p.metadata?.vercel_deployment_url
    );
    const ghosts = projects.filter(p =>
      !p.vercel_deployment_url && !p.metadata?.vercel_deployment_url &&
      ['queued', 'cancelled'].includes(p.status || '') &&
      (!p.parity_score || p.parity_score === 0)
    );

    const at100 = gallery.filter(p => (p.parity_score || 0) >= 100);
    const score0 = gallery.filter(p => !p.parity_score || p.parity_score === 0);
    const below = gallery.filter(p => (p.parity_score || 0) > 0 && (p.parity_score || 0) < 100);
    const quarantined = gallery.filter(p => p.metadata?.target_dead);

    console.log(`forceClonesTo100: ${gallery.length} gallery, ${at100.length} at 100, ${score0.length} at 0, ${below.length} below 100, ${quarantined.length} quarantined, ${ghosts.length} ghosts`);

    // 2. Cleanup ghost trackers — they pollute the project list and confuse the health %
    let ghostsRemoved = 0;
    if (cleanupGhosts) {
      for (const ghost of ghosts.slice(0, 30)) {
        try {
          await base44.asServiceRole.entities.LaunchProject.delete(ghost.id);
          ghostsRemoved++;
        } catch (e) { /* ignore */ }
      }
      console.log(`Cleaned up ${ghostsRemoved} ghost trackers`);
    }

    // 3. Check target liveness for failing clones — quarantine dead targets
    let quarantinedCount = 0;
    const toCheckLiveness = [...score0, ...below]
      .filter(p => !p.metadata?.target_dead && !p.metadata?.liveness_checked)
      .slice(0, quarantineLimit);

    for (const clone of toCheckLiveness) {
      const targetUrl = clone.benchmark_url || clone.metadata?.target_url;
      if (!targetUrl) continue;
      const liveness = await checkTargetLiveness(targetUrl);
      if (!liveness.alive) {
        console.log(`Quarantining ${clone.project_name} — target dead: ${liveness.reason}`);
        try {
          await base44.asServiceRole.entities.LaunchProject.update(clone.id, {
            metadata: {
              ...clone.metadata,
              target_dead: true,
              target_dead_reason: liveness.reason,
              liveness_checked: new Date().toISOString(),
            },
            last_validation_summary: `Target dead: ${liveness.reason} — quarantined`,
          });
          quarantinedCount++;
        } catch (e) { /* ignore */ }
      } else {
        // Mark as checked so we don't re-check every run
        try {
          await base44.asServiceRole.entities.LaunchProject.update(clone.id, {
            metadata: { ...clone.metadata, liveness_checked: new Date().toISOString() },
          });
        } catch (e) { /* ignore */ }
      }
    }

    // 4. Rebuild score-0 clones (full BUILD mode — not incremental heal)
    // Skip quarantined (dead target) and in-progress clones.
    const toRebuild = score0
      .filter(p => !p.metadata?.target_dead)
      .filter(p => !['validating', 'generating', 'provisioning'].includes(p.status))
      .slice(0, rebuildLimit);

    // 5. Heal below-100 clones (HEAL mode — incremental fix)
    // Prioritize closest to 100 (cheapest to push over the line).
    // Skip quarantined and in-progress.
    const toHeal = below
      .filter(p => !p.metadata?.target_dead)
      .filter(p => !['validating', 'generating', 'provisioning'].includes(p.status))
      .sort((a, b) => (b.parity_score || 0) - (a.parity_score || 0)) // highest first
      .slice(0, healLimit);

    console.log(`Plan: ${toRebuild.length} rebuilds, ${toHeal.length} heals, ${quarantinedCount} quarantined`);

    const results = [];
    let rebuilt = 0, healed = 0, stillFailing = 0, stillRunning = 0;

    // Run rebuilds
    for (const clone of toRebuild) {
      const targetUrl = clone.benchmark_url || clone.metadata?.target_url;
      if (!targetUrl) {
        results.push({ id: clone.id, name: clone.project_name, action: 'rebuild', status: 'skipped', reason: 'no target URL' });
        continue;
      }
      console.log(`Rebuilding ${clone.project_name} (score 0) from scratch — target: ${targetUrl}`);
      try {
        const res = await withTimeout(
          base44.functions.invoke('autonomousCloneTo100', {
            target_url: targetUrl,
            launch_project_id: clone.id,
            max_iterations: 5,
          }),
          600000, `rebuild ${clone.project_name}`
        );
        const d = res?.data || res;
        const passed = (d.score || 0) >= 100;
        results.push({
          id: clone.id, name: clone.project_name, action: 'rebuild',
          before: 0, after: d.score || 0, passed, vercel_url: d.vercel_url,
        });
        if (passed) healed++;
        else if (isGatewayTimeout(res) || (d.score || 0) === 0) stillRunning++;
        else stillFailing++;
        rebuilt++;
      } catch (e) {
        if (isGatewayTimeout(e)) {
          results.push({ id: clone.id, name: clone.project_name, action: 'rebuild', status: 'running', error: '524 — rebuild in background' });
          stillRunning++;
        } else {
          results.push({ id: clone.id, name: clone.project_name, action: 'rebuild', status: 'failed', error: e.message });
          stillFailing++;
        }
      }
    }

    // Run heals
    for (const clone of toHeal) {
      console.log(`Healing ${clone.project_name} (score ${clone.parity_score})`);
      try {
        const res = await withTimeout(
          base44.functions.invoke('autonomousCloneTo100', {
            launch_project_id: clone.id,
            max_iterations: 5,
          }),
          600000, `heal ${clone.project_name}`
        );
        const d = res?.data || res;
        const passed = (d.score || 0) >= 100;
        results.push({
          id: clone.id, name: clone.project_name, action: 'heal',
          before: clone.parity_score || 0, after: d.score || 0, passed, vercel_url: d.vercel_url,
        });
        if (passed) healed++;
        else stillFailing++;
      } catch (e) {
        if (isGatewayTimeout(e)) {
          results.push({ id: clone.id, name: clone.project_name, action: 'heal', status: 'running', error: '524 — heal in background' });
          stillRunning++;
        } else {
          results.push({ id: clone.id, name: clone.project_name, action: 'heal', status: 'failed', error: e.message });
          stillFailing++;
        }
      }
    }

    // 6. Log receipt
    const totalAt100 = at100.length + healed;
    const totalGallery = gallery.length - ghostsRemoved;
    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'force_clones_to_100', action: 'enforce',
        status: stillFailing === 0 && stillRunning === 0 ? 'success' : 'partial',
        summary: `Force-to-100: ${totalAt100}/${totalGallery} at 100 (${totalGallery ? Math.round((totalAt100/totalGallery)*100) : 0}%), ${rebuilt} rebuilt, ${healed} healed, ${quarantinedCount} quarantined, ${ghostsRemoved} ghosts removed, ${stillFailing} still failing, ${stillRunning} running`,
        evidence: {
          total_gallery: totalGallery,
          at_100: totalAt100,
          rebuilt, healed, stillFailing, stillRunning,
          quarantined: quarantinedCount,
          ghosts_removed: ghostsRemoved,
          results: results.slice(0, 20),
        },
      });
    } catch (e) { /* ignore */ }

    return Response.json({
      status: stillFailing === 0 && stillRunning === 0 ? 'success' : 'partial',
      total_gallery: totalGallery,
      at_100: totalAt100,
      health_pct: totalGallery ? Math.round((totalAt100 / totalGallery) * 100) : 0,
      rebuilt,
      healed,
      still_failing: stillFailing,
      still_running: stillRunning,
      quarantined: quarantinedCount,
      ghosts_removed: ghostsRemoved,
      results,
    });
  } catch (error) {
    console.error('forceClonesTo100 error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}