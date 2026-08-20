// CloudBrowser Validation Adapter — integration layer between Xtreme Clone
// Systems and the CloudBrowser control plane (XTREME-SYSTEMS/cloudbrowser-control).
//
// CloudBrowser provides deterministic browser execution: goto, click, hover,
// fill, type, press, select, scroll, evaluate, screenshot, console capture,
// network capture. This adapter wraps those capabilities into a reusable
// validation layer for paired SOURCE/CLONE testing.
//
// SECRETS REQUIRED (set in Settings → Secrets):
//   CLOUDBROWSER_GATEWAY_URL — CloudBrowser gateway function URL
//   CLOUDBROWSER_API_KEY     — API key (cb_live_ or cb_test_ prefixed)
//
// If CloudBrowser is not configured, falls back to the existing Browserbase
// stealth browser (stealthBrowser.ts) so validation continues working.

import { secrets } from 'base44:runtime';

const GATEWAY_TIMEOUT_MS = 30000;

// Check if CloudBrowser is configured
export function isCloudBrowserConfigured(): boolean {
  const url = secrets.get('CLOUDBROWSER_GATEWAY_URL');
  const key = secrets.get('CLOUDBROWSER_API_KEY');
  return !!(url && key);
}

// Get gateway config
function getGatewayConfig() {
  const url = secrets.get('CLOUDBROWSER_GATEWAY_URL');
  const key = secrets.get('CLOUDBROWSER_API_KEY');
  if (!url || !key) {
    throw new Error('CloudBrowser not configured. Set CLOUDBROWSER_GATEWAY_URL and CLOUDBROWSER_API_KEY in Settings → Secrets.');
  }
  return { baseUrl: url.replace(/\/$/, ''), key };
}

// Authenticated fetch to CloudBrowser gateway
async function gatewayFetch(path: string, options: any = {}) {
  const { baseUrl, key } = getGatewayConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    const text = await res.text();
    let body: any;
    try { body = JSON.parse(text); } catch { body = text; }
    if (!res.ok) {
      const errMsg = typeof body === 'object' && body?.error ? body.error : `Gateway error ${res.status}`;
      throw new Error(errMsg);
    }
    return body;
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error('CloudBrowser gateway request timed out (30s)');
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Engine Health ──────────────────────────────────────────────

export interface EngineHealthResult {
  ok: boolean;
  configured: boolean;
  healthy: boolean;
  engine_version?: string;
  active_sessions?: number;
  max_sessions?: number;
  error?: string;
}

export async function checkEngineHealth(): Promise<EngineHealthResult> {
  if (!isCloudBrowserConfigured()) {
    return { ok: false, configured: false, healthy: false, error: 'CloudBrowser not configured' };
  }
  try {
    const result = await gatewayFetch('/functions/engineHealth', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return {
      ok: result.ok === true,
      configured: result.configured !== false,
      healthy: result.ok === true,
      engine_version: result.engine_version,
      active_sessions: result.active_sessions,
      max_sessions: result.max_sessions,
      error: result.error,
    };
  } catch (e: any) {
    return { ok: false, configured: true, healthy: false, error: e.message };
  }
}

// ─── Session Management ─────────────────────────────────────────

export interface BrowserSession {
  sessionId: string;
  sessionEntityId?: string;
  cdpUrl?: string;
  status: string;
}

export interface SessionConfig {
  viewport?: { width: number; height: number };
  userAgent?: string;
  locale?: string;
  timezone?: string;
  timeoutMs?: number;
  blockedResources?: string[];
  usePool?: boolean;
}

export async function createSession(config: SessionConfig = {}): Promise<BrowserSession> {
  const result = await gatewayFetch('/functions/engineAction', {
    method: 'POST',
    body: JSON.stringify({
      action: 'create_session',
      sessionConfig: {
        viewport: config.viewport || { width: 1440, height: 900 },
        locale: config.locale || 'en-US',
        timezone: config.timezone || 'America/New_York',
        timeoutMs: config.timeoutMs || 30000,
        blockedResources: config.blockedResources || [],
        usePool: config.usePool !== false,
      },
    }),
  });
  return {
    sessionId: result.session?.session_id || result.session?.sessionId,
    sessionEntityId: result.session?.id,
    cdpUrl: result.session?.cdp_url,
    status: result.session?.status || 'idle',
  };
}

export async function closeSession(sessionId: string, sessionEntityId?: string): Promise<void> {
  try {
    await gatewayFetch('/functions/engineAction', {
      method: 'POST',
      body: JSON.stringify({
        action: 'close_session',
        sessionId,
        sessionEntityId,
      }),
    });
  } catch (e) {
    // Best-effort close
  }
}

// ─── Action Execution ───────────────────────────────────────────

export interface ActionResult {
  ok: boolean;
  url?: string;
  title?: string;
  data?: any;
  base64?: string;
  error?: string;
}

export async function executeAction(
  sessionId: string,
  step: { action_type: string; selector?: string; value?: string; options?: any }
): Promise<ActionResult> {
  const result = await gatewayFetch('/functions/engineAction', {
    method: 'POST',
    body: JSON.stringify({
      action: 'execute',
      sessionId,
      step,
    }),
  });
  return {
    ok: result.result?.ok !== false,
    url: result.result?.url,
    title: result.result?.title,
    data: result.result?.data,
    error: result.result?.error,
  };
}

// Navigate to a URL
export async function goto(sessionId: string, url: string, waitMs: number = 3000): Promise<ActionResult> {
  const result = await executeAction(sessionId, {
    action_type: 'goto',
    value: url,
    options: { waitUntil: 'networkidle0', timeout: 20000 },
  });
  if (waitMs > 0) await new Promise(r => setTimeout(r, waitMs));
  return result;
}

// Execute JavaScript in the browser and return the result
export async function evaluate(sessionId: string, expression: string): Promise<ActionResult> {
  return await executeAction(sessionId, {
    action_type: 'evaluate',
    value: expression,
    options: { returnByValue: true },
  });
}

// Click an element
export async function click(sessionId: string, selector: string): Promise<ActionResult> {
  return await executeAction(sessionId, {
    action_type: 'click',
    selector,
  });
}

// Fill an input
export async function fill(sessionId: string, selector: string, value: string): Promise<ActionResult> {
  return await executeAction(sessionId, {
    action_type: 'fill',
    selector,
    value,
  });
}

// Scroll the page
export async function scroll(sessionId: string, direction: 'up' | 'down' = 'down', px: number = 600): Promise<ActionResult> {
  return await executeAction(sessionId, {
    action_type: 'scroll',
    value: direction,
    options: { px },
  });
}

// ─── Screenshot Capture ────────────────────────────────────────

export interface ScreenshotResult {
  file_url: string;
  caption?: string;
}

export async function captureScreenshot(
  sessionId: string,
  options: { fullPage?: boolean; caption?: string; stepId?: string; jobId?: string; sessionEntityId?: string } = {}
): Promise<ScreenshotResult> {
  const result = await gatewayFetch('/functions/engineAction', {
    method: 'POST',
    body: JSON.stringify({
      action: 'screenshot',
      sessionId,
      sessionEntityId: options.sessionEntityId,
      fullPage: options.fullPage || false,
      caption: options.caption || '',
      stepId: options.stepId,
      jobId: options.jobId,
    }),
  });
  return {
    file_url: result.screenshot?.file_url || '',
    caption: options.caption,
  };
}

// ─── Paired Validation ─────────────────────────────────────────

export interface PairedValidationConfig {
  sourceUrl: string;
  cloneUrl: string;
  journeyPath: string;        // e.g. '/graphic-templates'
  journeyId: string;          // e.g. 'J-003'
  journeyName: string;        // e.g. 'Graphic Templates category'
  viewport?: { width: number; height: number };
  captureScreenshots?: boolean;
}

export interface PairedValidationResult {
  journey_id: string;
  journey_name: string;
  source_url: string;
  clone_url: string;
  source_page_type: string;
  clone_page_type: string;
  source_manifest: any;
  clone_manifest: any;
  semantic_parity_score: number;
  matched_types: string[];
  missing_required_types: string[];
  differences: string[];
  status: string;
  source_screenshot?: string;
  clone_screenshot?: string;
  evidence: {
    method: string;
    engine_health: EngineHealthResult;
    timestamp: string;
  };
}

// Run a paired SOURCE/CLONE validation using CloudBrowser.
// This is the core proof-of-concept function.
export async function runPairedValidation(
  config: PairedValidationConfig,
  compareFn: (source: any, clone: any) => any
): Promise<PairedValidationResult> {
  const { sourceUrl, cloneUrl, journeyPath, journeyId, journeyName, viewport, captureScreenshots = true } = config;

  // 1. Check engine health first
  const health = await checkEngineHealth();
  if (!health.healthy) {
    throw new Error(`CloudBrowser engine not healthy: ${health.error || 'unknown'}`);
  }

  const sessionConfig: SessionConfig = {
    viewport: viewport || { width: 1440, height: 900 },
    timeoutMs: 30000,
  };

  let sourceSession: BrowserSession | null = null;
  let cloneSession: BrowserSession | null = null;

  try {
    // 2. Create SOURCE session
    sourceSession = await createSession(sessionConfig);
    await goto(sourceSession.sessionId, new URL(journeyPath, sourceUrl).href, 3000);
    // Scroll to trigger lazy content
    await scroll(sourceSession.sessionId, 'down', 600);
    await new Promise(r => setTimeout(r, 1000));

    // 3. Capture SOURCE manifest
    const sourceManifestResult = await evaluate(
      sourceSession.sessionId,
      // The manifest script is injected as a string — it's self-contained
      `(function(){var components=[];var selectors=['nav','header','footer','main','aside','[role="navigation"]','[role="search"]','[role="button"]','[role="menu"]','[role="menuitem"]','[role="tab"]','[role="dialog"]','button','a[href]','input','select','textarea','form','details','summary','[class*="dropdown"]','[class*="filter"]','[class*="sort"]','[class*="pagination"]','[class*="card"]','[class*="pricing"]','[class*="cta"]','[class*="modal"]','[class*="tab"]','h1','h2','h3','img','video','svg'];var seen=new Set();var nodes=document.querySelectorAll(selectors.join(','));for(var i=0;i<nodes.length&&components.length<200;i++){var el=nodes[i];if(seen.has(el))continue;seen.add(el);var rect=el.getBoundingClientRect();if(rect.width===0&&rect.height===0)continue;var tag=el.tagName.toLowerCase();var role=el.getAttribute('role')||'';var text=(el.innerText||el.getAttribute('aria-label')||'').trim().slice(0,80);var href=el.getAttribute('href')||'';var st='unknown';if(tag==='nav'||role==='navigation')st='navigation';else if(tag==='header')st='header';else if(tag==='footer')st='footer';else if(role==='search'||(tag==='input'&&(el.type==='search')))st='search';else if(role==='button'||tag==='button'){st='button';var bt=text.toLowerCase();var bc=(el.className||'').toLowerCase();if(bc.includes('filter')||bt.includes('filter'))st='filter';else if(bc.includes('sort')||bt.includes('sort'))st='sort';else if(bc.includes('pagination')||/^[0-9]+$/.test(bt))st='pagination';else if(bc.includes('cta')||bt.includes('subscribe')||bt.includes('download'))st='cta';else if(bc.includes('menu')||bc.includes('dropdown'))st='menu';}else if(tag==='a'&&href){st='link';var lc=(el.className||'').toLowerCase();if(lc.includes('card')||el.closest('[class*="card"]'))st='card';else if(lc.includes('cta')||text.toLowerCase().includes('subscribe'))st='cta';}else if(role==='menu'||role==='menuitem')st='menu';else if(role==='tab')st='tab';else if(role==='dialog')st='modal';else if(tag==='details'||tag==='summary')st='accordion';else if(tag==='form')st='form';else if(tag==='select')st='select';else if(tag==='input'||tag==='textarea')st='input';else if(tag==='img'||tag==='video'||tag==='svg')st='media';else if(tag==='h1'||tag==='h2'||tag==='h3')st='heading';var region='main';if(rect.y<120)region='header';else if(rect.y>document.body.scrollHeight-200)region='footer';else if(rect.x<280&&rect.width<300)region='sidebar';components.push({component_id:'c'+components.length,tag:tag,role:role,accessible_name:text,text_signature:text,href_or_action:href,bounding_box:{x:Math.round(rect.x),y:Math.round(rect.y),w:Math.round(rect.width),h:Math.round(rect.height)},visible:true,component_region:region,semantic_type:st});}var tc={};for(var j=0;j<components.length;j++){var t=components[j].semantic_type;tc[t]=(tc[t]||0)+1;}return JSON.stringify({url:window.location.href,title:document.title,components:components,semantic_type_counts:tc,total_components:components.length});})()`
    );

    let sourceScreenshot = '';
    if (captureScreenshots) {
      const ss = await captureScreenshot(sourceSession.sessionId, {
        fullPage: false,
        caption: `SOURCE: ${journeyName}`,
        stepId: journeyId,
      });
      sourceScreenshot = ss.file_url;
    }

    // 4. Create CLONE session
    cloneSession = await createSession(sessionConfig);
    await goto(cloneSession.sessionId, new URL(journeyPath, cloneUrl).href, 3000);
    await scroll(cloneSession.sessionId, 'down', 600);
    await new Promise(r => setTimeout(r, 1000));

    // 5. Capture CLONE manifest
    const cloneManifestResult = await evaluate(
      cloneSession.sessionId,
      `(function(){var components=[];var selectors=['nav','header','footer','main','aside','[role="navigation"]','[role="search"]','[role="button"]','[role="menu"]','[role="menuitem"]','[role="tab"]','[role="dialog"]','button','a[href]','input','select','textarea','form','details','summary','[class*="dropdown"]','[class*="filter"]','[class*="sort"]','[class*="pagination"]','[class*="card"]','[class*="pricing"]','[class*="cta"]','[class*="modal"]','[class*="tab"]','h1','h2','h3','img','video','svg'];var seen=new Set();var nodes=document.querySelectorAll(selectors.join(','));for(var i=0;i<nodes.length&&components.length<200;i++){var el=nodes[i];if(seen.has(el))continue;seen.add(el);var rect=el.getBoundingClientRect();if(rect.width===0&&rect.height===0)continue;var tag=el.tagName.toLowerCase();var role=el.getAttribute('role')||'';var text=(el.innerText||el.getAttribute('aria-label')||'').trim().slice(0,80);var href=el.getAttribute('href')||'';var st='unknown';if(tag==='nav'||role==='navigation')st='navigation';else if(tag==='header')st='header';else if(tag==='footer')st='footer';else if(role==='search'||(tag==='input'&&(el.type==='search')))st='search';else if(role==='button'||tag==='button'){st='button';var bt=text.toLowerCase();var bc=(el.className||'').toLowerCase();if(bc.includes('filter')||bt.includes('filter'))st='filter';else if(bc.includes('sort')||bt.includes('sort'))st='sort';else if(bc.includes('pagination')||/^[0-9]+$/.test(bt))st='pagination';else if(bc.includes('cta')||bt.includes('subscribe')||bt.includes('download'))st='cta';else if(bc.includes('menu')||bc.includes('dropdown'))st='menu';}else if(tag==='a'&&href){st='link';var lc=(el.className||'').toLowerCase();if(lc.includes('card')||el.closest('[class*="card"]'))st='card';else if(lc.includes('cta')||text.toLowerCase().includes('subscribe'))st='cta';}else if(role==='menu'||role==='menuitem')st='menu';else if(role==='tab')st='tab';else if(role==='dialog')st='modal';else if(tag==='details'||tag==='summary')st='accordion';else if(tag==='form')st='form';else if(tag==='select')st='select';else if(tag==='input'||tag==='textarea')st='input';else if(tag==='img'||tag==='video'||tag==='svg')st='media';else if(tag==='h1'||tag==='h2'||tag==='h3')st='heading';var region='main';if(rect.y<120)region='header';else if(rect.y>document.body.scrollHeight-200)region='footer';else if(rect.x<280&&rect.width<300)region='sidebar';components.push({component_id:'c'+components.length,tag:tag,role:role,accessible_name:text,text_signature:text,href_or_action:href,bounding_box:{x:Math.round(rect.x),y:Math.round(rect.y),w:Math.round(rect.width),h:Math.round(rect.height)},visible:true,component_region:region,semantic_type:st});}var tc={};for(var j=0;j<components.length;j++){var t=components[j].semantic_type;tc[t]=(tc[t]||0)+1;}return JSON.stringify({url:window.location.href,title:document.title,components:components,semantic_type_counts:tc,total_components:components.length});})()`
    );

    let cloneScreenshot = '';
    if (captureScreenshots) {
      const ss = await captureScreenshot(cloneSession.sessionId, {
        fullPage: false,
        caption: `CLONE: ${journeyName}`,
        stepId: journeyId,
      });
      cloneScreenshot = ss.file_url;
    }

    // 6. Parse manifests and compare
    const sourceManifest = JSON.parse(sourceManifestResult.data || sourceManifestResult.url || '{}');
    const cloneManifest = JSON.parse(cloneManifestResult.data || cloneManifestResult.url || '{}');

    const comparison = compareFn(sourceManifest, cloneManifest);

    return {
      journey_id: journeyId,
      journey_name: journeyName,
      source_url: sourceManifest.url || new URL(journeyPath, sourceUrl).href,
      clone_url: cloneManifest.url || new URL(journeyPath, cloneUrl).href,
      source_page_type: comparison.source_page_type || 'valid_content',
      clone_page_type: comparison.clone_page_type || 'valid_content',
      source_manifest: { title: sourceManifest.title, semantic_type_counts: sourceManifest.semantic_type_counts, total_components: sourceManifest.total_components },
      clone_manifest: { title: cloneManifest.title, semantic_type_counts: cloneManifest.semantic_type_counts, total_components: cloneManifest.total_components },
      semantic_parity_score: comparison.semantic_parity_score || 0,
      matched_types: comparison.matched_types || [],
      missing_required_types: comparison.missing_required_types || [],
      differences: comparison.differences || [],
      status: comparison.status || 'fail',
      source_screenshot: sourceScreenshot,
      clone_screenshot: cloneScreenshot,
      evidence: {
        method: 'cloudbrowser_paired_session',
        engine_health: health,
        timestamp: new Date().toISOString(),
      },
    };
  } finally {
    if (sourceSession) await closeSession(sourceSession.sessionId, sourceSession.sessionEntityId);
    if (cloneSession) await closeSession(cloneSession.sessionId, cloneSession.sessionEntityId);
  }
}