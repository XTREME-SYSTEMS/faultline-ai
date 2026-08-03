import { createClientFromRequest } from "npm:@base44/sdk";

export default async function handler(request: Request) {
  const base44 = createClientFromRequest(request);
  const user = await base44.auth.me();
  const orgId = user.data?.organization_id;
  const body = await request.json();

  if (!orgId) {
    return Response.json({ ok: false, error: "No organization found" }, { status: 400 });
  }

  try {
    // Create a source snapshot record for the catalog refresh request
    const snapshot = await base44.asServiceRole.entities.SourceSnapshot.create({
      organization_id: orgId,
      source_name: "Xtreme Polishing Systems",
      source_url: "https://xtremepolishingsystems.com/",
      snapshot_type: "product_catalog_refresh_request",
      checked_at: new Date().toISOString(),
      records: [],
      status: "Pending",
      notes: "Awaiting approved catalog retrieval adapter. Never treat a stale snapshot as quote-ready pricing."
    });

    // Log audit event
    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: orgId,
      actor_user_id: user.id,
      entity_type: "SourceSnapshot",
      entity_id: snapshot.id,
      action: "catalog_refresh_requested",
      metadata: { source: "Xtreme Polishing Systems" }
    });

    return Response.json({
      ok: true,
      snapshot,
      message: "Catalog refresh request created. Prices should be verified before quoting."
    });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}