// Scrubs all source-domain URLs from rebranded clone HTML.
// The autonomous rebrand swaps brand-name TEXT (e.g. "iBeam" → "AUTO LEADS")
// but the clone's href/src/meta URLs still point to the original source domain
// (e.g. https://ibeam.ai/pricing, https://app.ibeam.ai/login). Left un-scrubbed,
// every link on the rebranded site — including login — sends visitors back to
// the original source site.
//
// This module converts:
//   - same-page anchors:  https://ibeam.ai/#faq  →  #faq
//   - root domain refs:   https://ibeam.ai/      →  /
//   - subdomain login/app: https://app.ibeam.ai/login → <replacementAppUrl>
//   - other source paths: https://ibeam.ai/pricing → /pricing
//
// It also strips the source domain from canonical/og:url meta tags.

export interface ScrubOptions {
  sourceUrl: string;          // original source site URL (e.g. https://ibeam.ai)
  replacementAppUrl?: string;  // where subdomain login/app links should go (default: '/')
}

function extractDomain(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname; // e.g. "ibeam.ai" or "www.ibeam.ai" or "app.ibeam.ai"
  } catch {
    return null;
  }
}

function rootDomain(hostname: string): string {
  // "www.ibeam.ai" → "ibeam.ai", "app.ibeam.ai" → "ibeam.ai"
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join('.');
}

export function scrubSourceDomain(html: string, opts: ScrubOptions): { html: string; count: number } {
  const domain = extractDomain(opts.sourceUrl);
  if (!domain) return { html, count: 0 };

  const root = rootDomain(domain); // "ibeam.ai"
  const appUrl = opts.replacementAppUrl || '/';

  let count = 0;
  let out = html;

  // Build a regex that matches any URL on the source root domain (with or without www.,
  // and any subdomain like app.ibeam.ai), with optional path and/or fragment.
  // Matches: https://ibeam.ai, https://www.ibeam.ai, https://app.ibeam.ai/login,
  //          https://ibeam.ai/#faq, https://ibeam.ai/pricing, //ibeam.ai/...
  const domainPattern = root.replace(/\./g, '\\.');
  const fullUrlRe = new RegExp(
    `(?:https?:)?\/\/(?:www\\.)?(?:[a-z0-9-]+\\.)?${domainPattern}(\/[^"'\\s]*)?`,
    'gi'
  );

  out = out.replace(fullUrlRe, (match, path) => {
    count++;
    const p = path || '';
    // Same-page anchor: /#something → #something
    if (p.startsWith('/#')) return p.slice(1); // "#faq"
    // Root or trailing slash → "/"
    if (!p || p === '/') return '/';
    // Subdomain login/app paths → replacement app URL
    if (/(login|sign[-_]?in|app|dashboard|portal)/i.test(match) && /login|sign|app|portal/i.test(p)) {
      return appUrl;
    }
    // Other paths → keep as relative path
    return p; // "/pricing"
  });

  // Also scrub bare domain references in text/meta that aren't full URLs
  // (e.g. "ibeam.ai" in canonical, og:url, or plain text) — but only as a bare
  // domain token, not partial matches inside other words.
  const bareDomainRe = new RegExp(`\\b(?:www\\.)?${domainPattern}\\b`, 'gi');
  out = out.replace(bareDomainRe, (m) => {
    // Don't double-count the ones already handled above; only count new ones
    // that aren't part of a URL we already replaced. This is a best-effort
    // text scrub for meta tags and visible copy.
    count++;
    return 'autoleads.ai';
  });

  return { html: out, count };
}