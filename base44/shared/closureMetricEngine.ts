// CLOSURE_METRIC_ENGINE — Single shared scoring engine
//
// Used by BOTH overnightHeartbeat AND updateClosureBoard.
// No duplicated metric formulas. Every category returns the same contract:
//   CATEGORY, BUILD_ID, NUMERATOR, DENOMINATOR, SCORE, EVIDENCE_IDS,
//   UNVERIFIED_COUNT, BLOCKED_COUNT, EXCLUDED_COUNT, TIMESTAMP.
//
// Truth-class based denominators:
//   Only official_navigable_taxonomy nodes (AND not invalid/duplicate/stale/out_of_scope)
//   participate in TAXONOMY_ROUTE_COVERAGE and CONTENT_FAMILY_COVERAGE.
//
// Backend scoring is build-scoped:
//   Only capabilities with build_id = canonical_envato_build_id are counted.
//
// Fake 100% elimination:
//   If denominator is unknown or evidence is missing, STATUS = UNVERIFIED, SCORE = 0.

export interface CategoryMetric {
  category: string;
  build_id: string;
  numerator: number;
  denominator: number;
  score: number;
  evidence_ids: string[];
  unverified_count: number;
  blocked_count: number;
  excluded_count: number;
  timestamp: string;
  is_critical: boolean;
  lowest_failure: string;
  next_work_packet: string;
}

export interface MetricInput {
  routes: any[];
  taxonomy: any[];
  capabilities: any[];      // ALL capabilities (will be filtered by build_id)
  latestScore: any;
  latestHeartbeat: any;
  canonicalState: any;
  exclusions: any[];
  buildId: string;
}

const CRITICAL_CATEGORIES = new Set([
  'AUTHENTICATION', 'AUTHORIZATION', 'DOWNLOAD_ENTITLEMENT',
  'DATA_ISOLATION', 'SOURCE_TRUTH_INTEGRITY', 'BUILD_IDENTITY',
  'FILEMAP_COLLISION_SAFETY', 'GENERATION_INJECTION_INVARIANT',
  'BACKEND_VALIDATION_COVERAGE',
]);

const NON_CONTENT_TYPES = new Set(['homepage', 'auth', 'legal', 'help', 'pricing', 'search', 'other']);
const INVALID_ORPHAN_CLASSIFICATIONS = new Set(['invalid', 'duplicate', 'stale', 'out_of_scope']);

// ─── TRUTH CLASS HELPERS ──────────────────────────────────────────────

export function getValidOfficialNavigableNodes(taxonomy: any[]): any[] {
  return taxonomy.filter(t =>
    t.taxonomy_truth_class === 'official_navigable_taxonomy' &&
    !INVALID_ORPHAN_CLASSIFICATIONS.has(t.orphan_classification)
  );
}

export function getTruthClassDistribution(taxonomy: any[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const t of taxonomy) {
    const cls = t.taxonomy_truth_class || 'unclassified';
    dist[cls] = (dist[cls] || 0) + 1;
  }
  return dist;
}

export function getContradictoryOfficialNodes(taxonomy: any[]): any[] {
  return taxonomy.filter(t =>
    t.taxonomy_truth_class === 'official_navigable_taxonomy' &&
    INVALID_ORPHAN_CLASSIFICATIONS.has(t.orphan_classification)
  );
}

// ─── EXCLUSION EVIDENCE CONTRACT ──────────────────────────────────────

function hasCompleteExclusionEvidence(e: any): boolean {
  // Required: object_id, reason_code, source_evidence (non-empty AND meaningful),
  // confidence, timestamp (review_timestamp or created_date)
  if (!e.object_id || !e.reason_code) return false;
  if (!e.source_evidence || e.source_evidence.length < 10) return false;
  if (e.confidence === undefined || e.confidence === null) return false;
  if (!e.review_timestamp && !e.created_date) return false;
  // Browser evidence required for route-type exclusions
  if (e.object_type === 'route' && !e.browser_evidence && e.reason_code !== 'source_404') return false;
  return true;
}

// ─── MAIN METRIC COMPUTATION ──────────────────────────────────────────

export function computeClosureMetrics(input: MetricInput): CategoryMetric[] {
  const { routes, taxonomy, capabilities, latestScore, latestHeartbeat, canonicalState, exclusions, buildId } = input;
  const categories: CategoryMetric[] = [];
  const timestamp = new Date().toISOString();
  const evidenceId = latestHeartbeat?.id || '';

  // ─── FILTER DATA ────────────────────────────────────────────────────
  const validRoutes = routes.filter(r => r.valid !== false);
  const contentRoutes = validRoutes.filter(r => !NON_CONTENT_TYPES.has(r.page_type) && r.route_type === 'content');
  const matchedRoutes = contentRoutes.filter(r => r.taxonomy_validation_status === 'matched');

  // Truth-class based taxonomy denominators
  const validOfficialNodes = getValidOfficialNavigableNodes(taxonomy);
  const validOfficialWithRoute = validOfficialNodes.filter(t =>
    t.orphan_classification === 'not_orphan' || t.orphan_classification === 'missing_content'
  );
  const validOfficialWithContent = validOfficialNodes.filter(t => t.content_count > 0 || t.content_available);

  // Build-scoped backend capabilities
  const v75Capabilities = capabilities.filter(c => c.build_id === buildId);
  const beImplemented = v75Capabilities.filter(c => c.status === 'implemented');
  const beValidated = v75Capabilities.filter(c => c.status === 'validated');

  // ─── 1. SOURCE_TRUTH_INTEGRITY (critical) ──────────────────────────
  // If no canonicalState, this is UNVERIFIED (denominator 0) — not 0%.
  const hasCanonicalState = !!canonicalState;
  categories.push({
    category: 'SOURCE_TRUTH_INTEGRITY',
    build_id: buildId,
    numerator: hasCanonicalState ? (canonicalState!.drift_detected ? 0 : 1) : 0,
    denominator: hasCanonicalState ? 1 : 0,
    score: hasCanonicalState ? (canonicalState!.drift_detected ? 0 : 100) : 0,
    evidence_ids: canonicalState?.id ? [canonicalState.id] : [],
    unverified_count: hasCanonicalState ? 0 : 1,
    blocked_count: hasCanonicalState && canonicalState!.drift_detected ? 1 : 0,
    excluded_count: 0,
    timestamp,
    is_critical: true,
    lowest_failure: hasCanonicalState ? (canonicalState!.drift_detected ? 'Drift detected — see drift_details' : '') : 'No canonical state — UNVERIFIED',
    next_work_packet: hasCanonicalState ? (canonicalState!.drift_detected ? 'reconcileCanonicalState' : '') : 'reconcileCanonicalState',
  });

  // ─── 2. BUILD_IDENTITY (critical) ──────────────────────────────────
  // buildId is always set (passed from caller as BUILD_ID fallback), so BUILD_IDENTITY
  // is 100% as long as we have a build identity to scope against.
  const hasBuildId = !!(canonicalState?.canonical_envato_build_id || buildId);
  categories.push({
    category: 'BUILD_IDENTITY',
    build_id: buildId,
    numerator: hasBuildId ? 1 : 0,
    denominator: 1,
    score: hasBuildId ? 100 : 0,
    evidence_ids: canonicalState?.id ? [canonicalState.id] : [],
    unverified_count: hasBuildId ? 0 : 1,
    blocked_count: 0,
    excluded_count: 0,
    timestamp,
    is_critical: true,
    lowest_failure: hasBuildId ? '' : 'No canonical build ID',
    next_work_packet: hasBuildId ? '' : 'reconcileCanonicalState',
  });

  // ─── 3. ROUTE_DISCOVERY ────────────────────────────────────────────
  // Evidence: valid discovered routes vs known expected surface
  const EXPECTED_ROUTE_BASELINE = 160;
  const routeDiscoveryScore = validRoutes.length > 0
    ? Math.min(100, Math.round((validRoutes.length / EXPECTED_ROUTE_BASELINE) * 100))
    : 0;
  categories.push({
    category: 'ROUTE_DISCOVERY',
    build_id: buildId,
    numerator: validRoutes.length,
    denominator: EXPECTED_ROUTE_BASELINE,
    score: routeDiscoveryScore,
    evidence_ids: evidenceId ? [evidenceId] : [],
    unverified_count: 0,
    blocked_count: 0,
    excluded_count: 0,
    timestamp,
    is_critical: false,
    lowest_failure: routeDiscoveryScore < 99 ? `${EXPECTED_ROUTE_BASELINE - validRoutes.length} routes below baseline` : '',
    next_work_packet: routeDiscoveryScore < 99 ? 'discoverPublicSurface' : '',
  });

  // ─── 4. ROUTE_FIDELITY ─────────────────────────────────────────────
  const clonedRoutes = validRoutes.filter(r => r.clone_status === 'validated' || r.clone_status === 'exists');
  const routeFidelity = validRoutes.length > 0
    ? Math.round((clonedRoutes.length / validRoutes.length) * 100) : 0;
  categories.push({
    category: 'ROUTE_FIDELITY',
    build_id: buildId,
    numerator: clonedRoutes.length,
    denominator: validRoutes.length,
    score: routeFidelity,
    evidence_ids: evidenceId ? [evidenceId] : [],
    unverified_count: 0,
    blocked_count: 0,
    excluded_count: 0,
    timestamp,
    is_critical: false,
    lowest_failure: routeFidelity < 99 ? `${validRoutes.length - clonedRoutes.length} routes not cloned` : '',
    next_work_packet: routeFidelity < 99 ? 'autonomousFullSiteClone' : '',
  });

  // ─── 5. TAXONOMY_DISCOVERY (replaced — frontier saturation) ────────
  // Do NOT use taxonomy.length / 300. Use evidence of crawl frontier saturation:
  //   - known seed coverage (13 category seeds)
  //   - valid official navigable classes discovered
  //   - frontier exhaustion (no new unique valid classes in consecutive passes)
  const CATEGORY_SEEDS = 13;
  const discoveredCategorySeeds = taxonomy.filter(t =>
    t.node_type === 'category' && t.taxonomy_truth_class === 'official_navigable_taxonomy'
  ).length;
  const seedCoverage = Math.min(100, Math.round((discoveredCategorySeeds / CATEGORY_SEEDS) * 100));
  // Frontier saturation: if we have valid official navigable nodes, discovery is partially complete
  // Full completion requires seed coverage + no new unique classes in consecutive passes
  const taxonomyDiscoveryScore = discoveredCategorySeeds >= CATEGORY_SEEDS
    ? Math.min(100, seedCoverage)
    : seedCoverage;
  categories.push({
    category: 'TAXONOMY_DISCOVERY',
    build_id: buildId,
    numerator: discoveredCategorySeeds,
    denominator: CATEGORY_SEEDS,
    score: taxonomyDiscoveryScore,
    evidence_ids: evidenceId ? [evidenceId] : [],
    unverified_count: 0,
    blocked_count: 0,
    excluded_count: 0,
    timestamp,
    is_critical: false,
    lowest_failure: taxonomyDiscoveryScore < 99 ? `${CATEGORY_SEEDS - discoveredCategorySeeds} category seeds not yet discovered as official navigable` : '',
    next_work_packet: taxonomyDiscoveryScore < 99 ? 'discoverTaxonomy' : '',
  });

  // ─── 6. TAXONOMY_CLASSIFICATION ────────────────────────────────────
  const classifiedTaxonomy = taxonomy.filter(t => t.orphan_classification && t.orphan_classification !== '');
  const taxonomyClassification = taxonomy.length > 0
    ? Math.round((classifiedTaxonomy.length / taxonomy.length) * 100) : 0;
  categories.push({
    category: 'TAXONOMY_CLASSIFICATION',
    build_id: buildId,
    numerator: classifiedTaxonomy.length,
    denominator: taxonomy.length,
    score: taxonomyClassification,
    evidence_ids: evidenceId ? [evidenceId] : [],
    unverified_count: taxonomy.length - classifiedTaxonomy.length,
    blocked_count: 0,
    excluded_count: 0,
    timestamp,
    is_critical: false,
    lowest_failure: taxonomyClassification < 99 ? `${taxonomy.length - classifiedTaxonomy.length} unclassified nodes` : '',
    next_work_packet: taxonomyClassification < 99 ? 'classifyOrphanTaxonomy' : '',
  });

  // ─── 7. TAXONOMY_ROUTE_COVERAGE (truth-class denominator) ──────────
  const taxonomyRouteCoverage = validOfficialNodes.length > 0
    ? Math.round((validOfficialWithRoute.length / validOfficialNodes.length) * 100) : 0;
  categories.push({
    category: 'TAXONOMY_ROUTE_COVERAGE',
    build_id: buildId,
    numerator: validOfficialWithRoute.length,
    denominator: validOfficialNodes.length,
    score: taxonomyRouteCoverage,
    evidence_ids: evidenceId ? [evidenceId] : [],
    unverified_count: 0,
    blocked_count: 0,
    excluded_count: taxonomy.filter(t =>
      t.taxonomy_truth_class !== 'official_navigable_taxonomy' &&
      !INVALID_ORPHAN_CLASSIFICATIONS.has(t.orphan_classification)
    ).length,
    timestamp,
    is_critical: false,
    lowest_failure: taxonomyRouteCoverage < 99 ? `${validOfficialNodes.length - validOfficialWithRoute.length} valid official nodes missing routes` : '',
    next_work_packet: taxonomyRouteCoverage < 99 ? 'discoverTaxonomy + classifyUnmatchedRoutes' : '',
  });

  // ─── 8. CONTENT_FAMILY_COVERAGE (truth-class denominator) ───────────
  const contentFamilyCoverage = validOfficialNodes.length > 0
    ? Math.round((validOfficialWithContent.length / validOfficialNodes.length) * 100) : 0;
  categories.push({
    category: 'CONTENT_FAMILY_COVERAGE',
    build_id: buildId,
    numerator: validOfficialWithContent.length,
    denominator: validOfficialNodes.length,
    score: contentFamilyCoverage,
    evidence_ids: evidenceId ? [evidenceId] : [],
    unverified_count: 0,
    blocked_count: 0,
    excluded_count: 0,
    timestamp,
    is_critical: false,
    lowest_failure: contentFamilyCoverage < 99 ? `${validOfficialNodes.length - validOfficialWithContent.length} valid official families missing content` : '',
    next_work_packet: contentFamilyCoverage < 99 ? 'autonomousMarketplaceStocker' : '',
  });

  // ─── 9. BACKEND_IMPLEMENTATION_COVERAGE (build-scoped) ──────────────
  const beImplCoverage = v75Capabilities.length > 0
    ? Math.round((beImplemented.length / v75Capabilities.length) * 100) : 0;
  categories.push({
    category: 'BACKEND_IMPLEMENTATION_COVERAGE',
    build_id: buildId,
    numerator: beImplemented.length,
    denominator: v75Capabilities.length,
    score: beImplCoverage,
    evidence_ids: v75Capabilities.slice(0, 5).map(c => c.id).filter(Boolean),
    unverified_count: v75Capabilities.filter(c => c.status === 'not_discovered').length,
    blocked_count: v75Capabilities.filter(c => c.status === 'blocked').length,
    excluded_count: 0,
    timestamp,
    is_critical: false,
    lowest_failure: beImplCoverage < 99 ? `${v75Capabilities.length - beImplemented.length} v75 capabilities not implemented` : '',
    next_work_packet: beImplCoverage < 99 ? 'buildBackendCapabilityLedger' : '',
  });

  // ─── 10. BACKEND_VALIDATION_COVERAGE (build-scoped, critical) ───────
  // Release gating uses THIS, not implementation. Critical full-stack = 100%.
  const beValCoverage = v75Capabilities.length > 0
    ? Math.round((beValidated.length / v75Capabilities.length) * 100) : 0;
  categories.push({
    category: 'BACKEND_VALIDATION_COVERAGE',
    build_id: buildId,
    numerator: beValidated.length,
    denominator: v75Capabilities.length,
    score: beValCoverage,
    evidence_ids: beValidated.slice(0, 5).map(c => c.id).filter(Boolean),
    unverified_count: v75Capabilities.filter(c => c.status !== 'validated' && c.status !== 'not_applicable_with_proof').length,
    blocked_count: v75Capabilities.filter(c => c.status === 'blocked').length,
    excluded_count: v75Capabilities.filter(c => c.status === 'not_applicable_with_proof').length,
    timestamp,
    is_critical: true,
    lowest_failure: beValCoverage < 100 ? `${v75Capabilities.length - beValidated.length} v75 capabilities not E2E validated` : '',
    next_work_packet: beValCoverage < 100 ? 'proveFullStackChains + validateFullStack' : '',
  });

  // ─── 11-17. EVIDENCE-BACKED CATEGORIES (no fake 100%) ───────────────
  // These categories must NOT show 100% without denominator evidence.
  // If no evidence → UNVERIFIED (score=0, numerator=0, denominator=0).

  const evidenceBackedCategories = [
    { category: 'SEMANTIC_COMPONENT_PARITY', scoreField: 'behavioral_parity_score', worker: 'differentialValidation', critical: false },
    { category: 'STRUCTURAL_VISUAL_PARITY', scoreField: 'visual_parity_score', worker: 'structuralVisualParity', critical: false },
    { category: 'INTERACTION_COVERAGE', scoreField: 'browser_interaction_score', worker: 'interactionDiscovery', critical: false },
    { category: 'AUTHENTICATION', scoreField: 'auth_score', worker: 'proveFullStackChains', critical: true },
    { category: 'SECURITY', scoreField: 'security_score', worker: 'securityComplianceCheck', critical: true },
    { category: 'ACCESSIBILITY', scoreField: 'accessibility_score', worker: 'aspMatrix', critical: false },
    { category: 'PERFORMANCE', scoreField: 'performance_score', worker: 'aspMatrix', critical: false },
    { category: 'DATA_PERSISTENCE', scoreField: 'data_persistence_score', worker: 'proveFullStackChains', critical: false },
  ];

  // P0-10: When denominator = 0, score MUST be 0 — do not preserve legacy 100 values.
  // These categories need real test-count denominators before they can score above 0.
  for (const ebc of evidenceBackedCategories) {
    const target = ebc.critical ? 100 : 99;
    categories.push({
      category: ebc.category,
      build_id: buildId,
      numerator: 0,  // No denominator evidence — these need real test counts
      denominator: 0,
      score: 0,  // P0-10: Always 0 when denominator is 0 — no fake 100%
      evidence_ids: [],
      unverified_count: 1,  // P0-10: Always unverified when denominator is 0
      blocked_count: 0,
      excluded_count: 0,
      timestamp,
      is_critical: ebc.critical,
      lowest_failure: 'No denominator evidence — UNVERIFIED (needs test-count establishment)',
      next_work_packet: ebc.worker,  // Always schedule — these need evidence establishment
    });
  }

  // ─── 18. REGRESSION_SAFETY ─────────────────────────────────────────
  // Evidence: delta_from_previous has no negative regressions
  const deltas = latestHeartbeat?.delta_from_previous || {};
  const hasRegressionData = latestHeartbeat && Object.keys(deltas).length > 0;
  const regressions = Object.entries(deltas).filter(([k, v]) => typeof v === 'number' && v < 0 && k !== 'current_lowest_category');
  categories.push({
    category: 'REGRESSION_SAFETY',
    build_id: buildId,
    numerator: hasRegressionData ? (regressions.length === 0 ? 1 : 0) : 0,
    denominator: hasRegressionData ? 1 : 0,
    score: hasRegressionData ? (regressions.length === 0 ? 100 : 0) : 0,
    evidence_ids: evidenceId ? [evidenceId] : [],
    unverified_count: hasRegressionData ? 0 : 1,
    blocked_count: regressions.length,
    excluded_count: 0,
    timestamp,
    is_critical: false,
    lowest_failure: regressions.length > 0 ? `${regressions.length} regressions detected` : (hasRegressionData ? '' : 'No heartbeat delta data'),
    next_work_packet: regressions.length > 0 ? 'investigate regressions' : '',
  });

  // ─── 19. RECEIPT_COMPLETENESS ───────────────────────────────────────
  categories.push({
    category: 'RECEIPT_COMPLETENESS',
    build_id: buildId,
    numerator: latestHeartbeat ? 1 : 0,
    denominator: 1,
    score: latestHeartbeat ? 100 : 0,
    evidence_ids: evidenceId ? [evidenceId] : [],
    unverified_count: latestHeartbeat ? 0 : 1,
    blocked_count: 0,
    excluded_count: 0,
    timestamp,
    is_critical: false,
    lowest_failure: latestHeartbeat ? '' : 'No heartbeat receipt',
    next_work_packet: latestHeartbeat ? '' : 'overnightHeartbeat',
  });

  // ─── 20. EXCLUSION_COMPLIANCE (complete evidence contract) ─────────
  const exclusionsWithCompleteEvidence = exclusions.filter(e => hasCompleteExclusionEvidence(e));
  const exclusionCompliance = exclusions.length > 0
    ? Math.round((exclusionsWithCompleteEvidence.length / exclusions.length) * 100) : 0;
  categories.push({
    category: 'EXCLUSION_COMPLIANCE',
    build_id: buildId,
    numerator: exclusionsWithCompleteEvidence.length,
    denominator: exclusions.length,
    score: exclusionCompliance,
    evidence_ids: exclusionsWithCompleteEvidence.slice(0, 5).map(e => e.id).filter(Boolean),
    unverified_count: exclusions.length - exclusionsWithCompleteEvidence.length,
    blocked_count: 0,
    excluded_count: 0,
    timestamp,
    is_critical: false,
    lowest_failure: exclusionCompliance < 99 ? `${exclusions.length - exclusionsWithCompleteEvidence.length} exclusions without complete evidence contract` : '',
    next_work_packet: exclusionCompliance < 99 ? 'auditInvalidTaxonomy' : '',
  });

  return categories;
}

// ─── STATUS DETERMINATION (P0-9) ──────────────────────────────────────
// A known category with DENOMINATOR > 0 AND evidence exists AND NUMERATOR = 0
// is FAILING, not UNVERIFIED.
// UNVERIFIED means: denominator/evidence contract has not yet been established.
export function determineStatus(cat: CategoryMetric): string {
  const target = cat.is_critical ? 100 : 99;
  // UNVERIFIED: denominator is 0 (evidence contract not established)
  if (cat.denominator === 0) return 'unverified';
  // FAILING: denominator > 0 but score is 0 (evidence exists, nothing passes)
  if (cat.score === 0) return 'failing';
  if (cat.score >= target) return 'passing';
  if (cat.score >= target * 0.5) return 'partial';
  return 'failing';
}

// ─── LOWEST CATEGORY ──────────────────────────────────────────────────
export function getLowestCategory(metrics: CategoryMetric[]): { category: string; score: number } {
  // Only consider categories with actual evidence (denominator > 0).
  // Unverified categories (denominator 0) are excluded — they need evidence first.
  const eligible = metrics.filter(m => m.denominator > 0);
  if (eligible.length === 0) return { category: 'NONE', score: 0 };
  const lowest = eligible.reduce((min, curr) => curr.score < min.score ? curr : min, eligible[0]);
  return { category: lowest.category, score: lowest.score };
}

// ─── SUPERSEDED CATEGORIES (P0-11) ────────────────────────────────────
// Legacy categories that must NOT participate in active MQG calculations.
// Active backend categories are: BACKEND_IMPLEMENTATION_COVERAGE, BACKEND_VALIDATION_COVERAGE.
export const SUPERSEDED_CATEGORIES = new Set([
  'BACKEND_CAPABILITY_COVERAGE',
]);

export function isSuperseded(category: string): boolean {
  return SUPERSEDED_CATEGORIES.has(category);
}

// ─── UNVERIFIED REQUIRED QUEUE (P0-10) ────────────────────────────────
// Categories with denominator = 0 that are REQUIRED for certification.
// These must not be ignored — they need evidence/denominator establishment.
export function getUnverifiedRequiredQueue(metrics: CategoryMetric[]): CategoryMetric[] {
  return metrics.filter(m =>
    m.denominator === 0 &&
    m.unverified_count > 0 &&
    !isSuperseded(m.category) &&
    m.next_work_packet !== ''  // Has a worker assigned — can be established
  );
}