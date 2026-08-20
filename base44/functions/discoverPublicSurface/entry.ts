import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { createStealthSession, releaseSession, CDPClient } from '../../shared/stealthBrowser.ts';

// Public Surface Discovery — crawls the Envato source site via stealth browser
// to discover ALL public-facing routes (pages, categories, subcategories, AI tools,
// pricing, auth, etc.) and records them in EnvatoPublicSurfaceManifest.
//
// Discovery strategy: homepage → extract all links → classify by page type →
// BFS through category/subcategory pages → record each route with metadata.
// Runs in batches to stay within function timeout.

const SOURCE_URL = 'https://elements.envato.com';

const PAGE_TYPE_PATTERNS = [
  { pattern: /^\/$/, type: 'homepage' },
  { pattern: /^\/(graphic-templates|web-templates|app-templates|presentation-templates|design-templates|video-templates|stock-video|audio|graphics|photos|3d|fonts|addons|cms-templates)$/, type: 'category' },
  { pattern: /^\/(ai-tools|ai\/)/, type: 'ai_tool' },
  { pattern: /^\/(pricing|subscribe|plans)$/, type: 'pricing' },
  { pattern: /^\/(sign-in|login|register|signup|account)$/, type: 'auth' },
  { pattern: /^\/(all-items|search)$/, type: 'search' },
  { pattern: /^\/(help|support|faq)$/, type: 'help' },
  { pattern: /^\/(terms|privacy|refund|license|about|contact)$/, type: 'legal' },
];

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const orgId = body.organization_id || user?.data?.organization_id || 'default';
    const { max_routes = 30, batch_size = 8 } = body;

    console.log(`[discoverPublicSurface] Starting discovery: max ${max_routes} routes, batch ${batch_size}`);

    // Load existing discovered routes (service role to bypass RLS)
    const existing = await base44.asServiceRole.entities.EnvatoPublicSurfaceManifest
      .filter({ organization_id: orgId }).catch(() => []);
    const existingPaths = new Set(existing.map((e: any) => e.source_route));
    console.log(`[discoverPublicSurface] ${existingPaths.size} routes already discovered`);

    // ─── STEALTH BROWSER CRAWL ──────────────────────────────────────
    let session: { id: string; connectUrl: string } | null = null;
    let cdp: CDPClient | null = null;
    let cdpSessionId: string | null = null;
    const allDiscovered: any[] = [];

    try {
      session = await createStealthSession({
        deepRender: true, timeout: 25000, waitAfterLoad: 1500,
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

      // ─── CRAWL HOMEPAGE FIRST ────────────────────────────────────
      const homepageLinks = await crawlPage(cdp, cdpSessionId, SOURCE_URL, '/');
      console.log(`[discoverPublicSurface] Homepage: ${homepageLinks.length} links found`);

      // Filter out non-content routes (cookie consent, legal, etc.) and add
      // known category seeds to ensure we discover real content pages
      const EXCLUDE_PATTERNS = [/^\/cookies/i, /^\/privacy/i, /^\/legal/i, /^\/en\//i, /^\/cookiebot/i, /utm_/i];
      const KNOWN_CATEGORY_SEEDS = [
        '/graphic-templates', '/web-templates', '/app-templates', '/presentation-templates',
        '/design-templates', '/video-templates', '/stock-video', '/audio', '/graphics',
        '/photos', '/3d', '/fonts', '/addons', '/cms-templates', '/all-items',
        '/ai-tools', '/pricing', '/subscribe',
      ];

      const contentLinks = homepageLinks.filter(l =>
        l.startsWith('/') &&
        !existingPaths.has(l) &&
        !EXCLUDE_PATTERNS.some(p => p.test(l))
      );

      // Seed with known categories — put them FIRST so they're crawled before
      // any non-content links from the homepage
      const seedLinks: string[] = [];
      for (const seed of KNOWN_CATEGORY_SEEDS) {
        if (!existingPaths.has(seed) && !contentLinks.includes(seed)) {
          seedLinks.push(seed);
        }
      }

      // ─── BFS THROUGH DISCOVERED LINKS ────────────────────────────
      // Known seeds first, then homepage-discovered content links
      const queue: string[] = [...seedLinks, ...contentLinks].slice(0, max_routes);

      const crawled = new Set<string>();
      let batchCount = 0;

      while (queue.length > 0 && allDiscovered.length < max_routes && batchCount < batch_size) {
        const route = queue.shift()!;
        if (crawled.has(route) || existingPaths.has(route)) continue;
        crawled.add(route);

        try {
          const links = await crawlPage(cdp, cdpSessionId, SOURCE_URL, route);
          const pageType = classifyPageType(route);
          const title = await getPageTitle(cdp, cdpSessionId);
          const valid = await isPageValid(cdp, cdpSessionId);

          const manifestEntry: any = {
            organization_id: orgId,
            source_route: route,
            page_type: pageType,
            title: title || route,
            discovery_source: route === '/' ? 'header' : 'navigation',
            valid,
            http_state: valid ? 200 : 404,
            page_state: valid ? 'rendered' : '404',
            outbound_internal_routes: links.filter(l => l.startsWith('/')).slice(0, 50),
            observed_components: [],
            observed_interactions: [],
            clone_status: 'missing',
            discovered_at: new Date().toISOString(),
          };

          const saved = await base44.asServiceRole.entities.EnvatoPublicSurfaceManifest.create(manifestEntry);
          allDiscovered.push(saved);
          existingPaths.add(route);

          // Add new links to queue
          for (const link of links) {
            if (link.startsWith('/') && !crawled.has(link) && !existingPaths.has(link) && queue.length < max_routes * 2) {
              queue.push(link);
            }
          }

          console.log(`[discoverPublicSurface] ✓ ${route} (${pageType}, ${valid ? 'valid' : 'invalid'}, ${links.length} links)`);
        } catch (e) {
          console.log(`[discoverPublicSurface] ✗ ${route}: ${e.message}`);
        }

        batchCount++;
      }
    } finally {
      if (cdp) await cdp.close().catch(() => {});
      if (session) await releaseSession(session.id);
    }

    // ─── CLASSIFY ROUTE TYPES ───────────────────────────────────────
    const routeTypes: Record<string, number> = {};
    for (const d of allDiscovered) {
      routeTypes[d.page_type] = (routeTypes[d.page_type] || 0) + 1;
    }

    const validRoutes = allDiscovered.filter(d => d.valid);
    const invalidRoutes = allDiscovered.filter(d => !d.valid);

    console.log(`[discoverPublicSurface] Complete: ${allDiscovered.length} discovered, ${validRoutes.length} valid, ${invalidRoutes.length} invalid`);

    return Response.json({
      status: 'success',
      total_routes_discovered: allDiscovered.length,
      valid_routes: validRoutes.length,
      invalid_routes: invalidRoutes.length,
      route_types: routeTypes,
      routes: allDiscovered.map(d => ({
        route: d.source_route,
        type: d.page_type,
        valid: d.valid,
        title: d.title,
        clone_status: d.clone_status,
      })),
    });
  } catch (error) {
    console.error('[discoverPublicSurface] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ─── CRAWL A SINGLE PAGE ─────────────────────────────────────────────
async function crawlPage(cdp: CDPClient, sessionId: string, baseUrl: string, path: string): Promise<string[]> {
  const url = path === '/' ? baseUrl : baseUrl + path;

  await cdp.send('Page.navigate', { url }, sessionId, 20000);
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    cdp!.on('Page.loadEventFired', finish);
    setTimeout(finish, 8000);
  });
  await new Promise(r => setTimeout(r, 1500));

  // Scroll to trigger lazy content
  try {
    await cdp.send('Runtime.evaluate', {
      expression: `(async()=>{var h=document.body.scrollHeight;for(var y=0;y<Math.min(h,3000);y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,100));}window.scrollTo(0,0);})()`,
      returnByValue: true, awaitPromise: true,
    }, sessionId, 5000);
  } catch {}

  // Extract all links
  const linksResult = await cdp.send('Runtime.evaluate', {
    expression: `JSON.stringify(Array.from(document.querySelectorAll('a[href]')).map(a=>{try{var u=new URL(a.href);return u.pathname+u.search}catch(e){return a.getAttribute('href')}}).filter(h=>h&&h.startsWith('/')).filter((v,i,a)=>a.indexOf(v)===i).slice(0,200))`,
    returnByValue: true,
  }, sessionId);

  const links: string[] = JSON.parse(linksResult?.result?.value || '[]');
  return links;
}

async function getPageTitle(cdp: CDPClient, sessionId: string): Promise<string> {
  try {
    const result = await cdp.send('Runtime.evaluate', {
      expression: 'document.title', returnByValue: true,
    }, sessionId);
    return result?.result?.value || '';
  } catch { return ''; }
}

async function isPageValid(cdp: CDPClient, sessionId: string): Promise<boolean> {
  try {
    const result = await cdp.send('Runtime.evaluate', {
      expression: `document.title && !document.title.includes('404') && !document.title.includes('Not Found') && document.body && document.body.innerText.length > 100`,
      returnByValue: true,
    }, sessionId);
    return result?.result?.value || false;
  } catch { return false; }
}

function classifyPageType(route: string): string {
  for (const { pattern, type } of PAGE_TYPE_PATTERNS) {
    if (pattern.test(route)) return type;
  }
  // Subcategory: /category/subcategory
  if (route.split('/').length === 3 && !route.endsWith('/')) return 'subcategory';
  return 'other';
}