import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { resolvePrompt } from '../../shared/promptLibrary.ts';

// AI Design Pack Generator — creates a logo, brand, or web pack from a business
// description. Uses InvokeLLM to synthesize a pixel-faithful design spec (the same
// schema ingestDesignPack produces) and GenerateImage to render a high-quality
// visual reference image. The resulting DesignPack record can feed generateWebsite
// / generateApp / the Autonomous Launch Pipeline exactly like an ingested pack.

const PACK_SCHEMA = {
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
        fonts: { type: 'object', properties: { heading: { type: 'string' }, body: { type: 'string' } } },
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
    components: { type: 'array', items: { type: 'string' } },
    layout_system: { type: 'string' },
    visual_hierarchy: { type: 'string' },
    generation_instructions: { type: 'string' }
  }
};

const PACK_TYPE_LABELS = {
  logo_pack: 'logo pack (a clean logo mark + brand monogram sheet)',
  brand_pack: 'brand pack (color palette, typography, logo usage, brand voice, and stationery)',
  web_pack: 'web pack (full multi-page website design spec with nav, hero, sections, cards, forms, footer, and mobile layout)'
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { business_name, industry, description, target_audience, tone, pack_type, style_preferences, project_id } = body;

    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'Unauthorized — no organization' }, { status: 401 });
    if (!business_name) return Response.json({ error: 'business_name required' }, { status: 400 });

    const pType = ['logo_pack', 'brand_pack', 'web_pack'].includes(pack_type) ? pack_type : 'web_pack';
    const label = PACK_TYPE_LABELS[pType];

    // 1. Generate the structured design spec via LLM
    const specPrompt = `You are a senior brand architect and design systems lead. Create a complete, production-grade ${label} for this business. Output a structured spec a code generator can reproduce EXACTLY.

BUSINESS: ${business_name}
INDUSTRY: ${industry || 'General'}
DESCRIPTION: ${description || ''}
TARGET AUDIENCE: ${target_audience || 'general'}
TONE: ${tone || 'professional'}
STYLE PREFERENCES: ${style_preferences || 'modern, clean, high-conversion'}

Design the ${label} with:
1. BRAND — a fitting brand name (use "${business_name}" if appropriate), a style description, an EXACT color palette as hex codes (background, primary, secondary, accent, text, muted, card — choose a cohesive, high-quality palette that fits the industry and tone), exact Google Fonts (heading + body — pick from Google Fonts, pairing a distinctive display/heading font with a readable body font), and the tone of voice.
2. PAGES — ${pType === 'web_pack' ? '8-10 pages a high-converting site for this business needs (Home, About, Services, Pricing, Contact, etc.)' : '1-2 brand/logo presentation pages'}. For each: name, purpose, sections, layout description, and components.
3. COMPONENTS — every reusable UI component (nav, hero, cards, forms, testimonials, pricing cards, footer, etc.).
4. LAYOUT_SYSTEM — grid/modular system, spacing, structural approach.
5. VISUAL_HIERARCHY — how attention is guided.
6. GENERATION_INSTRUCTIONS — explicit, ordered instructions a generator must follow to reproduce this pack pixel-faithfully: exact CSS color variables, exact Google Fonts to load, exact pages in order, exact sections per page, exact components, and responsive rules.

Make it premium, cohesive, and conversion-optimized. All hex codes must be real, valid hex. All fonts must be real Google Fonts.`;

    const resolvedSpecPrompt = await resolvePrompt(base44, orgId, pType === 'logo_pack' ? 'logo-pack' : pType === 'brand_pack' ? 'brand-pack' : 'web-pack', 'GENERATE',
      { business_name, industry, description, target_audience, tone, style_preferences }, specPrompt);
    const specRes = await base44.integrations.Core.InvokeLLM({
      prompt: resolvedSpecPrompt,
      model: 'gemini_3_1_pro',
      response_json_schema: PACK_SCHEMA
    });

    const spec = specRes || {};
    spec.pack_type = pType;
    if (!spec.pack_name) spec.pack_name = `${business_name} ${pType.replace('_', ' ')}`;

    // 2. Generate a high-quality visual reference image of the pack
    const imgPrompt = `A premium design ${pType.replace('_', ' ')} presentation sheet for "${business_name}", a ${industry || 'modern'} business. ${spec.brand?.style_description || 'Clean, modern, high-end aesthetic'}. Show ${pType === 'logo_pack' ? 'the logo mark, monogram, and brand symbol on a clean background' : pType === 'brand_pack' ? 'the color palette swatches, typography specimen, logo usage, and brand voice examples arranged in a polished brand sheet' : 'a multi-page website design preview with navigation, hero section, feature cards, pricing, and footer — all using the brand colors and fonts'}. Colors: background ${spec.brand?.colors?.background || '#0a0a0a'}, primary ${spec.brand?.colors?.primary || '#C89B3C'}, accent ${spec.brand?.colors?.accent || '#E7C86E'}. Typography: ${spec.brand?.fonts?.heading || 'Orbitron'} for headings, ${spec.brand?.fonts?.body || 'Rajdhani'} for body. Professional, polished, high-fidelity design presentation, 4K, sharp, no text artifacts.`;

    let imageUrl = null;
    try {
      const imgRes = await base44.integrations.Core.GenerateImage({ prompt: imgPrompt });
      imageUrl = imgRes?.url || null;
    } catch (e) {
      // Image generation is best-effort; the spec alone is enough to drive generation
    }

    // 3. Store the DesignPack
    const pack = await base44.asServiceRole.entities.DesignPack.create({
      organization_id: orgId,
      project_id: project_id || null,
      pack_name: spec.pack_name,
      pack_type: pType,
      image_url: imageUrl || '',
      spec,
      status: 'extracted',
      notes: `AI-generated pack for ${business_name} (${industry || 'General'}). Style: ${style_preferences || 'modern'}.`
    });

    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId,
        system: 'design_pack_generator',
        action: 'generate',
        status: 'success',
        summary: `Generated ${pType} for ${business_name} — ${spec.pages?.length || 0} pages, ${spec.components?.length || 0} components${imageUrl ? ', with reference image' : ''}`,
        evidence: { pack_id: pack.id, image_url: imageUrl, pages: spec.pages?.length || 0 }
      });
    } catch (e) {}

    return Response.json({
      status: 'success',
      pack_id: pack.id,
      pack_type: pType,
      image_url: imageUrl,
      spec,
      message: `${pType.replace('_', ' ')} created${imageUrl ? ' with reference image' : ''} — ready to drive site generation`
    });
  } catch (error) {
    console.error('generateDesignPack error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}