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

  // 9. Remove Next.js hydration + analytics
  html = html.replace(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/window\.__NEXT_DATA__\s*=\s*[\s\S]*?;\s*<\/script>/gi, '</script>');
  html = html.replace(/<script[^>]+src=["'][^"']*\/_next\/static\/[^"']*["'][^>]*><\/script>/gi, '');
  html = html.replace(/<script[^>]*>[\s\S]*?__NEXT_DATA__[\s\S]*?<\/script>/gi, '');
  const trackingSrcPatterns = [
    'google-analytics.com', 'googletagmanager.com', 'connect.facebook.net',
    'static.hotjar.com', 'cdn.mxpnl.com', 'cdn.segment.com', 'snap.licdn.com',
    'bat.bing.com', 'platform.twitter.com', 'platform.linkedin.com',
    'adservice.google.com', 'doubleclick.net', 'widget.trustpilot.com'
  ];
  html = html.replace(/<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi, (match, src) => {
    if (trackingSrcPatterns.some(p => src.toLowerCase().includes(p))) return '';
    return match;
  });
  html = html.replace(/<script[^>]*>[\s\S]*?gtag\('js'[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<script[^>]*>[\s\S]*?fbq\('init'[\s\S]*?<\/script>/gi, '');

  // 10. Meta tag sanitization
  html = html.replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '');
  html = html.replace(/<meta[^>]+property=["']og:url["'][^>]*>/gi, '');

  // Add DOCTYPE if missing
  if (!/<!doctype/i.test(html)) {
    html = '<!DOCTYPE html>\n' + html;
  }

  return { html, images_rehosted: imagesRehosted, images_total: imagesTotal };
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

// Build a Stripe checkout script that intercepts subscription/purchase buttons
// and redirects to our Stripe checkout flow.
export function buildStripeCheckoutScript(checkoutFunctionUrl: string, products: any): string {
  return `<script>
(function(){
  var CHECKOUT_URL='${checkoutFunctionUrl}';
  var PRODUCTS=${JSON.stringify(products)};
  // Intercept buttons with text matching subscription/purchase patterns
  var ctaPatterns=/^(start|subscribe|buy|purchase|get|sign up|join|upgrade|plan|try|begin)/i;
  document.querySelectorAll('a, button').forEach(function(btn){
    var text=(btn.textContent||'').trim();
    if(text.length<3||text.length>40)return;
    if(!ctaPatterns.test(text))return;
    // Skip nav links and footer links
    if(btn.closest('nav, footer, header'))return;
    btn.addEventListener('click',function(e){
      e.preventDefault();
      e.stopPropagation();
      // Match button text to a product
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
      // Check if in iframe (block checkout from builder preview)
      if(window.self!==window.top){
        alert('Checkout works only from the published app. Please open this site in a new tab.');
        return;
      }
      fetch(CHECKOUT_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({product_id:product.price_id,product_name:product.name})
      }).then(function(r){return r.json();}).then(function(j){
        if(j.url)window.location.href=j.url;
        else alert('Could not start checkout. Please try again.');
      }).catch(function(){alert('Checkout error. Please try again.');});
    });
  });
})();
</script>`;
}