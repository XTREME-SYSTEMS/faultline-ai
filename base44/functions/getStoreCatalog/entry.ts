import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Public store catalog. Returns:
//   - Design packs (web/logo/brand) from DesignPack entity
//   - Cloned systems from UniversalCatalog as sellable Tools, Web Packs, App Packs
// Uses service role so anonymous storefront visitors can browse without org-scoped RLS.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // 1. Design packs (existing) — strip to essential fields only (full spec is huge)
    const allPacks = await base44.asServiceRole.entities.DesignPack.list('-created_date', 100);
    const packTypes = new Set(['web_pack', 'logo_pack', 'brand_pack']);
    const packs = (allPacks || [])
      .filter((p) => packTypes.has(p.pack_type) && p.image_url)
      .map((p) => ({
        id: p.id,
        pack_name: p.pack_name,
        pack_type: p.pack_type,
        image_url: p.image_url,
        spec: {
          brand: p.spec?.brand ? {
            style_description: p.spec.brand.style_description,
            colors: p.spec.brand.colors,
            fonts: p.spec.brand.fonts
          } : null,
          pages: p.spec?.pages ? p.spec.pages.map((pg) => ({ name: pg.name })) : []
        }
      }));

    // 2. Cloned systems from UniversalCatalog — these become sellable Tools, Web Packs, App Packs
    //    Only include items that have been cloned (clone_status = 'cloned') and have a URL
    const allCatalog = await base44.asServiceRole.entities.UniversalCatalog.filter(
      { clone_status: 'cloned', status: 'active' }, '-created_date', 200
    );

    // Classify cloned systems into product types
    const tools = [];
    const webPacks = [];
    const appPacks = [];

    for (const c of allCatalog || []) {
      const item = {
        id: c.id,
        name: c.name,
        url: c.url,
        image: c.analysis_data?.screenshot || null,
        description: c.description || c.value_proposition || '',
        category: c.category,
        niche: c.niche,
        revenue_model: c.revenue_model,
        key_features: c.key_features || [],
        design_strengths: c.design_strengths || [],
        priority: c.priority,
        profit_potential: c.profit_potential,
        tags: c.tags || []
      };

      // Classify by item_type — SaaS tools vs website templates vs app templates
      const toolTypes = ['ai_tool', 'ai_template', 'agent', 'orchestrator', 'crm', 'platform',
        'website_generator', 'lead_gen_system', 'data_platform', 'scraper',
        'seo_platform', 'estimating_tool', 'project_management', 'other'];
      const appTypes = ['app_pack', 'app_generator'];

      if (appTypes.includes(c.item_type)) {
        appPacks.push(item);
      } else if (toolTypes.includes(c.item_type)) {
        tools.push(item);
      } else {
        webPacks.push(item);
      }
    }

    return Response.json({
      web: packs.filter((p) => p.pack_type === 'web_pack'),
      logos: packs.filter((p) => p.pack_type === 'logo_pack'),
      brands: packs.filter((p) => p.pack_type === 'brand_pack'),
      tools,
      webPacks,
      appPacks,
      counts: {
        designWeb: packs.filter((p) => p.pack_type === 'web_pack').length,
        designLogos: packs.filter((p) => p.pack_type === 'logo_pack').length,
        designBrands: packs.filter((p) => p.pack_type === 'brand_pack').length,
        tools: tools.length,
        webPacks: webPacks.length,
        appPacks: appPacks.length
      }
    });
  } catch (e) {
    console.error('getStoreCatalog error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}