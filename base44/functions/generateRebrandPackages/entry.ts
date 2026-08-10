import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Clone Studio — Generate 5 complete, cohesive rebrand packages.
// Each package has a matching logo + color palette + brand content + hero image,
// all unified by a single design theme (e.g. "Bold Industrial", "Clean Minimal",
// "Warm Artisan", "Premium Luxury", "Tech Forward").
// The user picks ONE package and everything applies together — no mixing.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { launch_project_id, business_name, industry } = body;
    if (!launch_project_id) return Response.json({ error: 'launch_project_id required' }, { status: 400 });

    const project = await base44.asServiceRole.entities.LaunchProject.get(launch_project_id);
    if (!project || project.organization_id !== orgId) throw new Error('Project not found');

    const bizName = (business_name || project.business_name || project.project_name || 'Your Business').slice(0, 40);
    const ind = industry || project.industry || project.metadata?.target_dna?.industry || 'business';

    // 5 distinct design themes — each produces a cohesive package
    const themes = [
      {
        name: 'Bold Industrial',
        vibe: 'strong, confident, high-contrast',
        palette: { primary: '#1a1a1a', secondary: '#ff6b35', accent: '#f7931e', background: '#fafafa' },
        logo_prompt: `Bold industrial logo for "${bizName}", ${ind} industry, thick geometric lettering, high contrast black and orange, stencil-inspired, white background`,
        image_prompt: `Bold industrial hero background for ${ind} industry, dramatic high-contrast lighting, concrete and steel textures, no text, no people faces`,
        tone: 'confident, direct, no-nonsense'
      },
      {
        name: 'Clean Minimal',
        vibe: 'simple, airy, whitespace-driven',
        palette: { primary: '#2d2d2d', secondary: '#6c6c6c', accent: '#00a8e8', background: '#ffffff' },
        logo_prompt: `Clean minimalist logo for "${bizName}", ${ind} industry, thin elegant lines, lots of whitespace, monochrome with one blue accent, white background`,
        image_prompt: `Clean minimal hero background for ${ind} industry, bright airy space, soft natural light, simple composition, no text, no people faces`,
        tone: 'clear, professional, approachable'
      },
      {
        name: 'Warm Artisan',
        vibe: 'handcrafted, earthy, trustworthy',
        palette: { primary: '#3e2723', secondary: '#8d6e63', accent: '#c89b3c', background: '#faf6f0' },
        logo_prompt: `Warm artisan handcrafted logo for "${bizName}", ${ind} industry, organic shapes, earthy brown and gold tones, vintage feel, white background`,
        image_prompt: `Warm artisan hero background for ${ind} industry, natural wood and stone textures, golden hour lighting, handcrafted feel, no text, no people faces`,
        tone: 'friendly, authentic, down-to-earth'
      },
      {
        name: 'Premium Luxury',
        vibe: 'exclusive, sophisticated, refined',
        palette: { primary: '#0d0d0d', secondary: '#1a1a1a', accent: '#c89b3c', background: '#0a0a0a' },
        logo_prompt: `Premium luxury logo for "${bizName}", ${ind} industry, elegant serif lettering, gold foil on black, sophisticated crest style, white background`,
        image_prompt: `Premium luxury hero background for ${ind} industry, dark moody lighting, gold accents, marble and brass textures, no text, no people faces`,
        tone: 'sophisticated, exclusive, authoritative'
      },
      {
        name: 'Tech Forward',
        vibe: 'modern, innovative, digital-first',
        palette: { primary: '#6c2bd9', secondary: '#3b82f6', accent: '#10b981', background: '#0f172a' },
        logo_prompt: `Modern tech logo for "${bizName}", ${ind} industry, gradient purple-blue, futuristic geometric design, digital aesthetic, white background`,
        image_prompt: `Modern tech hero background for ${ind} industry, abstract digital network, purple-blue gradient glow, futuristic, no text, no people faces`,
        tone: 'innovative, forward-thinking, energetic'
      }
    ];

    // Generate logos + hero images in parallel (10 image generations)
    const imageTasks = themes.flatMap(t => [
      base44.integrations.Core.GenerateImage({ prompt: t.logo_prompt }).catch(() => ({ url: '' })),
      base44.integrations.Core.GenerateImage({ prompt: t.image_prompt }).catch(() => ({ url: '' }))
    ]);
    const imageResults = await Promise.all(imageTasks);

    // Generate brand content for all 5 themes in one LLM call
    const contentPrompt = `Generate brand content for 5 rebrand packages for a ${ind} business named "${bizName}".
Each package has a distinct tone. Return 5 content sets, one per tone, in this exact order:
1. confident, direct, no-nonsense
2. clear, professional, approachable
3. friendly, authentic, down-to-earth
4. sophisticated, exclusive, authoritative
5. innovative, forward-thinking, energetic

Each set must include:
- business_name (use "${bizName}" or a close variation fitting the tone)
- tagline (memorable, 5-10 words, matching the tone)
- about_text (2-3 sentences for the about section, matching the tone)
- contact: { phone, email, address } with realistic placeholder values

Return exactly 5 sets in the "packages" array.`;
    const contentSchema = {
      type: 'object',
      properties: {
        packages: { type: 'array', items: { type: 'object', properties: {
          business_name: { type: 'string' }, tagline: { type: 'string' },
          about_text: { type: 'string' },
          contact: { type: 'object', properties: {
            phone: { type: 'string' }, email: { type: 'string' }, address: { type: 'string' }
          } }
        }, required: ['business_name', 'tagline', 'about_text'] } }
      },
      required: ['packages']
    };
    const contentResult = await base44.integrations.Core.InvokeLLM({ prompt: contentPrompt, response_json_schema: contentSchema });
    const contentData = typeof contentResult === 'string' ? JSON.parse(contentResult) : contentResult;
    const contentPackages = contentData.packages || [];

    // Assemble the 5 complete rebrand packages
    const packages = themes.map((theme, i) => ({
      id: `rebrand_${i}`,
      theme_name: theme.name,
      vibe: theme.vibe,
      logo: { id: `logo_${i}`, label: theme.name, image_url: imageResults[i * 2]?.url || '', prompt: theme.logo_prompt },
      palette: { id: `palette_${i}`, name: theme.name, ...theme.palette },
      image: { id: `img_${i}`, label: `${theme.name} Hero`, image_url: imageResults[i * 2 + 1]?.url || '', prompt: theme.image_prompt },
      trademark: { id: `tm_${i}`, tone: theme.name, ...(contentPackages[i] || { business_name: bizName, tagline: '', about_text: '' }) }
    }));

    await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, {
      metadata: { ...project.metadata, rebrand_packages: packages, rebrand_generated_at: new Date().toISOString() }
    });

    return Response.json({ packages, launch_project_id });
  } catch (error) {
    console.error('generateRebrandPackages error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}