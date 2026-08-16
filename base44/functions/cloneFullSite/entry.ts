import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { crawlSiteStealth, scrapeWithStealth } from '../../shared/stealthBrowser.ts';
import { fetchPageDeep } from '../../shared/deepScraper.ts';
import { clonePageAssets, rewriteInternalLinks, pathToFilename, buildSearchScript, buildStripeCheckoutScript } from '../../shared/fullSiteClone.ts';
import { slugify, createVercelProject, disableVercelSso, deployToVercelMultiFile, sha1hex } from '../../shared/launchInfra.ts';

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
    const checkoutUrl = `https://base44.app/api/apps/${appId}/functions/createStoreCheckout`;
    const stripeProducts = [
      { id: 'ai_tool', name: 'AI Tool — Lifetime', price_id: 'prod_V2N0XL5DRE706G', price: 29 },
      { id: 'web_pack', name: 'Web Pack — Lifetime', price_id: 'prod_V2N0f5N170sW84', price: 49 },
      { id: 'app_pack', name: 'App Pack — Lifetime', price_id: 'prod_V2N0OVIKnfflwC', price: 99 },
      { id: 'growth', name: 'Growth Plan — Monthly', price_id: 'prod_UzkHKEVTvIfq7v', price: 299 },
      { id: 'operating', name: 'Operating System — Monthly', price_id: 'prod_UzkHWgaWke7ITk', price: 699 },
    ];
    const searchScript = buildSearchScript(clonedPages.map(p => ({ path: p.path, title: p.title, headings: p.headings })));
    const checkoutScript = buildStripeCheckoutScript(checkoutUrl, stripeProducts);

    for (const page of clonedPages) {
      const inject = searchScript + '\n' + checkoutScript;
      if (page.html.includes('</body>')) {
        page.html = page.html.replace('</body>', inject + '\n</body>');
      } else {
        page.html += inject;
      }
    }

    // 5. Deploy as a multi-page static site to Vercel
    let vercelUrl: string | null = null;
    let vercelProjectId: string | null = null;
    if (deploy) {
      const token = secrets.get('VERCEL_TOKEN');
      if (!token) throw new Error('VERCEL_TOKEN secret not set');
      const teamId = secrets.get('VERCEL_TEAM_ID') || null;
      const baseSlug = slugify(project_name || business_name || 'full-site-clone') || 'full-site-clone';
      console.log(`Creating Vercel project: ${baseSlug}`);
      const vProject = await createVercelProject(token, teamId, baseSlug);
      vercelProjectId = vProject.id;
      try { await disableVercelSso(token, teamId, vProject.id); } catch { /* non-fatal */ }

      // Build the file list for multi-file deployment (deduplicate by filename —
      // crawl may return /pricing and /pricing/ which both map to pricing.html)
      const fileMap = new Map<string, Uint8Array>();
      for (const page of clonedPages) {
        fileMap.set(page.filename, new TextEncoder().encode(page.html));
      }
      const files: Array<{ file: string; data: Uint8Array }> = [...fileMap.entries()].map(([file, data]) => ({ file, data }));

      // Add vercel.json with security headers + clean URL rewrites
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
        // Rewrite /path to /path.html so clean URLs work
        rewrites: clonedPages
          .filter(p => p.filename !== 'index.html')
          .map(p => ({
            source: '/' + p.filename.replace(/\.html$/, ''),
            destination: '/' + p.filename,
          })),
      });
      files.push({ file: 'vercel.json', data: new TextEncoder().encode(vercelJson) });

      console.log(`Deploying ${files.length} files to Vercel...`);
      const deploy = await deployToVercelMultiFile(token, teamId, baseSlug, vProject.id, files);
      vercelUrl = deploy.url || null;
      console.log(`Deployed to ${vercelUrl}`);
    }

    // 6. Save the page index as a Deliverable
    if (targetOrg) {
      try {
        await base44.asServiceRole.entities.Deliverable.create({
          organization_id: targetOrg,
          deliverable_type: 'website',
          title: `Full-Site Clone — ${business_name || target_url}`,
          content: JSON.stringify({
            pages: clonedPages.map(p => ({ path: p.path, filename: p.filename, title: p.title, headings: p.headings, images_rehosted: p.images_rehosted })),
            vercel_url: vercelUrl,
          }),
          metadata: {
            business_name, target_url, method: 'full_site_clone',
            pages_cloned: clonedPages.length,
            images_rehosted: totalImagesRehosted,
            vercel_url: vercelUrl,
          },
          status: 'generated'
        });
      } catch (e) { console.error('Deliverable save failed:', e); }
    }

    return Response.json({
      status: 'success',
      method: 'full_site_clone',
      target_url,
      vercel_url: vercelUrl,
      vercel_project_id: vercelProjectId,
      pages_cloned: clonedPages.length,
      images_rehosted: totalImagesRehosted,
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
      },
      message: `Full-site clone deployed with ${clonedPages.length} pages — every page, search, and checkout is functional`
    });
  } catch (error) {
    console.error('cloneFullSite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}