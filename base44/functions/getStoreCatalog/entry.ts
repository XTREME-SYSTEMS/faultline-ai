import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Public store catalog. Returns web/logo/brand design packs via service role
// so anonymous storefront visitors can browse the catalog without org-scoped
// RLS blocking the read.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const all = await base44.asServiceRole.entities.DesignPack.list('-created_date', 100);
    const types = new Set(['web_pack', 'logo_pack', 'brand_pack']);
    const packs = (all || []).filter((p) => types.has(p.pack_type) && p.image_url);
    return Response.json({
      web: packs.filter((p) => p.pack_type === 'web_pack'),
      logos: packs.filter((p) => p.pack_type === 'logo_pack'),
      brands: packs.filter((p) => p.pack_type === 'brand_pack')
    });
  } catch (e) {
    console.error('getStoreCatalog error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}