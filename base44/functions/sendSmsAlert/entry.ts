import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { phone, message, finding_id, company_id } = body;

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      return Response.json({ error: 'Twilio not configured — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER' }, { status: 500 });
    }

    // If no phone provided, try to get the operator's phone from their user profile
    let toNumber = phone;
    if (!toNumber) {
      const user = await base44.auth.me();
      toNumber = user?.data?.phone;
    }
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

    // Log the alert
    const user = await base44.auth.me().catch(() => null);
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