import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Require authentication before processing any SMS request
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { phone, message, finding_id, company_id } = body;

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      return Response.json({ error: 'Twilio not configured — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER' }, { status: 500 });
    }

    // Use provided phone, or fall back to the authenticated user's profile phone
    const toNumber = phone || user?.data?.phone;
    if (!toNumber) return Response.json({ error: 'No phone number provided' }, { status: 400 });

    const smsBody = message || `⚠️ FaultLine AI Alert: Critical finding detected. Check your portal immediately.`;

    const res = await fetch(`https://${accountSid}:${authToken}@api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        From: fromNumber,
        To: toNumber,
        Body: smsBody.substring(0, 1600)
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Twilio SMS error:', err);
      return Response.json({ error: `Twilio error: ${res.status}` }, { status: 502 });
    }

    const result = await res.json();

    // Log the alert (user already authenticated above)
    const orgId = user?.data?.organization_id;
    if (orgId) {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId,
        system: 'sms_alerts',
        action: 'send_sms',
        status: 'success',
        summary: `SMS alert sent to ${toNumber}: ${smsBody.substring(0, 100)}`,
        evidence: { finding_id, company_id, twilio_sid: result.sid }
      });
    }

    return Response.json({ status: 'success', message_sid: result.sid, sent_to: toNumber });
  } catch (error) {
    console.error('sendSmsAlert error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}