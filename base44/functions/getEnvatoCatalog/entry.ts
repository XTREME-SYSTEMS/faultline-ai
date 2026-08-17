import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Public catalog API for cloned Envato sites.
// Supports: browse by category, search, filter by software, pagination,
// single asset lookup, and featured/trending feeds.
// Uses service role so anonymous visitors on the cloned site can browse.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'browse';
    const category = url.searchParams.get('category');
    const q = url.searchParams.get('q');
    const software = url.searchParams.get('software');
    const assetId = url.searchParams.get('asset_id');
    const featured = url.searchParams.get('featured') === 'true';
    const trending = url.searchParams.get('trending') === 'true';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // ─── SINGLE ASSET ─────────────────────────────────────────────
    if (action === 'get' && assetId) {
      const asset = await base44.asServiceRole.entities.EnvatoAsset.get(assetId);
      if (!asset) return Response.json({ error: 'Asset not found' }, { status: 404, headers: CORS });
      // Increment views
      await base44.asServiceRole.entities.EnvatoAsset.update(assetId, {
        views_count: (asset.views_count || 0) + 1,
      }).catch(() => {});
      return Response.json({ asset: stripAsset(asset) }, { headers: CORS });
    }

    // ─── CATEGORIES (taxonomy tree) ───────────────────────────────
    if (action === 'categories') {
      const all = await base44.asServiceRole.entities.EnvatoAsset.list('-created_date', 1000);
      const tree: Record<string, { count: number; subcategories: Record<string, number> }> = {};
      for (const a of all || []) {
        if (a.status !== 'published') continue;
        if (!tree[a.category]) tree[a.category] = { count: 0, subcategories: {} };
        tree[a.category].count++;
        const sub = a.subcategory || 'Other';
        tree[a.category].subcategories[sub] = (tree[a.category].subcategories[sub] || 0) + 1;
      }
      return Response.json({ categories: tree, total: (all || []).length }, { headers: CORS });
    }

    // ─── BROWSE / SEARCH / FILTER ─────────────────────────────────
    // Use entity filter for DB-level category/status queries (fast, indexed),
    // then apply text search / software / featured in-memory.
    let assets: any[];

    if (category) {
      // DB-level filter — fetches all assets in this category
      assets = await base44.asServiceRole.entities.EnvatoAsset.filter(
        { category, status: 'published' },
        '-downloads_count',
        500
      );
    } else if (featured || trending) {
      // Fetch a larger batch for featured/trending feeds
      assets = await base44.asServiceRole.entities.EnvatoAsset.filter(
        { status: 'published' },
        '-downloads_count',
        500
      );
    } else {
      // General browse — fetch enough to paginate
      const fetchLimit = (q || software) ? 500 : Math.min(limit + offset + 100, 500);
      assets = await base44.asServiceRole.entities.EnvatoAsset.filter(
        { status: 'published' },
        '-downloads_count',
        fetchLimit
      );
    }

    let filtered = (assets || []).filter((a) => a.status === 'published');

    if (featured) filtered = filtered.filter((a) => a.featured);
    if (trending) filtered = filtered.filter((a) => a.trending);
    if (software) {
      filtered = filtered.filter((a) =>
        (a.software || []).some((s: string) => s.toLowerCase().includes(software.toLowerCase()))
      );
    }
    if (q) {
      const ql = q.toLowerCase();
      filtered = filtered.filter((a) =>
        (a.name || '').toLowerCase().includes(ql) ||
        (a.description || '').toLowerCase().includes(ql) ||
        (a.tags || []).some((t: string) => t.toLowerCase().includes(ql)) ||
        (a.subcategory || '').toLowerCase().includes(ql)
      );
    }

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    return Response.json({
      assets: paged.map(stripAsset),
      total,
      offset,
      limit,
      has_more: offset + limit < total,
      filters: { category, q, software, featured, trending },
    }, { headers: CORS });
  } catch (e) {
    console.error('getEnvatoCatalog error:', e.message);
    return Response.json({ error: e.message }, { status: 500, headers: CORS });
  }
}

function stripAsset(a: any) {
  return {
    id: a.id,
    asset_id: a.asset_id,
    name: a.name,
    description: a.description,
    category: a.category,
    subcategory: a.subcategory,
    asset_type: a.asset_type,
    software: a.software || [],
    thumbnail_url: a.thumbnail_url,
    preview_url: a.preview_url,
    file_format: a.file_format,
    file_size_mb: a.file_size_mb,
    tags: a.tags || [],
    author: a.author,
    license_type: a.license_type,
    price: a.price || 0,
    downloads_count: a.downloads_count || 0,
    rating: a.rating || 0,
    rating_count: a.rating_count || 0,
    featured: a.featured,
    trending: a.trending,
    published_at: a.published_at,
    // NOTE: file_url is NOT exposed publicly — only via getAssetDownload after license verification
  };
}