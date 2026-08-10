import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  extractTitle, extractMetaTag, extractOgTags, extractTwitterTags,
  extractCanonical, extractMetaRobots, extractHeadings, extractImages,
  extractLinks, extractJsonLd, checkSitemap, checkRobotsTxt, fetchUrl,
  calculateSEOScore
} from '../../shared/seoUtils.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { site_url, seo_project_id } = body;

    if (!site_url) return Response.json({ error: 'site_url required' }, { status: 400 });

    if (seo_project_id) {
      await base44.asServiceRole.entities.SEOProject.update(seo_project_id, {
        status: 'crawling',
      });
    }

    const res = await fetchUrl(site_url);
    if (!res.ok || !res.html) {
      return Response.json({ error: `Failed to fetch site (${res.status}): ${res.error || ''}` }, { status: 500 });
    }

    const html = res.html;
    const title = extractTitle(html);
    const description = extractMetaTag(html, 'description');
    const ogTags = extractOgTags(html);
    const twitterTags = extractTwitterTags(html);
    const canonical = extractCanonical(html);
    const metaRobots = extractMetaRobots(html);
    const h1s = extractHeadings(html, 'h1');
    const h2s = extractHeadings(html, 'h2');
    const images = extractImages(html);
    const links = extractLinks(html);
    const jsonLd = extractJsonLd(html);

    const sitemapCheck = await checkSitemap(site_url);
    const robotsCheck = await checkRobotsTxt(site_url);
    const isHttps = site_url.startsWith('https://');
    const imagesWithoutAlt = images.filter(img => !img.alt || img.alt.trim() === '');

    const audit = {
      hasTitle: !!title,
      titleLength: title ? title.length >= 30 && title.length <= 60 : false,
      titleValue: title,
      hasDescription: !!description,
      descriptionLength: description ? description.length >= 120 && description.length <= 160 : false,
      descriptionValue: description,
      hasCanonical: !!canonical,
      canonicalValue: canonical,
      hasOgTags: !!(ogTags.title || ogTags.description),
      ogTags,
      hasTwitterCard: !!twitterTags.card,
      twitterTags,
      hasJsonLd: jsonLd.length > 0,
      jsonLd,
      hasH1: h1s.length > 0,
      singleH1: h1s.length === 1,
      h1s,
      h2s,
      imagesHaveAlt: images.length > 0 && imagesWithoutAlt.length === 0,
      imagesTotal: images.length,
      imagesWithoutAlt: imagesWithoutAlt.length,
      hasSitemap: sitemapCheck.found,
      sitemapUrl: sitemapCheck.url,
      hasRobotsTxt: robotsCheck.found,
      robotsTxtUrl: robotsCheck.url,
      isHttps,
      metaRobots,
      totalLinks: links.length,
      internalLinks: links.filter(l => l.startsWith(site_url) || l.startsWith('/')).length,
      externalLinks: links.filter(l => !l.startsWith(site_url) && !l.startsWith('/') && l.startsWith('http')).length,
    };

    const score = calculateSEOScore(audit);

    if (seo_project_id) {
      await base44.asServiceRole.entities.SEOProject.update(seo_project_id, {
        crawl_report: audit,
        seo_score: score,
        last_crawled: new Date().toISOString(),
        status: 'optimizing',
      });
    }

    return Response.json({ audit, score, site_url });
  } catch (error) {
    console.error('seoCrawlSite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}