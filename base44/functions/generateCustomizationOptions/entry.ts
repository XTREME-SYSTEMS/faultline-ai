import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Clone Studio — Step 4b: Generate multiple options for each changeable part.
// For each category (logo, colors, images, trademark content), produces
// several distinct alternatives the user can choose from.
// Stores options on the LaunchProject metadata as customization_options.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { launch_project_id, parts, new_business_name } = body;
    if (!launch_project_id || !parts) return Response.json({ error: 'launch_project_id and parts required' }, { status: 400 });

    const project = await base44.asServiceRole.entities.LaunchProject.get(launch_project_id);
    if (!project || project.organization_id !== orgId) throw new Error('Project not found');

    const industry = project.industry || project.metadata?.target_dna?.industry || 'business';
    const bizName = (new_business_name || 'Your Business').slice(0, 40);

    // 1. LOGO — 3 AI-generated concepts
    const logoStyles = [
      { label: 'Minimalist', prompt: `Modern minimalist logo for "${bizName}", ${industry} industry, clean geometric design, professional, vector style, simple, white background` },
      { label: 'Emblem', prompt: `Bold emblem badge logo for "${bizName}", ${industry} industry, circular crest style, premium, gold and dark charcoal tones, white background` },
      { label: 'Wordmark', prompt: `Sleek modern wordmark typography logo for "${bizName}", ${industry} industry, elegant lettering, monochrome with one accent color, white background` }
    ];
    const logoResults = await Promise.all(logoStyles.map(s =>
      base44.integrations.Core.GenerateImage({ prompt: s.prompt }).catch(() => ({ url: '' }))
    ));
    const logos = logoStyles.map((s, i) => ({
      id: `logo_${i}`, label: s.label, image_url: logoResults[i]?.url || '', prompt: s.prompt
    }));

    // 2. COLOR PALETTES — 4 distinct alternatives via LLM
    const originalColors = (parts.accent_colors || []).map(c => c.hex).filter(Boolean);
    const colorPrompt = `Generate 4 distinct, professional website color palettes for a ${industry} business named "${bizName}".
Each palette must have: name, primary (hex), secondary (hex), accent (hex), background (hex).
Make them visually distinct from each other AND from these original colors: ${JSON.stringify(originalColors)}.
Return exactly 4 palettes.`;
    const colorSchema = {
      type: 'object',
      properties: {
        palettes: { type: 'array', items: { type: 'object', properties: {
          name: { type: 'string' }, primary: { type: 'string' },
          secondary: { type: 'string' }, accent: { type: 'string' }, background: { type: 'string' }
        }, required: ['name', 'primary', 'secondary', 'accent'] } }
      },
      required: ['palettes']
    };
    const colorResult = await base44.integrations.Core.InvokeLLM({ prompt: colorPrompt, response_json_schema: colorSchema });
    const colorData = typeof colorResult === 'string' ? JSON.parse(colorResult) : colorResult;
    const palettes = (colorData.palettes || []).map((p, i) => ({ id: `palette_${i}`, ...p }));

    // 3. KEY IMAGES — 2 AI-generated replacements
    const imageStyles = [
      { label: 'Hero Background', prompt: `Professional hero background image for a ${industry} business website, modern, high quality, cinematic lighting, no text, no people faces` },
      { label: 'Lifestyle Photo', prompt: `Elegant lifestyle product photo for ${industry} industry, premium quality, soft natural lighting, no text overlay` }
    ];
    const imageResults = await Promise.all(imageStyles.map(s =>
      base44.integrations.Core.GenerateImage({ prompt: s.prompt }).catch(() => ({ url: '' }))
    ));
    const images = imageStyles.map((s, i) => ({
      id: `img_${i}`, label: s.label, image_url: imageResults[i]?.url || '', prompt: s.prompt
    }));

    // 4. TRADEMARK CONTENT — 3 alternative sets (professional, friendly, luxury)
    const trademarkPrompt = `Rewrite all trademark/owner-specific content for a new ${industry} business named "${bizName}".
Original content to replace: ${JSON.stringify(parts.trademark_content || [])}

Generate 3 complete alternative content sets, each with a distinct tone:
1. Professional — corporate, trustworthy, authoritative
2. Friendly — warm, approachable, conversational
3. Luxury — premium, exclusive, sophisticated

Each set must include:
- business_name (use "${bizName}" or a close variation)
- tagline (memorable, 5-10 words)
- about_text (2-3 sentences for the about section)
- contact: { phone, email, address } with realistic placeholder values

Return exactly 3 alternatives.`;
    const trademarkSchema = {
      type: 'object',
      properties: {
        alternatives: { type: 'array', items: { type: 'object', properties: {
          tone: { type: 'string' }, business_name: { type: 'string' },
          tagline: { type: 'string' }, about_text: { type: 'string' },
          contact: { type: 'object', properties: {
            phone: { type: 'string' }, email: { type: 'string' }, address: { type: 'string' }
          } }
        }, required: ['tone', 'business_name', 'tagline', 'about_text'] } }
      },
      required: ['alternatives']
    };
    const trademarkResult = await base44.integrations.Core.InvokeLLM({ prompt: trademarkPrompt, response_json_schema: trademarkSchema });
    const trademarkData = typeof trademarkResult === 'string' ? JSON.parse(trademarkResult) : trademarkResult;
    const trademarks = (trademarkData.alternatives || []).map((t, i) => ({ id: `tm_${i}`, ...t }));

    const options = { logos, palettes, images, trademarks };

    await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, {
      metadata: { ...project.metadata, customization_options: options, new_business_name: bizName }
    });

    return Response.json({ options, launch_project_id });
  } catch (error) {
    console.error('generateCustomizationOptions error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}