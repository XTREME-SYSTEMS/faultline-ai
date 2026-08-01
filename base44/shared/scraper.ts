export function extractData(html, url) {
  const get = (re) => { const m = html.match(re); return m ? m[1].trim() : ''; };
  const count = (re) => (html.match(re) || []).length;
  const test = (re) => re.test(html);

  return {
    title: get(/<title[^>]*>([^<]*)<\/title>/i),
    description: get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || get(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i),
    hasViewport: test(/<meta[^>]+name=["']viewport["']/i),
    h1Count: count(/<h1[^>]*>/gi),
    h2Count: count(/<h2[^>]*>/gi),
    linkCount: count(/<a[^>]+href=/gi),
    imageCount: count(/<img[^>]*>/gi),
    imagesWithoutAlt: count(/<img(?![^>]*\salt=)[^>]*>/gi),
    scriptCount: count(/<script[^>]*>/gi),
    formCount: count(/<form[^>]*>/gi),
    ctaCount: count(/get started|contact us|request a quote|sign up|book a call|schedule|free consultation|learn more|get a demo|start free|try free/gi),
    hasAnalytics: test(/google-analytics|gtag\(|googletagmanager|facebook\.com\/tr|fbq\(|hotjar/i),
    hasStructuredData: test(/application\/ld\+json|schema\.org/i),
    socialLinks: { facebook: test(/facebook\.com/i), twitter: test(/twitter\.com|x\.com/i), linkedin: test(/linkedin\.com/i), instagram: test(/instagram\.com/i) },
    contactInfo: { phone: test(/(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3,4}[\s.-]?\d{4}/), email: test(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/) },
    trustSignals: { privacy: test(/privacy policy/i), terms: test(/terms of service|terms and conditions/i), ssl: url.startsWith('https://'), reviews: test(/review|testimonial|rating/i), certifications: test(/certified|certification|accredited|award/i) },
    hasMixedContent: url.startsWith('https://') && test(/<img[^>]+src=["']http:\/\//i),
    pageSize: html.length,
    wordCount: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length
  };
}

export async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FaultLine-AI-Scanner/1.0 (+https://faultline.ai)' },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow'
    });
    const html = await res.text();
    return { html, status: res.status, ok: true };
  } catch (e) {
    return { html: '', status: 0, ok: false, error: e.message };
  }
}

export function discoverPageLinks(html, baseUrl) {
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  const links = [];
  let m;
  const baseOrigin = baseUrl.replace(/\/$/, '').split('#')[0];
  while ((m = linkRegex.exec(html)) !== null) {
    const text = (m[2] || '').toLowerCase();
    if (!text.match(/about|pricing|contact|services|blog|solutions|features|team|company|product/i)) continue;
    try {
      const fullUrl = new URL(m[1], baseUrl).href.split('#')[0];
      if (fullUrl.startsWith(baseOrigin)) {
        links.push({ url: fullUrl, label: text.trim() });
      }
    } catch {}
  }
  const seen = new Set();
  return links.filter(l => { if (seen.has(l.url)) return false; seen.add(l.url); return true; }).slice(0, 5);
}

export function detectTechStack(html) {
  const stack = [];
  const checks = [
    ['React', /react|_next\/static|__NEXT_DATA__/i],
    ['Vue.js', /vue\.js|vuejs|__vue/i],
    ['Angular', /angular|ng-app/i],
    ['WordPress', /wp-content|wp-includes|wordpress/i],
    ['Shopify', /shopify|cdn\.shopify/i],
    ['Squarespace', /squarespace/i],
    ['Wix', /wix\.com|wixstatic/i],
    ['HubSpot CMS', /hubspot|hs-scripts/i],
    ['Google Analytics', /google-analytics|gtag\(|googletagmanager/i],
    ['Facebook Pixel', /facebook\.com\/tr|fbq\(/i],
    ['Hotjar', /hotjar/i],
    ['Cloudflare', /cloudflare/i],
    ['jQuery', /jquery/i],
    ['Bootstrap', /bootstrap/i],
    ['Tailwind CSS', /tailwind/i],
    ['Intercom', /intercom/i],
    ['Zendesk', /zendesk/i],
    ['Salesforce', /salesforce/i],
    ['Marketo', /marketo/i],
    ['Segment', /segment\.io|analytics\.js/i]
  ];
  for (const [name, re] of checks) { if (re.test(html)) stack.push(name); }
  return stack;
}

export function calcHealthScore(findings) {
  let score = 100;
  for (const f of findings) {
    if (f.severity === 'critical') score -= 8;
    else if (f.severity === 'high') score -= 4;
    else if (f.severity === 'medium') score -= 2;
    else if (f.severity === 'low') score -= 1;
  }
  return Math.max(0, score);
}