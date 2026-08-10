// SEO utility functions shared across backend functions

export function encodeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeBase64(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function extractMetaTag(html: string, tag: string): string | null {
  const regex = new RegExp(`<meta[^>]*(?:name|property)=["']${tag}["'][^>]*content=["']([^"']*)["']`, 'i');
  const match = html.match(regex);
  return match ? match[1] : null;
}

export function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : null;
}

export function extractHeadings(html: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'gi');
  const matches = [...html.matchAll(regex)];
  return matches.map(m => m[1].trim()).filter(Boolean);
}

export function extractImages(html: string): Array<{ src: string; alt: string }> {
  const regex = /<img[^>]*src=["']([^"']*)["'][^>]*>/gi;
  const altRegex = /alt=["']([^"']*)["']/i;
  const matches = [...html.matchAll(regex)];
  return matches.map(m => {
    const altMatch = m[0].match(altRegex);
    return { src: m[1], alt: altMatch ? altMatch[1] : '' };
  });
}

export function extractLinks(html: string): string[] {
  const regex = /<a[^>]*href=["']([^"']*)["'][^>]*>/gi;
  const matches = [...html.matchAll(regex)];
  return matches.map(m => m[1]).filter(href => href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:'));
}

export function extractJsonLd(html: string): any[] {
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const matches = [...html.matchAll(regex)];
  return matches.map(m => {
    try { return JSON.parse(m[1].trim()); } catch { return null; }
  }).filter(Boolean);
}

export function extractCanonical(html: string): string | null {
  const match = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
  return match ? match[1] : null;
}

export function extractMetaRobots(html: string): string | null {
  return extractMetaTag(html, 'robots');
}

export function extractOgTags(html: string): Record<string, string | null> {
  return {
    title: extractMetaTag(html, 'og:title'),
    description: extractMetaTag(html, 'og:description'),
    image: extractMetaTag(html, 'og:image'),
    url: extractMetaTag(html, 'og:url'),
    type: extractMetaTag(html, 'og:type'),
  };
}

export function extractTwitterTags(html: string): Record<string, string | null> {
  return {
    card: extractMetaTag(html, 'twitter:card'),
    title: extractMetaTag(html, 'twitter:title'),
    description: extractMetaTag(html, 'twitter:description'),
    image: extractMetaTag(html, 'twitter:image'),
  };
}

export async function fetchUrl(url: string): Promise<{ ok: boolean; status: number; html: string | null; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOCrawler/1.0; +https://faultline.ai)' },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });
    return {
      ok: res.ok,
      status: res.status,
      html: res.ok ? await res.text() : null,
    };
  } catch (e: any) {
    return { ok: false, status: 0, html: null, error: e.message };
  }
}

export async function checkSitemap(siteUrl: string): Promise<{ url: string; found: boolean; status: number }> {
  const sitemapUrl = siteUrl.replace(/\/$/, '') + '/sitemap.xml';
  const res = await fetchUrl(sitemapUrl);
  return { url: sitemapUrl, found: res.ok, status: res.status };
}

export async function checkRobotsTxt(siteUrl: string): Promise<{ url: string; found: boolean; status: number }> {
  const robotsUrl = siteUrl.replace(/\/$/, '') + '/robots.txt';
  const res = await fetchUrl(robotsUrl);
  return { url: robotsUrl, found: res.ok, status: res.status };
}

export function calculateSEOScore(audit: Record<string, any>): number {
  let score = 0;
  const checks: Array<{ key: string; points: number }> = [
    { key: 'hasTitle', points: 10 },
    { key: 'titleLength', points: 5 },
    { key: 'hasDescription', points: 10 },
    { key: 'descriptionLength', points: 5 },
    { key: 'hasCanonical', points: 5 },
    { key: 'hasOgTags', points: 10 },
    { key: 'hasTwitterCard', points: 5 },
    { key: 'hasJsonLd', points: 10 },
    { key: 'hasH1', points: 10 },
    { key: 'singleH1', points: 5 },
    { key: 'imagesHaveAlt', points: 5 },
    { key: 'hasSitemap', points: 10 },
    { key: 'hasRobotsTxt', points: 5 },
    { key: 'isHttps', points: 5 },
  ];
  for (const check of checks) {
    if (audit[check.key]) score += check.points;
  }
  return Math.min(score, 100);
}

export function generateSitemapXml(siteUrl: string, pages: string[] = []): string {
  const urls = pages.length > 0 ? pages : [siteUrl];
  const lastmod = new Date().toISOString();
  const urlEntries = urls.map(url => `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;
}

export function generateRobotsTxt(siteUrl: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl.replace(/\/$/, '')}/sitemap.xml`;
}

export function generateJsonLd(siteData: { siteUrl: string; siteName: string; description?: string }): any[] {
  const { siteUrl, siteName, description } = siteData;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": siteName,
      "url": siteUrl,
      "description": description || undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": siteName,
      "url": siteUrl,
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${siteUrl}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": siteName,
      "url": siteUrl,
      "description": description || undefined,
    }
  ];
}

export function generateMetaTagsHtml(meta: Record<string, any>): string {
  const tags: string[] = [];
  if (meta.title) tags.push(`<title>${meta.title}</title>`);
  if (meta.description) tags.push(`<meta name="description" content="${meta.description}">`);
  if (meta.canonical) tags.push(`<link rel="canonical" href="${meta.canonical}">`);
  if (meta.ogTitle) tags.push(`<meta property="og:title" content="${meta.ogTitle}">`);
  if (meta.ogDescription) tags.push(`<meta property="og:description" content="${meta.ogDescription}">`);
  if (meta.ogImage) tags.push(`<meta property="og:image" content="${meta.ogImage}">`);
  if (meta.ogUrl) tags.push(`<meta property="og:url" content="${meta.ogUrl}">`);
  if (meta.ogType) tags.push(`<meta property="og:type" content="${meta.ogType}">`);
  if (meta.twitterCard) tags.push(`<meta name="twitter:card" content="${meta.twitterCard}">`);
  if (meta.twitterTitle) tags.push(`<meta name="twitter:title" content="${meta.twitterTitle}">`);
  if (meta.twitterDescription) tags.push(`<meta name="twitter:description" content="${meta.twitterDescription}">`);
  if (meta.twitterImage) tags.push(`<meta name="twitter:image" content="${meta.twitterImage}">`);
  if (meta.jsonLd) {
    const jsonLdArray = Array.isArray(meta.jsonLd) ? meta.jsonLd : [meta.jsonLd];
    for (const schema of jsonLdArray) {
      tags.push(`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
    }
  }
  return tags.join('\n');
}

export function generateGtagSnippet(measurementId: string): string {
  return `<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', '${measurementId}');\n</script>`;
}