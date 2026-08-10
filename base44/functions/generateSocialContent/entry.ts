import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Generates social media content for 5 platforms from a cloned site's info.
// One LLM call produces platform-optimized posts for Facebook, Instagram,
// TikTok, YouTube, and Snapchat. Each platform gets text/caption, hashtags,
// and an image prompt (for visual platforms). The frontend can then
// auto-post to connected platforms (Facebook, Instagram) and copy content
// for manual posting on others (TikTok, YouTube, Snapchat).

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { business_name, industry, tagline, hero_headline, about_text, vercel_url, niche } = body;
    if (!business_name) return Response.json({ error: 'business_name required' }, { status: 400 });

    const ind = industry || niche || 'business';
    const tag = tagline || '';
    const headline = hero_headline || '';
    const about = about_text || '';
    const url = vercel_url || '';

    const prompt = `You are a social media marketing expert. Generate platform-optimized social media content for a new business:

Business: ${business_name}
Industry: ${ind}
Tagline: ${tag}
Hero Headline: ${headline}
About: ${about}
Website: ${url}

Generate content for ALL 5 platforms:

1. FACEBOOK — A professional text post (2-3 sentences) promoting the business with a call-to-action to visit the website. Include the website URL.

2. INSTAGRAM — A visual caption (1-2 sentences) with 10-15 relevant hashtags. Also provide an image_prompt for AI image generation (a professional, eye-catching image relevant to the ${ind} industry).

3. TIKTOK — A short-form video script (15-30 seconds spoken text) + a caption with 5-8 trending hashtags. Also provide a video_concept describing the visual.

4. YOUTUBE — A video title (under 60 chars), a video description (2-3 paragraphs with the website URL), and 8-10 tags. Also provide a thumbnail_concept for the video thumbnail.

5. SNAPCHAT — A snap caption (1 sentence, punchy) + an image_prompt for the snap image.

Return all content in the JSON schema.`;

    const schema = {
      type: 'object',
      properties: {
        facebook: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            link: { type: 'string' },
          },
        },
        instagram: {
          type: 'object',
          properties: {
            caption: { type: 'string' },
            hashtags: { type: 'array', items: { type: 'string' } },
            image_prompt: { type: 'string' },
          },
        },
        tiktok: {
          type: 'object',
          properties: {
            script: { type: 'string' },
            caption: { type: 'string' },
            hashtags: { type: 'array', items: { type: 'string' } },
            video_concept: { type: 'string' },
          },
        },
        youtube: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            thumbnail_concept: { type: 'string' },
          },
        },
        snapchat: {
          type: 'object',
          properties: {
            caption: { type: 'string' },
            image_prompt: { type: 'string' },
          },
        },
      },
    };

    const result = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });
    const data = typeof result === 'string' ? JSON.parse(result) : result;

    return Response.json({
      status: 'success',
      business_name,
      content: data,
    });
  } catch (error) {
    console.error('generateSocialContent error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}