import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Morning Receipt Generator — summarizes overnight autonomous activity into a
// single OvernightExecutionReceipt. Called at the end of an overnight session
// (or on-demand) to produce a human-readable summary of what the system did:
//   - How many heartbeats ran
//   - Routes discovered, taxonomy discovered, backend capabilities implemented
//   - Content added, defects found/fixed, regressions
//   - Current build state and exact next action
//
// This is the "morning report" the operator reads to see what happened overnight.

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'organization_id required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { session_start_override } = body;

    // Determine session window — default to last 12 hours
    const sessionEnd = new Date();
    const sessionStart = session_start_override
      ? new Date(session_start_override)
      : new Date(Date.now() - 12 * 60 * 60 * 1000);

    // ─── 1. GATHER HEARTBEAT RECEIPTS ───────────────────────────────
    const heartbeats = await base44.asServiceRole.entities.HeartbeatReceipt
      .filter({ organization_id: orgId })
      .catch(() => []);

    const sessionHeartbeats = heartbeats.filter(h => {
      const t = new Date(h.heartbeat_time || h.created_date).getTime();
      return t >= sessionStart.getTime() && t <= sessionEnd.getTime();
    }).sort((a, b) => new Date(a.heartbeat_time || a.created_date).getTime() - new Date(b.heartbeat_time || b.created_date).getTime());

    // ─── 2. GATHER COVERAGE LEDGER CHANGES ──────────────────────────
    const coverageItems = await base44.asServiceRole.entities.CoverageLedger
      .filter({ organization_id: orgId })
      .catch(() => []);

    const sessionCoverage = coverageItems.filter(c => {
      const t = new Date(c.run_at || c.created_date).getTime();
      return t >= sessionStart.getTime() && t <= sessionEnd.getTime();
    });

    const defectsFound = sessionCoverage.filter(c => c.status === 'fail').length;
    const defectsFixed = sessionCoverage.filter(c => c.status === 'pass' && c.regression_result === 'pass').length;

    // ─── 3. GATHER ROUTE DISCOVERY ──────────────────────────────────
    const routes = await base44.asServiceRole.entities.EnvatoPublicSurfaceManifest
      .filter({ organization_id: orgId })
      .catch(() => []);

    const sessionRoutes = routes.filter(r => {
      const t = new Date(r.discovered_at || r.created_date).getTime();
      return t >= sessionStart.getTime() && t <= sessionEnd.getTime();
    });

    // ─── 4. GATHER TAXONOMY DISCOVERY ────────────────────────────────
    const taxonomy = await base44.asServiceRole.entities.EnvatoTaxonomyLedger
      .filter({ organization_id: orgId })
      .catch(() => []);

    const sessionTaxonomy = taxonomy.filter(t => {
      const t2 = new Date(t.created_date).getTime();
      return t2 >= sessionStart.getTime() && t2 <= sessionEnd.getTime();
    });

    // ─── 5. GATHER BACKEND CAPABILITIES ─────────────────────────────
    const capabilities = await base44.asServiceRole.entities.BackendCapabilityLedger
      .filter({ organization_id: orgId })
      .catch(() => []);

    const sessionCapabilities = capabilities.filter(c => {
      const t = new Date(c.last_validated || c.created_date).getTime();
      return t >= sessionStart.getTime() && t <= sessionEnd.getTime();
    });

    const capabilitiesImplemented = sessionCapabilities.filter(c =>
      c.status === 'implemented' || c.status === 'validated'
    ).length;

    // ─── 6. GATHER MASTER QUALITY SCORES ────────────────────────────
    const scores = await base44.asServiceRole.entities.MasterQualityScore
      .filter({ organization_id: orgId })
      .catch(() => []);

    const sessionScores = scores.filter(s => {
      const t = new Date(s.run_at || s.created_date).getTime();
      return t >= sessionStart.getTime() && t <= sessionEnd.getTime();
    }).sort((a, b) => new Date(a.run_at || a.created_date).getTime() - new Date(b.run_at || b.created_date).getTime());

    // Detect regressions: scores that decreased from previous run
    let regressions = 0;
    for (let i = 1; i < sessionScores.length; i++) {
      if (sessionScores[i].overall_score < sessionScores[i - 1].overall_score) regressions++;
    }

    // ─── 7. GATHER LAUNCH PROJECTS ──────────────────────────────────
    const projects = await base44.asServiceRole.entities.LaunchProject
      .filter({ organization_id: orgId })
      .catch(() => []);

    const sessionProjects = projects.filter(p => {
      const t = new Date(p.created_date).getTime();
      return t >= sessionStart.getTime() && t <= sessionEnd.getTime();
    });

    // ─── 8. COMPUTE CURRENT STATE ───────────────────────────────────
    const latestHeartbeat = sessionHeartbeats[sessionHeartbeats.length - 1] || heartbeats[heartbeats.length - 1];
    const latestScore = sessionScores[sessionScores.length - 1] || scores[scores.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())[0]?.id === a?.id ? 1 : -1];

    // Current coverage from latest heartbeat
    const currentCoverage = latestHeartbeat ? {
      route: latestHeartbeat.route_coverage || 0,
      taxonomy: latestHeartbeat.taxonomy_coverage || 0,
      backend: latestHeartbeat.backend_coverage || 0,
      content: latestHeartbeat.content_coverage || 0,
      interaction: latestHeartbeat.interaction_coverage || 0,
      visual: latestHeartbeat.visual_score || 0,
    } : { route: 0, taxonomy: 0, backend: 0, content: 0, interaction: 0, visual: 0 };

    // Current lowest score
    const currentLowest = latestScore?.overall_score || latestHeartbeat?.current_lowest_score || 0;

    // Open defects count
    const openCritical = latestScore?.open_critical_defects || 0;
    const openHigh = latestScore?.open_high_defects || 0;

    // ─── 9. DETERMINE NEXT ACTION ───────────────────────────────────
    const nextAction = determineNextAction(currentCoverage, currentLowest, openCritical, openHigh);

    // ─── 10. IDENTIFY BLOCKERS ───────────────────────────────────────
    const blockers: string[] = [];
    if (currentCoverage.route < 50) blockers.push(`Route coverage at ${currentCoverage.route}% — discovery incomplete`);
    if (currentCoverage.backend < 80) blockers.push(`Backend coverage at ${currentCoverage.backend}% — capabilities not fully implemented`);
    if (openCritical > 0) blockers.push(`${openCritical} open critical defects`);
    if (currentLowest < 80) blockers.push(`Lowest category score at ${currentLowest}% — below 80% threshold`);

    // ─── 11. BUILD VALIDATION SCORES SUMMARY ───────────────────────
    const validationScores: Record<string, number> = {};
    if (latestScore?.category_scores) {
      for (const [k, v] of Object.entries(latestScore.category_scores)) {
        validationScores[k] = v as number;
      }
    }
    if (latestScore) {
      validationScores.overall = latestScore.overall_score;
      validationScores.clean_pass = latestScore.clean_pass ? 1 : 0;
    }

    // ─── 12. CREATE OVERNIGHT EXECUTION RECEIPT ─────────────────────
    const receipt = await base44.asServiceRole.entities.OvernightExecutionReceipt.create({
      organization_id: orgId,
      session_start: sessionStart.toISOString(),
      session_end: sessionEnd.toISOString(),
      starting_build_id: sessionScores[0]?.build_id || latestHeartbeat?.build_id || 'unknown',
      ending_build_id: latestHeartbeat?.build_id || latestScore?.build_id || sessionScores[sessionScores.length - 1]?.build_id || 'unknown',
      starting_state: sessionScores[0] ? {
        overall_score: sessionScores[0].overall_score,
        coverage: sessionHeartbeats[0] ? {
          route: sessionHeartbeats[0].route_coverage,
          taxonomy: sessionHeartbeats[0].taxonomy_coverage,
          backend: sessionHeartbeats[0].backend_coverage,
          content: sessionHeartbeats[0].content_coverage,
        } : null,
      } : null,
      ending_state: {
        overall_score: currentLowest,
        coverage: currentCoverage,
        open_defects: { critical: openCritical, high: openHigh },
      },
      builds_created: sessionProjects.length,
      routes_discovered: sessionRoutes.length,
      taxonomy_discovered: sessionTaxonomy.length,
      backend_capabilities_implemented: capabilitiesImplemented,
      content_added: 0, // TODO: track content additions
      defects_found: defectsFound,
      defects_fixed: defectsFixed,
      regressions,
      validation_scores: validationScores,
      blockers,
      approval_requests: blockers.length > 0 ? ['Review blockers before next cycle'] : [],
      current_build: latestHeartbeat?.build_id || 'unknown',
      best_preview_url: projects.find(p => p.vercel_deployment_url)?.vercel_deployment_url || '',
      exact_next_action: nextAction,
      heartbeats_run: sessionHeartbeats.length,
    });

    return Response.json({
      status: 'success',
      receipt_id: receipt.id,
      session: {
        start: sessionStart.toISOString(),
        end: sessionEnd.toISOString(),
        duration_hours: (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60 * 60),
      },
      summary: {
        heartbeats_run: sessionHeartbeats.length,
        builds_created: sessionProjects.length,
        routes_discovered: sessionRoutes.length,
        taxonomy_discovered: sessionTaxonomy.length,
        backend_capabilities_implemented: capabilitiesImplemented,
        defects_found: defectsFound,
        defects_fixed: defectsFixed,
        regressions,
        current_lowest_score: currentLowest,
        current_coverage: currentCoverage,
        open_defects: { critical: openCritical, high: openHigh },
        blockers,
        exact_next_action: nextAction,
      },
      validation_scores: validationScores,
      message: `Overnight receipt generated: ${sessionHeartbeats.length} heartbeats, ${sessionRoutes.length} routes discovered, ${defectsFound} defects found, ${defectsFixed} fixed, lowest score ${currentLowest}%`,
    });
  } catch (error) {
    console.error('[generateMorningReceipt] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function determineNextAction(coverage: any, lowestScore: number, openCritical: number, openHigh: number): string {
  if (coverage.route < 50) return 'Continue public surface discovery — route coverage below 50%';
  if (coverage.taxonomy < 50) return 'Continue taxonomy discovery — taxonomy coverage below 50%';
  if (coverage.backend < 80) return 'Implement remaining backend capabilities — backend coverage below 80%';
  if (openCritical > 0) return `Fix ${openCritical} open critical defects before next validation cycle`;
  if (lowestScore < 80) return `Repair lowest-scoring category (currently ${lowestScore}%) to reach 80% threshold`;
  if (lowestScore < 99) return `Harden lowest-scoring category (currently ${lowestScore}%) to reach 99% parity`;
  return 'System at 99%+ parity — begin next certification pass or expand to new site';
}