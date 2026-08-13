import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { withTimeout, isGatewayTimeout, findTracker } from '../../shared/cloneQueueHelpers.ts';

// Dedicated processor for the "Top 20 epoxy contractor" clone batch.
// Bypasses the general CloneQueue backlog by filtering specifically for
// epoxy-batch items (notes marker), so they don't wait behind 400+ queued
// items or in-progress gate checks.
//
// Flow per item:
//   1. Mark 'cloning', invoke autonomousCloneTo100 (5-10 min)
//   2. On 524 gateway timeout, link the tracker — pipeline continues
//      server-side and the nightly processCloneQueue picks up results.
//   3. On success, run the rigorous gate (rigorousCloneGate).
//
// Invoke repeatedly until all 20 epoxy items reach 'passed' or 'failed'.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const maxItems = body.max_items || 2;

    // Pick up epoxy-batch items that are already in-progress from a prior 524
    const inProgress = await base44.asServiceRole.entities.CloneQueue.filter(
      { organization_id: orgId, status: { $in: ['cloning', 'validating', 'auditing'] }, notes: { $regex: 'Top 20 epoxy' } },
      'created_date', 10
    ).catch(() => []);

    const results = [];

    for (const item of inProgress) {
      if (!item.launch_project_id) continue;
      try {
        const tracker = await base44.asServiceRole.entities.LaunchProject.get(item.launch_project_id);
        if (!tracker) continue;
        const score = tracker.parity_score || 0;
        const trackerStatus = tracker.status;

        if ((trackerStatus === 'passed' || score >= 100) && item.status !== 'auditing') {
          if (item.industry) {
            try { await base44.asServiceRole.entities.LaunchProject.update(tracker.id, { industry: item.industry }); } catch {}
          }
          await base44.asServiceRole.entities.CloneQueue.update(item.id, {
            vercel_url: tracker.vercel_deployment_url,
            final_score: score,
            status: 'auditing',
            notes: 'Running rigorous gate on finished epoxy clone…',
          });
          const gateRes = await withTimeout(
            base44.functions.invoke('rigorousCloneGate', {
              launch_project_id: tracker.id, target_url: item.target_url, max_iterations: 3,
            }), 600000, 'rigorousCloneGate'
          );
          const gateData = gateRes?.data || gateRes;
          const passed = gateData.passed === true;
          const finalScore = gateData.score ?? 0;
          await base44.asServiceRole.entities.CloneQueue.update(item.id, {
            final_score: finalScore, audit_passed: passed,
            status: passed ? 'passed' : 'failed',
            notes: passed ? `Epoxy clone passed gate: ${finalScore}/100` : `Epoxy clone failed gate: ${finalScore}/100`,
          });
          results.push({ id: item.id, name: item.site_name, status: passed ? 'passed' : 'failed', score: finalScore, from_background: true });
          continue;
        }
        if (trackerStatus === 'failed') {
          await base44.asServiceRole.entities.CloneQueue.update(item.id, {
            status: 'failed', error: tracker.last_validation_summary || 'Clone failed',
            notes: 'Epoxy clone failed in background.',
          });
          results.push({ id: item.id, name: item.site_name, status: 'failed', from_background: true });
          continue;
        }
        // Still running
        await base44.asServiceRole.entities.CloneQueue.update(item.id, {
          final_score: score, vercel_url: tracker.vercel_deployment_url || undefined,
          notes: `Epoxy clone running in background (${tracker.progress || 0}%). Will check next cycle.`,
        });
        results.push({ id: item.id, name: item.site_name, status: 'running', progress: tracker.progress, from_background: true });
      } catch (e) { /* ignore */ }
    }

    // Process queued epoxy-batch items
    const queued = await base44.asServiceRole.entities.CloneQueue.filter(
      { organization_id: orgId, status: 'queued', notes: { $regex: 'Top 20 epoxy' } },
      'created_date', maxItems
    ).catch(() => []);

    for (const item of queued) {
      await base44.asServiceRole.entities.CloneQueue.update(item.id, {
        status: 'cloning', attempts: (item.attempts || 0) + 1,
        notes: `Epoxy batch — cloning attempt ${(item.attempts || 0) + 1}/${item.max_attempts || 5}`,
      });
      try {
        const cloneRes = await withTimeout(
          base44.functions.invoke('autonomousCloneTo100', {
            target_url: item.target_url, industry: item.industry,
            business_name: item.site_name, project_name: item.site_name, max_iterations: 5,
          }), 300000, 'autonomousCloneTo100'
        );
        const cloneData = cloneRes?.data || cloneRes;
        if (cloneData.error) throw new Error(cloneData.error);
        const score = cloneData.score || 0;
        const launchProjectId = cloneData.launch_project_id;
        if (launchProjectId && item.industry) {
          try { await base44.asServiceRole.entities.LaunchProject.update(launchProjectId, { industry: item.industry }); } catch {}
        }
        await base44.asServiceRole.entities.CloneQueue.update(item.id, {
          launch_project_id: launchProjectId, vercel_url: cloneData.vercel_url, final_score: score,
          status: 'auditing', notes: 'Epoxy clone finished — running rigorous gate…',
        });
        const gateRes = await withTimeout(
          base44.functions.invoke('rigorousCloneGate', {
            launch_project_id: launchProjectId, target_url: item.target_url, max_iterations: 3,
          }), 600000, 'rigorousCloneGate'
        );
        const gateData = gateRes?.data || gateRes;
        const passed = gateData.passed === true;
        const finalScore = gateData.score ?? 0;
        await base44.asServiceRole.entities.CloneQueue.update(item.id, {
          final_score: finalScore, audit_passed: passed,
          status: passed ? 'passed' : 'failed',
          notes: passed ? `Epoxy clone passed gate: ${finalScore}/100 — ready for template derivation` : `Epoxy clone failed gate: ${finalScore}/100`,
        });
        results.push({ id: item.id, name: item.site_name, status: passed ? 'passed' : 'failed', score: finalScore, vercel_url: cloneData.vercel_url });
      } catch (err) {
        if (isGatewayTimeout(err)) {
          const tracker = await findTracker(base44, orgId, item.target_url);
          if (tracker) {
            await base44.asServiceRole.entities.CloneQueue.update(item.id, {
              status: 'cloning', launch_project_id: tracker.id,
              attempts: item.attempts || 0, error: '',
              vercel_url: tracker.vercel_deployment_url || undefined,
              final_score: tracker.parity_score || 0,
              notes: `Epoxy clone — gateway timeout, pipeline running in background (tracker ${tracker.id}). Nightly workflow will advance it.`,
            });
            results.push({ id: item.id, name: item.site_name, status: 'running', tracker: tracker.id, gateway_timeout: true });
            continue;
          }
        }
        const attempts = (item.attempts || 0) + 1;
        const maxAttempts = item.max_attempts || 5;
        await base44.asServiceRole.entities.CloneQueue.update(item.id, {
          status: attempts >= maxAttempts ? 'failed' : 'queued',
          error: err.message,
          notes: `Epoxy clone attempt ${attempts}/${maxAttempts} failed: ${err.message}`,
        });
        results.push({ id: item.id, name: item.site_name, status: attempts >= maxAttempts ? 'failed' : 'retrying', error: err.message });
      }
    }

    return Response.json({ status: 'completed', processed: results.length, results });
  } catch (error) {
    console.error('processEpoxyBatch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}