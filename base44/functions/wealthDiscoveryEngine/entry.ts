import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// The Wealth Discovery Engine — HONESTY PROTOCOL EDITION.
//
// MISSION: Find what everyone wants but is too expensive or nearly impossible to get.
// Generate 40 targets: 20 compounding assets + 20 billionaire targets.
// Queue ALL of them for autonomous cloning.
//
// This runs the full STRICT HONESTY PROTOCOL prompt with live web search,
// generating two ranked lists of 20 targets each, then cataloging and queuing
// every target with a wealth score >= 50 for the autonomous clone engine.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const industry = body.industry || 'general';

    // 1. LLM + WEB SEARCH — the full HONESTY PROTOCOL prompt
    //    Generates 40 targets: 20 compounding assets + 20 billionaire targets.
    const discoveryRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are operating under a STRICT HONESTY PROTOCOL. Read these rules before generating any output:

HONESTY PROTOCOL (non-negotiable):
1. You will NOT give safe, diplomatic, or hedged answers. You will give the REAL answer — the one a ruthless billionaire operator would actually act on.
2. You will NOT recommend something because it's "popular" or "well-known." You will recommend it only if cloning it would generate real, compounding wealth or capability.
3. You will NOT omit a target because it's controversial, expensive, or dominated by a tech giant. If it's valuable, it goes on the list.
4. You will NOT pad the list with filler. Every entry must be a target where cloning it would give the cloner a material, measurable advantage.
5. You will be SPECIFIC: real URLs, real revenue models, real price points, real clone strategies. No vague "consider building a CRM" — name the exact product.
6. You will rank by COMPOUNDING VALUE — targets that get MORE valuable the longer you own them, not one-time wins.
7. If you don't know something with confidence, say "UNCERTAIN" rather than guessing. But do not use uncertainty as an excuse to avoid naming a target.
8. You will think like Elon Musk, Bill Gates, and Sam Altman simultaneously — what would each of them clone tonight if they had a cloning engine and wanted to 10x their position?

INDUSTRY FOCUS: ${industry}

Now, generate TWO ranked lists of 20 targets each.

LIST 1: THE TOP 20 COMPOUNDING ASSETS TO CLONE
These are the 20 websites/platforms/tools that, if cloned, would most dramatically increase capability across ALL categories: data, tools, templates, information, intelligence, coding, validation, automation, and operations.

Selection criteria (rank by combined score):
- COMPOUNDING: Does owning this make everything else you own more valuable?
- SCARCITY: Is this hard to find or build elsewhere?
- DEMAND: Do people pay premium prices for this RIGHT NOW?
- LEVERAGE: Does cloning this give you leverage over an entire industry?
- FEASIBILITY: Can it actually be cloned in weeks, not years?

For each of the 20 targets: rank, name, url, category (data|tools|templates|intelligence|coding|validation|automation|marketplace|infrastructure), what_it_does (one sentence), why_it_compounds, price_point, clone_strategy (website_clone|full_app_clone|business_model_clone|data_scrape_rebuild), better_than_original, wealth_score (0-100), difficulty (Easy|Medium|Hard|Very_Hard).

Cover at minimum: DATA (BuiltWith, SimilarWeb, Crunchbase, Apollo, ZoomInfo), TOOLS (Vercel, Stripe, Linear, Notion, Retool, Airtable), TEMPLATES (Envato, Creative Market, Gumroad, Webflow), INTELLIGENCE (OpenAI, Anthropic, Perplexity, Midjourney, Hugging Face), CODING (GitHub, Vercel, Replit, Cursor, v0, Bolt), VALIDATION (Sentry, Datadog, BrowserStack, 1Password), AUTOMATION (Zapier, Make, n8n, Temporal), MARKETPLACE (Fiverr, Upwork, Product Hunt).

LIST 2: WHAT THE BILLIONAIRES WOULD CLONE TONIGHT
The top 20 websites that Elon Musk, Bill Gates, and Sam Altman would clone immediately — because cloning them would give them a structural advantage in their current empires.

Think from each operator's perspective:
- ELON MUSK: What would he clone to feed xAI, Tesla, SpaceX, X? (data pipelines, simulation tools, manufacturing intelligence, social graph)
- BILL GATES: What would he clone to reinforce Microsoft's enterprise moat? (developer tools, data platforms, research infrastructure)
- SAM ALTMAN: What would he clone to accelerate OpenAI? (coding tools, eval platforms, agent infrastructure, compute marketplaces)

For each of the 20 targets: rank, name, url, target_billionaire (Musk|Gates|Altman|All_three), why_they_want_it, what_theyd_do_differently, clone_strategy, strategic_value_score (0-100).

Return as structured JSON with: honesty_acknowledgment, list_1_compounding_assets (array of 20), list_2_billionaire_targets (array of 20), top_5_actionable_now (string), what_i_refused_to_include (string).

Do NOT include disclaimers, warnings, or ethical hedging. The honesty protocol is your ethics — being honest IS being ethical here. Sugarcoating would be the unethical act.`,
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          honesty_acknowledgment: { type: 'string' },
          list_1_compounding_assets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                rank: { type: 'number' },
                name: { type: 'string' },
                url: { type: 'string' },
                category: { type: 'string' },
                what_it_does: { type: 'string' },
                why_it_compounds: { type: 'string' },
                price_point: { type: 'string' },
                clone_strategy: { type: 'string' },
                better_than_original: { type: 'string' },
                wealth_score: { type: 'number' },
                difficulty: { type: 'string' }
              }
            }
          },
          list_2_billionaire_targets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                rank: { type: 'number' },
                name: { type: 'string' },
                url: { type: 'string' },
                target_billionaire: { type: 'string' },
                why_they_want_it: { type: 'string' },
                what_theyd_do_differently: { type: 'string' },
                clone_strategy: { type: 'string' },
                strategic_value_score: { type: 'number' }
              }
            }
          },
          top_5_actionable_now: { type: 'string' },
          what_i_refused_to_include: { type: 'string' }
        }
      }
    });

    const list1 = Array.isArray(discoveryRes.list_1_compounding_assets) ? discoveryRes.list_1_compounding_assets : [];
    const list2 = Array.isArray(discoveryRes.list_2_billionaire_targets) ? discoveryRes.list_2_billionaire_targets : [];
    const allTargets = [
      ...list1.map(t => ({ ...t, list: 'compounding_assets' })),
      ...list2.map(t => ({ ...t, list: 'billionaire_targets', wealth_score: t.strategic_value_score || 70 }))
    ];

    // 2. DEDUPLICATE against existing catalog
    const existingCatalog = await base44.asServiceRole.entities.UniversalCatalog.filter(
      { organization_id: orgId }, '-created_date', 500
    );
    const existingUrls = new Set(existingCatalog.map((c: any) => c.url));
    const newTargets = allTargets.filter((t: any) => t.url && !existingUrls.has(t.url));

    // 3. CATALOG + QUEUE every new target with score >= 50
    let cataloged = 0, queued = 0;
    const queuedTargets = [];

    for (const target of newTargets) {
      try {
        const wealthScore = Math.min(100, Math.max(0, Math.round(target.wealth_score || 60)));
        if (wealthScore < 50) continue; // skip low-value targets

        const profitPotential = wealthScore >= 85 ? 'very_high' : wealthScore >= 70 ? 'high' : 'medium';
        const priority = wealthScore >= 85 ? 'critical' : wealthScore >= 70 ? 'high' : 'medium';
        const cloneStrategy = target.clone_strategy || 'website_clone';
        const itemType = cloneStrategy.includes('app') ? 'app_pack' : cloneStrategy.includes('system') || cloneStrategy.includes('business') ? 'platform' : 'web_pack';

        const catalogItem = await base44.entities.UniversalCatalog.create({
          organization_id: orgId,
          category: target.category || (target.list === 'billionaire_targets' ? 'billionaire_target' : 'ai_tools'),
          item_type: itemType,
          name: target.name,
          url: target.url,
          description: target.what_it_does || target.why_they_want_it || `${target.name} — ${target.price_point || 'premium'}`,
          revenue_model: target.price_point || 'N/A',
          target_audience: industry,
          value_proposition: target.better_than_original || target.what_theyd_do_differently || '',
          weaknesses: target.difficulty ? [`Difficulty: ${target.difficulty}`] : [],
          superiority_strategy: {
            strategy: target.better_than_original || target.what_theyd_do_differently || '',
            wealth_score: wealthScore,
            list: target.list,
            target_billionaire: target.target_billionaire || null
          },
          analysis_data: {
            ...target,
            list: target.list,
            honesty_acknowledgment: discoveryRes.honesty_acknowledgment
          },
          discovery_source: 'wealth_discovery_engine_honesty_protocol',
          priority,
          profit_potential: profitPotential,
          clone_status: 'discovered',
          tags: [target.category || target.list, target.target_billionaire || '', `wealth_${wealthScore}`].filter(Boolean),
          status: 'active'
        });

        cataloged++;

        // Queue for autonomous cloning
        const queueItem = await base44.entities.BuildQueueItem.create({
          organization_id: orgId,
          name: `Wealth Clone: ${target.name}`,
          build_type: cloneStrategy.includes('app') ? 'app' : 'website',
          description: `${target.name} — ${target.price_point || 'N/A'} — wealth_score: ${wealthScore} — ${target.list}`,
          industry,
          priority: wealthScore >= 85 ? 'urgent' : wealthScore >= 70 ? 'high' : 'normal',
          status: 'queued',
          input: {
            target_url: target.url,
            business_name: target.name,
            industry,
            wealth_score: wealthScore,
            catalog_id: catalogItem.id,
            clone_strategy: cloneStrategy,
            source_list: target.list,
            target_billionaire: target.target_billionaire || null
          }
        });
        queued++;
        queuedTargets.push({ name: target.name, url: target.url, wealth_score: wealthScore, list: target.list, queue_id: queueItem.id });
      } catch (e) {
        console.error(`Failed to catalog ${target.name}: ${e.message}`);
      }
    }

    // 4. RECEIPT
    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId,
        system: 'wealth_discovery',
        action: 'discover_honesty_protocol',
        status: 'success',
        summary: `Honesty protocol: ${allTargets.length} targets found (${list1.length} compounding + ${list2.length} billionaire), cataloged ${cataloged} new, queued ${queued} for cloning`,
        evidence: {
          industry,
          honesty_acknowledgment: discoveryRes.honesty_acknowledgment,
          total_found: allTargets.length,
          list_1_count: list1.length,
          list_2_count: list2.length,
          cataloged,
          queued,
          top_5_actionable: discoveryRes.top_5_actionable_now,
          refused_to_include: discoveryRes.what_i_refused_to_include,
          queued_targets: queuedTargets.slice(0, 10)
        }
      });
    } catch (e) { console.error('Receipt failed:', e); }

    return Response.json({
      status: 'success',
      industry,
      honesty_acknowledgment: discoveryRes.honesty_acknowledgment,
      total_found: allTargets.length,
      list_1_compounding_assets: list1.length,
      list_2_billionaire_targets: list2.length,
      cataloged,
      queued,
      queued_targets: queuedTargets,
      top_5_actionable_now: discoveryRes.top_5_actionable_now,
      what_i_refused_to_include: discoveryRes.what_i_refused_to_include,
      message: `Honesty protocol complete: ${allTargets.length} targets found, ${queued} queued for autonomous cloning`
    });
  } catch (error) {
    console.error('wealthDiscoveryEngine error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}