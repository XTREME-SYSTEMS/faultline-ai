import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Overnight Heartbeat — the autonomous operating loop's central pulse.
// Runs every 5 minutes via the Continuous Improvement Heartbeat workflow.
// Each beat: (1) measures current coverage across 6 dimensions, (2) identifies
// the lowest-scoring category, (3) dispatches a targeted work packet to repair it,
// (4) records a HeartbeatReceipt for audit trail.
//
// The heartbeat is PHASE-AWARE: it progresses through discovery → taxonomy →
// backend → catalog → validation → repair → harden → complete, only advancing
// when the current phase reaches its threshold.

const BUILD_ID = 'v74-64014127cfb7335d-12p464';
const CLONE_URL = 'https://envato-clone-v74.vercel.app'; // Latest clone deployment
const SOURCE_URL = 'https://elements.envato.com';

interface WorkPacket {
  phase: string;
  function: string;
  task: string;
  safe: boolean;
  queueDepth: number;
}

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const orgId = body.organization_id || user?.data?.organization_id || 'default';

    console.log(`[overnightHeartbeat] Beat at ${new Date().toISOString()} for org ${orgId}`);

    // ─── 1. MEASURE CURRENT COVERAGE ────────────────────────────────
    const [routes, taxonomy, capabilities, scores, heartbeats] = await Promise.all([
      base44.asServiceRole.entities.EnvatoPublicSurfaceManifest.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.EnvatoTaxonomyLedger.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.BackendCapabilityLedger.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.MasterQualityScore.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.HeartbeatReceipt.filter({ organization_id: orgId }).catch(() => []),
    ]);

    // Route coverage: % of discovered routes that have clone_status = 'validated' or 'exists'
    const validRoutes = routes.filter(r => r.valid !== false);
    const clonedRoutes = validRoutes.filter(r => r.clone_status === 'validated' || r.clone_status === 'exists');
    const routeCoverage = validRoutes.length > 0 ? Math.round((clonedRoutes.length / validRoutes.length) * 100) : 0;

    // Taxonomy coverage: % of taxonomy nodes that are 'implemented' or 'validated'
    const taxonomyCoverage = taxonomy.length > 0
      ? Math.round((taxonomy.filter(t => t.status === 'implemented' || t.status === 'validated').length / taxonomy.length) * 100)
      : 0;

    // Backend coverage: % of capabilities that are 'implemented' or 'validated'
    const backendCoverage = capabilities.length > 0
      ? Math.round((capabilities.filter(c => c.status === 'implemented' || c.status === 'validated').length / capabilities.length) * 100)
      : 0;

    // Content coverage: from latest MasterQualityScore content_structure_score
    const latestScore = scores.sort((a, b) => new Date(b.run_at || b.created_date).getTime() - new Date(a.run_at || a.created_date).getTime())[0];
    const contentCoverage = latestScore?.content_structure_score || 0;

    // Interaction & visual coverage: from latest MasterQualityScore
    const interactionCoverage = latestScore?.browser_interaction_score || 0;
    const visualScore = latestScore?.visual_parity_score || 0;

    // Current lowest score
    const currentLowest = latestScore?.overall_score || 0;

    // ─── 2. COUNT DEFECTS ───────────────────────────────────────────
    const criticalDefects = latestScore?.open_critical_defects || 0;
    const highDefects = latestScore?.open_high_defects || 0;

    // ─── 3. DETERMINE CURRENT PHASE & NEXT WORK PACKET ──────────────
    const workPacket = determineWorkPacket({
      routeCoverage,
      taxonomyCoverage,
      backendCoverage,
      contentCoverage,
      interactionCoverage,
      visualScore,
      currentLowest,
      criticalDefects,
      highDefects,
      routesCount: routes.length,
      taxonomyCount: taxonomy.length,
      capabilitiesCount: capabilities.length,
    });

    // ─── 4. DISPATCH WORK PACKET (async, non-blocking) ─────────────
    let workResult = 'skipped';
    if (workPacket.safe && workPacket.function) {
      try {
        // Dispatch via internal function call (non-blocking)
        const appId = Deno.env.get('BASE44_APP_ID');
        const functionUrl = `https://base44.app/api/apps/${appId}/functions/${workPacket.function}`;
        fetch(functionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organization_id: orgId, triggered_by: 'overnightHeartbeat' }),
        }).catch(() => {}); // fire-and-forget — don't block the heartbeat
        workResult = 'dispatched';
        console.log(`[overnightHeartbeat] Dispatched ${workPacket.function} for phase: ${workPacket.phase}`);
      } catch (e) {
        workResult = `error: ${e.message}`;
        console.error(`[overnightHeartbeat] Dispatch failed: ${e.message}`);
      }
    }

    // ─── 5. COUNT COMPLETED SINCE LAST HEARTBEAT ─────────────────────
    const lastHeartbeat = heartbeats.sort((a, b) => new Date(b.heartbeat_time || b.created_date).getTime() - new Date(a.heartbeat_time || a.created_date).getTime())[0];
    const lastTime = lastHeartbeat ? new Date(lastHeartbeat.heartbeat_time || lastHeartbeat.created_date).getTime() : 0;
    const completedSinceLast = scores.filter(s => {
      const t = new Date(s.run_at || s.created_date).getTime();
      return t > lastTime;
    }).length;

    // ─── 6. IDENTIFY BLOCKERS ────────────────────────────────────────
    const blockers: string[] = [];
    if (routeCoverage < 50 && routes.length < 100) blockers.push('Route discovery incomplete — fewer than 100 routes discovered');
    if (backendCoverage < 80) blockers.push(`Backend coverage at ${backendCoverage}% — below 80% threshold`);
    if (criticalDefects > 0) blockers.push(`${criticalDefects} open critical defects`);

    // ─── 7. RECORD HEARTBEAT RECEIPT ────────────────────────────────
    const heartbeat = await base44.asServiceRole.entities.HeartbeatReceipt.create({
      organization_id: orgId,
      heartbeat_time: new Date().toISOString(),
      build_id: BUILD_ID,
      queue_depth: 0,
      current_task: workPacket.task,
      completed_since_last: completedSinceLast,
      new_defects: criticalDefects,
      closed_defects: 0,
      current_lowest_score: currentLowest,
      route_coverage: routeCoverage,
      taxonomy_coverage: taxonomyCoverage,
      backend_coverage: backendCoverage,
      content_coverage: contentCoverage,
      interaction_coverage: interactionCoverage,
      visual_score: visualScore,
      security_status: criticalDefects > 0 ? 'critical' : highDefects > 0 ? 'warning' : 'secure',
      blockers,
      next_task: workPacket.task,
      phase: workPacket.phase as any,
    });

    console.log(`[overnightHeartbeat] Phase: ${workPacket.phase}, Coverage: route=${routeCoverage}% taxonomy=${taxonomyCoverage}% backend=${backendCoverage}% content=${contentCoverage}% interaction=${interactionCoverage}% visual=${visualScore}%`);

    return Response.json({
      status: 'success',
      heartbeat_id: heartbeat.id,
      heartbeat_time: heartbeat.heartbeat_time,
      build_id: BUILD_ID,
      current_lowest_score: currentLowest,
      coverage: {
        route: routeCoverage,
        taxonomy: taxonomyCoverage,
        backend: backendCoverage,
        content: contentCoverage,
        interaction: interactionCoverage,
        visual: visualScore,
      },
      defects: {
        critical: criticalDefects,
        high: highDefects,
      },
      next_work_packet: workPacket,
      blockers,
      work_result: workResult,
    });
  } catch (error) {
    console.error('[overnightHeartbeat] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function determineWorkPacket(state: {
  routeCoverage: number; taxonomyCoverage: number; backendCoverage: number;
  contentCoverage: number; interactionCoverage: number; visualScore: number;
  currentLowest: number; criticalDefects: number; highDefects: number;
  routesCount: number; taxonomyCount: number; capabilitiesCount: number;
}): WorkPacket {
  const { routeCoverage, taxonomyCoverage, backendCoverage, contentCoverage,
    interactionCoverage, visualScore, currentLowest, criticalDefects, highDefects,
    routesCount, taxonomyCount, capabilitiesCount } = state;

  // Phase 1: DISCOVERY — route coverage must reach 50% with at least 100 routes
  if (routesCount < 100 || routeCoverage < 50) {
    return {
      phase: 'discovery',
      function: 'discoverPublicSurface',
      task: routesCount === 0 ? 'Initial public surface discovery crawl' : 'Continue public surface discovery — more routes needed',
      safe: true,
      queueDepth: 0,
    };
  }

  // Phase 2: TAXONOMY — taxonomy coverage must reach 50%
  if (taxonomyCount < 50 || taxonomyCoverage < 50) {
    return {
      phase: 'taxonomy',
      function: 'discoverTaxonomy',
      task: taxonomyCount === 0 ? 'Initial taxonomy discovery' : 'Continue taxonomy discovery — more nodes needed',
      safe: true,
      queueDepth: 0,
    };
  }

  // Phase 3: BACKEND — backend capability coverage must reach 80%
  if (backendCoverage < 80) {
    return {
      phase: 'backend',
      function: 'buildBackendCapabilityLedger',
      task: `Implement remaining backend capabilities (${backendCoverage}% of ${capabilitiesCount})`,
      safe: true,
      queueDepth: 0,
    };
  }

  // Phase 4: CATALOG — content coverage must reach 80%
  if (contentCoverage < 80) {
    return {
      phase: 'catalog',
      function: 'autonomousMarketplaceStocker',
      task: `Stock marketplace content (currently ${contentCoverage}%)`,
      safe: true,
      queueDepth: 0,
    };
  }

  // Phase 5: VALIDATION — run full validation suite
  if (currentLowest < 80) {
    return {
      phase: 'validation',
      function: 'masterQualityGate',
      task: `Run master quality gate validation (lowest score: ${currentLowest}%)`,
      safe: true,
      queueDepth: 0,
    };
  }

  // Phase 6: REPAIR — fix critical defects first
  if (criticalDefects > 0) {
    return {
      phase: 'repair',
      function: 'healAllClonesTo100',
      task: `Repair ${criticalDefects} critical defects`,
      safe: true,
      queueDepth: criticalDefects,
    };
  }

  // Phase 7: HARDEN — push toward 99% parity
  if (currentLowest < 99) {
    return {
      phase: 'harden',
      function: 'continuousImprovementHeartbeat',
      task: `Harden lowest category from ${currentLowest}% toward 99%`,
      safe: true,
      queueDepth: 0,
    };
  }

  // Phase 8: COMPLETE — system at 99%+ parity
  return {
    phase: 'complete',
    function: '',
    task: 'System at 99%+ parity — ready for certification pass or new site expansion',
    safe: false,
    queueDepth: 0,
  };
}