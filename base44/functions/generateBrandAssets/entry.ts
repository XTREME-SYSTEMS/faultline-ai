import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { resolvePrompt } from '../../shared/promptLibrary.ts';

// Brand Assets Generator — produces 6 options per run for:
//   - logo:      6 logo image variations
//   - brand:     6 complete brand identity options (name, tagline, colors, fonts, positioning) + logo image
//   - image:     6 ultra-lifelike photorealistic image variations
// All results are saved as Artifacts and linked to an optional project.

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

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { type, prompt, business_name, industry, project_id, domain, brand_concept, accent_color } = body;

    if (!type) return Response.json({ error: 'type is required (logo, brand, or image)' }, { status: 400 });
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
        index: i,
        style: r.style,
        image_url: r.url,
        label: ['Minimalist', 'Monogram', 'Emblem', 'Abstract', 'Wordmark', 'Icon'][i] || `Option ${i + 1}`
      }));

      const artifact = await base44.asServiceRole.entities.Artifact.create({
        organization_id: orgId,
        project_id: project_id || '',
        name: `Logos — ${bizName}`,
        artifact_type: 'brand',
        content: JSON.stringify({ type: 'logo', business_name: bizName, industry: ind, options }),
        status: 'generated',
        metadata: { type: 'logo', business_name: bizName, industry: ind, option_count: 6 }
      });

      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'brand_generator', action: 'generate_logo',
        status: 'success', summary: `Generated 6 logo options for ${bizName}`,
        evidence: { artifact_id: artifact.id, option_count: 6 }
      });

      return Response.json({ status: 'success', type: 'logo', options, artifact_id: artifact.id });
    }

    // ── BRAND: 6 complete identity options + logo images ───────
    if (type === 'brand') {
      // Step 1: Generate 6 brand identity concepts via LLM (prompt from library)
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
- font_heading: a Google Font name for headings
- font_body: a Google Font name for body text
- voice: brand voice description (2-3 words)
- logo_concept: a detailed visual description of the logo concept (used for AI image generation)

Make each concept visually and tonally distinct. Use real, specific color hex codes and real Google Font names. ALL concepts must use the business name "${bizName}".`;
      const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: brandPrompt,
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

      // Step 2: Generate a logo image for each brand concept (10 in parallel)
      const logoPromises = brandOptions.map((opt, i) =>
        base44.asServiceRole.integrations.Core.GenerateImage({
          prompt: `Professional logo for "${opt.name}", a ${ind} business. Domain: ${domain || 'N/A'}. ${opt.logo_concept}. Colors: ${opt.primary_color}, ${opt.secondary_color}, ${opt.accent_color}. Clean, brand-ready, high quality, no watermark, no text artifacts.`
        }).then(res => ({ ...opt, index: i, logo_url: res?.url || res?.image_url || res }))
          .catch(err => ({ ...opt, index: i, logo_url: null, logo_error: err.message }))
      );
      const optionsWithLogos = await Promise.all(logoPromises);

      const artifact = await base44.asServiceRole.entities.Artifact.create({
        organization_id: orgId,
        project_id: project_id || '',
        name: `Brand Identities — ${bizName}`,
        artifact_type: 'brand',
        content: JSON.stringify({ type: 'brand', business_name: bizName, industry: ind, options: optionsWithLogos }),
        status: 'generated',
        metadata: { type: 'brand', business_name: bizName, industry: ind, option_count: 10 }
      });

      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'brand_generator', action: 'generate_brand',
        status: 'success', summary: `Generated 10 brand identity options for ${bizName}`,
        evidence: { artifact_id: artifact.id, option_count: 10 }
      });

      return Response.json({ status: 'success', type: 'brand', options: optionsWithLogos, artifact_id: artifact.id });
    }

    // ── FULL_KIT: complete design kit for a selected brand ───
    if (type === 'full_kit') {
      if (!brand_concept) return Response.json({ error: 'brand_concept is required' }, { status: 400 });
      const concept = brand_concept;
      const ac = accent_color || concept.accent_color;
      const colors = `${concept.primary_color}, ${concept.secondary_color}, ${ac}`;
      const fonts = `Heading font: ${concept.font_heading}, Body font: ${concept.font_body}`;
      const tagline = concept.tagline || '';

      const kitItems = [
        { key: 'logo', label: 'Primary Logo', prompt: `Professional logo for "${bizName}", a ${ind} business. Domain: ${domain || 'N/A'}. ${concept.logo_concept}. Colors: ${colors}. Clean, brand-ready, high quality, no watermark.` },
        { key: 'logo_dark', label: 'Logo (Dark BG)', prompt: `Professional logo for "${bizName}" on dark background. ${concept.logo_concept}. Colors: ${colors}. Clean, brand-ready, high quality, no watermark.` },
        { key: 'website', label: 'Website Homepage', prompt: `Website homepage design for "${bizName}", a ${ind} business. Domain: ${domain || 'N/A'}. Modern professional landing page with hero section, navigation, services, call-to-action, and footer. Tagline: "${tagline}". Colors: ${colors}. ${fonts}. High quality UI design, no watermark.` },
        { key: 'tshirt', label: 'T-Shirt Design', prompt: `T-shirt design for "${bizName}" brand. ${concept.logo_concept}. Front chest logo placement on premium apparel. Colors: ${colors}. Professional apparel mockup, high quality, no watermark.` },
        { key: 'brochure', label: 'Brochure Design', prompt: `Tri-fold brochure design for "${bizName}", a ${ind} business. Professional layout with services, about, contact info, and branding. Tagline: "${tagline}". Colors: ${colors}. ${fonts}. High quality print design, no watermark.` },
        { key: 'app', label: 'App Design', prompt: `Mobile app home screen design for "${bizName}", a ${ind} business. Modern app UI with navigation, cards, and branding. Colors: ${colors}. ${fonts}. High quality UI design, no watermark.` },
        { key: 'favicon', label: 'Favicon', prompt: `Favicon icon for "${bizName}". Simple, recognizable mark derived from the logo concept. ${concept.logo_concept}. Colors: ${colors}. Clean, scalable, high quality, no watermark.` },
        { key: 'icon', label: 'App Icon', prompt: `App icon for "${bizName}", a ${ind} business. ${concept.logo_concept}. Rounded square format. Colors: ${colors}. Clean, modern, high quality, no watermark.` },
        { key: 'hat', label: 'Hat Design', prompt: `Embroidered hat design for "${bizName}" brand. ${concept.logo_concept} embroidered on a baseball cap. Colors: ${colors}. Professional apparel mockup, high quality, no watermark.` },
        { key: 'business_card', label: 'Business Card', prompt: `Business card design for "${bizName}", a ${ind} business. Domain: ${domain || 'N/A'}. Front and back layout with logo, contact info, and branding. Colors: ${colors}. ${fonts}. High quality print design, no watermark.` },
        { key: 'brand_guidelines', label: 'Brand Guidelines', prompt: `Brand guidelines sheet for "${bizName}". Color palette swatches (${colors}), typography (${fonts}), logo usage examples, and tagline "${tagline}". Professional layout, high quality, no watermark.` },
        { key: 'social_pack', label: 'Social Media Pack', prompt: `Social media profile and cover design pack for "${bizName}", a ${ind} business. Domain: ${domain || 'N/A'}. Profile picture, cover banner, and post template. Colors: ${colors}. ${fonts}. High quality, no watermark.` },
      ];

      const imagePromises = kitItems.map((item, i) =>
        base44.asServiceRole.integrations.Core.GenerateImage({ prompt: item.prompt })
          .then(res => ({ ...item, index: i, image_url: res?.url || res?.image_url || res }))
          .catch(err => ({ ...item, index: i, image_url: null, error: err.message }))
      );
      const kitResults = await Promise.all(imagePromises);

      const artifact = await base44.asServiceRole.entities.Artifact.create({
        organization_id: orgId,
        project_id: project_id || '',
        name: `Full Brand Kit — ${bizName}`,
        artifact_type: 'brand',
        content: JSON.stringify({ type: 'full_kit', business_name: bizName, domain, industry: ind, brand_concept: concept, accent_color: ac, kit: kitResults }),
        status: 'generated',
        metadata: { type: 'full_kit', business_name: bizName, industry: ind, item_count: kitResults.length }
      });

      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'brand_generator', action: 'generate_full_kit',
        status: 'success', summary: `Generated full brand kit (${kitResults.length} assets) for ${bizName}`,
        evidence: { artifact_id: artifact.id, item_count: kitResults.length }
      });

      return Response.json({ status: 'success', type: 'full_kit', kit: kitResults, brand_concept: concept, accent_color: ac, artifact_id: artifact.id });
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
        index: i,
        style: r.style,
        image_url: r.url,
        label: ['Cinematic', 'Studio', 'Dramatic', 'Lifestyle', 'Architectural', 'Macro'][i] || `Option ${i + 1}`
      }));

      const artifact = await base44.asServiceRole.entities.Artifact.create({
        organization_id: orgId,
        project_id: project_id || '',
        name: `Images — ${subject.substring(0, 40)}`,
        artifact_type: 'brand',
        content: JSON.stringify({ type: 'image', prompt: subject, industry: ind, options }),
        status: 'generated',
        metadata: { type: 'image', prompt: subject, industry: ind, option_count: 6 }
      });

      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'brand_generator', action: 'generate_image',
        status: 'success', summary: `Generated 6 ultra-lifelike images for: ${subject.substring(0, 60)}`,
        evidence: { artifact_id: artifact.id, option_count: 6 }
      });

      return Response.json({ status: 'success', type: 'image', options, artifact_id: artifact.id });
    }

    return Response.json({ error: 'Invalid type. Use logo, brand, or image.' }, { status: 400 });
  } catch (error) {
    console.error('generateBrandAssets error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}