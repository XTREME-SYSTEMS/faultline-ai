import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// generateClientPacks — AI-driven pack generation from discovery questionnaire answers.
//
// Takes the client's questionnaire responses and generates:
//   1. Three logo concepts (via GenerateImage, parallel)
//   2. Three brand pack options with colors + fonts (via InvokeLLM)
//   3. Website copy (hero, about, services, CTA) (via InvokeLLM)
//
// Called after the user completes the discovery questionnaire.

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { questionnaire_answers } = body;

    if (!questionnaire_answers || !questionnaire_answers.business_name) {
      return Response.json({ error: 'questionnaire_answers.business_name is required' }, { status: 400 });
    }

    const {
      business_name, industry, service_area, primary_service,
      years_in_business, target_customer, style_preference, color_preference,
      differentiator, competitor_urls, preferred_font, service_offering
    } = questionnaire_answers;

    const styleMap: Record<string, string> = {
      modern: 'modern minimalist with clean lines',
      classic: 'classic elegant with timeless appeal',
      bold: 'bold industrial with strong impact',
      minimal: 'clean minimal with lots of whitespace',
      industrial: 'industrial rugged with raw textures',
      premium: 'premium luxury with refined details'
    };
    const styleDesc = styleMap[style_preference] || 'professional and clean';

    // ─── 1. GENERATE BRAND PACKS + COPY VIA LLM ───────────────────
    console.log(`[generateClientPacks] Generating brand packs + copy for ${business_name}`);

    const llmPrompt = `You are a brand strategist and copywriter for contractor businesses.
Based on these discovery answers, generate 3 distinct brand pack options and website copy.

BUSINESS: ${business_name}
INDUSTRY: ${industry || primary_service || 'Epoxy Flooring'}
SERVICE AREA: ${service_area || 'Not specified'}
PRIMARY SERVICE: ${primary_service || 'Epoxy Flooring'}
YEARS IN BUSINESS: ${years_in_business || 'Not specified'}
TARGET CUSTOMER: ${target_customer || 'Homeowners and businesses'}
STYLE PREFERENCE: ${style_preference || 'modern'}
COLOR PREFERENCE: ${color_preference || 'warm tones'}
DIFFERENTIATOR: ${differentiator || 'Quality workmanship and reliable service'}
COMPETITORS: ${competitor_urls || 'None specified'}

Generate exactly 3 brand pack options. Each must have:
- name: A short evocative name (e.g., "Bold Industrial", "Clean Modern", "Classic Premium")
- colors: { primary (hex), secondary (hex), accent (hex) } — distinct palettes, not all the same
- fonts: { heading (a Google Font name), body (a Google Font name) }
- description: One sentence explaining the vibe

Also generate website copy:
- hero_headline: A punchy 5-8 word headline
- about_text: 2-3 sentences about the business
- services_list: 4-6 comma-separated services
- cta_text: A 3-4 word call-to-action

Return ONLY valid JSON matching the schema.`;

    const llmRes = await base44.integrations.Core.InvokeLLM({
      prompt: llmPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          brand_packs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                colors: {
                  type: 'object',
                  properties: {
                    primary: { type: 'string' },
                    secondary: { type: 'string' },
                    accent: { type: 'string' }
                  }
                },
                fonts: {
                  type: 'object',
                  properties: {
                    heading: { type: 'string' },
                    body: { type: 'string' }
                  }
                },
                description: { type: 'string' }
              }
            }
          },
          copy: {
            type: 'object',
            properties: {
              hero_headline: { type: 'string' },
              about_text: { type: 'string' },
              services_list: { type: 'string' },
              cta_text: { type: 'string' }
            }
          }
        }
      }
    });

    const brand_packs = (llmRes as any)?.brand_packs || [];
    const copy = (llmRes as any)?.copy || {};

    // ─── 2. GENERATE 3 LOGO CONCEPTS IN PARALLEL ───────────────────
    console.log(`[generateClientPacks] Generating 3 logo concepts`);

    const colorDesc = color_preference || 'warm gold and dark tones';
    const logoPrompts = [
      `Professional logo for "${business_name}", a ${industry || primary_service || 'epoxy flooring'} company. Style: ${styleDesc}. Colors: ${colorDesc}. Simple, iconic, vector-style logo centered on a clean white background. No text below the logo.`,
      `Alternative professional logo for "${business_name}", ${industry || primary_service || 'epoxy flooring'}. Different ${styleDesc} approach with unique geometric element. Colors: ${colorDesc}. Clean vector logo centered on white background. No text below.`,
      `Third logo concept for "${business_name}", ${industry || primary_service || 'epoxy flooring'}. ${styleDesc} with a distinctive monogram or abstract mark. Colors: ${colorDesc}. Professional vector logo on white background. No text below.`
    ];

    const logoResults = await Promise.all(
      logoPrompts.map(p =>
        base44.integrations.Core.GenerateImage({ prompt: p })
          .then(r => ({ url: r.url, success: true }))
          .catch(e => {
            console.log(`[generateClientPacks] Logo generation failed: ${e.message}`);
            return { url: '', success: false };
          })
      )
    );

    const logo_packs = logoResults.map((r, i) => ({
      url: r.url,
      style: ['Concept A', 'Concept B', 'Concept C'][i],
      description: `${styleDesc} — ${colorDesc}`
    })).filter(l => l.url);

    console.log(`[generateClientPacks] Generated ${logo_packs.length} logos, ${brand_packs.length} brand packs`);

    return Response.json({
      status: 'success',
      logo_packs,
      brand_packs,
      copy
    });
  } catch (error) {
    console.error('[generateClientPacks] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}