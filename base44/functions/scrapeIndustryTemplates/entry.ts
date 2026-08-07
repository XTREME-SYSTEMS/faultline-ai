import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { fetchPage, extractData, detectTechStack } from '../../shared/scraper.ts';

// Scrapes the top N websites for flooring industry niches (epoxy, decorative concrete,
// polished concrete), extracts real design data (colors, fonts, tech stack, structure),
// and stores them as WebsiteLibraryAsset records (library_type: 'industry_template')
// for use as reference templates by the website generator.
const NICHES = [
  { id: 'epoxy', label: 'Epoxy Flooring', query: 'epoxy flooring contractor' },
  { id: 'decorative_concrete', label: 'Decorative Concrete', query: 'decorative concrete contractor' },
  { id: 'polished_concrete', label: 'Polished Concrete', query: 'polished concrete contractor' }
];

async function pool(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const nicheIds = body.niches || NICHES.map(n => n.id);
    const perNiche = Math.min(body.per_niche || 20, 20);
    const selectedNiches = NICHES.filter(n => nicheIds.includes(n.id));

    // Step 1: Find top sites per niche via web search (parallel, one per niche)
    const nicheResults = await pool(selectedNiches, 3, async (niche) => {
      const prompt = `Research the top ${perNiche} highest-quality, real contractor websites for "${niche.label}" in the United States. These must be ACTUAL contractor businesses (not directories like Houzz/Angi, not Wikipedia, not Home Depot, not national chains). Focus on established local/regional contractors with professional websites.

For each website provide:
1. name: Company name
2. url: Full URL starting with https://
3. location: City, State if known
4. design_strengths: 3-5 specific design strengths (layout, imagery, animations, etc.)
5. content_strategy: Their main value proposition and messaging approach
6. key_features: Key website features (photo gallery, quote form, before/after, service area, reviews, etc.)
7. color_scheme: Primary brand colors they use (hex codes if visible)
8. rating: Quality assessment (excellent/good/average)`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            websites: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  url: { type: 'string' },
                  location: { type: 'string' },
                  design_strengths: { type: 'array', items: { type: 'string' } },
                  content_strategy: { type: 'string' },
                  key_features: { type: 'array', items: { type: 'string' } },
                  color_scheme: { type: 'string' },
                  rating: { type: 'string' }
                }
              }
            }
          }
        }
      });
      return { niche, websites: (res.websites || []).slice(0, perNiche) };
    });

    // Step 2: Scrape each website for raw design data (concurrency 8)
    const allTargets = [];
    for (const { niche, websites } of nicheResults) {
      for (let i = 0; i < websites.length; i++) {
        allTargets.push({ ...websites[i], niche, index: i + 1 });
      }
    }

    const scraped = await pool(allTargets, 8, async (site) => {
      if (!site.url || !site.url.startsWith('http')) return { ...site, scraped: null };
      const page = await fetchPage(site.url);
      if (!page.ok || !page.html) return { ...site, scraped: null };
      const data = extractData(page.html, site.url);
      const techStack = detectTechStack(page.html);
      const colorMatches = page.html.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
      const colors = [...new Set(colorMatches.map(c => c.toUpperCase()))].slice(0, 12);
      const fontMatches = page.html.match(/font-family\s*:\s*([^;}]+)/gi) || [];
      const fonts = [...new Set(fontMatches.map(f => f.replace(/font-family\s*:\s*/i, '').replace(/['"]/g, '').trim()))].slice(0, 6);
      return {
        ...site,
        scraped: {
          title: data.title,
          description: data.description,
          wordCount: data.wordCount,
          h1Count: data.h1Count,
          h2Count: data.h2Count,
          imageCount: data.imageCount,
          ctaCount: data.ctaCount,
          hasStructuredData: data.hasStructuredData,
          hasAnalytics: data.hasAnalytics,
          socialLinks: data.socialLinks,
          techStack,
          colors,
          fonts,
          htmlLength: page.html.length,
          status: 'scraped'
        }
      };
    });

    // Step 3: Clear old industry_template records for these niches, then store new ones
    const nicheLabels = selectedNiches.map(n => n.label);
    try {
      await base44.asServiceRole.entities.WebsiteLibraryAsset.deleteMany({
        organization_id: orgId,
        library_type: 'industry_template',
        category: { $in: nicheLabels }
      });
    } catch (e) { console.log('delete old templates skipped:', e.message); }

    const records = scraped.map((site) => ({
      organization_id: orgId,
      library_type: 'industry_template',
      record_id: `${site.niche.id.toUpperCase()}-${String(site.index).padStart(3, '0')}`,
      name: site.name || site.url,
      category: site.niche.label,
      data: {
        niche: site.niche.id,
        niche_label: site.niche.label,
        url: site.url,
        location: site.location || '',
        design_strengths: site.design_strengths || [],
        content_strategy: site.content_strategy || '',
        key_features: site.key_features || [],
        color_scheme: site.color_scheme || '',
        rating: site.rating || '',
        scraped: site.scraped || null,
        scraped_at: new Date().toISOString()
      },
      status: 'active'
    }));

    const created = await base44.entities.WebsiteLibraryAsset.bulkCreate(records);

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'website_generator',
      action: 'scrape_industry_templates',
      status: 'success',
      summary: `Scraped ${created.length} industry templates across ${selectedNiches.length} niches (${scraped.filter(s => s.scraped).length} sites successfully scraped)`,
      evidence: { niches: nicheLabels, stored: created.length, scraped_ok: scraped.filter(s => s.scraped).length }
    });

    return Response.json({
      status: 'success',
      niches: nicheLabels,
      total_found: allTargets.length,
      total_scraped: scraped.filter(s => s.scraped).length,
      total_stored: created.length,
      by_niche: nicheResults.map(({ niche, websites }) => ({
        niche: niche.label,
        found: websites.length,
        scraped: scraped.filter(s => s.niche.id === niche.id && s.scraped).length
      }))
    });
  } catch (error) {
    console.error('scrapeIndustryTemplates error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}