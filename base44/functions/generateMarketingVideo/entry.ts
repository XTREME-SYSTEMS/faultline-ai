import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Marketing Video Generator - creates all three types of marketing videos:
//   1. hero    - 16:9 landscape promo for website headers (6s, no audio)
//   2. social  - 9:16 vertical reel for Facebook/TikTok/Reels (6s, with audio)
//   3. demo    - 16:9 product demo walkthrough (8s, with audio)
//
// Input:
//   type: "hero" | "social" | "demo" (default: "hero")
//   prompt: detailed description of the desired video
//   business_name: optional business name for context
//   niche: optional niche for context
//
// Uses the GenerateVideo integration (Google Veo 3.x).
// Credit cost: 5 credits/second (hero=30, social=30, demo=40)

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;

    const { type = 'hero', prompt, business_name, niche } = body;
    if (!prompt) return Response.json({ error: 'prompt required' }, { status: 400 });

    const configs = {
      hero:   { duration: 6, aspect_ratio: '16:9', generate_audio: false, label: 'Hero Promo (16:9)' },
      social: { duration: 6, aspect_ratio: '9:16', generate_audio: true,  label: 'Social Reel (9:16)' },
      demo:   { duration: 8, aspect_ratio: '16:9', generate_audio: true,  label: 'Product Demo (16:9)' }
    };
    const config = configs[type] || configs.hero;

    // Enrich the prompt with business context
    let fullPrompt = prompt;
    if (business_name) fullPrompt += ' - for ' + business_name;
    if (niche) fullPrompt += ' in the ' + niche + ' niche';
    fullPrompt += '. Cinematic, professional, high-quality, polished production.';

    const result = await base44.integrations.Core.GenerateVideo({
      prompt: fullPrompt,
      duration: config.duration,
      aspect_ratio: config.aspect_ratio,
      generate_audio: config.generate_audio
    });

    // Save as MediaAsset for tracking
    if (orgId && result?.url) {
      try {
        await base44.entities.MediaAsset.create({
          organization_id: orgId,
          job_id: 'marketing-video-' + Date.now(),
          provider_id: 'google-veo',
          media_type: 'video',
          storage_url: result.url,
          duration_seconds: config.duration,
          prompt_snapshot: {
            video_type: type,
            label: config.label,
            business_name: business_name || null,
            niche: niche || null,
            aspect_ratio: config.aspect_ratio,
            generated_by: 'generateMarketingVideo'
          }
        });
      } catch (e) { console.error('MediaAsset save failed:', e.message); }
    }

    return Response.json({
      status: 'success',
      url: result.url,
      type,
      label: config.label,
      duration: config.duration,
      aspect_ratio: config.aspect_ratio,
      credits_used: config.duration * 5,
      message: config.label + ' video generated successfully'
    });
  } catch (error) {
    console.error('generateMarketingVideo error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}