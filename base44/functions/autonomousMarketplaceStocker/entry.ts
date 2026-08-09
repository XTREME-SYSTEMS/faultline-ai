import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Autonomous Marketplace Stocker — generates and stocks ToolProduct records
// for every concrete-industry niche and sub-niche. Runs nightly to keep the
// Toolio marketplace fully stocked with original products (AI tools, web packs,
// app packs, CRMs) across epoxy, polished concrete, decorative concrete,
// countertops, overlays, stained concrete, and all related sub-industries.
//
// Benchmark: Envato — a fully stocked, categorized marketplace where every
// niche has multiple product options at different price points.

const INDUSTRIES = [
  { niche: 'epoxy_flooring', name: 'Epoxy Flooring', subs: ['metallic', 'flake', 'solid_color', 'garage', 'basement', 'commercial', 'industrial', 'warehouse'] },
  { niche: 'polished_concrete', name: 'Polished Concrete', subs: ['industrial', 'commercial', 'residential', 'retail', 'warehouse'] },
  { niche: 'decorative_concrete', name: 'Decorative Concrete', subs: ['stamped', 'resurfacing', 'engraving', 'stenciling'] },
  { niche: 'epoxy_countertops', name: 'Epoxy Countertops', subs: ['kitchen', 'bathroom', 'bar_tops', 'custom'] },
  { niche: 'concrete_countertops', name: 'Concrete Countertops', subs: ['cast_in_place', 'precast', 'custom', 'outdoor_kitchen'] },
  { niche: 'concrete_overlays', name: 'Concrete Overlays', subs: ['microtopping', 'skim_coat', 'stamped_overlay', 'self_leveling'] },
  { niche: 'stained_concrete', name: 'Stained Concrete', subs: ['acid_stain', 'water_based', 'dyes', 'antiquing'] },
  { niche: 'concrete_sealing', name: 'Concrete Sealing', subs: ['penetrating', 'acrylic', 'urethane', 'epoxy_sealer'] },
  { niche: 'concrete_repair', name: 'Concrete Repair', subs: ['crack_injection', 'spall_repair', 'joint_fill', 'resurfacing'] },
  { niche: 'concrete_polishing', name: 'Concrete Polishing', subs: ['wet_polishing', 'dry_polishing', 'burnishing', 'honing'] },
];

const PRODUCT_ARCHETYPES = [
  { type: 'AI Tool', price: 29, category: 'ai_tool' },
  { type: 'Web Pack', price: 49, category: 'web_pack' },
  { type: 'App Pack', price: 99, category: 'app_pack' },
  { type: 'CRM System', price: 149, category: 'crm' },
  { type: 'Estimating Tool', price: 39, category: 'estimating' },
  { type: 'Lead Gen System', price: 79, category: 'lead_gen' },
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id || req.json?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const maxPerRun = body.max_per_run || 20; // limit per run to avoid timeout

    // Check time — pause at noon (user wants nighttime automation until 12pm)
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 18 && !body.force) {
      return Response.json({ status: 'paused', message: 'Daytime pause (noon-6pm) — nighttime automation resumes at 6pm', hour });
    }

    // Get existing products to avoid duplicates
    const existing = await base44.asServiceRole.entities.ToolProduct.filter(
      { organization_id: orgId, status: 'Ready' }, '-created_date', 500
    ).catch(() => []);
    const existingKeys = new Set(existing.map(p => `${p.category}_${p.tool_id}`.toLowerCase()));

    // Build the full product matrix: every industry × sub × archetype
    const planned = [];
    for (const ind of INDUSTRIES) {
      for (const sub of ind.subs) {
        for (const arch of PRODUCT_ARCHETYPES) {
          const subName = sub.replace(/_/g, ' ');
          const toolId = `${ind.niche}_${sub}_${arch.category}`;
          const name = `${ind.name} ${subName} ${arch.type}`;
          if (existingKeys.has(toolId.toLowerCase())) continue;
          planned.push({
            tool_id: toolId,
            name: name,
            category: arch.category,
            price: arch.price,
            industry: ind.niche,
            sub_industry: sub,
          });
        }
      }
    }

    console.log(`Marketplace stocker: ${planned.length} products to generate, ${existing.length} already exist`);

    if (planned.length === 0) {
      return Response.json({ status: 'fully_stocked', existing: existing.length, message: 'All concrete-industry products already stocked' });
    }

    // Take a batch for this run
    const batch = planned.slice(0, maxPerRun);

    // Generate product descriptions via LLM in one call
    const llmRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the Toolio Marketplace Product Generator. Generate professional product descriptions for digital products targeting the concrete/epoxy flooring industry.

Generate a product description for EACH product in this list. Return an array of objects with: tool_id, description (2-3 sentences), business_problem (what pain point it solves), benefits (array of 4-5 strings), tags (array of 4-6 strings).

PRODUCTS:
${JSON.stringify(batch.map(p => ({ tool_id: p.tool_id, name: p.name, category: p.category, industry: p.industry, sub: p.sub_industry })), null, 2)}

Make each description specific to the sub-industry (e.g. "garage epoxy" vs "warehouse epoxy"). Mention real contractor pain points: bidding, estimating, lead capture, CRM, customer portals, photo visualizers, scheduling. Professional tone, no fluff.`,
      response_json_schema: {
        type: 'object',
        properties: {
          products: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                tool_id: { type: 'string' },
                description: { type: 'string' },
                business_problem: { type: 'string' },
                benefits: { type: 'array', items: { type: 'string' } },
                tags: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    });

    const generated = (llmRes.products || []).filter(p => p.tool_id);
    const genMap = new Map(generated.map(g => [g.tool_id, g]));

    // Create ToolProduct records
    const toCreate = batch.map(p => {
      const gen = genMap.get(p.tool_id) || {};
      return {
        organization_id: orgId,
        tool_id: p.tool_id,
        name: p.name,
        category: p.category,
        description: gen.description || `Professional ${p.name} for concrete and epoxy contractors.`,
        business_problem: gen.business_problem || `Helps contractors in the ${p.name} space streamline operations and win more jobs.`,
        benefits: gen.benefits || ['Save time', 'Win more bids', 'Professional output', 'Easy to use'],
        price: p.price,
        tags: gen.tags || [p.industry, p.sub_industry, p.category],
        price_mode: 'A La Carte',
        status: 'Ready',
      };
    });

    const created = await base44.entities.ToolProduct.bulkCreate(toCreate);

    // Log receipt
    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'marketplace_stocker', action: 'stock_products',
        status: 'success',
        summary: `Stocked ${created.length} new products — ${planned.length - created.length} remaining`,
        evidence: { created: created.length, remaining: planned.length - created.length, total_existing: existing.length }
      });
    } catch (e) { console.error('receipt failed:', e); }

    return Response.json({
      status: 'success',
      created: created.length,
      remaining: planned.length - created.length,
      total_existing: existing.length,
      total_now: existing.length + created.length,
      sample: created.slice(0, 3).map(p => p.name)
    });
  } catch (error) {
    console.error('autonomousMarketplaceStocker error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}