import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found on user profile' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const draftId = body.draft_id;
    if (!draftId) return Response.json({ error: 'draft_id required' }, { status: 400 });

    const draft = await base44.asServiceRole.entities.OutreachDraft.get(draftId);
    if (!draft || draft.organization_id !== orgId) return Response.json({ error: 'Draft not found' }, { status: 404 });

    // Approval gate — reject if not fully approved
    if (draft.approval_status !== 'approved') {
      return Response.json({ error: 'Outreach draft is not approved. An admin must approve it first.' }, { status: 403 });
    }
    if (draft.send_status !== 'approved_for_send') {
      return Response.json({ error: 'Outreach draft is not approved for send. Set send_status to approved_for_send first.' }, { status: 403 });
    }

    // MANDATORY QA GATE — no email leaves this system without a passed QA report
    const qaReports = await base44.asServiceRole.entities.QAReport.filter(
      { organization_id: orgId, target_type: 'outreach', target_id: draftId },
      '-created_date', 10
    );
    const passedQa = qaReports.find(r => r.status === 'passed' || r.status === 'warnings');
    if (!passedQa) {
      return Response.json({
        error: 'MANDATORY QA GATE BLOCKED: This email has no passed QA validation report. Run qaValidateStep on this draft (target_type=outreach, target_id=' + draftId + ') and ensure it passes before sending. No email can be sent without passing the mandatory validator.',
        draft_id: draftId
      }, { status: 403 });
    }

    const company = draft.company_id ? await base44.asServiceRole.entities.Company.get(draft.company_id) : null;
    const toEmail = body.to || company?.domain ? `info@${company.domain}` : null;
    if (!toEmail) return Response.json({ error: 'No recipient email. Provide a "to" field.' }, { status: 400 });

    // Get Gmail access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Build RFC 2822 message
    const fromName = 'FaultLine AI';
    const rawMessage = [
      `From: ${fromName} <${user.email}>`,
      `To: ${toEmail}`,
      `Subject: ${draft.subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      draft.body
    ].join('\r\n');

    const encoded = btoa(unescape(encodeURIComponent(rawMessage)));

    // Send via Gmail API
    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: encoded })
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      return Response.json({ error: `Gmail send failed: ${errText}` }, { status: 502 });
    }

    const sendResult = await sendRes.json();

    // Update draft status
    await base44.asServiceRole.entities.OutreachDraft.update(draftId, { send_status: 'sent' });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'outreach',
      action: 'send_outreach',
      status: 'success',
      summary: `Sent outreach email to ${toEmail} for ${company?.name || 'company'} — "${draft.subject}"`,
      evidence: { draft_id: draftId, to: toEmail, gmail_message_id: sendResult.id }
    });

    return Response.json({ status: 'success', draft_id: draftId, gmail_message_id: sendResult.id, sent_to: toEmail });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}