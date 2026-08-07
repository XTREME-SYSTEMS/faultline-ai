import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Design Pack Ingestion — reads an uploaded web/brand/logo pack IMAGE via AI vision
// (gemini_3_1_pro + file_urls) and extracts a structured design spec, then stores it
// as a DesignPack record. The extracted spec becomes the authoritative design DNA for
// generateWebsite / generateApp so output matches the pack EXACTLY (using the client's
// real data, never the pack's sample/placeholder copy).

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    pack_name: { type: 'string' },
    pack_type: { type: 'string' },
    brand: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        style_description: { type: 'string' },
        colors: {
          type: 'object',
          properties: {
            background: { type: 'string' },
            primary: { type: 'string' },
            secondary: { type: 'string' },
            accent: { type: 'string' },
            text: { type: 'string' },
            muted: { type: 'string' },
            card: { type: 'string' }
          }
        },
        fonts: {
          type: 'object',
          properties: { heading: { type: 'string' }, body: { type: 'string' } }
        },
        tone: { type: 'string' }
      }
    },
    pages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          purpose: { type: 'string' },
          sections: { type: 'array', items: { type: 'string' } },
          layout_description: { type: 'string' },
          components: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    components: { type: 'array', items: { type: 'string' }, description: 'Reusable UI components visible in the pack' },
    layout_system: { type: 'string' },
    visual_hierarchy: { type: 'string' },
    tech_stack: { type: 'array', items: { type: 'string' } },
    architecture: { type: 'string' },
    pwa_features: { type: 'array', items: { type: 'string' } },
    generation_instructions: { type: 'string', description: 'Explicit step-by-step instructions for the generator to reproduce this pack exactly' }
  }
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { image_url, pack_type, pack_name, project_id, notes } = body;

    // Authenticated operator, OR public client access via a project_id
    const user = await base44.auth.me().catch(() => null);
    let orgId = user?.data?.organization_id;
    if (!orgId && project_id) {
      const proj = await base44.asServiceRole.entities.ClientProject.get(project_id).catch(() => null);
      orgId = proj?.organization_id;
    }
    if (!orgId) return Response.json({ error: 'Unauthorized — no organization' }, { status: 401 });
    if (!image_url) return Response.json({ error: 'image_url required' }, { status: 400 });

    // Create a pending DesignPack record first
    const pack = await base44.asServiceRole.entities.DesignPack.create({
      organization_id: orgId,
      project_id: project_id || null,
      pack_name: pack_name || 'Untitled Pack',
      pack_type: pack_type || 'web_pack',
      image_url,
      spec: {},
      status: 'pending',
      notes: notes || ''
    });

    // Run vision extraction with the best vision-capable model
    const prompt = `You are a senior design systems architect. Analyze this design pack image — it is a complete visual specification for a web platform (branding, typography, tech stack, page-by-page UI specs, architecture, and PWA features).

Extract a precise, structured design spec that a code generator can reproduce EXACTLY. Capture:

1. BRAND — company/brand name, overall style description, the EXACT color palette (hex codes as shown — background, primary, secondary, accent, text, muted, card colors), the exact fonts (heading + body), and the tone of voice.
2. PAGES — every page shown in the pack, in order. For each: its name, purpose, the sections it contains, a layout description, and the components visible.
3. COMPONENTS — every reusable UI component visible (cards, navbars, sidebars, buttons, forms, charts, tables, approval gates, etc.).
4. LAYOUT_SYSTEM — the grid/modular system, spacing, and structural approach.
5. VISUAL_HIERARCHY — how attention is guided (headings, contrast, card density).
6. TECH_STACK — every technology listed.
7. ARCHITECTURE — the backend/data flow described (users → projects → assets → approvals → payments → etc.).
8. PWA_FEATURES — every PWA feature listed.
9. GENERATION_INSTRUCTIONS — explicit, ordered instructions a generator must follow to reproduce this pack pixel-faithfully: exact colors to use as CSS variables, exact Google Fonts to load, exact pages to build in order, exact sections per page, exact components to include, exact layout patterns, and any workflow gates (e.g. approval gates with "Request Changes" / "Approve" buttons).

CRITICAL: This pack contains SAMPLE/PLACEHOLDER copy and demo data (e.g. fake business names, sample testimonials, dummy stats). Do NOT treat that sample copy as the real content. The generator will use the CLIENT'S real business data instead. Your job is to capture the DESIGN and STRUCTURE, not the sample text. Where the pack shows sample text, describe the text's ROLE and STYLE (e.g. "hero headline — bold, uppercase, yellow on black") rather than copying the sample words verbatim.

Return ONLY the structured spec.`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: 'gemini_3_1_pro',
        file_urls: [image_url],
        response_json_schema: EXTRACTION_SCHEMA
      });

      const spec = res || {};
      await base44.asServiceRole.entities.DesignPack.update(pack.id, { spec, status: 'extracted' });

      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId,
        system: 'design_pack_ingestion',
        action: 'ingest',
        status: 'success',
        summary: `Ingested ${pack_type || 'design pack'}: ${pack_name || 'Untitled'} — extracted ${spec.pages?.length || 0} pages, ${spec.components?.length || 0} components`,
        evidence: { pack_id: pack.id, image_url, pages: spec.pages?.length || 0 }
      });

      return Response.json({ status: 'success', pack_id: pack.id, spec });
    } catch (extractErr) {
      await base44.asServiceRole.entities.DesignPack.update(pack.id, { status: 'failed', notes: (notes || '') + ' | Extraction failed: ' + extractErr.message });
      return Response.json({ error: 'Vision extraction failed', detail: extractErr.message, pack_id: pack.id }, { status: 500 });
    }
  } catch (error) {
    console.error('ingestDesignPack error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}