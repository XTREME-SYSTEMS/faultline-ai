import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Taxonomy Graph Builder — P5
//
// Converts the flat taxonomy ledger into a directed graph by computing:
//   PARENT_ID  — direct parent node ID
//   ANCESTORS  — ordered list from root to parent
//   CHILDREN   — list of direct child node IDs
//   SLUG       — URL-safe slug for route matching
//   SOURCE_ROUTE — canonical source route mapping
//   CLONE_ROUTE  — corresponding clone route
//   FILTER_DIMENSIONS — filter dimension node IDs applicable to this node
//
// Node types: ROOT → CATEGORY → SUBCATEGORY → CONTENT_TYPE
//             (plus FILTER_DIMENSION: SOFTWARE, FORMAT, STYLE, USE_CASE, TAG)
//
// Filters/tags are NOT confused with navigable categories.

const FILTER_TYPES = new Set(['filter_family', 'tag', 'sort_mode', 'software', 'format', 'style', 'use_case']);

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const orgId = body.organization_id || user?.data?.organization_id || 'default';

    console.log(`[buildTaxonomyGraph] Starting for org ${orgId}`);

    // ─── 1. FETCH ALL TAXONOMY NODES ────────────────────────────────
    const nodes = await base44.asServiceRole.entities.EnvatoTaxonomyLedger
      .filter({ organization_id: orgId }).catch(() => []);
    console.log(`[buildTaxonomyGraph] ${nodes.length} nodes to graph`);

    if (nodes.length === 0) {
      return Response.json({ status: 'skipped', reason: 'No taxonomy nodes' });
    }

    // ─── 2. BUILD NODE INDEX ────────────────────────────────────────
    const nodeById = new Map<string, any>();
    for (const node of nodes) {
      nodeById.set(node.taxonomy_node_id, node);
    }

    // ─── 3. BUILD PARENT → CHILDREN MAP ──────────────────────────────
    const childrenMap = new Map<string, string[]>();
    for (const node of nodes) {
      const parentId = node.parent_node || node.parent_id;
      if (!parentId) continue;
      if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
      childrenMap.get(parentId)!.push(node.taxonomy_node_id);
    }

    // ─── 4. COMPUTE ANCESTORS FOR EACH NODE (BFS from root) ──────────
    const ancestorsMap = new Map<string, string[]>();
    const roots = nodes.filter(n => !n.parent_node && !n.parent_id);
    console.log(`[buildTaxonomyGraph] ${roots.length} root nodes`);

    // BFS to compute ancestors
    const queue: Array<{ id: string; ancestors: string[] }> = roots.map(r => ({ id: r.taxonomy_node_id, ancestors: [] }));
    while (queue.length > 0) {
      const { id, ancestors } = queue.shift()!;
      ancestorsMap.set(id, ancestors);
      const children = childrenMap.get(id) || [];
      for (const childId of children) {
        queue.push({ id: childId, ancestors: [...ancestors, id] });
      }
    }

    // ─── 5. COMPUTE FILTER DIMENSIONS FOR EACH CATEGORY ────────────
    // Filter dimensions are nodes of FILTER_TYPES that are children of a category
    const filterDimensionsMap = new Map<string, string[]>();
    for (const node of nodes) {
      if (!FILTER_TYPES.has(node.node_type)) continue;
      const parentId = node.parent_node || node.parent_id;
      if (!parentId) continue;
      if (!filterDimensionsMap.has(parentId)) filterDimensionsMap.set(parentId, []);
      filterDimensionsMap.get(parentId)!.push(node.taxonomy_node_id);
    }

    // ─── 6. COMPUTE SOURCE/CLONE ROUTES ────────────────────────────
    // For category/subcategory nodes, the source route is /<slug>
    // The clone route is /<slug>.html (or /<slug> via clean URLs)
    const routeMap = new Map<string, { source_route: string; clone_route: string }>();
    for (const node of nodes) {
      if (FILTER_TYPES.has(node.node_type)) continue;
      const slug = normalizeSlug(node.node_name);
      if (!slug) continue;
      if (node.node_type === 'root' || node.node_type === 'category') {
        routeMap.set(node.taxonomy_node_id, { source_route: '/' + slug, clone_route: '/' + slug });
      } else if (node.node_type === 'subcategory') {
        // Subcategory route: /<parent_slug>/<slug>
        const parentId = node.parent_node || node.parent_id;
        const parent = parentId ? nodeById.get(parentId) : null;
        const parentSlug = parent ? normalizeSlug(parent.node_name) : '';
        if (parentSlug) {
          routeMap.set(node.taxonomy_node_id, {
            source_route: '/' + parentSlug + '/' + slug,
            clone_route: '/' + parentSlug, // Clone uses category page with subcategory filter
          });
        } else {
          routeMap.set(node.taxonomy_node_id, { source_route: '/' + slug, clone_route: '/' + slug });
        }
      }
    }

    // ─── 7. PREPARE UPDATES ─────────────────────────────────────────
    const updates: Array<{ id: string; data: any }> = [];
    for (const node of nodes) {
      const nodeId = node.taxonomy_node_id;
      const parentId = node.parent_node || node.parent_id || '';
      const children = childrenMap.get(nodeId) || [];
      const ancestors = ancestorsMap.get(nodeId) || [];
      const filterDims = filterDimensionsMap.get(nodeId) || [];
      const routes = routeMap.get(nodeId);
      const slug = normalizeSlug(node.node_name);

      updates.push({
        id: node.id,
        data: {
          slug,
          parent_id: parentId || undefined,
          ancestors,
          children,
          filter_dimensions: filterDims,
          source_route: routes?.source_route || undefined,
          clone_route: routes?.clone_route || undefined,
        },
      });
    }

    // ─── 8. BULK UPDATE ─────────────────────────────────────────────
    let updatedCount = 0;
    const bulkPayload = updates.map(u => ({ id: u.id, ...u.data }));
    for (let i = 0; i < bulkPayload.length; i += 500) {
      const batch = bulkPayload.slice(i, i + 500);
      try {
        await base44.asServiceRole.entities.EnvatoTaxonomyLedger.bulkUpdate(batch);
        updatedCount += batch.length;
      } catch (e) {
        console.error(`[buildTaxonomyGraph] Bulk update failed: ${e.message}`);
        for (const item of batch) {
          try {
            await base44.asServiceRole.entities.EnvatoTaxonomyLedger.update(item.id, item);
            updatedCount++;
          } catch {}
        }
      }
    }

    // ─── 9. GRAPH STATISTICS ─────────────────────────────────────────
    const nodeTypeCounts: Record<string, number> = {};
    for (const n of nodes) {
      nodeTypeCounts[n.node_type] = (nodeTypeCounts[n.node_type] || 0) + 1;
    }
    const maxDepth = Math.max(...[...ancestorsMap.values()].map(a => a.length), 0);
    const totalEdges = [...childrenMap.values()].reduce((sum, children) => sum + children.length, 0);
    const categoriesWithRoutes = [...routeMap.keys()].length;
    const categoriesWithFilters = [...filterDimensionsMap.keys()].length;

    const result = {
      status: 'success',
      organization_id: orgId,
      total_nodes: nodes.length,
      nodes_updated: updatedCount,
      graph_stats: {
        total_edges: totalEdges,
        max_depth: maxDepth,
        root_count: roots.length,
        categories_with_routes: categoriesWithRoutes,
        categories_with_filter_dimensions: categoriesWithFilters,
      },
      node_type_distribution: nodeTypeCounts,
      message: `Built taxonomy graph: ${nodes.length} nodes, ${totalEdges} edges, max depth ${maxDepth}`,
    };

    console.log(`[buildTaxonomyGraph] ${result.message}`);
    return Response.json(result);
  } catch (error) {
    console.error('[buildTaxonomyGraph] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function normalizeSlug(name: string): string {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}