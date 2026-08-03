import { createClientFromRequest } from "npm:@base44/sdk";

export default async function handler(request: Request) {
  const base44 = createClientFromRequest(request);
  const user = await base44.auth.me();
  const orgId = user.data?.organization_id;
  const body = await request.json();

  if (!orgId) {
    return Response.json({ ok: false, error: "No organization found" }, { status: 400 });
  }

  const { prompt_id, provider_id, media_type, payload } = body;

  if (!prompt_id || !media_type) {
    return Response.json({ ok: false, error: "prompt_id and media_type are required" }, { status: 400 });
  }

  try {
    // Create the generation job
    const job = await base44.asServiceRole.entities.MediaGenerationJob.create({
      organization_id: orgId,
      prompt_id,
      provider_id: provider_id || "base44_native",
      media_type,
      payload: payload || {},
      status: "queued",
      attempt_count: 0,
      max_attempts: 3
    });

    // Execute the generation using Base44's built-in integrations
    let assetUrl = null;
    let assetError = null;

    try {
      if (media_type === "image") {
        // Fetch the prompt to get the image_prompt
        const prompt = await base44.entities.VisualPrompt.get(prompt_id);
        const result = await base44.integrations.Core.GenerateImage({
          prompt: prompt.image_prompt || prompt.video_prompt
        });
        assetUrl = result.url;
      } else if (media_type === "video") {
        const prompt = await base44.entities.VisualPrompt.get(prompt_id);
        const result = await base44.integrations.Core.GenerateVideo({
          prompt: prompt.video_prompt,
          duration: payload?.duration || 6,
          aspect_ratio: payload?.aspect_ratio || "16:9"
        });
        assetUrl = result.url;
      }

      // Update job as completed
      await base44.asServiceRole.entities.MediaGenerationJob.update(job.id, {
        status: "completed",
        completed_at: new Date().toISOString()
      });

      // Create the media asset record
      const asset = await base44.asServiceRole.entities.MediaAsset.create({
        organization_id: orgId,
        job_id: job.id,
        provider_id: provider_id || "base44_native",
        media_type,
        storage_url: assetUrl,
        thumbnail_url: media_type === "image" ? assetUrl : null,
        disclosure_label: "AI-generated project concept. Not an installed customer project.",
        approval_status: "unreviewed"
      });

      return Response.json({
        ok: true,
        job_id: job.id,
        asset_id: asset.id,
        asset_url: assetUrl,
        status: "completed"
      });
    } catch (genError) {
      await base44.asServiceRole.entities.MediaGenerationJob.update(job.id, {
        status: "failed",
        error_message: genError.message,
        attempt_count: 1
      });
      return Response.json({ ok: false, error: genError.message, job_id: job.id }, { status: 500 });
    }
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}