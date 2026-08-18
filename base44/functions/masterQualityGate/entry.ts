// Master Quality Gate 2.0 — adversarial quality gate that combines all validators
// into a single hard-gate scorecard. NO AVERAGING: each category must independently
// pass at >=99% (critical paths at 100%). The overall score is the MINIMUM of all
// category scores, not the average.
//
// Validators called (in parallel where possible):
//   1. runCoverageAudit — static + content + security + route coverage
//   2. browserAuditClone — real browser interaction parity
//   3. differentialValidation — behavioral + visual parity vs source
//
// Output: a MasterQualityScore record persisted to the database, plus a full
// evidence receipt proving which validators ran, what they found, and whether
// the hard gates passed.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const APP_ID = Deno.env.get('BASE44_APP_ID');
const API_BASE = `https://base44.app/api/apps/${APP_ID}/functions`;

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    const body = await req.json().catch(() => ({}));
    const { clone_url, source_url, organization_id, max_elements = 30, browser_audit_result, differential_result } = body;

    if (!clone_url) return Response.json({ error: 'clone_url required' }, { status: 400 });
    const targetOrg = organization_id || orgId;
    const sourceUrl = source_url || '';

    console.log(`[masterQualityGate] Starting gate for ${clone_url}`);

    // ─── Run all validators in parallel ──────────────────────────────
    const validatorResults: Record<string, any> = {};
    const validatorErrors: Record<string, string> = {};

    const validators = [
      // Coverage audit — static, content, security, route, accessibility
      (async () => {
        try {
          const res = await fetch(`${API_BASE}/runCoverageAudit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clone_url }),
            signal: AbortSignal.timeout(60000),
          });
          validatorResults.coverage = await res.json();
          console.log('[masterQualityGate] Coverage audit done');
        } catch (e: any) {
          validatorErrors.coverage = e.message;
          console.error('[masterQualityGate] Coverage audit failed:', e.message);
        }
      })(),
      // Browser audit — use pre-computed result if provided, else call the function
      (async () => {
        if (browser_audit_result) {
          validatorResults.browser = browser_audit_result;
          console.log('[masterQualityGate] Browser audit: using pre-computed result');
          return;
        }
        try {
          const res = await fetch(`${API_BASE}/browserAuditClone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clone_url, max_elements }),
            signal: AbortSignal.timeout(200000),
          });
          validatorResults.browser = await res.json();
          console.log('[masterQualityGate] Browser audit done');
        } catch (e: any) {
          validatorErrors.browser = e.message;
          console.error('[masterQualityGate] Browser audit failed:', e.message);
        }
      })(),
      // Differential validation — use pre-computed result if provided, else call
      (async () => {
        if (differential_result) {
          validatorResults.differential = differential_result;
          console.log('[masterQualityGate] Differential: using pre-computed result');
          return;
        }
        if (!sourceUrl) { validatorErrors.differential = 'no source_url provided'; return; }
        try {
          const res = await fetch(`${API_BASE}/differentialValidation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clone_url, source_url: sourceUrl }),
            signal: AbortSignal.timeout(200000),
          });
          validatorResults.differential = await res.json();
          console.log('[masterQualityGate] Differential validation done');
        } catch (e: any) {
          validatorErrors.differential = e.message;
          console.error('[masterQualityGate] Differential validation failed:', e.message);
        }
      })(),
    ];

    await Promise.allSettled(validators);

    // ─── Calculate category scores ──────────────────────────────────
    const categoryScores: Record<string, number> = {};
    const topGaps: string[] = [];
    let openCriticalDefects = 0;
    let openHighDefects = 0;

    // 1. Static coverage (from runCoverageAudit)
    if (validatorResults.coverage?.scorecard) {
      const sc = validatorResults.coverage.scorecard;
      categoryScores.static_coverage = sc.overall || 0;
      categoryScores.route_coverage = sc.public_routes || 0;
      categoryScores.content_structure = sc.content_structure || 0;
      categoryScores.security = sc.security || 0;
      categoryScores.accessibility = sc.accessibility || 0;
      categoryScores.frontend_backend_integration = sc.frontend_backend_integration || 0;
      categoryScores.backend_functional = sc.backend_functional || 0;
      categoryScores.data_persistence = sc.data_persistence || 0;
      categoryScores.api_function = sc.api_function || 0;
      categoryScores.performance = sc.performance || 0;
      categoryScores.reliability_recovery = sc.reliability_recovery || 0;
      categoryScores.observability = sc.observability || 0;
      categoryScores.clone_engine_regression = sc.clone_engine_regression || 0;
      // Count defects from coverage audit
      if (validatorResults.coverage.ledger) {
        for (const entry of validatorResults.coverage.ledger) {
          if (entry.status === 'fail') {
            if (entry.severity === 'critical') openCriticalDefects++;
            else if (entry.severity === 'high') openHighDefects++;
          }
        }
      }
    } else {
      categoryScores.static_coverage = 0;
      topGaps.push('Coverage audit failed or returned no scorecard');
    }

    // 2. Browser interaction (from browserAuditClone)
    if (validatorResults.browser?.summary) {
      const bs = validatorResults.browser.summary;
      const total = bs.elements_tested || 1;
      const passed = bs.pass || 0;
      const notApplicable = bs.not_applicable || 0;
      const effective = total - notApplicable;
      categoryScores.browser_interaction = effective > 0 ? Math.round((passed / effective) * 100) : 0;
      categoryScores.navigation = effective > 0 ? Math.round(((passed) / effective) * 100) : 0;
      categoryScores.interaction = categoryScores.browser_interaction;
      // Count dead ends and network failures as defects
      openHighDefects += (bs.fail_dead_end || 0) + (bs.fail_dead_link || 0);
      openHighDefects += (bs.fail_network || 0);
      openCriticalDefects += (bs.fail_404 || 0);
      if (bs.fail_dead_end > 0) topGaps.push(`${bs.fail_dead_end} dead-end controls (click produces no visible result)`);
      if (bs.fail_network > 0) topGaps.push(`${bs.fail_network} elements with network failures (CORS, font loading, API errors)`);
      if (bs.fail_404 > 0) topGaps.push(`${bs.fail_404} elements leading to 404 pages`);
    } else {
      categoryScores.browser_interaction = 0;
      topGaps.push('Browser audit failed or returned no summary');
    }

    // 3. Behavioral + visual parity (from differentialValidation)
    if (validatorResults.differential?.summary) {
      const ds = validatorResults.differential.summary;
      categoryScores.behavioral_parity = ds.behavioral_parity_score || ds.journey_pass_rate || 0;
      categoryScores.visual_parity = ds.visual_parity_score || ds.avg_visual_parity || 0;
      categoryScores.responsive_parity = ds.responsive_parity_score || 0;
      categoryScores.frontend = ds.frontend_score || categoryScores.browser_interaction;
      categoryScores.backend = ds.backend_score || 0;
      categoryScores.auth = ds.auth_score || 0;
      categoryScores.data_persistence = ds.data_persistence_score || categoryScores.data_persistence || 0;
      if (ds.top_gaps) topGaps.push(...ds.top_gaps.slice(0, 5));
    } else {
      categoryScores.behavioral_parity = 0;
      categoryScores.visual_parity = 0;
      topGaps.push('Differential validation failed or returned no summary');
    }

    // 4. Deployment integrity — verify the clone is actually live and reachable
    try {
      const res = await fetch(clone_url, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
      categoryScores.deployment_integrity = res.ok ? 100 : 0;
      if (!res.ok) topGaps.push(`Clone URL returned HTTP ${res.status}`);
    } catch (e: any) {
      categoryScores.deployment_integrity = 0;
      topGaps.push(`Clone URL unreachable: ${e.message}`);
    }

    // ─── Calculate overall score (MINIMUM, not average) ──────────────
    const allScores = Object.values(categoryScores).filter(s => typeof s === 'number');
    const overallScore = allScores.length > 0 ? Math.min(...allScores) : 0;

    // ─── Hard gates ─────────────────────────────────────────────────
    // Critical categories must be 100%, non-critical >= 99%
    const CRITICAL_CATEGORIES = ['route_coverage', 'browser_interaction', 'deployment_integrity'];
    const REQUIRED_THRESHOLD = 99;
    const CRITICAL_THRESHOLD = 100;

    const hardGatesPassed = CRITICAL_CATEGORIES.every(cat => (categoryScores[cat] || 0) >= CRITICAL_THRESHOLD)
      && allScores.every(s => s >= REQUIRED_THRESHOLD);

    const cleanPass = hardGatesPassed && openCriticalDefects === 0 && openHighDefects === 0;

    // ─── Build repair queue from gaps ────────────────────────────────
    const repairQueue = topGaps.map(gap => ({
      priority: gap.includes('404') ? 'critical' : gap.includes('network') || gap.includes('CORS') ? 'high' : 'medium',
      description: gap,
      root_cause: gap.includes('font') || gap.includes('CORS') ? 'cross-origin font loading' :
                  gap.includes('dead-end') ? 'missing interaction reconstruction' :
                  gap.includes('404') ? 'missing route' : 'unknown',
    }));

    // ─── Persist MasterQualityScore ──────────────────────────────────
    let scoreId: string | null = null;
    if (targetOrg) {
      try {
        const score = await base44.asServiceRole.entities.MasterQualityScore.create({
          organization_id: targetOrg,
          clone_url,
          source_url: sourceUrl,
          engine_version: 'autonomousFullSiteClone_v43',
          static_coverage: categoryScores.static_coverage || 0,
          browser_interaction_score: categoryScores.browser_interaction || 0,
          behavioral_parity_score: categoryScores.behavioral_parity || 0,
          visual_parity_score: categoryScores.visual_parity || 0,
          responsive_parity_score: categoryScores.responsive_parity || 0,
          backend_score: categoryScores.backend || 0,
          frontend_backend_integration_score: categoryScores.frontend_backend_integration || 0,
          auth_score: categoryScores.auth || 0,
          data_persistence_score: categoryScores.data_persistence || 0,
          accessibility_score: categoryScores.accessibility || 0,
          security_score: categoryScores.security || 0,
          performance_score: categoryScores.performance || 0,
          error_recovery_score: categoryScores.reliability_recovery || 0,
          content_structure_score: categoryScores.content_structure || 0,
          route_coverage_score: categoryScores.route_coverage || 0,
          clone_engine_regression_score: categoryScores.clone_engine_regression || 0,
          overall_score: overallScore,
          category_scores: categoryScores,
          hard_gates_passed: hardGatesPassed,
          clean_pass: cleanPass,
          open_critical_defects: openCriticalDefects,
          open_high_defects: openHighDefects,
          top_gaps: topGaps.slice(0, 10),
          repair_queue: repairQueue,
          run_at: new Date().toISOString(),
        });
        scoreId = score.id;
      } catch (e: any) {
        console.error('[masterQualityGate] Failed to persist score:', e.message);
      }
    }

    // ─── Return evidence receipt ─────────────────────────────────────
    return Response.json({
      status: 'success',
      clone_url,
      source_url: sourceUrl,
      engine_version: 'autonomousFullSiteClone_v43',
      validator_version: 'masterQualityGate_v1',
      timestamp: new Date().toISOString(),
      overall_score: overallScore,
      hard_gates_passed: hardGatesPassed,
      clean_pass: cleanPass,
      open_critical_defects: openCriticalDefects,
      open_high_defects: openHighDefects,
      category_scores: categoryScores,
      top_gaps: topGaps.slice(0, 10),
      repair_queue: repairQueue,
      score_id: scoreId,
      validators_run: {
        coverage: { status: validatorResults.coverage ? 'completed' : 'failed', error: validatorErrors.coverage },
        browser: { status: validatorResults.browser ? 'completed' : 'failed', error: validatorErrors.browser },
        differential: { status: validatorResults.differential ? 'completed' : 'failed', error: validatorErrors.differential },
      },
      raw_results: {
        coverage_summary: validatorResults.coverage?.scorecard || null,
        browser_summary: validatorResults.browser?.summary || null,
        differential_summary: validatorResults.differential?.summary || null,
      },
    });
  } catch (error: any) {
    console.error('[masterQualityGate] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}