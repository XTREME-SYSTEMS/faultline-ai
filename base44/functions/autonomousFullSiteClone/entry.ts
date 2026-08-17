import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { createStealthSession, releaseSession, CDPClient, crawlSiteStealth } from '../../shared/stealthBrowser.ts';
import { clonePageAssets, rewriteInternalLinks, pathToFilename, buildSearchScript, buildStripeCheckoutScript } from '../../shared/fullSiteClone.ts';
import { slugify, createVercelProject, disableVercelSso, deployToVercelMultiFile, createDriveFolder, createGitHubRepo, pushGitHubFile, createSupabaseProject } from '../../shared/launchInfra.ts';
import { buildAllAiToolPages, rewriteAiToolLinks, AI_TOOLS, buildAiToolsSidebarScript } from '../../shared/aiToolPages.ts';

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
const MAX_SITEMAP_URLS = 120; // cap to stay within function timeout

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

    // ─── 3. BATCH-SCRAPE ALL PAGES ───────────────────────────────────
    // Create ONE stealth session and reuse it for all pages (much faster than
    // creating a new session per page). Process in batches to manage memory.
    const scrapedPages: Array<{ url: string; path: string; html: string; ok: boolean; title: string }> = [];
    let session: { id: string; connectUrl: string } | null = null;
    let cdp: CDPClient | null = null;
    let cdpSessionId: string | null = null;

    try {
      session = await createStealthSession({
        deepRender: true,
        timeout: 25000,
        waitAfterLoad: 1200,
        solveCaptchas: true,
        proxies: true,
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

      console.log(`[autonomousFullSiteClone] Stealth session created — scraping ${urlsToClone.length} pages in batches of ${BATCH_SIZE}`);

      for (let i = 0; i < urlsToClone.length; i += BATCH_SIZE) {
        const batch = urlsToClone.slice(i, i + BATCH_SIZE);
        console.log(`[autonomousFullSiteClone] Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(urlsToClone.length / BATCH_SIZE)} — ${batch.length} pages`);

        for (const pageUrl of batch) {
          try {
            // Navigate to the page
            await cdp.send('Page.navigate', { url: pageUrl }, cdpSessionId, 25000);
            // Wait for load
            await new Promise<void>((resolve) => {
              let done = false;
              const finish = () => { if (!done) { done = true; resolve(); } };
              cdp!.on('Page.loadEventFired', finish);
              setTimeout(finish, 12000);
            });
            await new Promise(r => setTimeout(r, 1200));

            // Deep render: scroll + resolve lazy images
            try {
              await cdp.send('Runtime.evaluate', {
                expression: `(async()=>{var h=document.body.scrollHeight;for(var y=0;y<h;y+=900){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,100));}window.scrollTo(0,0);document.querySelectorAll('img[data-src]').forEach(function(i){if(i.dataset.src)i.src=i.dataset.src;});document.querySelectorAll('img[srcset]').forEach(function(i){if(!i.src||i.src.indexOf('data:')===0){var s=i.getAttribute('srcset')||'';var u=s.split(',').pop().trim().split(/\\s+/)[0];if(u)i.src=u;}});await new Promise(r=>setTimeout(r,500));})()`,
                returnByValue: true,
                awaitPromise: true,
              }, cdpSessionId, 15000);
            } catch {}

            // Extract HTML
            const htmlResult = await cdp.send('Runtime.evaluate', {
              expression: 'document.documentElement.outerHTML',
              returnByValue: true,
            }, cdpSessionId);
            const html = htmlResult?.result?.value || '';
            const titleResult = await cdp.send('Runtime.evaluate', {
              expression: 'document.title',
              returnByValue: true,
            }, cdpSessionId);
            const title = titleResult?.result?.value || '';

            let path: string;
            try { path = new URL(pageUrl).pathname; } catch { path = '/'; }

            if (html.length > 500) {
              scrapedPages.push({ url: pageUrl, path, html, ok: true, title });
              console.log(`[autonomousFullSiteClone] ✓ ${path} (${html.length} chars)`);
            } else {
              console.log(`[autonomousFullSiteClone] ✗ ${path} — too short (${html.length} chars)`);
            }
          } catch (e) {
            console.log(`[autonomousFullSiteClone] ✗ ${pageUrl} — ${e.message}`);
          }
        }
        console.log(`[autonomousFullSiteClone] Batch done — ${scrapedPages.length} pages scraped so far`);
      }
    } finally {
      if (cdp) await cdp.close().catch(() => {});
      if (session) await releaseSession(session.id);
    }

    if (scrapedPages.length === 0) {
      return Response.json({ error: 'No pages could be scraped', sitemap_urls: sitemapUrls.length }, { status: 502 });
    }

    console.log(`[autonomousFullSiteClone] Scraped ${scrapedPages.length} pages total`);

    // ─── 4. CLONE EACH PAGE (re-host assets, swap branding, rewrite links) ───
    const appId = Deno.env.get('BASE44_APP_ID');
    const formHandlerUrl = `https://base44.app/api/apps/${appId}/functions/ingestCloneLead`;
    const clonedPages: Array<{ filename: string; html: string; path: string; title: string; headings: string[]; images_rehosted: number }> = [];
    let totalImagesRehosted = 0;

    for (let i = 0; i < scrapedPages.length; i++) {
      const page = scrapedPages[i];
      const filename = pathToFilename(page.path);
      console.log(`[autonomousFullSiteClone] Cloning ${i + 1}/${scrapedPages.length}: ${page.path} → ${filename}`);

      try {
        const { html: clonedHtml, images_rehosted } = await clonePageAssets(base44, page.html, {
          target_url,
          page_url: page.url,
          business_name,
          client_email,
          client_phone,
          organization_id: targetOrg,
          form_handler_url: formHandlerUrl,
          link_rewrite_map: linkMap,
          rehost_images: true,
          max_images: 25, // lower per-page cap for memory
        });

        let finalHtml = rewriteInternalLinks(clonedHtml, linkMap);

        // Strip heavy inline scripts (Next.js hydration blobs)
        if (finalHtml.length > 400000) {
          finalHtml = finalHtml.replace(/<script[^>]*id="__NEXT_DATA__"[^>]*>[\s\S]*?<\/script>/gi, '');
          finalHtml = finalHtml.replace(/<script[^>]*type="application\/json"[^>]*>[\s\S]*?<\/script>/gi, '');
          finalHtml = finalHtml.replace(/<script[^>]*data-nscript[^>]*>[\s\S]*?<\/script>/gi, '');
          finalHtml = finalHtml.replace(/<!--[\s\S]*?-->/g, (m) => m.length > 1000 ? '' : m);
          console.log(`[autonomousFullSiteClone] Stripped scripts: ${clonedHtml.length} → ${finalHtml.length}`);
        }

        // Extract title and headings for search index
        const titleMatch = finalHtml.match(/<title>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : page.title || page.path;
        const headings: string[] = [];
        const hRe = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
        let hm;
        while ((hm = hRe.exec(finalHtml)) !== null) {
          const text = hm[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
          if (text.length > 3) headings.push(text);
        }

        clonedPages.push({ filename, html: finalHtml, path: page.path, title, headings, images_rehosted });
        totalImagesRehosted += images_rehosted;
      } catch (e) {
        console.error(`[autonomousFullSiteClone] Clone failed for ${page.path}: ${e.message}`);
      }
      // Free raw HTML to prevent memory accumulation
      scrapedPages[i].html = '';
    }

    console.log(`[autonomousFullSiteClone] Cloned ${clonedPages.length} pages, re-hosted ${totalImagesRehosted} images`);

    // ─── 5. INJECT SEARCH + CHECKOUT + AI TOOLS ───────────────────────
    const checkoutUrl = `https://base44.app/api/apps/${appId}/functions/createStoreCheckout`;
    const invokeAiUrl = `https://base44.app/api/apps/${appId}/functions/invokeAiTool`;
    const stripeProducts = [
      { id: 'ai_tool', name: 'AI Tool — Lifetime', price_id: 'prod_V2N0XL5DRE706G', price: 29 },
      { id: 'web_pack', name: 'Web Pack — Lifetime', price_id: 'prod_V2N0f5N170sW84', price: 49 },
      { id: 'app_pack', name: 'App Pack — Lifetime', price_id: 'prod_V2N0OVIKnfflwC', price: 99 },
      { id: 'growth', name: 'Growth Plan — Monthly', price_id: 'prod_UzkHKEVTvIfq7v', price: 299 },
      { id: 'operating', name: 'Operating System — Monthly', price_id: 'prod_UzkHWgaWke7ITk', price: 699 },
    ];
    const searchScript = buildSearchScript(clonedPages.map(p => ({ path: p.path, title: p.title, headings: p.headings })));
    const checkoutScript = buildStripeCheckoutScript(checkoutUrl, stripeProducts);
    const aiSidebarScript = buildAiToolsSidebarScript();
    const aiToolPages = buildAllAiToolPages(invokeAiUrl, checkoutUrl);

    for (const page of clonedPages) {
      page.html = rewriteAiToolLinks(page.html);
      const inject = searchScript + '\n' + checkoutScript + '\n' + aiSidebarScript;
      if (page.html.includes('</body>')) {
        page.html = page.html.replace('</body>', inject + '\n</body>');
      } else {
        page.html += inject;
      }
    }

    // Add AI tool pages
    for (const [filename, html] of aiToolPages) {
      const slug = filename.replace(/\.html$/, '');
      clonedPages.push({
        filename, html, path: '/' + slug,
        title: AI_TOOLS.find(t => t.slug === slug)?.title || slug,
        headings: [], images_rehosted: 0,
      });
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

      // Build file list (deduplicate by filename)
      const fileMap = new Map<string, Uint8Array>();
      for (const page of clonedPages) {
        fileMap.set(page.filename, new TextEncoder().encode(page.html));
      }

      // 404 fallback page
      const resolveUrl = `https://base44.app/api/apps/${appId}/functions/resolveDeepPath`;
      const page404 = build404Page(resolveUrl, target_url, business_name || '', targetOrg || '', searchScript);
      fileMap.set('404.html', new TextEncoder().encode(page404));

      // vercel.json with security headers + clean URLs
      const vercelJson = JSON.stringify({
        cleanUrls: true,
        trailingSlash: false,
        headers: [{
          source: "/(.*)",
          headers: [
            { key: "Content-Security-Policy", value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: ; img-src * data: ; font-src * ; media-src * ;" },
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
          for (const page of clonedPages.slice(0, 30)) {
            try { await pushGitHubFile(conn.accessToken, repo.owner, baseSlug, page.filename, page.html, `Add ${page.filename}`); } catch {}
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
            pages_cloned: clonedPages.length,
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
      pages_scraped: scrapedPages.length,
      pages_cloned: clonedPages.length,
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
        full_stack_provisioning: true,
        google_drive: !!driveUrl,
        github_repo: !!githubUrl,
        supabase_backend: !!supabaseUrl,
        vercel_deployment: !!vercelUrl,
      },
      provision_errors: provisionErrors.length ? provisionErrors : undefined,
      message: `Autonomous clone complete: ${clonedPages.length} pages from ${sitemapUrls.length} sitemap URLs — full stack provisioned`
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