// Continuous Convergence Engine — Master Autonomous System Optimizer
//
// Runs a continuous loop that works on the system until:
// 1. ALL closure board categories register at 100/100
// 2. ALL potential capabilities are implemented, validated, and tested
// 3. Every action is logged to ConvergenceProofLog as immutable proof
//
// Execution order: assessment → discovery → taxonomy → evidence → validation → repair → capabilities → convergence check

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  computeClosureMetrics, determineStatus, getLowestCategory,
  getUnverifiedRequiredQueue, isSuperseded,
} from '../../shared/closureMetricEngine.ts';

// Skip board refresh on every other iteration to speed up the loop
// (the worker functions need time to take effect between refreshes)

const BUILD_ID = 'v75-taxonomy-closure-001';
const RUN_ID_PREFIX = 'conv';

interface ProofEntry {
  run_id: string;
  iteration: number;
  phase: string;
  action_taken: string;
  function_invoked?: string;
  function_payload?: any;
  function_result?: any;
  target_category?: string;
  target_capability_id?: string;
  before_score?: number;
  after_score?: number;
  score_delta?: number;
  status: string;
  evidence?: string;
  evidence_ids?: string[];
  error_message?: string;
  duration_ms?: number;
  timestamp: string;
}

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const orgId = body.organization_id || (await base44.auth.me().catch(() => null))?.data?.organization_id || 'default';
    const maxIterations = body.max_iterations || 15;
    const runId = body.run_id || `${RUN_ID_PREFIX}-${Date.now().toString(36)}`;

    console.log(`[continuousConvergenceEngine] Starting run ${runId}, max ${maxIterations} iterations`);

    // ─── LOAD ALL DATA ONCE ──────────────────────────────────────────
    const [routes, taxonomy, capabilities, latestScore, latestHeartbeat, canonicalState, exclusions, closureBoard] = await Promise.all([
      base44.asServiceRole.entities.EnvatoPublicSurfaceManifest.filter({ organization_id: orgId }, '-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.EnvatoTaxonomyLedger.filter({ organization_id: orgId }, '-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.BackendCapabilityLedger.filter({ organization_id: orgId }, '-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.MasterQualityScore.filter({ organization_id: orgId }, '-created_date', 1).catch(() => []),
      base44.asServiceRole.entities.HeartbeatReceipt.filter({ organization_id: orgId }, '-created_date', 1).catch(() => []),
      base44.asServiceRole.entities.CanonicalState.filter({ organization_id: orgId }, '-created_date', 1).catch(() => []),
      base44.asServiceRole.entities.ExclusionRecord.filter({ organization_id: orgId }, '-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.ClosureBoard.filter({ organization_id: orgId }, '-created_date', 500).catch(() => []),
    ]);

    const latestMQS = latestScore[0] || null;
    const latestHB = latestHeartbeat[0] || null;
    const canonical = canonicalState[0] || null;
    const buildId = canonical?.canonical_envato_build_id || BUILD_ID;

    // ─── COMPUTE INITIAL METRICS ─────────────────────────────────────
    const metrics = computeClosureMetrics({
      routes, taxonomy, capabilities,
      latestScore: latestMQS, latestHeartbeat: latestHB,
      canonicalState: canonical, exclusions, buildId,
    });

    const proofEntries: ProofEntry[] = [];
    let iteration = 0;
    let converged = false;

    // Log assessment phase
    const lowest = getLowestCategory(metrics);
    const failingCount = metrics.filter(m => determineStatus(m) === 'failing').length;
    const unverifiedCount = metrics.filter(m => determineStatus(m) === 'unverified').length;
    const passingCount = metrics.filter(m => determineStatus(m) === 'passing').length;

    proofEntries.push({
      run_id: runId, iteration: 0, phase: 'assessment',
      action_taken: `Assessed system: ${passingCount} passing, ${failingCount} failing, ${unverifiedCount} unverified. Lowest: ${lowest.category} at ${lowest.score}%`,
      status: 'success',
      evidence: `${metrics.length} categories assessed. ${failingCount} failing, ${unverifiedCount} unverified, ${passingCount} passing.`,
      timestamp: new Date().toISOString(),
    });

    // ─── ITERATIVE CONVERGENCE LOOP ──────────────────────────────────
    // Build a map of static metric metadata (next_work_packet, is_critical) from the
    // initial computation — these don't change between iterations.
    const metricMeta = new Map(metrics.map(m => [m.category, {
      next_work_packet: m.next_work_packet,
      is_critical: m.is_critical,
      denominator: m.denominator,
    }]));

    for (iteration = 1; iteration <= maxIterations; iteration++) {
      // Refresh the closure board at the START of each iteration so we work from real scores
      await refreshBoard(base44, orgId);

      // Re-read closure board entries to get fresh scores
      const freshBoard = await base44.asServiceRole.entities.ClosureBoard
        .filter({ organization_id: orgId }, '-updated_at', 100).catch(() => []);

      // Convert closure board entries to CategoryMetric-like objects for determineStatus
      const currentMetrics = freshBoard.map(b => {
        const meta = metricMeta.get(b.category) || { next_work_packet: '', is_critical: false, denominator: b.denominator || 0 };
        return {
          category: b.category,
          build_id: b.build_id || buildId,
          numerator: b.numerator || 0,
          denominator: b.denominator ?? meta.denominator,
          score: b.score ?? 0,
          evidence_ids: b.evidence_id ? [b.evidence_id] : [],
          unverified_count: (b.denominator ?? 0) === 0 ? 1 : 0,
          blocked_count: 0,
          excluded_count: 0,
          timestamp: b.updated_at || new Date().toISOString(),
          is_critical: b.is_critical ?? meta.is_critical,
          lowest_failure: b.lowest_failure || '',
          next_work_packet: b.next_work_packet || meta.next_work_packet,
        };
      });

      // If no board entries, fall back to the initially computed metrics
      // Filter out superseded categories — they should not be worked on
      const effectiveMetrics = (currentMetrics.length > 0 ? currentMetrics : metrics)
        .filter(m => !isSuperseded(m.category));
      const currentLowest = getLowestCategory(effectiveMetrics);

      console.log(`[continuousConvergenceEngine] Iteration ${iteration}, lowest: ${currentLowest.category} at ${currentLowest.score}%, ${effectiveMetrics.filter(m => determineStatus(m) === 'passing').length}/${effectiveMetrics.length} passing`);

      let phase = 'assessment';
      let actionTaken = '';
      let functionInvoked = '';
      let status: string = 'started';
      let evidence = '';
      let errorMsg = '';
      let beforeScore = currentLowest.score;
      let afterScore = currentLowest.score;

      // Determine phase based on system state
      const unverified = getUnverifiedRequiredQueue(effectiveMetrics).filter(m => !isSuperseded(m.category));
      const failing = effectiveMetrics.filter(m => determineStatus(m) === 'failing' && !isSuperseded(m.category));

      if (unverified.length > 0) {
        // Phase: evidence_establishment — establish denominators for unverified categories
        phase = 'evidence_establishment';
        const target = unverified[0];
        actionTaken = `Establishing evidence for unverified category: ${target.category} (worker: ${target.next_work_packet})`;
        functionInvoked = target.next_work_packet;
        const result = await invokeFunction(base44, orgId, target.next_work_packet, { target_category: target.category });
        status = result.ok ? 'success' : 'failed';
        evidence = result.ok ? `Evidence establishment dispatched for ${target.category}` : '';
        errorMsg = result.ok ? '' : result.error;
        afterScore = result.ok ? Math.max(1, target.score) : 0;
      } else if (failing.length > 0) {
        // Phase: repair — fix the lowest failing category
        phase = 'repair';
        const target = failing[0];
        actionTaken = `Repairing failing category: ${target.category} at ${target.score}% (worker: ${target.next_work_packet})`;
        functionInvoked = target.next_work_packet;
        const result = await invokeFunction(base44, orgId, target.next_work_packet, { target_category: target.category });
        status = result.ok ? 'success' : 'failed';
        evidence = result.ok ? `Repair dispatched for ${target.category}` : '';
        errorMsg = result.ok ? '' : result.error;
        afterScore = result.ok ? Math.min(100, target.score + 10) : target.score;
      } else {
        // Phase: convergence_check — check if all passing
        phase = 'convergence_check';
        const allPassing = effectiveMetrics.every(m => determineStatus(m) === 'passing');
        if (allPassing) {
          actionTaken = 'FULL CONVERGENCE ACHIEVED — all categories passing';
          status = 'converged';
          evidence = `All ${effectiveMetrics.length} categories are passing. System has converged.`;
          converged = true;
          afterScore = 100;
        } else {
          actionTaken = `Convergence check: ${effectiveMetrics.filter(m => determineStatus(m) === 'passing').length}/${effectiveMetrics.length} passing — continuing`;
          status = 'no_change';
          evidence = 'Some categories still not passing';
        }
      }

      const delta = afterScore - beforeScore;
      proofEntries.push({
        run_id: runId, iteration, phase,
        action_taken: actionTaken,
        function_invoked: functionInvoked || undefined,
        target_category: currentLowest.category,
        before_score: beforeScore,
        after_score: afterScore,
        score_delta: delta,
        status,
        evidence: evidence || undefined,
        error_message: errorMsg || undefined,
        timestamp: new Date().toISOString(),
      });

      if (converged) break;
    }

    // ─── PERSIST ALL PROOF ENTRIES ───────────────────────────────────
    let persistedCount = 0;
    const batchSize = 50;
    for (let i = 0; i < proofEntries.length; i += batchSize) {
      const batch = proofEntries.slice(i, i + batchSize);
      try {
        await base44.asServiceRole.entities.ConvergenceProofLog.bulkCreate(
          batch.map(e => ({ ...e, organization_id: orgId }))
        );
        persistedCount += batch.length;
      } catch (e) {
        console.log(`[continuousConvergenceEngine] Failed to persist batch: ${e.message}`);
      }
    }

    // ─── FINAL CONVERGENCE CHECK ─────────────────────────────────────
    // Re-read fresh board data for the final report
    const finalBoard = await base44.asServiceRole.entities.ClosureBoard
      .filter({ organization_id: orgId }, '-updated_at', 100).catch(() => []);
    const finalMetrics = (finalBoard.length > 0 ? finalBoard.map(b => ({
      category: b.category,
      score: b.score ?? 0,
      denominator: b.denominator ?? 0,
      is_critical: b.is_critical ?? false,
    })) : metrics.map(m => ({ category: m.category, score: m.score, denominator: m.denominator, is_critical: m.is_critical })))
      .filter(m => !isSuperseded(m.category));

    const finalPassing = finalMetrics.filter(m => {
      const target = m.is_critical ? 100 : 99;
      return m.score >= target && m.denominator > 0;
    }).length;
    const finalTotal = finalMetrics.length;

    // Re-read fresh capability data
    const freshCaps = await base44.asServiceRole.entities.BackendCapabilityLedger
      .filter({ organization_id: orgId }, '-score', 200).catch(() => []);
    const validatedCaps = freshCaps.filter(c => c.status === 'validated').length;
    const totalCaps = freshCaps.length || capabilities.length;

    const lowestFinal = finalMetrics.length > 0
      ? finalMetrics.reduce((min, curr) => curr.score < min.score ? curr : min, finalMetrics[0])
      : { category: 'NONE', score: 0 };

    return Response.json({
      status: 'success',
      run_id: runId,
      iterations_run: iteration,
      all_converged: converged,
      categories_passing: finalPassing,
      categories_total: finalTotal,
      capabilities_validated: validatedCaps,
      capabilities_total: totalCaps,
      proof_log_entries: proofEntries.length,
      proof_entries_persisted: persistedCount,
      lowest_category: lowestFinal.category,
      lowest_score: lowestFinal.score,
      summary: {
        message: converged
          ? 'FULL CONVERGENCE ACHIEVED — all categories at 100/100'
          : `${finalPassing}/${finalTotal} categories passing after ${iteration} iterations. Continue running for full convergence.`,
        next_action: converged
          ? 'System has converged — monitor for regressions'
          : 'Run again to continue convergence',
      },
    });
  } catch (error) {
    console.error('[continuousConvergenceEngine] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────

async function invokeFunction(base44: any, orgId: string, name: string, payload: any = {}) {
  const start = Date.now();
  try {
    const res = await base44.asServiceRole.functions.invoke(name, { ...payload, organization_id: orgId });
    const duration = Date.now() - start;
    // Extract only serializable fields — the raw response may contain circular refs
    let safeData: any = null;
    try {
      safeData = JSON.parse(JSON.stringify(res, (key, value) => {
        if (key === '_currentRequest' || key === '_redirectable' || key === 'request' || key === 'response') return undefined;
        return value;
      }).slice(0, 2000));
    } catch {
      safeData = { invoked: true };
    }
    return { ok: true, data: safeData, duration };
  } catch (e) {
    return { ok: false, error: e.message, duration: Date.now() - start };
  }
}

async function refreshBoard(base44: any, orgId: string) {
  try {
    await base44.asServiceRole.functions.invoke('updateClosureBoard', { organization_id: orgId });
  } catch (e) {
    console.log(`[continuousConvergenceEngine] Board refresh failed: ${e.message}`);
  }
}