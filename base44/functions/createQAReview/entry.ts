import { createClientFromRequest } from "npm:@base44/sdk";

export default async function handler(request: Request) {
  const base44 = createClientFromRequest(request);
  const user = await base44.auth.me();
  const orgId = user.data?.organization_id;
  const body = await request.json();

  if (!orgId) {
    return Response.json({ ok: false, error: "No organization found" }, { status: 400 });
  }

  const { asset_id, status, score, note } = body;

  if (!asset_id || !status) {
    return Response.json({ ok: false, error: "asset_id and status are required" }, { status: 400 });
  }

  try {
    // Create the QA review record
    const review = await base44.asServiceRole.entities.VisualQAReview.create({
      organization_id: orgId,
      asset_id,
      overall_status: status,
      score: score || (status === "approved" ? 95 : status === "revise" ? 70 : 40),
      qa_note: note || "",
      reviewer_type: "hybrid",
      reviewed_at: new Date().toISOString()
    });

    // Update the asset approval status
    await base44.asServiceRole.entities.MediaAsset.update(asset_id, {
      approval_status: status
    });

    // Log audit event
    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: orgId,
      actor_user_id: user.id,
      entity_type: "MediaAsset",
      entity_id: asset_id,
      action: "qa_reviewed",
      metadata: { status, score: review.score, review_id: review.id }
    });

    return Response.json({
      ok: true,
      review_id: review.id,
      status,
      score: review.score
    });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}