import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const draftId = body.draft_id;
    if (!draftId) return Response.json({ error: 'draft_id required' }, { status: 400 });

    // Fetch the approved draft
    const draft = await svc.entities.OutreachDraft.get(draftId);

    // Approval gate: even when approval_status is "approved", send_status stays
    // draft_only in preview. No live outreach is ever sent without an approved
    // server workflow and explicit operator approval.
    await svc.entities.Receipt.create({
      organization_id: draft.organization_id,
      system: 'outreach',
      action: 'approval-gate',
      status: 'blocked',
      summary: 'Outreach approval recorded. Send remains draft-only — no live outreach in preview.',
      evidence: {
        draft_id: draftId,
        approval_status: draft.approval_status,
        send_status: draft.send_status
      },
      rollback: { required: false }
    });

    return Response.json({
      status: 'blocked',
      send_status: 'draft_only',
      message: 'No live outreach sent. Approval-gated.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}