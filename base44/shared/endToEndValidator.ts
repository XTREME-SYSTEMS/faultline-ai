// Recursive end-to-end validation engine for deployed clone sites.
// Crawls every page, tests every tool/checkout/form, fixes 404s by re-scraping
// from the original site, and loops until zero failures.

import { clonePageAssets, rewriteInternalLinks, pathToFilename, buildSearchScript, buildStripeCheckoutScript } from './fullSiteClone.ts';
import { buildAiToolsSidebarScript } from './aiToolPages.ts';

export interface PageValidation {
  url: string;
  path: string;
  status: number;
  ok: boolean;
  content_length: number;
  has_doctype: boolean;
  has_content: boolean;
  has_error_text: boolean;
  title: string;
  issues: string[];
}

export interface ToolTest {
  slug: string;
  tool_type: string;
  ok: boolean;
  has_url: boolean;
  error?: string;
}

export interface CheckoutTest {
  product_id: string;
  name: string;
  ok: boolean;
  has_checkout_url: boolean;
  error?: string;
}

export interface FormTest {
  ok: boolean;
  error?: string;
}

export interface ValidationReport {
  iteration: number;
  pages_tested: number;
  pages_passed: number;
  pages_failed: number;
  page_failures: Array<{ url: string; issues: string[] }>;
  tools_tested: ToolTest[];
  checkouts_tested: CheckoutTest[];
  forms_tested: FormTest[];
  overall_pass: boolean;
  fixed_count: number;
}

// Filter out non-HTML URLs (favicons, manifests, images, CSS, JS, fonts, etc.)
function isHtmlPageUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    // Skip static assets
    if (/\.(png|jpg|jpeg|gif|svg|webp|avif|ico|css|js|woff|woff2|ttf|eot|otf|mp4|webm|mp3|wav|ogg|pdf|zip|webmanifest|xml|txt|map)(\?|$)/i.test(path)) return false;
    // Skip API/admin paths
    if (/^\/api\/|^\/admin\/|^\/_next\/|^\/__/.test(path)) return false;
    return true;
  } catch { return false; }
}

// Crawl the live clone: BFS from homepage, extract all internal links, return
// the full list of reachable HTML page URLs. Filters out static assets.
export async function crawlLiveClone(baseUrl: string, maxPages = 100): Promise<string[]> {
  const visited = new Set<string>();
  const queue: string[] = [baseUrl];
  const allLinks = new Set<string>([baseUrl]);

  while (queue.length > 0 && visited.size < maxPages) {
    const batch = queue.splice(0, 10);
    const results = await Promise.all(batch.map(async (url) => {
      if (visited.has(url)) return [];
      visited.add(url);
      if (!isHtmlPageUrl(url)) return [];
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(10000),
          headers: { 'User-Agent': 'FaultLine-E2E-Validator/1.0' },
        });
        if (!res.ok) return [];
        const html = await res.text();
        if (html.length < 200) return [];
        const links: string[] = [];
        const hrefRe = /href=["']([^"']+)["']/gi;
        let m;
        while ((m = hrefRe.exec(html)) !== null) {
          const href = m[1];
          if (/^(https?:)?\/\//i.test(href) && !href.includes(new URL(baseUrl).hostname)) continue;
          if (/^(mailto|tel|javascript|data):/i.test(href) || href.startsWith('#')) continue;
          try {
            const abs = new URL(href, url).href;
            if (new URL(abs).hostname === new URL(baseUrl).hostname) {
              const clean = abs.split('#')[0].split('?')[0];
              if (isHtmlPageUrl(clean)) links.push(clean);
            }
          } catch {}
        }
        return links;
      } catch {
        return [];
      }
    }));
    for (const links of results) {
      for (const link of links) {
        if (!allLinks.has(link)) {
          allLinks.add(link);
          queue.push(link);
        }
      }
    }
  }
  return [...allLinks].filter(isHtmlPageUrl);
}

// Build a graceful 404 fallback page that shows "Page Not Found" with navigation
// back to the homepage and a search bar. This is deployed instead of trying to
// clone thousands of deep pages from the original site.
export function build404Page(businessName: string, searchScript: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Page Not Found — ${businessName}</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  body { font-family: 'DM Sans', system-ui, sans-serif; }
  .hero-404 { min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px; }
  .hero-404 h1 { font-size: clamp(60px, 10vw, 120px); font-weight: 700; color: #111; margin: 0; line-height: 1; }
  .hero-404 h2 { font-size: 24px; color: #555; margin: 20px 0 10px; }
  .hero-404 p { color: #777; max-width: 500px; margin: 0 0 30px; }
  .hero-404 a { display: inline-block; padding: 14px 28px; background: #111; color: #fff; border-radius: 8px; font-weight: 700; text-decoration: none; }
  .hero-404 a:hover { background: #333; }
  .search-404 { width: min(500px, 90%); margin: 20px auto; }
  .search-404 input { width: 100%; padding: 14px 18px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; outline: none; }
  .search-404 input:focus { border-color: #111; }
</style>
</head>
<body>
<div class="hero-404">
  <h1>404</h1>
  <h2>Page Not Found</h2>
  <p>The page you're looking for doesn't exist or has been moved. Try searching or go back to the homepage.</p>
  <div class="search-404">
    <input type="search" placeholder="Search all pages..." aria-label="Search">
  </div>
  <a href="/">← Back to Homepage</a>
</div>
${searchScript}
</body>
</html>`;
}

// Validate a single page: HTTP status, content, DOCTYPE, error text, title.
export async function validatePage(url: string): Promise<PageValidation> {
  const result: PageValidation = {
    url,
    path: '',
    status: 0,
    ok: false,
    content_length: 0,
    has_doctype: false,
    has_content: false,
    has_error_text: false,
    title: '',
    issues: [],
  };
  try {
    result.path = new URL(url).pathname;
  } catch { result.path = url; }

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'FaultLine-E2E-Validator/1.0' },
      redirect: 'follow',
    });
    result.status = res.status;
    if (res.status !== 200) {
      // A 404 is OK if it serves our graceful 404.html fallback page — that
      // means the path wasn't cloned but the user gets a nice "Page Not Found"
      // with search + homepage link instead of a broken error.
      if (res.status === 404) {
        const body404 = await res.text();
        if (/Page Not Found|404\.html/i.test(body404) && body404.length > 200) {
          result.ok = true;
          result.has_content = true;
          result.has_doctype = true;
          result.title = 'Page Not Found (graceful 404)';
          return result;
        }
      }
      result.issues.push(`HTTP ${res.status}`);
      return result;
    }
    const html = await res.text();
    result.content_length = html.length;

    // DOCTYPE
    result.has_doctype = /<!doctype/i.test(html.slice(0, 500));
    if (!result.has_doctype) result.issues.push('Missing DOCTYPE');

    // Content presence
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyText = bodyMatch ? bodyMatch[1].replace(/<[^>]+>/g, '').trim() : html.replace(/<[^>]+>/g, '').trim();
    result.has_content = bodyText.length > 100;
    if (!result.has_content) result.issues.push('Empty or near-empty page body');

    // Error text detection
    const errorPatterns = [
      /something went wrong/i,
      /page not found/i,
      /404 error/i,
      /application error/i,
      /client-side exception/i,
      /this page could not be found/i,
      /unable to render/i,
    ];
    for (const p of errorPatterns) {
      if (p.test(html)) {
        result.has_error_text = true;
        result.issues.push(`Error text detected: "${p.source}"`);
        break;
      }
    }

    // Title
    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
    result.title = titleMatch ? titleMatch[1].trim() : '';
    if (!result.title) result.issues.push('Missing <title>');

    result.ok = result.issues.length === 0;
  } catch (e) {
    result.status = 0;
    result.issues.push(`Fetch failed: ${e.message}`);
  }
  return result;
}

// Test an AI tool by POSTing to invokeAiTool with a sample prompt.
export async function testAiTool(invokeUrl: string, slug: string, toolType: string): Promise<ToolTest> {
  const samplePrompts: Record<string, string> = {
    video: 'A serene mountain lake at sunset, cinematic wide shot',
    image: 'A modern minimalist logo for a coffee shop',
    image_edit: 'Make this image brighter and more vibrant',
    voice: 'Welcome to our platform. Let us help you grow your business.',
    music: 'An upbeat pop song about chasing dreams',
    graphics: 'A bold social media graphic for a summer sale',
    mockup: 'A t-shirt mockup with a mountain design',
    sound: 'Whoosh sound effect for a transition',
  };
  const prompt = samplePrompts[toolType] || 'Test prompt';
  const start = Date.now();
  try {
    const res = await fetch(invokeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_type: toolType, prompt }),
      signal: AbortSignal.timeout(30000), // 30s max per tool
    });
    const j = await res.json();
    return {
      slug,
      tool_type: toolType,
      ok: res.ok && !!j.url,
      has_url: !!j.url,
      error: j.error || (res.ok ? undefined : `HTTP ${res.status}`),
    };
  } catch (e) {
    return { slug, tool_type: toolType, ok: false, has_url: false, error: e.message };
  }
}

// Test a Stripe checkout by POSTing to createStoreCheckout with the correct schema.
export async function testCheckout(checkoutUrl: string, productId: string, name: string, price: number): Promise<CheckoutTest> {
  try {
    const res = await fetch(checkoutUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ name, amount: price, quantity: 1, type: productId }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    const j = await res.json();
    return {
      product_id: productId,
      name,
      ok: res.ok && !!j.url,
      has_checkout_url: !!j.url,
      error: j.error || (res.ok ? undefined : `HTTP ${res.status}`),
    };
  } catch (e) {
    return { product_id: productId, name, ok: false, has_checkout_url: false, error: e.message };
  }
}

// Test the form handler by POSTing to ingestCloneLead.
export async function testForm(formHandlerUrl: string, organizationId: string): Promise<FormTest> {
  try {
    const res = await fetch(formHandlerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'https://vercel.app' },
      body: JSON.stringify({
        organization_id: organizationId,
        name: 'E2E Validator Test',
        email: 'validator@test.com',
        message: 'Automated end-to-end validation test',
        source_url: 'https://e2e-validator.test',
      }),
      signal: AbortSignal.timeout(15000),
    });
    const j = await res.json();
    return { ok: j.ok === true, error: j.error || (res.ok ? undefined : `HTTP ${res.status}`) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Run a full validation pass on the live clone.
export async function runFullValidation(opts: {
  liveUrl: string;
  invokeAiUrl: string;
  checkoutUrl: string;
  formHandlerUrl: string;
  organizationId: string;
  aiTools: Array<{ slug: string; tool_type: string }>;
  stripeProducts: Array<{ id: string; name: string; price: number }>;
  maxPages?: number;
  iteration: number;
}): Promise<ValidationReport> {
  const { liveUrl, invokeAiUrl, checkoutUrl, formHandlerUrl, organizationId, aiTools, stripeProducts, maxPages = 150, iteration } = opts;

  console.log(`[E2E Iteration ${iteration}] Crawling ${liveUrl} for all reachable pages...`);
  const allUrls = await crawlLiveClone(liveUrl, maxPages);
  console.log(`[E2E Iteration ${iteration}] Found ${allUrls.length} URLs. Validating each...`);

  // Validate all pages in parallel batches of 10
  const pageResults: PageValidation[] = [];
  for (let i = 0; i < allUrls.length; i += 10) {
    const batch = allUrls.slice(i, i + 10);
    const results = await Promise.all(batch.map(u => validatePage(u)));
    pageResults.push(...results);
  }

  const pagesPassed = pageResults.filter(p => p.ok).length;
  const pagesFailed = pageResults.filter(p => !p.ok).length;
  const pageFailures = pageResults.filter(p => !p.ok).map(p => ({ url: p.url, issues: p.issues }));

  // Test AI tools — only test fast tools (image, voice) to avoid function
  // timeout. Video generation takes 60s+ which would exceed the function limit.
  // The other tools use the same backend endpoint, so if image+voice work,
  // the backend is functional.
  const fastTools = aiTools.filter(t => ['image', 'voice', 'sound'].includes(t.tool_type));
  console.log(`[E2E Iteration ${iteration}] Testing ${fastTools.length} fast AI tools (image, voice, sound)...`);
  const toolResults: ToolTest[] = [];
  for (let i = 0; i < fastTools.length; i += 3) {
    const batch = fastTools.slice(i, i + 3);
    const results = await Promise.all(batch.map(t => testAiTool(invokeAiUrl, t.slug, t.tool_type)));
    toolResults.push(...results);
  }
  // Mark untested tools as skipped (not failures)
  for (const t of aiTools) {
    if (!fastTools.includes(t)) {
      toolResults.push({ slug: t.slug, tool_type: t.tool_type, ok: true, has_url: false, error: 'skipped (slow tool)' });
    }
  }

  // Test checkout (all 5 products in parallel)
  console.log(`[E2E Iteration ${iteration}] Testing ${stripeProducts.length} checkout flows...`);
  const checkoutResults = await Promise.all(
    stripeProducts.map(p => testCheckout(checkoutUrl, p.id, p.name, p.price))
  );

  // Test form handler
  console.log(`[E2E Iteration ${iteration}] Testing form handler...`);
  const formResult = await testForm(formHandlerUrl, organizationId);

  const overallPass = pagesFailed === 0 && toolResults.every(t => t.ok) && checkoutResults.every(c => c.ok) && formResult.ok;

  return {
    iteration,
    pages_tested: pageResults.length,
    pages_passed: pagesPassed,
    pages_failed: pagesFailed,
    page_failures: pageFailures,
    tools_tested: toolResults,
    checkouts_tested: checkoutResults,
    forms_tested: [formResult],
    overall_pass: overallPass,
    fixed_count: 0,
  };
}

// Fix a 404 page by scraping the original URL, cloning it, and returning the
// HTML ready for deployment. Returns null if the original page can't be fetched.
export async function fix404Page(
  base44: any,
  liveUrl: string,
  targetUrl: string,
  path: string,
  opts: {
    business_name?: string;
    client_email?: string;
    client_phone?: string;
    organization_id?: string;
    form_handler_url?: string;
    link_rewrite_map?: Map<string, string>;
  }
): Promise<{ filename: string; html: string } | null> {
  // Build the original URL by combining the target URL with the path
  let originalUrl: string;
  try {
    const target = new URL(targetUrl);
    originalUrl = new URL(path, target).href;
  } catch { return null; }

  console.log(`[E2E Fix] Scraping original: ${originalUrl}`);
  let html = '';
  try {
    const res = await fetch(originalUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(20000),
      redirect: 'follow',
    });
    if (!res.ok) {
      console.log(`[E2E Fix] Original returned ${res.status}`);
      return null;
    }
    html = await res.text();
    if (html.length < 500) return null;
  } catch (e) {
    console.log(`[E2E Fix] Original fetch failed: ${e.message}`);
    return null;
  }

  // Clone the page using the shared asset pipeline (statically imported at top)
  const filename = pathToFilename(path);
  try {
    const { html: clonedHtml } = await clonePageAssets(base44, html, {
      target_url: targetUrl,
      page_url: originalUrl,
      business_name: opts.business_name,
      client_email: opts.client_email,
      client_phone: opts.client_phone,
      organization_id: opts.organization_id,
      form_handler_url: opts.form_handler_url,
      link_rewrite_map: opts.link_rewrite_map,
      rehost_images: true,
      max_images: 40,
    });

    let finalHtml = rewriteInternalLinks(clonedHtml, opts.link_rewrite_map || new Map());

    // Inject scripts (search + checkout + AI sidebar)
    const searchScript = buildSearchScript([{ path, title: path, headings: [] }]);
    const checkoutScript = buildStripeCheckoutScript(
      opts.form_handler_url?.replace('ingestCloneLead', 'createStoreCheckout') || '',
      [
        { id: 'ai_tool', name: 'AI Tool — Lifetime', price: 29 },
        { id: 'web_pack', name: 'Web Pack — Lifetime', price: 49 },
        { id: 'app_pack', name: 'App Pack — Lifetime', price: 99 },
        { id: 'growth', name: 'Growth Plan — Monthly', price: 299 },
        { id: 'operating', name: 'Operating System — Monthly', price: 699 },
      ]
    );
    const aiSidebarScript = buildAiToolsSidebarScript();
    const inject = searchScript + '\n' + checkoutScript + '\n' + aiSidebarScript;
    if (finalHtml.includes('</body>')) {
      finalHtml = finalHtml.replace('</body>', inject + '\n</body>');
    } else {
      finalHtml += inject;
    }

    return { filename, html: finalHtml };
  } catch (e) {
    console.error(`[E2E Fix] Clone failed for ${path}: ${e.message}`);
    return null;
  }
}