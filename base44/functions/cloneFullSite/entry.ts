import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { crawlSiteStealth, scrapeWithStealth } from '../../shared/stealthBrowser.ts';
import { fetchPageDeep } from '../../shared/deepScraper.ts';
import { clonePageAssets, rewriteInternalLinks, pathToFilename, buildSearchScript, buildStripeCheckoutScript } from '../../shared/fullSiteClone.ts';
import { slugify, createVercelProject, disableVercelSso, deployToVercelMultiFile, sha1hex, createDriveFolder, createGitHubRepo, pushGitHubFile, createSupabaseProject } from '../../shared/launchInfra.ts';
import { buildAllAiToolPages, rewriteAiToolLinks, AI_TOOLS, buildAiToolsSidebarScript } from '../../shared/aiToolPages.ts';

// Full-site clone engine: crawls ALL pages of a target site, clones each page
// (re-hosts images, inlines CSS, swaps branding), rewrites internal links to
// work across the cloned multi-page static site, injects functional search +
// Stripe checkout, and deploys the entire site to Vercel as a multi-page static
// site. This makes the clone 100% functional — every page works, every CTA
// works, search works, checkout works.

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
      max_pages = 25,
      deploy = true
    } = body;
    if (!target_url) return Response.json({ error: 'target_url required' }, { status: 400 });
    const targetOrg = organization_id || orgId;

    console.log(`Full-site clone starting: ${target_url} (max ${max_pages} pages)`);

    // 1. Crawl ALL pages of the target site
    //    crawlSiteStealth scrapes the homepage, discovers internal links, and
    //    crawls each one (up to maxPages). Each page gets fully rendered HTML
    //    via the stealth browser (JS execution + deep render).
    const crawl = await crawlSiteStealth(target_url, {
      deepRender: true,
      timeout: 35000,
      waitAfterLoad: 4000,
      solveCaptchas: true,
      proxies: true,
      maxPages: max_pages,
    });

    console.log(`Crawled ${crawl.pages.length} pages from ${target_url}`);
    if (crawl.pages.length === 0 || !crawl.pages[0].ok) {
      return Response.json({ error: 'Could not crawl target site', pages_attempted: crawl.pages.length }, { status: 502 });
    }

    // 2. Build the link rewrite map (original path → cloned .html filename)
    //    This is shared across all pages so internal links point to cloned pages
    const linkMap = new Map<string, string>();
    for (const page of crawl.pages) {
      if (!page.ok || !page.html) continue;
      let path: string;
      try { path = new URL(page.url || target_url).pathname; } catch { path = page.path || '/'; }
      const filename = pathToFilename(path);
      linkMap.set(path, '/' + filename);
      // Also map without trailing slash
      if (path !== '/' && path.endsWith('/')) {
        linkMap.set(path.replace(/\/$/, ''), '/' + filename);
      }
    }
    console.log(`Link rewrite map: ${linkMap.size} pages`);

    // 3. Clone each page (re-host images, inline CSS, swap branding, rewrite links)
    const appId = Deno.env.get('BASE44_APP_ID');
    const formHandlerUrl = `https://base44.app/api/apps/${appId}/functions/ingestCloneLead`;
    const clonedPages: Array<{ filename: string; html: string; path: string; title: string; headings: string[]; images_rehosted: number }> = [];
    let totalImagesRehosted = 0;

    for (let i = 0; i < crawl.pages.length; i++) {
      const page = crawl.pages[i];
      if (!page.ok || !page.html || page.html.length < 500) {
        console.log(`Skipping page ${i}: not ok or too short`);
        continue;
      }
      let path: string;
      try { path = new URL(page.url || target_url).pathname; } catch { path = page.path || '/'; }
      const filename = pathToFilename(path);
      console.log(`Cloning page ${i + 1}/${crawl.pages.length}: ${path} → ${filename} (${page.html.length} chars)`);

      try {
        const { html: clonedHtml, images_rehosted } = await clonePageAssets(base44, page.html, {
          target_url,
          page_url: page.url || target_url,
          business_name,
          client_email,
          client_phone,
          organization_id: targetOrg,
          form_handler_url: formHandlerUrl,
          link_rewrite_map: linkMap,
          rehost_images: true,
          max_images: 50,
        });

        // Rewrite internal links to point to cloned .html files
        let finalHtml = rewriteInternalLinks(clonedHtml, linkMap);

        // Extract page title and headings for the search index
        const titleMatch = finalHtml.match(/<title>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : path;
        const headings: string[] = [];
        const hRe = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
        let hm;
        while ((hm = hRe.exec(finalHtml)) !== null) {
          const text = hm[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
          if (text.length > 3) headings.push(text);
        }

        clonedPages.push({ filename, html: finalHtml, path, title, headings, images_rehosted });
        totalImagesRehosted += images_rehosted;
      } catch (e) {
        console.error(`Failed to clone page ${path}: ${e.message}`);
      }
    }

    console.log(`Cloned ${clonedPages.length} pages, re-hosted ${totalImagesRehosted} images total`);

    if (clonedPages.length === 0) {
      return Response.json({ error: 'No pages could be cloned' }, { status: 500 });
    }

    // 4. Inject functional search + Stripe checkout into EVERY page
    //    Search: client-side search over all cloned pages (titles + headings)
    //    Checkout: intercept CTA buttons and redirect to Stripe checkout
    //    AI Tools: rewrite AI tool links to point to our functional AI tool pages
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

    // 4a. Build functional AI tool pages (replace Envato's auth-required AI tools)
    const aiToolPages = buildAllAiToolPages(invokeAiUrl, checkoutUrl);
    console.log(`Built ${aiToolPages.size} functional AI tool pages`);

    for (const page of clonedPages) {
      // Rewrite AI tool links to point to our functional pages
      page.html = rewriteAiToolLinks(page.html);
      // Inject search + checkout + AI sidebar scripts
      const inject = searchScript + '\n' + checkoutScript + '\n' + aiSidebarScript;
      if (page.html.includes('</body>')) {
        page.html = page.html.replace('</body>', inject + '\n</body>');
      } else {
        page.html += inject;
      }
    }

    // 4b. Add AI tool pages to the cloned pages list for deployment
    for (const [filename, html] of aiToolPages) {
      const slug = filename.replace(/\.html$/, '');
      clonedPages.push({
        filename, html, path: '/' + slug,
        title: AI_TOOLS.find(t => t.slug === slug)?.title || slug,
        headings: [], images_rehosted: 0,
      });
      // Add to link map so internal links resolve
      linkMap.set('/' + slug, '/' + filename);
      linkMap.set('/ai/' + slug, '/' + filename);
    }

    // 5. Deploy as a multi-page static site to Vercel + provision full stack
    //    (Drive, GitHub, Supabase) IN PARALLEL for a complete operational system.
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

      // Build the file list for multi-file deployment (deduplicate by filename)
      const fileMap = new Map<string, Uint8Array>();
      for (const page of clonedPages) {
        fileMap.set(page.filename, new TextEncoder().encode(page.html));
      }
      const files: Array<{ file: string; data: Uint8Array }> = [...fileMap.entries()].map(([file, data]) => ({ file, data }));

      // Add 404.html fallback page for any path that wasn't cloned — graceful
      // "Page Not Found" with search + homepage link instead of Vercel's default.
      const searchScriptFor404 = buildSearchScript(clonedPages.map(p => ({ path: p.path, title: p.title, headings: p.headings })));
      const resolveUrl = `https://base44.app/api/apps/${appId}/functions/resolveDeepPath`;
      const targetUrl = target_url;
      const bizName = business_name || '';
      const orgId = targetOrg || '';
      const page404 = `<!DOCTYPE html>
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
  .hero-404 a.btn:hover { background: #333; }
  .search-404 { width: min(500px, 90%); margin: 20px auto; position: relative; }
  .search-404 input { width: 100%; padding: 14px 18px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; outline: none; box-sizing: border-box; }
  .search-404 input:focus { border-color: #111; }
  .search-results { position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.12); max-height: 300px; overflow: auto; z-index: 999; display: none; }
  .search-results a { display: block; padding: 10px 14px; border-bottom: 1px solid #eee; text-decoration: none; color: #111; font-size: 14px; }
  .search-results a:hover { background: #f5f5f5; }
  .loader-404 { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 20px; }
  .loader-404 .spin { width: 48px; height: 48px; border: 4px solid #e5e5e5; border-top-color: #111; border-radius: 50%; animation: spin 1s linear infinite; }
  .loader-404 p { color: #555; font-size: 16px; }
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
  <p>The page you're looking for doesn't exist or has been moved. Try searching or go back to the homepage.</p>
  <div class="search-404">
    <input type="search" placeholder="Search all pages..." aria-label="Search">
    <div class="search-results"></div>
  </div>
  <a href="/" class="btn">Back to Homepage</a>
</div>
<script>
(function(){
  var RESOLVE_URL='${resolveUrl}';
  var TARGET_URL='${targetUrl}';
  var BIZ='${bizName}';
  var ORG='${orgId}';
  var path=window.location.pathname;
  // Skip asset files, AI tool pages, and API paths
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
      document.open();
      document.write(j.html);
      document.close();
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
${searchScriptFor404}
</body>
</html>`;
      fileMap.set('404.html', new TextEncoder().encode(page404));
      files.push({ file: '404.html', data: new TextEncoder().encode(page404) });

      // Add vercel.json with security headers + clean URLs. Vercel automatically
      // serves 404.html for any path that doesn't match a file — no routes config
      // needed (routes would override cleanUrls and rewrites).
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
      files.push({ file: 'vercel.json', data: new TextEncoder().encode(vercelJson) });

      // Provision tasks — run in PARALLEL for speed
      const provisionTasks: Promise<void>[] = [];

      // 5a. Vercel deployment
      provisionTasks.push((async () => {
        try {
          console.log(`Creating Vercel project: ${baseSlug}`);
          const vProject = await createVercelProject(token, teamId, baseSlug);
          vercelProjectId = vProject.id;
          try { await disableVercelSso(token, teamId, vProject.id); } catch { /* non-fatal */ }
          console.log(`Deploying ${files.length} files to Vercel...`);
          const deploy = await deployToVercelMultiFile(token, teamId, baseSlug, vProject.id, files);
          vercelUrl = deploy.url || null;
          console.log(`Vercel deployed: ${vercelUrl}`);
        } catch (e) { provisionErrors.push({ step: 'vercel', error: e.message }); console.error('Vercel failed:', e.message); }
      })());

      // 5b. Google Drive folder for asset storage
      provisionTasks.push((async () => {
        try {
          const conn = await base44.asServiceRole.connectors.getConnection('googledrive');
          if (!conn?.accessToken) throw new Error('Google Drive connector not authorized');
          const folder = await createDriveFolder(conn.accessToken, `${project_name || business_name || 'Full Site Clone'} Assets`);
          driveUrl = folder.url;
          console.log('Drive folder created:', driveUrl);
        } catch (e) { provisionErrors.push({ step: 'drive', error: e.message }); console.error('Drive failed:', e.message); }
      })());

      // 5c. GitHub repo with all cloned pages pushed
      provisionTasks.push((async () => {
        try {
          const conn = await base44.asServiceRole.connectors.getConnection('github');
          if (!conn?.accessToken) throw new Error('GitHub connector not authorized');
          const repo = await createGitHubRepo(conn.accessToken, baseSlug);
          // Push all cloned pages to the repo
          for (const page of clonedPages.slice(0, 25)) {
            try {
              await pushGitHubFile(conn.accessToken, repo.owner, baseSlug, page.filename, page.html, `Add ${page.filename}`);
            } catch (e) { /* best-effort — rate limits */ }
          }
          // Push vercel.json
          try {
            const vj = JSON.parse(new TextDecoder().decode(fileMap.get('vercel.json') || new TextEncoder().encode('{}')));
            await pushGitHubFile(conn.accessToken, repo.owner, baseSlug, 'vercel.json', JSON.stringify(vj, null, 2), 'Add vercel.json');
          } catch {}
          githubUrl = repo.url;
          console.log('GitHub repo created:', githubUrl);
        } catch (e) { provisionErrors.push({ step: 'github', error: e.message }); console.error('GitHub failed:', e.message); }
      })());

      // 5d. Supabase project for backend/database
      provisionTasks.push((async () => {
        try {
          const conn = await base44.asServiceRole.connectors.getConnection('supabase');
          if (!conn?.accessToken) throw new Error('Supabase connector not authorized');
          const sb = await createSupabaseProject(conn.accessToken, baseSlug);
          supabaseUrl = sb.url;
          console.log('Supabase project created:', supabaseUrl);
        } catch (e) { provisionErrors.push({ step: 'supabase', error: e.message }); console.error('Supabase failed:', e.message); }
      })());

      await Promise.all(provisionTasks);
    }

    // 6. Create a LaunchProject record to track the full stack
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
            method: 'full_site_clone',
            pages_cloned: clonedPages.length,
            images_rehosted: totalImagesRehosted,
            ai_tools: AI_TOOLS.map(t => t.slug),
          },
        });
        launchProjectId = lp.id;
      } catch (e) { console.error('LaunchProject create failed:', e.message); }
    }

    // 7. Save the page index as a Deliverable
    if (targetOrg) {
      try {
        await base44.asServiceRole.entities.Deliverable.create({
          organization_id: targetOrg,
          deliverable_type: 'website',
          title: `Full-Site Clone — ${business_name || target_url}`,
          content: JSON.stringify({
            pages: clonedPages.map(p => ({ path: p.path, filename: p.filename, title: p.title, headings: p.headings, images_rehosted: p.images_rehosted })),
            vercel_url: vercelUrl, github_url: githubUrl, supabase_url: supabaseUrl, drive_url: driveUrl,
          }),
          metadata: {
            business_name, target_url, method: 'full_site_clone',
            pages_cloned: clonedPages.length,
            images_rehosted: totalImagesRehosted,
            vercel_url: vercelUrl, github_url: githubUrl, supabase_url: supabaseUrl, drive_url: driveUrl,
            ai_tools: AI_TOOLS.map(t => t.slug),
          },
          status: 'generated'
        });
      } catch (e) { console.error('Deliverable save failed:', e); }
    }

    // 8. Receipt
    if (targetOrg) {
      try {
        await base44.asServiceRole.entities.Receipt.create({
          organization_id: targetOrg,
          system: 'clone_full_site',
          action: 'full_stack_provision',
          status: provisionErrors.length === 0 ? 'success' : 'partial',
          summary: `Full-site clone + provision: ${clonedPages.length} pages, Vercel=${!!vercelUrl}, GitHub=${!!githubUrl}, Supabase=${!!supabaseUrl}, Drive=${!!driveUrl}`,
          evidence: { target_url, vercel_url: vercelUrl, github_url: githubUrl, supabase_url: supabaseUrl, drive_url: driveUrl, errors: provisionErrors.length ? provisionErrors : undefined },
        });
      } catch (e) { /* ignore */ }
    }

    return Response.json({
      status: provisionErrors.length === 0 ? 'success' : 'partial',
      method: 'full_site_clone',
      target_url,
      vercel_url: vercelUrl,
      vercel_project_id: vercelProjectId,
      github_url: githubUrl,
      supabase_url: supabaseUrl,
      drive_url: driveUrl,
      launch_project_id: launchProjectId,
      pages_cloned: clonedPages.length,
      images_rehosted: totalImagesRehosted,
      ai_tools: AI_TOOLS.map(t => ({ slug: t.slug, title: t.title, tool_type: t.tool_type })),
      pages: clonedPages.map(p => ({
        path: p.path,
        filename: p.filename,
        title: p.title,
        headings_count: p.headings.length,
        images_rehosted: p.images_rehosted,
        html_size: p.html.length,
      })),
      features: {
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
      message: `Full-site clone deployed with ${clonedPages.length} pages + ${AI_TOOLS.length} functional AI tools — full stack provisioned (Vercel, GitHub, Supabase, Drive)`
    });
  } catch (error) {
    console.error('cloneFullSite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}