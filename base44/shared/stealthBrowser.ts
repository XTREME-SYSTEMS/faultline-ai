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
  deepRender?: boolean;       // scroll + resolve lazy images + extract computed backgrounds
  geoCountry?: string;       // proxy geolocation country
  geoState?: string;
  geoCity?: string;
  projectId?: string;
  viewport?: { width: number; height: number; mobile?: boolean; deviceScaleFactor?: number };
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
  shaderSource?: any;
  shaderDebug?: string;
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

    // Inject WebGL shader capture hook before navigation — overrides
    // shaderSource to capture all shader source code compiled by the page
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `(function(){window.__capturedShaders=[];window.__hookInfo={gpu:typeof navigator.gpu,GPUDevice:typeof GPUDevice};var orig=WebGLRenderingContext.prototype.shaderSource;WebGLRenderingContext.prototype.shaderSource=function(shader,source){window.__capturedShaders.push({source:source,type:shader.__flType||null});return orig.call(this,shader,source);};var origCreate=WebGLRenderingContext.prototype.createShader;WebGLRenderingContext.prototype.createShader=function(type){var s=origCreate.call(this,type);s.__flType=type===this.VERTEX_SHADER?'vertex':'fragment';return s;};if(typeof GPUDevice!=='undefined'&&GPUDevice.prototype.createShaderModule){var origCSM=GPUDevice.prototype.createShaderModule;GPUDevice.prototype.createShaderModule=function(descriptor){if(descriptor&&descriptor.code&&descriptor.code.length>50){window.__capturedShaders.push({source:descriptor.code,type:'wgsl',label:descriptor.label||''});}return origCSM.call(this,descriptor);};}if(navigator.gpu&&navigator.gpu.requestDevice){var origRD=navigator.gpu.requestDevice.bind(navigator.gpu);navigator.gpu.requestDevice=function(){return origRD.apply(navigator.gpu,arguments).then(function(dev){if(dev&&dev.createShaderModule){var origCSM2=dev.createShaderModule.bind(dev);dev.createShaderModule=function(d){if(d&&d.code&&d.code.length>50){window.__capturedShaders.push({source:d.code,type:'wgsl',label:d.label||''});}return origCSM2(d);};}return dev;});};}})();`
    }, sessionId);

    // Set viewport override if specified (for mobile responsive validation)
    if (options.viewport) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: options.viewport.width,
        height: options.viewport.height,
        deviceScaleFactor: options.viewport.deviceScaleFactor || 1,
        mobile: options.viewport.mobile || false,
      }, sessionId);
    }

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

    // Extract shader source BEFORE deepRender (deepRender may cause context loss)
    let shaderSource: any = null;
    const debugParts: any = {};
    if (options.deepRender) {
      try {
        // Try 1: Read shaders captured by the pre-navigation hook
        const hookResult = await cdp.send('Runtime.evaluate', {
          expression: `(function(){var csmHooked=false,rdHooked=false;try{csmHooked=GPUDevice.prototype.createShaderModule.toString().indexOf('__capturedShaders')>=0;}catch(e){}try{rdHooked=navigator.gpu.requestDevice.toString().indexOf('__capturedShaders')>=0;}catch(e){}var canvases=[];document.querySelectorAll('canvas').forEach(function(c){try{var hasWgpu=!!c.getContext('webgpu');canvases.push({id:c.id,cls:c.className,w:c.width,h:c.height,wgpu:hasWgpu});}catch(e){canvases.push({id:c.id,err:e.message});}});return JSON.stringify({captured:window.__capturedShaders||[],hookExists:typeof window.__capturedShaders!=='undefined',hookInfo:window.__hookInfo||null,gpu:typeof navigator.gpu,GPUDevice:typeof GPUDevice,csmHooked:csmHooked,rdHooked:rdHooked,canvases:canvases});})()`,
          returnByValue: true,
        }, sessionId, 10000);
        const hookDebug = hookResult?.result?.value || 'no value';
        debugParts.hook = hookDebug;
        console.log('Shader hook check:', hookDebug.slice(0, 300));
        if (hookResult?.result?.value) {
          const hookData = JSON.parse(hookResult.result.value);
          if (hookData.captured.length >= 2) {
            let uniforms: any[] = [];
            let attributes: any[] = [];
            try {
              const uaResult = await cdp.send('Runtime.evaluate', {
                expression: `(function(){var c=document.querySelector('canvas[data-renderer="shaders"]')||document.querySelector('canvas');if(!c)return'[]';var g=c.getContext('webgl2')||c.getContext('webgl');if(!g)return'[]';var p=g.getParameter(g.CURRENT_PROGRAM);if(!p)return'[]';var r={uniforms:[],attributes:[]};var nu=g.getProgramParameter(p,g.ACTIVE_UNIFORMS);for(var u=0;u<nu;u++){var i=g.getActiveUniform(p,u);if(i)r.uniforms.push({name:i.name,type:i.type,size:i.size});}var na=g.getProgramParameter(p,g.ACTIVE_ATTRIBUTES);for(var a=0;a<na;a++){var ai=g.getActiveAttrib(p,a);if(ai)r.attributes.push({name:ai.name,type:ai.type,size:ai.size});}return JSON.stringify(r);})()`,
                returnByValue: true,
              }, sessionId, 10000);
              if (uaResult?.result?.value) {
                const ua = JSON.parse(uaResult.result.value);
                uniforms = ua.uniforms || [];
                attributes = ua.attributes || [];
              }
            } catch {}
            shaderSource = { shaders: hookData.captured, uniforms, attributes };
            console.log('Shader source extracted via hook:', hookData.captured.length, 'shaders');
          }
        }

        // Try 1b: Extract WGSL shader variables directly from JS bundles.
        //    The typegpu library stores shader code as variables (e.g. Nee, Uee)
        //    and passes them to createShaderModule({code: VAR}). We find all such
        //    variables, extract their definitions (template strings), and collect
        //    the WGSL source code.
        if (!shaderSource) {
          try {
            const bundleSearch = await cdp.send('Runtime.evaluate', {
              expression: `(async function(){var scripts=document.querySelectorAll('script[src]');for(var i=0;i<scripts.length;i++){try{var res=await fetch(scripts[i].src);var text=await res.text();if(text.indexOf('createShaderModule')<0)continue;var varNames=[];var regex=/createShaderModule\\(\\{code:(\\w+)\\)/g;var m;while((m=regex.exec(text))!==null){varNames.push(m[1]);}var bt=String.fromCharCode(96);var shaders=[];for(var v=0;v<varNames.length;v++){var name=varNames[v];var defRegex=new RegExp('(?:var|const|let)\\\\s+'+name+'\\\\s*=\\\\s*'+bt+'([\\\\s\\\\S]*?)'+bt);var dm=text.match(defRegex);if(dm){shaders.push({name:name,source:dm[1],type:'wgsl'});}}if(shaders.length>0)return JSON.stringify({src:scripts[i].src,found:true,shaders:shaders});}return JSON.stringify({found:false});})()`,
              returnByValue: true,
              awaitPromise: true,
            }, sessionId, 20000);
            const bundleDebug = bundleSearch?.result?.value || 'no value';
            debugParts.bundle = bundleDebug.slice(0, 2000);
            console.log('Bundle shader extraction:', bundleDebug.slice(0, 500));
            if (bundleSearch?.result?.value) {
              const bundleData = JSON.parse(bundleSearch.result.value);
              if (bundleData.found && bundleData.shaders && bundleData.shaders.length > 0) {
                shaderSource = { shaders: bundleData.shaders, uniforms: [], attributes: [] };
                console.log('Shader source extracted from JS bundle:', bundleData.shaders.length, 'shaders');
              }
            }
          } catch (e) {
            console.error('Bundle search failed:', e.message);
          }
        }

        // Try 1c: If hook didn't capture, inject hook NOW via Runtime.evaluate
        //        and wait — the hero shader may be created in a useEffect that
        //        runs after initial render, so a post-load hook can still catch it.
        if (!shaderSource) {
          try {
            await cdp.send('Runtime.evaluate', {
              expression: `(function(){if(!window.__capturedShaders)window.__capturedShaders=[];if(typeof GPUDevice!=='undefined'&&GPUDevice.prototype.createShaderModule&&!GPUDevice.prototype.createShaderModule.__flHooked){var orig=GPUDevice.prototype.createShaderModule;GPUDevice.prototype.createShaderModule=function(d){if(d&&d.code&&d.code.length>50){window.__capturedShaders.push({source:d.code,type:'wgsl',label:d.label||''});}return orig.call(this,d);};GPUDevice.prototype.createShaderModule.__flHooked=true;}if(navigator.gpu&&navigator.gpu.requestDevice&&!navigator.gpu.requestDevice.__flHooked){var origRD=navigator.gpu.requestDevice.bind(navigator.gpu);navigator.gpu.requestDevice=function(){return origRD.apply(navigator.gpu,arguments).then(function(dev){if(dev&&dev.createShaderModule&&!dev.createShaderModule.__flHooked){var origCSM=dev.createShaderModule.bind(dev);dev.createShaderModule=function(d){if(d&&d.code&&d.code.length>50){window.__capturedShaders.push({source:d.code,type:'wgsl',label:d.label||''});}return origCSM(d);};dev.createShaderModule.__flHooked=true;}return dev;});};navigator.gpu.requestDevice.__flHooked=true;}})();`,
              returnByValue: true,
            }, sessionId, 5000);
            // Wait for the shader to be created (React useEffect may run after load)
            await new Promise(r => setTimeout(r, 3000));
            const recheck = await cdp.send('Runtime.evaluate', {
              expression: 'JSON.stringify(window.__capturedShaders||[])',
              returnByValue: true,
            }, sessionId, 5000);
            const recheckDebug = recheck?.result?.value || 'no value';
            debugParts.postLoad = recheckDebug;
            console.log('Post-load hook recheck:', recheckDebug.slice(0, 300));
            if (recheck?.result?.value) {
              const captured = JSON.parse(recheck.result.value);
              if (captured.length > 0) {
                shaderSource = { shaders: captured, uniforms: [], attributes: [] };
                console.log('Shader source extracted via post-load hook:', captured.length, 'shaders');
              }
            }
          } catch (e) {
            console.error('Post-load hook failed:', e.message);
          }
        }

        // Try 2: Direct WebGL approach if hook didn't work
        if (!shaderSource) {
          const directResult = await cdp.send('Runtime.evaluate', {
            expression: `(function(){var c=document.querySelector('canvas[data-renderer="shaders"]')||document.querySelector('canvas');if(!c)return JSON.stringify({error:'no_canvas'});var g=c.getContext('webgl2')||c.getContext('webgl');if(!g)return JSON.stringify({error:'no_context'});var lost=g.isContextLost();if(lost)return JSON.stringify({error:'context_lost'});var p=g.getParameter(g.CURRENT_PROGRAM);if(!p)return JSON.stringify({error:'no_program',canvasW:c.width,canvasH:c.height});var sh=g.getAttachedShaders(p);var shaders=[];for(var i=0;i<sh.length;i++){var t=g.getShaderParameter(sh[i],g.SHADER_TYPE);shaders.push({type:t===g.VERTEX_SHADER?'vertex':'fragment',source:g.getShaderSource(sh[i])});}var uniforms=[];var nu=g.getProgramParameter(p,g.ACTIVE_UNIFORMS);for(var u=0;u<nu;u++){var inf=g.getActiveUniform(p,u);if(inf)uniforms.push({name:inf.name,type:inf.type,size:inf.size});}var attribs=[];var na=g.getProgramParameter(p,g.ACTIVE_ATTRIBUTES);for(var a=0;a<na;a++){var ai=g.getActiveAttrib(p,a);if(ai)attribs.push({name:ai.name,type:ai.type,size:ai.size});}return JSON.stringify({shaders:shaders,uniforms:uniforms,attributes:attribs});})()`,
            returnByValue: true,
          }, sessionId, 10000);
          const directDebug = directResult?.result?.value || 'no value';
          debugParts.direct = directDebug;
          console.log('Shader direct check:', directDebug.slice(0, 300));
          if (directResult?.result?.value) {
            const data = JSON.parse(directResult.result.value);
            if (data.shaders && data.shaders.length >= 2) {
              shaderSource = data;
              console.log('Shader source extracted directly:', data.shaders.length, 'shaders');
            }
          }
        }
      } catch (e) {
        console.error('Shader extraction failed:', e.message);
      }
    }

    // Deep render: dismiss cookie/consent banners, scroll through ENTIRE page,
    // resolve lazy-loaded images, extract computed background images, capture
    // canvas/WebGL content as images, and wait for all images to finish loading.
    // This captures JS-rendered images (hero backgrounds, slider content,
    // lazy-loaded galleries, canvas animations) that are missing from the static
    // HTML — essential for 100/100 visual parity.
    if (options.deepRender) {
      try {
        const deepJs = `(async () => {
          // 0. DISMISS COOKIE / CONSENT BANNERS — these overlay the real content
          //    and prevent the scraper from seeing the actual page behind them.
          //    Try common consent SDK buttons (OneTrust, Cookiebot, Quantcast, IAB,
          //    Didomi, custom), then remove any remaining fixed-position overlays.
          var consentDismissed = 0;
          var consentSelectors = [
            '#onetrust-accept-btn-handler', '#onetrust-reject-all-handler',
            '#CybotCookiebotDialogBodyButtonDecline', '#CybotCookiebotDialogBodyButtonAccept',
            '.qc-cmp2-summary-buttons button[mode="primary"]', '.qc-cmp2-buttons button',
            '#didomi-notice-agree-button', '#didomi-notice-disagree-button',
            '#iabv2-consent-accept', '#iabv2-consent-reject', '[id*="iab"] button',
            '.cc-accept', '.cc-dismiss', '.cc-btn', '#cc-accept',
            '#consent-accept', '#consent-reject', '[data-consent="accept"]',
            'button[class*="accept"]', 'button[class*="agree"]', 'button[class*="consent"]',
            'a[class*="accept"]', 'a[class*="consent"]',
            '.consent-banner button', '.cookie-banner button', '.cookie-notice button',
            '#cookie-accept', '#cookie-accept-all', '#accept-cookies',
            '.js-accept-cookies', '.js-cookie-accept'
          ];
          consentSelectors.forEach(function(sel) {
            document.querySelectorAll(sel).forEach(function(btn) {
              try { btn.click(); consentDismissed++; } catch(e) {}
            });
          });
          // Remove any remaining fixed/overlay consent elements that block content
          document.querySelectorAll('[id*="consent"], [id*="cookie"], [class*="consent-banner"], [class*="cookie-banner"], [class*="cookie-notice"], [id*="onetrust"], [id*="Cybot"], [id*="didomi"], [id*="iab"]').forEach(function(el) {
            if (el && el.parentNode) {
              try {
                var s = getComputedStyle(el);
                if (s.position === 'fixed' || s.position === 'absolute' || s.zIndex > 999) {
                  el.parentNode.removeChild(el);
                  consentDismissed++;
                }
              } catch(e) {}
            }
          });
          await new Promise(r => setTimeout(r, 500));

          // 1. Scroll through ENTIRE page to trigger ALL lazy loading
          //    (scroll in steps, re-checking scrollHeight since content may expand.
          //    2 passes max — balances completeness with speed to avoid gateway timeouts)
          var totalHeight = document.body.scrollHeight;
          var step = 900;
          var scrollPasses = 0;
          for (var pass = 0; pass < 2; pass++) {
            var prevHeight = totalHeight;
            for (var y = 0; y < totalHeight; y += step) {
              window.scrollTo(0, y);
              await new Promise(r => setTimeout(r, 120));
              scrollPasses++;
              if (document.body.scrollHeight > totalHeight) totalHeight = document.body.scrollHeight;
            }
            if (totalHeight === prevHeight) break;
          }
          window.scrollTo(0, totalHeight);
          await new Promise(r => setTimeout(r, 400));
          window.scrollTo(0, 0);
          await new Promise(r => setTimeout(r, 300));

          // 2. Promote data-src variants to src
          document.querySelectorAll('img[data-src]').forEach(function(img) {
            if (img.dataset.src) img.src = img.dataset.src;
          });
          document.querySelectorAll('img[data-lazy-src]').forEach(function(img) {
            if (img.dataset.lazySrc) img.src = img.dataset.lazySrc;
          });
          document.querySelectorAll('img[data-original]').forEach(function(img) {
            if (img.dataset.original) img.src = img.dataset.original;
          });

          // 2b. Promote data-src on iframes (lazy-loaded video embeds)
          document.querySelectorAll('iframe[data-src]').forEach(function(iframe) {
            if (iframe.dataset.src) iframe.src = iframe.dataset.src;
          });
          document.querySelectorAll('iframe[data-lazy-src]').forEach(function(iframe) {
            if (iframe.dataset.lazySrc) iframe.src = iframe.dataset.lazySrc;
          });

          // 3. Handle srcset — set the largest URL as src if missing/placeholder
          document.querySelectorAll('img[srcset]').forEach(function(img) {
            if (!img.src || img.src.indexOf('data:image') === 0) {
              var srcset = img.getAttribute('srcset') || '';
              var urls = srcset.split(',').map(function(s) { return s.trim().split(/\\s+/)[0]; }).filter(Boolean);
              if (urls.length > 0) img.src = urls[urls.length - 1];
            }
          });

          // 4. Extract computed background images and set as inline style
          //    ONLY for visible elements with non-zero dimensions (avoids injecting
          //    backgrounds from hidden/unused elements that would appear as visual noise)
          var bgCount = 0;
          document.querySelectorAll('*').forEach(function(el) {
            try {
              if (el.offsetWidth === 0 || el.offsetHeight === 0) return;
              var style = getComputedStyle(el);
              if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return;
              var bg = style.backgroundImage;
              if (bg && bg !== 'none' && bg.indexOf('url(') === 0) {
                el.style.backgroundImage = bg;
                bgCount++;
              }
            } catch (e) {}
          });

          // 4b. CAPTURE CANVAS / WEBGL content as images — many modern hero
          //     sections (Envato, SaaS sites) render backgrounds via <canvas>
          //     or WebGL animations. Capture the current frame as a PNG and
          //     set it as a CSS background-image on the canvas's parent.
          var canvasCount = 0;
          document.querySelectorAll('canvas').forEach(function(canvas) {
            try {
              if (canvas.width === 0 || canvas.height === 0) return;
              var dataUrl = canvas.toDataURL('image/png');
              if (dataUrl && dataUrl.length > 100) {
                var parent = canvas.parentElement;
                if (parent) {
                  parent.style.backgroundImage = 'url(' + dataUrl + ')';
                  parent.style.backgroundSize = 'cover';
                  parent.style.backgroundPosition = 'center';
                  canvasCount++;
                }
              }
            } catch(e) {}
          });

          // 5. Wait for images to load (capped at 3s total — don't let slow
          //    CDN images block the scrape on large sites with hundreds of images)
          var imgs = Array.from(document.images);
          var imgWaitStart = Date.now();
          await Promise.race([
            Promise.all(imgs.map(function(img) {
              if (img.complete && img.naturalWidth > 0) return Promise.resolve();
              return new Promise(function(resolve) {
                img.onload = img.onerror = resolve;
                setTimeout(resolve, 2000);
              });
            })),
            new Promise(function(resolve) { setTimeout(resolve, 3000); })
          ]);

          return JSON.stringify({ scrolled: totalHeight, bgInjected: bgCount, canvasCaptured: canvasCount, consentDismissed: consentDismissed, scrollPasses: scrollPasses, images: imgs.length });
        })()`;

        const deepResult = await cdp.send('Runtime.evaluate', {
          expression: deepJs,
          returnByValue: true,
          awaitPromise: true,
        }, sessionId, 60000);
        console.log('Deep render:', deepResult?.result?.value || 'no result');
      } catch (e) {
        console.error('Deep render failed:', e.message);
      }
    }

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
      shaderSource,
      shaderDebug: JSON.stringify(debugParts),
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
      shaderSource: null,
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

// ─── Shader Extraction from JS Bundles (server-side) ──────────────────
//    Fetches the page's JS bundles from the Deno runtime and searches for
//    createShaderModule({code: VAR}) patterns. Extracts the WGSL shader
//    code from the variable definitions. This is more reliable than
//    browser-side extraction because it avoids timing issues with hooks.

export async function extractShadersFromBundles(pageUrl: string, html: string): Promise<any> {
  const debug: any = { scriptUrls: [], scanned: [], varNames: [], errors: [] };

  // Find all script src URLs in the HTML
  const scriptRegex = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const scriptUrls: string[] = [];
  let m;
  while ((m = scriptRegex.exec(html)) !== null) {
    try {
      const fullUrl = new URL(m[1], pageUrl).href;
      if (fullUrl.endsWith('.js') || fullUrl.includes('/assets/') || fullUrl.includes('/static/')) {
        scriptUrls.push(fullUrl);
      }
    } catch { /* skip invalid */ }
  }
  debug.scriptUrls = scriptUrls;
  console.log(`Found ${scriptUrls.length} JS bundles to scan for shaders`);

  for (const scriptUrl of scriptUrls) {
    try {
      const res = await fetch(scriptUrl, {
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShaderExtractor/1.0)' },
      });
      if (!res.ok) { debug.errors.push(`${scriptUrl}: HTTP ${res.status}`); continue; }
      const text = await res.text();
      debug.scanned.push({ url: scriptUrl, len: text.length, hasCSM: text.indexOf('createShaderModule') >= 0 });
      if (text.indexOf('createShaderModule') < 0) continue;

      console.log(`Scanning ${scriptUrl} (${text.length} chars) for shaders...`);

      // Find all createShaderModule({code: VAR}) calls
      // The pattern is: createShaderModule({code:VAR}) or createShaderModule({code:VAR,label:...})
      const callRegex = /createShaderModule\(\{code:(\w+)[,}]/g;
      const varNames: string[] = [];
      let match;
      while ((match = callRegex.exec(text)) !== null) {
        if (!varNames.includes(match[1])) varNames.push(match[1]);
      }
      debug.varNames = varNames;
      console.log(`Found ${varNames.length} shader variables: ${varNames.join(', ')}`);

      // Extract each variable's definition (template string)
      const shaders: any[] = [];
      for (const varName of varNames) {
        // Try patterns: var/const/let NAME = `...`
        const patterns = [
          new RegExp(`(?:var|const|let)\\s+${varName}\\s*=\\s*\`([\\s\\S]*?)\``),
          new RegExp(`\\s${varName}\\s*=\\s*\`([\\s\\S]*?)\``),
          new RegExp(`,${varName}\\s*=\\s*\`([\\s\\S]*?)\``),
        ];
        for (const pattern of patterns) {
          const defMatch = text.match(pattern);
          if (defMatch && defMatch[1] && defMatch[1].length > 50) {
            shaders.push({ name: varName, source: defMatch[1], type: 'wgsl' });
            break;
          }
        }
      }

      // Also search for ALL template strings containing WGSL markers
      // (@vertex, @fragment, @compute). This catches shaders passed via
      // conditional expressions (e.g. t?Uee:Lee) that the simple regex misses.
      const bt = String.fromCharCode(96);
      const wgslPattern = bt + '([^' + bt + ']*@(?:vertex|fragment|compute)[^' + bt + ']*?)' + bt;
      const wgslRegex = new RegExp(wgslPattern, 'g');
      let wgslMatch;
      while ((wgslMatch = wgslRegex.exec(text)) !== null) {
        const code = wgslMatch[1];
        if (code.length > 50 && !shaders.some(s => s.source === code)) {
          shaders.push({ name: 'wgsl_extracted', source: code, type: 'wgsl' });
        }
      }

      if (shaders.length > 0) {
        console.log(`Extracted ${shaders.length} shaders from ${scriptUrl}`);
        return { shaders, uniforms: [], attributes: [], source: scriptUrl, debug };
      }
    } catch (e) {
      debug.errors.push(`${scriptUrl}: ${e.message}`);
      console.error(`Failed to fetch/scan ${scriptUrl}: ${e.message}`);
    }
  }

  return { shaders: [], uniforms: [], attributes: [], source: null, debug };
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