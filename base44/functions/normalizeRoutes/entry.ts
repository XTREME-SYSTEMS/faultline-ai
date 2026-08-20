import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Route Normalization — P1
// Converts raw discovered routes into canonical form by normalizing:
// trailing slash, query parameters, tracking parameters, locale prefixes,
// encoded characters, case, duplicate routes, redirect destinations,
// pagination states, search states, filter states.
//
// Stateful URLs (search, filter, pagination) are kept distinct ONLY when
// their state represents a meaningful product behavior; otherwise they
// collapse to their canonical content route.
//
// After normalization, re-runs the taxonomy match and persists:
// PRE_NORMALIZATION_MATCH_RATE and POST_NORMALIZATION_MATCH_RATE.

const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'msclkid', 'mc_cid', 'mc_eid', 'ref', 'referrer',
  '_ga', '_gl', 'si', 'source', 'campaign',
];

const LOCALE_PREFIXES = ['/en/', '/en-us/', '/en-gb/', '/au/', '/uk/', '/de/', '/fr/', '/es/', '/pt/', '/ja/', '/ko/', '/zh/', '/ru/'];

// Pagination patterns: /page/2, ?page=2, ?p=2, /p2
const PAGINATION_RE = /\/page\/\d+\/?$/i;
const SEARCH_PATH_RE = /^\/search\b/i;
const FILTER_QUERY_RE = /^(?:categories|tags|software|formats|styles|sort|order|price|type|platform|application|file_formats|colors|orientation|license|pro|free)=/i;

interface NormalizedRoute {
  raw_url: string;
  canonical_url: string;
  route_type: string;
  source_status: string;
  changed: boolean;
}

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const orgId = body.organization_id || user?.data?.organization_id || 'default';

    console.log(`[normalizeRoutes] Starting normalization for org ${orgId}`);

    // ─── 1. FETCH ALL ROUTES ─────────────────────────────────────────
    const routes = await base44.asServiceRole.entities.EnvatoPublicSurfaceManifest
      .filter({ organization_id: orgId }).catch(() => []);
    console.log(`[normalizeRoutes] ${routes.length} routes to normalize`);

    if (routes.length === 0) {
      return Response.json({ status: 'skipped', reason: 'No routes discovered' });
    }

    // ─── 2. FETCH TAXONOMY FOR PRE-NORMALIZATION MATCH RATE ─────────
    const taxonomy = await base44.asServiceRole.entities.EnvatoTaxonomyLedger
      .filter({ organization_id: orgId }).catch(() => []);
    const taxonomySlugs = new Set<string>();
    for (const t of taxonomy) {
      const slug = normalizeSlug(t.node_name);
      if (slug) taxonomySlugs.add(slug);
    }

    // Pre-normalization match rate
    const preContentRoutes = routes.filter(r => !isNonContentPageType(r.page_type));
    const preMatched = preContentRoutes.filter(r => {
      const slug = extractSlugFromPath(r.source_route);
      return slug && (taxonomySlugs.has(slug) || taxonomySlugs.has(slug.replace(/-/g, '')));
    });
    const preMatchRate = preContentRoutes.length > 0
      ? Math.round((preMatched.length / preContentRoutes.length) * 100) : 0;
    console.log(`[normalizeRoutes] Pre-normalization match rate: ${preMatchRate}%`);

    // ─── 3. NORMALIZE EACH ROUTE ────────────────────────────────────
    const updates: Array<{ id: string; data: any }> = [];
    const canonicalMap = new Map<string, string[]>(); // canonical → [ids]
    const normalizedResults: NormalizedRoute[] = [];

    for (const route of routes) {
      const raw = route.source_route || '';
      const normalized = normalizeUrl(raw);
      normalizedResults.push(normalized);

      const updateData: any = {
        raw_url: raw,
        canonical_url: normalized.canonical_url,
        route_type: normalized.route_type,
        source_status: normalized.source_status,
        normalized: true,
      };

      // If canonical changed, update source_route to canonical
      if (normalized.changed && normalized.canonical_url !== raw) {
        updateData.source_route = normalized.canonical_url;
      }

      updates.push({ id: route.id, data: updateData });

      // Track canonical → ids for dedup
      if (!canonicalMap.has(normalized.canonical_url)) {
        canonicalMap.set(normalized.canonical_url, []);
      }
      canonicalMap.get(normalized.canonical_url)!.push(route.id);
    }

    // ─── 4. BULK UPDATE ─────────────────────────────────────────────
    let updatedCount = 0;
    const bulkPayload = updates.map(u => ({ id: u.id, ...u.data }));
    for (let i = 0; i < bulkPayload.length; i += 500) {
      const batch = bulkPayload.slice(i, i + 500);
      try {
        await base44.asServiceRole.entities.EnvatoPublicSurfaceManifest.bulkUpdate(batch);
        updatedCount += batch.length;
      } catch (e) {
        console.error(`[normalizeRoutes] Bulk update failed at batch ${i}: ${e.message}`);
        for (const item of batch) {
          try {
            await base44.asServiceRole.entities.EnvatoPublicSurfaceManifest.update(item.id, item);
            updatedCount++;
          } catch {}
        }
      }
    }
    console.log(`[normalizeRoutes] Updated ${updatedCount} routes`);

    // ─── 5. RE-RUN TAXONOMY MATCH ON NORMALIZED ROUTES ──────────────
    // Re-fetch normalized routes
    const normalizedRoutes = await base44.asServiceRole.entities.EnvatoPublicSurfaceManifest
      .filter({ organization_id: orgId }).catch(() => []);

    const postContentRoutes = normalizedRoutes.filter(r =>
      !isNonContentPageType(r.page_type) && r.route_type === 'content'
    );
    const postMatched = postContentRoutes.filter(r => {
      const slug = extractSlugFromPath(r.canonical_url || r.source_route);
      return slug && (taxonomySlugs.has(slug) || taxonomySlugs.has(slug.replace(/-/g, '')));
    });
    const postMatchRate = postContentRoutes.length > 0
      ? Math.round((postMatched.length / postContentRoutes.length) * 100) : 0;
    console.log(`[normalizeRoutes] Post-normalization match rate: ${postMatchRate}%`);

    // ─── 6. DEDUP DUPLICATE CANONICAL ROUTES ─────────────────────────
    let duplicatesCollapsed = 0;
    const dedupUpdates: Array<{ id: string; data: any }> = [];
    for (const [canonical, ids] of canonicalMap) {
      if (ids.length > 1) {
        // Keep first, mark rest as aliases
        for (let i = 1; i < ids.length; i++) {
          dedupUpdates.push({
            id: ids[i],
            data: { route_type: 'alias', redirect_target: canonical },
          });
          duplicatesCollapsed++;
        }
      }
    }
    if (dedupUpdates.length > 0) {
      try {
        await base44.asServiceRole.entities.EnvatoPublicSurfaceManifest.bulkUpdate(dedupUpdates);
      } catch {}
    }

    // ─── 7. ROUTE TYPE DISTRIBUTION ─────────────────────────────────
    const typeDistribution: Record<string, number> = {};
    for (const r of normalizedResults) {
      typeDistribution[r.route_type] = (typeDistribution[r.route_type] || 0) + 1;
    }

    const result = {
      status: 'success',
      organization_id: orgId,
      total_routes: routes.length,
      routes_normalized: updatedCount,
      duplicates_collapsed: duplicatesCollapsed,
      pre_normalization_match_rate: preMatchRate,
      post_normalization_match_rate: postMatchRate,
      match_rate_delta: postMatchRate - preMatchRate,
      route_type_distribution: typeDistribution,
      content_routes: postContentRoutes.length,
      matched_content_routes: postMatched.length,
      unmatched_content_routes: postContentRoutes.length - postMatched.length,
      canonical_routes: canonicalMap.size,
    };

    console.log(`[normalizeRoutes] Complete: pre=${preMatchRate}% → post=${postMatchRate}% (${result.match_rate_delta >= 0 ? '+' : ''}${result.match_rate_delta}%)`);
    return Response.json(result);
  } catch (error) {
    console.error('[normalizeRoutes] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ─── NORMALIZATION LOGIC ──────────────────────────────────────────────
function normalizeUrl(rawUrl: string): NormalizedRoute {
  const raw = rawUrl || '';
  let canonical = raw;
  let routeType = 'content';
  let sourceStatus = 'ok';

  // 1. Strip locale prefixes
  for (const locale of LOCALE_PREFIXES) {
    if (canonical.toLowerCase().startsWith(locale)) {
      canonical = '/' + canonical.slice(locale.length);
      routeType = 'alias';
    }
  }

  // 2. Parse URL components
  let pathname = canonical;
  let search = '';
  const qIdx = canonical.indexOf('?');
  if (qIdx >= 0) {
    pathname = canonical.slice(0, qIdx);
    search = canonical.slice(qIdx + 1);
  }

  // 3. Decode encoded characters
  try {
    pathname = decodeURIComponent(pathname);
  } catch {}

  // 4. Lowercase the path (URLs are case-sensitive but Envato uses lowercase)
  pathname = pathname.toLowerCase();

  // 5. Strip tracking parameters from query
  if (search) {
    const params = new URLSearchParams(search);
    for (const tp of TRACKING_PARAMS) {
      params.delete(tp);
    }
    // Check remaining params for filter/search/pagination states
    const remainingKeys = [...params.keys()];
    if (remainingKeys.length > 0) {
      const hasFilter = remainingKeys.some(k => FILTER_QUERY_RE.test(k));
      const hasSearch = remainingKeys.includes('q') || remainingKeys.includes('query') || remainingKeys.includes('search');
      const hasPagination = remainingKeys.includes('page') || remainingKeys.includes('p');

      if (hasSearch) {
        routeType = 'search_state';
      } else if (hasPagination && !hasFilter) {
        routeType = 'pagination_state';
        params.delete('page');
        params.delete('p');
      } else if (hasFilter) {
        routeType = 'filter_state';
      }
    }
    const remaining = params.toString();
    search = remaining ? '?' + remaining : '';
  }

  // 6. Strip pagination from path (/page/2 → /)
  if (PAGINATION_RE.test(pathname)) {
    pathname = pathname.replace(PAGINATION_RE, '/');
    routeType = routeType === 'content' ? 'pagination_state' : routeType;
  }

  // 7. Strip trailing slash (except root)
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.replace(/\/+$/, '');
  }

  // 8. Normalize multiple slashes
  pathname = pathname.replace(/\/+/g, '/');

  // 9. Detect search paths
  if (SEARCH_PATH_RE.test(pathname)) {
    routeType = 'search_state';
  }

  // 10. Detect auth routes
  if (/^\/(sign-in|login|register|signup|account|logout|password)/i.test(pathname)) {
    routeType = 'auth';
  }

  // 11. Detect pricing routes
  if (/^\/(pricing|subscribe|plans)/i.test(pathname)) {
    routeType = 'pricing';
  }

  // 12. Detect utility routes
  if (/^\/(api|_next|_nuxt|static|assets|favicon|robots|sitemap|manifest|sw\.js)/i.test(pathname)) {
    routeType = 'utility';
  }

  // 13. Detect 404
  if (/\/(404|not-found|error)/i.test(pathname)) {
    routeType = 'source_404';
    sourceStatus = 'not_found';
  }

  canonical = pathname + search;
  const changed = canonical !== raw;

  return { raw_url: raw, canonical_url: canonical, route_type: routeType, source_status: sourceStatus, changed };
}

function isNonContentPageType(pageType: string): boolean {
  return ['homepage', 'auth', 'legal', 'help', 'pricing', 'search', 'other'].includes(pageType);
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