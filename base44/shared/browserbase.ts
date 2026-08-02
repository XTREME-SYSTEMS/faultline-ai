// Browserbase integration — uses the Fetch API to get fully rendered HTML
// from JS-heavy sites (React/Vue SPAs, dynamic content) that basic fetch can't handle.
// Falls back to basic fetch if BROWSERBASE_API_KEY is not set or the API fails.

const BB_API = 'https://api.browserbase.com/v1/fetch';

export async function fetchRenderedPage(url, options = {}) {
  const apiKey = Deno.env.get('BROWSERBASE_API_KEY');
  if (!apiKey) return null; // Caller should fall back to basic fetch

  try {
    const res = await fetch(BB_API, {
      method: 'POST',
      headers: {
        'x-bb-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        format: 'html',
        ...options
      }),
      signal: AbortSignal.timeout(options.timeout || 30000)
    });

    if (!res.ok) {
      console.error(`Browserbase API returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    return {
      html: data.content || data.html || '',
      status: data.statusCode || 200,
      ok: true,
      rendered: true
    };
  } catch (e) {
    console.error('Browserbase fetch failed:', e.message);
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
        format: 'html',
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