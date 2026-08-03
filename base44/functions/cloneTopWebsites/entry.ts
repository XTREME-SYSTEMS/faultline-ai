import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Clones the top 3 rated websites/systems in a given category.
// Uses a single LLM call with web search to find, analyze, and build a superiority strategy.
// No manual scraping — the web search context provides the content directly.
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

    // Single LLM call with web search: find top 3, analyze each, and build superiority strategy
    const prompt = `Research the top 3 highest-rated, most popular websites or systems in the category "${category}"${industry ? ` for the ${industry} industry` : ''}${location ? ` in ${location}` : ''}.

For each of the top 3, analyze:
1. Name and full URL
2. Design strengths (layout, colors, typography, visual hierarchy, animations)
3. Content strategy (messaging, CTAs, value propositions, headline quality)
4. Key features and sections they have
5. Weaknesses or gaps we can exploit
6. Their rating/reputation

Then build a "superiority strategy" — how to build a website that is EQUIVALENT OR BETTER than all 3:
- design_direction: specific design direction to make ours visually superior
- content_advantages: what to include that they don't have
- feature_advantages: features to add that exceed theirs
- conversion_improvements: how to convert better than them
- recommended_sections: sections to include
- recommended_tone: tone recommendation
- recommended_colors: color recommendation with hex codes`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
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
                rating: { type: 'string' },
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

    const competitors = (res.competitors || []).slice(0, 3).map(c => ({
      name: c.name,
      url: c.url,
      strengths: c.strengths || c.design_strengths || [],
      value_proposition: c.value_proposition || '',
      rating: c.rating || '',
      scraped: { title: c.name, metaDesc: c.value_proposition || '', headings: [], nav_links: [], text_content: '', html_length: 0, status: 'analyzed via web search' }
    }));

    const analysis = {
      analyses: competitors.map(c => {
        const original = res.competitors.find(co => co.name === c.name) || {};
        return {
          name: c.name,
          url: c.url,
          design_strengths: original.design_strengths || c.strengths || [],
          content_strategy: original.content_strategy || c.value_proposition || '',
          key_features: original.key_features || [],
          weaknesses: original.weaknesses || []
        };
      }),
      superiority_strategy: res.superiority_strategy || {}
    };

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'website_generator',
      action: 'clone_competitors',
      status: 'success',
      summary: `Analyzed top ${competitors.length} competitors in ${category}`,
      evidence: { category, competitors: competitors.map(c => ({ name: c.name, url: c.url })) }
    });

    return Response.json({
      status: 'success',
      category,
      competitors,
      analysis
    });
  } catch (error) {
    console.error('cloneTopWebsites error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}