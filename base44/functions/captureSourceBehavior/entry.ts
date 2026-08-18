import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { createStealthSession, releaseSession, CDPClient } from '../../shared/stealthBrowser.ts';

// Source Behavior Capture — navigates the SOURCE site with a real browser,
// discovers all interactive elements, clicks each one, and records the
// resulting state change (URL, DOM, visible content). This builds a
// SOURCE BEHAVIOR GRAPH that the interaction reconstruction engine uses
// to generate equivalent clone-side behavior.
//
// This is the "WHAT HAPPENS" discovery layer — not just what appears on the
// page, but what each control does when activated.

interface BehaviorRecord {
  element_index: number;
  tag: string;
  text: string;
  href: string;
  role: string;
  selector: string;
  position: { x: number; y: number; w: number; h: number };
  visible: boolean;
  action_type: string; // 'navigation' | 'modal' | 'dropdown' | 'tab' | 'scroll' | 'form_submit' | 'no_change'
  before_url: string;
  after_url: string;
  url_changed: boolean;
  dom_changed: boolean;
  before_dom_size: number;
  after_dom_size: number;
  visible_change: string;
  screenshot_before?: string;
  screenshot_after?: string;
  network_requests: string[];
  error: string | null;
}

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { target_url, max_elements = 50, capture_screenshots = false } = body;
    if (!target_url) return Response.json({ error: 'target_url required' }, { status: 400 });

    console.log(`[captureSourceBehavior] Capturing behavior for: ${target_url}`);

    let session: { id: string; connectUrl: string } | null = null;
    let cdp: CDPClient | null = null;
    let cdpSessionId: string | null = null;
    const behaviorGraph: BehaviorRecord[] = [];
    const networkRequests: string[] = [];

    try {
      session = await createStealthSession({
        deepRender: true, timeout: 30000, waitAfterLoad: 2000, solveCaptchas: true, proxies: true,
      });
      cdp = new CDPClient();
      await cdp.connect(session.connectUrl);
      const { targetInfos } = await cdp.send('Target.getTargets');
      const pageTarget = targetInfos.find((t: any) => t.type === 'page') || targetInfos[0];
      const attach = await cdp.send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
      cdpSessionId = attach.sessionId;
      await cdp.send('Page.enable', {}, cdpSessionId);
      await cdp.send('Runtime.enable', {}, cdpSessionId);
      await cdp.send('Network.enable', {}, cdpSessionId);

      // Track network requests
      cdp.on('Network.requestWillBeSent', (params: any) => {
        const url = params.request?.url || '';
        if (url && !url.startsWith('data:') && !url.includes('favicon')) {
          networkRequests.push(url);
        }
      });

      // Navigate to source page
      await cdp.send('Page.navigate', { url: target_url }, cdpSessionId, 25000);
      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => { if (!done) { done = true; resolve(); } };
        cdp!.on('Page.loadEventFired', finish);
        setTimeout(finish, 15000);
      });
      await new Promise(r => setTimeout(r, 3000));

      // Scroll to trigger lazy-loaded content
      try {
        await cdp.send('Runtime.evaluate', {
          expression: `(async()=>{
            var h=document.body.scrollHeight;
            for(var y=0;y<Math.min(h,5000);y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,150));}
            window.scrollTo(0,0);
            await new Promise(r=>setTimeout(r,1000));
          })()`,
          returnByValue: true, awaitPromise: true,
        }, cdpSessionId, 15000);
      } catch {}

      // Discover interactive elements
      const discoverResult = await cdp.send('Runtime.evaluate', {
        expression: `(function(){
          var els = document.querySelectorAll('a, button, [role="button"], [data-toggle], [aria-haspopup], select, input[type="submit"], [class*="dropdown" i], [class*="menu" i] a, [class*="nav" i] a');
          var results = [];
          for (var i = 0; i < Math.min(els.length, ${max_elements}); i++) {
            var el = els[i];
            var rect = el.getBoundingClientRect();
            results.push({
              index: i,
              tag: el.tagName,
              text: (el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().slice(0, 100),
              href: el.getAttribute('href') || '',
              role: el.getAttribute('role') || '',
              selector: el.id ? '#' + el.id : (el.className && typeof el.className === 'string' ? el.tagName + '.' + el.className.split(' ').filter(Boolean).join('.') : el.tagName),
              x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height),
              visible: rect.width > 0 && rect.height > 0 && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden',
            });
          }
          return JSON.stringify(results);
        })()`,
        returnByValue: true,
      }, cdpSessionId);

      const elements = JSON.parse(discoverResult?.result?.value || '[]');
      console.log(`[captureSourceBehavior] Discovered ${elements.length} interactive elements`);

      // For each element, capture state before and after click
      for (const el of elements) {
        if (!el.visible) continue;
        const record: BehaviorRecord = {
          element_index: el.index,
          tag: el.tag,
          text: el.text,
          href: el.href,
          role: el.role,
          selector: el.selector,
          position: { x: el.x, y: el.y, w: el.w, h: el.h },
          visible: el.visible,
          action_type: 'no_change',
          before_url: '',
          after_url: '',
          url_changed: false,
          dom_changed: false,
          before_dom_size: 0,
          after_dom_size: 0,
          visible_change: '',
          network_requests: [],
          error: null,
        };

        try {
          // Capture before state
          const beforeState = await cdp.send('Runtime.evaluate', {
            expression: `JSON.stringify({url: window.location.href, domSize: document.body ? document.body.innerHTML.length : 0, scrollY: window.scrollY})`,
            returnByValue: true,
          }, cdpSessionId);
          const before = JSON.parse(beforeState?.result?.value || '{}');
          record.before_url = before.url || '';
          record.before_dom_size = before.domSize || 0;

          // Skip external links (would navigate away)
          if (el.href && el.href.startsWith('http') && !el.href.includes(new URL(target_url).hostname)) {
            record.action_type = 'external_navigation';
            record.after_url = el.href;
            behaviorGraph.push(record);
            continue;
          }

          // Click the element
          const clickResult = await cdp.send('Runtime.evaluate', {
            expression: `(function(){
              var els = document.querySelectorAll('${el.selector.replace(/'/g, "\\'")}');
              if (!els.length) return 'not_found';
              var el = els[0];
              el.scrollIntoView({block:'center'});
              el.click();
              return 'clicked';
            })()`,
            returnByValue: true,
          }, cdpSessionId, 5000);

          if (clickResult?.result?.value === 'not_found') {
            record.error = 'element_not_found';
            behaviorGraph.push(record);
            continue;
          }

          // Wait for any transition
          await new Promise(r => setTimeout(r, 1500));

          // Capture after state
          const afterState = await cdp.send('Runtime.evaluate', {
            expression: `JSON.stringify({url: window.location.href, domSize: document.body ? document.body.innerHTML.length : 0, scrollY: window.scrollY})`,
            returnByValue: true,
          }, cdpSessionId);
          const after = JSON.parse(afterState?.result?.value || '{}');
          record.after_url = after.url || '';
          record.after_dom_size = after.domSize || 0;
          record.url_changed = record.before_url !== record.after_url;
          record.dom_changed = Math.abs(record.after_dom_size - record.before_dom_size) > 100;

          // Classify the action
          if (record.url_changed) {
            record.action_type = 'navigation';
          } else if (record.dom_changed) {
            // Check if a modal/dropdown appeared
            const modalCheck = await cdp.send('Runtime.evaluate', {
              expression: `(function(){
                var modals = document.querySelectorAll('[class*="modal"][class*="show"], [class*="modal"][style*="display: block"], [class*="dropdown"][class*="show"], [class*="menu"][style*="display: block"], [aria-expanded="true"]');
                return modals.length > 0 ? 'overlay_opened' : 'dom_changed';
              })()`,
              returnByValue: true,
            }, cdpSessionId);
            record.action_type = modalCheck?.result?.value || 'dom_changed';
            record.visible_change = record.action_type;
          } else {
            record.action_type = 'no_change';
          }

          // Navigate back if URL changed
          if (record.url_changed) {
            await cdp.send('Page.navigate', { url: target_url }, cdpSessionId, 10000);
            await new Promise(r => setTimeout(r, 2000));
          } else if (record.dom_changed) {
            // Close any opened modal/dropdown by pressing Escape
            await cdp.send('Input.dispatchKeyEvent', { key: 'Escape', code: 'Escape', type: 'keyDown' }, cdpSessionId);
            await cdp.send('Input.dispatchKeyEvent', { key: 'Escape', code: 'Escape', type: 'keyUp' }, cdpSessionId);
            await new Promise(r => setTimeout(r, 500));
          }
        } catch (e) {
          record.error = e.message;
          // Navigate back to source on error
          try {
            await cdp.send('Page.navigate', { url: target_url }, cdpSessionId, 10000);
            await new Promise(r => setTimeout(r, 2000));
          } catch {}
        }

        behaviorGraph.push(record);
      }

      console.log(`[captureSourceBehavior] Captured ${behaviorGraph.length} behavior records`);

    } finally {
      if (cdp) await cdp.close().catch(() => {});
      if (session) await releaseSession(session.id);
    }

    // Classify behavior patterns
    const patterns = {
      navigations: behaviorGraph.filter(r => r.action_type === 'navigation').length,
      overlays: behaviorGraph.filter(r => r.action_type === 'overlay_opened').length,
      dom_changes: behaviorGraph.filter(r => r.action_type === 'dom_changed').length,
      no_changes: behaviorGraph.filter(r => r.action_type === 'no_change').length,
      external: behaviorGraph.filter(r => r.action_type === 'external_navigation').length,
      errors: behaviorGraph.filter(r => r.error !== null).length,
    };

    return Response.json({
      status: 'success',
      target_url,
      elements_discovered: elements.length,
      behavior_records: behaviorGraph.length,
      patterns,
      behavior_graph: behaviorGraph,
      network_requests_captured: networkRequests.length,
    });
  } catch (error) {
    console.error('[captureSourceBehavior] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}