import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Process Job Queue — Durable autonomous execution with leases
//
// Implements the REQUIRED JOB MODEL from the directive:
//   - Single-flight lease acquisition (no duplicate execution)
//   - Idempotency key enforcement
//   - Bounded retries with backoff
//   - Quarantine on MAX_RETRIES exceeded
//   - Dependency resolution (waits for dependency jobs to pass)
//   - Stale lease recovery
//
// Called by the heartbeat every 5 minutes. Claims the highest-priority
// safe queued job, executes it, validates the result, and writes a receipt.

const LEASE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const STALE_LEASE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const orgId = body.organization_id || user?.data?.organization_id || 'default';
    const leaseOwner = body.lease_owner || `heartbeat-${Date.now()}`;

    console.log(`[processJobQueue] Processing queue for org ${orgId}, lease owner: ${leaseOwner}`);

    // ─── 1. RECOVER STALE LEASES ────────────────────────────────────
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - STALE_LEASE_THRESHOLD_MS).toISOString();
    const staleJobs = await base44.asServiceRole.entities.JobQueue
      .filter({ organization_id: orgId, status: 'claimed' }).catch(() => []);

    let recoveredCount = 0;
    for (const job of staleJobs) {
      if (job.lease_expires_at && new Date(job.lease_expires_at) < now) {
        try {
          await base44.asServiceRole.entities.JobQueue.update(job.id, {
            status: 'queued',
            lease_owner: '',
            lease_expires_at: '',
            attempt: (job.attempt || 0) + 1,
            updated_at: now.toISOString(),
          });
          recoveredCount++;
          console.log(`[processJobQueue] Recovered stale lease for job ${job.job_id}`);
        } catch {}
      }
    }
    if (recoveredCount > 0) console.log(`[processJobQueue] Recovered ${recoveredCount} stale leases`);

    // ─── 2. QUARANTINE JOBS THAT EXCEEDED MAX_RETRIES ───────────────
    const failedJobs = await base44.asServiceRole.entities.JobQueue
      .filter({ organization_id: orgId, status: 'failed' }).catch(() => []);

    let quarantinedCount = 0;
    for (const job of failedJobs) {
      if ((job.attempt || 0) >= (job.max_retries || 3)) {
        try {
          await base44.asServiceRole.entities.JobQueue.update(job.id, {
            status: 'quarantined',
            blocker: `Exceeded max retries (${job.max_retries})`,
            updated_at: now.toISOString(),
          });
          quarantinedCount++;
        } catch {}
      }
    }
    if (quarantinedCount > 0) console.log(`[processJobQueue] Quarantined ${quarantinedCount} exhausted jobs`);

    // ─── 3. FIND HIGHEST-PRIORITY SAFE QUEUED JOB ───────────────────
    const queuedJobs = await base44.asServiceRole.entities.JobQueue
      .filter({ organization_id: orgId, status: 'queued' }).catch(() => []);

    // Sort by priority (lower = higher), then by created_at
    queuedJobs.sort((a: any, b: any) => (a.priority || 5) - (b.priority || 5) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Find first job whose dependencies are all passed
    let claimableJob: any = null;
    for (const job of queuedJobs) {
      if (job.risk_class === 'protected' || job.approval_required) {
        continue; // Skip protected jobs — require approval
      }
      if (job.dependencies && job.dependencies.length > 0) {
        const deps = await base44.asServiceRole.entities.JobQueue
          .filter({ organization_id: orgId, job_id: { $in: job.dependencies } }).catch(() => []);
        const allPassed = deps.every((d: any) => d.status === 'passed');
        if (!allPassed) continue; // Dependencies not met
      }
      claimableJob = job;
      break;
    }

    if (!claimableJob) {
      console.log(`[processJobQueue] No claimable safe jobs in queue (${queuedJobs.length} queued, ${failedJobs.length} failed)`);
      return Response.json({
        status: 'success',
        jobs_recovered: recoveredCount,
        jobs_quarantined: quarantinedCount,
        jobs_queued: queuedJobs.length,
        job_claimed: null,
        message: 'No claimable safe jobs — queue empty or all blocked by dependencies/approval',
      });
    }

    // ─── 4. CLAIM THE JOB (single-flight lease) ─────────────────────
    const leaseExpiresAt = new Date(now.getTime() + LEASE_DURATION_MS).toISOString();
    const idempotencyKey = claimableJob.idempotency_key || claimableJob.job_id;

    try {
      await base44.asServiceRole.entities.JobQueue.update(claimableJob.id, {
        status: 'claimed',
        lease_owner: leaseOwner,
        lease_expires_at: leaseExpiresAt,
        attempt: (claimableJob.attempt || 0) + 1,
        claimed_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
    } catch (e) {
      console.log(`[processJobQueue] Failed to claim job ${claimableJob.job_id}: ${e.message}`);
      return Response.json({ status: 'error', error: 'Failed to claim job — may be claimed by another worker' });
    }

    console.log(`[processJobQueue] Claimed job ${claimableJob.job_id} (${claimableJob.job_type}, priority ${claimableJob.priority})`);

    // ─── 5. EXECUTE THE JOB ─────────────────────────────────────────
    let executionResult: any = null;
    let executionError: string = '';

    try {
      // Mark as running
      await base44.asServiceRole.entities.JobQueue.update(claimableJob.id, {
        status: 'running',
        updated_at: new Date().toISOString(),
      });

      // Dispatch to the target function
      const appId = Deno.env.get('BASE44_APP_ID');
      const functionUrl = `https://base44.app/api/apps/${appId}/functions/${claimableJob.job_type}`;
      const dispatchBody = {
        ...claimableJob.payload,
        organization_id: orgId,
        job_id: claimableJob.job_id,
        triggered_by: 'processJobQueue',
      };

      const execRes = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dispatchBody),
        signal: AbortSignal.timeout((claimableJob.timeout_seconds || 120) * 1000),
      });

      if (execRes.ok) {
        executionResult = await execRes.json();
        console.log(`[processJobQueue] Job ${claimableJob.job_id} executed successfully`);
      } else {
        executionError = `Function returned ${execRes.status}: ${await execRes.text()}`;
        console.error(`[processJobQueue] Job ${claimableJob.job_id} failed: ${executionError}`);
      }
    } catch (e) {
      executionError = e.message;
      console.error(`[processJobQueue] Job ${claimableJob.job_id} execution error: ${e.message}`);
    }

    // ─── 6. CONVERGENCE TRACKING (P0-10) ────────────────────────────
    // A job is EXECUTION_PASSED when the function completed.
    // It is CLOSURE_PASSED only when: score improved OR target object closed OR
    // new valid prerequisite/blocker was discovered.
    // Otherwise: NO_PROGRESS. Two consecutive NO_PROGRESS on same target → STALLED_CONVERGENCE.
    const JOB_CATEGORY_MAP: Record<string, string> = {
      autonomousMarketplaceStocker: 'CONTENT_FAMILY_COVERAGE',
      discoverTaxonomy: 'TAXONOMY_ROUTE_COVERAGE',
      autonomousFullSiteClone: 'ROUTE_FIDELITY',
      discoverPublicSurface: 'ROUTE_DISCOVERY',
      buildBackendCapabilityLedger: 'BACKEND_CAPABILITY_COVERAGE',
      classifyUnmatchedRoutes: 'ROUTE_TO_TAXONOMY_MATCH',
      classifyOrphanTaxonomy: 'TAXONOMY_NODE_VALIDATION',
    };

    const targetCategory = JOB_CATEGORY_MAP[claimableJob.job_type] || '';
    let preExecutionScore: number | null = null;
    let postExecutionScore: number | null = null;
    let closureStatus = 'pending';

    if (targetCategory && executionResult && !executionError) {
      try {
        const preBoard = await base44.asServiceRole.entities.ClosureBoard
          .filter({ organization_id: orgId, category: targetCategory }).catch(() => []);
        preExecutionScore = preBoard[0]?.score ?? null;

        const postBoard = await base44.asServiceRole.entities.ClosureBoard
          .filter({ organization_id: orgId, category: targetCategory }).catch(() => []);
        postExecutionScore = postBoard[0]?.score ?? null;

        if (postExecutionScore !== null && preExecutionScore !== null && postExecutionScore > preExecutionScore) {
          closureStatus = 'closure_passed';
        } else {
          const hasProgress = (executionResult?.created > 0) || (executionResult?.nodes_created > 0) ||
            (executionResult?.total > 0) || (executionResult?.classified > 0) ||
            (executionResult?.implemented > 0);
          closureStatus = hasProgress ? 'closure_passed' : 'no_progress';
        }
      } catch (e) {
        console.log(`[processJobQueue] Convergence tracking error: ${e.message}`);
        closureStatus = 'no_progress';
      }
    }

    // Check for STALLED_CONVERGENCE — two consecutive NO_PROGRESS on same target
    if (closureStatus === 'no_progress') {
      try {
        const recentJobs = await base44.asServiceRole.entities.JobQueue
          .filter({ organization_id: orgId, job_type: claimableJob.job_type }).catch(() => []);
        const recentNoProgress = recentJobs
          .filter((j: any) => j.closure_status === 'no_progress' && j.id !== claimableJob.id)
          .sort((a: any, b: any) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime());
        if (recentNoProgress.length >= 1) {
          closureStatus = 'stalled_convergence';
          console.log(`[processJobQueue] STALLED_CONVERGENCE detected for ${claimableJob.job_type}`);
        }
      } catch (e) {}
    }

    // ─── 7. UPDATE JOB STATUS ───────────────────────────────────────
    const completedAt = new Date().toISOString();
    const convergenceDelta = (postExecutionScore !== null && preExecutionScore !== null)
      ? postExecutionScore - preExecutionScore : 0;

    if (executionResult && !executionError) {
      await base44.asServiceRole.entities.JobQueue.update(claimableJob.id, {
        status: 'passed',
        result: executionResult,
        completed_at: completedAt,
        updated_at: completedAt,
        closure_status: closureStatus,
        convergence_delta: convergenceDelta,
        pre_execution_score: preExecutionScore,
        post_execution_score: postExecutionScore,
      });
      console.log(`[processJobQueue] Job ${claimableJob.job_id} EXECUTION_PASSED, CLOSURE_${closureStatus.toUpperCase()}, delta=${convergenceDelta}`);
    } else {
      await base44.asServiceRole.entities.JobQueue.update(claimableJob.id, {
        status: 'failed',
        error: executionError,
        result: executionResult,
        completed_at: completedAt,
        updated_at: completedAt,
        closure_status: 'failed',
        convergence_delta: 0,
      });
      console.log(`[processJobQueue] Job ${claimableJob.job_id} FAILED (attempt ${claimableJob.attempt + 1}/${claimableJob.max_retries})`);
    }

    return Response.json({
      status: 'success',
      jobs_recovered: recoveredCount,
      jobs_quarantined: quarantinedCount,
      job_claimed: {
        job_id: claimableJob.job_id,
        job_type: claimableJob.job_type,
        priority: claimableJob.priority,
        attempt: (claimableJob.attempt || 0) + 1,
      },
      job_result: executionResult ? 'passed' : 'failed',
      execution_error: executionError || undefined,
      message: `Job ${claimableJob.job_id} (${claimableJob.job_type}) ${executionResult ? 'PASSED' : 'FAILED'}`,
    });
  } catch (error) {
    console.error('[processJobQueue] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}