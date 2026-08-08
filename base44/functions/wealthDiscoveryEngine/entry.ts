import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// The Wealth Discovery Engine — the intelligence layer of the autonomous wealth system.
//
// MISSION: Find what everyone wants but is too expensive or nearly impossible to get.
//
// This function uses LLM + live web search to identify high-value, in-demand software
// tools, agency services, and premium templates that command premium prices. Each
// candidate is scored by wealth potential (market size × price point × demand ×
// competition gap × clone feasibility), then queued for autonomous cloning.
//
// The result: a self-populating queue of targets ranked by how much wealth they can
// generate when cloned and offered at a fraction of the original price.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const industry = body.industry || 'general';
    const maxTargets = body.max_targets || 10;

    // 1. LLM + WEB SEARCH — identify expensive, in-demand, hard-to-find tools
    //    Using gemini_3_flash with add_context_from_internet for real market data.
    //    The prompt is engineered to surface WEALTH GENERATORS, not just nice-to-haves.
    const discoveryRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the FaultLine Wealth Discovery Engine — an autonomous intelligence system that finds what everyone wants but is too expensive or nearly impossible to get.

MISSION: Identify the ${maxTargets} highest-wealth-potential software tools, SaaS platforms, agency services, or premium digital products that could be cloned and offered at a fraction of the original cost.

INDUSTRY FOCUS: ${industry}

Search the live web for:
1. EXPENSIVE SaaS TOOLS that charge $100+/month — these have proven willingness-to-pay and large addressable markets. Look for tools in marketing, CRM, project management, AI, automation, analytics, SEO, design, content creation, business operations.
2. PREMIUM AGENCY SERVICES that cost $5,000+ — web design, SEO, branding, automation setup, AI integration. These can be productized into software.
3. HIGH-DEMAND TEMPLATES/PACKS that sell for $50-500 — website templates, Notion templates, Figma kits, prompt packs, design systems.
4. NICHE TOOLS that solve expensive problems — industry-specific software (construction, healthcare, legal, real estate) with high price points and low competition.
5. EMERGING AI TOOLS that are gaining traction but still expensive — AI generators, chatbots, automation platforms.

For EACH target, provide:
- name: The product/service name
- url: The actual website URL (must be a real, reachable URL you found via search)
- category: SaaS | agency_service | template | niche_tool | ai_tool
- industry: The primary industry it serves
- price_point: What it costs (e.g., "$299/month", "$5,000 setup", "$199 one-time")
- estimated_market_size: Rough market size estimate
- demand_signal: Evidence of demand (search volume, user count, growth indicators, reviews)
- competition_gap: How hard it is to find an affordable alternative (low/medium/high gap = high opportunity)
- clone_feasibility: How feasible it is to clone (website = easy, complex SaaS = harder)
- wealth_score: 0-100 —综合考虑 market size × price × demand × competition gap × feasibility
- clone_strategy: "website" (clone the marketing site + add our backend) | "app" (clone the full app UX) | "system" (clone the business model)
- superiority_strategy: How to build something BETTER, not just a copy
- rationale: One sentence on why this generates wealth

PRIORITIZE targets where:
- The price is HIGH (proven willingness-to-pay)
- The demand is VERIFIABLE (real users, real reviews, real search volume)
- The competition gap is LARGE (few cheap alternatives exist)
- The clone feasibility is REALISTIC (we can actually build it)
- The market is GROWING (not declining)

Return the top ${maxTargets} targets sorted by wealth_score (highest first). Only include targets with real URLs that you found via web search — do NOT fabricate URLs.`,
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          targets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                url: { type: 'string' },
                category: { type: 'string' },
                industry: { type: 'string' },
                price_point: { type: 'string' },
                estimated_market_size: { type: 'string' },
                demand_signal: { type: 'string' },
                competition_gap: { type: 'string' },
                clone_feasibility: { type: 'string' },
                wealth_score: { type: 'number' },
                clone_strategy: { type: 'string' },
                superiority_strategy: { type: 'string' },
                rationale: { type: 'string' }
              }
            }
          }
        }
      }
    });

    const targets = Array.isArray(discoveryRes.targets) ? discoveryRes.targets : [];

    // 2. DEDUPLICATE — skip targets we've already cataloged
    const existingCatalog = await base44.asServiceRole.entities.UniversalCatalog.filter(
      { organization_id: orgId }, '-created_date', 200
    );
    const existingUrls = new Set(existingCatalog.map((c: any) => c.url));
    const newTargets = targets.filter((t: any) => t.url && !existingUrls.has(t.url));

    // 3. CATALOG + QUEUE — create UniversalCatalog records and BuildQueueItems
    //    for each new high-value target. Only queue targets with wealth_score >= 60.
    let cataloged = 0, queued = 0;
    const queuedTargets = [];

    for (const target of newTargets) {
      try {
        const wealthScore = Math.min(100, Math.max(0, Math.round(target.wealth_score || 0)));
        const profitPotential = wealthScore >= 85 ? 'very_high' : wealthScore >= 70 ? 'high' : wealthScore >= 50 ? 'medium' : 'low';
        const priority = wealthScore >= 85 ? 'critical' : wealthScore >= 70 ? 'high' : wealthScore >= 50 ? 'medium' : 'low';

        // Create UniversalCatalog record
        const catalogItem = await base44.entities.UniversalCatalog.create({
          organization_id: orgId,
          category: target.category || 'ai_tools',
          item_type: target.clone_strategy === 'app' ? 'app_pack' : target.clone_strategy === 'system' ? 'platform' : 'web_pack',
          name: target.name,
          url: target.url,
          description: target.rationale || `${target.name} — ${target.price_point}`,
          revenue_model: target.price_point,
          target_audience: target.industry || industry,
          value_proposition: target.superiority_strategy || '',
          weaknesses: [`Expensive: ${target.price_point}`, `Competition gap: ${target.competition_gap}`],
          superiority_strategy: { strategy: target.superiority_strategy, wealth_score: wealthScore },
          analysis_data: {
            price_point: target.price_point,
            estimated_market_size: target.estimated_market_size,
            demand_signal: target.demand_signal,
            competition_gap: target.competition_gap,
            clone_feasibility: target.clone_feasibility,
            clone_strategy: target.clone_strategy,
            rationale: target.rationale
          },
          discovery_source: 'wealth_discovery_engine',
          priority,
          profit_potential: profitPotential,
          clone_status: 'discovered',
          tags: [target.category, target.industry, `wealth_${wealthScore}`],
          status: 'active'
        });

        cataloged++;

        // Queue high-value targets for autonomous cloning
        if (wealthScore >= 60) {
          const queueItem = await base44.entities.BuildQueueItem.create({
            organization_id: orgId,
            name: `Wealth Clone: ${target.name}`,
            build_type: target.clone_strategy === 'app' ? 'app' : 'website',
            description: `${target.name} — ${target.price_point} — wealth_score: ${wealthScore}`,
            industry: target.industry || industry,
            priority: wealthScore >= 85 ? 'urgent' : wealthScore >= 70 ? 'high' : 'normal',
            status: 'queued',
            input: {
              target_url: target.url,
              business_name: target.name,
              industry: target.industry || industry,
              wealth_score: wealthScore,
              catalog_id: catalogItem.id,
              clone_strategy: target.clone_strategy
            }
          });
          queued++;
          queuedTargets.push({ name: target.name, url: target.url, wealth_score: wealthScore, queue_id: queueItem.id });
        }
      } catch (e) {
        console.error(`Failed to catalog ${target.name}: ${e.message}`);
      }
    }

    // 4. RECEIPT — log the discovery for auditability
    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId,
        system: 'wealth_discovery',
        action: 'discover',
        status: 'success',
        summary: `Discovered ${targets.length} targets, cataloged ${cataloged} new, queued ${queued} for cloning (industry: ${industry})`,
        evidence: { industry, total_found: targets.length, cataloged, queued, top_targets: queuedTargets.slice(0, 5) }
      });
    } catch (e) { console.error('Receipt failed:', e); }

    return Response.json({
      status: 'success',
      industry,
      total_found: targets.length,
      cataloged,
      queued,
      queued_targets: queuedTargets,
      message: `Discovered ${targets.length} wealth targets, queued ${queued} for autonomous cloning`
    });
  } catch (error) {
    console.error('wealthDiscoveryEngine error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}