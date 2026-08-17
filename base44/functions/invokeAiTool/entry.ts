import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

// Log tool usage to the IBEAM Supabase tool_usage table (best-effort, non-blocking).
async function logToolUsage(toolType: string, prompt: string, resultUrl: string | null, referer: string) {
  try {
    const sbUrl = secrets.get('IBEAM_SUPABASE_URL');
    const sbKey = secrets.get('IBEAM_SUPABASE_SERVICE_KEY');
    if (!sbUrl || !sbKey) return;
    await fetch(`${sbUrl}/rest/v1/tool_usage`, {
      method: 'POST',
      headers: {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        tool_type: toolType,
        prompt: prompt?.slice(0, 2000),
        result_url: resultUrl,
        clone_url: referer,
      }),
    }).catch(() => {});
  } catch {}
}

// AI Tool invocation endpoint — powers the functional AI tools on cloned sites.
// Replaces Envato's AI tools (which require their auth) with our own InvokeLLM /
// GenerateImage / GenerateVideo / GenerateSpeech integrations.
//
// Tool types:
//   image      → GenerateImage (text → image)
//   graphics   → GenerateImage (text → graphic)
//   mockup     → GenerateImage (text → mockup)
//   image_edit → InvokeLLM (enhance prompt) → GenerateImage
//   video      → GenerateVideo (text → video)
//   voice      → GenerateSpeech (text → speech audio)
//   sound      → GenerateSpeech (text → sound effect audio)
//   music      → InvokeLLM (generate lyrics) → GenerateSpeech (speak lyrics)

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { tool_type, prompt, existing_image_urls, voice, language_code } = body;

    if (!prompt) return Response.json({ error: 'prompt required' }, { status: 400 });
    if (!tool_type) return Response.json({ error: 'tool_type required' }, { status: 400 });

    const referer = req.headers.get('referer') || '';
    console.log(`invokeAiTool: ${tool_type} — "${prompt.slice(0, 80)}"`);

    switch (tool_type) {
      case 'image':
      case 'graphics':
      case 'mockup': {
        const styleHint = tool_type === 'graphics' ? ' graphic design style' : tool_type === 'mockup' ? ' product mockup style' : '';
        const result = await base44.integrations.Core.GenerateImage({
          prompt: prompt + styleHint,
          existing_image_urls: existing_image_urls || undefined,
        });
        logToolUsage(tool_type, prompt, result.url, referer);
        return Response.json({ status: 'success', tool_type, url: result.url, type: 'image' });
      }

      case 'image_edit': {
        const enhanced = await base44.integrations.Core.InvokeLLM({
          prompt: `Enhance this image edit instruction into a detailed image generation prompt. Original image context: ${existing_image_urls?.[0] || 'none'}. Edit request: "${prompt}". Return only the enhanced prompt, no explanation.`,
          model: 'gemini_3_flash',
        });
        const result = await base44.integrations.Core.GenerateImage({
          prompt: String(enhanced),
          existing_image_urls: existing_image_urls || undefined,
        });
        logToolUsage(tool_type, prompt, result.url, referer);
        return Response.json({ status: 'success', tool_type, url: result.url, type: 'image', enhanced_prompt: String(enhanced) });
      }

      case 'video': {
        const result = await base44.integrations.Core.GenerateVideo({
          prompt,
          duration: 6,
          aspect_ratio: '16:9',
          generate_audio: false,
        });
        logToolUsage(tool_type, prompt, result.url, referer);
        return Response.json({ status: 'success', tool_type, url: result.url, type: 'video' });
      }

      case 'voice':
      case 'sound': {
        const result = await base44.integrations.Core.GenerateSpeech({
          text: prompt,
          voice: voice || (tool_type === 'sound' ? 'storm' : 'river'),
          language_code: language_code || undefined,
        });
        logToolUsage(tool_type, prompt, result.url, referer);
        return Response.json({ status: 'success', tool_type, url: result.url, type: 'audio' });
      }

      case 'music': {
        const lyricsRes = await base44.integrations.Core.InvokeLLM({
          prompt: `Write short song lyrics (4-8 lines) based on this request: "${prompt}". Return only the lyrics, no title or explanation.`,
          model: 'gemini_3_flash',
        });
        const lyrics = String(lyricsRes);
        const audio = await base44.integrations.Core.GenerateSpeech({
          text: lyrics,
          voice: voice || 'sunny',
        });
        logToolUsage(tool_type, prompt, audio.url, referer);
        return Response.json({ status: 'success', tool_type, url: audio.url, type: 'audio', lyrics });
      }

      default:
        return Response.json({ error: `Unknown tool_type: ${tool_type}` }, { status: 400 });
    }
  } catch (error) {
    console.error('invokeAiTool error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}