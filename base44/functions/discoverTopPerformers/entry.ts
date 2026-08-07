import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Actively seeks the top profit- and wealth-generating websites/systems across
// industries. For each, identifies the niche, how they make money, who their
// client base is, design strengths, weaknesses, and a superiority strategy for
// cloning. Stores results as TopPerformer records queued for cloning.
//
// Body: { industries?: string[], limit_per_industry?: number }
// If no industries provided, scans a curated set of high-profit verticals.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const limitPerIndustry = Math.min(body.limit_per_industry || 3, 5);

    const DEFAULT_INDUSTRIES = [
      'SaaS', 'Fintech', 'E-commerce', 'AI Tools', 'Cybersecurity',
      'HealthTech', 'EdTech', 'Marketing Technology', 'Creator Economy',
      'Real Estate Tech', 'DevOps Tools', 'Legal Tech', 'HR Tech',
      'Renewable Energy Tech', 'Logistics Tech'
    ];
    const industries = (body.industries && body.industries.length > 0) ? body.industries : DEFAULT_INDUSTRIES;

    const allPerformers = [];

    for (const industry of industries) {
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          model: 'gemini_3_1_pro',
          add_context_from_internet: true,
          prompt: `You are a top-performer discovery engine. Research the ${limitPerIndustry} highest-profit, highest-traffic, most successful websites or systems in the "${industry}" space.

For EACH of the top ${limitPerIndustry}, provide a deep analysis:
1. name — the company/website name
2. url — their full URL
3. niche — the specific niche they dominate (be precise, not generic)
4. revenue_model — EXACTLY how they make money (subscription, ads, marketplace fees, freemium, enterprise licenses, transaction fees, affiliate, etc.) — be specific about pricing if known
5. estimated_revenue — rough annual revenue or valuation if known, else "Unknown"
6. client_base — WHO their clients/customers are (demographics, business size, geography)
7. target_audience — their ideal customer profile
8. value_proposition — their core value prop in one sentence
9. design_strengths — 3-5 specific design strengths (layout, UX, conversion elements)
10. key_features — 3-5 key features that drive their success
11. weaknesses — 2-4 gaps or weaknesses we can exploit when building a superior clone
12. profit_potential — "very_high" | "high" | "medium" based on market size + revenue
13. superiority_strategy — an object with: design_direction, content_advantages, feature_advantages, conversion_improvements, recommended_sections, recommended_tone, recommended_colors

Focus on REAL, well-known, high-profit sites. Prioritize sites that are actively generating significant revenue. Do not include hobby projects or small blogs.`,
          response_json_schema: {
            type: 'object',
            properties: {
              performers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    url: { type: 'string' },
                    niche: { type: 'string' },
                    revenue_model: { type: 'string' },
                    estimated_revenue: { type: 'string' },
                    client_base: { type: 'string' },
                    target_audience: { type: 'string' },
                    value_proposition: { type: 'string' },
                    design_strengths: { type: 'array', items: { type: 'string' } },
                    key_features: { type: 'array', items: { type: 'string' } },
                    weaknesses: { type: 'array', items: { type: 'string' } },
                    profit_potential: { type: 'string' },
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
              }
            }
          }
        });

        const performers = res.performers || [];
        for (const p of performers) {
          if (!p.name || !p.url) continue;
          try {
            // Dedupe by url — skip if already discovered
            const existing = await base44.asServiceRole.entities.TopPerformer.filter(
              { organization_id: orgId, url: p.url }, '-created_date', 1
            );
            if (existing.length > 0) continue;

            const record = await base44.asServiceRole.entities.TopPerformer.create({
              organization_id: orgId,
              name: p.name,
              url: p.url,
              industry,
              niche: p.niche || '',
              revenue_model: p.revenue_model || '',
              estimated_revenue: p.estimated_revenue || 'Unknown',
              client_base: p.client_base || '',
              target_audience: p.target_audience || '',
              value_proposition: p.value_proposition || '',
              design_strengths: p.design_strengths || [],
              key_features: p.key_features || [],
              weaknesses: p.weaknesses || [],
              superiority_strategy: p.superiority_strategy || {},
              profit_potential: ['very_high', 'high', 'medium', 'low'].includes(p.profit_potential) ? p.profit_potential : 'high',
              clone_status: 'discovered',
              clone_priority: p.profit_potential === 'very_high' ? 3 : p.profit_potential === 'high' ? 2 : 1,
              analysis_data: p,
              status: 'active'
            });
            allPerformers.push({ id: record.id, name: p.name, url: p.url, industry, profit_potential: p.profit_potential });
          } catch (e) { /* skip individual failures */ }
        }
      } catch (e) {
        console.error(`discoverTopPerformers: industry ${industry} failed:`, e.message);
      }
    }

    // Audit receipt
    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId,
        system: 'top_performer_discovery',
        action: 'discover',
        status: 'success',
        summary: `Discovered ${allPerformers.length} top performers across ${industries.length} industries`,
        evidence: { industries, count: allPerformers.length }
      });
    } catch (e) {}

    return Response.json({
      status: 'success',
      industries_scanned: industries.length,
      performers_discovered: allPerformers.length,
      performers: allPerformers
    });
  } catch (error) {
    console.error('discoverTopPerformers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}