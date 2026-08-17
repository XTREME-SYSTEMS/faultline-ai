import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { scrapeWithStealth } from '../../shared/stealthBrowser.ts';
import { clonePageAssets, rewriteInternalLinks, buildSearchScript, buildStripeCheckoutScript } from '../../shared/fullSiteClone.ts';
import { buildAiToolsSidebarScript, rewriteAiToolLinks, AI_TOOLS } from '../../shared/aiToolPages.ts';

// On-demand deep path resolver. When a user hits a path on the cloned site
// that wasn't pre-crawled, the 404 page calls this function to fetch the
// ORIGINAL page from the target site, clone it on-the-fly (re-host images,
// swap branding, inject search + checkout + AI tools), and return the
// fully functional HTML. This makes EVERY path on the clone work — even
// thousands of deep category pages that were never crawled.

export default async function(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { path: rawPath, target_url, business_name, organization_id } = body;

    if (!rawPath || !target_url) {
      return Response.json({ error: 'path and target_url required' }, { status: 400, headers: corsHeaders });
    }

    // Normalize the path
    let path = rawPath.startsWith('/') ? rawPath : '/' + rawPath;
    const fullUrl = new URL(path, target_url).href;

    console.log(`resolveDeepPath: ${fullUrl}`);

    // 1. Fetch the original page via stealth browser (handles JS-heavy SPAs)
    let html = '';
    let method = 'stealth';
    try {
      const result = await scrapeWithStealth(fullUrl, {
        deepRender: true,
        timeout: 30000,
        waitAfterLoad: 3000,
        solveCaptchas: true,
        proxies: true,
      });
      if (result.ok && result.html && result.html.length > 1000) {
        html = result.html;
      }
    } catch (e) { console.error('Stealth failed:', e.message); }

    // Fallback to basic fetch
    if (html.length < 1000) {
      method = 'basic_fetch';
      const r = await fetch(fullUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(15000),
      });
      html = await r.text();
    }

    if (html.length < 500) {
      return Response.json({ error: 'Could not fetch page from target site', path, url: fullUrl }, { status: 502, headers: corsHeaders });
    }

    // 2. Clone the page (re-host images, inline CSS, swap branding, inject forms)
    const appId = Deno.env.get('BASE44_APP_ID');
    const formHandlerUrl = `https://base44.app/api/apps/${appId}/functions/ingestCloneLead`;
    const checkoutUrl = `https://base44.app/api/apps/${appId}/functions/createStoreCheckout`;
    const invokeAiUrl = `https://base44.app/api/apps/${appId}/functions/invokeAiTool`;
    const stripeProducts = [
      { id: 'ai_tool', name: 'AI Tool — Lifetime', price: 29 },
      { id: 'web_pack', name: 'Web Pack — Lifetime', price: 49 },
      { id: 'app_pack', name: 'App Pack — Lifetime', price: 99 },
      { id: 'growth', name: 'Growth Plan — Monthly', price: 299 },
      { id: 'operating', name: 'Operating System — Monthly', price: 699 },
    ];

    const { html: clonedHtml, images_rehosted } = await clonePageAssets(base44, html, {
      target_url,
      page_url: fullUrl,
      business_name: business_name || 'Creative AI Tools',
      organization_id,
      form_handler_url: formHandlerUrl,
      rehost_images: true,
      max_images: 40,
    });

    // 3. Rewrite AI tool links + inject scripts
    let finalHtml = rewriteAiToolLinks(clonedHtml);
    const searchScript = buildSearchScript([{ path, title: path, headings: [] }]);
    const checkoutScript = buildStripeCheckoutScript(checkoutUrl, stripeProducts);
    const aiSidebarScript = buildAiToolsSidebarScript();
    const inject = searchScript + '\n' + checkoutScript + '\n' + aiSidebarScript;
    if (finalHtml.includes('</body>')) {
      finalHtml = finalHtml.replace('</body>', inject + '\n</body>');
    } else {
      finalHtml += inject;
    }

    // 4. Ensure DOCTYPE
    if (!/<!doctype/i.test(finalHtml)) {
      finalHtml = '<!DOCTYPE html>\n' + finalHtml;
    }

    return Response.json({
      status: 'success',
      path,
      original_url: fullUrl,
      method,
      html: finalHtml,
      html_size: finalHtml.length,
      images_rehosted,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('resolveDeepPath error:', error);
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}