// Browserbase integration — uses the Fetch API to get fully rendered HTML
// from JS-heavy sites (React/Vue SPAs, dynamic content) that basic fetch can't handle.
// Falls back to basic fetch if BROWSERBASE_API_KEY is not set or the API fails.

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

// Smart fetch — tries Browserbase first for JS-heavy sites, falls back to basic fetch.
// Uses Browserbase when: the page has many scripts (likely SPA) or basic fetch returns thin content.
export async function smartFetchPage(url, basicFetchFn, options = {}) {
  // First try basic fetch
  const basic = await basicFetchFn(url);

  // If basic fetch failed or returned very thin content, try Browserbase
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

// Fetch with Browserbase and take a screenshot (for headless testing evidence)
export async function fetchRenderedWithScreenshot(url, options = {}) {
  const apiKey = Deno.env.get('BROWSERBASE_API_KEY');
  if (!apiKey) return null;

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
        screenshot: true,
        ...options
      }),
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