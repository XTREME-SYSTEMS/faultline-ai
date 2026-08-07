import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildShell, buildBatchPrompt, parseBatchSections, cleanLlmOutput } from '../../shared/packGeneration.ts';

// Workflow-driven batch generation (SPEED-03: streaming generation with progress).
// Called by the workflow once per batch of pages. Each call:
// 1. Reads the design pack + deliverable
// 2. Generates one batch of 3 pages via gemini_3_flash (~35s, well within 120s)
// 3. Uploads the fragment as a file
// 4. Stores the file URL in deliverable metadata (batch_N_url)
// 5. Updates progress (batches_done, total_batches)
// Returns { batch_index, total_batches, complete: boolean }
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { deliverable_id, batch_index } = await req.json().catch(() => ({}));
    if (!deliverable_id) return Response.json({ error: 'deliverable_id required' }, { status: 400 });
    if (batch_index === undefined) return Response.json({ error: 'batch_index required' }, { status: 400 });

    const deliverable = await base44.asServiceRole.entities.Deliverable.get(deliverable_id);
    if (!deliverable) return Response.json({ error: 'Deliverable not found' }, { status: 404 });

    const meta = deliverable.metadata || {};
    const designPackId = meta.design_pack_id;
    if (!designPackId) return Response.json({ error: 'No design_pack_id in deliverable metadata' }, { status: 400 });

    const pack = await base44.asServiceRole.entities.DesignPack.get(designPackId);
    if (!pack?.spec) return Response.json({ error: 'Design pack has no spec' }, { status: 400 });

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
    const BATCH_SIZE = 3;
    const totalBatches = Math.ceil(shellData.pages.length / BATCH_SIZE);
    const batchStart = batch_index * BATCH_SIZE;
    const batch = shellData.pages.slice(batchStart, batchStart + BATCH_SIZE);

    if (batch.length === 0) {
      return Response.json({ batch_index, total_batches: totalBatches, complete: true, message: 'No more pages' });
    }

    const prompt = buildBatchPrompt(shellData, batch, batchStart, opts);
    const r = await base44.integrations.Core.InvokeLLM({ prompt, model: 'gemini_3_flash' });
    const batchFrags = cleanLlmOutput(r);
    const fragments = parseBatchSections(batchFrags, batch, shellData);
    const fragmentHtml = fragments.join('\n');

    // Upload this batch's HTML fragment as a file
    let batchUrl = null;
    try {
      const up = await base44.integrations.Core.UploadFile({
        file: new Blob([fragmentHtml], { type: 'text/html' })
      });
      batchUrl = up?.file_url || null;
    } catch (e) { console.error('batch upload failed:', e.message); }

    // Store the batch file URL in metadata, update progress
    meta[`batch_${batch_index}_url`] = batchUrl;
    meta.batches_done = batch_index + 1;
    meta.total_batches = totalBatches;
    meta.last_batch_at = new Date().toISOString();

    await base44.asServiceRole.entities.Deliverable.update(deliverable_id, { metadata: meta });

    const complete = batch_index + 1 >= totalBatches;

    try {
      await base44.asServiceRole.entities.AuditEvent.create({
        organization_id: deliverable.organization_id,
        entity_type: 'Deliverable',
        entity_id: deliverable_id,
        action: 'site_batch_generated',
        metadata: { batch_index, total_batches, complete, fragment_length: fragmentHtml.length }
      });
    } catch (e) {}

    return Response.json({
      batch_index,
      total_batches: totalBatches,
      complete,
      fragment_length: fragmentHtml.length,
      batch_url: batchUrl
    });
  } catch (error) {
    console.error('generateSiteBatch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}