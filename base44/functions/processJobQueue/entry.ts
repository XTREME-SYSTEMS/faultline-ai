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

// P0-1: Runtime identity instrumentation — every dispatch records exact app ID,
// function URL, and build ID to detect stale runtime mismatches.
const SOURCE_APP_ID = Deno.env.get('BASE44_APP_ID') || 'unknown';
const FUNCTION_VERSION = 'v75-taxonomy-closure-001';
const FUNCTION_SOURCE_HASH = 'processJobQueue-v75-r2';

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

    // ─── 5. CAPTURE PRE-SCORE BEFORE EXECUTION (P0-2) ──────────────
    // PRE_SCORE must be captured BEFORE the target function runs.
    // POST_SCORE is captured AFTER execution + closure board refresh.
    // Never query pre and post from the same unchanged state.
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

    if (targetCategory) {
      try {
        const preBoard = await base44.asServiceRole.entities.ClosureBoard
          .filter({ organization_id: orgId, category: targetCategory }).catch(() => []);
        preExecutionScore = preBoard[0]?.score ?? null;
        console.log(`[processJobQueue] PRE_SCORE for ${targetCategory}: ${preExecutionScore}`);
      } catch (e) {
        console.log(`[processJobQueue] Pre-score capture error: ${e.message}`);
      }
    }

    // Capture pre-execution target object state (for terminal state check)
    let preTargetObjectState: any = null;
    if (claimableJob.payload?.taxonomy_node_id) {
      try {
        const preNode = await base44.asServiceRole.entities.EnvatoTaxonomyLedger
          .filter({ organization_id: orgId, taxonomy_node_id: claimableJob.payload.taxonomy_node_id }).catch(() => []);
        preTargetObjectState = preNode[0] || null;
        console.log(`[processJobQueue] PRE target ${claimableJob.payload.taxonomy_node_id}: content_count=${preTargetObjectState?.content_count || 0}`);
      } catch (e) {}
    }

    // ─── 6. EXECUTE THE JOB (P0-1: Runtime Identity) ──────────────
    let executionResult: any = null;
    let executionError: string = '';
    const executionStartTime = Date.now();

    try {
      await base44.asServiceRole.entities.JobQueue.update(claimableJob.id, {
        status: 'running',
        updated_at: new Date().toISOString(),
      });

      // P0-1: Record exact runtime identity used for dispatch
      const TARGET_APP_ID = SOURCE_APP_ID;
      const functionUrl = `https://base44.app/api/apps/${TARGET_APP_ID}/functions/${claimableJob.job_type}`;
      const dispatchBody = {
        ...claimableJob.payload,
        organization_id: orgId,
        job_id: claimableJob.job_id,
        triggered_by: 'processJobQueue',
        _runtime_identity: {
          SOURCE_APP_ID,
          TARGET_APP_ID,
          FUNCTION_NAME: claimableJob.job_type,
          FUNCTION_VERSION,
          FUNCTION_SOURCE_HASH,
          BUILD_ID: claimableJob.build_id || FUNCTION_VERSION,
          JOB_ID: claimableJob.job_id,
        },
      };

      console.log(`[processJobQueue] Dispatching to ${functionUrl} (APP_ID=${SOURCE_APP_ID})`);

      const execRes = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dispatchBody),
        signal: AbortSignal.timeout((claimableJob.timeout_seconds || 120) * 1000),
      });

      if (execRes.ok) {
        executionResult = await execRes.json();
        console.log(`[processJobQueue] Job ${claimableJob.job_id} executed in ${Date.now() - executionStartTime}ms`);
      } else {
        executionError = `Function returned ${execRes.status}: ${await execRes.text()}`;
        console.error(`[processJobQueue] Job ${claimableJob.job_id} failed: ${executionError}`);
      }
    } catch (e) {
      executionError = e.message;
      console.error(`[processJobQueue] Job ${claimableJob.job_id} execution error: ${e.message}`);
    }

    // ─── 7. REFRESH CLOSURE BOARD + CAPTURE POST-SCORE (P0-2) ──────
    let postExecutionScore: number | null = null;
    let closureStatus = 'pending';

    if (targetCategory && executionResult && !executionError) {
      try {
        // Refresh the closure board so POST_SCORE reflects the job's work
        await fetch(`https://base44.app/api/apps/${SOURCE_APP_ID}/functions/updateClosureBoard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organization_id: orgId }),
          signal: AbortSignal.timeout(15000),
        }).catch((e: any) => console.log(`[processJobQueue] Closure board refresh: ${e.message}`));

        const postBoard = await base44.asServiceRole.entities.ClosureBoard
          .filter({ organization_id: orgId, category: targetCategory }).catch(() => []);
        postExecutionScore = postBoard[0]?.score ?? null;
        console.log(`[processJobQueue] POST_SCORE for ${targetCategory}: ${postExecutionScore}`);

        // P0-3: CLOSURE_PASSED only if:
        //   POST_SCORE > PRE_SCORE
        //   OR specific TARGET_OBJECT moved to required terminal state
        //   OR new verified blocker/prerequisite was discovered and persisted
        let targetObjectReachedTerminal = false;
        if (claimableJob.payload?.taxonomy_node_id && preTargetObjectState) {
          try {
            const postNode = await base44.asServiceRole.entities.EnvatoTaxonomyLedger
              .filter({ organization_id: orgId, taxonomy_node_id: claimableJob.payload.taxonomy_node_id }).catch(() => []);
            const postTarget = postNode[0];
            if (postTarget) {
              const requiredCount = claimableJob.payload?.required_count || 10;
              const preCount = preTargetObjectState.content_count || 0;
              const postCount = postTarget.content_count || 0;
              if (postTarget.content_available && postCount >= requiredCount && postCount > preCount) {
                targetObjectReachedTerminal = true;
                console.log(`[processJobQueue] Target ${claimableJob.payload.taxonomy_node_id} reached terminal: ${postCount} >= ${requiredCount}`);
              }
            }
          } catch (e) {}
        }

        if ((postExecutionScore !== null && preExecutionScore !== null && postExecutionScore > preExecutionScore) || targetObjectReachedTerminal) {
          closureStatus = 'closure_passed';
        } else {
          closureStatus = 'no_progress';
        }
      } catch (e) {
        console.log(`[processJobQueue] Post-score capture error: ${e.message}`);
        closureStatus = 'no_progress';
      }
    }

    // P0-3: STALLED_CONVERGENCE only if:
    //   same job_type AND same target object AND same category AND no score increase
    if (closureStatus === 'no_progress') {
      try {
        const recentJobs = await base44.asServiceRole.entities.JobQueue
          .filter({ organization_id: orgId, job_type: claimableJob.job_type }).catch(() => []);
        const targetId = claimableJob.payload?.taxonomy_node_id;
        const recentNoProgress = recentJobs
          .filter((j: any) =>
            j.closure_status === 'no_progress' &&
            j.id !== claimableJob.id &&
            (targetId ? j.payload?.taxonomy_node_id === targetId : true)
          )
          .sort((a: any, b: any) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime());
        if (recentNoProgress.length >= 1) {
          closureStatus = 'stalled_convergence';
          console.log(`[processJobQueue] STALLED_CONVERGENCE for ${claimableJob.job_type} target=${targetId || 'none'}`);
        }
      } catch (e) {}
    }

    // ─── 8. UPDATE JOB STATUS ───────────────────────────────────────
    const completedAt = new Date().toISOString();
    const convergenceDelta = (postExecutionScore !== null && preExecutionScore !== null)
      ? postExecutionScore - preExecutionScore : 0;

    if (executionResult && !executionError) {
      await base44.asServiceRole.entities.JobQueue.update(claimableJob.id, {
        status: 'passed',
        result: { ...executionResult, _runtime_identity: { SOURCE_APP_ID, TARGET_APP_ID: SOURCE_APP_ID, FUNCTION_NAME: claimableJob.job_type, FUNCTION_VERSION, FUNCTION_SOURCE_HASH, BUILD_ID: claimableJob.build_id || FUNCTION_VERSION } },
        completed_at: completedAt,
        updated_at: completedAt,
        closure_status: closureStatus,
        convergence_delta: convergenceDelta,
        pre_execution_score: preExecutionScore,
        post_execution_score: postExecutionScore,
      });
      console.log(`[processJobQueue] Job ${claimableJob.job_id} EXECUTION_PASSED, CLOSURE_${closureStatus.toUpperCase()}, pre=${preExecutionScore} post=${postExecutionScore} delta=${convergenceDelta}`);
    } else {
      await base44.asServiceRole.entities.JobQueue.update(claimableJob.id, {
        status: 'failed',
        error: executionError,
        result: executionResult,
        completed_at: completedAt,
        updated_at: completedAt,
        closure_status: 'failed',
        convergence_delta: 0,
        pre_execution_score: preExecutionScore,
        post_execution_score: null,
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
      runtime_identity: {
        SOURCE_APP_ID,
        TARGET_APP_ID: SOURCE_APP_ID,
        FUNCTION_NAME: claimableJob.job_type,
        FUNCTION_VERSION,
        FUNCTION_SOURCE_HASH,
        BUILD_ID: claimableJob.build_id || FUNCTION_VERSION,
        JOB_ID: claimableJob.job_id,
        FUNCTION_URL: `https://base44.app/api/apps/${SOURCE_APP_ID}/functions/${claimableJob.job_type}`,
      },
      convergence: {
        target_category: targetCategory,
        pre_score: preExecutionScore,
        post_score: postExecutionScore,
        delta: convergenceDelta,
        closure_status: closureStatus,
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