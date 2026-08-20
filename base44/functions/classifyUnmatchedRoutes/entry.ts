import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { createStealthSession, releaseSession, CDPClient } from '../../shared/stealthBrowser.ts';

// Classify Unmatched Routes — P2
//
// For every unmatched content route, uses Browserbase to inspect:
//   title, H1, breadcrumbs, navigation context, URL structure,
//   page semantic type, parent route, outbound category links,
//   visible filters, content type.
//
// Classifies each as:
//   MISSING_TAXONOMY_MAPPING  — only this creates a new taxonomy mapping
//   DYNAMIC_ITEM_DETAIL       — product/item detail page (not a taxonomy gap)
//   SEARCH_STATE              — search results page with query state
//   FILTER_STATE              — category page with active filters
//   PAGINATION_STATE          — paginated category page
//   ALIAS                     — redirects to or duplicates another route
//   REDIRECT                  — HTTP redirect to another route
//   UTILITY_ROUTE             — API, static asset, internal utility
//   AUTH_ROUTE                — login/register/account
//   PRICING_ROUTE             — pricing/subscribe
//   SOURCE_404                — source returns 404
//   INVALID_ROUTE             — malformed or broken URL
//   OTHER_WITH_EVIDENCE       — doesn't fit above, with evidence captured
//
// Does NOT pollute taxonomy with utility/auth/search-state routes.

const SOURCE_URL = 'https://elements.envato.com';
const MAX_ROUTES_PER_BATCH = 10;

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const orgId = body.organization_id || user?.data?.organization_id || 'default';
    const maxRoutes = body.max_routes || MAX_ROUTES_PER_BATCH;

    console.log(`[classifyUnmatchedRoutes] Starting for org ${orgId}`);

    // ─── 1. FETCH UNMATCHED CONTENT ROUTES ──────────────────────────
    const routes = await base44.asServiceRole.entities.EnvatoPublicSurfaceManifest
      .filter({ organization_id: orgId, taxonomy_validation_status: 'no_taxonomy_match' })
      .catch(() => []);

    const unmatchedContent = routes.filter(r =>
      r.route_type === 'content' && r.valid !== false
    );
    console.log(`[classifyUnmatchedRoutes] ${unmatchedContent.length} unmatched content routes to classify`);

    if (unmatchedContent.length === 0) {
      return Response.json({ status: 'success', message: 'No unmatched content routes to classify' });
    }

    const toClassify = unmatchedContent.slice(0, maxRoutes);

    // ─── 2. STEALTH BROWSER INSPECTION ──────────────────────────────
    let session: { id: string; connectUrl: string } | null = null;
    let cdp: CDPClient | null = null;
    let cdpSessionId: string | null = null;
    const results: any[] = [];

    try {
      session = await createStealthSession({
        deepRender: true, timeout: 20000, waitAfterLoad: 1000,
        solveCaptchas: true, proxies: true,
      });
      cdp = new CDPClient();
      await cdp.connect(session.connectUrl);
      const { targetInfos } = await cdp.send('Target.getTargets');
      const pageTarget = targetInfos.find((t: any) => t.type === 'page') || targetInfos[0];
      const attach = await cdp.send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
      cdpSessionId = attach.sessionId;
      await cdp.send('Page.enable', {}, cdpSessionId);
      await cdp.send('Runtime.enable', {}, cdpSessionId);

      for (const route of toClassify) {
        const url = SOURCE_URL + route.source_route;
        console.log(`[classifyUnmatchedRoutes] Inspecting ${route.source_route}`);

        try {
          const classification = await inspectAndClassify(cdp!, cdpSessionId!, url, route);
          results.push({ route_id: route.id, route: route.source_route, ...classification });

          // Update the route record
          await base44.asServiceRole.entities.EnvatoPublicSurfaceManifest.update(route.id, {
            unmatched_classification: classification.classification,
            classification_evidence: classification.evidence,
            route_type: classification.route_type_override || route.route_type,
          });
        } catch (e) {
          console.log(`[classifyUnmatchedRoutes] ✗ ${route.source_route}: ${e.message}`);
          results.push({ route_id: route.id, route: route.source_route, classification: 'other_with_evidence', evidence: `Inspection failed: ${e.message}` });
        }
      }
    } finally {
      if (cdp) await cdp.close().catch(() => {});
      if (session) await releaseSession(session.id);
    }

    // ─── 3. AGGREGATE CLASSIFICATION RESULTS ───────────────────────
    const classificationCounts: Record<string, number> = {};
    for (const r of results) {
      classificationCounts[r.classification] = (classificationCounts[r.classification] || 0) + 1;
    }

    // Only MISSING_TAXONOMY_MAPPING routes should create new taxonomy entries
    const newTaxonomyMappings = results.filter(r => r.classification === 'missing_taxonomy_mapping');

    const result = {
      status: 'success',
      organization_id: orgId,
      total_unmatched: unmatchedContent.length,
      classified: results.length,
      classification_distribution: classificationCounts,
      new_taxonomy_mappings_needed: newTaxonomyMappings.length,
      classified_routes: results.map(r => ({
        route: r.route,
        classification: r.classification,
        evidence: r.evidence?.slice(0, 200),
      })),
      message: `Classified ${results.length} unmatched routes: ${newTaxonomyMappings.length} need new taxonomy mappings, ${results.length - newTaxonomyMappings.length} are non-taxonomy route types`,
    };

    console.log(`[classifyUnmatchedRoutes] ${result.message}`);
    return Response.json(result);
  } catch (error) {
    console.error('[classifyUnmatchedRoutes] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ─── INSPECT AND CLASSIFY A SINGLE ROUTE ─────────────────────────────
async function inspectAndClassify(cdp: CDPClient, sessionId: string, url: string, route: any): Promise<any> {
  // Navigate to the route
  await cdp.send('Page.navigate', { url }, sessionId, 15000);
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    cdp!.on('Page.loadEventFired', finish);
    setTimeout(finish, 8000);
  });
  await new Promise(r => setTimeout(r, 1500));

  // Extract page metadata
  const inspectResult = await cdp.send('Runtime.evaluate', {
    expression: `JSON.stringify({
      title: document.title || '',
      h1: (document.querySelector('h1') || {}).innerText || '',
      breadcrumbs: Array.from(document.querySelectorAll('[class*="breadcrumb"], [class*="Breadcrumb"], nav[aria-label="breadcrumb"] a, [data-testid*="breadcrumb"]')).map(e => e.innerText.trim()).filter(Boolean).slice(0, 5),
      url: window.location.href,
      statusCode: document.querySelector('[class*="error"], [class*="not-found"]') ? 404 : 200,
      hasFilters: !!document.querySelector('[class*="filter"], [data-testid*="filter"], [role="checkbox"], [role="radio"]'),
      hasSearch: !!document.querySelector('input[type="search"], [class*="search-input"]'),
      hasItemDetail: !!document.querySelector('[class*="item-detail"], [class*="product-detail"], [data-testid*="item"]'),
      hasCategoryGrid: !!document.querySelector('[class*="grid"], [class*="card-grid"], [data-testid*="card"]'),
      outboundLinks: Array.from(document.querySelectorAll('a[href]')).map(a => { try { return new URL(a.href).pathname } catch { return '' } }).filter(p => p.startsWith('/') && p.split('/').length <= 3).filter((v,i,a) => a.indexOf(v) === i).slice(0, 10),
      bodyText: document.body ? document.body.innerText.slice(0, 500) : ''
    })`,
    returnByValue: true,
  }, sessionId);

  const data = JSON.parse(inspectResult?.result?.value || '{}');

  // ─── CLASSIFICATION LOGIC ───────────────────────────────────────
  const path = route.source_route;
  const title = (data.title || '').toLowerCase();
  const h1 = (data.h1 || '').toLowerCase();
  const breadcrumbs = data.breadcrumbs || [];
  const bodyText = (data.bodyText || '').toLowerCase();

  // SOURCE_404
  if (data.statusCode === 404 || title.includes('404') || title.includes('not found') || title.includes('page not found')) {
    return { classification: 'source_404', evidence: `Title: "${data.title}", 404 indicator detected`, route_type_override: 'source_404' };
  }

  // AUTH_ROUTE
  if (/^\/(sign-in|login|register|signup|account|logout|password)/i.test(path) || title.includes('sign in') || title.includes('log in') || title.includes('create account')) {
    return { classification: 'auth_route', evidence: `Auth route detected: title="${data.title}", path=${path}`, route_type_override: 'auth' };
  }

  // PRICING_ROUTE
  if (/^\/(pricing|subscribe|plans)/i.test(path) || title.includes('pricing') || title.includes('subscription') || title.includes('plans')) {
    return { classification: 'pricing_route', evidence: `Pricing route: title="${data.title}", path=${path}`, route_type_override: 'pricing' };
  }

  // UTILITY_ROUTE
  if (/^\/(api|_next|_nuxt|static|assets|favicon|robots|sitemap|manifest)/i.test(path)) {
    return { classification: 'utility_route', evidence: `Utility route path: ${path}`, route_type_override: 'utility' };
  }

  // SEARCH_STATE
  if (data.hasSearch || path.includes('/search') || path.includes('?q=') || path.includes('?query=')) {
    return { classification: 'search_state', evidence: `Search state: hasSearch=${data.hasSearch}, path=${path}`, route_type_override: 'search_state' };
  }

  // DYNAMIC_ITEM_DETAIL — product/item detail pages
  if (data.hasItemDetail || (/\/[a-z0-9]{10,}$/i.test(path) && !data.hasCategoryGrid)) {
    return { classification: 'dynamic_item_detail', evidence: `Item detail page: hasItemDetail=${data.hasItemDetail}, path=${path}`, route_type_override: 'content' };
  }

  // FILTER_STATE — category page with active filters
  if (data.hasFilters && data.hasCategoryGrid && path.includes('?')) {
    return { classification: 'filter_state', evidence: `Filter state: hasFilters=${data.hasFilters}, hasCategoryGrid=${data.hasCategoryGrid}`, route_type_override: 'filter_state' };
  }

  // PAGINATION_STATE
  if (/\/page\/\d+/.test(path) || path.includes('?page=') || path.includes('?p=')) {
    return { classification: 'pagination_state', evidence: `Pagination state: path=${path}`, route_type_override: 'pagination_state' };
  }

  // MISSING_TAXONOMY_MAPPING — has category grid and breadcrumbs but no taxonomy match
  if (data.hasCategoryGrid && breadcrumbs.length > 0) {
    return {
      classification: 'missing_taxonomy_mapping',
      evidence: `Category page with grid and breadcrumbs. Title: "${data.title}", H1: "${data.h1}", Breadcrumbs: ${breadcrumbs.join(' > ')}. Outbound: ${data.outboundLinks?.slice(0, 5).join(', ')}`,
      route_type_override: 'content',
      breadcrumbs,
      outbound_links: data.outboundLinks,
    };
  }

  // ALIAS / REDIRECT
  if (data.url && data.url !== url && !data.url.includes(url)) {
    return { classification: 'redirect', evidence: `Redirected from ${url} to ${data.url}`, route_type_override: 'redirect' };
  }

  // OTHER_WITH_EVIDENCE
  return {
    classification: 'other_with_evidence',
    evidence: `Unclassified. Title: "${data.title}", H1: "${data.h1}", Body: "${data.bodyText?.slice(0, 200)}", Path: ${path}`,
    route_type_override: 'other_with_evidence',
  };
}