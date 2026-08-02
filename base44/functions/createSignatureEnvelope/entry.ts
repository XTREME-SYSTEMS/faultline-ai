import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Creates a signature envelope with document, recipients, and fields.
// Generates unique signing tokens for each recipient and sends email notifications.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { title, document_name, document_html, document_url, document_type, recipients, fields, message, expires_days } = body;

    if (!title) return Response.json({ error: 'title required' }, { status: 400 });
    if (!document_html && !document_url) return Response.json({ error: 'document_html or document_url required' }, { status: 400 });
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) return Response.json({ error: 'At least one recipient required' }, { status: 400 });

    // Generate signing tokens for each signer
    const recipientsWithTokens = recipients.map(r => ({
      ...r,
      signing_token: r.role === 'cc' ? null : crypto.randomUUID(),
      status: r.role === 'cc' ? 'pending' : 'pending',
      viewed_at: null,
      signed_at: null,
      signature_data: null
    }));

    const expiresAt = expires_days
      ? new Date(Date.now() + expires_days * 86400000).toISOString()
      : new Date(Date.now() + 30 * 86400000).toISOString();

    const envelope = await base44.asServiceRole.entities.SignatureEnvelope.create({
      organization_id: orgId,
      title,
      document_name: document_name || title,
      document_html: document_html || null,
      document_url: document_url || null,
      document_type: document_type || (document_html ? 'html' : 'pdf'),
      status: 'sent',
      recipients: recipientsWithTokens,
      fields: fields || [],
      audit_trail: [{
        event: 'envelope_created',
        actor: user.email,
        timestamp: new Date().toISOString(),
        details: `Created with ${recipientsWithTokens.length} recipients`
      }],
      message: message || 'Please review and sign the attached document.',
      expires_at: expiresAt,
      completed_at: null,
      signed_document_html: null
    });

    // Send email to each signer (cc recipients get a copy notification)
    const origin = new URL(req.url).origin;
    for (const r of recipientsWithTokens) {
      if (r.role === 'cc') {
        try {
          await base44.integrations.Core.SendEmail({
            to: r.email,
            subject: `Copy: ${title}`,
            body: `You have been CC'd on the document "${title}".\n\nThis is for your records only — no signature is required from you.\n\n${message || ''}`
          });
        } catch (e) { console.error('CC email failed:', e); }
      } else {
        const signingUrl = `${origin}/sign/${r.signing_token}`;
        try {
          await base44.integrations.Core.SendEmail({
            to: r.email,
            subject: `Please sign: ${title}`,
            body: `Hello ${r.name || ''},\n\nYou have been requested to sign "${title}".\n\n${message || 'Please review and sign the attached document.'}\n\nClick here to review and sign:\n${signingUrl}\n\nThis link is unique to you. Do not share it with others.\n\nThe link expires on ${new Date(expiresAt).toLocaleDateString()}.`
          });
        } catch (e) { console.error('Signer email failed:', e); }
      }
    }

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'esign',
      action: 'create_envelope',
      status: 'success',
      summary: `Created signature envelope "${title}" with ${recipientsWithTokens.length} recipients`,
      evidence: { envelope_id: envelope.id, recipient_count: recipientsWithTokens.length }
    });

    return Response.json({
      status: 'success',
      envelope_id: envelope.id,
      recipients: recipientsWithTokens.map(r => ({ email: r.email, name: r.name, role: r.role, signing_token: r.signing_token }))
    });
  } catch (error) {
    console.error('createSignatureEnvelope error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}