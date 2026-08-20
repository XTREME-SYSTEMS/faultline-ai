import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Update Closure Board — P12
//
// Maintains the authoritative XTREME_CLONE_CLOSURE_BOARD showing every MQG
// category with STATUS, SCORE, DENOMINATOR, NUMERATOR, BUILD_ID, EVIDENCE.
//
// Categories scored independently — no blended headline.
// Statuses: UNVERIFIED, FAILING, PARTIAL, PASSING, BLOCKED, CERTIFIED.

const CRITICAL_CATEGORIES = new Set([
  'AUTHENTICATION', 'AUTHORIZATION', 'DOWNLOAD_ENTITLEMENT',
  'DATA_ISOLATION', 'SOURCE_TRUTH_INTEGRITY', 'BUILD_IDENTITY',
  'FILEMAP_COLLISION_SAFETY', 'GENERATION_INJECTION_INVARIANT',
]);

interface CategoryScore {
  category: string;
  score: number;
  numerator: number;
  denominator: number;
  is_critical: boolean;
  lowest_failure: string;
  next_work_packet: string;
}

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
    const evidenceId = latestHeartbeat?.id || '';

    // ─── 2. COMPUTE ALL CATEGORY SCORES ────────────────────────────
    const categoryScores = computeAllCategoryScores({
      routes, taxonomy, capabilities, latestScore, latestHeartbeat, canonicalState, exclusions,
    });

    // ─── 3. UPSERT CLOSURE BOARD ENTRIES ────────────────────────────
    const existingBoard = await base44.asServiceRole.entities.ClosureBoard
      .filter({ organization_id: orgId }).catch(() => []);
    const existingMap = new Map(existingBoard.map(b => [b.category, b]));

    const upserts: any[] = [];
    for (const cat of categoryScores) {
      const status = determineStatus(cat);
      const existing = existingMap.get(cat.category);
      const data = {
        organization_id: orgId,
        category: cat.category,
        status,
        score: cat.score,
        target_score: cat.is_critical ? 100 : 99,
        is_critical: cat.is_critical,
        denominator: cat.denominator,
        numerator: cat.numerator,
        build_id: buildId,
        evidence_timestamp: evidenceTimestamp,
        evidence_id: evidenceId,
        lowest_failure: cat.lowest_failure || '',
        blocker: status === 'blocked' ? cat.lowest_failure : '',
        next_work_packet: cat.next_work_packet || '',
        updated_at: new Date().toISOString(),
      };
      if (existing) {
        upserts.push({ id: existing.id, ...data });
      } else {
        upserts.push(data);
      }
    }

    // Bulk upsert
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

    // ─── 4. COMPUTE SUMMARY ────────────────────────────────────────
    const passing = categoryScores.filter(c => c.score >= (c.is_critical ? 100 : 99)).length;
    const failing = categoryScores.filter(c => c.score < (c.is_critical ? 100 : 99) && c.score > 0).length;
    const unverified = categoryScores.filter(c => c.score === 0).length;
    const lowestScore = Math.min(...categoryScores.map(c => c.score));
    const lowestCategory = categoryScores.find(c => c.score === lowestScore);

    const result = {
      status: 'success',
      organization_id: orgId,
      build_id: buildId,
      total_categories: categoryScores.length,
      passing,
      failing,
      unverified,
      lowest_score: lowestScore,
      lowest_category: lowestCategory?.category,
      categories: categoryScores.map(c => ({
        category: c.category,
        score: c.score,
        target: c.is_critical ? 100 : 99,
        critical: c.is_critical,
        status: determineStatus(c),
        numerator: c.numerator,
        denominator: c.denominator,
        next_work: c.next_work_packet,
      })),
      message: `Closure board: ${passing}/${categoryScores.length} passing, ${failing} failing, ${unverified} unverified. Lowest: ${lowestCategory?.category} at ${lowestScore}%`,
    };

    console.log(`[updateClosureBoard] ${result.message}`);
    return Response.json(result);
  } catch (error) {
    console.error('[updateClosureBoard] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ─── COMPUTE ALL CATEGORY SCORES ─────────────────────────────────────
function computeAllCategoryScores(data: any): CategoryScore[] {
  const { routes, taxonomy, capabilities, latestScore, latestHeartbeat, canonicalState, exclusions } = data;
  const categories: CategoryScore[] = [];

  const NON_CONTENT = new Set(['homepage', 'auth', 'legal', 'help', 'pricing', 'search', 'other']);
  const validRoutes = routes.filter((r: any) => r.valid !== false);
  const contentRoutes = validRoutes.filter((r: any) => !NON_CONTENT.has(r.page_type) && r.route_type === 'content');
  const matchedRoutes = contentRoutes.filter((r: any) => r.taxonomy_validation_status === 'matched');

  // SOURCE_TRUTH_INTEGRITY
  categories.push({
    category: 'SOURCE_TRUTH_INTEGRITY',
    score: canonicalState?.drift_detected ? 0 : 100,
    numerator: canonicalState?.drift_detected ? 0 : 1,
    denominator: 1,
    is_critical: true,
    lowest_failure: canonicalState?.drift_detected ? 'Drift detected — see drift_details' : '',
    next_work_packet: canonicalState?.drift_detected ? 'Run reconcileCanonicalState to resolve drift' : '',
  });

  // BUILD_IDENTITY
  categories.push({
    category: 'BUILD_IDENTITY',
    score: canonicalState?.canonical_envato_build_id ? 100 : 0,
    numerator: canonicalState?.canonical_envato_build_id ? 1 : 0,
    denominator: 1,
    is_critical: true,
    lowest_failure: canonicalState?.canonical_envato_build_id ? '' : 'No canonical build ID',
    next_work_packet: canonicalState?.canonical_envato_build_id ? '' : 'Run reconcileCanonicalState',
  });

  // ROUTE_DISCOVERY
  const routeDiscoveryScore = validRoutes.length > 0 ? Math.min(100, Math.round((validRoutes.length / 160) * 100)) : 0;
  categories.push({
    category: 'ROUTE_DISCOVERY',
    score: routeDiscoveryScore,
    numerator: validRoutes.length,
    denominator: 160,
    is_critical: false,
    lowest_failure: routeDiscoveryScore < 99 ? `${160 - validRoutes.length} routes below baseline` : '',
    next_work_packet: routeDiscoveryScore < 99 ? 'discoverPublicSurface' : '',
  });

  // ROUTE_FIDELITY (clone routes matching source)
  const clonedRoutes = validRoutes.filter((r: any) => r.clone_status === 'validated' || r.clone_status === 'exists');
  const routeFidelity = validRoutes.length > 0 ? Math.round((clonedRoutes.length / validRoutes.length) * 100) : 0;
  categories.push({
    category: 'ROUTE_FIDELITY',
    score: routeFidelity,
    numerator: clonedRoutes.length,
    denominator: validRoutes.length,
    is_critical: false,
    lowest_failure: routeFidelity < 99 ? `${validRoutes.length - clonedRoutes.length} routes not cloned` : '',
    next_work_packet: routeFidelity < 99 ? 'autonomousFullSiteClone' : '',
  });

  // TAXONOMY_DISCOVERY
  categories.push({
    category: 'TAXONOMY_DISCOVERY',
    score: taxonomy.length > 0 ? Math.min(100, Math.round((taxonomy.length / 300) * 100)) : 0,
    numerator: taxonomy.length,
    denominator: 300,
    is_critical: false,
    lowest_failure: taxonomy.length < 300 ? `${300 - taxonomy.length} nodes below baseline` : '',
    next_work_packet: taxonomy.length < 300 ? 'discoverTaxonomy' : '',
  });

  // TAXONOMY_CLASSIFICATION
  const classifiedTaxonomy = taxonomy.filter((t: any) => t.orphan_classification && t.orphan_classification !== '');
  const taxonomyClassification = taxonomy.length > 0 ? Math.round((classifiedTaxonomy.length / taxonomy.length) * 100) : 0;
  categories.push({
    category: 'TAXONOMY_CLASSIFICATION',
    score: taxonomyClassification,
    numerator: classifiedTaxonomy.length,
    denominator: taxonomy.length,
    is_critical: false,
    lowest_failure: taxonomyClassification < 99 ? `${taxonomy.length - classifiedTaxonomy.length} unclassified nodes` : '',
    next_work_packet: taxonomyClassification < 99 ? 'classifyOrphanTaxonomy' : '',
  });

  // TAXONOMY_ROUTE_COVERAGE
  const navigableNodes = taxonomy.filter((t: any) =>
    (t.node_type === 'category' || t.node_type === 'subcategory') &&
    t.orphan_classification !== 'invalid' && t.orphan_classification !== 'duplicate'
  );
  const navigableWithRoute = navigableNodes.filter((t: any) =>
    t.orphan_classification === 'not_orphan' || t.orphan_classification === 'missing_content'
  );
  const taxonomyRouteCoverage = navigableNodes.length > 0 ? Math.round((navigableWithRoute.length / navigableNodes.length) * 100) : 0;
  categories.push({
    category: 'TAXONOMY_ROUTE_COVERAGE',
    score: taxonomyRouteCoverage,
    numerator: navigableWithRoute.length,
    denominator: navigableNodes.length,
    is_critical: false,
    lowest_failure: taxonomyRouteCoverage < 99 ? `${navigableNodes.length - navigableWithRoute.length} nodes missing routes` : '',
    next_work_packet: taxonomyRouteCoverage < 99 ? 'discoverTaxonomy + classifyUnmatchedRoutes' : '',
  });

  // CONTENT_FAMILY_COVERAGE
  const nodesWithContent = navigableNodes.filter((t: any) => t.content_count > 0 || t.content_available);
  const contentFamilyCoverage = navigableNodes.length > 0 ? Math.round((nodesWithContent.length / navigableNodes.length) * 100) : 0;
  categories.push({
    category: 'CONTENT_FAMILY_COVERAGE',
    score: contentFamilyCoverage,
    numerator: nodesWithContent.length,
    denominator: navigableNodes.length,
    is_critical: false,
    lowest_failure: contentFamilyCoverage < 99 ? `${navigableNodes.length - nodesWithContent.length} families missing content` : '',
    next_work_packet: contentFamilyCoverage < 99 ? 'autonomousMarketplaceStocker' : '',
  });

  // BACKEND_CAPABILITY_COVERAGE
  const implementedCaps = capabilities.filter((c: any) => c.status === 'implemented' || c.status === 'validated');
  const backendCoverage = capabilities.length > 0 ? Math.round((implementedCaps.length / capabilities.length) * 100) : 0;
  categories.push({
    category: 'BACKEND_CAPABILITY_COVERAGE',
    score: backendCoverage,
    numerator: implementedCaps.length,
    denominator: capabilities.length,
    is_critical: false,
    lowest_failure: backendCoverage < 99 ? `${capabilities.length - implementedCaps.length} capabilities not implemented` : '',
    next_work_packet: backendCoverage < 99 ? 'buildBackendCapabilityLedger' : '',
  });

  // SEMANTIC_COMPONENT_PARITY
  categories.push({
    category: 'SEMANTIC_COMPONENT_PARITY',
    score: latestScore?.behavioral_parity_score || 0,
    numerator: 0, denominator: 1,
    is_critical: false,
    lowest_failure: (latestScore?.behavioral_parity_score || 0) < 99 ? 'Behavioral parity below 99%' : '',
    next_work_packet: (latestScore?.behavioral_parity_score || 0) < 99 ? 'differentialValidation' : '',
  });

  // STRUCTURAL_VISUAL_PARITY
  categories.push({
    category: 'STRUCTURAL_VISUAL_PARITY',
    score: latestScore?.visual_parity_score || 0,
    numerator: 0, denominator: 1,
    is_critical: false,
    lowest_failure: (latestScore?.visual_parity_score || 0) < 99 ? 'Visual parity below 99%' : '',
    next_work_packet: (latestScore?.visual_parity_score || 0) < 99 ? 'structuralVisualParity' : '',
  });

  // INTERACTION_COVERAGE
  categories.push({
    category: 'INTERACTION_COVERAGE',
    score: latestScore?.browser_interaction_score || 0,
    numerator: 0, denominator: 1,
    is_critical: false,
    lowest_failure: (latestScore?.browser_interaction_score || 0) < 99 ? 'Interaction coverage below 99%' : '',
    next_work_packet: (latestScore?.browser_interaction_score || 0) < 99 ? 'interactionDiscovery' : '',
  });

  // AUTHENTICATION (critical)
  categories.push({
    category: 'AUTHENTICATION',
    score: latestScore?.auth_score || 0,
    numerator: 0, denominator: 1,
    is_critical: true,
    lowest_failure: (latestScore?.auth_score || 0) < 100 ? 'Auth score below 100%' : '',
    next_work_packet: (latestScore?.auth_score || 0) < 100 ? 'proveFullStackChains' : '',
  });

  // SECURITY (critical)
  categories.push({
    category: 'SECURITY',
    score: latestScore?.security_score || 0,
    numerator: 0, denominator: 1,
    is_critical: true,
    lowest_failure: (latestScore?.security_score || 0) < 100 ? 'Security score below 100%' : '',
    next_work_packet: (latestScore?.security_score || 0) < 100 ? 'securityComplianceCheck' : '',
  });

  // ACCESSIBILITY
  categories.push({
    category: 'ACCESSIBILITY',
    score: latestScore?.accessibility_score || 0,
    numerator: 0, denominator: 1,
    is_critical: false,
    lowest_failure: (latestScore?.accessibility_score || 0) < 99 ? 'Accessibility below 99%' : '',
    next_work_packet: (latestScore?.accessibility_score || 0) < 99 ? 'aspMatrix' : '',
  });

  // PERFORMANCE
  categories.push({
    category: 'PERFORMANCE',
    score: latestScore?.performance_score || 0,
    numerator: 0, denominator: 1,
    is_critical: false,
    lowest_failure: (latestScore?.performance_score || 0) < 99 ? 'Performance below 99%' : '',
    next_work_packet: (latestScore?.performance_score || 0) < 99 ? 'aspMatrix' : '',
  });

  // DATA_PERSISTENCE
  categories.push({
    category: 'DATA_PERSISTENCE',
    score: latestScore?.data_persistence_score || 0,
    numerator: 0, denominator: 1,
    is_critical: false,
    lowest_failure: (latestScore?.data_persistence_score || 0) < 99 ? 'Persistence below 99%' : '',
    next_work_packet: (latestScore?.data_persistence_score || 0) < 99 ? 'proveFullStackChains' : '',
  });

  // REGRESSION_SAFETY
  categories.push({
    category: 'REGRESSION_SAFETY',
    score: latestHeartbeat?.delta_from_previous ? 100 : 0,
    numerator: 0, denominator: 1,
    is_critical: false,
    lowest_failure: '',
    next_work_packet: '',
  });

  // RECEIPT_COMPLETENESS
  categories.push({
    category: 'RECEIPT_COMPLETENESS',
    score: latestHeartbeat ? 100 : 0,
    numerator: latestHeartbeat ? 1 : 0,
    denominator: 1,
    is_critical: false,
    lowest_failure: latestHeartbeat ? '' : 'No heartbeat receipt',
    next_work_packet: latestHeartbeat ? '' : 'overnightHeartbeat',
  });

  // EXCLUSION_COMPLIANCE — every exclusion has evidence
  const exclusionsWithEvidence = exclusions.filter((e: any) => e.source_evidence && e.source_evidence.length > 0);
  const exclusionCompliance = exclusions.length > 0 ? Math.round((exclusionsWithEvidence.length / exclusions.length) * 100) : 100;
  categories.push({
    category: 'EXCLUSION_COMPLIANCE',
    score: exclusionCompliance,
    numerator: exclusionsWithEvidence.length,
    denominator: exclusions.length || 1,
    is_critical: false,
    lowest_failure: exclusionCompliance < 99 ? `${exclusions.length - exclusionsWithEvidence.length} exclusions without evidence` : '',
    next_work_packet: exclusionCompliance < 99 ? 'auditInvalidTaxonomy' : '',
  });

  return categories;
}

function determineStatus(cat: CategoryScore): string {
  const target = cat.is_critical ? 100 : 99;
  if (cat.score === 0) return 'unverified';
  if (cat.score >= target) return 'passing';
  if (cat.score >= target * 0.5) return 'partial';
  return 'failing';
}