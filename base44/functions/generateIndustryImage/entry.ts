import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Generates an ultra-lifelike AI image for a given industry or sub-industry label.
// Used by the Clone Gallery to show representative images for each category/sub-industry.
// The image is generated once and the URL is returned (cached in frontend localStorage).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { label, group, is_category } = body;
    if (!label) return Response.json({ error: 'label required' }, { status: 400 });

    // Build a detailed prompt for an ultra-lifelike, photographic industry image
    const prompt = `Ultra-realistic photograph representing the "${label}" industry${group ? ` within the ${group} sector` : ''}.
Create a stunning, ultra-lifelike photographic image that captures the essence of this industry.
The image must:
- Look like a real high-end professional photograph shot with a DSLR camera, not a cartoon, illustration, or rendering
- Show a real-world scene, workspace, or environment directly related to "${label}"
- Feature natural lighting with warm golden and amber tones, premium and inviting atmosphere
- Have shallow depth of field, rich textures, and fine detail
- Be in landscape orientation, suitable as a card thumbnail
- Convey professionalism, quality, trust, and expertise
- Avoid any text, watermarks, or logos in the image`;

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