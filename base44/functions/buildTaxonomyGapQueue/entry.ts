import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Taxonomy Gap Queue — P11
//
// Rebuilds the prioritized gap queue on every heartbeat. Priority order:
//
//   P0 validator blindness       — validator itself is broken/blind
//   P1 invalid/corrupt taxonomy   — taxonomy records with corrupt data
//   P2 unmatched valid routes     — content routes with no taxonomy match
//   P3 valid orphan nodes         — valid_leaf_not_discovered + missing_route
//   P4 missing backend capability — backend gaps
//   P5 missing content family     — taxonomy leaves with no content
//   P6 insufficient content density — leaves with too few items
//   P7 visual/responsive gap      — visual parity gaps
//   P8 optimization               — performance/optimization improvements
//
// Returns the highest safe unresolved work packet.
// Does NOT improve metrics by deleting/shrinking — only by filling real gaps.

const SOURCE_URL = 'https://elements.envato.com';

interface GapItem {
  priority: number;
  gap_type: string;
  description: string;
  target_function: string;
  target_entity: string;
  target_id: string;
  safe: boolean;
  evidence: string;
}

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const orgId = body.organization_id || user?.data?.organization_id || 'default';

    console.log(`[buildTaxonomyGapQueue] Starting for org ${orgId}`);

    // ─── 1. FETCH ALL DATA ──────────────────────────────────────────
    const [routes, taxonomy, capabilities, scores, exclusions, jobs] = await Promise.all([
      base44.asServiceRole.entities.EnvatoPublicSurfaceManifest.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.EnvatoTaxonomyLedger.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.BackendCapabilityLedger.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.MasterQualityScore.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.ExclusionRecord.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.JobQueue.filter({ organization_id: orgId }).catch(() => []),
    ]);

    console.log(`[buildTaxonomyGapQueue] ${routes.length} routes, ${taxonomy.length} taxonomy, ${capabilities.length} capabilities, ${exclusions.length} exclusions, ${jobs.length} jobs`);

    // Build set of already-excluded object IDs (skip these — they have evidence)
    const excludedObjectIds = new Set(exclusions.map((e: any) => e.object_id));
    // Build set of already-queued/running job types (skip duplicates)
    const activeJobTypes = new Set(jobs
      .filter((j: any) => j.status === 'queued' || j.status === 'claimed' || j.status === 'running')
      .map((j: any) => j.job_type));

    const gapQueue: GapItem[] = [];

    // ─── 2. P1: INVALID/CORRUPT TAXONOMY ────────────────────────────
    // Skip invalid nodes that already have exclusion records — they're audited
    const invalidNodes = taxonomy.filter(t =>
      t.orphan_classification === 'invalid' && !excludedObjectIds.has(t.id)
    );
    for (const node of invalidNodes.slice(0, 5)) {
      gapQueue.push({
        priority: 1,
        gap_type: 'invalid_taxonomy',
        description: `Invalid taxonomy node: "${node.node_name}" — should be removed or re-classified`,
        target_function: 'classifyOrphanTaxonomy',
        target_entity: 'EnvatoTaxonomyLedger',
        target_id: node.id,
        safe: true,
        evidence: node.classification_evidence || 'Invalid pattern match',
      });
    }

    // ─── 3. P2: UNMATCHED VALID ROUTES ─────────────────────────────
    const unmatchedRoutes = routes.filter(r =>
      r.taxonomy_validation_status === 'no_taxonomy_match' &&
      r.route_type === 'content' &&
      r.valid !== false
    );
    for (const route of unmatchedRoutes.slice(0, 15)) {
      gapQueue.push({
        priority: 2,
        gap_type: 'unmatched_valid_route',
        description: `Route ${route.source_route} has no taxonomy match — needs classification or taxonomy mapping`,
        target_function: 'classifyUnmatchedRoutes',
        target_entity: 'EnvatoPublicSurfaceManifest',
        target_id: route.id,
        safe: true,
        evidence: `Route type: ${route.route_type}, page type: ${route.page_type}`,
      });
    }

    // ─── 4. P3: VALID ORPHAN NODES WITH MISSING ROUTE ───────────────
    const missingRouteNodes = taxonomy.filter(t =>
      t.orphan_classification === 'valid_leaf_not_discovered' ||
      t.orphan_classification === 'missing_route'
    );
    for (const node of missingRouteNodes.slice(0, 15)) {
      gapQueue.push({
        priority: 3,
        gap_type: 'missing_route_for_valid_node',
        description: `Valid taxonomy node "${node.node_name}" (${node.node_type}) has no discovered route — needs Browserbase crawl`,
        target_function: 'discoverTaxonomy',
        target_entity: 'EnvatoTaxonomyLedger',
        target_id: node.id,
        safe: true,
        evidence: node.classification_evidence || `Classification: ${node.orphan_classification}`,
      });
    }

    // ─── 5. P3b: MISSING CRAWL EVIDENCE ─────────────────────────────
    const needsCrawl = taxonomy.filter(t => t.orphan_classification === 'missing_crawl_evidence');
    for (const node of needsCrawl.slice(0, 10)) {
      gapQueue.push({
        priority: 3,
        gap_type: 'missing_crawl_evidence',
        description: `Taxonomy node "${node.node_name}" needs Browserbase verification to classify`,
        target_function: 'discoverTaxonomy',
        target_entity: 'EnvatoTaxonomyLedger',
        target_id: node.id,
        safe: true,
        evidence: node.classification_evidence || 'No crawl evidence yet',
      });
    }

    // ─── 6. P4: MISSING BACKEND CAPABILITY ──────────────────────────
    const missingCapabilities = capabilities.filter(c =>
      c.status === 'not_discovered' || c.status === 'discovered' || c.status === 'partial' || c.status === 'blocked'
    );
    for (const cap of missingCapabilities.slice(0, 10)) {
      gapQueue.push({
        priority: 4,
        gap_type: 'missing_backend_capability',
        description: `Backend capability "${cap.capability_name}" is ${cap.status} — needs implementation`,
        target_function: 'buildBackendCapabilityLedger',
        target_entity: 'BackendCapabilityLedger',
        target_id: cap.id,
        safe: true,
        evidence: `Capability category: ${cap.capability_category}`,
      });
    }

    // ─── 7. P5: MISSING CONTENT FAMILY ─────────────────────────────
    const missingContentNodes = taxonomy.filter(t =>
      t.orphan_classification === 'missing_content' ||
      (t.orphan_classification === 'not_orphan' && !t.content_available && t.content_count === 0 &&
       (t.node_type === 'category' || t.node_type === 'subcategory'))
    );
    for (const node of missingContentNodes.slice(0, 10)) {
      gapQueue.push({
        priority: 5,
        gap_type: 'missing_content_family',
        description: `Taxonomy node "${node.node_name}" has no content — needs population`,
        target_function: 'autonomousMarketplaceStocker',
        target_entity: 'EnvatoTaxonomyLedger',
        target_id: node.id,
        safe: true,
        evidence: `Content count: ${node.content_count}, content available: ${node.content_available}`,
      });
    }

    // ─── 8. P6: INSUFFICIENT CONTENT DENSITY ───────────────────────
    const lowDensityNodes = taxonomy.filter(t =>
      t.orphan_classification === 'not_orphan' &&
      t.content_count > 0 && t.content_count < 10 &&
      (t.node_type === 'category' || t.node_type === 'subcategory')
    );
    for (const node of lowDensityNodes.slice(0, 5)) {
      gapQueue.push({
        priority: 6,
        gap_type: 'insufficient_content_density',
        description: `Taxonomy node "${node.node_name}" has only ${node.content_count} items — needs more content`,
        target_function: 'autonomousMarketplaceStocker',
        target_entity: 'EnvatoTaxonomyLedger',
        target_id: node.id,
        safe: true,
        evidence: `Content count: ${node.content_count} (minimum: 10)`,
      });
    }

    // ─── 9. P7: VISUAL/RESPONSIVE GAP ──────────────────────────────
    const latestScore = scores.sort((a, b) =>
      new Date(b.run_at || b.created_date).getTime() - new Date(a.run_at || a.created_date).getTime()
    )[0];
    if (latestScore && latestScore.visual_parity_score < 99) {
      gapQueue.push({
        priority: 7,
        gap_type: 'visual_parity_gap',
        description: `Visual parity at ${latestScore.visual_parity_score}% — needs hardening`,
        target_function: 'structuralVisualParity',
        target_entity: 'MasterQualityScore',
        target_id: latestScore.id,
        safe: true,
        evidence: `Visual parity score: ${latestScore.visual_parity_score}%`,
      });
    }

    // ─── 10. SORT BY PRIORITY ──────────────────────────────────────
    gapQueue.sort((a, b) => a.priority - b.priority);

    // ─── 11. SELECT HIGHEST SAFE WORK PACKET ────────────────────────
    // Skip gap items whose target_function is already active in the job queue
    const nextPacket = gapQueue.find(g => g.safe && !activeJobTypes.has(g.target_function)) || null;

    // ─── 12. COMPUTE QUEUE STATS ───────────────────────────────────
    const queueStats: Record<string, number> = {};
    for (const gap of gapQueue) {
      queueStats[gap.gap_type] = (queueStats[gap.gap_type] || 0) + 1;
    }

    const result = {
      status: 'success',
      organization_id: orgId,
      queue_depth: gapQueue.length,
      queue_by_type: queueStats,
      next_work_packet: nextPacket,
      top_5_gaps: gapQueue.slice(0, 5).map(g => ({
        priority: g.priority,
        gap_type: g.gap_type,
        description: g.description,
        target_function: g.target_function,
      })),
      message: `Gap queue: ${gapQueue.length} gaps across ${Object.keys(queueStats).length} types — next: ${nextPacket?.gap_type || 'none'}`,
    };

    console.log(`[buildTaxonomyGapQueue] ${result.message}`);
    return Response.json(result);
  } catch (error) {
    console.error('[buildTaxonomyGapQueue] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}