import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildShell } from '../../shared/packGeneration.ts';

// Final step of workflow-driven batch generation.
// Reads all batch fragment URLs from the deliverable metadata, fetches each
// fragment, stitches them together with the head/foot shell, uploads the
// complete HTML, and marks the deliverable as 'generated'.
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

    const opts = {
      business_name: meta.business_name || 'Client',
      industry: meta.industry || '',
      description: meta.description || '',
      tone: meta.tone || 'professional',
      logo_url: meta.logo_url || null
    };

    const shellData = buildShell(pack.spec, opts);
    const totalBatches = meta.total_batches || Math.ceil(shellData.pages.length / 3);

    // Fetch all batch fragments in order
    const fragments = [];
    for (let i = 0; i < totalBatches; i++) {
      const batchUrl = meta[`batch_${i}_url`];
      if (!batchUrl) {
        console.error(`Missing batch_${i}_url in metadata`);
        continue;
      }
      try {
        const res = await fetch(batchUrl);
        const html = await res.text();
        fragments.push(html);
      } catch (e) {
        console.error(`Failed to fetch batch ${i}:`, e.message);
      }
    }

    if (fragments.length === 0) {
      await base44.asServiceRole.entities.Deliverable.update(deliverable_id, {
        status: 'failed',
        metadata: { ...meta, error: 'No batch fragments found' }
      });
      return Response.json({ error: 'No batch fragments found' }, { status: 500 });
    }

    // Stitch the final HTML
    const html = shellData.head + '\n' + fragments.join('\n') + '\n' + shellData.foot;

    // Upload the complete HTML
    let fileUrl = null;
    try {
      const up = await base44.integrations.Core.UploadFile({
        file: new Blob([html], { type: 'text/html' })
      });
      fileUrl = up?.file_url || null;
    } catch (e) { console.error('final upload failed:', e.message); }

    // Update deliverable
    const finalMeta = { ...meta };
    delete finalMeta.qa_feedback;
    finalMeta.file_url = fileUrl;
    finalMeta.generated_at = new Date().toISOString();
    finalMeta.html_length = html.length;
    finalMeta.pages = shellData.pages.map(p => shellData.pageTitle(p.name));

    await base44.asServiceRole.entities.Deliverable.update(deliverable_id, {
      content: '',
      file_url: fileUrl,
      status: 'generated',
      metadata: finalMeta
    });

    // Log receipt
    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: deliverable.organization_id,
        system: 'website_generator',
        action: 'generate',
        status: 'success',
        summary: `Pack-driven website generated for ${opts.business_name} (${shellData.pages.length} pages, ${fragments.length} batches)`,
        evidence: { deliverable_id, business_name: opts.business_name, industry: opts.industry, file_url: fileUrl, design_pack_id: designPackId }
      });
    } catch (e) {}

    return Response.json({
      status: 'generated',
      deliverable_id,
      file_url: fileUrl,
      html_length: html.length,
      pages: shellData.pages.length,
      batches: fragments.length
    });
  } catch (error) {
    console.error('stitchSite error:', error);
    try {
      const base44 = createClientFromRequest(req);
      const { deliverable_id } = await req.json().catch(() => ({}));
      if (deliverable_id) await base44.asServiceRole.entities.Deliverable.update(deliverable_id, { status: 'failed', metadata: { error: error.message } });
    } catch (e) {}
    return Response.json({ error: error.message }, { status: 500 });
  }
}