import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { generateSitemapXml, generateRobotsTxt, generateJsonLd, generateMetaTagsHtml } from '../../shared/seoUtils.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { site_url, site_name, description, target_keywords, seo_project_id, crawl_report } = body;

    if (!site_url) return Response.json({ error: 'site_url required' }, { status: 400 });

    const llmPrompt = `Generate optimized SEO meta tags for a website.
Site URL: ${site_url}
Site Name: ${site_name || 'Unknown'}
Description: ${description || 'N/A'}
Target Keywords: ${target_keywords ? target_keywords.join(', ') : 'N/A'}
Current title: ${crawl_report?.titleValue || 'N/A'}
Current description: ${crawl_report?.descriptionValue || 'N/A'}

Return a JSON object with:
- title: SEO-optimized title (50-60 chars, include primary keyword)
- description: SEO-optimized meta description (150-160 chars, compelling, include keywords)
- ogTitle: Open Graph title (slightly different from title, engaging)
- ogDescription: Open Graph description (compelling for social sharing)
- keywords: array of 10 target keywords for this site (realistic, mix of head and long-tail)

Return ONLY the JSON object, no markdown.`;

    const llmRes = await base44.integrations.Core.InvokeLLM({
      prompt: llmPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          ogTitle: { type: 'string' },
          ogDescription: { type: "string" },
          keywords: { type: "array", items: { type: "string" } },
        },
      },
    });

    const meta = llmRes || {};

    const jsonLd = generateJsonLd({
      siteUrl: site_url,
      siteName: site_name || meta.title || 'Website',
      description: meta.description || description || '',
    });

    const sitemap = generateSitemapXml(site_url);
    const robotsTxt = generateRobotsTxt(site_url);

    const metaTagsHtml = generateMetaTagsHtml({
      title: meta.title,
      description: meta.description,
      canonical: site_url,
      ogTitle: meta.ogTitle || meta.title,
      ogDescription: meta.ogDescription || meta.description,
      ogUrl: site_url,
      ogType: 'website',
      twitterCard: 'summary_large_image',
      twitterTitle: meta.ogTitle || meta.title,
      twitterDescription: meta.ogDescription || meta.description,
      jsonLd,
    });

    const generatedTags = {
      meta: {
        title: meta.title,
        description: meta.description,
        canonical: site_url,
        ogTitle: meta.ogTitle || meta.title,
        ogDescription: meta.ogDescription || meta.description,
        twitterCard: 'summary_large_image',
        keywords: meta.keywords || target_keywords || [],
      },
      jsonLd,
      sitemap,
      robotsTxt,
      metaTagsHtml,
    };

    if (seo_project_id) {
      await base44.asServiceRole.entities.SEOProject.update(seo_project_id, {
        generated_tags: generatedTags,
        target_keywords: meta.keywords || target_keywords || [],
        last_optimized: new Date().toISOString(),
        status: 'tagging',
        sitemap_url: site_url.replace(/\/$/, '') + '/sitemap.xml',
      });
    }

    return Response.json({ generatedTags, site_url });
  } catch (error) {
    console.error('seoGenerateTags error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}