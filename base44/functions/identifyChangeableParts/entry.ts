import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Clone Studio — Step 4a: Identify changeable parts.
// Fetches the live clone HTML (or re-scrapes the target), then uses LLM to
// identify all owner-specific parts that MUST change to make the clone unique:
// logo, accent colors, key images, trademark content, contact info.
// Stores the result on the LaunchProject metadata as identified_parts.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { launch_project_id } = body;
    if (!launch_project_id) return Response.json({ error: 'launch_project_id required' }, { status: 400 });

    const project = await base44.asServiceRole.entities.LaunchProject.get(launch_project_id);
    if (!project || project.organization_id !== orgId) throw new Error('Project not found');

    // Fetch the live clone HTML (preferred) or re-scrape the original target
    const liveUrl = project.vercel_deployment_url || project.metadata?.vercel_deployment_url;
    const targetUrl = project.metadata?.target_url;
    const fetchUrl = liveUrl || targetUrl;
    if (!fetchUrl) return Response.json({ error: 'No live URL or target URL on project' }, { status: 400 });

    let html = '';
    try {
      const res = await fetch(fetchUrl, {
        headers: { 'User-Agent': 'FaultLine-CloneStudio/1.0' },
        signal: AbortSignal.timeout(20000), redirect: 'follow'
      });
      html = await res.text();
    } catch (e) {
      return Response.json({ error: `Could not fetch clone HTML: ${e.message}` }, { status: 400 });
    }
    if (!html || html.length < 500) {
      return Response.json({ error: 'Clone HTML too short — ensure the site is deployed first.' }, { status: 400 });
    }

    const prompt = `Analyze this cloned website HTML and identify ALL key parts that are specific to the original owner and MUST be changed to make this site unique and remove trademark/branding issues.

HTML (truncated to 60000 chars):
${html.slice(0, 60000)}

Identify these categories precisely:
1. LOGO — The logo: is it text or an image? What is the current value (text string or image URL)? Where is it (header, footer, favicon)?
2. ACCENT_COLORS — The primary brand colors used. List each hex color found in CSS/style attributes with how it's used (primary, secondary, accent, background).
3. KEY_IMAGES — Important hero/section images (full URLs) that contain owner-specific content or branding. For each, describe what it shows.
4. TRADEMARK_CONTENT — All text that references the original owner's brand: business name, tagline/slogan, about text, testimonials, team names. For each, give the type, the exact current text, and where it appears.
5. CONTACT_INFO — Phone, email, physical address, and social media links belonging to the original owner.

Return structured JSON with the EXACT current values found. These will be used for string replacement, so accuracy is critical.`;

    const schema = {
      type: 'object',
      properties: {
        logo: { type: 'object', properties: {
          type: { type: 'string', description: 'text or image' },
          current_value: { type: 'string' },
          location: { type: 'string' }
        }, required: ['type', 'current_value'] },
        accent_colors: { type: 'array', items: { type: 'object', properties: {
          hex: { type: 'string' },
          usage: { type: 'string' }
        }, required: ['hex', 'usage'] } },
        key_images: { type: 'array', items: { type: 'object', properties: {
          url: { type: 'string' },
          description: { type: 'string' }
        }, required: ['url', 'description'] } },
        trademark_content: { type: 'array', items: { type: 'object', properties: {
          type: { type: 'string', description: 'business_name, tagline, about, testimonial, team_name, etc.' },
          current_text: { type: 'string' },
          location: { type: 'string' }
        }, required: ['type', 'current_text'] } },
        contact_info: { type: 'object', properties: {
          phone: { type: 'string' },
          email: { type: 'string' },
          address: { type: 'string' },
          social_links: { type: 'array', items: { type: 'string' } }
        } }
      },
      required: ['logo', 'accent_colors', 'key_images', 'trademark_content', 'contact_info']
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt, model: 'claude_sonnet_4_6', response_json_schema: schema
    });
    const parts = typeof result === 'string' ? JSON.parse(result) : result;

    await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, {
      metadata: { ...project.metadata, identified_parts: parts, identified_at: new Date().toISOString() }
    });

    return Response.json({ parts, launch_project_id });
  } catch (error) {
    console.error('identifyChangeableParts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}