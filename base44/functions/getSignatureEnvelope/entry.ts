import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Returns envelope data. Can be called with user auth (admin) or with a signing_token (recipient).
// When called with a token, records a "viewed" audit event and marks the recipient as viewed.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { envelope_id, signing_token } = body;

    let envelope;
    let isRecipient = false;

    if (signing_token) {
      // Public access via signing token - find envelope containing this token
      const envelopes = await base44.asServiceRole.entities.SignatureEnvelope.filter({
        organization_id: { $exists: true }
      });
      envelope = envelopes.find(e =>
        e.recipients?.some(r => r.signing_token === signing_token)
      );
      if (!envelope) return Response.json({ error: 'Invalid or expired signing link' }, { status: 404 });
      isRecipient = true;
    } else if (envelope_id) {
      // Admin access
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const orgId = user.data?.organization_id;
      envelope = await base44.asServiceRole.entities.SignatureEnvelope.get(envelope_id);
      if (!envelope || envelope.organization_id !== orgId) return Response.json({ error: 'Not found' }, { status: 404 });
    } else {
      return Response.json({ error: 'envelope_id or signing_token required' }, { status: 400 });
    }

    // If recipient access, record view and update recipient status
    if (isRecipient && signing_token) {
      const recipient = envelope.recipients.find(r => r.signing_token === signing_token);
      if (recipient && recipient.status === 'pending') {
        recipient.status = 'viewed';
        recipient.viewed_at = new Date().toISOString();
        envelope.audit_trail = [...(envelope.audit_trail || []), {
          event: 'document_viewed',
          actor: recipient.email,
          timestamp: new Date().toISOString(),
          details: 'Recipient opened the document'
        }];
        if (envelope.status === 'sent') envelope.status = 'viewed';
        await base44.asServiceRole.entities.SignatureEnvelope.update(envelope.id, {
          recipients: envelope.recipients,
          status: envelope.status,
          audit_trail: envelope.audit_trail
        });
      }
    }

    // Return data - for recipients, only include their own fields
    let fields = envelope.fields || [];
    if (isRecipient) {
      const recipient = envelope.recipients.find(r => r.signing_token === signing_token);
      fields = fields.filter(f => f.recipient_email === recipient?.email);
    }

    return Response.json({
      status: 'success',
      envelope: {
        id: envelope.id,
        title: envelope.title,
        document_name: envelope.document_name,
        document_html: envelope.document_html,
        document_url: envelope.document_url,
        document_type: envelope.document_type,
        status: envelope.status,
        message: envelope.message,
        expires_at: envelope.expires_at,
        completed_at: envelope.completed_at,
        signed_document_html: envelope.signed_document_html,
        fields,
        recipients: isRecipient
          ? envelope.recipients.map(r => ({ name: r.name, email: r.email, role: r.role, status: r.status }))
          : envelope.recipients,
        audit_trail: isRecipient ? null : envelope.audit_trail
      },
      recipient: isRecipient ? envelope.recipients.find(r => r.signing_token === signing_token) : null
    });
  } catch (error) {
    console.error('getSignatureEnvelope error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}