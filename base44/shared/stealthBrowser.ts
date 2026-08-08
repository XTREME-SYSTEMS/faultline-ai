// Browserbase Stealth Engine — highest-capability scraping system.
// Uses the full Browserbase Sessions API with:
//   - advancedStealth: real browser fingerprints, CDP-mode stealth
//   - solveCaptchas: automatic CAPTCHA solving (reCAPTCHA, hCaptcha, custom)
//   - proxies: residential proxy network (geo-rotating)
//   - verified: purpose-built Chromium recognized by bot-protection partners
//   - blockAds: ad blocking for cleaner extraction
//   - ignoreCertificateErrors: bypass SSL issues
// Drives the session via raw CDP (Chrome DevTools Protocol) over WebSocket,
// since the Base44 Deno runtime cannot use Puppeteer/Playwright native bindings.

const BB_API = 'https://api.browserbase.com/v1/sessions';
const BB_FETCH = 'https://api.browserbase.com/v1/fetch';

export interface StealthOptions {
  proxies?: boolean;
  verified?: boolean;
  solveCaptchas?: boolean;
  advancedStealth?: boolean;
  blockAds?: boolean;
  ignoreCertificateErrors?: boolean;
  region?: string;
  timeout?: number;          // navigation timeout (ms)
  waitAfterLoad?: number;    // extra wait for SPA content (ms)
  screenshot?: boolean;
  fullPageScreenshot?: boolean;
  geoCountry?: string;       // proxy geolocation country
  geoState?: string;
  geoCity?: string;
  projectId?: string;
}

export interface ScrapeResult {
  html: string;
  screenshot?: string;       // base64 PNG
  status: number;
  url: string;
  finalUrl: string;
  title: string;
  sessionId: string;
  ok: boolean;
  rendered: boolean;
  captchaSolved: boolean;
  error?: string;
}

export interface CrawledPage extends ScrapeResult {
  path: string;
  links: string[];
}

// ─── Session Management ──────────────────────────────────────────────

async function discoverProjectId(): Promise<string | null> {
  const apiKey = Deno.env.get('BROWSERBASE_API_KEY');
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.browserbase.com/v1/projects', {
      headers: { 'x-bb-api-key': apiKey },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const projects = await res.json();
    const prod = (projects as any[])?.find?.((p: any) => p.concurrency > 1) || (projects as any[])?.[0];
    return prod?.id || null;
  } catch { return null; }
}

export async function createStealthSession(options: StealthOptions = {}): Promise<{ id: string; connectUrl: string; raw: any }> {
  const apiKey = Deno.env.get('BROWSERBASE_API_KEY');
  if (!apiKey) throw new Error('BROWSERBASE_API_KEY not set');

  // Auto-discover project ID if not provided (needed for session creation)
  let projectId = options.projectId || Deno.env.get('BROWSERBASE_PROJECT_ID');
  if (!projectId) projectId = await discoverProjectId();
  if (!projectId) throw new Error('No Browserbase project found — set BROWSERBASE_PROJECT_ID');

  const proxies = options.proxies !== false
    ? options.geoCountry
      ? [{ type: 'browserbase', geolocation: { country: options.geoCountry, state: options.geoState, city: options.geoCity } }]
      : true
    : false;

  // advancedStealth + verified require Enterprise/Scale plans — opt-in only.
  // solveCaptchas is enabled by default on all plans. proxies works on all plans.
  const body: any = {
    projectId,
    browserSettings: {
      solveCaptchas: options.solveCaptchas !== false,
      blockAds: options.blockAds !== false,
      ignoreCertificateErrors: options.ignoreCertificateErrors !== false,
    },
    proxies,
    keepAlive: true,
    region: options.region || 'us-west-2',
  };
  // Add advancedStealth/verified only if explicitly requested (Enterprise plan)
  if (options.advancedStealth === true) body.browserSettings.advancedStealth = true;
  if (options.verified === true) body.browserSettings.verified = true;

  const res = await fetch(BB_API, {
    method: 'POST',
    headers: { 'x-bb-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Browserbase session create ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json();
  return { id: data.id, connectUrl: data.connectUrl, raw: data };
}

export async function releaseSession(sessionId: string): Promise<void> {
  const apiKey = Deno.env.get('BROWSERBASE_API_KEY');
  if (!apiKey || !sessionId) return;
  try {
    await fetch(`${BB_API}/${sessionId}`, {
      method: 'POST',
      headers: { 'x-bb-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'REQUEST_RELEASE' }),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* best-effort */ }
}

// ─── CDP WebSocket Client ─────────────────────────────────────────────

class CDPClient {
  private ws: WebSocket;
  private msgId = 0;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private eventHandlers = new Map<string, ((params: any, sessionId?: string) => void)[]>();
  private closed = false;

  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      const timeout = setTimeout(() => reject(new Error('CDP connect timeout')), 15000);
      this.ws.onopen = () => { clearTimeout(timeout); resolve(); };
      this.ws.onerror = () => { clearTimeout(timeout); reject(new Error('CDP WebSocket error')); };
      this.ws.onmessage = (ev) => this.handleMessage(typeof ev.data === 'string' ? ev.data : '');
      this.ws.onclose = () => {
        this.closed = true;
        for (const [, p] of this.pending) p.reject(new Error('CDP WebSocket closed'));
        this.pending.clear();
      };
    });
  }

  private handleMessage(data: string) {
    try {
      const msg = JSON.parse(data);
      if (msg.id && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message || 'CDP error'));
        else p.resolve(msg.result);
      } else if (msg.method) {
        const handlers = this.eventHandlers.get(msg.method) || [];
        for (const h of handlers) h(msg.params, msg.sessionId);
      }
    } catch { /* ignore parse errors */ }
  }

  on(method: string, handler: (params: any, sessionId?: string) => void) {
    if (!this.eventHandlers.has(method)) this.eventHandlers.set(method, []);
    this.eventHandlers.get(method)!.push(handler);
  }

  async send(method: string, params: any = {}, sessionId?: string, timeoutMs = 30000): Promise<any> {
    if (this.closed) throw new Error('CDP connection closed');
    const id = ++this.msgId;
    const msg: any = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(msg));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, timeoutMs);
    });
  }

  async close() {
    this.closed = true;
    try { this.ws.close(); } catch { /* ignore */ }
  }
}

// ─── Core Stealth Scrape ──────────────────────────────────────────────

export async function scrapeWithStealth(url: string, options: StealthOptions = {}): Promise<ScrapeResult> {
  const apiKey = Deno.env.get('BROWSERBASE_API_KEY');
  if (!apiKey) throw new Error('BROWSERBASE_API_KEY not set');

  let session: { id: string; connectUrl: string } | null = null;
  let cdp: CDPClient | null = null;

  try {
    session = await createStealthSession(options);
    cdp = new CDPClient();
    await cdp.connect(session.connectUrl);

    // Attach to the default page target
    const { targetInfos } = await cdp.send('Target.getTargets');
    const pageTarget = targetInfos.find((t: any) => t.type === 'page' && t.attached === false) || targetInfos.find((t: any) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target in session');
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });

    // Enable domains
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Network.enable', {}, sessionId);

    // Track captcha solving events
    let captchaSolved = false;
    cdp.on('Runtime.consoleAPICalled', (params: any) => {
      const args = params.args || [];
      for (const a of args) {
        if (a.value === 'browserbase-solving-finished') captchaSolved = true;
      }
    });

    // Navigate
    const navTimeout = options.timeout || 30000;
    let navStatus = 0;
    try {
      const nav = await cdp.send('Page.navigate', { url }, sessionId, navTimeout);
      navStatus = nav.status || (nav.error ? 0 : 200);
    } catch (e) {
      // Navigation timeout — page may still have loaded partially
      navStatus = 0;
    }

    // Wait for load event (with fallback timeout)
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      cdp!.on('Page.loadEventFired', finish);
      setTimeout(finish, Math.min(navTimeout, 15000));
    });

    // Extra wait for SPA / dynamic content
    const waitAfter = options.waitAfterLoad ?? 2500;
    if (waitAfter > 0) await new Promise(r => setTimeout(r, waitAfter));

    // Extract full rendered HTML
    const htmlResult = await cdp.send('Runtime.evaluate', {
      expression: 'document.documentElement.outerHTML',
      returnByValue: true,
    }, sessionId);
    const html = htmlResult?.result?.value || '';

    // Extract title + final URL
    const [titleRes, urlRes] = await Promise.all([
      cdp.send('Runtime.evaluate', { expression: 'document.title', returnByValue: true }, sessionId),
      cdp.send('Runtime.evaluate', { expression: 'window.location.href', returnByValue: true }, sessionId),
    ]);
    const title = titleRes?.result?.value || '';
    const finalUrl = urlRes?.result?.value || url;

    // Screenshot (optional)
    let screenshot: string | undefined;
    if (options.screenshot) {
      try {
        const ss = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: options.fullPageScreenshot !== false,
        }, sessionId);
        screenshot = ss.data;
      } catch { /* best-effort */ }
    }

    return {
      html,
      screenshot,
      status: navStatus || 200,
      url,
      finalUrl,
      title,
      sessionId: session.id,
      ok: html.length > 100,
      rendered: true,
      captchaSolved,
    };
  } catch (error) {
    return {
      html: '',
      status: 0,
      url,
      finalUrl: url,
      title: '',
      sessionId: session?.id || '',
      ok: false,
      rendered: false,
      captchaSolved: false,
      error: error.message,
    };
  } finally {
    if (cdp) await cdp.close().catch(() => {});
    if (session) await releaseSession(session.id);
  }
}

// ─── Deep Stealth Crawl ───────────────────────────────────────────────

export async function crawlSiteStealth(
  url: string,
  options: StealthOptions & { maxPages?: number } = {}
): Promise<{ pages: CrawledPage[]; homepage: ScrapeResult; allLinks: string[] }> {
  const maxPages = options.maxPages || 15;
  const visited = new Set<string>();
  const allLinks = new Set<string>();
  const pages: CrawledPage[] = [];

  let baseOrigin: string;
  try { baseOrigin = new URL(url).origin; } catch { throw new Error('Invalid URL'); }

  // Scrape homepage with a fresh stealth session
  const homepage = await scrapeWithStealth(url, options);
  pages.push({ ...homepage, path: '/', links: [] });
  visited.add(url);

  if (!homepage.ok) return { pages, homepage, allLinks: [] };

  // Discover internal links from homepage
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  let m;
  while ((m = linkRegex.exec(homepage.html)) !== null) {
    try {
      const fullUrl = new URL(m[1], url).href.split('#')[0];
      if (fullUrl.startsWith(baseOrigin) && !fullUrl.match(/\.(jpg|jpeg|png|gif|svg|pdf|css|js|ico|woff|ttf|mp4|webm|zip|docx?|xlsx?|pptx?)$/i)) {
        allLinks.add(fullUrl);
      }
    } catch { /* skip */ }
  }

  // Prioritize content pages
  const priorityPatterns = /about|pricing|contact|services|products|blog|solutions|features|team|company|product|faq|portfolio|case-study|gallery|testimonials/i;
  const sortedLinks = [...allLinks].sort((a, b) => {
    const aMatch = priorityPatterns.test(a) ? 0 : 1;
    const bMatch = priorityPatterns.test(b) ? 0 : 1;
    return aMatch - bMatch;
  });

  // Crawl each page (reuse session for efficiency — create one, scrape all, release)
  const toCrawl = sortedLinks.slice(0, maxPages - 1);
  let session: { id: string; connectUrl: string } | null = null;
  let cdp: CDPClient | null = null;
  let cdpSessionId: string | null = null;

  try {
    if (toCrawl.length > 0) {
      session = await createStealthSession(options);
      cdp = new CDPClient();
      await cdp.connect(session.connectUrl);
      const { targetInfos } = await cdp.send('Target.getTargets');
      const pageTarget = targetInfos.find((t: any) => t.type === 'page') || targetInfos[0];
      const attach = await cdp.send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
      cdpSessionId = attach.sessionId;
      await cdp.send('Page.enable', {}, cdpSessionId);
      await cdp.send('Runtime.enable', {}, cdpSessionId);
    }

    for (const pageUrl of toCrawl) {
      if (visited.has(pageUrl)) continue;
      visited.add(pageUrl);
      try {
        await cdp!.send('Page.navigate', { url: pageUrl }, cdpSessionId, options.timeout || 25000);
        await new Promise<void>((resolve) => {
          let done = false;
          const finish = () => { if (!done) { done = true; resolve(); } };
          cdp!.on('Page.loadEventFired', finish);
          setTimeout(finish, 12000);
        });
        if (options.waitAfterLoad ?? 1500 > 0) await new Promise(r => setTimeout(r, options.waitAfterLoad ?? 1500));

        const htmlResult = await cdp!.send('Runtime.evaluate', {
          expression: 'document.documentElement.outerHTML',
          returnByValue: true,
        }, cdpSessionId);
        const html = htmlResult?.result?.value || '';
        const path = (() => { try { return new URL(pageUrl).pathname; } catch { return pageUrl; } })();

        // Collect links from this page too
        const pageLinks: string[] = [];
        let lm;
        const lr = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
        while ((lm = lr.exec(html)) !== null) {
          try {
            const fullUrl = new URL(lm[1], pageUrl).href.split('#')[0];
            if (fullUrl.startsWith(baseOrigin)) {
              pageLinks.push(fullUrl);
              allLinks.add(fullUrl);
            }
          } catch { /* skip */ }
        }

        pages.push({
          html, status: 200, url: pageUrl, finalUrl: pageUrl,
          title: '', sessionId: session!.id, ok: html.length > 100,
          rendered: true, captchaSolved: false, path, links: pageLinks,
        });
      } catch (e) {
        pages.push({
          html: '', status: 0, url: pageUrl, finalUrl: pageUrl, title: '',
          sessionId: session?.id || '', ok: false, rendered: false, captchaSolved: false,
          path: '', links: [], error: e.message,
        });
      }
    }
  } finally {
    if (cdp) await cdp.close().catch(() => {});
    if (session) await releaseSession(session.id);
  }

  return { pages, homepage, allLinks: [...allLinks] };
}

// ─── Fetch API with Proxies (lightweight fallback) ────────────────────

export async function fetchWithProxies(url: string, options: { format?: string; timeout?: number } = {}): Promise<{ html: string; status: number; ok: boolean } | null> {
  const apiKey = Deno.env.get('BROWSERBASE_API_KEY');
  if (!apiKey) return null;
  try {
    const res = await fetch(BB_FETCH, {
      method: 'POST',
      headers: { 'x-bb-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, format: options.format || 'raw', proxies: true }),
      signal: AbortSignal.timeout(options.timeout || 15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const html = data.content || data.html || '';
    return { html, status: data.statusCode || 200, ok: html.length > 50 };
  } catch { return null; }
}

// ─── Smart Stealth Fetch (tries stealth, falls back to proxy fetch, then basic) ────

export async function smartStealthFetch(
  url: string,
  basicFetchFn: (url: string) => Promise<{ html: string; status: number; ok: boolean }>,
  options: StealthOptions = {}
): Promise<ScrapeResult> {
  // 1. Try full stealth session (captcha-solving + proxies + advanced stealth)
  const stealth = await scrapeWithStealth(url, options);
  if (stealth.ok && stealth.html.length > 200) return stealth;

  // 2. Fall back to Fetch API with proxies
  const proxyFetch = await fetchWithProxies(url, { timeout: options.timeout || 15000 });
  if (proxyFetch && proxyFetch.ok) {
    return {
      html: proxyFetch.html, status: proxyFetch.status, url, finalUrl: url,
      title: '', sessionId: '', ok: true, rendered: true, captchaSolved: false,
    };
  }

  // 3. Fall back to basic fetch
  const basic = await basicFetchFn(url);
  return {
    html: basic.html, status: basic.status, url, finalUrl: url,
    title: '', sessionId: '', ok: basic.ok, rendered: false, captchaSolved: false,
    error: stealth.error,
  };
}