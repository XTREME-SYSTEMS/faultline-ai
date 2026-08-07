import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { fetchPage, extractData, detectTechStack } from '../../shared/scraper.ts';
import { fetchRenderedPage } from '../../shared/browserbase.ts';

// Scrapes the top N websites for flooring industry niches using BROWSERBASE for real
// browser rendering (JS execution, dynamic content), then runs a vision-capable AI
// design analysis on each site using the best web-capable model (gemini_3_1_pro) to
// extract visual design intelligence that raw HTML parsing cannot capture.
// Stores enriched templates as WebsiteLibraryAsset records for the website generator.
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
    const analyzeVisual = body.analyze_visual !== false;
    const selectedNiches = NICHES.filter(n => nicheIds.includes(n.id));

    // Step 1: Find top sites per niche via web search using best web-capable model
    const nicheResults = await pool(selectedNiches, 3, async (niche) => {
      const prompt = `Research the top ${perNiche} highest-quality, real contractor websites for "${niche.label}" in the United States. These must be ACTUAL contractor businesses (not directories like Houzz/Angi, not Wikipedia, not Home Depot, not national chains). Focus on established local/regional contractors with professional, well-designed websites.

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
        model: 'gemini_3_1_pro',
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

    // Step 2: Scrape each site using BROWSERBASE (real browser rendering) with basic fetch fallback
    const allTargets = [];
    for (const { niche, websites } of nicheResults) {
      for (let i = 0; i < websites.length; i++) {
        allTargets.push({ ...websites[i], niche, index: i + 1 });
      }
    }

    const scraped = await pool(allTargets, 10, async (site) => {
      if (!site.url || !site.url.startsWith('http')) return { ...site, scraped: null };

      let html = '';
      let usedBrowser = false;
      // Browserbase Fetch API first — reliable proxy that bypasses bot protection
      const bbPage = await fetchRenderedPage(site.url, { timeout: 12000 });
      if (bbPage && bbPage.html && bbPage.html.length > 200) {
        html = bbPage.html;
        usedBrowser = true;
      } else {
        // Fall back to basic fetch
        const basic = await fetchPage(site.url);
        if (basic.ok && basic.html) html = basic.html;
      }
      if (!html) return { ...site, scraped: null };

      const data = extractData(html, site.url);
      const techStack = detectTechStack(html);
      const colorMatches = html.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
      const colors = [...new Set(colorMatches.map(c => c.toUpperCase()))].slice(0, 12);
      const fontMatches = html.match(/font-family\s*:\s*([^;}]+)/gi) || [];
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
          htmlLength: html.length,
          usedBrowser,
          status: 'scraped'
        }
      };
    });

    // Step 3: AI visual design analysis using best web-capable model (gemini_3_1_pro)
    // Extracts visual design intelligence that HTML parsing cannot: aesthetic feel,
    // visual hierarchy, conversion patterns, and replication guidance.
    if (analyzeVisual) {
      const toAnalyze = scraped.map((s, i) => ({ ...s, _idx: i })).filter(s => s.scraped);
      const visuals = await pool(toAnalyze, 5, async (site) => {
        try {
          const prompt = `Analyze the visual design and UX of the website ${site.url} — a ${site.niche.label} contractor. Based on your web research of this actual live site, extract precise design intelligence:

1. visual_palette: exact brand colors (hex codes) as seen on the live site
2. typography_style: font style description (serif/sans-serif, weights, personality, feel)
3. layout_pattern: primary layout approach (hero type, section flow, grid system, navigation style)
4. visual_hierarchy: how they guide the visitor's attention and in what order
5. conversion_patterns: CTA design, form placement, trust signals, social proof approach
6. aesthetic_score: numeric 1-10 rating of overall visual polish and professionalism
7. design_dna: 2-3 sentence summary capturing the design's distinct "feel" and what makes it effective
8. replicate_patterns: specific actionable design patterns FaultLine's generator should replicate to match this quality`;

          const res = await base44.integrations.Core.InvokeLLM({
            prompt,
            add_context_from_internet: true,
            model: 'gemini_3_1_pro',
            response_json_schema: {
              type: 'object',
              properties: {
                visual_palette: { type: 'array', items: { type: 'string' } },
                typography_style: { type: 'string' },
                layout_pattern: { type: 'string' },
                visual_hierarchy: { type: 'string' },
                conversion_patterns: { type: 'array', items: { type: 'string' } },
                aesthetic_score: { type: 'number' },
                design_dna: { type: 'string' },
                replicate_patterns: { type: 'array', items: { type: 'string' } }
              }
            }
          });
          return { idx: site._idx, visual: res };
        } catch (e) {
          return { idx: site._idx, visual: null };
        }
      });
      // Merge visual analysis back into scraped results
      for (const v of visuals) {
        if (v.visual && scraped[v.idx]?.scraped) {
          scraped[v.idx].scraped.visual = v.visual;
        }
      }
    }

    // Step 4: Clear old industry_template records for these niches, then store enriched ones
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
    const browserCount = scraped.filter(s => s.scraped?.usedBrowser).length;
    const visualCount = scraped.filter(s => s.scraped?.visual).length;

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'website_generator',
      action: 'scrape_industry_templates',
      status: 'success',
      summary: `Scraped ${created.length} templates via Browserbase (${browserCount} rendered) + AI visual analysis (${visualCount} analyzed)`,
      evidence: {
        niches: nicheLabels,
        stored: created.length,
        scraped_ok: scraped.filter(s => s.scraped).length,
        browser_rendered: browserCount,
        visual_analyzed: visualCount
      }
    });

    return Response.json({
      status: 'success',
      niches: nicheLabels,
      total_found: allTargets.length,
      total_scraped: scraped.filter(s => s.scraped).length,
      total_stored: created.length,
      browser_rendered: browserCount,
      visual_analyzed: visualCount,
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