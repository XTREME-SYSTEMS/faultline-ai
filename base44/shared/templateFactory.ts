// Shared Template Factory core — used by both the generateTemplatePack
// backend function and the autonomous build cycle. Analyzes a reference
// site (or niche), generates ONE original multi-page web template spec,
// renders a reference image, and produces N accent-color variants as
// DesignPack records. Original designs inspired by public patterns only.

export const DEFAULT_ACCENTS = [
  { name: 'Gold', color: '#C89B3C' },
  { name: 'Crimson', color: '#C41E3A' },
  { name: 'Electric Blue', color: '#0038FF' },
  { name: 'Forest', color: '#2C6E49' },
  { name: 'Safety Orange', color: '#FF5E00' },
  { name: 'Silver', color: '#8A8A8A' }
];

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
            background: { type: 'string' }, primary: { type: 'string' },
            secondary: { type: 'string' }, accent: { type: 'string' },
            text: { type: 'string' }, muted: { type: 'string' }, card: { type: 'string' }
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
          name: { type: 'string' }, purpose: { type: 'string' },
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
        app_name: { type: 'string' }, theme_color: { type: 'string' },
        icons: { type: 'string' }, offline_strategy: { type: 'string' }
      }
    }
  }
};

export async function generateTemplatePackCore(base44, orgId, params) {
  const {
    business_name, industry, description, target_audience, tone,
    style_preferences, reference_url, reference_notes, accents, project_id
  } = params;

  if (!business_name) throw new Error('business_name required');
  const accentList = Array.isArray(accents) && accents.length ? accents : DEFAULT_ACCENTS;

  // 1. Optional reference-site analysis
  let refContext = reference_notes || '';
  if (reference_url) {
    try {
      const refRes = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze the website at ${reference_url} (a ${industry || 'contractor'} site). Describe concisely: (1) layout & section ordering, (2) color palette, (3) typography, (4) hero treatment, (5) key conversion features, (6) what makes it effective. Describe patterns, do not copy content.`,
        add_context_from_internet: true,
        model: 'gemini_3_flash'
      });
      refContext += (refContext ? '\n\n' : '') + (typeof refRes === 'string' ? refRes : JSON.stringify(refRes));
    } catch (e) {
      console.error('reference analysis failed:', e.message);
    }
  }

  // 2. Base template spec
  const specPrompt = `You are a senior brand architect, SEO lead, and PWA engineer. Create a complete, production-grade, FULLY SEO-OPTIMIZED web template for this business. Output a structured spec a code generator can reproduce EXACTLY.

BUSINESS: ${business_name}
INDUSTRY: ${industry || 'General'}
DESCRIPTION: ${description || ''}
TARGET AUDIENCE: ${target_audience || 'general'}
TONE: ${tone || 'professional'}
STYLE: ${style_preferences || 'modern, clean, high-conversion'}
${refContext ? `\nREFERENCE ANALYSIS (build an ORIGINAL design inspired by these patterns — do NOT copy):\n${refContext}` : ''}

Design the web pack with:
1. BRAND — name, style description, EXACT hex palette (background, primary, secondary, accent, text, muted, card), real Google Fonts (heading + body), tone.
2. PAGES — 8-10 pages a high-converting site for this business needs. For each: name, purpose, sections, layout description, components.
3. COMPONENTS — every reusable UI component.
4. LAYOUT_SYSTEM & VISUAL_HIERARCHY.
5. GENERATION_INSTRUCTIONS — exact CSS variables, Google Fonts, pages in order, sections per page, responsive rules.
6. SEO — meta strategy, schema markup (LocalBusiness, Service, FAQPage, BreadcrumbList, ImageObject), target keywords, local SEO.
7. PWA — app name, theme color (use accent), icon strategy, offline strategy.

Premium, cohesive, conversion-optimized, SEO-complete. All hex valid. All fonts real Google Fonts.`;

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
  const imgPrompt = `A premium multi-page website design preview sheet for "${business_name}", a ${industry || 'business'}. ${baseSpec.brand?.style_description || 'Clean, modern, high-end'}. Show nav, hero, feature cards, gallery, and footer using background ${c.background || '#fff'}, primary ${c.primary || '#111'}, accent ${c.accent || '#C89B3C'}. Headings: ${baseSpec.brand?.fonts?.heading || 'Inter'}. Body: ${baseSpec.brand?.fonts?.body || 'Inter'}. Professional, polished, 4K, no text artifacts.`;
  let baseImage = null;
  try {
    const imgRes = await base44.integrations.Core.GenerateImage({ prompt: imgPrompt });
    baseImage = imgRes?.url || null;
  } catch (e) {
    console.error('image gen failed:', e.message);
  }

  // 4. Persist base + accent variants
  const created = [];
  const basePack = await base44.asServiceRole.entities.DesignPack.create({
    organization_id: orgId,
    project_id: project_id || null,
    pack_name: baseSpec.pack_name,
    pack_type: 'web_pack',
    image_url: baseImage || '',
    spec: baseSpec,
    status: 'extracted',
    notes: `Template Factory base — ${industry || 'general'}${reference_url ? ` · inspired by ${reference_url}` : ''}. Style: ${style_preferences || 'modern'}.`
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
      summary: `Generated ${baseSpec.pack_name} + ${accentList.length} accent variants (${industry || 'general'})`,
      evidence: { base_pack_id: basePack.id, variants: created.length - 1, reference_url: reference_url || null }
    });
  } catch (e) {}

  return {
    base_pack_id: basePack.id,
    created,
    baseSpec,
    baseImage,
    message: `${created.length} packs created (1 base + ${accentList.length} accent variants)`
  };
}