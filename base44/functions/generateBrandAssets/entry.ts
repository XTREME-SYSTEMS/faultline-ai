import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Brand Assets Generator — produces options for:
//   - logo:      6 logo image variations
//   - brand:     10 complete brand identity options (name, tagline, colors, fonts, positioning) + logo image
//   - full_kit:  32 production-ready assets (supports batching for real progress)
//   - kit_item:  regenerate a single kit asset
//   - image:     6 ultra-lifelike photorealistic image variations

const LOGO_STYLES = [
  'minimalist geometric mark, clean lines, flat vector style, centered on white',
  'modern monogram lettermark, bold sans-serif, negative space, premium feel',
  'elegant emblem badge, circular seal, refined serif, luxury heritage feel',
  'abstract organic shape, flowing gradient, contemporary tech startup aesthetic',
  'bold wordmark typography logo, strong character, high contrast, corporate',
  'playful mascot-inspired icon, friendly rounded forms, approachable and warm'
];

const IMAGE_STYLES = [
  'cinematic lighting, golden hour, shallow depth of field, ultra-realistic, 8k, professional photography',
  'studio softbox lighting, clean white background, product photography, hyper-detailed, sharp focus',
  'dramatic moody lighting, dark background, rim light, editorial magazine style, photorealistic',
  'bright airy natural light, outdoor setting, lifestyle photography, vibrant colors, lifelike',
  'architectural interior lighting, wide angle, professional real estate photography, ultra-detailed',
  'macro close-up, intricate detail, texture-rich, scientific precision, photorealistic 8k'
];

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 50);
}

// Build the 32 kit item definitions — shared by full_kit and kit_item
function buildKitItems(bizName, ind, domain, concept, ac, bg, fc, colors, fonts, tagline) {
  return [
    // ── Logo System (9) ──
    { key: 'logo_primary', label: 'Primary Logo', category: 'Logo System', prompt: `Professional primary logo for "${bizName}", a ${ind} business. Domain: ${domain || 'N/A'}. ${concept.logo_concept}. Colors: ${colors}. Clean, brand-ready, high quality, no watermark.` },
    { key: 'logo_stacked', label: 'Stacked Logo (Vertical)', category: 'Logo System', prompt: `Stacked vertical logo lockup for "${bizName}". ${concept.logo_concept} arranged vertically with icon on top and wordmark below. Colors: ${colors}. Clean, brand-ready, high quality, no watermark.` },
    { key: 'logo_horizontal', label: 'Horizontal Lockup', category: 'Logo System', prompt: `Horizontal logo lockup for "${bizName}". ${concept.logo_concept} arranged horizontally with icon left and wordmark right. Colors: ${colors}. Clean, brand-ready, high quality, no watermark.` },
    { key: 'logo_icon', label: 'Icon / Symbol Only', category: 'Logo System', prompt: `Icon-only version of the logo for "${bizName}". Just the symbol/mark from ${concept.logo_concept}, no text. Colors: ${colors}. Clean, brand-ready, high quality, no watermark.` },
    { key: 'logo_wordmark', label: 'Wordmark Only', category: 'Logo System', prompt: `Wordmark-only logo for "${bizName}". Just the text "${bizName}" in ${concept.font_heading || 'a premium font'}, no icon. Colors: ${colors}. Clean, brand-ready, high quality, no watermark.` },
    { key: 'logo_white', label: 'Logo (White / Dark BG)', category: 'Logo System', prompt: `All-white version of the logo for "${bizName}" on a dark background. ${concept.logo_concept} rendered in white only. Clean, brand-ready, high quality, no watermark.` },
    { key: 'logo_black', label: 'Logo (Black / Grayscale)', category: 'Logo System', prompt: `Black/grayscale version of the logo for "${bizName}". ${concept.logo_concept} rendered in black and grayscale only. Clean, brand-ready, high quality, no watermark.` },
    { key: 'favicon', label: 'Favicon', category: 'Logo System', prompt: `Favicon icon for "${bizName}". Simple, recognizable mark derived from the logo concept. ${concept.logo_concept}. Colors: ${colors}. 16x16 scalable, clean, high quality, no watermark.` },
    { key: 'app_icon', label: 'App Icon', category: 'Logo System', prompt: `App icon for "${bizName}", a ${ind} business. ${concept.logo_concept}. Rounded square format, iOS app icon style. Colors: ${colors}. Clean, modern, high quality, no watermark.` },
    // ── Digital Touchpoints (10) ──
    { key: 'website', label: 'Website Homepage', category: 'Digital', prompt: `Website homepage design for "${bizName}", a ${ind} business. Domain: ${domain || 'N/A'}. Modern professional landing page with hero section, navigation, services grid, call-to-action, testimonials, and footer. Tagline: "${tagline}". Colors: ${colors}. ${fonts}. High quality UI design, no watermark.` },
    { key: 'app_design', label: 'App Design', category: 'Digital', prompt: `Mobile app home screen design for "${bizName}", a ${ind} business. Modern app UI with bottom navigation, content cards, search bar, and branding. Colors: ${colors}. ${fonts}. High quality UI design, no watermark.` },
    { key: 'website_dark', label: 'Website (Dark Mode)', category: 'Digital', prompt: `Website homepage design for "${bizName}", a ${ind} business, in DARK MODE. Domain: ${domain || 'N/A'}. Dark background, light text, same layout and structure as the light version but with a dark theme. Tagline: "${tagline}". Accent color: ${ac}. ${fonts}. High quality UI design, no watermark.` },
    { key: 'app_dark', label: 'App (Dark Mode)', category: 'Digital', prompt: `Mobile app home screen design for "${bizName}", a ${ind} business, in DARK MODE. Dark background, light text, modern app UI with bottom navigation, content cards, search bar, and branding. Accent color: ${ac}. ${fonts}. High quality UI design, no watermark.` },
    { key: 'social_profile', label: 'Social Profile Picture', category: 'Digital', prompt: `Social media profile picture for "${bizName}". Circular profile avatar with the logo icon. ${concept.logo_concept}. Colors: ${colors}. Clean, high quality, no watermark.` },
    { key: 'social_cover', label: 'Social Cover Banner', category: 'Digital', prompt: `Social media cover banner for "${bizName}", a ${ind} business. Domain: ${domain || 'N/A'}. Wide cover image with logo, tagline "${tagline}", and brand colors. Colors: ${colors}. ${fonts}. High quality, no watermark.` },
    { key: 'social_post', label: 'Social Post Template', category: 'Digital', prompt: `Social media post template for "${bizName}", a ${ind} business. Square post with logo, brand colors, and placeholder text area. Tagline: "${tagline}". Colors: ${colors}. ${fonts}. High quality, no watermark.` },
    { key: 'email_signature', label: 'Email Signature', category: 'Digital', prompt: `Professional email signature design for "${bizName}", a ${ind} business. Domain: ${domain || 'N/A'}. Includes logo, name, title, phone, email, website. Colors: ${colors}. ${fonts}. Clean layout, high quality, no watermark.` },
    { key: 'email_newsletter', label: 'Email Newsletter', category: 'Digital', prompt: `Email newsletter template design for "${bizName}", a ${ind} business. Header with logo, article sections, call-to-action button, and footer. Colors: ${colors}. ${fonts}. High quality, no watermark.` },
    { key: 'presentation', label: 'Presentation Template', category: 'Digital', prompt: `Presentation slide template for "${bizName}", a ${ind} business. Title slide with logo, tagline "${tagline}", and brand colors. Colors: ${colors}. ${fonts}. High quality, no watermark.` },
    // ── Print Touchpoints (6) ──
    { key: 'business_card', label: 'Business Card', category: 'Print', prompt: `Business card design for "${bizName}", a ${ind} business. Domain: ${domain || 'N/A'}. Front and back layout with logo, name, title, phone, email, and website. Colors: ${colors}. ${fonts}. High quality print design, no watermark.` },
    { key: 'letterhead', label: 'Letterhead', category: 'Print', prompt: `Letterhead design for "${bizName}", a ${ind} business. Domain: ${domain || 'N/A'}. Professional letterhead with logo at top, address footer, and clean body area. Colors: ${colors}. ${fonts}. High quality print design, no watermark.` },
    { key: 'invoice', label: 'Invoice Template', category: 'Print', prompt: `Invoice template design for "${bizName}", a ${ind} business. Domain: ${domain || 'N/A'}. Professional invoice with logo header, line items table, totals, and payment info. Colors: ${colors}. ${fonts}. High quality, no watermark.` },
    { key: 'flyer', label: 'Flyer', category: 'Print', prompt: `Promotional flyer design for "${bizName}", a ${ind} business. Eye-catching flyer with logo, headline, services, contact info, and call-to-action. Tagline: "${tagline}". Colors: ${colors}. ${fonts}. High quality print design, no watermark.` },
    { key: 'brochure', label: 'Tri-fold Brochure', category: 'Print', prompt: `Tri-fold brochure design for "${bizName}", a ${ind} business. Professional 6-panel layout with cover, services, about, testimonials, contact info, and branding. Tagline: "${tagline}". Colors: ${colors}. ${fonts}. High quality print design, no watermark.` },
    { key: 'poster', label: 'Poster', category: 'Print', prompt: `Promotional poster design for "${bizName}", a ${ind} business. Bold poster with large logo, headline, key services, and contact info. Tagline: "${tagline}". Colors: ${colors}. ${fonts}. High quality print design, no watermark.` },
    // ── Merchandise (5) ──
    { key: 'tshirt', label: 'T-Shirt Design', category: 'Merchandise', prompt: `T-shirt design for "${bizName}" brand. ${concept.logo_concept}. Front chest logo placement on a premium t-shirt mockup. Colors: ${colors}. Professional apparel mockup, high quality, no watermark.` },
    { key: 'hat', label: 'Hat Design', category: 'Merchandise', prompt: `Embroidered hat design for "${bizName}" brand. ${concept.logo_concept} embroidered on the front of a baseball cap. Colors: ${colors}. Professional apparel mockup, high quality, no watermark.` },
    { key: 'mug', label: 'Mug Design', category: 'Merchandise', prompt: `Branded coffee mug design for "${bizName}" brand. ${concept.logo_concept} printed on a ceramic mug. Colors: ${colors}. Professional product mockup, high quality, no watermark.` },
    { key: 'sticker', label: 'Sticker', category: 'Merchandise', prompt: `Branded sticker design for "${bizName}" brand. ${concept.logo_concept} as a die-cut sticker. Colors: ${colors}. Clean, modern, high quality, no watermark.` },
    { key: 'tote_bag', label: 'Tote Bag', category: 'Merchandise', prompt: `Branded tote bag design for "${bizName}" brand. ${concept.logo_concept} printed on a canvas tote bag. Colors: ${colors}. Professional product mockup, high quality, no watermark.` },
    // ── Brand Guidelines (2) ──
    { key: 'brand_guidelines', label: 'Brand Guidelines Sheet', category: 'Guidelines', prompt: `Brand guidelines sheet for "${bizName}", a ${ind} business. Include: logo usage rules, color palette swatches with hex codes (${colors}), typography pairing (${fonts}), tagline "${tagline}", do's and don'ts, and clear space rules. Professional layout, high quality, no watermark.` },
    { key: 'color_palette', label: 'Color Palette Sheet', category: 'Guidelines', prompt: `Color palette specification sheet for "${bizName}". Show primary color ${concept.primary_color}, secondary color ${concept.secondary_color}, and accent color ${ac} as large swatches with HEX, RGB, and CMYK values labeled. Professional design reference, high quality, no watermark.` },
  ];
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { type, prompt, business_name, industry, project_id, domain, brand_concept, accent_color, background_color, font_color } = body;

    if (!type) return Response.json({ error: 'type is required (logo, brand, full_kit, kit_item, or image)' }, { status: 400 });
    if (!prompt && !business_name) return Response.json({ error: 'prompt or business_name is required' }, { status: 400 });

    const subject = prompt || business_name;
    const bizName = business_name || subject.substring(0, 40);
    const ind = industry || 'General';

    // ── LOGO: 6 image variations ───────────────────────────────
    if (type === 'logo') {
      const imagePromises = LOGO_STYLES.map((style, i) =>
        base44.asServiceRole.integrations.Core.GenerateImage({
          prompt: `Professional logo for "${bizName}", a ${ind} business. ${style}. High quality, scalable, brand-ready, no watermark, no text artifacts.`
        }).then(res => ({ index: i, style, url: res?.url || res?.image_url || res }))
          .catch(err => ({ index: i, style, url: null, error: err.message }))
      );
      const results = await Promise.all(imagePromises);
      const options = results.map((r, i) => ({
        index: i, style: r.style, image_url: r.url,
        label: ['Minimalist', 'Monogram', 'Emblem', 'Abstract', 'Wordmark', 'Icon'][i] || `Option ${i + 1}`
      }));
      const artifact = await base44.asServiceRole.entities.Artifact.create({
        organization_id: orgId, project_id: project_id || '', name: `Logos — ${bizName}`,
        artifact_type: 'brand', content: JSON.stringify({ type: 'logo', business_name: bizName, industry: ind, options }),
        status: 'generated', metadata: { type: 'logo', business_name: bizName, industry: ind, option_count: 6 }
      });
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'brand_generator', action: 'generate_logo',
        status: 'success', summary: `Generated 6 logo options for ${bizName}`,
        evidence: { artifact_id: artifact.id, option_count: 6 }
      });
      return Response.json({ status: 'success', type: 'logo', options, artifact_id: artifact.id });
    }

    // ── BRAND: 10 complete identity options + logo images ───────
    if (type === 'brand') {
      const brandPrompt = `You are an elite brand strategist. Generate 10 DISTINCT, complete brand identity concepts for a business.

BUSINESS NAME: ${bizName} (use this EXACT name — do NOT invent new business names)
DOMAIN: ${domain || 'N/A'}
INDUSTRY: ${ind}
DESCRIPTION: ${subject}

Return a JSON object with an "options" array of 10 items. Each item must have:
- name: the brand name (use "${bizName}" — you may add a stylistic suffix like "Co.", "Group", "Studio" but the core name MUST be "${bizName}")
- tagline: a memorable tagline (max 8 words)
- positioning: one-sentence positioning statement
- personality: 3 personality traits
- primary_color: hex color code
- secondary_color: hex color code
- accent_color: hex color code
- bg_color: hex color for backgrounds (light, clean)
- font_color: hex color for text (dark, readable on bg_color)
- font_heading: a Google Font name for headings
- font_body: a Google Font name for body text
- voice: brand voice description (2-3 words)
- logo_concept: a detailed visual description of the logo concept (used for AI image generation)

Research real competitors and brands in the ${ind} industry to ensure each concept is distinctive, professional, and avoids cliché or generic approaches. Make each concept visually and tonally distinct. Use real, specific color hex codes and real Google Font names. ALL concepts must use the business name "${bizName}".`;

      // Using gemini_3_1_pro with web search to pull real competitor branding context
      const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: brandPrompt,
        model: 'gemini_3_1_pro',
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            options: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  tagline: { type: 'string' },
                  positioning: { type: 'string' },
                  personality: { type: 'array', items: { type: 'string' } },
                  primary_color: { type: 'string' },
                  secondary_color: { type: 'string' },
                  accent_color: { type: 'string' },
                  bg_color: { type: 'string' },
                  font_color: { type: 'string' },
                  font_heading: { type: 'string' },
                  font_body: { type: 'string' },
                  voice: { type: 'string' },
                  logo_concept: { type: 'string' }
                }
              }
            }
          }
        }
      });

      const brandOptions = (llmRes?.options || []).slice(0, 10);

      const logoPromises = brandOptions.map((opt, i) =>
        base44.asServiceRole.integrations.Core.GenerateImage({
          prompt: `Professional logo for "${opt.name}", a ${ind} business. Domain: ${domain || 'N/A'}. ${opt.logo_concept}. Colors: ${opt.primary_color}, ${opt.secondary_color}, ${opt.accent_color}. Clean, brand-ready, high quality, no watermark, no text artifacts.`
        }).then(res => ({ ...opt, index: i, logo_url: res?.url || res?.image_url || res }))
          .catch(err => ({ ...opt, index: i, logo_url: null, logo_error: err.message }))
      );
      const optionsWithLogos = await Promise.all(logoPromises);

      const artifact = await base44.asServiceRole.entities.Artifact.create({
        organization_id: orgId, project_id: project_id || '', name: `Brand Identities — ${bizName}`,
        artifact_type: 'brand', content: JSON.stringify({ type: 'brand', business_name: bizName, industry: ind, options: optionsWithLogos }),
        status: 'generated', metadata: { type: 'brand', business_name: bizName, industry: ind, option_count: 10 }
      });
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'brand_generator', action: 'generate_brand',
        status: 'success', summary: `Generated 10 brand identity options for ${bizName}`,
        evidence: { artifact_id: artifact.id, option_count: 10 }
      });
      return Response.json({ status: 'success', type: 'brand', options: optionsWithLogos, artifact_id: artifact.id });
    }

    // ── FULL_KIT: complete design kit (supports batching) ───
    if (type === 'full_kit') {
      if (!brand_concept) return Response.json({ error: 'brand_concept is required' }, { status: 400 });
      const concept = brand_concept;
      const ac = accent_color || concept.accent_color;
      const bg = background_color || concept.bg_color || '#ffffff';
      const fc = font_color || concept.font_color || concept.primary_color || '#0a0a0a';
      const colors = `background ${bg}, text ${fc}, accent ${ac}, primary ${concept.primary_color}, secondary ${concept.secondary_color}`;
      const fonts = `Heading font: ${concept.font_heading}, Body font: ${concept.font_body}`;
      const tagline = concept.tagline || '';

      const kitItems = buildKitItems(bizName, ind, domain, concept, ac, bg, fc, colors, fonts, tagline);

      // Batch support — frontend calls in batches of 5 for real progress
      const batch_start = body.batch_start || 0;
      const batch_count = body.batch_count;
      const is_batch = body.is_batch || false;
      const itemsToGenerate = batch_count ? kitItems.slice(batch_start, batch_start + batch_count) : kitItems;

      const imagePromises = itemsToGenerate.map((item, i) =>
        base44.asServiceRole.integrations.Core.GenerateImage({ prompt: item.prompt })
          .then(res => ({ ...item, index: batch_start + i, image_url: res?.url || res?.image_url || res }))
          .catch(err => ({ ...item, index: batch_start + i, image_url: null, error: err.message }))
      );
      const kitResults = await Promise.all(imagePromises);

      // For batch calls, return immediately without creating artifact
      if (is_batch) {
        return Response.json({ status: 'success', type: 'full_kit', kit: kitResults, total_items: kitItems.length, batch_start, batch_count: itemsToGenerate.length });
      }

      const artifact = await base44.asServiceRole.entities.Artifact.create({
        organization_id: orgId, project_id: project_id || '', name: `Full Brand Kit — ${bizName}`,
        artifact_type: 'brand', content: JSON.stringify({ type: 'full_kit', business_name: bizName, domain, industry: ind, brand_concept: concept, accent_color: ac, background_color: bg, font_color: fc, kit: kitResults }),
        status: 'generated', metadata: { type: 'full_kit', business_name: bizName, industry: ind, item_count: kitResults.length }
      });
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'brand_generator', action: 'generate_full_kit',
        status: 'success', summary: `Generated full brand kit (${kitResults.length} assets) for ${bizName}`,
        evidence: { artifact_id: artifact.id, item_count: kitResults.length }
      });
      return Response.json({ status: 'success', type: 'full_kit', kit: kitResults, total_items: kitItems.length, brand_concept: concept, accent_color: ac, artifact_id: artifact.id });
    }

    // ── KIT_ITEM: regenerate a single kit asset ───────────────
    if (type === 'kit_item') {
      if (!brand_concept) return Response.json({ error: 'brand_concept is required' }, { status: 400 });
      const concept = brand_concept;
      const ac = accent_color || concept.accent_color;
      const bg = background_color || concept.bg_color || '#ffffff';
      const fc = font_color || concept.font_color || concept.primary_color || '#0a0a0a';
      const colors = `background ${bg}, text ${fc}, accent ${ac}, primary ${concept.primary_color}, secondary ${concept.secondary_color}`;
      const fonts = `Heading font: ${concept.font_heading}, Body font: ${concept.font_body}`;
      const tagline = concept.tagline || '';
      const { item_key } = body;
      if (!item_key) return Response.json({ error: 'item_key is required' }, { status: 400 });

      const allItems = buildKitItems(bizName, ind, domain, concept, ac, bg, fc, colors, fonts, tagline);
      const item = allItems.find(i => i.key === item_key);
      if (!item) return Response.json({ error: `Item "${item_key}" not found` }, { status: 400 });

      const res = await base44.asServiceRole.integrations.Core.GenerateImage({ prompt: item.prompt })
        .catch(err => ({ url: null, error: err.message }));
      const image_url = res?.url || res?.image_url || res;
      return Response.json({ status: 'success', item: { ...item, image_url } });
    }

    // ── IMAGE: 6 ultra-lifelike photorealistic variations ──────
    if (type === 'image') {
      const imagePromises = IMAGE_STYLES.map((style, i) =>
        base44.asServiceRole.integrations.Core.GenerateImage({
          prompt: `${subject}. ${style}. Ultra-lifelike, photorealistic, hyper-detailed, professional quality, no watermark, no text.`
        }).then(res => ({ index: i, style, url: res?.url || res?.image_url || res }))
          .catch(err => ({ index: i, style, url: null, error: err.message }))
      );
      const results = await Promise.all(imagePromises);
      const options = results.map((r, i) => ({
        index: i, style: r.style, image_url: r.url,
        label: ['Cinematic', 'Studio', 'Dramatic', 'Lifestyle', 'Architectural', 'Macro'][i] || `Option ${i + 1}`
      }));
      const artifact = await base44.asServiceRole.entities.Artifact.create({
        organization_id: orgId, project_id: project_id || '', name: `Images — ${subject.substring(0, 40)}`,
        artifact_type: 'brand', content: JSON.stringify({ type: 'image', prompt: subject, industry: ind, options }),
        status: 'generated', metadata: { type: 'image', prompt: subject, industry: ind, option_count: 6 }
      });
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'brand_generator', action: 'generate_image',
        status: 'success', summary: `Generated 6 ultra-lifelike images for: ${subject.substring(0, 60)}`,
        evidence: { artifact_id: artifact.id, option_count: 6 }
      });
      return Response.json({ status: 'success', type: 'image', options, artifact_id: artifact.id });
    }

    return Response.json({ error: 'Invalid type. Use logo, brand, full_kit, kit_item, or image.' }, { status: 400 });
  } catch (error) {
    console.error('generateBrandAssets error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}