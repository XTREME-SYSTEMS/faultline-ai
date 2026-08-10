import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Customization Studio — generates a full set of rebrand options for a
// discovered site: 20 business names, 20 domain suggestions, 20 color
// palettes, and 20 content packs (tagline + about + hero headline + contact).
// Uses two parallel LLM calls for speed.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { site_name, site_url, industry, niche } = body;
    if (!site_name && !site_url) {
      return Response.json({ error: 'site_name or site_url required' }, { status: 400 });
    }

    const ind = industry || niche || 'business';
    const bizRef = site_name || 'the target site';

    // Call 1: Names + Domains
    const namePrompt = `You are a brand strategist. A client wants to clone and rebrand a website in the "${ind}" industry.
The original site is: ${bizRef} (${site_url || 'N/A'})

Generate 20 creative business name suggestions and 20 corresponding domain name suggestions.

NAMES: Mix of descriptive, brandable, and premium names. Short, memorable, easy to spell. Relevant to the ${ind} industry.
DOMAINS: For each name, suggest a .com domain. Also include some alternative domain ideas (with modifiers like "get", "try", "hq", "co") in case the exact name is taken.

Return exactly 20 name/domain pairs.`;

    const nameSchema = {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              domain: { type: 'string' },
              style: { type: 'string', description: 'descriptive, brandable, premium, or playful' },
            },
          },
        },
      },
    };

    // Call 2: Palettes + Content packs
    const designPrompt = `You are a brand designer. Generate 20 distinct professional color palettes and 20 distinct content packs for a ${ind} business.

COLOR PALETTES: 20 visually distinct, professional website color palettes. Each with: name, primary (hex), secondary (hex), accent (hex), background (hex). Cover a range of moods: bold, minimal, warm, luxury, tech, natural, etc. All must be different from each other.

CONTENT PACKS: 20 complete content sets, each with a distinct tone/style. Each set must include:
- tone: a label for the style (e.g. "Professional", "Friendly", "Luxury", "Bold", "Minimal")
- tagline: memorable, 5-10 words
- hero_headline: a powerful main headline for the homepage hero section
- about_text: 2-3 sentences for the about section
- contact: { phone, email, address } with realistic placeholder values

Return exactly 20 palettes and 20 content packs.`;

    const designSchema = {
      type: 'object',
      properties: {
        palettes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              primary: { type: 'string' },
              secondary: { type: 'string' },
              accent: { type: 'string' },
              background: { type: 'string' },
            },
          },
        },
        content_packs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tone: { type: 'string' },
              tagline: { type: 'string' },
              hero_headline: { type: 'string' },
              about_text: { type: 'string' },
              contact: {
                type: 'object',
                properties: {
                  phone: { type: 'string' },
                  email: { type: 'string' },
                  address: { type: 'string' },
                },
              },
            },
          },
        },
      },
    };

    const [nameResult, designResult] = await Promise.all([
      base44.integrations.Core.InvokeLLM({ prompt: namePrompt, response_json_schema: nameSchema }),
      base44.integrations.Core.InvokeLLM({ prompt: designPrompt, response_json_schema: designSchema }),
    ]);

    const nameData = typeof nameResult === 'string' ? JSON.parse(nameResult) : nameResult;
    const designData = typeof designResult === 'string' ? JSON.parse(designResult) : designResult;

    return Response.json({
      status: 'success',
      site_name: bizRef,
      industry: ind,
      names: (nameData.suggestions || []).map((s, i) => ({ id: `name_${i}`, ...s })),
      palettes: (designData.palettes || []).map((p, i) => ({ id: `palette_${i}`, ...p })),
      content_packs: (designData.content_packs || []).map((c, i) => ({ id: `content_${i}`, ...c })),
    });
  } catch (error) {
    console.error('generateCustomizationStudio error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}