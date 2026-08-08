import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Universal discovery — finds the top items (platforms, stores, tools,
// contractor websites, agents, scrapers, orchestrators, etc.) in a given
// category/niche using LLM + live web search, validates each for completeness,
// and stores it in UniversalCatalog. Dedupes by url. This is the "scoop up
// everything" engine that feeds the exhaustive A-Z database.
//
// Body: { category, subcategory?, niche?, item_type, limit? }

const ITEM_TYPE_LABELS: Record<string, string> = {
  platform: 'platforms / software systems',
  online_store: 'online stores / e-commerce sites',
  ai_tool: 'AI tools / AI-powered products',
  ai_template: 'AI template / prompt libraries',
  web_pack: 'web design packs / template systems',
  app_pack: 'mobile app templates / app builders',
  scraper: 'web scraping systems / data extraction tools',
  agent: 'AI agent systems / autonomous agents',
  orchestrator: 'orchestrator systems / workflow orchestration platforms',
  contractor_website: 'contractor websites (flooring / concrete / epoxy)',
  data_platform: 'construction data platforms / project databases',
  lead_gen_system: 'lead generation systems / platforms',
  crm: 'CRM systems',
  estimating_tool: 'estimating / bidding tools',
  project_management: 'project management platforms',
  seo_platform: 'SEO / AEO platforms',
  website_generator: 'AI website generators / builders',
  app_generator: 'AI app generators / builders',
  other: 'systems / products'
};

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const category = body.category;
    const itemType = body.item_type || 'platform';
    if (!category) return Response.json({ error: 'category required' }, { status: 400 });
    const subcategory = body.subcategory || '';
    const niche = body.niche || '';
    const limit = Math.min(body.limit || 5, 10);
    const label = ITEM_TYPE_LABELS[itemType] || ITEM_TYPE_LABELS.other;

    const res = await base44.integrations.Core.InvokeLLM({
      model: 'gemini_3_1_pro',
      add_context_from_internet: true,
      prompt: `You are a universal discovery engine. Research the ${limit} most successful, highest-traffic, most relevant ${label} in the category "${category}"${subcategory ? ` / ${subcategory}` : ''}${niche ? ` (niche: ${niche})` : ''}.

For EACH of the top ${limit}, provide a deep analysis:
1. name
2. url — full URL
3. niche — the specific niche they serve
4. revenue_model — exactly how they make money
5. target_audience
6. value_proposition — one sentence
7. key_features — 3-5
8. design_strengths — 3-5 (for sites/tools with a UI)
9. weaknesses — 2-4 gaps we can exploit when building a superior version
10. profit_potential — "very_high" | "high" | "medium" | "low"
11. superiority_strategy — object: { design_direction, content_advantages[], feature_advantages[], conversion_improvements[], recommended_sections[], recommended_tone, recommended_colors }
12. description — 1-2 sentence summary

Focus on REAL, well-known, actively-used items. Skip hobby projects or small blogs.`,
      response_json_schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                url: { type: 'string' },
                niche: { type: 'string' },
                revenue_model: { type: 'string' },
                target_audience: { type: 'string' },
                value_proposition: { type: 'string' },
                key_features: { type: 'array', items: { type: 'string' } },
                design_strengths: { type: 'array', items: { type: 'string' } },
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
                },
                description: { type: 'string' }
              }
            }
          }
        }
      }
    });

    const items = (res as any).items || [];
    const created: any[] = [];
    for (const it of items) {
      if (!it.name || !it.url) continue;
      try {
        const existing = await base44.asServiceRole.entities.UniversalCatalog.filter(
          { organization_id: orgId, url: it.url }, '-created_date', 1
        );
        if (existing.length > 0) continue;
        const validation = validateItem(it);
        const record = await base44.asServiceRole.entities.UniversalCatalog.create({
          organization_id: orgId,
          category, subcategory, niche,
          item_type: itemType,
          name: it.name,
          url: it.url,
          description: it.description || '',
          revenue_model: it.revenue_model || '',
          target_audience: it.target_audience || '',
          value_proposition: it.value_proposition || '',
          key_features: it.key_features || [],
          design_strengths: it.design_strengths || [],
          weaknesses: it.weaknesses || [],
          superiority_strategy: it.superiority_strategy || {},
          analysis_data: it,
          discovery_source: 'llm_web_search',
          validation_status: validation.status,
          validation_notes: validation.notes,
          clone_status: 'discovered',
          priority: it.profit_potential === 'very_high' ? 'critical' : it.profit_potential === 'high' ? 'high' : 'medium',
          profit_potential: ['very_high','high','medium','low'].includes(it.profit_potential) ? it.profit_potential : 'medium',
          tags: [category, subcategory, niche].filter(Boolean),
          status: 'active'
        });
        created.push({ id: record.id, name: it.name, url: it.url, validation: validation.status });
      } catch (e) { /* skip individual failures */ }
    }

    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId,
        system: 'universal_discovery',
        action: 'discover',
        status: 'success',
        summary: `Discovered ${created.length} ${label} in ${category}`,
        evidence: { category, subcategory, niche, item_type: itemType, count: created.length }
      });
    } catch (e) {}

    return Response.json({ status: 'success', category, item_type: itemType, discovered: created.length, items: created });
  } catch (error) {
    console.error('universalDiscovery error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function validateItem(it: any) {
  const missing: string[] = [];
  if (!it.url) missing.push('url');
  if (!it.value_proposition) missing.push('value_proposition');
  if (!it.superiority_strategy || !it.superiority_strategy.design_direction) missing.push('superiority_strategy');
  if (!it.key_features || it.key_features.length < 2) missing.push('key_features');
  if (missing.length === 0) return { status: 'validated', notes: 'Complete analysis with superiority strategy.' };
  if (missing.length <= 2) return { status: 'needs_work', notes: `Missing: ${missing.join(', ')}` };
  return { status: 'failed', notes: `Incomplete: ${missing.join(', ')}` };
}