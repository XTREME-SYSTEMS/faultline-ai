import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { base64Url, buildMime } from "../../shared/gmailMime.ts";

const GMAIL_CONNECTOR_ID = "69db200274332486fd28dd7e";

const money = (n) =>
  typeof n === "number" ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—";

function getEmailContent(stage, lead) {
  const name = lead.customer_name || "there";
  const range = `${money(lead.adjusted_low ?? lead.estimate_low)} – ${money(lead.adjusted_high ?? lead.estimate_high)}`;
  const system = lead.system_name || lead.floor_type || "flooring";

  const templates = {
    welcome: {
      subject: `Thanks for reaching out about your flooring project, ${name}`,
      body: `Hi ${name},\n\nThanks for your interest in our flooring services! Based on the information you provided, your preliminary project range for a ${system} floor is ${range}.\n\nWe'd love to schedule a free consultation to see your space and provide a detailed quote. Reply to this email or call us to set up a time that works for you.\n\nBest regards,\nThe VisualQuote Team`,
    },
    first_followup: {
      subject: `Following up on your flooring project, ${name}`,
      body: `Hi ${name},\n\nI wanted to follow up on your flooring project inquiry. Have you had a chance to review the preliminary range of ${range}?\n\nI'm happy to answer any questions about the ${system} system, timeline, or scheduling a site visit at your convenience.\n\nBest regards,\nThe VisualQuote Team`,
    },
    second_followup: {
      subject: `Your flooring project — still interested, ${name}?`,
      body: `Hi ${name},\n\nJust checking in on your flooring project. We still have availability coming up and would love to work with you.\n\nIf you're ready to move forward or have any questions about the ${system} system, just reply to this email and I'll get right back to you.\n\nBest regards,\nThe VisualQuote Team`,
    },
    final_reminder: {
      subject: `Last check-in on your flooring project, ${name}`,
      body: `Hi ${name},\n\nThis will be my last follow-up regarding your flooring project. If you're still interested in the ${system} system, please reach out and we'll be happy to help.\n\nIf now isn't the right time, no worries — we're here whenever you're ready.\n\nBest regards,\nThe VisualQuote Team`,
    },
  };

  return templates[stage] || templates.welcome;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { lead_id, stage } = body;

    if (!lead_id || !stage) {
      return Response.json({ error: "lead_id and stage are required" }, { status: 400 });
    }

    // Fetch the lead using service role (works from both frontend and workflow)
    const lead = await base44.asServiceRole.entities.Lead.get(lead_id);
    if (!lead) {
      return Response.json({ error: "Lead not found" }, { status: 404 });
    }

    // Skip if lead is already won or lost
    if (lead.status === "won" || lead.status === "lost") {
      return Response.json({ ok: true, skipped: true, reason: `lead status is ${lead.status}` });
    }

    // Skip if lead has no email
    if (!lead.email) {
      return Response.json({ ok: true, skipped: true, reason: "lead has no email" });
    }

    const { subject, body: emailBody } = getEmailContent(stage, lead);

    // Try to send via gmail connector
    let emailSent = false;
    let sendError = null;
    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection("gmail");
      if (accessToken) {
        const fromEmail = "VisualQuote Team <noreply@visualquote.ai>";
        const mime = buildMime({ from: fromEmail, to: lead.email, subject, text: emailBody });
        const raw = base64Url(mime);
        const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ raw }),
        });
        if (r.ok) {
          emailSent = true;
        } else {
          const data = await r.json();
          sendError = data.error?.message || "send failed";
        }
      }
    } catch (e) {
      sendError = e.message;
    }

    // Create a MessageTemplate record
    const template = await base44.asServiceRole.entities.MessageTemplate.create({
      lead_id: lead_id,
      template_type: stage === "welcome" ? "clarification" : stage === "first_followup" ? "reminder" : stage === "second_followup" ? "viewed_no_response" : "lost_feedback",
      subject: subject,
      body: emailBody,
      status: emailSent ? "sent" : "draft",
    });

    // Update the lead's follow-up stage and last contacted date
    await base44.asServiceRole.entities.Lead.update(lead_id, {
      follow_up_stage: stage + "_sent",
      last_contacted_date: new Date().toISOString(),
      status: lead.status === "new" ? "qualified" : lead.status,
    });

    return Response.json({
      ok: true,
      stage: stage,
      email_sent: emailSent,
      send_error: sendError,
      template_id: template.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}