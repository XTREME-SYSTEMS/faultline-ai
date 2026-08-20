// Shared browser validation helpers — used by routeReconciliation,
// structuralVisualParity, and other validation functions.
import { CDPClient } from './stealthBrowser.ts';

export async function navigateAndWait(cdp: CDPClient, sessionId: string, url: string, timeout: number) {
  try {
    await cdp.send('Page.navigate', { url }, sessionId, timeout);
  } catch {}
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    cdp!.on('Page.loadEventFired', finish);
    setTimeout(finish, Math.min(timeout, 8000));
  });
  await new Promise(r => setTimeout(r, 2000));
}

export async function scrollPage(cdp: CDPClient, sessionId: string) {
  try {
    await cdp.send('Runtime.evaluate', {
      expression: `(async()=>{var h=document.body.scrollHeight;for(var y=0;y<Math.min(h,3000);y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,100));}window.scrollTo(0,0);})()`,
      returnByValue: true, awaitPromise: true,
    }, sessionId, 5000);
  } catch {}
}

export async function extractAllLinks(cdp: CDPClient, sessionId: string, baseUrl: string): Promise<any[]> {
  const result = await cdp.send('Runtime.evaluate', {
    expression: `(function(){
      var links = [];
      var seen = new Set();
      var base = ${JSON.stringify(baseUrl)};
      document.querySelectorAll('a[href]').forEach(function(el) {
        var href = el.getAttribute('href') || '';
        if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
        try {
          var url = new URL(href, base);
          if (url.origin !== new URL(base).origin) return;
          var path = url.pathname;
          if (path === '/' || path === '') return;
          if (seen.has(path)) return;
          seen.add(path);
          var title = (el.getAttribute('aria-label') || el.innerText || el.title || '').trim().slice(0, 80);
          var region = 'unknown';
          if (el.closest('header')) region = 'header';
          else if (el.closest('footer')) region = 'footer';
          else if (el.closest('nav')) region = 'nav';
          else if (el.closest('aside')) region = 'sidebar';
          else region = 'main';
          links.push({ path: path, title: title, source_region: region });
        } catch(e) {}
      });
      return JSON.stringify(links);
    })()`,
    returnByValue: true,
  }, sessionId, 10000);
  try {
    return JSON.parse(result?.result?.value || '[]');
  } catch {
    return [];
  }
}