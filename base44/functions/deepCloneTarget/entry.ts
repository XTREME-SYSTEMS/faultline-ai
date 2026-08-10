import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { fetchPageDeep, deepExtract, discoverAllPages } from '../../shared/deepScraper.ts';
import { fetchRenderedPage, browserbaseSearch, fetchRenderedWithScreenshot } from '../../shared/browserbase.ts';

// Deepest clone path: takes a target URL (or searches for a top performer),
// fetches the fully rendered HTML (Browserbase for JS-heavy SPAs → basic fetch
// fallback), extracts the target's REAL design DNA (colors, fonts, headings,
// nav, contact, internal pages, tech signals), and returns a rich clone brief
// that the website generator reproduces faithfully. Does NOT generate or
// provision — that stays in the tested generateWebsite + launchProject functions
// so each stage stays under the gateway timeout.

// Extracts a structural layout blueprint from rendered HTML: section order,
// hero layout pattern, interactive elements (sliders, tabs, accordions, galleries),
// and image usage — so the generator knows WHAT to build, not just which colors/fonts.
function extractLayout(html: string): string {
  const lines: string[] = [];
  const hasBgImage = /background-image\s*:\s*url\(/i.test(html) || /<img[^>]+class="[^"]*(?:hero|background|bg)/i.test(html);
  const hasHeroForm = /<form[\s\S]{0,500}<\/form>/i.test(html.slice(0, 5000));
  const heroSplit = /class="[^"]*(?:hero|banner)[^"]*"/i.test(html) && /flex|grid/i.test(html.slice(html.search(/class="[^"]*(?:hero|banner)/i), html.search(/class="[^"]*(?:hero|banner)/i) + 2000));
  lines.push(`HERO: ${hasBgImage ? 'photographic background image' : 'solid/gradient background'}${hasHeroForm ? ' + embedded form/quote box' : ''}${heroSplit ? ' + split layout (content + form side by side)' : ' + centered content'}`);
  const hasBeforeAfter = /before|after|slider|comparison/i.test(html) && /<img|background-image/i.test(html);
  if (hasBeforeAfter) lines.push('INTERACTIVE: Before/After image comparison slider — reproduce with a draggable slider handle');
  const hasTabs = /tab|tabpanel|role="tab"/i.test(html);
  if (hasTabs) lines.push('INTERACTIVE: Tabbed service display (vertical or horizontal tabs with changing content) — NOT a simple card grid');
  const hasAccordion = /accordion|collapse|faq/i.test(html);
  if (hasAccordion) lines.push('INTERACTIVE: Accordion/expandable section (FAQ or locations) — JS toggle expand/collapse');
  const hasGallery = (html.match(/<img[^>]+/g) || []).length >= 6;
  if (hasGallery) lines.push('GALLERY: Multi-image grid gallery (3+ images) — use real Unsplash photos, not placeholders');
  const has3D = /layer|diagram|3d|coating/i.test(html) && /<img|svg/i.test(html);
  if (has3D) lines.push('VISUAL DIAGRAM: 3D layer/cross-section diagram — build with CSS layers or an SVG illustration');
  const hasCarousel = /carousel|swiper|slick|slider/i.test(html) && /testimonial|review/i.test(html);
  if (hasCarousel) lines.push('TESTIMONIALS: Carousel/slider with star ratings on a dark themed background — NOT plain text');
  const hasVideo = /<video|youtube|vimeo/i.test(html);
  if (hasVideo) lines.push('VIDEO: Embedded video section — include a video placeholder with play button overlay');
  const hasMap = /<iframe[^>]+map|google.*maps/i.test(html);
  if (hasMap) lines.push('MAP: Embedded Google Map in contact/location section');
  const hasCounter = /counter|count-up|data-count/i.test(html);
  if (hasCounter) lines.push('STATS: Animated number counters (JS count-up on scroll)');
  const sectionCount = (html.match(/<section/gi) || []).length;
  lines.push(`SECTION COUNT: ~${sectionCount} sections — reproduce the full page, do not truncate`);
  return lines.join('\n');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;

    const body = await req.json().catch(() => ({}));
    const { target_url, industry, search_query } = body;

    let url = target_url;
    let targetTitle = '';
    let html = '';
    let fetchMethod = 'failed';
    const tried = [];

    // If no URL, search for real top performers in the niche and fetch the first
    // candidate that actually renders (skips bot-blocked / thin sites automatically)
    if (!url) {
      const q = search_query || `best ${industry || 'epoxy flooring contractor'} company website`;
      const results = await browserbaseSearch(q, 10);
      const candidates = (results || []).filter(r => r.url && !/youtube|yelp|angi|homeadvisor|bbb\.org|wikipedia|facebook|linkedin/i.test(r.url));
      for (const c of candidates) {
        const basic = await fetchPageDeep(c.url, 15000);
        let h = basic.html || '';
        if (h.length < 2000) {
          const rendered = await fetchRenderedPage(c.url, { timeout: 25000 });
          if (rendered && rendered.html && rendered.html.length > h.length) h = rendered.html;
        }
        tried.push({ url: c.url, chars: h.length });
        if (h.length >= 500) {
          url = c.url; targetTitle = c.title || ''; html = h;
          fetchMethod = h.length >= 2000 && basic.ok ? 'basic' : 'browserbase';
          break;
        }
      }
    } else {
      // Explicit target — fetch directly
      const basic = await fetchPageDeep(url, 15000);
      html = basic.html || '';
      fetchMethod = basic.stealth ? 'stealth' : basic.ok ? 'basic' : 'failed';
      if (html.length < 2000) {
        const rendered = await fetchRenderedPage(url, { timeout: 25000 });
        if (rendered && rendered.html && rendered.html.length > html.length) {
          html = rendered.html; fetchMethod = 'browserbase';
        }
      }
      tried.push({ url, chars: html.length });
    }

    if (!url || html.length < 500) {
      return Response.json({ error: `Could not fetch any target HTML (tried ${tried.length} URLs)`, tried }, { status: 502 });
    }

    // Capture a screenshot of the target for visual reference (vision LLM in generator).
    // Skip for basic fetch — deterministic clone uses the actual HTML (not the screenshot),
    // and the screenshot capture adds 30s+ latency that can cause gateway 524 timeouts.
    let targetScreenshotUrl = null;
    if (fetchMethod !== 'basic' || html.length < 5000) {
      try {
        const ss = await fetchRenderedWithScreenshot(url, { timeout: 30000, waitAfterLoad: 3000 });
        if (ss?.screenshot) {
          const b64 = ss.screenshot;
          if (typeof b64 === 'string' && b64.startsWith('http')) {
            targetScreenshotUrl = b64;
          } else {
            const bytes = atob(b64);
            const arr = new Uint8Array(bytes.length);
            for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
            const blob = new Blob([arr], { type: 'image/png' });
            const file = new File([blob], `target-${Date.now()}.png`, { type: 'image/png' });
            const upload = await base44.integrations.Core.UploadFile({ file });
            targetScreenshotUrl = upload?.file_url || null;
          }
        }
      } catch (e) { console.error('Target screenshot capture failed:', e.message); }
    }

    // Structural DNA
    const extract = deepExtract(html, url);

    // Fetch external stylesheets so we can extract the target's REAL brand colors
    // and fonts (most sites put them in <link rel="stylesheet">, not inline)
    let styleText = '';
    try {
      const linkRe = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi;
      const cssUrls = []; let lm;
      while ((lm = linkRe.exec(html)) !== null) {
        try { cssUrls.push(new URL(lm[1], url).href); } catch {}
      }
      const cssResults = await Promise.all(cssUrls.slice(0, 4).map(async cu => {
        try {
          const cr = await fetch(cu, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' },
            signal: AbortSignal.timeout(10000)
          });
          return cr.ok ? await cr.text() : '';
        } catch { return ''; }
      }));
      styleText += cssResults.join('\n');
    } catch {}
    const sourceText = html + '\n' + styleText;

    // Real colors (ranked by frequency, from HTML + CSS)
    const colorFreq = {}; let m; const hexRe = /#([0-9a-fA-F]{6})\b/g;
    while ((m = hexRe.exec(sourceText)) !== null) { const c = '#' + m[1].toLowerCase(); colorFreq[c] = (colorFreq[c] || 0) + 1; }
    const skip = new Set(['#ffffff', '#000000', '#cccccc', '#dddddd', '#eeeeee', '#f0f0f0', '#f5f5f5', '#e5e5e5', '#333333', '#666666', '#999999']);
    const colors = Object.entries(colorFreq).sort((a, b) => b[1] - a[1]).map(e => e[0]).filter(c => !skip.has(c)).slice(0, 8);

    // Real fonts (from HTML + CSS)
    const fonts = new Set(); const fRe = /font-family\s*:\s*([^;"']+)[;"]/gi; let fm;
    while ((fm = fRe.exec(sourceText)) !== null) {
      fm[1].split(',').forEach(f => { const n = f.trim().replace(/['"]/g, ''); if (n && !['sans-serif', 'serif', 'monospace', 'inherit', 'initial', 'Arial', 'Helvetica'].includes(n)) fonts.add(n); });
    }

    // Headings + nav
    const headings = (re) => {
      const out = []; const r = new RegExp(re, 'gi'); let h;
      while ((h = r.exec(html)) !== null) { const t = h[1].replace(/<[^>]+>/g, '').trim(); if (t && t.length > 3) out.push(t.slice(0, 120)); }
      return [...new Set(out)].slice(0, 8);
    };
    const h1 = headings('<h1[^>]*>([\\s\\S]*?)</h1>');
    const h2 = headings('<h2[^>]*>([\\s\\S]*?)</h2>');
    const navLinks = []; const navRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]{2,40})<\/a>/gi; let nm;
    while ((nm = navRe.exec(html)) !== null) { const t = nm[2].trim(); if (t && t.length < 30 && !/^(home|logo|©|read more|learn more)$/i.test(t)) navLinks.push(t); }
    const nav = [...new Set(navLinks)].slice(0, 10);

    // Contact + clean text
    const clean = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const phone = (clean.match(/(\+?1[-.\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/) || [])[0] || '';
    const email = (clean.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/) || [])[0] || '';

    // Brand name: prefer the segment after the last pipe (common "SEO title | Brand"
    // pattern), else the first segment of a dash-separated title
    const rawTitle = extract.title || targetTitle || '';
    const bizName = (rawTitle.includes('|') ? rawTitle.split('|').pop() : rawTitle.split(/[–—]/)[0]).trim().split(/[:\-]/)[0].trim() || 'Top Performer';
    const desc = extract.description || '';
    const primary = colors[0] || '#C89B3C';
    const secondary = colors[1] || '#0a0a0a';
    const ind = industry || 'General Contractor';
    const internalPages = discoverAllPages(html, url).slice(0, 5);

    // Structural layout breakdown — extract the target's ACTUAL section structure
    // so the generator has a real blueprint (not just nav labels + colors).
    const layoutBreakdown = extractLayout(html);

    const brief = `CLONE TARGET REPRODUCTION — faithfully reproduce the structure, tone, and design of ${bizName} (source: ${url}).

STRUCTURAL LAYOUT BLUEPRINT (reproduce this section structure faithfully):
${layoutBreakdown}

REAL HERO HEADLINE (adapt, don't copy verbatim): ${h1[0] || desc.slice(0, 100) || 'Premium Services'}
REAL TAGLINE/META: ${desc.slice(0, 250)}
REAL NAVIGATION STRUCTURE (reproduce these menu items): ${nav.join(' | ')}
REAL SECTION HEADINGS (reproduce these sections in order): ${(h2.length ? h2 : h1).slice(0, 8).join(' | ')}
REAL CONTACT INFO: ${phone || 'N/A'} | ${email || 'N/A'}
REAL BRAND COLORS (use these exact hex values as CSS custom properties): primary ${primary}, secondary ${secondary}, accents ${colors.slice(2, 5).join(', ')}
REAL FONTS (load from Google Fonts): ${[...fonts].join(', ') || 'modern sans-serif (Inter + Poppins)'}
INTERNAL PAGES DETECTED: ${internalPages.join(', ') || 'home only'}
TARGET AUDIENCE: Property owners and businesses seeking ${ind.toLowerCase()} services.
Clone the target's layout structure, section order, navigation, and conversion patterns. Write fresh, compelling, original marketing copy for ${bizName} in the same tone and messaging pillars — do NOT copy the target's text verbatim. Match its section count, visual hierarchy, and design language exactly.`;

    // Persist a TopPerformer record capturing the scraped DNA
    let performerId = null;
    try {
      const tp = await base44.asServiceRole.entities.TopPerformer.create({
        organization_id: orgId, name: bizName, url, industry: ind,
        niche: desc.slice(0, 200) || '', revenue_model: '', profit_potential: 'high',
        clone_status: 'cloning', clone_priority: 2, status: 'active',
        design_strengths: h2.slice(0, 5),
        analysis_data: { colors, fonts: [...fonts], nav, h1, h2, phone, email, internalPages, fetchMethod, rendered_chars: html.length }
      });
      performerId = tp.id;
    } catch (e) { /* non-fatal */ }

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId, system: 'deep_clone', action: 'scrape_target', status: 'success',
      summary: `Deep-scraped ${bizName} (${url}) — ${html.length} chars via ${fetchMethod}, ${colors.length} colors, ${nav.length} nav items`,
      evidence: { url, bizName, fetchMethod, rendered_chars: html.length, colors, fonts: [...fonts], nav, h1, h2: h2.slice(0, 5), phone, email, internalPages }
    });

    return Response.json({
      status: 'success', target_url: url, bizName, industry: ind,
      fetchMethod, rendered_chars: html.length,
      dna: { primary, secondary, colors, fonts: [...fonts], h1, h2: h2.slice(0, 5), nav, phone, email, internalPages, extract, layout: layoutBreakdown, screenshot_url: targetScreenshotUrl },
      brief, performer_id: performerId
    });
  } catch (error) {
    console.error('deepCloneTarget error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}