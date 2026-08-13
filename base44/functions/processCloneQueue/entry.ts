import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { classifyByBusinessRef } from '../../shared/industryBusinesses.ts';
import { withTimeout, isGatewayTimeout, findTracker } from '../../shared/cloneQueueHelpers.ts';

// Process Clone Queue — the hardened autonomous clone pipeline.
// Picks CloneQueue items with status 'queued', then for each:
//   1. Clone the target site (autonomousCloneTo100 — scrape, infer, generate, launch, validate to 100)
//   2. Run a deep forensic audit (forensicAuditAndHarden) on the resulting clone
//   3. Only mark as 'passed' if BOTH parity >= 100 AND audit passed
//   4. If audit fails, mark 'failed' with notes (clone is NOT added to gallery)
//
// 524 GATEWAY TIMEOUT HANDLING:
// The clone pipeline (autonomousCloneTo100) takes 5-10 minutes. The Base44
// gateway has a ~100s HTTP timeout — when the function exceeds it, the caller
// gets a 524. The pipeline keeps running server-side and writes progress to
// a LaunchProject tracker. This function handles 524 as "still running":
//   - Finds the tracker (created at the start of autonomousCloneTo100 with
//     benchmark_url = target_url) and links it to the queue item.
//   - Does NOT count the 524 as a failed attempt (the attempt was pre-incremented,
//     so we revert it).
//   - Sets the queue item to 'cloning' status.
// On subsequent invocations, the in-progress check picks up results from the
// tracker and advances the queue item to the auditing gate or marks it failed.

// Run the rigorous recursive gate on a finished clone and update the queue item.
async function runGate(base44, orgId, item, launchProjectId, targetUrl) {
  await base44.asServiceRole.entities.CloneQueue.update(item.id, {
    status: 'auditing',
    notes: `Running rigorous recursive gate (validate → audit → heal → harden)…`,
  });

  const gateRes = await withTimeout(
    base44.functions.invoke('rigorousCloneGate', {
      launch_project_id: launchProjectId,
      target_url: targetUrl,
      max_iterations: 3,
    }),
    600000, // 10 min budget for the full recursive gate
    'rigorousCloneGate'
  );
  const gateData = gateRes?.data || gateRes;
  const gatePassed = gateData.passed === true;
  const finalScore = gateData.score ?? 0;

  await base44.asServiceRole.entities.CloneQueue.update(item.id, {
    final_score: finalScore,
    audit_passed: gatePassed,
    audit_summary: gateData.summary || (gatePassed ? 'Rigorous gate passed' : 'Rigorous gate failed'),
  });

  if (gatePassed) {
    await base44.asServiceRole.entities.CloneQueue.update(item.id, {
      status: 'passed',
      notes: `Rigorous gate passed: ${finalScore}/100 + forensic audit clear. Added to gallery.`,
    });
    // Fetch benchmark report (non-blocking)
    try {
      const benchRes = await withTimeout(
        base44.functions.invoke('discoverBenchmarkSite', {
          target_url: targetUrl,
          industry: item.industry,
          business_name: item.site_name,
          launch_project_id: launchProjectId,
        }),
        90000,
        'discoverBenchmarkSite'
      );
      const benchData = benchRes?.data || benchRes;
      if (benchData?.report) {
        await base44.asServiceRole.entities.CloneQueue.update(item.id, {
          benchmark_report: benchData.report,
        });
      }
    } catch (e) { console.error('Benchmark report failed:', e.message); }
    return { status: 'passed', score: finalScore };
  } else {
    const currentAttempt = item.attempts || 0;
    const maxAttempts = item.max_attempts || 5;
    if (currentAttempt < maxAttempts) {
      await base44.asServiceRole.entities.CloneQueue.update(item.id, {
        status: 'queued',
        audit_passed: false,
        final_score: finalScore,
        error: `Rigorous gate failed at ${finalScore}/100`,
        notes: `Gate failed (attempt ${currentAttempt}/${maxAttempts}). Auto-retrying.`,
      });
      return { status: 'retrying', score: finalScore };
    } else {
      await base44.asServiceRole.entities.CloneQueue.update(item.id, {
        status: 'failed',
        audit_passed: false,
        error: `Rigorous gate failed at ${finalScore}/100`,
        notes: `Failed after ${currentAttempt} attempts. Moved to failed card.`,
      });
      return { status: 'failed', score: finalScore };
    }
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const maxItems = body.max_items || 1;

    const results = [];

    // ── IN-PROGRESS CHECK ──────────────────────────────────────────────
    // Pick up results from clones that were started in a previous cycle but
    // whose HTTP call timed out (524). The pipeline continued server-side and
    // wrote progress to a LaunchProject tracker. We check the tracker and
    // advance the queue item accordingly.
    const inProgress = await base44.asServiceRole.entities.CloneQueue.filter(
      { organization_id: orgId, status: { $in: ['cloning', 'validating', 'auditing'] } },
      'created_date', 10
    ).catch(() => []);

    for (const item of inProgress) {
      if (!item.launch_project_id) continue;
      try {
        const tracker = await base44.asServiceRole.entities.LaunchProject.get(item.launch_project_id);
        if (!tracker) continue;

        const score = tracker.parity_score || 0;
        const trackerStatus = tracker.status;

        // Clone finished successfully → run the gate
        if ((trackerStatus === 'passed' || score >= 100) && item.status !== 'auditing') {
          console.log(`In-progress clone finished: ${item.site_name} (${score}/100) — running gate`);
          // Save the industry on the LaunchProject
          if (item.industry) {
            try { await base44.asServiceRole.entities.LaunchProject.update(tracker.id, { industry: item.industry }); } catch {}
          }
          await base44.asServiceRole.entities.CloneQueue.update(item.id, {
            vercel_url: tracker.vercel_deployment_url,
            final_score: score,
          });
          const gateResult = await runGate(base44, orgId, item, tracker.id, item.target_url);
          results.push({ id: item.id, site_name: item.site_name, ...gateResult, from_background: true });
          continue;
        }

        // Clone failed
        if (trackerStatus === 'failed') {
          const attempts = item.attempts || 0;
          const maxAttempts = item.max_attempts || 5;
          if (attempts < maxAttempts) {
            await base44.asServiceRole.entities.CloneQueue.update(item.id, {
              status: 'queued',
              error: tracker.last_validation_summary || 'Clone pipeline failed',
              notes: `Background clone failed (attempt ${attempts}/${maxAttempts}). Will retry.`,
            });
            results.push({ id: item.id, site_name: item.site_name, status: 'retrying', from_background: true });
          } else {
            await base44.asServiceRole.entities.CloneQueue.update(item.id, {
              status: 'failed',
              error: tracker.last_validation_summary || 'Clone pipeline failed',
              notes: `Failed after ${attempts} attempts (background pipeline).`,
            });
            results.push({ id: item.id, site_name: item.site_name, status: 'failed', from_background: true });
          }
          continue;
        }

        // Still running — update progress notes but don't interfere
        if (tracker.progress > 0) {
          await base44.asServiceRole.entities.CloneQueue.update(item.id, {
            final_score: score,
            vercel_url: tracker.vercel_deployment_url || undefined,
            notes: `Pipeline running in background (${tracker.progress}% — ${tracker.last_validation_summary || 'in progress'}). Will check next cycle.`,
          });
          results.push({ id: item.id, site_name: item.site_name, status: 'running', progress: tracker.progress, from_background: true });
        }
      } catch (e) { /* ignore tracker check errors */ }
    }

    // ── PROCESS QUEUED ITEMS ───────────────────────────────────────────
    // Fetch a larger window sorted by created_date, then re-sort in-memory by
    // priority (critical > high > medium > low) so urgent batches jump ahead
    // of the general backlog.
    const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
    const queuedWindow = await base44.asServiceRole.entities.CloneQueue.filter(
      { organization_id: orgId, status: 'queued' }, 'created_date', 100
    ).catch(() => []);
    const queued = queuedWindow
      .sort((a, b) => {
        const pa = PRIORITY_RANK[a.priority] ?? 2;
        const pb = PRIORITY_RANK[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        return new Date(a.created_date) - new Date(b.created_date);
      })
      .slice(0, maxItems);

    if (queued.length === 0 && results.length === 0) {
      return Response.json({ status: 'idle', message: 'No items in clone queue' });
    }

    for (const item of queued) {
      console.log(`Processing queue item: ${item.site_name} (${item.target_url})`);

      // Mark as cloning
      await base44.asServiceRole.entities.CloneQueue.update(item.id, {
        status: 'cloning', attempts: (item.attempts || 0) + 1,
      });

      try {
        // Phase 1: Clone to 100/100
        await base44.asServiceRole.entities.CloneQueue.update(item.id, {
          status: 'validating',
          notes: `Cloning attempt ${(item.attempts || 0) + 1}/${item.max_attempts || 5}`,
        });

        const cloneRes = await withTimeout(
          base44.functions.invoke('autonomousCloneTo100', {
            target_url: item.target_url,
            industry: item.industry,
            business_name: item.site_name,
            project_name: item.site_name,
            max_iterations: 5,
          }),
          300000, // 5 min budget per clone
          'autonomousCloneTo100'
        );

        const cloneData = cloneRes?.data || cloneRes;
        if (cloneData.error) throw new Error(cloneData.error);

        const score = cloneData.score || 0;
        const vercelUrl = cloneData.vercel_url;
        const launchProjectId = cloneData.launch_project_id;

        // Save the industry on the LaunchProject
        if (launchProjectId) {
          const finalIndustry = item.industry || classifyByBusinessRef(item.site_name, item.target_url);
          if (finalIndustry) {
            try { await base44.asServiceRole.entities.LaunchProject.update(launchProjectId, { industry: finalIndustry }); } catch {}
          }
        }

        await base44.asServiceRole.entities.CloneQueue.update(item.id, {
          launch_project_id: launchProjectId,
          vercel_url: vercelUrl,
          final_score: score,
        });

        // Phase 2: Rigorous recursive gate
        const gateResult = await runGate(base44, orgId, item, launchProjectId, item.target_url);
        results.push({ id: item.id, site_name: item.site_name, vercel_url: vercelUrl, ...gateResult });

      } catch (err) {
        console.error(`Clone failed for ${item.site_name}:`, err.message);

        // 524 GATEWAY TIMEOUT — the pipeline is still running server-side.
        // Find the tracker, link it, and DON'T count this as a failed attempt.
        if (isGatewayTimeout(err)) {
          const tracker = await findTracker(base44, orgId, item.target_url);
          if (tracker) {
            console.log(`524 timeout for ${item.site_name} — tracker ${tracker.id} found, pipeline running in background`);
            await base44.asServiceRole.entities.CloneQueue.update(item.id, {
              status: 'cloning',
              launch_project_id: tracker.id,
              attempts: item.attempts || 0, // revert the pre-increment
              error: '',
              vercel_url: tracker.vercel_deployment_url || undefined,
              final_score: tracker.parity_score || 0,
              notes: `Gateway timeout (524) — pipeline running in background (tracker: ${tracker.id}, progress: ${tracker.progress || 0}%). Will check next cycle.`,
            });
            results.push({
              id: item.id, site_name: item.site_name, status: 'running',
              tracker: tracker.id, gateway_timeout: true,
            });
            continue;
          }
        }

        // Normal error (non-timeout) — count as a failed attempt
        const attempts = (item.attempts || 0) + 1;
        const maxAttempts = item.max_attempts || 5;

        if (attempts >= maxAttempts) {
          await base44.asServiceRole.entities.CloneQueue.update(item.id, {
            status: 'failed',
            error: err.message,
            notes: `Failed after ${attempts} attempts: ${err.message}`,
          });
        } else {
          await base44.asServiceRole.entities.CloneQueue.update(item.id, {
            status: 'queued',
            error: err.message,
            notes: `Attempt ${attempts}/${maxAttempts} failed: ${err.message}. Will retry.`,
          });
        }

        results.push({
          id: item.id, site_name: item.site_name, status: 'failed',
          error: err.message, attempts,
        });
      }
    }

    // Receipt
    try {
      const passed = results.filter(r => r.status === 'passed').length;
      const failed = results.filter(r => r.status === 'failed').length;
      const running = results.filter(r => r.status === 'running' || r.status === 'retrying').length;
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'clone_queue_processor', action: 'process',
        status: failed === 0 ? 'success' : 'partial',
        summary: `Queue processor: ${passed} passed, ${failed} failed, ${running} running of ${results.length} processed`,
        evidence: { processed: results.length, passed, failed, running, results },
      });
    } catch (e) { /* ignore */ }

    return Response.json({ status: 'completed', processed: results.length, results });
  } catch (error) {
    console.error('processCloneQueue error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}