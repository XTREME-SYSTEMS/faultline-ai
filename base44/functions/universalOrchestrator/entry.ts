import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { generateTemplatePackCore } from '../../shared/templateFactory.ts';

// Universal Orchestrator — the persistent, non-stop A-Z discovery + cloning
// engine. Each run: (1) picks the taxonomy category with the fewest discovered
// items and runs discovery on it, (2) clones ONE high-priority, validated,
// not-yet-cloned item into a DesignPack. Scheduled 24/7 so the exhaustive
// database builds itself across epoxy, concrete, construction, AI tools,
// agents, orchestrators, scrapers, and every industry.
//
// Admin-only. Body: { force_category? }

const TAXONOMY = [
  // Epoxy / concrete contractor websites + systems
  { category: 'epoxy_metallic', item_type: 'contractor_website', niche: 'metallic epoxy flooring contractors' },
  { category: 'epoxy_flake', item_type: 'contractor_website', niche: 'flake epoxy flooring contractors' },
  { category: 'epoxy_quartz', item_type: 'contractor_website', niche: 'quartz epoxy flooring contractors' },
  { category: 'epoxy_solid_color', item_type: 'contractor_website', niche: 'solid color epoxy flooring contractors' },
  { category: 'concrete_polished', item_type: 'contractor_website', niche: 'polished concrete contractors' },
  { category: 'concrete_stained', item_type: 'contractor_website', niche: 'stained concrete contractors' },
  { category: 'concrete_decorative', item_type: 'contractor_website', niche: 'decorative concrete contractors' },
  { category: 'concrete_overlayment', item_type: 'contractor_website', niche: 'concrete overlayment contractors' },
  { category: 'concrete_coating', item_type: 'contractor_website', niche: 'concrete coating contractors' },
  { category: 'commercial_flooring', item_type: 'contractor_website', niche: 'commercial flooring contractors' },
  { category: 'residential_flooring', item_type: 'contractor_website', niche: 'residential flooring contractors' },
  { category: 'government_flooring', item_type: 'contractor_website', niche: 'government flooring contractors' },
  // Construction data + platforms
  { category: 'construction_data_platforms', item_type: 'data_platform', niche: 'construction project databases (ConstructConnect, PlanHub, etc.)' },
  { category: 'construction_lead_gen', item_type: 'lead_gen_system', niche: 'construction lead generation platforms' },
  { category: 'construction_crm', item_type: 'crm', niche: 'construction CRM systems' },
  { category: 'construction_estimating', item_type: 'estimating_tool', niche: 'construction estimating & bidding tools' },
  { category: 'construction_pm', item_type: 'project_management', niche: 'construction project management platforms' },
  // Cross-industry systems
  { category: 'hubspot_class_crm', item_type: 'crm', niche: 'HubSpot-class CRM / marketing platforms' },
  { category: 'top_lead_gen_systems', item_type: 'lead_gen_system', niche: 'top lead generation systems across industries' },
  { category: 'top_ai_website_generators', item_type: 'website_generator', niche: 'AI website generators / builders' },
  { category: 'top_app_generators', item_type: 'app_generator', niche: 'AI app generators / builders' },
  { category: 'top_ai_tools', item_type: 'ai_tool', niche: 'top AI tools across categories' },
  { category: 'top_ai_agents', item_type: 'agent', niche: 'AI agent systems / autonomous agents' },
  { category: 'top_orchestrators', item_type: 'orchestrator', niche: 'orchestrator / workflow orchestration platforms' },
  { category: 'top_scraping_systems', item_type: 'scraper', niche: 'web scraping systems / data extraction' },
  { category: 'top_epoxy_contractor_websites', item_type: 'contractor_website', niche: 'top epoxy contractor websites by traffic' },
  { category: 'seo_aeo_platforms', item_type: 'seo_platform', niche: 'SEO / AEO platforms' },
  { category: 'online_store_platforms', item_type: 'online_store', niche: 'top online store / e-commerce platforms' },
  // All industries (rotating)
  { category: 'all_industries_saas', item_type: 'platform', niche: 'top SaaS platforms across all industries' },
  { category: 'all_industries_fintech', item_type: 'platform', niche: 'top fintech platforms' },
  { category: 'all_industries_healthtech', item_type: 'platform', niche: 'top healthtech platforms' },
  { category: 'all_industries_edtech', item_type: 'platform', niche: 'top edtech platforms' },
  { category: 'all_industries_realestate', item_type: 'platform', niche: 'top real estate tech platforms' },
  { category: 'all_industries_marketing', item_type: 'platform', niche: 'top marketing technology platforms' },
  { category: 'all_industries_logistics', item_type: 'platform', niche: 'top logistics tech platforms' },
  { category: 'all_industries_cybersecurity', item_type: 'platform', niche: 'top cybersecurity platforms' }
];

const CLONABLE_TYPES = ['contractor_website','online_store','platform','website_generator','data_platform','lead_gen_system','crm'];
const PR: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const log: string[] = [];

    // 1. DISCOVERY — pick the taxonomy category with the fewest items
    let target = TAXONOMY[0];
    if (body.force_category) {
      target = TAXONOMY.find(t => t.category === body.force_category) || TAXONOMY[0];
    } else {
      const allItems = await base44.asServiceRole.entities.UniversalCatalog.filter(
        { organization_id: orgId }, '-created_date', 500
      );
      const counts: Record<string, number> = {};
      for (const t of TAXONOMY) counts[t.category] = allItems.filter(i => i.category === t.category).length;
      let min = Infinity;
      for (const t of TAXONOMY) {
        if (counts[t.category] < min) { min = counts[t.category]; target = t; }
      }
      log.push(`Category counts: ${JSON.stringify(counts)}`);
    }
    log.push(`Discovery target: ${target.category} (${target.item_type}) — ${target.niche}`);

    let discoveryResult: any = { discovered: 0 };
    try {
      const r = await base44.functions.invoke('universalDiscovery', {
        category: target.category,
        item_type: target.item_type,
        niche: target.niche,
        limit: 5
      });
      discoveryResult = (r as any).data || r;
      log.push(`Discovered ${discoveryResult.discovered || 0} items`);
    } catch (e: any) {
      log.push(`Discovery failed: ${e.message}`);
    }

    // 2. CLONE — one high-priority validated, clonable, un-cloned item
    let cloneResult: any = { cloned: null };
    try {
      const candidates = await base44.asServiceRole.entities.UniversalCatalog.filter(
        { organization_id: orgId, validation_status: 'validated', clone_status: 'discovered', item_type: { $in: CLONABLE_TYPES } },
        '-created_date', 50
      );
      candidates.sort((a, b) => (PR[a.priority] ?? 9) - (PR[b.priority] ?? 9));
      if (candidates.length > 0) {
        const item = candidates[0];
        log.push(`Cloning: ${item.name} (${item.url})`);
        const packParams = {
          business_name: item.name,
          industry: item.category,
          description: item.description || item.value_proposition || item.niche || '',
          target_audience: item.target_audience || '',
          tone: item.superiority_strategy?.recommended_tone || 'professional',
          style_preferences: item.superiority_strategy?.design_direction || 'Modern, high-converting design inspired by the reference site',
          reference_url: item.url
        };
        const result = await generateTemplatePackCore(base44, orgId, packParams);
        await base44.asServiceRole.entities.UniversalCatalog.update(item.id, {
          clone_status: 'cloned',
          clone_artifact_id: result.created[0]?.id || ''
        });
        cloneResult = { cloned: item.name, packs: result.created.length, pack_id: result.created[0]?.id };
        log.push(`Cloned → ${result.created.length} packs`);
      } else {
        log.push('No validated clonable items ready to clone yet');
      }
    } catch (e: any) {
      log.push(`Clone failed: ${e.message}`);
    }

    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId,
        system: 'universal_orchestrator',
        action: 'cycle',
        status: 'success',
        summary: `Orchestrator: discovered ${discoveryResult.discovered || 0} in ${target.category}, cloned ${cloneResult.cloned || 'none'}`,
        evidence: { category: target.category, discovery: discoveryResult, clone: cloneResult, log }
      });
    } catch (e) {}

    return Response.json({ status: 'success', discovery: discoveryResult, clone: cloneResult, category: target.category, log });
  } catch (error) {
    console.error('universalOrchestrator error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}