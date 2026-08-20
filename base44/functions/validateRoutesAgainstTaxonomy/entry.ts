import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Route-Taxonomy Cross-Reference Validator
//
// Every discovered Envato product path (route) is cross-referenced against the
// EnvatoTaxonomyLedger to confirm the route maps to a known taxonomy node.
// This closes the loop between the public surface crawler (discoverPublicSurface)
// and the taxonomy crawler (discoverTaxonomy): every product path must have a
// corresponding taxonomy entry, and every taxonomy node should have at least one
// route pointing at it.
//
// For each route:
//   1. Extract the category slug from the path (e.g. /graphic-templates/logos → "graphic-templates")
//   2. Look up the matching taxonomy node by node_name (slug-normalized)
//   3. If found → mark taxonomy_validated=true, matched_taxonomy_node=<id>, status="matched"
//   4. If not found and it's a content route → status="no_taxonomy_match" (flags a gap)
//   5. If it's a non-content route (auth, legal, help) → status="non_content_route" (expected)
//
// Also reverse-checks: taxonomy nodes with zero matching routes are flagged as orphaned.

const CATEGORY_SLUG_PATTERN = /^\/([a-z][a-z0-9-]+)/i;

// Non-content routes that don't need taxonomy mapping
const NON_CONTENT_TYPES = new Set(['homepage', 'auth', 'legal', 'help', 'pricing', 'search', 'other']);

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const orgId = body.organization_id || user?.data?.organization_id || 'default';

    console.log(`[validateRoutesAgainstTaxonomy] Starting cross-reference for org ${orgId}`);

    // ─── 1. FETCH ALL ROUTES AND TAXONOMY NODES ──────────────────────
    const [routes, taxonomyNodes] = await Promise.all([
      base44.asServiceRole.entities.EnvatoPublicSurfaceManifest.filter({ organization_id: orgId }).catch(() => []),
      base44.asServiceRole.entities.EnvatoTaxonomyLedger.filter({ organization_id: orgId }).catch(() => []),
    ]);

    console.log(`[validateRoutesAgainstTaxonomy] ${routes.length} routes, ${taxonomyNodes.length} taxonomy nodes`);

    if (routes.length === 0) {
      return Response.json({
        status: 'skipped',
        reason: 'No routes discovered yet — run discoverPublicSurface first',
      });
    }

    // ─── 2. BUILD TAXONOMY LOOKUP INDEX ─────────────────────────────
    // Index by node_name (lowercase, slug-normalized) for fast matching
    const taxonomyBySlug = new Map<string, any>();
    const taxonomyByNodeId = new Map<string, any>();
    for (const node of taxonomyNodes) {
      const slug = normalizeSlug(node.node_name);
      if (slug) {
        if (!taxonomyBySlug.has(slug)) taxonomyBySlug.set(slug, node);
        taxonomyByNodeId.set(node.taxonomy_node_id, node);
      }
    }
    console.log(`[validateRoutesAgainstTaxonomy] Taxonomy index: ${taxonomyBySlug.size} unique slugs`);

    // ─── 3. CROSS-REFERENCE EACH ROUTE ───────────────────────────────
    const updates: Array<{ id: string; data: any }> = [];
    const matchedRoutes: any[] = [];
    const noMatchRoutes: any[] = [];
    const nonContentRoutes: any[] = [];
    const alreadyValidated: any[] = [];

    for (const route of routes) {
      // Skip routes already validated (idempotency — only re-validate if taxonomy changed)
      if (route.taxonomy_validated === true && route.taxonomy_validation_status === 'matched') {
        alreadyValidated.push(route);
        continue;
      }

      // Non-content routes don't need taxonomy mapping
      if (NON_CONTENT_TYPES.has(route.page_type)) {
        if (route.taxonomy_validation_status !== 'non_content_route') {
          updates.push({
            id: route.id,
            data: {
              taxonomy_validated: true,
              taxonomy_validation_status: 'non_content_route',
              validated_at: new Date().toISOString(),
            },
          });
        }
        nonContentRoutes.push(route);
        continue;
      }

      // Extract category slug from the route path
      const slugMatch = route.source_route.match(CATEGORY_SLUG_PATTERN);
      if (!slugMatch) {
        // Root or non-standard path — skip
        nonContentRoutes.push(route);
        continue;
      }

      const routeSlug = slugMatch[1];
      const matchedNode = taxonomyBySlug.get(routeSlug) || taxonomyBySlug.get(routeSlug.replace(/-/g, ''));

      if (matchedNode) {
        // Route matched a taxonomy node — mark as validated
        updates.push({
          id: route.id,
          data: {
            taxonomy_validated: true,
            matched_taxonomy_node: matchedNode.taxonomy_node_id,
            taxonomy_validation_status: 'matched',
            semantic_category: matchedNode.node_name,
            validated_at: new Date().toISOString(),
          },
        });
        matchedRoutes.push({ route: route.source_route, taxonomy_node: matchedNode.taxonomy_node_id, node_name: matchedNode.node_name });
      } else {
        // Content route with no matching taxonomy node — flag as gap
        updates.push({
          id: route.id,
          data: {
            taxonomy_validated: false,
            taxonomy_validation_status: 'no_taxonomy_match',
            validated_at: new Date().toISOString(),
          },
        });
        noMatchRoutes.push({ route: route.source_route, extracted_slug: routeSlug, page_type: route.page_type });
      }
    }

    // ─── 4. BULK UPDATE ROUTES ──────────────────────────────────────
    let updatedCount = 0;
    if (updates.length > 0) {
      try {
        // Use bulkUpdate for efficiency — up to 500 records per call
        const bulkPayload = updates.map(u => ({ id: u.id, ...u.data }));
        for (let i = 0; i < bulkPayload.length; i += 500) {
          const batch = bulkPayload.slice(i, i + 500);
          await base44.asServiceRole.entities.EnvatoPublicSurfaceManifest.bulkUpdate(batch);
          updatedCount += batch.length;
        }
        console.log(`[validateRoutesAgainstTaxonomy] Updated ${updatedCount} routes`);
      } catch (e) {
        console.error(`[validateRoutesAgainstTaxonomy] Bulk update failed, falling back to individual: ${e.message}`);
        for (const u of updates) {
          try {
            await base44.asServiceRole.entities.EnvatoPublicSurfaceManifest.update(u.id, u.data);
            updatedCount++;
          } catch (err) {
            console.error(`[validateRoutesAgainstTaxonomy] Failed to update ${u.id}: ${err.message}`);
          }
        }
      }
    }

    // ─── 5. REVERSE CHECK: ORPHANED TAXONOMY NODES ───────────────────
    // Taxonomy nodes that have zero matching routes are orphaned — they exist
    // in the taxonomy but no route was discovered for them.
    const matchedNodeIds = new Set(matchedRoutes.map(m => m.taxonomy_node));
    const orphanedNodes = taxonomyNodes.filter((n: any) =>
      (n.node_type === 'category' || n.node_type === 'subcategory') &&
      !matchedNodeIds.has(n.taxonomy_node_id)
    );

    // ─── 6. COMPUTE COVERAGE STATS ──────────────────────────────────
    const contentRoutes = routes.filter((r: any) => !NON_CONTENT_TYPES.has(r.page_type));
    const validatedCount = matchedRoutes.length + alreadyValidated.length;
    const validationRate = contentRoutes.length > 0
      ? Math.round((validatedCount / contentRoutes.length) * 100)
      : 0;

    const result = {
      status: 'success',
      validator: 'ROUTE_TAXONOMY_CROSS_REF_v1',
      organization_id: orgId,
      total_routes: routes.length,
      content_routes: contentRoutes.length,
      non_content_routes: nonContentRoutes.length,
      routes_matched: matchedRoutes.length,
      routes_already_validated: alreadyValidated.length,
      routes_no_match: noMatchRoutes.length,
      routes_updated: updatedCount,
      taxonomy_nodes_total: taxonomyNodes.length,
      taxonomy_nodes_matched: matchedNodeIds.size,
      orphaned_taxonomy_nodes: orphanedNodes.length,
      validation_rate: validationRate,
      orphaned_taxonomy: orphanedNodes.slice(0, 20).map((n: any) => ({
        taxonomy_node_id: n.taxonomy_node_id,
        node_name: n.node_name,
        node_type: n.node_type,
      })),
      unmatched_routes: noMatchRoutes.slice(0, 20).map(r => ({
        route: r.route,
        extracted_slug: r.extracted_slug,
        page_type: r.page_type,
      })),
      summary: validationRate === 100
        ? `All ${contentRoutes.length} content routes validated against taxonomy`
        : `${validationRate}% of content routes validated — ${noMatchRoutes.length} routes have no matching taxonomy node`,
    };

    console.log(`[validateRoutesAgainstTaxonomy] ${result.summary}`);
    return Response.json(result);
  } catch (error) {
    console.error('[validateRoutesAgainstTaxonomy] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Normalize a node name to a URL-safe slug for matching
function normalizeSlug(name: string): string {
  if (!name) return '';
  return name.toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}