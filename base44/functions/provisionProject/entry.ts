import { createClientFromRequest } from "npm:@base44/sdk";

export default async function handler(request: Request) {
  const base44 = createClientFromRequest(request);
  const user = await base44.auth.me();
  const orgId = user.data?.organization_id;
  const body = await request.json();

  if (!orgId) {
    return Response.json({ ok: false, error: "No organization found" }, { status: 400 });
  }

  const { name, slug, project_type, customer_id, industry, source_request, priority, position, required_connectors } = body;

  if (!name) {
    return Response.json({ ok: false, error: "Project name is required" }, { status: 400 });
  }

  try {
    // Create the project
    const project = await base44.asServiceRole.entities.BusinessProject.create({
      organization_id: orgId,
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      idea: source_request || name,
      industry: industry || "Universal Business",
      business_type: project_type || "Single Generator",
      current_phase: "intake",
      status: "active",
      progress: 0,
      owner_user_id: user.id,
      intake_complete: false
    });

    // Create the queue item
    const queueItem = await base44.asServiceRole.entities.BuildQueueItem.create({
      organization_id: orgId,
      project_id: project.id,
      name,
      build_type: project_type || "Single Generator",
      description: source_request || name,
      industry: industry || "Universal Business",
      priority: priority || "normal",
      position: position || 0,
      status: "queued",
      progress: 5,
      current_step: "Waiting for worker",
      required_connectors: required_connectors || []
    });

    // Log audit event
    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: orgId,
      actor_user_id: user.id,
      entity_type: "BusinessProject",
      entity_id: project.id,
      action: "project_provisioned",
      metadata: { queue_item_id: queueItem.id, project_type }
    });

    return Response.json({
      ok: true,
      project,
      queue_item: queueItem
    });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}