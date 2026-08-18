// Full-site clone utilities — per-page asset re-hosting, CSS inlining, branding
// swap, and link rewriting for multi-page static site cloning.
// Extracted from deterministicClone so both single-page and multi-page clone
// engines share the same proven asset pipeline.

export interface ClonePageOptions {
  target_url: string;       // the original site's root URL (for resolving relative URLs)
  page_url: string;         // the specific page being cloned
  business_name?: string;   // brand name to swap in
  client_email?: string;
  client_phone?: string;
  organization_id?: string;
  form_handler_url?: string; // if provided, inject form handler script
  link_rewrite_map?: Map<string, string>; // original path → cloned path (e.g. /pricing → /pricing.html)
  rehost_images?: boolean;  // default true
  max_images?: number;      // cap per page (default 60)
}

export interface ClonedPage {
  path: string;             // e.g. "/", "/pricing", "/about"
  filename: string;         // e.g. "index.html", "pricing.html"
  html: string;
  images_rehosted: number;
  images_total: number;
  fetch_method: string;
}

// Derive a filename from a URL path.
// "/" → "index.html", "/pricing" → "pricing.html", "/blog/post-1" → "blog/post-1.html"
export function pathToFilename(path: string): string {
  if (!path || path === '/') return 'index.html';
  let clean = path.replace(/^\//, '').replace(/\/$/, '');
  // Remove query strings and fragments
  clean = clean.split('?')[0].split('#')[0];
  if (!clean) return 'index.html';
  // If it doesn't end with .html, add it
  if (!/\.(html?|php|aspx?)$/i.test(clean)) {
    return clean + '.html';
  }
  return clean.replace(/\.(php|aspx?)$/i, '.html');
}

// Rewrite internal links to point to cloned .html files.
// /pricing → /pricing.html, /about → /about.html, etc.
// External links and hash links are left as-is.
export function rewriteInternalLinks(html: string, linkMap: Map<string, string>): string {
  if (!linkMap || linkMap.size === 0) return html;
  return html.replace(/href=["']([^"']+)["']/gi, (match, href) => {
    // Skip external links, mailto, tel, hash-only, and javascript:
    if (/^(https?:)?\/\//i.test(href) || /^(mailto|tel|javascript):/i.test(href) || href.startsWith('#') || href.startsWith('data:')) {
      return match;
    }
    // Parse the path
    try {
      const url = new URL(href, 'http://dummy.local');
      const path = url.pathname;
      // Check if we have a cloned page for this path
      const clonedPath = linkMap.get(path) || linkMap.get(path.replace(/\/$/, ''));
      if (clonedPath) {
        // Preserve query params and hash
        const qs = url.search || '';
        const hash = url.hash || '';
        return `href="${clonedPath}${qs}${hash}"`;
      }
      // If it's a known route pattern we didn't crawl, leave it pointing to the
      // original site so it doesn't 404 on the static clone
      return match;
    } catch {
      return match;
    }
  });
}

// Re-host images from a page's HTML + CSS, inline CSS, swap branding, and
// inject the form handler. Returns the fully cloned HTML ready for deployment.
export async function clonePageAssets(
  base44: any,
  pageHtml: string,
  opts: ClonePageOptions
): Promise<{ html: string; images_rehosted: number; images_total: number }> {
  const targetUrl = opts.target_url;
  const pageUrl = opts.page_url;
  let html = pageHtml;
  let imagesRehosted = 0;
  let imagesTotal = 0;

  // 1. Fetch all linked CSS stylesheets
  let styleText = '';
  const linkTagRe = /<link[^>]+rel=["']stylesheet["'][^>]*>/gi;
  const cssUrls: string[] = [];
  let lm;
  while ((lm = linkTagRe.exec(html)) !== null) {
    const hrefMatch = lm[0].match(/href=["']([^"']+)["']/i);
    if (hrefMatch) {
      try { cssUrls.push(new URL(hrefMatch[1], pageUrl).href); } catch {}
    }
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
  // Resolve relative URLs in CSS to absolute
  styleText = styleText.replace(/url\(["']?([^"')]+)["']?\)/gi, (match, url) => {
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return match;
    if (url.startsWith('//')) return `url(${new URL('https:' + url, targetUrl).href})`;
    try { return `url(${new URL(url, targetUrl).href})`; } catch { return match; }
  });

  // 2. Extract all image URLs from HTML + CSS + inline styles
  if (opts.rehost_images !== false) {
    const imageUrls = new Set<string>();
    const urlVariants: Record<string, Set<string>> = {};
    const addImageUrl = (orig: string) => {
      try {
        const normalized = new URL(orig, pageUrl).href;
        imageUrls.add(normalized);
        if (!urlVariants[normalized]) urlVariants[normalized] = new Set();
        urlVariants[normalized].add(orig);
      } catch {}
    };
    // HTML <img src="...">
    const imgRe = /<img[^>]+(?:src|data-src|data-lazy-src|data-original)=["']([^"']+)["']/gi;
    let im;
    while ((im = imgRe.exec(html)) !== null) {
      if (!im[1].startsWith('data:')) addImageUrl(im[1]);
    }
    // CSS url(...) in external stylesheets (images + fonts)
    const bgRe = /url\(["']?([^"')]+)["']?\)/gi;
    let bm;
    while ((bm = bgRe.exec(styleText)) !== null) {
      if (/\.(jpg|jpeg|png|gif|webp|svg|avif|woff|woff2|ttf|eot|otf)/i.test(bm[1])) addImageUrl(bm[1]);
    }
    // Inline style="background-image: url(...)"
    const inlineBgRe = /style=["'][^"']*background(?:-image)?\s*:\s*[^;"']*?url\(["']?([^"')]+)["']?\)[^"']*["']/gi;
    let ibm;
    while ((ibm = inlineBgRe.exec(html)) !== null) {
      if (!ibm[1].startsWith('data:')) addImageUrl(ibm[1]);
    }
    // srcset / data-srcset
    const srcsetRe = /(?:srcset|data-srcset)=["']([^"']+)["']/gi;
    let sm;
    while ((sm = srcsetRe.exec(html)) !== null) {
      sm[1].split(',').forEach(s => {
        const u = s.trim().split(/\s+/)[0];
        if (u && !u.startsWith('data:')) addImageUrl(u);
      });
    }
    // <link rel="preload" as="image" href="...">
    const preloadRe = /<link[^>]+rel=["']preload["'][^>]+as=["']image["'][^>]+href=["']([^"']+)["']/gi;
    let pm;
    while ((pm = preloadRe.exec(html)) !== null) {
      if (!pm[1].startsWith('data:')) addImageUrl(pm[1]);
    }
    // <video poster="..."> and <video src="...">
    const videoPosterRe = /<video[^>]+poster=["']([^"']+)["']/gi;
    let vpm;
    while ((vpm = videoPosterRe.exec(html)) !== null) {
      if (!vpm[1].startsWith('data:')) addImageUrl(vpm[1]);
    }

    // 3. Re-host images (download → upload to our storage)
    const decodeNextImage = (u: string): string => {
      try {
        const parsed = new URL(u);
        if (parsed.pathname.startsWith('/_next/image')) {
          const inner = parsed.searchParams.get('url');
          if (inner) return new URL(inner, targetUrl).href;
        }
        return u;
      } catch { return u; }
    };
    let imagesToRehost = [...imageUrls].filter(u =>
      !u.startsWith('data:') && !u.startsWith('blob:') &&
      !/\.svg$/i.test(u) &&
      !/media\.base44\.com|static\.wixstatic\.com/.test(u)
    );
    const MAX_IMAGES = opts.max_images || 60;
    if (imagesToRehost.length > MAX_IMAGES) {
      imagesToRehost = imagesToRehost.slice(0, MAX_IMAGES);
    }
    imagesTotal = imagesToRehost.length;

    const rehostMap: Record<string, string> = {};
    for (let i = 0; i < imagesToRehost.length; i += 10) {
      const batch = imagesToRehost.slice(i, i + 10);
      await Promise.all(batch.map(async (imgUrl) => {
        try {
          const fetchUrl = decodeNextImage(imgUrl);
          const ir = await fetch(fetchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
              'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              'Referer': pageUrl,
            },
            signal: AbortSignal.timeout(8000),
            redirect: 'follow'
          });
          if (!ir.ok) return;
          const ct = ir.headers.get('content-type') || 'application/octet-stream';
          const isFont = ct.startsWith('font/') || /font|woff|ttf|otf|eot/i.test(ct);
          if (!ct.startsWith('image/') && !ct.startsWith('video/') && !isFont) {
            if (!/\.(woff2?|ttf|eot|otf|jpg|jpeg|png|gif|webp|svg|avif|mp4|webm)/i.test(fetchUrl)) return;
          }
          const buf = await ir.arrayBuffer();
          if (buf.byteLength < 100) return;
          const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : ct.includes('gif') ? 'gif'
            : ct.includes('svg') ? 'svg' : ct.includes('mp4') ? 'mp4' : ct.includes('webm') ? 'webm'
            : ct.includes('woff2') || /\.woff2/i.test(fetchUrl) ? 'woff2'
            : ct.includes('woff') || /\.woff/i.test(fetchUrl) ? 'woff'
            : ct.includes('ttf') || /\.ttf/i.test(fetchUrl) ? 'ttf'
            : 'jpg';
          const filename = `clone-img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const file = new File([buf], filename, { type: ct });
          const upload = await base44.integrations.Core.UploadFile({ file });
          if (upload?.file_url) rehostMap[imgUrl] = upload.file_url;
        } catch (e) { /* best-effort */ }
      }));
    }
    imagesRehosted = Object.keys(rehostMap).length;

    // 4. Replace all image URLs in HTML + CSS with our hosted versions
    const expandedRehostMap: Record<string, string> = {};
    for (const [normalized, ours] of Object.entries(rehostMap)) {
      expandedRehostMap[normalized] = ours;
      const variants = urlVariants[normalized];
      if (variants) {
        for (const orig of variants) {
          if (orig !== normalized) expandedRehostMap[orig] = ours;
        }
      }
    }
    const sortedKeys = Object.keys(expandedRehostMap).sort((a, b) => b.length - a.length);
    for (const orig of sortedKeys) {
      const ours = expandedRehostMap[orig];
      html = html.split(orig).join(ours);
      styleText = styleText.split(orig).join(ours);
    }
    // Handle srcset relative URLs
    html = html.replace(/(srcset|data-srcset)="([^"]+)"/g, (match, attr, val) => {
      return attr + '="' + val.split(',').map(s => {
        const parts = s.trim().split(/\s+/);
        const u = parts[0];
        try { const abs = new URL(u, pageUrl).href; return (expandedRehostMap[abs] || expandedRehostMap[u] || abs) + (parts[1] ? ' ' + parts[1] : ''); }
        catch { return s; }
      }).join(', ') + '"';
    });
    // Promote data-src to src for lazy-loaded images
    html = html.replace(/<img([^>]*?)data-src=["']([^"']+)["']([^>]*?)>/gi, (match, before, dataSrc, after) => {
      if (/src=["']([^"']+)["']/.test(before + after)) return match;
      return '<img' + before + 'src="' + dataSrc + '"' + after + '>';
    });
  }

  // 5. Inline all CSS into the HTML (self-contained clone)
  html = html.replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, '');
  if (styleText.trim()) {
    const styleTag = `<style>\n/* Inlined from target stylesheets */\n${styleText}\n</style>`;
    html = html.includes('</head>')
      ? html.replace('</head>', styleTag + '\n</head>')
      : styleTag + html;
  }

  // 6. Swap branding
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const targetBrand = titleMatch
    ? (titleMatch[1].includes('|') ? titleMatch[1].split('|').pop().trim() : titleMatch[1].split(/[–—-]/)[0].trim())
    : '';
  if (targetBrand && opts.business_name && targetBrand.length > 2) {
    const brandRe = new RegExp(targetBrand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    html = html.replace(/>([^<]+)</g, (match: string, text: string) => {
      return '>' + text.replace(brandRe, opts.business_name!) + '<';
    });
  }

  // 7. Replace contact info
  if (opts.client_phone) {
    const phoneRegex = /(\+?1[-.\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/g;
    const phoneSet = new Set<string>();
    let pmg;
    while ((pmg = phoneRegex.exec(html)) !== null) {
      const digits = pmg[0].replace(/\D/g, '');
      if (digits.length >= 10 && digits.length <= 11) phoneSet.add(pmg[0]);
    }
    for (const phone of phoneSet) {
      html = html.split(phone).join(opts.client_phone);
    }
    html = html.replace(/href=["']tel:[^"']*["']/gi, `href="tel:${opts.client_phone.replace(/[^\d+]/g, '')}"`);
  }
  if (opts.client_email) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailSet = new Set<string>();
    let emg;
    while ((emg = emailRegex.exec(html)) !== null) {
      if (!/\.(js|css|png|jpg|svg)$/i.test(emg[0])) emailSet.add(emg[0]);
    }
    for (const email of emailSet) {
      html = html.split(email).join(opts.client_email);
    }
    html = html.replace(/href=["']mailto:[^"']*["']/gi, `href="mailto:${opts.client_email}"`);
  }

  // 8. Inject form handler
  if (opts.form_handler_url) {
    const formScript = `<script>
(function(){
  var HANDLER='${opts.form_handler_url}';
  var ORG='${opts.organization_id || ''}';
  var CLONE=window.location.href;
  document.querySelectorAll('form').forEach(function(f){
    f.setAttribute('action',HANDLER);
    f.setAttribute('method','POST');
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var data={organization_id:ORG,clone_id:CLONE,source_url:CLONE};
      var fd=new FormData(f);
      fd.forEach(function(v,k){if(typeof v==='string')data[k]=v;});
      if(!data.name&&data.Name)data.name=data.Name;
      if(!data.email&&data.Email)data.email=data.Email;
      if(!data.message&&data.Message)data.message=data.Message;
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
    if (html.includes('</body>')) {
      html = html.replace('</body>', formScript + '\n</body>');
    } else {
      html += formScript;
    }
  }

  // 9. Remove ALL original-site scripts — SPA bundles, hydration data, analytics.
  // We inject our own functional scripts (search, checkout, forms, AI tools), so
  // keeping the original site's JS only causes React hydration errors and breaks
  // the static clone. Strip every external script from the target domain + its
  // asset CDNs, plus all inline hydration/analytics blobs.
  let targetOrigin: string;
  try { targetOrigin = new URL(targetUrl).origin; } catch { targetOrigin = ''; }
  const targetHost = targetOrigin ? new URL(targetUrl).hostname.replace(/^www\./, '') : '';
  // Strip ALL external <script src="..."> tags from the target domain or its asset hosts
  html = html.replace(/<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi, (match, src) => {
    const lower = src.toLowerCase();
    // Always strip known tracking/analytics
    const trackingPatterns = [
      'google-analytics.com', 'googletagmanager.com', 'connect.facebook.net',
      'static.hotjar.com', 'cdn.mxpnl.com', 'cdn.segment.com', 'snap.licdn.com',
      'bat.bing.com', 'platform.twitter.com', 'platform.linkedin.com',
      'adservice.google.com', 'doubleclick.net', 'widget.trustpilot.com',
      'consent.cookiebot.com', 'cdn.cookiebot.com'
    ];
    if (trackingPatterns.some(p => lower.includes(p))) return '';
    // Strip scripts from the target site's own domain or any subdomain of its root domain
    if (targetHost) {
      const rootDomain = targetHost.split('.').slice(-2).join('.');
      if (lower.includes(rootDomain)) return '';
    }
    // Strip _next/static and _nuxt paths (SPA bundles)
    if (lower.includes('/_next/') || lower.includes('/_nuxt/')) return '';
    return match;
  });
  // Strip ALL inline scripts that contain hydration data, React bootstrap, or
  // SPA initialization code — these try to hydrate a React app that no longer has
  // its data, causing "something went wrong" error boundaries.
  html = html.replace(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*>[\s\S]*?__NEXT_DATA__[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*>[\s\S]*?__NUXT__[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*>[\s\S]*?__INITIAL_STATE__[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*>[\s\S]*?__APOLLO_STATE__[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*>[\s\S]*?window\.__NEXT_DATA__[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*>[\s\S]*?gtag\('js'[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*>[\s\S]*?fbq\('init'[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*>[\s\S]*?dataLayer[\s\S]*?<\/script>/gi, '');
  // Strip empty inline scripts (leftover from previous stripping)
  html = html.replace(/<script\s*>\s*<\/script>/gi, '');

  // 10. Meta tag sanitization
  html = html.replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '');
  html = html.replace(/<meta[^>]+property=["']og:url["'][^>]*>/gi, '');

  // 10b. Ensure every page has a <title> tag — many SPA sites set the title via
  //      JavaScript (which we strip), leaving the cloned page titleless. If
  //      missing, add one derived from the page path + business name.
  if (!/<title>[^<]+<\/title>/i.test(html)) {
    let titlePath = '';
    try { titlePath = new URL(pageUrl).pathname.replace(/^\//, '').replace(/\/$/, '').replace(/-/g, ' '); } catch {}
    const titleText = titlePath
      ? titlePath.charAt(0).toUpperCase() + titlePath.slice(1)
      : (opts.business_name || 'Home');
    const titleTag = `<title>${titleText}</title>`;
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, m => m + '\n' + titleTag);
    } else if (/<html[^>]*>/i.test(html)) {
      html = html.replace(/<html[^>]*>/i, m => m + '\n<head>' + titleTag + '</head>');
    } else {
      html = '<head>' + titleTag + '</head>\n' + html;
    }
  }

  // Add DOCTYPE if missing
  if (!/<!doctype/i.test(html)) {
    html = '<!DOCTYPE html>\n' + html;
  }

  return { html, images_rehosted: imagesRehosted, images_total: imagesTotal };
}

// Build a form-handler script that intercepts all form submissions and POSTs
// them to the ingestCloneLead backend function. Extracted here so both the
// static-page pipeline (clonePageAssets) and RSC-page pipeline can use it.
export function buildFormHandlerScript(formHandlerUrl: string, organizationId: string): string {
  return `<script>
(function(){
  var HANDLER='${formHandlerUrl}';
  var ORG='${organizationId || ''}';
  var CLONE=window.location.href;
  document.querySelectorAll('form').forEach(function(f){
    if(f.dataset.flWired)return;f.dataset.flWired='1';
    f.setAttribute('action',HANDLER);
    f.setAttribute('method','POST');
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var data={organization_id:ORG,clone_id:CLONE,source_url:CLONE};
      var fd=new FormData(f);
      fd.forEach(function(v,k){if(typeof v==='string')data[k]=v;});
      if(!data.name&&data.Name)data.name=data.Name;
      if(!data.email&&data.Email)data.email=data.Email;
      if(!data.message&&data.Message)data.message=data.Message;
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
}

// Build a client-side search script that indexes all cloned pages and provides
// a functional search experience on the static clone. The search index is built
// from the page titles and headings extracted during crawling.
export function buildSearchScript(pageIndex: Array<{ path: string; title: string; headings: string[] }>): string {
  const index = pageIndex.map(p => ({
    path: p.path,
    title: p.title || p.path,
    headings: p.headings || [],
    text: ((p.title || '') + ' ' + (p.headings || []).join(' ')).toLowerCase()
  }));
  return `<script>
(function(){
  var SEARCH_INDEX=${JSON.stringify(index)};
  var searchInputs=document.querySelectorAll('input[type="search"], input[placeholder*="earch" i], input[aria-label*="earch" i]');
  if(searchInputs.length===0)return;
  searchInputs.forEach(function(input){
    var results=document.createElement('div');
    results.style.cssText='position:absolute;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.12);max-height:400px;overflow:auto;z-index:9999;display:none;margin-top:4px;';
    input.parentElement.style.position='relative';
    input.parentElement.appendChild(results);
    input.addEventListener('input',function(){
      var q=input.value.trim().toLowerCase();
      if(q.length<2){results.style.display='none';return;}
      var matches=SEARCH_INDEX.filter(function(p){
        return p.text.indexOf(q)>=0||p.headings.some(function(h){return h.toLowerCase().indexOf(q)>=0;});
      }).slice(0,8);
      if(matches.length===0){results.style.display='none';return;}
      results.innerHTML=matches.map(function(m){
        return '<a href="'+m.path.replace(/^\\//,'')+'.html" style="display:block;padding:10px 14px;border-bottom:1px solid #eee;text-decoration:none;color:#111;font-size:14px;">'+
        '<b>'+m.title+'</b><br><small style="color:#888;">'+m.headings.slice(0,2).join(' · ')+'</small></a>';
      }).join('');
      results.style.display='block';
    });
    input.addEventListener('blur',function(){setTimeout(function(){results.style.display='none';},200);});
  });
})();
</script>`;
}

// Build a Supabase form-wiring script that intercepts all form submissions
// on the cloned site and POSTs them directly to the IBEAM Supabase leads table.
// This gives every clone a working backend for lead capture — no server needed.
export function buildSupabaseFormScript(supabaseUrl: string, supabaseAnonKey: string): string {
  return `<script>
(function(){
  var SB_URL='${supabaseUrl}';
  var SB_KEY='${supabaseAnonKey}';
  var CLONE_URL=window.location.href;
  document.querySelectorAll('form').forEach(function(f){
    if(f.dataset.sbWired)return;f.dataset.sbWired='1';
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var fd=new FormData(f);
      var data={clone_url:CLONE_URL,source:'clone'};
      fd.forEach(function(v,k){if(typeof v==='string')data[k]=v;});
      // Normalize common field names
      if(!data.full_name&&(data.name||data.Name||data['full-name']))data.full_name=data.name||data.Name||data['full-name'];
      if(!data.email&&data.Email)data.email=data.Email;
      if(!data.phone&&data.Phone)data.phone=data.Phone;
      if(!data.company&&data.Company)data.company=data.Company;
      if(!data.message&&(data.Message||data.comments||data.message_body))data.message=data.Message||data.comments||data.message_body;
      fetch(SB_URL+'/rest/v1/leads',{
        method:'POST',
        headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'return=representation'},
        body:JSON.stringify(data)
      }).then(function(r){return r.json();}).then(function(){
        f.reset();
        var msg=document.createElement('div');
        msg.textContent='Thank you! We\\'ll be in touch shortly.';
        msg.style.cssText='padding:15px;background:#d4edda;color:#155724;border-radius:6px;margin-top:10px;font-family:sans-serif;';
        f.appendChild(msg);
        setTimeout(function(){msg.remove();},5000);
      }).catch(function(){});
    });
  });
})();
</script>`;
}

// Build a catalog injection script that fetches assets from getEnvatoCatalog
// and renders them into the cloned site's asset grids. This gives the clone
// a functional, populated catalog — 963+ assets across all Envato Elements
// categories (graphic templates, video templates, fonts, photos, etc.).
// The script replaces empty asset grids with real catalog data and wires
// each asset card to the checkout flow with the asset_id for fulfillment.
export function buildCatalogScript(catalogApiUrl: string, checkoutUrl: string): string {
  return `<script>
(function(){
  var CATALOG_API='${catalogApiUrl}';
  var CHECKOUT_URL='${checkoutUrl}';
  var loadedCategories = {};

  function fetchCatalog(params) {
    var qs = Object.keys(params).map(function(k){return k+'='+encodeURIComponent(params[k]);}).join('&');
    return fetch(CATALOG_API+'?'+qs).then(function(r){return r.json();});
  }

  function assetCard(asset) {
    var priceLabel = asset.license_type === 'subscription' ? 'Included in subscription' : '$' + asset.price;
    var rating = asset.rating ? '<div style="color:#FFD700;font-size:11px;">★ ' + asset.rating + ' (' + asset.rating_count + ')</div>' : '';
    var downloads = asset.downloads_count ? '<div style="color:#888;font-size:11px;">' + asset.downloads_count + ' downloads</div>' : '';
    var badge = asset.featured ? '<div style="position:absolute;top:8px;left:8px;background:#FFD700;color:#111;padding:3px 8px;border-radius:4px;font-size:9px;font-weight:700;">FEATURED</div>' : '';
    var img = asset.thumbnail_url || '';
    return '<div style="background:#161616;border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;cursor:pointer;transition:transform .15s;" onmouseover="this.style.transform=\\'translateY(-2px)\\'" onmouseout="this.style.transform=\\'none\\'" data-asset-id="' + asset.id + '" data-asset-name="' + asset.name.replace(/"/g, '&quot;') + '">' +
      '<div style="position:relative;aspect-ratio:4/3;overflow:hidden;background:#0d0d0d;">' + badge +
        '<img src="' + img + '" alt="' + asset.name.replace(/"/g, '&quot;') + '" style="width:100%;height:100%;object-fit:cover;" loading="lazy" onerror="this.style.display=\\'none\\'">' +
      '</div>' +
      '<div style="padding:10px;">' +
        '<div style="font-size:12px;font-weight:600;color:#fff;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + asset.name + '</div>' +
        '<div style="font-size:10px;color:#888;margin-bottom:4px;">' + (asset.subcategory || asset.category) + '</div>' +
        rating + downloads +
        '<div style="font-size:11px;color:#4a9eff;font-weight:600;margin-top:6px;">' + priceLabel + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderGrid(container, assets) {
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;padding:16px;';
    for (var i = 0; i < assets.length; i++) {
      grid.innerHTML += assetCard(assets[i]);
    }
    container.innerHTML = '';
    container.appendChild(grid);
    // Wire click → checkout with asset_id
    grid.querySelectorAll('[data-asset-id]').forEach(function(card) {
      card.addEventListener('click', function() {
        var assetId = this.getAttribute('data-asset-id');
        var assetName = this.getAttribute('data-asset-name');
        if (window.self !== window.top) { alert('Checkout works only from the published app. Please open this site in a new tab.'); return; }
        fetch(CHECKOUT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [{ name: assetName, amount: 29, quantity: 1, type: 'ai_tool', asset_id: assetId }] })
        }).then(function(r) { return r.json(); }).then(function(j) {
          if (j.url) window.location.href = j.url;
          else alert('Could not start checkout. ' + (j.error || 'Please try again.'));
        }).catch(function() { alert('Checkout error. Please try again.'); });
      });
    });
  }

  function loadCategoryIntoGrids(category) {
    if (loadedCategories[category]) return;
    loadedCategories[category] = true;
    fetchCatalog({ action: 'browse', category: category, limit: 24 }).then(function(data) {
      if (!data.assets || data.assets.length === 0) return;
      // Find asset grid containers on the page that correspond to this category
      var grids = document.querySelectorAll('[data-category="' + category + '"], [class*="' + category.replace(/_/g, '-') + '"]');
      if (grids.length === 0) {
        // Fallback: find any empty grid containers
        grids = document.querySelectorAll('[class*="grid"], [class*="Grid"]');
        grids = Array.from(grids).filter(function(g) { return g.children.length === 0 || g.children.length < 3; });
      }
      grids.forEach(function(grid) { renderGrid(grid, data.assets); });
    }).catch(function() {});
  }

  // Load featured assets into any hero/featured section
  function loadFeatured() {
    fetchCatalog({ action: 'browse', featured: true, limit: 12 }).then(function(data) {
      if (!data.assets || data.assets.length === 0) return;
      var heroGrids = document.querySelectorAll('[class*="featured"], [class*="Featured"], [class*="hero"], [class*="Hero"]');
      heroGrids.forEach(function(grid) {
        if (grid.children.length === 0 || grid.children.length < 3) renderGrid(grid, data.assets);
      });
    }).catch(function() {});
  }

  // Load all categories
  var categories = ['graphic_templates', 'video_templates', 'presentation_templates', 'audio', 'fonts', 'photos', 'graphics', '3d', 'web_templates', 'app_templates', 'ai_tools', 'addons'];
  function loadAll() {
    loadFeatured();
    categories.forEach(loadCategoryIntoGrids);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadAll);
  else loadAll();
  // Retry for SPA-rendered content
  setTimeout(loadAll, 2000);
  setTimeout(loadAll, 5000);
})();
</script>`;
}

// Build a nav-link resolver script that rewrites href="#" dead links to real
// generated pages. Envato and other SPA marketplaces route navigation via JS
// click handlers (not real hrefs), so when the cloner strips SPA scripts the
// nav links become href="#" dead links. This script maps known nav labels to
// generated category/AI-tool/auth pages and rewrites the href attribute, plus
// intercepts clicks as a fallback. This is the clone-engine root-cause fix
// for the "every nav link is href='#'" defect class.
export function buildNavLinkResolverScript(registerUrl: string, loginUrl: string): string {
  // Label (lowercase) → generated page slug (without .html extension).
  // Auth-related labels route to the external auth URL (same as buildAuthInterceptorScript).
  const REGISTER_URL = registerUrl;
  const LOGIN_URL = loginUrl;
  const NAV_MAP: Record<string, string> = {
    // Top nav / brand
    'market': 'all-items', 'elements': 'all-items', 'browse marketplace': 'all-items',
    'explore elements': 'all-items', 'all items': 'all-items', 'browse': 'all-items',
    'graphicriver': 'graphics', 'themeforest': 'web-templates', 'videohive': 'video-templates',
    'audiojungle': 'audio', 'photodune': 'photos', '3docean': '3d', 'codecanyon': 'addons',
    // Category links
    'graphic templates': 'graphic-templates', 'stock video': 'stock-video',
    'audio & music': 'audio', 'audio and music': 'audio', 'music': 'audio',
    'wordpress themes': 'web-templates', 'wp themes': 'web-templates',
    'code fragments': 'addons', 'code': 'addons', 'addons': 'addons',
    'web templates': 'web-templates', 'website templates': 'web-templates',
    'app templates': 'app-templates', 'presentation templates': 'presentation-templates',
    'design templates': 'design-templates', 'fonts': 'fonts', 'photos': 'photos',
    'graphics': 'graphics', '3d': '3d', 'video templates': 'video-templates',
    'cms templates': 'cms-templates', 'more': 'more',
    // Footer / utility
    'sell on clone v21': 'autoleads-register', 'sell': 'autoleads-register',
    'affiliate program': 'autoleads-register', 'become an author': 'autoleads-register',
    'start selling': 'autoleads-register', 'get started': 'autoleads-register',
    'sign up': 'autoleads-register', 'sign up free': 'autoleads-register',
    'forums & events': 'about', 'forums and events': 'about', 'forum': 'about',
    'creative blog': 'about', 'blog': 'about', 'news': 'about',
    'elite authors': 'about', 'authors': 'about', 'about us': 'about', 'about': 'about',
    'help center': 'help', 'help': 'help', 'support': 'help', 'faq': 'help',
    'licensing terms': 'terms', 'license terms': 'terms', 'terms': 'terms', 'terms of service': 'terms',
    'refund policy': 'refund', 'refunds': 'refund', 'return policy': 'refund',
    'privacy control': 'privacy', 'privacy policy': 'privacy', 'privacy': 'privacy',
    'contact us': 'contact', 'contact': 'contact', 'get in touch': 'contact',
    'pricing': 'pricing', 'plans': 'pricing', 'subscribe': 'subscribe', 'subscription': 'subscribe',
    'license': 'license', 'licensing': 'license', 'enterprise': 'enterprise',
  };
  const mapJson = JSON.stringify(NAV_MAP);
  return `<script>
(function(){
  var NAV_MAP=${mapJson};
  var REGISTER_URL='${REGISTER_URL}';
  var LOGIN_URL='${LOGIN_URL}';
  function resolveLink(el){
    if(!el||el.getAttribute('href')!=='#')return null;
    var text=(el.innerText||el.getAttribute('aria-label')||el.getAttribute('title')||'').trim().toLowerCase();
    if(!text)return null;
    // Direct match
    if(NAV_MAP[text])return NAV_MAP[text];
    // Partial match (label contains a known key)
    for(var k in NAV_MAP){
      if(text.indexOf(k)>=0||k.indexOf(text)>=0){return NAV_MAP[k];}
    }
    return null;
  }
  function rewriteAll(){
    document.querySelectorAll('a[href="#"]').forEach(function(a){
      var slug=resolveLink(a);
      if(slug){
        if(slug==='autoleads-register'){a.setAttribute('href',REGISTER_URL);a.setAttribute('target','_self');a.removeAttribute('rel');}
        else if(slug==='autoleads-login'){a.setAttribute('href',LOGIN_URL);a.setAttribute('target','_self');a.removeAttribute('rel');}
        else{a.setAttribute('href','/'+slug+'.html');}
      }
    });
  }
  // Click interception as fallback (catches dynamically rendered links)
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href="#"]');
    if(!a)return;
    var slug=resolveLink(a);
    if(slug){
      e.preventDefault();
      e.stopPropagation();
      if(slug==='autoleads-register')window.location.href=REGISTER_URL;
      else if(slug==='autoleads-login')window.location.href=LOGIN_URL;
      else window.location.href='/'+slug+'.html';
    }
  },true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',rewriteAll);
  else rewriteAll();
  setTimeout(rewriteAll,1000);setTimeout(rewriteAll,3000);
  if(typeof MutationObserver!=='undefined'){
    var obs=new MutationObserver(function(){rewriteAll();});
    if(document.body)obs.observe(document.body,{childList:true,subtree:true});
    else document.addEventListener('DOMContentLoaded',function(){obs.observe(document.body,{childList:true,subtree:true});});
  }
})();
</script>`;
}

// Build an auth interceptor script that rewrites ALL sign-in, login, register,
// and account links to point to MY app's auth system instead of Envato's.
// Uses MutationObserver for SPA-rendered links + click interception as fallback.
export function buildAuthInterceptorScript(loginUrl: string, registerUrl: string): string {
  return `<script>
(function(){
  var LOGIN='${loginUrl}';
  var REGISTER='${registerUrl}';
  var authPatterns=/(sign-in|signin|login|sign-up|signup|register|join|my-account|account|profile)/i;
  var registerPatterns=/(sign-up|signup|register|join|create-account)/i;
  function rewriteAuthLink(el){
    if(!el||!el.href)return;
    var href=el.href||'';
    var text=(el.textContent||'').trim().toLowerCase();
    // Skip if already pointing to my auth
    if(href.indexOf('autoleads')>=0)return;
    // Match envato.com sign-in/login/register/account links
    if(/envato\\.com.*(sign-in|login|register|sign-up|signup|account|my-account|profile)/i.test(href)||
       href.indexOf('/sign-in')>=0||href.indexOf('/login')>=0||href.indexOf('/register')>=0||
       href.indexOf('/sign-up')>=0||href.indexOf('/signup')>=0||href.indexOf('/join')>=0||
       href.indexOf('/my-account')>=0||href.indexOf('/account')>=0){
      if(registerPatterns.test(text)||registerPatterns.test(href)){
        el.href=REGISTER;
      }else{
        el.href=LOGIN;
      }
      el.setAttribute('target','_self');
      el.removeAttribute('rel');
    }
  }
  function rewriteAllAuthLinks(){
    document.querySelectorAll('a[href]').forEach(rewriteAuthLink);
  }
  // Also intercept clicks on auth-related buttons (not just links)
  document.addEventListener('click',function(e){
    var el=e.target.closest('a,button');
    if(!el)return;
    var text=(el.textContent||'').trim().toLowerCase();
    var href=el.getAttribute('href')||'';
    if(href.indexOf('autoleads')>=0)return;
    if(authPatterns.test(text)||authPatterns.test(href)){
      if(/envato\\.com/i.test(href)||href.indexOf('/sign-in')>=0||href.indexOf('/login')>=0||
         href.indexOf('/register')>=0||href.indexOf('/sign-up')>=0||href.indexOf('/signup')>=0||
         href.indexOf('/join')>=0||href.indexOf('/my-account')>=0||href.indexOf('/account')>=0||
         href===''||href==='#'){
        e.preventDefault();
        e.stopPropagation();
        if(registerPatterns.test(text)){
          window.location.href=REGISTER;
        }else{
          window.location.href=LOGIN;
        }
      }
    }
  },true);
  // Initial rewrite + delayed for SPA render
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',rewriteAllAuthLinks);}
  else{rewriteAllAuthLinks();}
  setTimeout(rewriteAllAuthLinks,1000);setTimeout(rewriteAllAuthLinks,3000);setTimeout(rewriteAllAuthLinks,5000);
  // MutationObserver for dynamically rendered links
  if(typeof MutationObserver!=='undefined'){
    var obs=new MutationObserver(function(muts){
      for(var i=0;i<muts.length;i++){
        var added=muts[i].addedNodes;
        for(var j=0;j<added.length;j++){
          var node=added[j];
          if(node.nodeType===1){
            if(node.tagName==='A')rewriteAuthLink(node);
            else node.querySelectorAll&&node.querySelectorAll('a[href]').forEach(rewriteAuthLink);
          }
        }
      }
    });
    if(document.body){obs.observe(document.body,{childList:true,subtree:true});}
    else{document.addEventListener('DOMContentLoaded',function(){obs.observe(document.body,{childList:true,subtree:true});});}
  }
})();
</script>`;
}

// Build a Stripe checkout script that intercepts subscription/purchase buttons
// and redirects to our Stripe checkout flow.
// createStoreCheckout expects { items: [{ name, amount, quantity, type }] } — NOT
// { product_id } — so we send the correct schema here.
export function buildStripeCheckoutScript(checkoutFunctionUrl: string, products: any): string {
  return `<script>
(function(){
  var CHECKOUT_URL='${checkoutFunctionUrl}';
  var PRODUCTS=${JSON.stringify(products)};
  var ctaPatterns=/^(start|subscribe|buy|purchase|get|sign up|join|upgrade|plan|try|begin)/i;
  document.querySelectorAll('a, button').forEach(function(btn){
    var text=(btn.textContent||'').trim();
    if(text.length<3||text.length>40)return;
    if(!ctaPatterns.test(text))return;
    if(btn.closest('nav, footer, header'))return;
    btn.addEventListener('click',function(e){
      e.preventDefault();
      e.stopPropagation();
      var product=null;
      var lower=text.toLowerCase();
      if(lower.indexOf('month')>=0||lower.indexOf('plan')>=0||lower.indexOf('growth')>=0){
        product=PRODUCTS.find(function(p){return p.id==='growth';});
      }else if(lower.indexOf('operat')>=0||lower.indexOf('enterprise')>=0){
        product=PRODUCTS.find(function(p){return p.id==='operating';});
      }else if(lower.indexOf('app')>=0){
        product=PRODUCTS.find(function(p){return p.id==='app_pack';});
      }else if(lower.indexOf('web')>=0){
        product=PRODUCTS.find(function(p){return p.id==='web_pack';});
      }else if(lower.indexOf('tool')>=0||lower.indexOf('ai')>=0){
        product=PRODUCTS.find(function(p){return p.id==='ai_tool';});
      }
      if(!product)product=PRODUCTS[0];
      if(window.self!==window.top){
        alert('Checkout works only from the published app. Please open this site in a new tab.');
        return;
      }
      fetch(CHECKOUT_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({items:[{name:product.name,amount:product.price,quantity:1,type:product.id}]})
      }).then(function(r){return r.json();}).then(function(j){
        if(j.url)window.location.href=j.url;
        else alert('Could not start checkout. '+(j.error||'Please try again.'));
      }).catch(function(){alert('Checkout error. Please try again.');});
    });
  });
})();
</script>`;
}