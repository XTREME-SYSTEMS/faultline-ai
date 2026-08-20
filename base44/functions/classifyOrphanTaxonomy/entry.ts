import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Orphan Taxonomy Classification — P3
//
// Every orphan taxonomy node (one with no matching discovered route) receives
// one classification:
//
//   VALID_LEAF_NOT_YET_DISCOVERED  — category/subcategory that should have a route
//   VALID_PARENT_GROUP             — parent that groups children, may not have own page
//   FILTER_ONLY_DIMENSION          — filter_family/tag/sort_mode (not navigable)
//   ALIAS                          — name matches a known alias of another node
//   DUPLICATE                       — same slug as another node
//   STALE                           — outdated name, no longer in source navigation
//   INVALID                         — garbage/corrupt name (e.g. "similar to QYXJNTU")
//   OUT_OF_SCOPE                    — not relevant to the clone
//   MISSING_CONTENT                 — valid node with no content
//   MISSING_ROUTE                   — valid node with no route
//   MISSING_CRAWL_EVIDENCE          — needs Browserbase verification
//
// Does NOT count VALID_PARENT_GROUP as requiring standalone pages.
// Does NOT generate content for INVALID, DUPLICATE, or STALE nodes.

const VALID_CATEGORY_TYPES = new Set(['category', 'subcategory', 'content_type']);
const FILTER_TYPES = new Set(['filter_family', 'tag', 'sort_mode', 'software', 'format', 'style', 'use_case']);

// Patterns that indicate INVALID node names (product codes, garbage)
const INVALID_PATTERNS = [
  /^similar to [a-z0-9]{4,}$/i,
  /^[a-z0-9]{6,}$/i,  // Pure alphanumeric codes with no words
  /^test\b/i,
  /^undefined$/i,
  /^null$/i,
  /^unknown$/i,
  /^\s*$/,
];

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const orgId = body.organization_id || user?.data?.organization_id || 'default';

    console.log(`[classifyOrphanTaxonomy] Starting for org ${orgId}`);

    // ─── 1. FETCH ALL TAXONOMY NODES AND ROUTES ─────────────────────
    const [taxonomyNodes, routes] = await Promise.all([
      base44.asServiceRole.entities.EnvatoTaxonomyLedger.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.EnvatoPublicSurfaceManifest.filter({ organization_id: orgId }).catch(() => []),
    ]);

    console.log(`[classifyOrphanTaxonomy] ${taxonomyNodes.length} taxonomy nodes, ${routes.length} routes`);

    // ─── 2. BUILD ROUTE SLUG INDEX ──────────────────────────────────
    const routeSlugs = new Set<string>();
    for (const r of routes) {
      const path = r.canonical_url || r.source_route || '';
      const slug = extractSlugFromPath(path);
      if (slug) routeSlugs.add(slug);
    }

    // ─── 3. BUILD SLUG → NODE INDEX (for duplicate detection) ────────
    const slugToNodes = new Map<string, any[]>();
    for (const node of taxonomyNodes) {
      const slug = normalizeSlug(node.node_name);
      if (!slug) continue;
      if (!slugToNodes.has(slug)) slugToNodes.set(slug, []);
      slugToNodes.get(slug)!.push(node);
    }

    // ─── 4. BUILD PARENT → CHILDREN INDEX ──────────────────────────
    const parentToChildren = new Map<string, any[]>();
    for (const node of taxonomyNodes) {
      const parentId = node.parent_node || node.parent_id;
      if (!parentId) continue;
      if (!parentToChildren.has(parentId)) parentToChildren.set(parentId, []);
      parentToChildren.get(parentId)!.push(node);
    }

    // ─── 5. CLASSIFY EACH ORPHAN NODE ───────────────────────────────
    const updates: Array<{ id: string; data: any }> = [];
    const classificationCounts: Record<string, number> = {};

    for (const node of taxonomyNodes) {
      const slug = normalizeSlug(node.node_name);
      const hasRoute = slug && routeSlugs.has(slug);

      // Skip non-orphans (nodes that have a matching route)
      if (hasRoute) {
        if (node.orphan_classification !== 'not_orphan') {
          updates.push({
            id: node.id,
            data: { orphan_classification: 'not_orphan', confidence: 1.0 },
          });
        }
        classificationCounts['not_orphan'] = (classificationCounts['not_orphan'] || 0) + 1;
        continue;
      }

      // ── CLASSIFY ORPHAN ──
      let classification = 'missing_crawl_evidence';
      let evidence = '';
      let confidence = 0.5;

      // Check INVALID first — garbage names
      if (INVALID_PATTERNS.some(p => p.test(node.node_name || ''))) {
        classification = 'invalid';
        evidence = `Node name matches invalid pattern (product code or garbage): "${node.node_name}"`;
        confidence = 0.95;
      }
      // Check DUPLICATE — same slug as another node
      else if (slug && slugToNodes.get(slug) && slugToNodes.get(slug)!.length > 1) {
        const dupes = slugToNodes.get(slug)!.filter(n => n.id !== node.id);
        classification = 'duplicate';
        evidence = `Duplicate slug "${slug}" shared with ${dupes.length} other node(s): ${dupes.map(d => d.node_name).join(', ')}`;
        confidence = 0.9;
      }
      // Check FILTER_ONLY_DIMENSION — filter types are not navigable pages
      else if (FILTER_TYPES.has(node.node_type)) {
        classification = 'filter_only_dimension';
        evidence = `Node type "${node.node_type}" is a filter dimension, not a navigable category`;
        confidence = 0.85;
      }
      // Check VALID_PARENT_GROUP — has children, may not need own page
      else if (parentToChildren.has(node.taxonomy_node_id) && parentToChildren.get(node.taxonomy_node_id)!.length > 0) {
        const childCount = parentToChildren.get(node.taxonomy_node_id)!.length;
        classification = 'valid_parent_group';
        evidence = `Parent group with ${childCount} child node(s) — may not require standalone page`;
        confidence = 0.8;
      }
      // Check VALID_LEAF_NOT_YET_DISCOVERED — category/subcategory that should have a route
      else if (VALID_CATEGORY_TYPES.has(node.node_type)) {
        // Check if it has content
        if (node.content_count > 0 || node.content_available) {
          classification = 'missing_route';
          evidence = `Valid ${node.node_type} with content (${node.content_count} items) but no discovered route`;
          confidence = 0.75;
        } else {
          classification = 'valid_leaf_not_discovered';
          evidence = `Valid ${node.node_type} leaf — route not yet discovered by crawler`;
          confidence = 0.7;
        }
      }
      // Check MISSING_CONTENT — node exists but has no content
      else if (node.node_type === 'asset_class') {
        classification = 'missing_content';
        evidence = `Asset class with no content populated`;
        confidence = 0.6;
      }
      // Default — needs crawl evidence
      else {
        classification = 'missing_crawl_evidence';
        evidence = `Node type "${node.node_type}" requires Browserbase verification to classify`;
        confidence = 0.4;
      }

      updates.push({
        id: node.id,
        data: {
          orphan_classification: classification,
          classification_evidence: evidence,
          confidence,
          slug: slug || undefined,
        },
      });
      classificationCounts[classification] = (classificationCounts[classification] || 0) + 1;
    }

    // ─── 6. BULK UPDATE ─────────────────────────────────────────────
    let updatedCount = 0;
    const bulkPayload = updates.map(u => ({ id: u.id, ...u.data }));
    for (let i = 0; i < bulkPayload.length; i += 500) {
      const batch = bulkPayload.slice(i, i + 500);
      try {
        await base44.asServiceRole.entities.EnvatoTaxonomyLedger.bulkUpdate(batch);
        updatedCount += batch.length;
      } catch (e) {
        console.error(`[classifyOrphanTaxonomy] Bulk update failed: ${e.message}`);
        for (const item of batch) {
          try {
            await base44.asServiceRole.entities.EnvatoTaxonomyLedger.update(item.id, item);
            updatedCount++;
          } catch {}
        }
      }
    }

    // ─── 7. COMPUTE ACTIONABLE GAPS ─────────────────────────────────
    const requiresRoute = classificationCounts['valid_leaf_not_discovered'] || 0;
    const missingRoute = classificationCounts['missing_route'] || 0;
    const missingContent = classificationCounts['missing_content'] || 0;
    const needsCrawl = classificationCounts['missing_crawl_evidence'] || 0;
    const invalidCount = classificationCounts['invalid'] || 0;
    const duplicateCount = classificationCounts['duplicate'] || 0;
    const filterOnly = classificationCounts['filter_only_dimension'] || 0;
    const parentGroup = classificationCounts['valid_parent_group'] || 0;

    // Valid nodes that need work (excluding invalid, duplicate, filter-only, parent-group)
    const actionableGaps = requiresRoute + missingRoute + missingContent + needsCrawl;

    const result = {
      status: 'success',
      organization_id: orgId,
      total_taxonomy_nodes: taxonomyNodes.length,
      orphan_nodes: taxonomyNodes.length - (classificationCounts['not_orphan'] || 0),
      nodes_updated: updatedCount,
      classification_distribution: classificationCounts,
      actionable_gaps: actionableGaps,
      summary: {
        requires_route_discovery: requiresRoute,
        missing_route: missingRoute,
        missing_content: missingContent,
        needs_crawl_evidence: needsCrawl,
        invalid_excluded: invalidCount,
        duplicates_excluded: duplicateCount,
        filter_only_excluded: filterOnly,
        parent_group_no_page_needed: parentGroup,
      },
      message: `Classified ${updatedCount} orphan nodes: ${actionableGaps} actionable, ${invalidCount + duplicateCount + filterOnly + parentGroup} excluded from page generation`,
    };

    console.log(`[classifyOrphanTaxonomy] ${result.message}`);
    return Response.json(result);
  } catch (error) {
    console.error('[classifyOrphanTaxonomy] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function extractSlugFromPath(path: string): string {
  if (!path || path === '/') return '';
  const match = path.match(/^\/([a-z][a-z0-9-]+)/i);
  return match ? match[1] : '';
}

function normalizeSlug(name: string): string {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}