import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Generates an AI image for a given industry or sub-industry label.
// Used by the Clone Gallery to show representative images for each category/sub-industry.
// The image is generated once and the URL is returned (stored in the frontend data file).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { label, group, is_category } = body;
    if (!label) return Response.json({ error: 'label required' }, { status: 400 });

    // Build a detailed prompt for a professional, representative industry image
    const prompt = `Create a professional, modern, photographic-style image representing the "${label}" industry${group ? ` in the ${group} sector` : ''}.
The image should:
- Show a clean, professional scene related to this industry
- Use warm, premium lighting with gold and dark tones
- Be suitable as a category card thumbnail (landscape orientation)
- Look like a high-quality stock photo, not a cartoon or illustration
- Convey professionalism, quality, and trust`;

    const result = await base44.integrations.Core.GenerateImage({ prompt });
    const imageUrl = typeof result === 'string' ? result : result.url;

    return Response.json({
      status: 'success',
      label,
      image_url: imageUrl
    });
  } catch (error) {
    console.error('generateIndustryImage error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}