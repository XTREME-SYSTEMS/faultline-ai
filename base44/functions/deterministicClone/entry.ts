import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { fetchPageDeep } from '../../shared/deepScraper.ts';
import { fetchRenderedPage, fetchRenderedWithScreenshot } from '../../shared/browserbase.ts';
import { scrapeWithStealth } from '../../shared/stealthBrowser.ts';

// Deterministic clone: instead of asking an LLM to reconstruct a website from a
// screenshot (which can never achieve 100% visual parity), this function takes the
// target's ACTUAL rendered HTML + CSS + images and re-hosts them with branding
// swapped. This guarantees near-100% visual parity because we use the real design.
//
// Pipeline:
//   1. Scrape target (fully rendered HTML via Browserbase)
//   2. Fetch all linked CSS stylesheets
//   3. Extract all image URLs from HTML + CSS
//   4. Re-host images (download → upload to our storage → replace URLs)
//   5. Inline all CSS into the HTML (so the clone is self-contained)
//   6. Swap branding (business name, phone, email → client's info)
//   7. Inject form-handler script (operational parity)
//   8. Return ready-to-deploy HTML

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id || body?.organization_id;
    const body = await req.json().catch(() => ({}));
    const { target_url, business_name, client_name, client_email, client_phone, organization_id } = body;
    if (!target_url) return Response.json({ error: 'target_url required' }, { status: 400 });
    const targetOrg = organization_id || orgId;

    // 1. Scrape target — fully rendered HTML via stealth browser with deep render
    //    (scroll + lazy-load resolution + computed background extraction) to capture
    //    ALL images including JS-rendered hero backgrounds, slider content, and
    //    lazy-loaded galleries that are missing from static HTML.
    let html = '';
    let fetchMethod = 'failed';
    try {
      const stealthResult = await scrapeWithStealth(target_url, {
        deepRender: true,
        timeout: 45000,
        waitAfterLoad: 3000,
        solveCaptchas: true,
        proxies: true,
      });
      if (stealthResult.ok && stealthResult.html && stealthResult.html.length > 500) {
        html = stealthResult.html;
        fetchMethod = 'stealth';
      }
    } catch (e) { console.error('Stealth scrape failed:', e.message); }
    // Fallback to basic fetch if stealth fails
    if (html.length < 2000) {
      const basic = await fetchPageDeep(target_url, 20000);
      if (basic.html && basic.html.length > html.length) {
        html = basic.html;
        fetchMethod = basic.stealth ? 'stealth' : basic.ok ? 'basic' : 'failed';
      }
      if (html.length < 2000) {
        const rendered = await fetchRenderedPage(target_url, { timeout: 30000 });
        if (rendered && rendered.html && rendered.html.length > html.length) {
          html = rendered.html; fetchMethod = 'browserbase';
        }
      }
    }
    if (html.length < 500) return Response.json({ error: `Could not fetch target HTML (${html.length} chars)`, fetchMethod }, { status: 502 });

    // 2. Fetch all linked CSS stylesheets
    let styleText = '';
    const linkRe = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi;
    const cssUrls = []; let lm;
    while ((lm = linkRe.exec(html)) !== null) {
      try { cssUrls.push(new URL(lm[1], target_url).href); } catch {}
    }
    if (cssUrls.length > 0) {
      const cssResults = await Promise.all(cssUrls.slice(0, 12).map(async cu => {
        try {
          const cr = await fetch(cu, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal: AbortSignal.timeout(10000)
          });
          return cr.ok ? await cr.text() : '';
        } catch { return ''; }
      }));
      styleText = cssResults.join('\n');
    }
    // Resolve relative URLs in CSS to absolute (so re-host replacement works for
    // background-image URLs in external stylesheets that use relative paths)
    styleText = styleText.replace(/url\(["']?([^"')]+)["']?\)/gi, (match, url) => {
      if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return match;
      if (url.startsWith('//')) return `url(${new URL('https:' + url, target_url).href})`;
      try { return `url(${new URL(url, target_url).href})`; } catch { return match; }
    });

    // 3. Extract all image URLs from HTML + CSS + inline styles
    //    Track ALL URL variants (original string + normalized) so we can replace
    //    both versions in the HTML/CSS. new URL().href normalizes URLs (e.g.,
    //    encodes / as %2F in query params), but the HTML has the original strings.
    const imageUrls = new Set<string>();
    const urlVariants = {}; // normalized → Set of original strings
    const addImageUrl = (orig) => {
      try {
        const normalized = new URL(orig, target_url).href;
        imageUrls.add(normalized);
        if (!urlVariants[normalized]) urlVariants[normalized] = new Set();
        urlVariants[normalized].add(orig);
      } catch {}
    };
    // HTML <img src="..."> (including data-src for lazy-loaded images)
    const imgRe = /<img[^>]+(?:src|data-src|data-lazy-src|data-original)=["']([^"']+)["']/gi; let im;
    while ((im = imgRe.exec(html)) !== null) {
      if (!im[1].startsWith('data:')) addImageUrl(im[1]);
    }
    // CSS background-image: url(...) in external stylesheets
    const bgRe = /url\(["']?([^"')]+)["']?\)/gi; let bm;
    while ((bm = bgRe.exec(styleText)) !== null) {
      if (/\.(jpg|jpeg|png|gif|webp|svg|avif)/i.test(bm[1])) addImageUrl(bm[1]);
    }
    // Inline style="background-image: url(...)" in HTML (hero sections, etc.)
    const inlineBgRe = /style=["'][^"']*background-image\s*:\s*url\(["']?([^"')]+)["']?\)[^"']*["']/gi; let ibm;
    while ((ibm = inlineBgRe.exec(html)) !== null) {
      if (!ibm[1].startsWith('data:')) addImageUrl(ibm[1]);
    }
    // <source srcset="..."> and data-srcset
    const srcsetRe = /(?:srcset|data-srcset)=["']([^"']+)["']/gi; let sm;
    while ((sm = srcsetRe.exec(html)) !== null) {
      sm[1].split(',').forEach(s => {
        const u = s.trim().split(/\s+/)[0];
        if (u && !u.startsWith('data:')) addImageUrl(u);
      });
    }
    // <link rel="preload" as="image" href="...">
    const preloadRe = /<link[^>]+rel=["']preload["'][^>]+as=["']image["'][^>]+href=["']([^"']+)["']/gi; let pm;
    while ((pm = preloadRe.exec(html)) !== null) {
      if (!pm[1].startsWith('data:')) addImageUrl(pm[1]);
    }

    // 4. Re-host images (download from target → upload to our storage)
    //    Skip data: URIs, SVGs (small, keep inline), and already-our-host URLs.
    //    Decode Next.js Image Optimization URLs (/_next/image?url=<real_path>&w=...&q=...)
    //    to fetch the underlying image directly from the target's CDN.
    const rehostMap = {}; // original URL → our URL
    const decodeNextImage = (u: string): string => {
      try {
        const parsed = new URL(u);
        if (parsed.pathname.startsWith('/_next/image')) {
          const inner = parsed.searchParams.get('url');
          if (inner) return new URL(inner, target_url).href; // decode the real image path
        }
        return u;
      } catch { return u; }
    };
    const imagesToRehost = [...imageUrls].filter(u =>
      !u.startsWith('data:') && !u.startsWith('blob:') &&
      !/\.svg$/i.test(u) &&
      !/media\.base44\.com|static\.wixstatic\.com/.test(u)
    );
    console.log(`Re-hosting ${imagesToRehost.length} images from ${target_url}`);

    // Process in batches of 5 to avoid overwhelming storage
    for (let i = 0; i < imagesToRehost.length; i += 5) {
      const batch = imagesToRehost.slice(i, i + 5);
      await Promise.all(batch.map(async (imgUrl) => {
        try {
          // Decode Next.js image optimizer URL to fetch the real image directly
          const fetchUrl = decodeNextImage(imgUrl);
          const ir = await fetch(fetchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
              'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              'Referer': target_url,
              'Sec-Fetch-Dest': 'image',
              'Sec-Fetch-Mode': 'no-cors',
              'Sec-Fetch-Site': 'cross-site'
            },
            signal: AbortSignal.timeout(15000),
            redirect: 'follow'
          });
          if (!ir.ok) { console.error(`Re-host ${ir.status} for ${fetchUrl.slice(0, 80)}`); return; }
          const ct = ir.headers.get('content-type') || 'image/jpeg';
          if (!ct.startsWith('image/')) { console.error(`Not image (${ct}) for ${fetchUrl.slice(0, 80)}`); return; }
          const buf = await ir.arrayBuffer();
          if (buf.byteLength < 100) return; // skip tiny/empty responses
          const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : ct.includes('gif') ? 'gif' : ct.includes('svg') ? 'svg' : 'jpg';
          const filename = `clone-img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const file = new File([buf], filename, { type: ct });
          const upload = await base44.integrations.Core.UploadFile({ file });
          if (upload?.file_url) rehostMap[imgUrl] = upload.file_url;
        } catch (e) { console.error(`Re-host failed for ${imgUrl.slice(0, 80)}: ${e.message}`); }
      }));
    }
    const rehostedCount = Object.keys(rehostMap).length;
    console.log(`Re-hosted ${rehostedCount}/${imagesToRehost.length} images`);

    // 5. Replace all image URLs in HTML + CSS with our hosted versions
    //    Expand the rehost map with ALL original URL variants (the HTML/CSS may
    //    contain the original non-normalized URL string, the normalized version,
    //    or a relative path — all must map to the same re-hosted URL).
    //    Sort by length (longest first) so absolute URLs are replaced BEFORE
    //    relative paths — prevents malformed URLs like https://target.comhttps://ours.com
    const expandedRehostMap = {};
    for (const [normalized, ours] of Object.entries(rehostMap)) {
      expandedRehostMap[normalized] = ours;
      const variants = urlVariants[normalized];
      if (variants) {
        for (const orig of variants) {
          if (orig !== normalized) expandedRehostMap[orig] = ours;
        }
      }
      // DON'T add the relative path (pathname + search) as a separate key —
      // it can match inside absolute URLs and create malformed URLs like
      // https://target.comhttps://ours.com. The original URL strings from
      // urlVariants already cover both absolute and relative forms.
    }
    const sortedKeys = Object.keys(expandedRehostMap).sort((a, b) => b.length - a.length);
    let clonedHtml = html;
    let clonedCss = styleText;
    for (const orig of sortedKeys) {
      const ours = expandedRehostMap[orig];
      clonedHtml = clonedHtml.split(orig).join(ours);
      clonedCss = clonedCss.split(orig).join(ours);
    }
    // Handle relative URLs in srcset/data-srcset that weren't caught by the absolute URL replacement
    clonedHtml = clonedHtml.replace(/(srcset|data-srcset)="([^"]+)"/g, (match, attr, val) => {
      return attr + '="' + val.split(',').map(s => {
        const parts = s.trim().split(/\s+/);
        const u = parts[0];
        try { const abs = new URL(u, target_url).href; return (expandedRehostMap[abs] || expandedRehostMap[u] || abs) + (parts[1] ? ' ' + parts[1] : ''); }
        catch { return s; }
      }).join(', ') + '"';
    });
    // Handle lazy-loaded images: copy data-src to src if src is empty/placeholder
    clonedHtml = clonedHtml.replace(/<img([^>]*?)data-src=["']([^"']+)["']([^>]*?)>/gi, (match, before, dataSrc, after) => {
      if (/src=["']([^"']+)["']/.test(before + after)) return match; // already has src
      return '<img' + before + 'src="' + dataSrc + '"' + after + '>';
    });

    // 6. Inline all CSS into the HTML (self-contained clone)
    //    Remove the <link rel="stylesheet"> tags and inject a single <style> block
    clonedHtml = clonedHtml.replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, '');
    if (clonedCss.trim()) {
      const styleTag = `<style>\n/* Inlined from target stylesheets */\n${clonedCss}\n</style>`;
      clonedHtml = clonedHtml.includes('</head>')
        ? clonedHtml.replace('</head>', styleTag + '\n</head>')
        : styleTag + clonedHtml;
    }

    // 7. Swap branding (business name, phone, email)
    //    Extract the target's brand name from <title> for accurate replacement
    const titleMatch = clonedHtml.match(/<title>([^<]+)<\/title>/i);
    const targetBrand = titleMatch
      ? (titleMatch[1].includes('|') ? titleMatch[1].split('|').pop().trim() : titleMatch[1].split(/[–—-]/)[0].trim())
      : '';
    if (targetBrand && business_name) {
      // Replace brand name in text content (case-insensitive, whole word)
      const brandRe = new RegExp(targetBrand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      clonedHtml = clonedHtml.replace(brandRe, business_name);
    }
    // Swap phone number
    const phoneMatch = clonedHtml.match(/(\+?1[-.\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/);
    if (phoneMatch && client_phone) {
      clonedHtml = clonedHtml.split(phoneMatch[0]).join(client_phone);
    }
    // Swap email
    const emailMatch = clonedHtml.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch && client_email) {
      clonedHtml = clonedHtml.split(emailMatch[0]).join(client_email);
    }

    // 8. Inject form-handler script (operational parity)
    //    Replaces any existing form action with our handler, adds the script
    const appId = Deno.env.get('BASE44_APP_ID');
    const handlerUrl = `https://base44.app/api/apps/${appId}/functions/ingestCloneLead`;
    const formScript = `<script>
(function(){
  var HANDLER='${handlerUrl}';
  var ORG='${targetOrg || ''}';
  var CLONE=window.location.href;
  document.querySelectorAll('form').forEach(function(f){
    f.setAttribute('action',HANDLER);
    f.setAttribute('method','POST');
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var data={organization_id:ORG,clone_id:CLONE,source_url:CLONE};
      var fd=new FormData(f);
      fd.forEach(function(v,k){
        if(typeof v==='string')data[k]=v;
      });
      if(!data.name&&data.Name)data.name=data.Name;
      if(!data.email&&data.Email)data.email=data.Email;
      if(!data.message&&data.Message)data.message=data.Message;
      if(!data.message&&(data.comments||data.comment))data.message=data.comments||data.comment;
      fetch(HANDLER,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
        .then(function(r){return r.json();})
        .then(function(j){
          if(j.ok){
            f.reset();
            var msg=document.createElement('div');
            msg.textContent='Thank you! We\\'ll be in touch shortly.';
            msg.style.cssText='padding:15px;background:#d4edda;color:#155724;border-radius:6px;margin-top:10px;font-family:sans-serif;';
            f.appendChild(msg);
            setTimeout(function(){msg.remove();},5000);
          }
        })
        .catch(function(){});
    });
  });
})();
</script>`;
    // Inject before </body> (or append at end)
    if (clonedHtml.includes('</body>')) {
      clonedHtml = clonedHtml.replace('</body>', formScript + '\n</body>');
    } else {
      clonedHtml += formScript;
    }

    // 9. Remove ALL external scripts. The deep render already captured the fully
    //    rendered DOM (all JS-rendered content is in the HTML). Keeping external
    //    scripts (especially Next.js bundles) causes re-hydration which injects
    //    different content than the captured DOM — creating visual artifacts like
    //    extra icons, wrong backgrounds, and mismatched elements. A static snapshot
    //    of the rendered DOM achieves higher visual parity than a re-hydrated page.
    clonedHtml = clonedHtml.replace(/<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi, (match, src) => {
      if (src.includes('ingestCloneLead')) return match; // keep our form handler
      return ''; // remove all external scripts
    });

    // Add DOCTYPE if missing (stealth browser returns document.documentElement.outerHTML
    // which doesn't include the DOCTYPE declaration — without it, browsers render in
    // quirks mode which breaks modern CSS layout)
    if (!/<!doctype/i.test(clonedHtml)) {
      clonedHtml = '<!DOCTYPE html>\n' + clonedHtml;
    }

    // 10. Save as Deliverable
    let fileUrl = null;
    try {
      const fileObj = new File([clonedHtml], 'index.html', { type: 'text/html' });
      const upload = await base44.integrations.Core.UploadFile({ file: fileObj });
      fileUrl = upload?.file_url || null;
    } catch (e) { console.error('deterministicClone upload failed:', e); }

    if (targetOrg) {
      try {
        await base44.asServiceRole.entities.Deliverable.create({
          organization_id: targetOrg,
          deliverable_type: 'website',
          title: `Deterministic Clone — ${business_name || target_url}`,
          content: fileUrl ? '' : clonedHtml.slice(0, 5000),
          file_url: fileUrl,
          metadata: {
            business_name, target_url, method: 'deterministic',
            images_rehosted: rehostedCount, images_total: imagesToRehost.length,
            fetch_method: fetchMethod, html_chars: clonedHtml.length
          },
          status: 'generated'
        });
      } catch (e) { console.error('Deliverable save failed:', e); }
    }

    return Response.json({
      status: 'success',
      method: 'deterministic',
      website_html: clonedHtml,
      file_url: fileUrl,
      target_url,
      business_name,
      images_rehosted: rehostedCount,
      images_total: imagesToRehost.length,
      fetch_method: fetchMethod,
      html_chars: clonedHtml.length,
      message: 'Deterministic clone built from target\'s actual HTML + CSS + images'
    });
  } catch (error) {
    console.error('deterministicClone error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}