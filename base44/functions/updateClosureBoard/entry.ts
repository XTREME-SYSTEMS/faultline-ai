import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { computeClosureMetrics, determineStatus, getLowestCategory, getValidOfficialNavigableNodes, getContradictoryOfficialNodes, isSuperseded, getUnverifiedRequiredQueue } from '../../shared/closureMetricEngine.ts';

// Update Closure Board — P12
//
// Maintains the authoritative XTREME_CLONE_CLOSURE_BOARD using the SAME
// CLOSURE_METRIC_ENGINE as overnightHeartbeat. No duplicated formulas.
//
// Every category returns:
//   CATEGORY, BUILD_ID, NUMERATOR, DENOMINATOR, SCORE, EVIDENCE_IDS,
//   UNVERIFIED_COUNT, BLOCKED_COUNT, EXCLUDED_COUNT, TIMESTAMP.
//
// Statuses: UNVERIFIED, FAILING, PARTIAL, PASSING, BLOCKED, CERTIFIED.
// Fake 100% categories (score=100, numerator=0, denominator=1) are eliminated.

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const orgId = body.organization_id || user?.data?.organization_id || 'default';

    console.log(`[updateClosureBoard] Updating closure board for org ${orgId}`);

    // ─── 1. FETCH ALL EVIDENCE ──────────────────────────────────────
    const [routes, taxonomy, capabilities, scores, heartbeats, canonical, exclusions] = await Promise.all([
      base44.asServiceRole.entities.EnvatoPublicSurfaceManifest.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.EnvatoTaxonomyLedger.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.BackendCapabilityLedger.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.MasterQualityScore.filter({ organization_id: orgId }, '-created_date', 3).catch(() => []),
      base44.asServiceRole.entities.HeartbeatReceipt.filter({ organization_id: orgId }, '-heartbeat_time', 1).catch(() => []),
      base44.asServiceRole.entities.CanonicalState.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.ExclusionRecord.filter({ organization_id: orgId }).catch(() => []),
    ]);

    const latestScore = scores[0];
    const latestHeartbeat = heartbeats[0];
    const canonicalState = canonical[0];
    const buildId = canonicalState?.canonical_envato_build_id || latestHeartbeat?.build_id || 'unknown';
    const evidenceTimestamp = latestHeartbeat?.heartbeat_time || new Date().toISOString();

    // ─── 2. COMPUTE ALL CATEGORY SCORES VIA SHARED ENGINE ───────────
    const categoryMetrics = computeClosureMetrics({
      routes, taxonomy, capabilities, latestScore, latestHeartbeat, canonicalState, exclusions, buildId,
    });

    // ─── 3. UPSERT CLOSURE BOARD ENTRIES ────────────────────────────
    const existingBoard = await base44.asServiceRole.entities.ClosureBoard
      .filter({ organization_id: orgId }).catch(() => []);
    const existingMap = new Map(existingBoard.map(b => [b.category, b]));

    const upserts: any[] = [];
    for (const metric of categoryMetrics) {
      const status = determineStatus(metric);
      const existing = existingMap.get(metric.category);
      const data = {
        organization_id: orgId,
        category: metric.category,
        status,
        score: metric.score,
        target_score: metric.is_critical ? 100 : 99,
        is_critical: metric.is_critical,
        denominator: metric.denominator,
        numerator: metric.numerator,
        build_id: metric.build_id,
        evidence_timestamp: metric.timestamp,
        evidence_id: metric.evidence_ids.join(',') || '',
        lowest_failure: metric.lowest_failure || '',
        blocker: status === 'blocked' ? metric.lowest_failure : '',
        next_work_packet: metric.next_work_packet || '',
        updated_at: new Date().toISOString(),
      };
      if (existing) {
        upserts.push({ id: existing.id, ...data });
      } else {
        upserts.push(data);
      }
    }

    // Bulk create new entries, update existing ones
    const updates = upserts.filter(u => u.id);
    const creates = upserts.filter(u => !u.id);

    if (creates.length > 0) {
      try { await base44.asServiceRole.entities.ClosureBoard.bulkCreate(creates); }
      catch (e) { console.error(`[updateClosureBoard] Bulk create failed: ${e.message}`); }
    }
    for (const u of updates) {
      try { await base44.asServiceRole.entities.ClosureBoard.update(u.id, u); }
      catch (e) { console.error(`[updateClosureBoard] Update failed for ${u.category}: ${e.message}`); }
    }

    // P0-11: Mark superseded categories (e.g. legacy BACKEND_CAPABILITY_COVERAGE)
    // These must NOT participate in active MQG calculations.
    const activeCategories = new Set(categoryMetrics.map(m => m.category));
    for (const existing of existingBoard) {
      if (!activeCategories.has(existing.category) || isSuperseded(existing.category)) {
        try {
          await base44.asServiceRole.entities.ClosureBoard.update(existing.id, {
            status: 'blocked',  // Use 'blocked' to indicate superseded/inactive
            score: 0,
            numerator: 0,
            denominator: 0,
            blocker: 'SUPERSEDED — not participating in active MQG calculations',
            next_work_packet: '',
            updated_at: new Date().toISOString(),
          });
          console.log(`[updateClosureBoard] Marked ${existing.category} as SUPERSEDED`);
        } catch (e) {
          console.log(`[updateClosureBoard] Failed to supersede ${existing.category}: ${e.message}`);
        }
      }
    }

    // P0-10: Build UNVERIFIED_REQUIRED_QUEUE — categories with denominator=0 that need evidence
    const unverifiedRequired = getUnverifiedRequiredQueue(categoryMetrics);

    // ─── 4. COMPUTE SUMMARY ────────────────────────────────────────
    const passing = categoryMetrics.filter(c => c.score >= (c.is_critical ? 100 : 99) && c.denominator > 0).length;
    const failing = categoryMetrics.filter(c => c.score > 0 && c.score < (c.is_critical ? 100 : 99)).length;
    const unverified = categoryMetrics.filter(c => determineStatus(c) === 'unverified').length;
    const lowest = getLowestCategory(categoryMetrics);

    // Truth-class audit
    const validOfficial = getValidOfficialNavigableNodes(taxonomy);
    const contradictory = getContradictoryOfficialNodes(taxonomy);

    const result = {
      status: 'success',
      organization_id: orgId,
      build_id: buildId,
      total_categories: categoryMetrics.length,
      passing,
      failing,
      unverified,
      lowest_score: lowest.score,
      lowest_category: lowest.category,
      truth_class_audit: {
        total_taxonomy_records: taxonomy.length,
        valid_official_navigable_denominator: validOfficial.length,
        contradictory_official_records: contradictory.length,
      },
      unverified_required_queue: unverifiedRequired.map(m => ({
        category: m.category,
        critical: m.is_critical,
        next_work: m.next_work_packet,
      })),
      categories: categoryMetrics.map(m => ({
        category: m.category,
        score: m.score,
        target: m.is_critical ? 100 : 99,
        critical: m.is_critical,
        status: determineStatus(m),
        numerator: m.numerator,
        denominator: m.denominator,
        unverified: m.unverified_count,
        blocked: m.blocked_count,
        excluded: m.excluded_count,
        next_work: m.next_work_packet,
      })),
      message: `Closure board: ${passing}/${categoryMetrics.length} passing, ${failing} failing, ${unverified} unverified. Lowest: ${lowest.category} at ${lowest.score}%`,
    };

    console.log(`[updateClosureBoard] ${result.message}`);
    return Response.json(result);
  } catch (error) {
    console.error('[updateClosureBoard] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}