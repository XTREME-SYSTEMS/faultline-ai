import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { kickoffPackDeliverable } from '../../shared/packGeneration.ts';

// Retry step of the Autonomous Launch Pipeline.
// Creates a new "generating" Deliverable with the previous QA issues appended
// as guidance, increments the iteration counter, and updates the LaunchProject.
// The workflow then calls generateSiteAll to drive the regeneration.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { launch_project_id } = await req.json().catch(() => ({}));
    if (!launch_project_id) return Response.json({ error: 'launch_project_id required' }, { status: 400 });

    const lp = await base44.asServiceRole.entities.LaunchProject.get(launch_project_id);
    if (!lp) return Response.json({ error: 'LaunchProject not found' }, { status: 404 });
    const orgId = lp.organization_id;
    const iteration = (lp.iteration || 0) + 1;

    // Pull the previous QA issues to feed back into the generation prompt
    let qaFeedback = '';
    try {
      if (lp.qa_report_id) {
        const qr = await base44.asServiceRole.entities.QAReport.get(lp.qa_report_id);
        if (qr?.issues?.length) {
          qaFeedback = qr.issues.slice(0, 8).map((i, idx) => `${idx + 1}. ${i.description || ''}${i.recommendation ? ' → ' + i.recommendation : ''}`).join('\n');
        }
      }
    } catch (e) {}

    const { deliverable_id } = await kickoffPackDeliverable(base44, orgId, {
      business_name: lp.business_name || lp.project_name,
      industry: lp.industry,
      description: lp.description || '',
      target_audience: lp.target_audience,
      tone: lp.tone || 'professional',
      design_pack_id: lp.design_pack_id,
      logo_url: lp.metadata?.logo_url || null,
      company_id: lp.company_id || null,
      qa_feedback: qaFeedback
    });

    await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, {
      deliverable_id,
      iteration,
      status: 'retrying',
      last_validation_summary: `Retry iteration ${iteration} — regenerating with QA feedback`
    });

    try {
      await base44.asServiceRole.entities.AuditEvent.create({
        organization_id: orgId,
        entity_type: 'LaunchProject',
        entity_id: launch_project_id,
        project_id: launch_project_id,
        action: 'launch_retry',
        metadata: { iteration, deliverable_id }
      });
    } catch (e) {}

    return Response.json({ status: 'retrying', launch_project_id, deliverable_id, iteration });
  } catch (error) {
    console.error('launchPipelineRetry error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}