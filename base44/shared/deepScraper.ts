// Deep discovery scraper — goes beyond the surface scan to:
//  1. Discover and fetch ALL internal pages (not just 5)
//  2. Extract and fetch external JS bundles, then scan them for secrets
//  3. Detect exposed API keys, tokens, and credentials in HTML + JS
//  4. Enumerate every fault: security, performance, accessibility, SEO, conversion, trust

const SECRET_PATTERNS = [
  { name: 'Google API Key', pattern: /AIza[0-9A-Za-z\-_]{35}/g, severity: 'high' },
  { name: 'AWS Access Key ID', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'critical' },
  { name: 'AWS Secret Access Key', pattern: /aws_secret_access_key["'\s:=]+["']([0-9a-zA-Z/+]{40})["']/gi, severity: 'critical' },
  { name: 'Stripe Live Secret Key', pattern: /sk_live_[0-9a-zA-Z]{20,}/g, severity: 'critical' },
  { name: 'Stripe Restricted Key', pattern: /rk_live_[0-9a-zA-Z]{20,}/g, severity: 'critical' },
  { name: 'Stripe Live Publishable Key', pattern: /pk_live_[0-9a-zA-Z]{20,}/g, severity: 'medium' },
  { name: 'GitHub Personal Access Token', pattern: /ghp_[0-9A-Za-z]{36}/g, severity: 'critical' },
  { name: 'GitHub OAuth Token', pattern: /gho_[0-9A-Za-z]{36}/g, severity: 'critical' },
  { name: 'GitHub App Token', pattern: /ghs_[0-9A-Za-z]{36}/g, severity: 'critical' },
  { name: 'Slack Bot Token', pattern: /xoxb-[0-9A-Za-z\-]{10,}/g, severity: 'critical' },
  { name: 'Slack User Token', pattern: /xoxp-[0-9A-Za-z\-]{10,}/g, severity: 'critical' },
  { name: 'JWT Token', pattern: /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, severity: 'high' },
  { name: 'Private Key Block', pattern: /-----BEGIN (RSA|EC|OPENSSH|DSA|PGP) PRIVATE KEY-----/g, severity: 'critical' },
  { name: 'Twilio API Key', pattern: /SK[0-9a-fA-F]{32}/g, severity: 'high' },
  { name: 'SendGrid API Key', pattern: /SG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{43}/g, severity: 'critical' },
  { name: 'Mailgun API Key', pattern: /key-[0-9a-zA-Z]{32}/g, severity: 'high' },
  { name: 'Square Access Token', pattern: /sq0atp-[0-9A-Za-z\-_]{22}/g, severity: 'critical' },
  { name: 'Firebase Server Key', pattern: /AAAA[A-Za-z0-9_\-]{60,}/g, severity: 'high' },
  { name: 'Heroku API Key', pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, severity: 'medium' },
];

const GENERIC_CREDENTIAL_PATTERNS = [
  { name: 'Hardcoded Password', pattern: /(?:password|passwd|pwd)["'\s:=]+["']([^"'\s]{8,})["']/gi, severity: 'high' },
  { name: 'Hardcoded API Key', pattern: /(?:api[_-]?key|apikey)["'\s:=]+["']([A-Za-z0-9_\-]{20,})["']/gi, severity: 'high' },
  { name: 'Hardcoded Secret', pattern: /(?:secret|client[_-]?secret)["'\s:=]+["']([A-Za-z0-9_\-]{16,})["']/gi, severity: 'high' },
  { name: 'Hardcoded Token', pattern: /(?:access[_-]?token|auth[_-]?token|bearer)["'\s:=]+["']([A-Za-z0-9_\-\.]{20,})["']/gi, severity: 'high' },
];

export function discoverAllPages(html, baseUrl) {
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  const links = [];
  let m;
  let baseOrigin;
  try { baseOrigin = new URL(baseUrl).origin; } catch { return []; }
  while ((m = linkRegex.exec(html)) !== null) {
    try {
      const fullUrl = new URL(m[1], baseUrl).href.split('#')[0];
      if (fullUrl.startsWith(baseOrigin) && !fullUrl.match(/\.(jpg|jpeg|png|gif|svg|pdf|css|js|ico|woff|ttf)$/i)) {
        links.push(fullUrl);
      }
    } catch {}
  }
  const seen = new Set();
  return links.filter(l => { if (seen.has(l)) return false; seen.add(l); return true; }).slice(0, 15);
}

export function extractExternalScripts(html, baseUrl) {
  const scriptRegex = /<script[^>]+src=["']([^"']+)["']/gi;
  const scripts = [];
  let m;
  while ((m = scriptRegex.exec(html)) !== null) {
    try {
      const fullUrl = new URL(m[1], baseUrl).href;
      if (fullUrl.match(/\.(js|mjs)(\?|$)/i) || !fullUrl.match(/\.(css|png|jpg|svg|woff|ttf|ico)$/i)) {
        scripts.push(fullUrl);
      }
    } catch {}
  }
  const seen = new Set();
  return scripts.filter(s => { if (seen.has(s)) return false; seen.add(s); return true; }).slice(0, 12);
}

export function detectExposedSecrets(content, source) {
  const found = [];
  const allPatterns = [...SECRET_PATTERNS, ...GENERIC_CREDENTIAL_PATTERNS];
  for (const { name, pattern, severity } of allPatterns) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m;
    while ((m = re.exec(content)) !== null) {
      const value = m[0];
      // Skip obvious false positives
      if (value.match(/^(password|secret|token|key|example|test|placeholder|xxxx|your[_-]?key)/i)) continue;
      if (value.length < 12) continue;
      found.push({ type: name, value, source, severity });
    }
  }
  return found;
}

export function deepExtract(html, url) {
  const get = (re) => { const m = html.match(re); return m ? m[1].trim() : ''; };
  const count = (re) => (html.match(re) || []).length;
  const test = (re) => re.test(html);

  return {
    title: get(/<title[^>]*>([^<]*)<\/title>/i),
    description: get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || get(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i),
    hasViewport: test(/<meta[^>]+name=["']viewport["']/i),
    h1Count: count(/<h1[^>]*>/gi),
    h2Count: count(/<h2[^>]*>/gi),
    imageCount: count(/<img[^>]*>/gi),
    imagesWithoutAlt: count(/<img(?![^>]*\salt=)[^>]*>/gi),
    scriptCount: count(/<script[^>]*>/gi),
    inlineScriptCount: count(/<script[^>]*>(?!\s*src=)/gi),
    formCount: count(/<form[^>]*>/gi),
    inputsMissingLabel: count(/<input(?![^>]*aria-label)(?![^>]*id=["'][^"']*["'][^>]*>)/gi),
    ctaCount: count(/get started|contact us|request a quote|sign up|book a call|schedule|free consultation|learn more|get a demo|start free|try free/gi),
    hasAnalytics: test(/google-analytics|gtag\(|googletagmanager|facebook\.com\/tr|fbq\(|hotjar|clarity/i),
    hasStructuredData: test(/application\/ld\+json|schema\.org/i),
    hasSitemap: test(/sitemap\.xml/i),
    hasRobots: test(/robots\.txt/i),
    socialLinks: { facebook: test(/facebook\.com/i), twitter: test(/twitter\.com|x\.com/i), linkedin: test(/linkedin\.com/i), instagram: test(/instagram\.com/i) },
    contactInfo: { phone: test(/(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3,4}[\s.-]?\d{4}/), email: test(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/) },
    trustSignals: { privacy: test(/privacy policy/i), terms: test(/terms of service|terms and conditions/i), ssl: url.startsWith('https://'), reviews: test(/review|testimonial|rating/i), certifications: test(/certified|certification|accredited|award/i), guarantee: test(/guarantee|warranty|satisfaction/i) },
    hasMixedContent: url.startsWith('https://') && test(/<img[^>]+src=["']http:\/\//i),
    hasConsoleErrors: test(/console\.error|onerror=/i),
    pageSize: html.length,
    wordCount: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length,
    hasChatWidget: test(/intercom|drift|tawk|zendesk|hubspot messages|olark/i),
    hasCookieBanner: test(/cookie consent|cookie banner|cookielaw|gdpr/i),
    hasLiveChat: test(/live chat|chat with us|chat now/i),
    hasSchemaLocalBusiness: test(/localbusiness|local.business/i),
    hasOpenGraph: test(/og:title|og:image/i),
    hasTwitterCard: test(/twitter:card/i),
    hasCanonical: test(/rel=["']canonical["']/i),
    hasHreflang: test(/hreflang/i),
    hasPreconnect: test(/rel=["']preconnect["']/i),
    hasLazyLoad: test(/loading=["']lazy["']/i),
    hasResponsiveImages: test(/srcset|<picture/i)
  };
}

export async function fetchPageDeep(url, timeout = 12000) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: AbortSignal.timeout(timeout),
      redirect: 'follow'
    });
    const html = await res.text();
    return { html, status: res.status, ok: res.ok, headers: Object.fromEntries(res.headers.entries()) };
  } catch (e) {
    return { html: '', status: 0, ok: false, error: e.message };
  }
}

export async function fetchScript(url, timeout = 10000) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FaultLine-AI-DeepScanner/1.0' },
      signal: AbortSignal.timeout(timeout),
      redirect: 'follow'
    });
    const text = await res.text();
    return { text, status: res.status, ok: res.ok };
  } catch (e) {
    return { text: '', status: 0, ok: false, error: e.message };
  }
}