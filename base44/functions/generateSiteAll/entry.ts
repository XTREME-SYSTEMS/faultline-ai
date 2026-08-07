import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildShell, buildBatchPrompt, parseBatchSections, cleanLlmOutput } from '../../shared/packGeneration.ts';

// Workflow-driven site generation (SPEED-03 + CAP-02).
// Generates ALL pages in 2 batches of 5 using gemini_3_flash (~40s each),
// stitches with the design pack shell, uploads the final HTML, and marks
// the deliverable as 'generated'. Total ~90s — well within the 120s cap.
// No waitUntil needed: the workflow calls this synchronously.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { deliverable_id } = await req.json().catch(() => ({}));
    if (!deliverable_id) return Response.json({ error: 'deliverable_id required' }, { status: 400 });

    const deliverable = await base44.asServiceRole.entities.Deliverable.get(deliverable_id);
    if (!deliverable) return Response.json({ error: 'Deliverable not found' }, { status: 404 });

    const meta = deliverable.metadata || {};
    const designPackId = meta.design_pack_id;
    if (!designPackId) return Response.json({ error: 'No design_pack_id in deliverable metadata' }, { status: 400 });

    const pack = await base44.asServiceRole.entities.DesignPack.get(designPackId);
    if (!pack?.spec) return Response.json({ error: 'Design pack has no spec' }, { status: 400 });

    const orgId = deliverable.organization_id;
    const opts = {
      business_name: meta.business_name || 'Client',
      industry: meta.industry || '',
      description: meta.description || '',
      target_audience: meta.target_audience || 'general',
      tone: meta.tone || 'professional',
      logo_url: meta.logo_url || null,
      qa_feedback: meta.qa_feedback || ''
    };

    const shellData = buildShell(pack.spec, opts);
    const BATCH_SIZE = 5;
    const allFragments = [];

    for (let bi = 0; bi < shellData.pages.length; bi += BATCH_SIZE) {
      const batch = shellData.pages.slice(bi, bi + BATCH_SIZE);
      const prompt = buildBatchPrompt(shellData, batch, bi, opts);

      let batchFrags = '';
      try {
        const r = await base44.integrations.Core.InvokeLLM({ prompt, model: 'gemini_3_flash' });
        batchFrags = cleanLlmOutput(r);
      } catch (e) { console.error(`batch ${bi / BATCH_SIZE} failed:`, e.message); }

      const fragments = parseBatchSections(batchFrags, batch, shellData);
      allFragments.push(...fragments);

      // Update progress in metadata (SPEED-03: streaming progress)
      try {
        const d2 = await base44.asServiceRole.entities.Deliverable.get(deliverable_id);
        const m2 = d2?.metadata || meta;
        m2.batches_done = Math.floor(bi / BATCH_SIZE) + 1;
        m2.total_batches = Math.ceil(shellData.pages.length / BATCH_SIZE);
        m2.pages_generated = allFragments.length;
        await base44.asServiceRole.entities.Deliverable.update(deliverable_id, { metadata: m2 });
      } catch (e) {}
    }

    // Stitch the final HTML
    const html = shellData.head + '\n' + allFragments.join('\n') + '\n' + shellData.foot;

    // Upload the complete HTML — try File first (better SDK compat), then Blob
    let fileUrl = null;
    try {
      const fileObj = typeof File !== 'undefined'
        ? new File([html], 'index.html', { type: 'text/html' })
        : new Blob([html], { type: 'text/html' });
      const up = await base44.integrations.Core.UploadFile({ file: fileObj });
      fileUrl = up?.file_url || null;
    } catch (e) { console.error('upload failed:', e.message); }

    // Update deliverable — fall back to content field if upload failed
    const finalMeta = { ...meta };
    delete finalMeta.qa_feedback;
    finalMeta.file_url = fileUrl;
    finalMeta.generated_at = new Date().toISOString();
    finalMeta.html_length = html.length;
    finalMeta.pages = shellData.pages.map(p => shellData.pageTitle(p.name));
    finalMeta.batches_done = Math.ceil(shellData.pages.length / BATCH_SIZE);
    finalMeta.total_batches = finalMeta.batches_done;
    if (!fileUrl) finalMeta.upload_fallback = true;

    await base44.asServiceRole.entities.Deliverable.update(deliverable_id, {
      content: fileUrl ? '' : html.slice(0, 50000),
      file_url: fileUrl,
      status: 'generated',
      metadata: finalMeta
    });

    // Log receipt
    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId,
        system: 'website_generator',
        action: 'generate',
        status: 'success',
        summary: `Pack-driven website generated for ${opts.business_name} (${shellData.pages.length} pages)`,
        evidence: { deliverable_id, business_name: opts.business_name, industry: opts.industry, file_url: fileUrl, design_pack_id: designPackId }
      });
    } catch (e) {}

    return Response.json({
      status: 'generated',
      deliverable_id,
      file_url: fileUrl,
      html_length: html.length,
      pages: shellData.pages.length
    });
  } catch (error) {
    console.error('generateSiteAll error:', error);
    try {
      const base44 = createClientFromRequest(req);
      const { deliverable_id } = await req.json().catch(() => ({}));
      if (deliverable_id) await base44.asServiceRole.entities.Deliverable.update(deliverable_id, { status: 'failed', metadata: { error: error.message } });
    } catch (e) {}
    return Response.json({ error: error.message }, { status: 500 });
  }
}