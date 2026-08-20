// Provider-neutral Browser Worker Adapter
// PRIMARY: Browserbase (via existing stealthBrowser.ts CDP)
// FUTURE PRIMARY: CloudBrowser (after Fortress certification)
// SHADOW: CloudBrowser (for controlled comparison tests only)
//
// All provider output is normalized into the common model:
// SOURCE_SESSION, CLONE_SESSION, PAIRED_TEST_RUN, COMPONENT_MANIFEST,
// SCREENSHOT_PAIR, CONSOLE_RESULT, NETWORK_RESULT, DIFFERENTIAL_RESULT,
// VALIDATION_RECEIPT.

import { createStealthSession, releaseSession, CDPClient } from './stealthBrowser.ts';

// ─── Normalized Types ─────────────────────────────────────────

export interface WorkerSession {
  provider: 'browserbase' | 'cloudbrowser';
  sessionId: string;
  cdp?: CDPClient;
  cdpSessionId?: string;
  status: 'active' | 'closed' | 'error';
  startTime: string;
  endTime?: string;
  consoleEvidence: ConsoleEntry[];
  networkEvidence: NetworkEntry[];
}

export interface ConsoleEntry {
  type: 'log' | 'error' | 'warning' | 'external_warning';
  text: string;
  url?: string;
  timestamp: number;
}

export interface NetworkEntry {
  url: string;
  method?: string;
  status?: number;
  error?: string;
  timestamp: number;
  is_external_asset?: boolean;
}

export interface WorkerActionResult {
  ok: boolean;
  url?: string;
  title?: string;
  data?: any;
  error?: string;
}

export interface WorkerScreenshot {
  base64: string;
  format: string;
}

export interface SessionConfig {
  viewport?: { width: number; height: number };
  locale?: string;
  timezone?: string;
  timeoutMs?: number;
  proxy?: boolean;
  solveCaptchas?: boolean;
  recording?: boolean;
}

// ─── Provider Interface ────────────────────────────────────────

export interface BrowserWorkerProvider {
  name: 'browserbase' | 'cloudbrowser';
  createSession(config?: SessionConfig): Promise<WorkerSession>;
  closeSession(session: WorkerSession): Promise<void>;
  goto(session: WorkerSession, url: string, waitMs?: number): Promise<WorkerActionResult>;
  click(session: WorkerSession, selector: string): Promise<WorkerActionResult>;
  hover(session: WorkerSession, selector: string): Promise<WorkerActionResult>;
  fill(session: WorkerSession, selector: string, value: string): Promise<WorkerActionResult>;
  type(session: WorkerSession, text: string): Promise<WorkerActionResult>;
  press(session: WorkerSession, key: string): Promise<WorkerActionResult>;
  select(session: WorkerSession, selector: string, value: string): Promise<WorkerActionResult>;
  scroll(session: WorkerSession, direction: string, px?: number): Promise<WorkerActionResult>;
  evaluate(session: WorkerSession, expression: string): Promise<WorkerActionResult>;
  extract(session: WorkerSession, selector: string): Promise<WorkerActionResult>;
  screenshot(session: WorkerSession, options?: { fullPage?: boolean }): Promise<WorkerScreenshot>;
  getConsoleEvidence(session: WorkerSession): ConsoleEntry[];
  getNetworkEvidence(session: WorkerSession): NetworkEntry[];
}

// ─── Browserbase Provider ──────────────────────────────────────
// Wraps the existing stealthBrowser.ts CDP client.

export class BrowserbaseProvider implements BrowserWorkerProvider {
  name = 'browserbase' as const;

  async createSession(config: SessionConfig = {}): Promise<WorkerSession> {
    const session = await createStealthSession({
      solveCaptchas: config.solveCaptchas ?? false,
      proxies: config.proxy ?? false,
      blockAds: false,
      timeout: config.timeoutMs ?? 30000,
      waitAfterLoad: 2000,
    });

    const cdp = new CDPClient();
    await cdp.connect(session.connectUrl);

    const { targetInfos } = await cdp.send('Target.getTargets');
    const pageTarget = targetInfos.find((t: any) => t.type === 'page') || targetInfos[0];
    const attach = await cdp.send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
    const sid = attach.sessionId;

    await cdp.send('Page.enable', {}, sid);
    await cdp.send('Runtime.enable', {}, sid);
    await cdp.send('Network.enable', {}, sid);
    await cdp.send('Log.enable', {}, sid);

    // Set viewport if specified
    if (config.viewport) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: config.viewport.width,
        height: config.viewport.height,
        deviceScaleFactor: 1,
        mobile: false,
      }, sid).catch(() => {});
    }

    // Set locale/timezone if specified
    if (config.timezone) {
      await cdp.send('Emulation.setTimezoneOverride', { timezoneId: config.timezone }, sid).catch(() => {});
    }

    const consoleEvidence: ConsoleEntry[] = [];
    const networkEvidence: NetworkEntry[] = [];
    const requestUrls = new Map<string, string>();

    // Console evidence collection
    cdp.on('Runtime.consoleAPICalled', (p: any) => {
      if (p.type === 'error') {
        const text = (p.args || []).map((a: any) => a.value || a.description || '').join(' ').slice(0, 300);
        consoleEvidence.push({ type: 'error', text, timestamp: Date.now() });
      }
    });
    cdp.on('Log.entryAdded', (p: any) => {
      const e = p.entry;
      if (e.level === 'error' || e.level === 'warning') {
        consoleEvidence.push({
          type: e.level === 'error' ? 'error' : 'warning',
          text: (e.text || '').slice(0, 300),
          url: e.url,
          timestamp: Date.now(),
        });
      }
    });

    // Network evidence collection
    cdp.on('Network.requestWillBeSent', (p: any) => {
      requestUrls.set(p.requestId, p.request?.url || '');
    });
    cdp.on('Network.loadingFailed', (p: any) => {
      const err = p.errorText || p.blockedReason || 'unknown';
      if (err === 'net::ERR_ABORTED') return;
      const url = requestUrls.get(p.requestId) || '';
      networkEvidence.push({ url, error: err, timestamp: Date.now() });
    });
    cdp.on('Network.responseReceived', (p: any) => {
      const s = p.response?.status;
      if (s && s >= 400) {
        networkEvidence.push({ url: p.response.url || '', status: s, timestamp: Date.now() });
      }
    });

    return {
      provider: 'browserbase',
      sessionId: session.id,
      cdp,
      cdpSessionId: sid,
      status: 'active',
      startTime: new Date().toISOString(),
      consoleEvidence,
      networkEvidence,
    };
  }

  async closeSession(session: WorkerSession): Promise<void> {
    try {
      if (session.cdp) await session.cdp.close().catch(() => {});
      await releaseSession(session.sessionId);
    } catch {}
    session.status = 'closed';
    session.endTime = new Date().toISOString();
  }

  async goto(session: WorkerSession, url: string, waitMs: number = 3000): Promise<WorkerActionResult> {
    try {
      await session.cdp!.send('Page.navigate', { url }, session.cdpSessionId, 20000);
      await new Promise(r => setTimeout(r, waitMs));
      const meta = await session.cdp!.send('Runtime.evaluate', {
        expression: `JSON.stringify({url:location.href,title:document.title})`,
        returnByValue: true,
      }, session.cdpSessionId);
      const info = JSON.parse(meta?.result?.value || '{}');
      return { ok: true, url: info.url, title: info.title };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async evaluate(session: WorkerSession, expression: string): Promise<WorkerActionResult> {
    try {
      const result = await session.cdp!.send('Runtime.evaluate', {
        expression,
        returnByValue: true,
      }, session.cdpSessionId, 15000);
      // Check for exception details (expression threw an error)
      if (result?.result?.exceptionDetails) {
        const ex = result.result.exceptionDetails;
        const errText = ex.exception?.description || ex.text || 'unknown evaluation error';
        return { ok: false, error: errText.slice(0, 500) };
      }
      return { ok: true, data: result?.result?.value };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  async click(session: WorkerSession, selector: string): Promise<WorkerActionResult> {
    return this._evalAction(session, `var el=document.querySelector(${JSON.stringify(selector)});if(!el)return JSON.stringify({ok:false,error:'not found'});el.click();return JSON.stringify({ok:true});`);
  }

  async hover(session: WorkerSession, selector: string): Promise<WorkerActionResult> {
    return this._evalAction(session, `var el=document.querySelector(${JSON.stringify(selector)});if(!el)return JSON.stringify({ok:false,error:'not found'});var ev=new MouseEvent('mouseover',{bubbles:true});el.dispatchEvent(ev);return JSON.stringify({ok:true});`);
  }

  async fill(session: WorkerSession, selector: string, value: string): Promise<WorkerActionResult> {
    return this._evalAction(session, `var el=document.querySelector(${JSON.stringify(selector)});if(!el)return JSON.stringify({ok:false,error:'not found'});el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('input',{bubbles:true}));return JSON.stringify({ok:true});`);
  }

  async type(session: WorkerSession, text: string): Promise<WorkerActionResult> {
    return this._evalAction(session, `var el=document.activeElement;if(!el)return JSON.stringify({ok:false,error:'no active element'});el.value+=${JSON.stringify(text)};el.dispatchEvent(new Event('input',{bubbles:true}));return JSON.stringify({ok:true});`);
  }

  async press(session: WorkerSession, key: string): Promise<WorkerActionResult> {
    return this._evalAction(session, `document.activeElement&&document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(key)},bubbles:true}));return JSON.stringify({ok:true});`);
  }

  async select(session: WorkerSession, selector: string, value: string): Promise<WorkerActionResult> {
    return this._evalAction(session, `var el=document.querySelector(${JSON.stringify(selector)});if(!el)return JSON.stringify({ok:false,error:'not found'});el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('change',{bubbles:true}));return JSON.stringify({ok:true});`);
  }

  async scroll(session: WorkerSession, direction: string, px: number = 600): Promise<WorkerActionResult> {
    const dir = direction === 'up' ? -px : px;
    return this._evalAction(session, `window.scrollBy(0,${dir});return JSON.stringify({ok:true});`);
  }

  async extract(session: WorkerSession, selector: string): Promise<WorkerActionResult> {
    return this._evalAction(session, `var el=document.querySelector(${JSON.stringify(selector)});if(!el)return JSON.stringify({ok:false,error:'not found'});return JSON.stringify({ok:true,text:(el.innerText||'').slice(0,500),href:el.getAttribute('href')||''});`);
  }

  async screenshot(session: WorkerSession, options: { fullPage?: boolean } = {}): Promise<WorkerScreenshot> {
    const ss = await session.cdp!.send('Page.captureScreenshot', {
      format: 'jpeg',
      quality: 70,
    }, session.cdpSessionId);
    return { base64: ss?.data || '', format: 'jpeg' };
  }

  getConsoleEvidence(session: WorkerSession): ConsoleEntry[] {
    return [...session.consoleEvidence];
  }

  getNetworkEvidence(session: WorkerSession): NetworkEntry[] {
    return [...session.networkEvidence];
  }

  private async _evalAction(session: WorkerSession, js: string): Promise<WorkerActionResult> {
    try {
      const result = await session.cdp!.send('Runtime.evaluate', {
        expression: `(function(){${js}})()`,
        returnByValue: true,
      }, session.cdpSessionId, 10000);
      const data = JSON.parse(result?.result?.value || '{}');
      return { ok: data.ok !== false, data, error: data.error };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }
}

// ─── CloudBrowser Provider (STUB — for shadow testing after Fortress) ─────

export class CloudBrowserProvider implements BrowserWorkerProvider {
  name = 'cloudbrowser' as const;

  async createSession(_config?: SessionConfig): Promise<WorkerSession> {
    throw new Error('CloudBrowser provider not yet available — awaiting Fortress certification. Use BrowserbaseProvider.');
  }
  async closeSession(_session: WorkerSession): Promise<void> {}
  async goto(_s: WorkerSession, _u: string): Promise<WorkerActionResult> { return { ok: false, error: 'not implemented' }; }
  async click(_s: WorkerSession, _sel: string): Promise<WorkerActionResult> { return { ok: false, error: 'not implemented' }; }
  async hover(_s: WorkerSession, _sel: string): Promise<WorkerActionResult> { return { ok: false, error: 'not implemented' }; }
  async fill(_s: WorkerSession, _sel: string, _v: string): Promise<WorkerActionResult> { return { ok: false, error: 'not implemented' }; }
  async type(_s: WorkerSession, _t: string): Promise<WorkerActionResult> { return { ok: false, error: 'not implemented' }; }
  async press(_s: WorkerSession, _k: string): Promise<WorkerActionResult> { return { ok: false, error: 'not implemented' }; }
  async select(_s: WorkerSession, _sel: string, _v: string): Promise<WorkerActionResult> { return { ok: false, error: 'not implemented' }; }
  async scroll(_s: WorkerSession, _d: string): Promise<WorkerActionResult> { return { ok: false, error: 'not implemented' }; }
  async evaluate(_s: WorkerSession, _e: string): Promise<WorkerActionResult> { return { ok: false, error: 'not implemented' }; }
  async extract(_s: WorkerSession, _sel: string): Promise<WorkerActionResult> { return { ok: false, error: 'not implemented' }; }
  async screenshot(_s: WorkerSession): Promise<WorkerScreenshot> { throw new Error('not implemented'); }
  getConsoleEvidence(_s: WorkerSession): ConsoleEntry[] { return []; }
  getNetworkEvidence(_s: WorkerSession): NetworkEntry[] { return []; }
}

// ─── Factory ───────────────────────────────────────────────────

export function getProvider(name: 'browserbase' | 'cloudbrowser' = 'browserbase'): BrowserWorkerProvider {
  if (name === 'cloudbrowser') return new CloudBrowserProvider();
  return new BrowserbaseProvider();
}