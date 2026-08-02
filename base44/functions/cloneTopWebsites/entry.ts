import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Clones the top 3 rated websites/systems in a given category:
// 1. Uses web search to find the top 3 highest-rated sites
// 2. Scrapes each site's HTML content
// 3. Analyzes design, content, features, and weaknesses with LLM
// 4. Returns a "superiority strategy" for building something better
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { category, industry, location } = body;
    if (!category) return Response.json({ error: 'category required' }, { status: 400 });

    // Step 1: Find top 3 rated websites in this category using web search
    const searchPrompt = `Find the top 3 highest-rated, most popular websites or systems in the category "${category}"${industry ? ` for the ${industry} industry` : ''}${location ? ` in ${location}` : ''}.

For each, provide:
1. The exact website URL (full https:// URL including www if applicable)
2. The company/website name
3. Why it's highly rated (key strengths, design quality, features)
4. Its main value proposition
5. Estimated reputation/rating

Focus on real, well-known websites that are considered best-in-class in this space.`;

    const searchRes = await base44.integrations.Core.InvokeLLM({
      prompt: searchPrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          competitors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                url: { type: 'string' },
                strengths: { type: 'array', items: { type: 'string' } },
                value_proposition: { type: 'string' },
                rating: { type: 'string' }
              }
            }
          }
        }
      }
    });

    const competitors = searchRes.competitors || [];
    if (competitors.length === 0) {
      return Response.json({ error: 'Could not find competitors in this category' }, { status: 400 });
    }

    // Step 2: Scrape each website
    const scrapedCompetitors = [];
    for (const comp of competitors.slice(0, 3)) {
      try {
        const response = await fetch(comp.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          signal: AbortSignal.timeout(15000),
          redirect: 'follow'
        });

        const html = await response.text();
        const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || comp.name;
        const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]?.trim() || '';
        const headings = [...html.matchAll(/<h[1-3][^>]*>([^<]*)<\/h[1-3]>/gi)].map(m => m[1].trim()).filter(Boolean).slice(0, 20);
        const links = [...html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi)].map(m => m[2].trim()).filter(t => t && t.length > 2 && t.length < 50).slice(0, 15);
        const textContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000);

        scrapedCompetitors.push({
          ...comp,
          scraped: { title, metaDesc, headings, nav_links: links, text_content: textContent.slice(0, 2000), html_length: html.length, status: response.status }
        });
      } catch (e) {
        scrapedCompetitors.push({ ...comp, scraped: { error: e.message } });
      }
    }

    // Step 3: Analyze each competitor and build a superiority strategy
    const analysisPrompt = `You are an elite web designer and competitive analyst. Analyze these top 3 competitor websites in the "${category}" category. For each, identify design strengths, content strategy, key features, and weaknesses. Then provide a "superiority strategy" — how to build a website that is EQUIVALENT OR BETTER than all 3.

Competitor data (scraped content):
${JSON.stringify(scrapedCompetitors, null, 2)}

Return as JSON with this structure:
{
  "analyses": [
    {
      "name": "Company Name",
      "url": "url",
      "design_strengths": ["strength1", "strength2"],
      "content_strategy": "description of their messaging approach",
      "key_features": ["feature1", "feature2"],
      "weaknesses": ["weakness1", "weakness2"]
    }
  ],
  "superiority_strategy": {
    "design_direction": "specific design direction to make ours visually superior",
    "content_advantages": ["what to include that they don't have"],
    "feature_advantages": ["features to add that exceed theirs"],
    "conversion_improvements": ["how to convert better than them"],
    "recommended_sections": ["sections to include"],
    "recommended_tone": "tone recommendation",
    "recommended_colors": "color recommendation with hex codes"
  }
}`;

    const analysisRes = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          analyses: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                url: { type: 'string' },
                design_strengths: { type: 'array', items: { type: 'string' } },
                content_strategy: { type: 'string' },
                key_features: { type: 'array', items: { type: 'string' } },
                weaknesses: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          superiority_strategy: {
            type: 'object',
            properties: {
              design_direction: { type: 'string' },
              content_advantages: { type: 'array', items: { type: 'string' } },
              feature_advantages: { type: 'array', items: { type: 'string' } },
              conversion_improvements: { type: 'array', items: { type: 'string' } },
              recommended_sections: { type: 'array', items: { type: 'string' } },
              recommended_tone: { type: 'string' },
              recommended_colors: { type: 'string' }
            }
          }
        }
      }
    });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'website_generator',
      action: 'clone_competitors',
      status: 'success',
      summary: `Cloned top ${scrapedCompetitors.length} competitors in ${category}`,
      evidence: { category, competitors: scrapedCompetitors.map(c => ({ name: c.name, url: c.url })) }
    });

    return Response.json({
      status: 'success',
      category,
      competitors: scrapedCompetitors,
      analysis: analysisRes
    });
  } catch (error) {
    console.error('cloneTopWebsites error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}