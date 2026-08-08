import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Template Factory — analyzes a reference site (or niche), generates ONE original
// multi-page web template spec, renders a reference image, then produces N
// accent-color variants of that same template as separate DesignPack records.
// This is the reusable engine behind the "AI store" template library: every
// niche/category (contractors, stores, construction OS, AI builders, etc.)
// flows through here. Original designs inspired by public patterns — no
// copyrighted code/content is reproduced.

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
    generation_instructions: { type: 'string' },
    seo: {
      type: 'object',
      properties: {
        meta_strategy: { type: 'string' },
        schema_markup: { type: 'array', items: { type: 'string' } },
        target_keywords: { type: 'array', items: { type: 'string' } },
        local_seo: { type: 'string' }
      }
    },
    pwa: {
      type: 'object',
      properties: {
        app_name: { type: 'string' },
        theme_color: { type: 'string' },
        icons: { type: 'string' },
        offline_strategy: { type: 'string' }
      }
    }
  }
};

const DEFAULT_ACCENTS = [
  { name: 'Gold', color: '#C89B3C' },
  { name: 'Crimson', color: '#C41E3A' },
  { name: 'Electric Blue', color: '#0038FF' },
  { name: 'Forest', color: '#2C6E49' },
  { name: 'Safety Orange', color: '#FF5E00' },
  { name: 'Silver', color: '#8A8A8A' }
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { business_name, industry, description, target_audience, tone, style_preferences, reference_url, reference_notes, accents, project_id } = body;

    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'Unauthorized — no organization' }, { status: 401 });
    if (!business_name) return Response.json({ error: 'business_name required' }, { status: 400 });

    const accentList = Array.isArray(accents) && accents.length ? accents : DEFAULT_ACCENTS;

    // 1. Optional reference-site analysis via web-enabled LLM
    let refContext = reference_notes || '';
    if (reference_url) {
      try {
        const refRes = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze the website at ${reference_url} (a ${industry || 'contractor'} site). Describe concisely: (1) overall layout & section ordering, (2) color palette, (3) typography, (4) hero treatment, (5) key conversion features (forms, CTAs, galleries, estimators), (6) what makes it effective. Be specific and factual — describe patterns, do not copy content.`,
          add_context_from_internet: true,
          model: 'gemini_3_flash'
        });
        refContext += (refContext ? '\n\n' : '') + (typeof refRes === 'string' ? refRes : JSON.stringify(refRes));
      } catch (e) {
        console.error('reference analysis failed:', e.message);
      }
    }

    // 2. Generate the base template spec
    const specPrompt = `You are a senior brand architect, SEO lead, and PWA engineer. Create a complete, production-grade, FULLY SEO-OPTIMIZED web template for this business. Output a structured spec a code generator can reproduce EXACTLY.

BUSINESS: ${business_name}
INDUSTRY: ${industry || 'General contractor'}
DESCRIPTION: ${description || ''}
TARGET AUDIENCE: ${target_audience || 'general'}
TONE: ${tone || 'professional'}
STYLE: ${style_preferences || 'modern, clean, high-conversion'}
${refContext ? `\nREFERENCE ANALYSIS (build an ORIGINAL design inspired by these patterns — do NOT copy):\n${refContext}` : ''}

Design the web pack with:
1. BRAND — name, style description, EXACT hex palette (background, primary, secondary, accent, text, muted, card), real Google Fonts (heading + body), tone.
2. PAGES — 8-10 pages a high-converting contractor site needs (Home, Services, Service detail, Gallery/Projects, About, Service Area, Reviews, Financing, Contact, Blog). For each: name, purpose, sections, layout description, components.
3. COMPONENTS — every reusable UI component (nav, hero, service cards, project gallery, before/after slider, review carousel, financing calculator, contact form, footer, sticky CTA, click-to-call).
4. LAYOUT_SYSTEM & VISUAL_HIERARCHY.
5. GENERATION_INSTRUCTIONS — exact CSS variables, Google Fonts to load, pages in order, sections per page, responsive rules.
6. SEO — meta strategy, schema markup (LocalBusiness, Service, FAQPage, BreadcrumbList, ImageObject), target keywords, local SEO (city pages, Google Business Profile integration).
7. PWA — app name, theme color (use the accent), icon strategy, offline strategy (cache static pages + lead form submission queue).

Make it premium, cohesive, conversion-optimized, and SEO-complete. All hex codes valid. All fonts real Google Fonts.`;

    const specRes = await base44.integrations.Core.InvokeLLM({
      prompt: specPrompt,
      model: 'gemini_3_1_pro',
      response_json_schema: PACK_SCHEMA
    });
    const baseSpec = specRes || {};
    baseSpec.pack_type = 'web_pack';
    if (!baseSpec.pack_name) baseSpec.pack_name = `${business_name} Template`;
    baseSpec.template_factory = { industry, reference_url: reference_url || null, base: true };

    // 3. Base reference image
    const c = baseSpec.brand?.colors || {};
    const imgPrompt = `A premium multi-page website design preview sheet for "${business_name}", a ${industry || 'contractor'} business. ${baseSpec.brand?.style_description || 'Clean, modern, high-end'}. Show nav, hero, service cards, project gallery, and footer using background ${c.background || '#fff'}, primary ${c.primary || '#111'}, accent ${c.accent || '#C89B3C'}. Headings: ${baseSpec.brand?.fonts?.heading || 'Inter'}. Body: ${baseSpec.brand?.fonts?.body || 'Inter'}. Professional, polished, 4K, no text artifacts.`;
    let baseImage = null;
    try {
      const imgRes = await base44.integrations.Core.GenerateImage({ prompt: imgPrompt });
      baseImage = imgRes?.url || null;
    } catch (e) {
      console.error('image gen failed:', e.message);
    }

    // 4. Persist base pack + accent-color variants
    const created = [];
    const basePack = await base44.asServiceRole.entities.DesignPack.create({
      organization_id: orgId,
      project_id: project_id || null,
      pack_name: baseSpec.pack_name,
      pack_type: 'web_pack',
      image_url: baseImage || '',
      spec: baseSpec,
      status: 'extracted',
      notes: `Template Factory base — ${industry || 'contractor'}${reference_url ? ` · inspired by ${reference_url}` : ''}. Style: ${style_preferences || 'modern'}.`
    });
    created.push({ id: basePack.id, name: baseSpec.pack_name, accent: 'base', image: baseImage });

    for (const a of accentList) {
      const variantSpec = JSON.parse(JSON.stringify(baseSpec));
      variantSpec.pack_name = `${baseSpec.pack_name} — ${a.name} Accent`;
      variantSpec.brand = variantSpec.brand || {};
      variantSpec.brand.colors = variantSpec.brand.colors || {};
      variantSpec.brand.colors.accent = a.color;
      variantSpec.brand.colors.primary = a.color;
      variantSpec.template_factory = { ...(variantSpec.template_factory || {}), base: false, accent_variant: a.name, accent_color: a.color };
      const v = await base44.asServiceRole.entities.DesignPack.create({
        organization_id: orgId,
        project_id: project_id || null,
        pack_name: variantSpec.pack_name,
        pack_type: 'web_pack',
        image_url: baseImage || '',
        spec: variantSpec,
        status: 'extracted',
        notes: `Template Factory color variant (${a.name} ${a.color}) of ${baseSpec.pack_name}.`
      });
      created.push({ id: v.id, name: variantSpec.pack_name, accent: a.name, color: a.color, image: baseImage });
    }

    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId,
        system: 'template_factory',
        action: 'generate',
        status: 'success',
        summary: `Generated ${baseSpec.pack_name} + ${accentList.length} accent variants (${industry || 'contractor'})`,
        evidence: { base_pack_id: basePack.id, variants: created.length - 1, reference_url: reference_url || null }
      });
    } catch (e) {}

    return Response.json({
      status: 'success',
      base_pack_id: basePack.id,
      created,
      message: `${created.length} packs created (1 base + ${accentList.length} accent variants) — visible in /store and /web-packs`
    });
  } catch (error) {
    console.error('generateTemplatePack error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}