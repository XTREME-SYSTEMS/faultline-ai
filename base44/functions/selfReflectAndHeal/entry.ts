import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Self-Reflect & Heal — the autonomous recursive perfection engine.
//
// 1. Scans every gallery clone (LaunchProjects with a live Vercel URL).
// 2. Identifies all clones below 100/100.
// 3. Gathers error data from each failing clone (validation summaries, QA
//    reports, metadata failures).
// 4. Uses InvokeLLM to SELF-REFLECT on the aggregate errors: identifies root
//    causes, patterns, and generates targeted fix directives per clone.
// 5. Calls autonomousCloneTo100 for each failing clone with the LLM-generated
//    fix directives — the autonomous engine then runs the recursive
//    audit → analyze → fix → heal → harden loop until 100/100 or convergence.
// 6. Returns the self-reflection analysis + per-clone heal results.
//
// Called by the "Perfect Clone Guardian" workflow every 2 hours, and by the
// dashboard "Self-Reflect & Heal All" button.

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

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const healLimit = body.heal_limit || 5; // max clones to heal per invocation
    const maxIterations = body.max_iterations || 3;

    // 1. Gather all gallery clones
    const projects = await base44.asServiceRole.entities.LaunchProject.filter(
      { organization_id: orgId }, '-created_date', 200
    );

    const gallery = projects.filter(p =>
      p.vercel_deployment_url || p.metadata?.vercel_deployment_url
    );

    const at100 = gallery.filter(p => (p.parity_score || 0) >= 100);
    const failing = gallery
      .filter(p => (p.parity_score || 0) < 100)
      .sort((a, b) => (a.parity_score || 0) - (b.parity_score || 0));

    console.log(`selfReflectAndHeal: ${gallery.length} gallery clones, ${at100.length} at 100/100, ${failing.length} failing`);

    if (failing.length === 0) {
      // All perfect — log receipt and return
      try {
        await base44.asServiceRole.entities.Receipt.create({
          organization_id: orgId, system: 'self_reflect_heal', action: 'reflect',
          status: 'success',
          summary: `All ${gallery.length} gallery clones at 100/100 — no healing needed`,
          evidence: { total: gallery.length, at100: at100.length, failing: 0 },
        });
      } catch (e) { /* ignore */ }

      return Response.json({
        status: 'all_perfect',
        total_gallery: gallery.length,
        at_100: at100.length,
        failing: 0,
        reflection: 'All gallery clones are at 100/100. No errors detected.',
        results: [],
      });
    }

    // 2. Gather error data from each failing clone
    const errorData = failing.map(p => ({
      id: p.id,
      name: p.project_name || 'Unknown',
      score: p.parity_score || 0,
      vercel_url: p.vercel_deployment_url || p.metadata?.vercel_deployment_url,
      target_url: p.benchmark_url || p.metadata?.target_url,
      last_summary: p.last_validation_summary || '',
      errors: p.errors || p.metadata?.errors || null,
      log: (p.metadata?.log || []).slice(-5),
    }));

    // 3. Fetch recent QA reports for failing clones to get detailed failure lists
    const qaReports = await base44.asServiceRole.entities.QAReport.filter(
      { organization_id: orgId, check_type: 'qa_validation', status: 'failed' },
      '-created_date', 50
    ).catch(() => []);

    const qaByProject = {};
    for (const qa of qaReports) {
      if (!qaByProject[qa.target_id]) qaByProject[qa.target_id] = [];
      qaByProject[qa.target_id].push({
        score: qa.score,
        issues: (qa.issues || []).slice(0, 5).map(i => i.description),
        summary: qa.summary,
      });
    }

    // 4. SELF-REFLECTION: Use LLM to analyze all errors and identify root causes
    const errorDigest = errorData.map(e => ({
      name: e.name,
      score: e.score,
      vercel_url: e.vercel_url,
      target_url: e.target_url,
      last_summary: e.last_summary,
      qa_issues: (qaByProject[e.id] || []).flatMap(q => q.issues).slice(0, 5),
      log_tail: e.log,
    }));

    console.log('Self-reflecting on', errorDigest.length, 'failing clones…');

    const reflectionPrompt = `You are a senior DevOps + frontend architect analyzing failing website clones. 
Each clone is a replicated website deployed to Vercel. The goal is 100/100 parity with the original.

Here are ${errorDigest.length} failing clones with their error data:

${JSON.stringify(errorDigest, null, 2)}

Analyze the aggregate errors and identify:
1. ROOT CAUSES — what patterns do you see across multiple clones? (e.g., missing images, broken forms, JS errors, CSS mismatches, timeout issues)
2. FIX DIRECTIVES — for each clone, provide a specific, actionable fix directive that an autonomous healing engine can follow to fix the issues.

Return a JSON object with:
{
  "root_causes": ["cause 1", "cause 2", ...],
  "patterns_identified": "brief summary of recurring patterns",
  "clone_fixes": [
    { "name": "clone name", "fix_directives": "specific instructions to fix this clone", "priority": "high|medium|low" }
  ]
}`;

    const llmRes = await base44.integrations.Core.InvokeLLM({
      prompt: reflectionPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          root_causes: { type: 'array', items: { type: 'string' } },
          patterns_identified: { type: 'string' },
          clone_fixes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                fix_directives: { type: 'string' },
                priority: { type: 'string' },
              },
            },
          },
        },
      },
    });

    const reflection = llmRes || {};
    console.log('Self-reflection complete:', reflection.root_causes?.length || 0, 'root causes identified');

    // 5. Match LLM fix directives to failing clones and heal them.
    // Skip clones already being healed (tracker in validating/generating status
    // from a previous 524 timeout — the heal is still running server-side).
    const toHeal = [];
    let skipped = 0;
    for (const clone of failing.slice(0, healLimit * 2)) {
      if (toHeal.length >= healLimit) break;
      // Check if this clone is already being healed
      try {
        const tracker = await base44.asServiceRole.entities.LaunchProject.get(clone.id);
        if (tracker && ['validating', 'generating', 'provisioning'].includes(tracker.status) && (tracker.progress || 0) > 0) {
          console.log(`Skipping ${clone.project_name} — heal already in progress (${tracker.progress}% — ${tracker.last_validation_summary || ''})`);
          skipped++;
          continue;
        }
      } catch (e) { /* if we can't read the tracker, proceed with heal */ }
      toHeal.push(clone);
    }

    const results = [];
    let healed = 0;
    let stillFailing = 0;
    let stillRunning = 0;

    for (const clone of toHeal) {
      // Find the LLM-generated fix directive for this clone (match by name)
      const fixMatch = (reflection.clone_fixes || []).find(
        f => f.name === clone.project_name || clone.project_name?.includes(f.name) || f.name?.includes(clone.project_name || '')
      );
      const fixDirectives = fixMatch?.fix_directives || '';

      console.log(`Healing ${clone.project_name} (score ${clone.parity_score || 0}) — directives: ${fixDirectives.slice(0, 100)}…`);

      try {
        const healRes = await withTimeout(
          base44.functions.invoke('autonomousCloneTo100', {
            launch_project_id: clone.id,
            max_iterations: maxIterations,
            fix_directives: fixDirectives,
          }),
          600000, `heal ${clone.project_name}`
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
          fix_directives: fixDirectives.slice(0, 200),
          vercel_url: hd.vercel_url || clone.vercel_deployment_url,
        });

        if (passed) healed++;
        else stillFailing++;
        console.log(`  → ${clone.project_name}: ${clone.parity_score || 0} → ${afterScore} ${passed ? '✓ HEALED' : 'still failing'}`);
      } catch (e) {
        // 524 gateway timeout = heal is still running server-side, not a failure.
        // The next run will pick up the result from the tracker.
        if (isGatewayTimeout(e)) {
          results.push({
            id: clone.id,
            name: clone.project_name,
            before: clone.parity_score || 0,
            after: clone.parity_score || 0,
            passed: false,
            running: true,
            error: `Heal in progress (524 timeout — pipeline running in background)`,
          });
          stillRunning++;
          console.log(`  → ${clone.project_name}: heal still running in background (524)`);
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
          console.error(`  → ${clone.project_name}: heal failed — ${e.message}`);
        }
      }
    }

    // 6. Log receipt
    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'self_reflect_heal', action: 'reflect_heal',
        status: stillFailing === 0 && stillRunning === 0 ? 'success' : 'partial',
        summary: `Self-reflect & heal: ${at100.length} at 100/100, ${failing.length} failing, ${healed} healed, ${stillFailing} still failing, ${stillRunning} still running, ${skipped} skipped of ${gallery.length} total`,
        evidence: {
          total: gallery.length,
          at100: at100.length,
          failing: failing.length,
          healed,
          stillFailing,
          stillRunning,
          skipped,
          root_causes: reflection.root_causes,
          patterns: reflection.patterns_identified,
          results: results.slice(0, 20),
        },
      });
    } catch (e) { /* ignore */ }

    return Response.json({
      status: stillFailing === 0 && stillRunning === 0 ? (healed > 0 ? 'all_healed' : 'all_perfect') : 'partial',
      total_gallery: gallery.length,
      at_100: at100.length,
      failing: failing.length,
      healed,
      still_failing: stillFailing,
      still_running: stillRunning,
      skipped,
      reflection: {
        root_causes: reflection.root_causes || [],
        patterns_identified: reflection.patterns_identified || '',
      },
      results,
    });
  } catch (error) {
    console.error('selfReflectAndHeal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}