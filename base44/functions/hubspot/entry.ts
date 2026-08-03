import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const CONNECTOR_ID = "69db228b2439d854c8587167";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();

    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      accessToken = conn.accessToken;
    } catch (e) {
      return Response.json({ connected: false, error: "HubSpot not connected" }, { status: 200 });
    }

    const auth = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

    if (body.action === "status") {
      return Response.json({ connected: true });
    }

    if (body.action === "pushLead") {
      // Create contact
      const contactRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({
          properties: {
            email: body.email || "",
            firstname: body.firstname || "",
            lastname: body.lastname || "",
            phone: body.phone || "",
            address: body.address || "",
          },
        }),
      });
      const contact = await contactRes.json();
      if (!contactRes.ok) {
        // If contact already exists (email duplicate), try to find it
        if (contact.message?.includes("already") || contact.status === 409) {
          const searchRes = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${body.email}?idProperty=email`, { headers: auth });
          const existing = await searchRes.json();
          if (searchRes.ok && existing.id) {
            contact.id = existing.id;
          } else {
            return Response.json({ error: contact.message || "Contact creation failed" }, { status: contactRes.status });
          }
        } else {
          return Response.json({ error: contact.message || "Contact creation failed" }, { status: contactRes.status });
        }
      }

      // Create deal
      const dealRes = await fetch("https://api.hubapi.com/crm/v3/objects/deals", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({
          properties: {
            dealname: `${body.customer_name} — ${body.floor_type || "Flooring"}`,
            amount: (body.proposal_total || 0).toString(),
            dealstage: "presentationscheduled",
            pipeline: "default",
          },
        }),
      });
      const deal = await dealRes.json();
      if (!dealRes.ok) return Response.json({ error: deal.message || "Deal creation failed" }, { status: dealRes.status });

      // Associate deal with contact
      if (contact.id && deal.id) {
        await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${deal.id}/associations/contacts/${contact.id}/deal_to_contact`, {
          method: "PUT",
          headers: auth,
        });
      }

      return Response.json({ contactId: contact.id, dealId: deal.id });
    }

    return Response.json({ error: "unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}