// Real-browser audit harness for generated clones.
// Drives a Browserbase stealth session over raw CDP to:
//   1. load the clone URL and wait for hydration,
//   2. enumerate every interactive element (links, buttons, dropdowns),
//   3. click/navigate each one,
//   4. capture the resulting URL, HTTP status, console errors, and failed network requests,
//   5. classify each as PASS / FAIL_404 / FAIL_LOGIN / FAIL_DEAD_END / FAIL_CONSOLE_ERROR / FAIL_NETWORK.
// Returns a structured receipt — real browser evidence, not source inspection.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { createStealthSession, releaseSession, CDPClient } from '../../shared/stealthBrowser.ts';
import { buildNavLinkResolverScript } from '../../shared/fullSiteClone.ts';

export default async function(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { clone_url, max_elements = 60, deep_crawl = false, inject_resolver = false } = body;
  if (!clone_url) return Response.json({ error: 'clone_url required' }, { status: 400 });

  let session: { id: string; connectUrl: string } | null = null;
  let cdp: CDPClient | null = null;
  const consoleErrors: any[] = [];
  const networkFailures: any[] = [];
  const receipts: any[] = [];

  try {
    session = await createStealthSession({
      solveCaptchas: true, proxies: true, blockAds: false,
      timeout: 30000, waitAfterLoad: 3000,
    });
    cdp = new CDPClient();
    await cdp.connect(session.connectUrl);

    // Attach to the page target
    const { targetInfos } = await cdp.send('Target.getTargets');
    const pageTarget = targetInfos.find((t: any) => t.type === 'page') || targetInfos[0];
    const attach = await cdp.send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
    const sid = attach.sessionId;

    await cdp.send('Page.enable', {}, sid);
    await cdp.send('Runtime.enable', {}, sid);
    await cdp.send('Network.enable', {}, sid);
    await cdp.send('Log.enable', {}, sid);

    // Collect console + network evidence throughout the session
    cdp.on('Runtime.consoleAPICalled', (p: any) => {
      if (p.type === 'error') {
        const text = (p.args || []).map((a: any) => a.value || a.description || '').join(' ');
        consoleErrors.push({ type: 'console_error', text: text.slice(0, 300), ts: Date.now() });
      }
    });
    cdp.on('Log.entryAdded', (p: any) => {
      const e = p.entry;
      if (e.level === 'error' || e.level === 'warning') {
        consoleErrors.push({ type: 'log_' + e.level, text: (e.text || '').slice(0, 300), url: e.url, ts: Date.now() });
      }
    });
    // Track full request URLs so we can report meaningful failures (not just requestIds)
    const requestUrls = new Map<string, string>();
    cdp.on('Network.requestWillBeSent', (p: any) => {
      requestUrls.set(p.requestId, p.request?.url || '');
    });
    cdp.on('Network.loadingFailed', (p: any) => {
      // ERR_ABORTED is benign — fires when navigating away cancels pending requests.
      // Only record real resource failures (net::ERR_FAILED, ERR_NAME_NOT_RESOLVED, etc.)
      const err = p.errorText || p.blockedReason || 'unknown';
      if (err === 'net::ERR_ABORTED') return;
      networkFailures.push({ url: requestUrls.get(p.requestId) || p.requestId, error: err, ts: Date.now() });
    });
    cdp.on('Network.responseReceived', (p: any) => {
      const s = p.response?.status;
      if (s && s >= 400) {
        networkFailures.push({ url: p.response.url, status: s, ts: Date.now() });
      }
    });

    // ─── Navigate to clone homepage ──────────────────────────────
    await cdp.send('Page.navigate', { url: clone_url }, sid, 30000);
    await waitForHydration(cdp, sid, 8000);

    // Optionally inject the nav-link resolver to validate the fix against an existing clone
    let resolver_injected = false;
    if (inject_resolver) {
      const resolverScript = buildNavLinkResolverScript(
        'https://fault-line.base44.app/autoleads/register',
        'https://fault-line.base44.app/autoleads/login'
      );
      await cdp.send('Runtime.evaluate', {
        expression: resolverScript.replace(/<\/?script>/g, ''),
        returnByValue: true,
      }, sid);
      await new Promise(r => setTimeout(r, 2000)); // wait for rewrite + MutationObserver
      resolver_injected = true;
    }

    // Capture homepage metadata
    const homeMeta = await cdp.send('Runtime.evaluate', {
      expression: `JSON.stringify({ url: location.href, title: document.title, h1: (document.querySelector('h1')||{}).innerText || '', bodyChars: document.body.innerText.length, interactiveCount: document.querySelectorAll('a[href],button,[role="button"],input[type="submit"]').length })`,
      returnByValue: true,
    }, sid);
    const homeInfo = JSON.parse(homeMeta?.result?.value || '{}');

    // ─── Enumerate interactive elements ──────────────────────────
    const enumResult = await cdp.send('Runtime.evaluate', {
      expression: `(function(){
        var els = [];
        var nodes = document.querySelectorAll('a[href], button, [role="button"], [role="menuitem"], input[type="submit"], summary');
        nodes.forEach(function(n, i){
          if (i >= ${max_elements}) return;
          var rect = n.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return;
          var tag = n.tagName.toLowerCase();
          var href = n.getAttribute('href') || '';
          var text = (n.innerText || n.getAttribute('aria-label') || n.getAttribute('title') || '').trim().slice(0, 60);
          var role = n.getAttribute('role') || '';
          var isDropdown = !!(n.closest('[class*="dropdown"],[class*="menu"],[data-toggle]') || tag === 'summary' || role === 'button' && n.querySelector('svg, .chevron'));
          els.push({ i: i, tag: tag, href: href, text: text, role: role, isDropdown: isDropdown, x: Math.round(rect.x), y: Math.round(rect.y) });
        });
        return JSON.stringify(els);
      })()`,
      returnByValue: true,
    }, sid);
    const elements: any[] = JSON.parse(enumResult?.result?.value || '[]');

    // ─── Click / navigate each element ───────────────────────────
    for (const el of elements) {
      const receipt: any = { test_id: `EL-${String(el.i).padStart(3, '0')}`, label: el.text || el.href || el.tag, tag: el.tag, href: el.href, isDropdown: el.isDropdown, expected: '', actual: '', final_url: '', status: '', console_errors: [], network_failures: [] };

      // For dropdowns: click to open, then enumerate children
      if (el.isDropdown && !el.href) {
        const beforeClick = await cdp.send('Runtime.evaluate', {
          expression: `(function(){
            var n = document.querySelectorAll('a[href],button,[role="button"],[role="menuitem"],input[type="submit"],summary')[${el.i}];
            if(!n) return JSON.stringify({ok:false});
            n.click();
            return JSON.stringify({ok:true, text: (n.innerText||'').slice(0,60)});
          })()`,
          returnByValue: true,
        }, sid);
        await new Promise(r => setTimeout(r, 1200));
        // Check what became visible
        const afterClick = await cdp.send('Runtime.evaluate', {
          expression: `(function(){
            var menus = document.querySelectorAll('[class*="dropdown-menu"],[class*="submenu"],[role="menu"],[aria-expanded="true"] ul, details[open] ul');
            var visibleLinks = [];
            menus.forEach(function(m){
              m.querySelectorAll('a[href]').forEach(function(a){
                var r = a.getBoundingClientRect();
                if(r.width > 0) visibleLinks.push({ href: a.getAttribute('href'), text: (a.innerText||'').slice(0,40) });
              });
            });
            return JSON.stringify({ menuCount: menus.length, visibleLinks: visibleLinks.slice(0, 12) });
          })()`,
          returnByValue: true,
        }, sid);
        const dropInfo = JSON.parse(afterClick?.result?.value || '{}');
        receipt.expected = 'dropdown opens with child links';
        receipt.actual = `opened=${dropInfo.menuCount > 0}, children=${dropInfo.visibleLinks?.length || 0}`;
        receipt.status = dropInfo.menuCount > 0 ? 'PASS' : 'FAIL_DEAD_END';
        receipt.dropdown_children = dropInfo.visibleLinks || [];
        receipts.push(receipt);
        continue;
      }

      // For links with href: navigate and check destination
      if (el.href) {
        // Resolve relative URLs
        const fullUrl = el.href.startsWith('http') ? el.href : new URL(el.href, clone_url).href;
        receipt.expected = `navigates to ${fullUrl}`;

        // DEAD LINK: href="#" or href="" — a nav link that goes nowhere is a defect
        if (el.href === '#' || el.href === '') {
          receipt.status = 'FAIL_DEAD_LINK';
          receipt.actual = `href="#" — link labeled "${el.text}" goes nowhere`;
          receipts.push(receipt);
          continue;
        }

        // Skip external links, mailto, tel, javascript
        if (fullUrl.startsWith('mailto:') || fullUrl.startsWith('tel:') || fullUrl.startsWith('javascript:')) {
          receipt.status = 'NOT_APPLICABLE_WITH_PROOF'; receipt.actual = 'non-navigable link'; receipts.push(receipt); continue;
        }
        if (!fullUrl.includes(new URL(clone_url).hostname) && !fullUrl.includes('.vercel.app')) {
          receipt.status = 'NOT_APPLICABLE_WITH_PROOF'; receipt.actual = 'external link'; receipts.push(receipt); continue;
        }

        // Navigate to the link
        const beforeErrors = consoleErrors.length;
        const beforeFails = networkFailures.length;
        try {
          await cdp.send('Page.navigate', { url: fullUrl }, sid, 15000);
          await waitForHydration(cdp, sid, 5000);
          const destMeta = await cdp.send('Runtime.evaluate', {
            expression: `JSON.stringify({ url: location.href, title: document.title, bodyChars: document.body.innerText.length, is404: document.title.toLowerCase().includes('404') || document.body.innerText.toLowerCase().includes('not found'), isLogin: location.href.includes('/login') || location.href.includes('/sign-in') || location.href.includes('/autoleads/login'), h1: (document.querySelector('h1')||{}).innerText || '' })`,
            returnByValue: true,
          }, sid);
          const dest = JSON.parse(destMeta?.result?.value || '{}');
          receipt.final_url = dest.url;
          receipt.actual = `title="${(dest.title||'').slice(0,60)}", bodyChars=${dest.bodyChars}, h1="${(dest.h1||'').slice(0,60)}"`;
          receipt.console_errors = consoleErrors.slice(beforeErrors).map(e => e.text);
          receipt.network_failures = networkFailures.slice(beforeFails).map(e => `${e.url} ${e.status||''} ${e.error||''}`);

          if (dest.is404) receipt.status = 'FAIL_404';
          else if (dest.isLogin && !el.href.includes('login') && !el.href.includes('sign-in')) receipt.status = 'FAIL_LOGIN';
          else if (dest.bodyChars < 100) receipt.status = 'FAIL_DEAD_END';
          else if (receipt.network_failures.length > 0) receipt.status = 'FAIL_NETWORK';
          else receipt.status = 'PASS';
        } catch (e: any) {
          receipt.status = 'FAIL_NETWORK'; receipt.actual = `nav error: ${e.message}`;
        }
        receipts.push(receipt);

        // Navigate back to homepage for next element
        if (receipts.length < elements.length) {
          await cdp.send('Page.navigate', { url: clone_url }, sid, 15000);
          await waitForHydration(cdp, sid, 3000);
        }
        continue;
      }

      // For buttons without href: click and observe DOM/URL change
      const beforeErrors = consoleErrors.length;
      const beforeUrl = (await cdp.send('Runtime.evaluate', { expression: 'location.href', returnByValue: true }, sid))?.result?.value;
      const clickResult = await cdp.send('Runtime.evaluate', {
        expression: `(function(){
          var n = document.querySelectorAll('a[href],button,[role="button"],[role="menuitem"],input[type="submit"],summary')[${el.i}];
          if(!n) return JSON.stringify({ok:false});
          n.click();
          return JSON.stringify({ok:true});
        })()`,
        returnByValue: true,
      }, sid);
      await new Promise(r => setTimeout(r, 1500));
      const afterUrl = (await cdp.send('Runtime.evaluate', { expression: 'location.href', returnByValue: true }, sid))?.result?.value;
      const afterMeta = await cdp.send('Runtime.evaluate', {
        expression: `JSON.stringify({ url: location.href, modalOpen: !!document.querySelector('[role="dialog"],.modal,[class*="overlay"]'), bodyChars: document.body.innerText.length })`,
        returnByValue: true,
      }, sid);
      const after = JSON.parse(afterMeta?.result?.value || '{}');
      receipt.expected = 'button click produces visible result';
      receipt.final_url = afterUrl;
      receipt.actual = `urlChanged=${beforeUrl !== afterUrl}, modalOpen=${after.modalOpen}, bodyChars=${after.bodyChars}`;
      receipt.console_errors = consoleErrors.slice(beforeErrors).map(e => e.text);
      if (beforeUrl !== afterUrl) receipt.status = 'PASS';
      else if (after.modalOpen) receipt.status = 'PASS';
      else if (receipt.console_errors.length > 0) receipt.status = 'FAIL_CONSOLE_ERROR';
      else receipt.status = 'FAIL_DEAD_END';
      receipts.push(receipt);

      // Close any modal that opened
      await cdp.send('Runtime.evaluate', { expression: `document.querySelectorAll('[role="dialog"] [aria-label*="close" i], .modal-close, button[class*="close"]').forEach(function(b){b.click();});`, returnByValue: true }, sid);
      await new Promise(r => setTimeout(r, 500));
    }

    // ─── Summary ─────────────────────────────────────────────────
    const summary = {
      clone_url,
      home: homeInfo,
      elements_discovered: elements.length,
      elements_tested: receipts.length,
      pass: receipts.filter(r => r.status === 'PASS').length,
      fail_404: receipts.filter(r => r.status === 'FAIL_404').length,
      fail_login: receipts.filter(r => r.status === 'FAIL_LOGIN').length,
      fail_dead_end: receipts.filter(r => r.status === 'FAIL_DEAD_END').length,
      fail_dead_link: receipts.filter(r => r.status === 'FAIL_DEAD_LINK').length,
      fail_console: receipts.filter(r => r.status === 'FAIL_CONSOLE_ERROR').length,
      fail_network: receipts.filter(r => r.status === 'FAIL_NETWORK').length,
      not_applicable: receipts.filter(r => r.status === 'NOT_APPLICABLE_WITH_PROOF').length,
      total_console_errors: consoleErrors.length,
      total_network_failures: networkFailures.length,
    };

    return Response.json({
      status: 'success',
      summary,
      receipts,
      console_errors: consoleErrors.slice(0, 30),
      network_failures: networkFailures.slice(0, 30),
      evidence: {
        method: 'browserbase_cdp_real_click',
        session_id: session.id,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return Response.json({
      status: 'error',
      error: error.message,
      partial_receipts: receipts,
      console_errors: consoleErrors.slice(0, 20),
      network_failures: networkFailures.slice(0, 20),
    }, { status: 500 });
  } finally {
    if (cdp) await cdp.close().catch(() => {});
    if (session) await releaseSession(session.id);
  }
}

// Wait for SPA hydration: poll until network idle + DOM stable
async function waitForHydration(cdp: CDPClient, sid: string, maxWait: number) {
  const start = Date.now();
  let lastDomSize = 0;
  let stableCount = 0;
  while (Date.now() - start < maxWait) {
    const check = await cdp.send('Runtime.evaluate', {
      expression: `document.body ? document.body.innerHTML.length : 0`,
      returnByValue: true,
    }, sid).catch(() => ({ result: { value: 0 } }));
    const domSize = check?.result?.value || 0;
    if (domSize === lastDomSize && domSize > 1000) {
      stableCount++;
      if (stableCount >= 3) return; // stable for 3 consecutive checks
    } else {
      stableCount = 0;
    }
    lastDomSize = domSize;
    await new Promise(r => setTimeout(r, 500));
  }
}