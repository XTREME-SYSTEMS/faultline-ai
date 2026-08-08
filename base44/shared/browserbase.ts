// Browserbase integration — uses the Fetch API (with proxies) and the full Stealth
// Sessions API to get fully rendered HTML from JS-heavy sites, CAPTCHA-protected pages,
// and bot-blocked targets. Falls back to basic fetch if BROWSERBASE_API_KEY is not set.
import { scrapeWithStealth, smartStealthFetch } from './stealthBrowser.ts';

const BB_API = 'https://api.browserbase.com/v1/fetch';

export async function fetchRenderedPage(url, options = {}) {
  const apiKey = Deno.env.get('BROWSERBASE_API_KEY');
  if (!apiKey) { console.error('Browserbase: BROWSERBASE_API_KEY not set'); return null; }

  try {
    const res = await fetch(BB_API, {
      method: 'POST',
      headers: {
        'x-bb-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        format: 'raw',
        proxies: options.proxies !== false,  // route through proxy network by default
        ...options
      }),
      signal: AbortSignal.timeout(options.timeout || 15000)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`Browserbase API ${res.status} for ${url}: ${errText.slice(0, 300)}`);
      return null;
    }

    const data = await res.json();
    const html = data.content || data.html || '';
    if (!html || html.length < 100) {
      console.error(`Browserbase: empty content for ${url} (len=${html.length})`);
      return null;
    }
    return {
      html,
      status: data.statusCode || 200,
      ok: true,
      rendered: true
    };
  } catch (e) {
    console.error(`Browserbase fetch failed for ${url}: ${e.message}`);
    return null;
  }
}

// Browserbase Search API — performs a web search and returns real results.
// Useful for discovering top sites in a niche with actual URLs.
export async function browserbaseSearch(query, numResults = 10) {
  const apiKey = Deno.env.get('BROWSERBASE_API_KEY');
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.browserbase.com/v1/search', {
      method: 'POST',
      headers: { 'x-bb-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, numResults }),
      signal: AbortSignal.timeout(20000)
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`Browserbase Search ${res.status}: ${errText.slice(0, 300)}`);
      return null;
    }
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    console.error(`Browserbase Search failed: ${e.message}`);
    return null;
  }
}

// Stealth fetch — uses the full Sessions API (advancedStealth + solveCaptchas + proxies + verified).
// This is the highest-capability scrape: solves CAPTCHAs, bypasses bot detection, uses residential proxies.
export async function fetchStealthPage(url, options = {}) {
  const result = await scrapeWithStealth(url, options);
  if (!result.ok) console.error(`Stealth fetch failed for ${url}: ${result.error}`);
  return result;
}

// Smart fetch — tries stealth first (highest capability), then proxy fetch, then basic fetch.
// Automatically escalates when basic fetch returns thin content or fails.
export async function smartFetchPage(url, basicFetchFn, options = {}) {
  // 1. Try full stealth session (captcha-solving + proxies + advanced stealth)
  const stealth = await smartStealthFetch(url, basicFetchFn, options);
  if (stealth.ok && stealth.html.length > 200) return stealth;

  // 2. Fall back to Fetch API with proxies
  const basic = await basicFetchFn(url);
  const wordCount = basic.ok
    ? basic.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length
    : 0;
  const scriptCount = basic.ok
    ? (basic.html.match(/<script[^>]*>/gi) || []).length
    : 0;
  const needsRender = !basic.ok || wordCount < 50 || scriptCount > 5;

  if (needsRender) {
    const rendered = await fetchRenderedPage(url, options);
    if (rendered && rendered.html && rendered.html.length > basic.html.length) {
      return { ...rendered, headers: basic.headers || {} };
    }
  }

  return basic;
}

// Fetch with Browserbase and take a screenshot (for visual parity validation).
// Uses the stealth Sessions API + CDP Page.captureScreenshot for reliable full-page
// screenshots (the Fetch API screenshot endpoint is unreliable — known 500s).
// Returns base64 PNG in `screenshot` (caller uploads to get a URL for LLM vision).
export async function fetchRenderedWithScreenshot(url, options = {}) {
  try {
    const { scrapeWithStealth } = await import('./stealthBrowser.ts');
    const result = await scrapeWithStealth(url, {
      screenshot: true,
      fullPageScreenshot: true,
      timeout: options.timeout || 30000,
      waitAfterLoad: 3000,
      solveCaptchas: true,
      proxies: true,
    });
    if (result.ok || result.screenshot) {
      return {
        html: result.html || '',
        screenshot: result.screenshot || null,  // base64 PNG data
        status: result.status || 200,
        ok: result.ok,
        rendered: true
      };
    }
  } catch (e) {
    console.error(`Stealth screenshot failed for ${url}: ${e.message}`);
  }

  // Fallback: Fetch API with screenshot flag
  const apiKey = Deno.env.get('BROWSERBASE_API_KEY');
  if (!apiKey) return null;
  try {
    const res = await fetch(BB_API, {
      method: 'POST',
      headers: { 'x-bb-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, format: 'raw', screenshot: true, ...options }),
      signal: AbortSignal.timeout(options.timeout || 30000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      html: data.content || data.html || '',
      screenshot: data.screenshot || data.screenshotUrl || null,
      status: data.statusCode || 200,
      ok: true,
      rendered: true
    };
  } catch (e) {
    console.error('Browserbase screenshot fetch failed:', e.message);
    return null;
  }
}