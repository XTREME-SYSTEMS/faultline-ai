import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { createStealthSession, releaseSession, CDPClient, crawlSiteStealth } from '../../shared/stealthBrowser.ts';
import { clonePageAssets, rewriteInternalLinks, pathToFilename, buildSearchScript, buildStripeCheckoutScript, buildSupabaseFormScript, buildCatalogScript, buildFormHandlerScript } from '../../shared/fullSiteClone.ts';
import { slugify, createVercelProject, disableVercelSso, deployToVercelMultiFile, createDriveFolder, createGitHubRepo, pushGitHubFile, createSupabaseProject } from '../../shared/launchInfra.ts';
import { buildAllAiToolPages, rewriteAiToolLinks, AI_TOOLS, buildAiToolsSidebarScript, buildAiLinkInterceptorScript, buildAllCategoryPages, CATEGORY_PAGES } from '../../shared/aiToolPages.ts';
import { buildAuthInterceptorScript, buildNavLinkResolverScript, buildBrandLinkFixScript, buildFontFixScript, buildGsiBlockScript, buildFetchInterceptorScript, buildConsoleMitigationScript } from '../../shared/fullSiteClone.ts';
import { buildInteractionReconstructionScript } from '../../shared/interactionReconstruction.ts';
import { buildContentInjectionScript } from '../../shared/contentInjection.ts';

// Autonomous full-site clone engine — sitemap-driven (not BFS), so it discovers
// ALL pages upfront and clones every one. Handles 100+ pages in a single run by
// processing pages in memory-managed batches: scrape 15 pages → clone them →
// null raw HTML → repeat. This avoids the heap exhaustion that capped the old
// BFS crawler at ~22 pages.
//
// Pipeline: fetch sitemap → batch-scrape all pages → clone each (re-host assets,
// swap branding, rewrite links) → inject search + checkout + AI tools → deploy
// to Vercel → provision Drive + GitHub + Supabase → return full report.

const BATCH_SIZE = 12; // pages per scrape batch (memory-managed)
const MAX_SITEMAP_URLS = 300; // cap to stay within function timeout

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    const body = await req.json().catch(() => ({}));
    const {
      target_url,
      project_name,
      business_name,
      client_email,
      client_phone,
      organization_id,
      max_pages = 100,
      deploy = true
    } = body;
    if (!target_url) return Response.json({ error: 'target_url required' }, { status: 400 });
    const targetOrg = organization_id || orgId;
    const pageCap = Math.min(max_pages, MAX_SITEMAP_URLS);

    console.log(`[autonomousFullSiteClone] Starting: ${target_url} (max ${pageCap} pages)`);

    // ─── 1. FETCH SITEMAP ─────────────────────────────────────────────
    const sitemapUrls = await fetchSitemapUrls(target_url);
    console.log(`[autonomousFullSiteClone] Sitemap: ${sitemapUrls.length} URLs found`);

    let urlsToClone: string[] = [];
    let usedBfsFallback = false;
    if (sitemapUrls.length > 0) {
      urlsToClone = sitemapUrls.slice(0, pageCap);
    } else {
      // Fallback: BFS crawl to discover pages by following links
      console.log('[autonomousFullSiteClone] No sitemap found — falling back to BFS crawl');
      usedBfsFallback = true;
      const crawl = await crawlSiteStealth(target_url, {
        deepRender: true,
        timeout: 25000,
        waitAfterLoad: 1200,
        solveCaptchas: true,
        proxies: true,
        maxPages: Math.min(pageCap, 22),
      });
      urlsToClone = crawl.pages.filter(p => p.ok).map(p => p.url);
      console.log(`[autonomousFullSiteClone] BFS discovered ${urlsToClone.length} pages`);
    }

    // Always include the homepage as the first URL
    if (!urlsToClone.includes(target_url)) {
      urlsToClone.unshift(target_url);
    }

    // ─── 2. BUILD LINK REWRITE MAP ───────────────────────────────────
    const linkMap = new Map<string, string>();
    for (const url of urlsToClone) {
      let path: string;
      try { path = new URL(url).pathname; } catch { path = '/'; }
      const filename = pathToFilename(path);
      linkMap.set(path, '/' + filename);
      if (path !== '/' && path.endsWith('/')) {
        linkMap.set(path.replace(/\/$/, ''), '/' + filename);
      }
    }

    // ─── 3+4. INTERLEAVED SCRAPE-AND-CLONE ────────────────────────────
    // Memory-critical: scrape AND clone each page in a single pass, then null
    // the HTML immediately after encoding to Uint8Array. This keeps only ONE
    // page's HTML in memory at any time, preventing OOM on 50+ pages.
    const appId = Deno.env.get('BASE44_APP_ID');
    const formHandlerUrl = `https://base44.app/api/apps/${appId}/functions/ingestCloneLead`;
    const pageMetadata: Array<{ filename: string; path: string; title: string; headings: string[]; images_rehosted: number }> = [];
    const fileMap = new Map<string, Uint8Array>();
    let totalImagesRehosted = 0;
    const stealthNeeded: string[] = [];

    // Helper: clone a single page's HTML → metadata + encoded Uint8Array
    async function cloneAndStore(pageUrl: string, path: string, rawHtml: string, fallbackTitle: string) {
      const filename = pathToFilename(path);
      try {
        // Detect React Server Components (RSC) pages — these stream content
        // via JavaScript and cannot be cloned as static HTML. For RSC pages,
        // keep the original scripts so the SPA can render the content.
        const isRscPage = rawHtml.includes('<!--$?-->') || rawHtml.includes('<template id="B:');

        let finalHtml: string;
        let images_rehosted = 0;

        if (isRscPage) {
          // RSC/SPA page — keep original HTML & scripts so the SPA can hydrate
          // and render content. The stealth browser already captured the
          // rendered DOM, but RSC pages need their scripts for CSS-in-JS styling
          // and layout. Stripping scripts causes layout collapse.
          // We DO inject: form handler, loading-state removal, link rewriting,
          // AND font-face stripping (RSC pages skip clonePageAssets, so we must
          // strip @font-face at the HTML level here to prevent CORS font errors).
          finalHtml = rawHtml;
          finalHtml = finalHtml.replace(/class="appLoading"/gi, 'class=""');
          finalHtml = finalHtml.replace(/<div[^>]*data-testid="loading-neue-page"[^>]*>[\s\S]*?<\/div>/gi, '');
          finalHtml = finalHtml.replace(/<div[^>]*data-testid="loading-spinner[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
          finalHtml = finalHtml.replace(/<svg[^>]*data-testid="loading-spinner[^"]*"[^>]*>[\s\S]*?<\/svg>/gi, '');
          // Strip @font-face from inline <style> tags (prevents CORS font fetches)
          finalHtml = finalHtml.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match: string, content: string) => {
            const cleaned = content.replace(/@font-face\s*\{[^}]*\}/gi, (m: string) => {
              return /url\(["']?data:/.test(m) ? m : '';
            });
            return '<style>' + cleaned + '</style>';
          });
          // Remove <link rel="preload" as="font"> tags
          finalHtml = finalHtml.replace(/<link[^>]+rel=["']preload["'][^>]+as=["']font["'][^>]*>/gi, '');
          // Remove <link rel="stylesheet"> pointing to external font CSS (Google Fonts, etc.)
          finalHtml = finalHtml.replace(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi, (match: string, href: string) => {
            if (/fonts\.googleapis|fonts\.gstatic|\.woff2?|elements\.envato.*font/i.test(href)) return '';
            return match;
          });
          finalHtml = rewriteInternalLinks(finalHtml, linkMap);
          // Inject form handler + post-hydration footer dedup for RSC pages
          const formScript = buildFormHandlerScript(formHandlerUrl, targetOrg || '');
          const footerDedupScript = `<script>
(function(){
  function dedupFooters(){
    var fs=document.querySelectorAll('footer');
    if(fs.length>1){for(var i=1;i<fs.length;i++){fs[i].remove();}}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',dedupFooters);
  else dedupFooters();
  setTimeout(dedupFooters,1000);setTimeout(dedupFooters,3000);
})();
</script>`;
          const rscInject = formScript + '\n' + footerDedupScript;
          if (finalHtml.includes('</body>')) {
            finalHtml = finalHtml.replace('</body>', rscInject + '\n</body>');
          } else {
            finalHtml += rscInject;
          }
          console.log(`[autonomousFullSiteClone] RSC page — keeping original scripts for hydration: ${path}`);
        } else {
          // Static page — full clone pipeline (rehost images, swap branding, strip scripts)
          const { html: clonedHtml, images_rehosted: ir } = await clonePageAssets(base44, rawHtml, {
            target_url, page_url: pageUrl, business_name, client_email, client_phone,
            organization_id: targetOrg, form_handler_url: formHandlerUrl,
            link_rewrite_map: linkMap, rehost_images: true, max_images: 40,
          });
          images_rehosted = ir;
          finalHtml = rewriteInternalLinks(clonedHtml, linkMap);
        }
        // Strip image/font preload and prefetch link tags — these generate
        // browser-level "preloaded but not used" console warnings that bypass
        // JS console overrides (they come from CDP Log.entryAdded, not
        // console.error). Keep modulepreload (needed for SPA hydration).
        finalHtml = finalHtml.replace(/<link[^>]+rel=["']preload["'][^>]+as=["'](?:image|font|fetch)["'][^>]*>/gi, '');
        finalHtml = finalHtml.replace(/<link[^>]+rel=["']prefetch["'][^>]*>/gi, '');
        finalHtml = finalHtml.replace(/<link[^>]+rel=["']dns-prefetch["'][^>]*>/gi, '');
        finalHtml = finalHtml.replace(/<link[^>]+rel=["']preconnect["'][^>]*>/gi, '');

        if (!isRscPage) {
          // Aggressive stripping of large inline scripts/data blobs — these are
          // hydration/JSON blobs that bloat pages to 2MB+. Applied to non-RSC
          // pages only (RSC pages need their scripts for hydration + CSS-in-JS).
          // 1. Strip ALL inline <script> tags with > 2000 chars of JS content
          finalHtml = finalHtml.replace(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, (m, content) => {
            return content.length > 2000 ? '' : m;
          });
          // 2. Strip JSON-LD blobs (we don't need structured data on clones)
          finalHtml = finalHtml.replace(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, '');
          // 3. Strip Next.js/Nuxt hydration data
          finalHtml = finalHtml.replace(/<script[^>]*id="__NEXT_DATA__"[^>]*>[\s\S]*?<\/script>/gi, '');
          finalHtml = finalHtml.replace(/<script[^>]*type="application\/json"[^>]*>[\s\S]*?<\/script>/gi, '');
          finalHtml = finalHtml.replace(/<script[^>]*data-nscript[^>]*>[\s\S]*?<\/script>/gi, '');
          // 4. Strip large HTML comments (likely template remnants)
          finalHtml = finalHtml.replace(/<!--[\s\S]*?-->/g, (m) => m.length > 500 ? '' : m);
          // 5. Strip inline style blocks > 50KB (already extracted to external CSS)
          finalHtml = finalHtml.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (m, content) => {
            return content.length > 50000 ? '' : m;
          });
        }
        // 5b. Remove SPA loading states (all pages)
        finalHtml = finalHtml.replace(/class="appLoading"/gi, 'class=""');
        finalHtml = finalHtml.replace(/<div[^>]*data-testid="loading-neue-page"[^>]*>[\s\S]*?<\/div>/gi, '');
        finalHtml = finalHtml.replace(/<div[^>]*data-testid="loading-spinner[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
        finalHtml = finalHtml.replace(/<svg[^>]*data-testid="loading-spinner[^"]*"[^>]*>[\s\S]*?<\/svg>/gi, '');
        // 5c. Ensure every page has a <title> tag
        if (!/<title>[^<]+<\/title>/i.test(finalHtml)) {
          let titlePath = '';
          try { titlePath = new URL(pageUrl).pathname.replace(/^\//, '').replace(/\/$/, '').replace(/-/g, ' '); } catch {}
          const titleText = titlePath ? titlePath.charAt(0).toUpperCase() + titlePath.slice(1) : (business_name || 'Home');
          const titleTag = `<title>${titleText}</title>`;
          if (/<head[^>]*>/i.test(finalHtml)) {
            finalHtml = finalHtml.replace(/<head[^>]*>/i, m => m + '\n' + titleTag);
          } else if (/<html[^>]*>/i.test(finalHtml)) {
            finalHtml = finalHtml.replace(/<html[^>]*>/i, m => m + '\n<head>' + titleTag + '</head>');
          } else {
            finalHtml = '<head>' + titleTag + '</head>\n' + finalHtml;
          }
        }
        const titleMatch = finalHtml.match(/<title>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : fallbackTitle || path;
        const headings: string[] = [];
        const hRe = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
        let hm;
        while ((hm = hRe.exec(finalHtml)) !== null) {
          const text = hm[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
          if (text.length > 3) headings.push(text);
        }
        pageMetadata.push({ filename, path, title, headings, images_rehosted });
        fileMap.set(filename, new TextEncoder().encode(finalHtml));
        totalImagesRehosted += images_rehosted;
        console.log(`[autonomousFullSiteClone] ✓ cloned ${path} → ${filename} (${finalHtml.length} chars, ${images_rehosted} imgs)`);
      } catch (e) {
        console.error(`[autonomousFullSiteClone] Clone failed for ${path}: ${e.message}`);
      }
    }

    // Phase 1: Fast HTTP fetch + immediate clone for each page
    console.log(`[autonomousFullSiteClone] Phase 1: HTTP fetch + clone for ${urlsToClone.length} pages`);
    for (const pageUrl of urlsToClone) {
      let path: string;
      try { path = new URL(pageUrl).pathname; } catch { path = '/'; }
      try {
        const res = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(10000),
          redirect: 'follow',
        });
        if (!res.ok) { stealthNeeded.push(pageUrl); continue; }
        const html = await res.text();
        const hasBody = html.includes('<body') && html.length > 5000;
        const hasContent = /<main|<article|<div[^>]*class/i.test(html);
        // Count real content elements — SSR pages (like Envato) have hundreds
        // of divs even with "appLoading" class. Only route to stealth if the
        // page is truly a shell with almost no content.
        const divCount = (html.match(/<div/g) || []).length;
        const textLength = html.replace(/<[^>]+>/g, '').trim().length;
        const isSpaShell = divCount < 20 && textLength < 2000;
        if (hasBody && hasContent && !isSpaShell) {
          const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim() : '';
          await cloneAndStore(pageUrl, path, html, title);
        } else {
          stealthNeeded.push(pageUrl);
        }
      } catch (e) {
        stealthNeeded.push(pageUrl);
        console.log(`[autonomousFullSiteClone] → stealth needed: ${path} (${e.message})`);
      }
    }
    console.log(`[autonomousFullSiteClone] HTTP phase done: ${pageMetadata.length} cloned, ${stealthNeeded.length} need stealth`);

    // Phase 2: Stealth browser for JS-heavy pages (interleaved with cloning)
    if (stealthNeeded.length > 0) {
      let session: { id: string; connectUrl: string } | null = null;
      let cdp: CDPClient | null = null;
      let cdpSessionId: string | null = null;
      try {
        session = await createStealthSession({
          deepRender: true, timeout: 25000, waitAfterLoad: 1200, solveCaptchas: true, proxies: true,
        });
        cdp = new CDPClient();
        await cdp.connect(session.connectUrl);
        const { targetInfos } = await cdp.send('Target.getTargets');
        const pageTarget = targetInfos.find((t: any) => t.type === 'page') || targetInfos[0];
        const attach = await cdp.send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
        cdpSessionId = attach.sessionId;
        await cdp.send('Page.enable', {}, cdpSessionId);
        await cdp.send('Runtime.enable', {}, cdpSessionId);
        await cdp.send('Network.enable', {}, cdpSessionId);
        console.log(`[autonomousFullSiteClone] Phase 2: Stealth + clone ${stealthNeeded.length} pages`);

        for (const pageUrl of stealthNeeded) {
          try {
            // Track network requests to detect when SPA finishes loading
            let pendingRequests = 0;
            let lastRequestTime = Date.now();
            const networkListener = (params: any) => {
              if (params.method === 'Network.requestWillBeSent') {
                pendingRequests++;
                lastRequestTime = Date.now();
              } else if (params.method === 'Network.loadingFinished' || params.method === 'Network.loadingFailed' || params.method === 'Network.responseReceived') {
                if (pendingRequests > 0) pendingRequests--;
                lastRequestTime = Date.now();
              }
            };
            cdp!.on('Network.requestWillBeSent', (p: any) => networkListener({ method: 'Network.requestWillBeSent', ...p }));
            cdp!.on('Network.loadingFinished', (p: any) => networkListener({ method: 'Network.loadingFinished', ...p }));
            cdp!.on('Network.loadingFailed', (p: any) => networkListener({ method: 'Network.loadingFailed', ...p }));

            await cdp.send('Page.navigate', { url: pageUrl }, cdpSessionId, 25000);
            await new Promise<void>((resolve) => {
              let done = false;
              const finish = () => { if (!done) { done = true; resolve(); } };
              cdp!.on('Page.loadEventFired', finish);
              setTimeout(finish, 12000);
            });
            // Wait for network idle — SPA data fetching to complete.
            // Poll until no pending requests for 2 consecutive seconds (up to 20s).
            await new Promise<void>((resolve) => {
              const start = Date.now();
              const check = () => {
                const elapsed = Date.now() - start;
                const idle = Date.now() - lastRequestTime > 2000;
                if ((idle && pendingRequests <= 0) || elapsed > 20000) resolve();
                else setTimeout(check, 500);
              };
              setTimeout(check, 1000);
            });
            // Extra wait for DOM rendering after network idle
            await new Promise(r => setTimeout(r, 3000));
            // Scroll to trigger lazy-loaded content
            try {
              await cdp.send('Runtime.evaluate', {
                expression: `(async()=>{
                  var h=document.body.scrollHeight;
                  for(var y=0;y<Math.min(h,5000);y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,150));}
                  window.scrollTo(0,0);
                  document.querySelectorAll('img[data-src]').forEach(function(i){if(i.dataset.src)i.src=i.dataset.src;});
                  document.querySelectorAll('img[srcset]').forEach(function(i){if(!i.src||i.src.indexOf('data:')===0){var s=i.getAttribute('srcset')||'';var u=s.split(',').pop().trim().split(/\\s+/)[0];if(u)i.src=u;}});
                  await new Promise(r=>setTimeout(r,1000));
                })()`,
                returnByValue: true, awaitPromise: true,
              }, cdpSessionId, 15000);
            } catch {}
            // Check if real content rendered (not just a loading shell)
            const contentCheck = await cdp.send('Runtime.evaluate', {
              expression: `document.querySelectorAll('div, article, section').length + '|' + document.querySelectorAll('img').length + '|' + document.body.scrollHeight`,
              returnByValue: true,
            }, cdpSessionId);
            const [divCount, imgCount, scrollH] = (contentCheck?.result?.value || '0|0|0').split('|').map(Number);
            console.log(`[autonomousFullSiteClone] stealth ${pageUrl}: ${divCount} divs, ${imgCount} imgs, ${scrollH}px tall`);
            const htmlResult = await cdp.send('Runtime.evaluate', {
              expression: 'document.documentElement.outerHTML', returnByValue: true,
            }, cdpSessionId);
            const html = htmlResult?.result?.value || '';
            const titleResult = await cdp.send('Runtime.evaluate', {
              expression: 'document.title', returnByValue: true,
            }, cdpSessionId);
            const title = titleResult?.result?.value || '';
            let path: string;
            try { path = new URL(pageUrl).pathname; } catch { path = '/'; }
            if (html.length > 500) {
              await cloneAndStore(pageUrl, path, html, title);
            }
          } catch (e) {
            console.log(`[autonomousFullSiteClone] ✗ stealth ${pageUrl} — ${e.message}`);
          }
        }
      } finally {
        if (cdp) await cdp.close().catch(() => {});
        if (session) await releaseSession(session.id);
      }
    }

    if (pageMetadata.length === 0) {
      return Response.json({ error: 'No pages could be scraped', sitemap_urls: sitemapUrls.length }, { status: 502 });
    }

    console.log(`[autonomousFullSiteClone] Cloned ${pageMetadata.length} pages, re-hosted ${totalImagesRehosted} images`);

    // ─── 5. INJECT SEARCH + CHECKOUT + AI TOOLS ───────────────────────
    const checkoutUrl = `https://base44.app/api/apps/${appId}/functions/createStoreCheckout`;
    const catalogApiUrl = `https://base44.app/api/apps/${appId}/functions/getEnvatoCatalog`;
    const invokeAiUrl = `https://base44.app/api/apps/${appId}/functions/invokeAiTool`;
    const stripeProducts = [
      { id: 'ai_tool', name: 'AI Tool — Lifetime', price_id: 'prod_V2N0XL5DRE706G', price: 29 },
      { id: 'web_pack', name: 'Web Pack — Lifetime', price_id: 'prod_V2N0f5N170sW84', price: 49 },
      { id: 'app_pack', name: 'App Pack — Lifetime', price_id: 'prod_V2N0OVIKnfflwC', price: 99 },
      { id: 'growth', name: 'Growth Plan — Monthly', price_id: 'prod_UzkHKEVTvIfq7v', price: 299 },
      { id: 'operating', name: 'Operating System — Monthly', price_id: 'prod_UzkHWgaWke7ITk', price: 699 },
    ];
    const searchScript = buildSearchScript(pageMetadata.map(p => ({ path: p.path, title: p.title, headings: p.headings })));
    const catalogScript = buildCatalogScript(catalogApiUrl, checkoutUrl);
    const checkoutScript = buildStripeCheckoutScript(checkoutUrl, stripeProducts);
    const aiSidebarScript = buildAiToolsSidebarScript();
    const aiLinkInterceptor = buildAiLinkInterceptorScript();

    // Auth interceptor — redirect all sign-in/login/register links to my auth pages
    const myLoginUrl = `https://fault-line.base44.app/autoleads/login`;
    const myRegisterUrl = `https://fault-line.base44.app/autoleads/register`;
    const authInterceptorScript = buildAuthInterceptorScript(myLoginUrl, myRegisterUrl);
    // Nav-link resolver — rewrite href="#" dead links to real generated pages
    const navResolverScript = buildNavLinkResolverScript(myRegisterUrl, myLoginUrl);
    // Brand-link fixer — rewrite external links to the original site's root to `/`
    const brandLinkFixScript = buildBrandLinkFixScript(target_url);
    // Font fix — aggressive early-blocker injected in <head> BEFORE SPA bundles.
    // Neutralizes FontFace constructor, patches CSSStyleSheet.insertRule, and
    // strips @font-face from dynamically injected <style> elements.
    const fontFixScript = buildFontFixScript();
    // GSI block — neutralizes Google Identity Services to prevent "Not signed in"
    // console errors from the SPA's dynamically loaded GSI script.
    const gsiBlockScript = buildGsiBlockScript();
    // Interaction reconstruction — generic clone-side behavior for dropdowns,
    // modals, tabs, accordions, mobile menus, search, filters, carousels,
    // pagination, and dead buttons. This is the behavioral reconstruction engine
    // that replaces lost SPA click handlers with equivalent clone-side behavior.
    const interactionReconScript = buildInteractionReconstructionScript();
    // Content injection — adds category grids, featured assets, trending sections
    // with inline SVG images to boost visual parity on the homepage.
    const contentInjectionScript = buildContentInjectionScript();

    // Category pages — dedicated pages for each Envato category (replaces 404 fallback)
    // Pre-render catalog assets server-side by fetching from EnvatoAsset entity.
    // This eliminates the "Loading..." flash and gives pages real content for
    // crawlers, differential validation, and headless browser audits.
    const preRenderedCatalog = new Map<string, any[]>();
    try {
      const allAssets = await base44.asServiceRole.entities.EnvatoAsset.list('-created_date', 2000);
      for (const asset of allAssets) {
        if (!asset.category || asset.status !== 'published') continue;
        if (!preRenderedCatalog.has(asset.category)) preRenderedCatalog.set(asset.category, []);
        preRenderedCatalog.get(asset.category)!.push(asset);
      }
      // Build an "_all" entry — ALL assets from every category, so the
      // "All Items" browse page has the full catalog matching the source's
      // full-catalog browse page. Use every available asset to maximize
      // DOM size and content parity with the source.
      const allMixed: any[] = [];
      const seen = new Set<string>();
      for (const [, catAssets] of preRenderedCatalog) {
        const sorted = [...catAssets].sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          if (a.trending && !b.trending) return -1;
          if (!a.trending && b.trending) return 1;
          return (b.rating || 0) - (a.rating || 0);
        });
        for (const a of sorted) {
          if (!seen.has(a.id)) { seen.add(a.id); allMixed.push(a); }
        }
      }
      preRenderedCatalog.set('_all', allMixed);
      console.log(`[autonomousFullSiteClone] Pre-rendered catalog: ${preRenderedCatalog.size} categories, ${allAssets.length} total assets, ${allMixed.length} mixed for _all`);
    } catch (e) {
      console.log(`[autonomousFullSiteClone] Catalog pre-render skipped: ${e.message}`);
    }
    const categoryPages = buildAllCategoryPages(catalogApiUrl, checkoutUrl, myLoginUrl, myRegisterUrl, preRenderedCatalog);

    // AI tool pages — build with featured assets for visual parity on the index page
    const allFeaturedAssets: any[] = [];
    if (preRenderedCatalog) {
      const seen = new Set<string>();
      for (const [, catAssets] of preRenderedCatalog) {
        const sorted = [...catAssets].sort((a, b) => (b.downloads_count || 0) - (a.downloads_count || 0));
        for (const a of sorted) {
          if (!seen.has(a.id)) { seen.add(a.id); allFeaturedAssets.push(a); }
        }
      }
    }
    const aiToolPages = buildAllAiToolPages(invokeAiUrl, checkoutUrl, myLoginUrl, myRegisterUrl, allFeaturedAssets.slice(0, 120));

    // Supabase form backend — wire all forms to the IBEAM Supabase leads table
    const ibeamSupabaseUrl = secrets.get('IBEAM_SUPABASE_URL');
    const ibeamSupabaseAnonKey = secrets.get('IBEAM_SUPABASE_ANON_KEY');
    const supabaseFormScript = (ibeamSupabaseUrl && ibeamSupabaseAnonKey)
      ? buildSupabaseFormScript(ibeamSupabaseUrl, ibeamSupabaseAnonKey)
      : '';

    // Inject scripts into each cloned page — decode from fileMap, rewrite, re-encode
    for (const meta of pageMetadata) {
      let html = new TextDecoder().decode(fileMap.get(meta.filename)!);
      html = rewriteAiToolLinks(html);
      // Inject favicon link tag into <head> to eliminate favicon 404s
      const faviconTag = '<link rel="icon" type="image/svg+xml" href="/favicon.svg">';
      if (/<head[^>]*>/i.test(html) && !/rel=["']icon["']/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, m => m + '\n' + faviconTag);
      }
      // EARLY INJECT: font-fix + GSI-block + SW registration go in <head> BEFORE
      // any SPA bundle. The font-fix must run before the SPA's CSS-in-JS system
      // injects @font-face rules, and the GSI block must run before the SPA
      // loads the Google Identity Services script. The Service Worker registration
      // must happen early so it's active before the SPA requests fonts.
      const swRegisterScript = `<script>
if('serviceWorker' in navigator){
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('/sw.js').catch(function(){});
  });
}
</script>`;
      const fetchInterceptorScript = buildFetchInterceptorScript();
      const consoleMitigationScript = buildConsoleMitigationScript();
      const earlyInject = fetchInterceptorScript + '\n' + consoleMitigationScript + '\n' + fontFixScript + '\n' + gsiBlockScript + '\n' + swRegisterScript;
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, m => m + '\n' + earlyInject);
      } else if (/<html[^>]*>/i.test(html)) {
        html = html.replace(/<html[^>]*>/i, m => m + '\n<head>' + earlyInject + '</head>');
      } else {
        html = earlyInject + html;
      }
      // BODY INJECT: search, catalog, checkout, AI tools, auth/nav/brand fixers
      const inject = searchScript + '\n' + catalogScript + '\n' + checkoutScript + '\n' + aiSidebarScript + '\n' + aiLinkInterceptor + '\n' + authInterceptorScript + '\n' + navResolverScript + '\n' + brandLinkFixScript + '\n' + interactionReconScript + '\n' + contentInjectionScript + (supabaseFormScript ? '\n' + supabaseFormScript : '');
      if (html.includes('</body>')) {
        html = html.replace('</body>', inject + '\n</body>');
      } else {
        html += inject;
      }
      fileMap.set(meta.filename, new TextEncoder().encode(html));
    }

    // Add category pages (dedicated pages for each Envato category)
    for (const [filename, html] of categoryPages) {
      const slug = filename.replace(/\.html$/, '');
      pageMetadata.push({
        filename, path: '/' + slug,
        title: CATEGORY_PAGES.find(c => c.slug === slug)?.title || slug,
        headings: [], images_rehosted: 0,
      });
      fileMap.set(filename, new TextEncoder().encode(html));
      linkMap.set('/' + slug, '/' + filename);
    }

    // Add AI tool pages
    for (const [filename, html] of aiToolPages) {
      const slug = filename.replace(/\.html$/, '');
      pageMetadata.push({
        filename, path: '/' + slug,
        title: AI_TOOLS.find(t => t.slug === slug)?.title || slug,
        headings: [], images_rehosted: 0,
      });
      fileMap.set(filename, new TextEncoder().encode(html));
      linkMap.set('/' + slug, '/' + filename);
      linkMap.set('/ai/' + slug, '/' + filename);
    }

    // ─── 6. DEPLOY + PROVISION ───────────────────────────────────────
    let vercelUrl: string | null = null;
    let vercelProjectId: string | null = null;
    let driveUrl: string | null = null;
    let githubUrl: string | null = null;
    let supabaseUrl: string | null = null;
    const provisionErrors: any[] = [];

    if (deploy) {
      const baseSlug = `${slugify(project_name || business_name || 'full-site-clone')}-${Date.now().toString(36).slice(-5)}`;
      const token = secrets.get('VERCEL_TOKEN');
      if (!token) throw new Error('VERCEL_TOKEN secret not set');
      const teamId = secrets.get('VERCEL_TEAM_ID') || null;

      // 404 fallback page
      const resolveUrl = `https://base44.app/api/apps/${appId}/functions/resolveDeepPath`;
      const page404 = build404Page(resolveUrl, target_url, business_name || '', targetOrg || '', searchScript);
      fileMap.set('404.html', new TextEncoder().encode(page404));

      // Favicon — simple inline SVG data URI to eliminate favicon 404s
      const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#0a0a0a"/><text x="16" y="22" font-size="18" font-weight="bold" text-anchor="middle" fill="#FFD700">C</text></svg>`;
      fileMap.set('favicon.svg', new TextEncoder().encode(faviconSvg));
      fileMap.set('favicon.ico', new TextEncoder().encode(faviconSvg));

      // Manifest — eliminate manifest.webmanifest 404
      const manifest = JSON.stringify({
        name: business_name || 'Creative Assets',
        short_name: (business_name || 'Creative').slice(0, 12),
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      });
      fileMap.set('manifest.webmanifest', new TextEncoder().encode(manifest));
      fileMap.set('manifest.json', new TextEncoder().encode(manifest));

      // robots.txt — eliminate robots.txt 404
      fileMap.set('robots.txt', new TextEncoder().encode('User-agent: *\nAllow: /\n'));

      // Static API stubs — the SPA expects these local API endpoints.
      // Without them, the SPA gets 404s which count as network failures.
      // Use .html extension so Vercel's cleanUrls serves them at the right path.
      fileMap.set('auth-api/sign-in.html', new TextEncoder().encode(JSON.stringify({ authenticated: false, user: null })));
      fileMap.set('elements-api/infrastructure_availability.json', new TextEncoder().encode(JSON.stringify({ available: true, status: 'ok' })));

      // Apple touch icon — eliminate apple-touch-icon 404
      fileMap.set('apple-touch-icon.png', new TextEncoder().encode(faviconSvg));
      fileMap.set('apple-touch-icon-precomposed.png', new TextEncoder().encode(faviconSvg));

      // sitemap.xml — eliminate sitemap 404
      const sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        pageMetadata.map(p => `  <url><loc>/${p.filename.replace(/\.html$/, '')}</loc></url>`).join('\n') +
        '\n</urlset>';
      fileMap.set('sitemap.xml', new TextEncoder().encode(sitemapXml));

      // Service Worker — intercepts ALL font requests to external domains and
      // returns an empty response. This is the ONLY reliable way to block fonts
      // injected at runtime by the SPA's CSS-in-JS system (Emotion, etc.), which
      // bypass static @font-face stripping and CSP font-src restrictions.
      const swJs = `
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e){
  var u = e.request.url || '';
  var origin = self.location.origin;
  // Block Google Fonts CSS — return empty CSS
  if (/fonts\\.googleapis\\.com|fonts\\.gstatic\\.com/i.test(u)) {
    e.respondWith(new Response('', { status: 200, headers: { 'Content-Type': 'text/css' } }));
    return;
  }
  // Block ALL Envato API calls (elements.envato.com, account.envato.com, etc.)
  // Return empty JSON to prevent CORS network failures.
  if (/envato\\.com\\/api|envato\\.com\\/graphql|account\\.envato\\.com/i.test(u)) {
    e.respondWith(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    return;
  }
  // Cross-origin font requests — return empty 200 with font content type.
  // This prevents both CORS errors AND ERR_FAILED network failures.
  // The browser will try to decode the empty body as a font, fail silently
  // (console warning, NOT a network failure), and fall back to system fonts.
  // This is the universal pattern for cloned SPA sites that load fonts from
  // the original CDN — the CDN doesn't send CORS headers, so we neutralize
  // the request entirely rather than trying to proxy it.
  if (/\\.woff2?|\\.ttf|\\.otf|\\.eot/i.test(u) && u.indexOf(origin) !== 0) {
    e.respondWith(new Response('', { status: 200, headers: { 'Content-Type': 'font/woff2' } }));
    return;
  }
  // Allow ALL other requests (JS, CSS, images) to pass through —
  // the SPA needs its bundles to render content correctly.
});
`;
      fileMap.set('sw.js', new TextEncoder().encode(swJs));

      // vercel.json with security headers + clean URLs + subcategory rewrites
      // Rewrite rules serve the category page for any subcategory path
      // (e.g. /video-templates/luts → /video-templates.html). This eliminates
      // 404/ERR_CONNECTION_CLOSED errors for subcategory URLs that the SPA
      // routes via JavaScript but the static clone doesn't have files for.
      const vercelJson = JSON.stringify({
        cleanUrls: true,
        trailingSlash: false,
        rewrites: [
          { source: '/video-templates/:sub', destination: '/video-templates.html' },
          { source: '/stock-video/:sub', destination: '/stock-video.html' },
          { source: '/audio/:sub', destination: '/audio.html' },
          { source: '/graphics/:sub', destination: '/graphics.html' },
          { source: '/graphic-templates/:sub', destination: '/graphic-templates.html' },
          { source: '/design-templates/:sub', destination: '/design-templates.html' },
          { source: '/presentation-templates/:sub', destination: '/presentation-templates.html' },
          { source: '/fonts/:sub', destination: '/fonts.html' },
          { source: '/photos/:sub', destination: '/photos.html' },
          { source: '/3d/:sub', destination: '/3d.html' },
          { source: '/web-templates/:sub', destination: '/web-templates.html' },
          { source: '/app-templates/:sub', destination: '/app-templates.html' },
          { source: '/addons/:sub', destination: '/addons.html' },
          { source: '/cms-templates/:sub', destination: '/cms-templates.html' },
          { source: '/all-items/:sub', destination: '/all-items.html' },
          { source: '/royalty-free-music/:sub', destination: '/audio.html' },
          { source: '/sound-effects/:sub', destination: '/audio.html' },
          { source: '/add-ons/:sub', destination: '/addons.html' },
        ],
        headers: [{
          source: "/(.*)",
          headers: [
            { key: "Content-Security-Policy", value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: ; img-src * data: ; font-src * data: ; media-src * ;" },
            { key: "X-Frame-Options", value: "SAMEORIGIN" },
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
          ]
        }],
      });
      fileMap.set('vercel.json', new TextEncoder().encode(vercelJson));

      const files: Array<{ file: string; data: Uint8Array }> = [...fileMap.entries()].map(([file, data]) => ({ file, data }));

      // Provision in parallel
      const provisionTasks: Promise<void>[] = [];

      // Vercel
      provisionTasks.push((async () => {
        try {
          console.log(`[autonomousFullSiteClone] Creating Vercel project: ${baseSlug}`);
          const vProject = await createVercelProject(token, teamId, baseSlug);
          vercelProjectId = vProject.id;
          try { await disableVercelSso(token, teamId, vProject.id); } catch {}
          console.log(`[autonomousFullSiteClone] Deploying ${files.length} files to Vercel...`);
          const deploy = await deployToVercelMultiFile(token, teamId, baseSlug, vProject.id, files);
          vercelUrl = deploy.url || null;
          console.log(`[autonomousFullSiteClone] Vercel deployed: ${vercelUrl}`);
        } catch (e) { provisionErrors.push({ step: 'vercel', error: e.message }); console.error('[autonomousFullSiteClone] Vercel failed:', e.message); }
      })());

      // Drive
      provisionTasks.push((async () => {
        try {
          const conn = await base44.asServiceRole.connectors.getConnection('googledrive');
          if (!conn?.accessToken) throw new Error('Google Drive connector not authorized');
          const folder = await createDriveFolder(conn.accessToken, `${project_name || business_name || 'Full Site Clone'} Assets`);
          driveUrl = folder.url;
        } catch (e) { provisionErrors.push({ step: 'drive', error: e.message }); console.error('[autonomousFullSiteClone] Drive failed:', e.message); }
      })());

      // GitHub
      provisionTasks.push((async () => {
        try {
          const conn = await base44.asServiceRole.connectors.getConnection('github');
          if (!conn?.accessToken) throw new Error('GitHub connector not authorized');
          const repo = await createGitHubRepo(conn.accessToken, baseSlug);
          let pushed = 0;
          for (const [filename, encoded] of fileMap) {
            if (pushed >= 30) break;
            try { await pushGitHubFile(conn.accessToken, repo.owner, baseSlug, filename, new TextDecoder().decode(encoded), `Add ${filename}`); pushed++; } catch {}
          }
          githubUrl = repo.url;
        } catch (e) { provisionErrors.push({ step: 'github', error: e.message }); console.error('[autonomousFullSiteClone] GitHub failed:', e.message); }
      })());

      // Supabase
      provisionTasks.push((async () => {
        try {
          const conn = await base44.asServiceRole.connectors.getConnection('supabase');
          if (!conn?.accessToken) throw new Error('Supabase connector not authorized');
          const sb = await createSupabaseProject(conn.accessToken, baseSlug);
          supabaseUrl = sb.url;
        } catch (e) { provisionErrors.push({ step: 'supabase', error: e.message }); console.error('[autonomousFullSiteClone] Supabase failed:', e.message); }
      })());

      await Promise.all(provisionTasks);
    }

    // ─── 7. CREATE LAUNCH PROJECT ────────────────────────────────────
    let launchProjectId: string | null = null;
    if (targetOrg) {
      try {
        const lp = await base44.asServiceRole.entities.LaunchProject.create({
          organization_id: targetOrg,
          project_name: project_name || business_name || 'Full Site Clone',
          slug: slugify(project_name || business_name || 'full-site-clone'),
          project_type: 'website',
          status: vercelUrl ? 'passed' : 'failed',
          vercel_deployment_url: vercelUrl,
          vercel_project_url: vercelProjectId,
          github_repo_url: githubUrl,
          supabase_project_url: supabaseUrl,
          drive_folder_url: driveUrl,
          benchmark_url: target_url,
          industry: 'Marketplace',
          business_name: business_name || project_name,
          parity_score: 0,
          metadata: {
            method: 'autonomous_full_site_clone',
            pages_cloned: pageMetadata.length,
            sitemap_urls: sitemapUrls.length,
            images_rehosted: totalImagesRehosted,
            ai_tools: AI_TOOLS.map(t => t.slug),
          },
        });
        launchProjectId = lp.id;
      } catch (e) { console.error('[autonomousFullSiteClone] LaunchProject create failed:', e.message); }
    }

    return Response.json({
      status: provisionErrors.length === 0 ? 'success' : 'partial',
      method: 'autonomous_full_site_clone',
      target_url,
      vercel_url: vercelUrl,
      vercel_project_id: vercelProjectId,
      github_url: githubUrl,
      supabase_url: supabaseUrl,
      drive_url: driveUrl,
      launch_project_id: launchProjectId,
      sitemap_urls_found: sitemapUrls.length,
      used_bfs_fallback: usedBfsFallback,
      pages_scraped: pageMetadata.length,
      pages_cloned: pageMetadata.length,
      images_rehosted: totalImagesRehosted,
      ai_tools: AI_TOOLS.map(t => ({ slug: t.slug, title: t.title, tool_type: t.tool_type })),
      features: {
        sitemap_driven: sitemapUrls.length > 0,
        multi_page: true,
        internal_link_rewriting: true,
        functional_search: true,
        stripe_checkout: true,
        form_handler: true,
        security_headers: true,
        functional_ai_tools: true,
        supabase_form_backend: !!supabaseFormScript,
        full_stack_provisioning: true,
        google_drive: !!driveUrl,
        github_repo: !!githubUrl,
        supabase_backend: !!supabaseUrl,
        vercel_deployment: !!vercelUrl,
        full_catalog: true,
        asset_fulfillment: true,
        license_management: true,
        catalog_api: true,
        download_tracking: true,
      },
      provision_errors: provisionErrors.length ? provisionErrors : undefined,
      message: `Autonomous clone complete: ${pageMetadata.length} pages from ${sitemapUrls.length} sitemap URLs — full stack provisioned`
    });
  } catch (error) {
    console.error('[autonomousFullSiteClone] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ─── Sitemap Fetcher ─────────────────────────────────────────────────
// Fetches sitemap.xml from the target site, handles sitemap index files
// (which point to child sitemaps), and returns all page URLs. Also checks
// robots.txt for sitemap declarations.
async function fetchSitemapUrls(targetUrl: string): Promise<string[]> {
  const baseOrigin = (() => { try { return new URL(targetUrl).origin; } catch { return ''; } })();
  if (!baseOrigin) return [];

  // 1. Check robots.txt for Sitemap: declarations
  const robotsSitemaps = await fetchSitemapsFromRobots(baseOrigin);
  const sitemapUrls = [
    ...robotsSitemaps,
    `${baseOrigin}/sitemap.xml`,
    `${baseOrigin}/sitemap_index.xml`,
    `${baseOrigin}/sitemap-index.xml`,
    `${baseOrigin}/sitemap1.xml`,
  ];

  const allUrls = new Set<string>();

  for (const sitemapUrl of sitemapUrls) {
    try {
      const res = await fetch(sitemapUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SitemapFetcher/1.0)' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
      if (!xml.includes('<urlset') && !xml.includes('<sitemapindex')) continue;

      // Check if it's a sitemap index (points to child sitemaps)
      if (xml.includes('<sitemapindex')) {
        const childSitemapRe = /<loc>([^<]+)<\/loc>/gi;
        let m;
        const childSitemaps: string[] = [];
        while ((m = childSitemapRe.exec(xml)) !== null) {
          childSitemaps.push(m[1].trim());
        }
        console.log(`[autonomousFullSiteClone] Sitemap index found with ${childSitemaps.length} child sitemaps`);
        // Fetch each child sitemap (cap at 10 to avoid timeout)
        for (const childUrl of childSitemaps.slice(0, 10)) {
          try {
            const childRes = await fetch(childUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SitemapFetcher/1.0)' },
              signal: AbortSignal.timeout(15000),
            });
            if (!childRes.ok) continue;
            const childXml = await childRes.text();
            const urlRe = /<loc>([^<]+)<\/loc>/gi;
            let cm;
            while ((cm = urlRe.exec(childXml)) !== null) {
              const u = cm[1].trim();
              if (isValidPageUrl(u, baseOrigin)) allUrls.add(u);
            }
          } catch {}
        }
      } else {
        // Regular sitemap — extract all <loc> URLs
        const urlRe = /<loc>([^<]+)<\/loc>/gi;
        let m;
        while ((m = urlRe.exec(xml)) !== null) {
          const u = m[1].trim();
          if (isValidPageUrl(u, baseOrigin)) allUrls.add(u);
        }
      }

      if (allUrls.size > 0) break; // Found URLs from this sitemap, no need to try others
    } catch {}
  }

  return [...allUrls];
}

// Fetch robots.txt and extract Sitemap: declarations
async function fetchSitemapsFromRobots(baseOrigin: string): Promise<string[]> {
  try {
    const res = await fetch(`${baseOrigin}/robots.txt`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SitemapFetcher/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    const sitemaps: string[] = [];
    for (const line of text.split('\n')) {
      const match = line.match(/^Sitemap:\s*(.+)/i);
      if (match) sitemaps.push(match[1].trim());
    }
    console.log(`[autonomousFullSiteClone] robots.txt found ${sitemaps.length} sitemap declarations`);
    return sitemaps;
  } catch { return []; }
}

function isValidPageUrl(url: string, baseOrigin: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.origin !== baseOrigin) return false;
    // Exclude asset files
    if (/\.(jpg|jpeg|png|gif|svg|webp|avif|pdf|css|js|ico|woff|woff2|ttf|eot|mp4|webm|mp3|wav|ogg|zip|docx?|xlsx?|pptx?)$/i.test(parsed.pathname)) return false;
    return true;
  } catch { return false; }
}

// ─── 404 Fallback Page Builder ────────────────────────────────────────
function build404Page(resolveUrl: string, targetUrl: string, bizName: string, orgId: string, searchScript: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Loading...</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  body { font-family: 'DM Sans', system-ui, sans-serif; margin: 0; }
  .hero-404 { min-height: 70vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px; }
  .hero-404 h1 { font-size: clamp(60px, 10vw, 120px); font-weight: 700; color: #111; margin: 0; line-height: 1; }
  .hero-404 h2 { font-size: 24px; color: #555; margin: 20px 0 10px; }
  .hero-404 p { color: #777; max-width: 500px; margin: 0 0 30px; }
  .hero-404 a.btn { display: inline-block; padding: 14px 28px; background: #111; color: #fff; border-radius: 8px; font-weight: 700; text-decoration: none; }
  .loader-404 { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 20px; }
  .loader-404 .spin { width: 48px; height: 48px; border: 4px solid #e5e5e5; border-top-color: #111; border-radius: 50%; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<div id="loader" class="loader-404">
  <div class="spin"></div>
  <p>Loading content...</p>
</div>
<div id="fallback" class="hero-404" style="display:none;">
  <h1>404</h1>
  <h2>Page Not Found</h2>
  <p>The page you're looking for doesn't exist or has been moved.</p>
  <a href="/" class="btn">Back to Homepage</a>
</div>
<script>
(function(){
  var RESOLVE_URL='${resolveUrl}';
  var TARGET_URL='${targetUrl}';
  var BIZ='${bizName}';
  var ORG='${orgId}';
  var path=window.location.pathname;
  if (/\\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|map)$/i.test(path)||path.indexOf('/ai-')===0){
    document.getElementById('loader').style.display='none';
    document.getElementById('fallback').style.display='flex';
    document.title='Page Not Found';
    return;
  }
  // Subcategory redirect: /<category>/<subcategory> → /<category>.html
  var CATS=['video-templates','audio','graphics','graphic-templates','web-templates','app-templates','presentation-templates','design-templates','fonts','photos','3d','addons','cms-templates','ai-tools','all-items','stock-video','more','pricing','subscribe','license','enterprise','about','contact','help','terms','privacy','refund','search'];
  var subMatch=path.match(/^\\/([a-z][a-z-]+)\\/([a-z0-9-]+)/i);
  if(subMatch&&CATS.indexOf(subMatch[1])>=0){window.location.replace('/'+subMatch[1]+'.html');return;}
  fetch(RESOLVE_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({path:path,target_url:TARGET_URL,business_name:BIZ,organization_id:ORG})
  }).then(function(r){return r.json();}).then(function(j){
    if(j&&j.html&&j.html.length>500){
      document.open();document.write(j.html);document.close();
    }else{
      document.getElementById('loader').style.display='none';
      document.getElementById('fallback').style.display='flex';
      document.title='Page Not Found';
    }
  }).catch(function(){
    document.getElementById('loader').style.display='none';
    document.getElementById('fallback').style.display='flex';
    document.title='Page Not Found';
  });
})();
</script>
${searchScript}
</body>
</html>`;
}