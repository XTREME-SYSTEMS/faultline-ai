import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Recipient signs the envelope. Captures signature data, marks recipient as signed.
// When all signers have signed, marks envelope as completed and generates signed document HTML.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { signing_token, signature_data, field_values, action } = body;

    if (!signing_token) return Response.json({ error: 'signing_token required' }, { status: 400 });

    // Find envelope containing this token
    const envelopes = await base44.asServiceRole.entities.SignatureEnvelope.filter({
      organization_id: { $exists: true }
    });
    const envelope = envelopes.find(e =>
      e.recipients?.some(r => r.signing_token === signing_token)
    );
    if (!envelope) return Response.json({ error: 'Invalid or expired signing link' }, { status: 404 });

    const recipient = envelope.recipients.find(r => r.signing_token === signing_token);
    if (!recipient) return Response.json({ error: 'Recipient not found' }, { status: 404 });
    if (recipient.status === 'signed') return Response.json({ error: 'You have already signed this document' }, { status: 400 });

    // Handle decline
    if (action === 'decline') {
      const { reason } = body;
      recipient.status = 'declined';
      recipient.declined_reason = reason || 'No reason provided';
      envelope.status = 'declined';
      envelope.audit_trail = [...(envelope.audit_trail || []), {
        event: 'document_declined',
        actor: recipient.email,
        timestamp: new Date().toISOString(),
        details: reason || 'Declined without reason'
      }];
      await base44.asServiceRole.entities.SignatureEnvelope.update(envelope.id, {
        recipients: envelope.recipients,
        status: 'declined',
        audit_trail: envelope.audit_trail
      });
      return Response.json({ status: 'declined', message: 'Document declined' });
    }

    // Sign
    if (!signature_data) return Response.json({ error: 'signature_data required' }, { status: 400 });

    recipient.status = 'signed';
    recipient.signed_at = new Date().toISOString();
    recipient.signature_data = signature_data;

    // Update field values
    if (field_values && Array.isArray(field_values)) {
      envelope.fields = envelope.fields.map(f => {
        const fv = field_values.find(v => v.label === f.label && v.recipient_email === f.recipient_email);
        return fv ? { ...f, value: fv.value } : f;
      });
    }

    envelope.audit_trail = [...(envelope.audit_trail || []), {
      event: 'document_signed',
      actor: recipient.email,
      timestamp: new Date().toISOString(),
      details: `Signed by ${recipient.name || recipient.email}`
    }];

    // Check if all signers have signed
    const signers = envelope.recipients.filter(r => r.role === 'signer' || r.role === 'witness');
    const allSigned = signers.every(r => r.status === 'signed');

    if (allSigned) {
      envelope.status = 'completed';
      envelope.completed_at = new Date().toISOString();

      // Generate signed document HTML with signatures applied
      if (envelope.document_html) {
        let signedHtml = envelope.document_html;
        // Insert signature images at field positions
        const signatureFields = envelope.fields.filter(f => f.type === 'signature' || f.type === 'initial');
        for (const field of signatureFields) {
          const signer = envelope.recipients.find(r => r.email === field.recipient_email);
          if (signer?.signature_data) {
            const sigTag = `<img src="${signer.signature_data}" style="position:absolute;left:${field.x}%;top:${field.y}%;width:${field.width}%;height:${field.height}%;object-fit:contain;" />`;
            signedHtml += `\n<div style="position:relative;width:100%;min-height:200px;">${sigTag}</div>`;
          }
        }
        // Add signature summary at the end
        const sigSummary = envelope.recipients
          .filter(r => r.status === 'signed')
          .map(r => `<div style="margin:20px 0;padding:15px;border:1px solid #ddd;border-radius:8px;">
            <p style="margin:0 0 5px;font-weight:bold;">${r.name || r.email}</p>
            <img src="${r.signature_data}" style="max-height:60px;border-bottom:1px solid #333;padding-bottom:5px;" />
            <p style="margin:5px 0 0;font-size:11px;color:#666;">Signed on ${new Date(r.signed_at).toLocaleString()}</p>
          </div>`).join('');
        signedHtml += `\n<div style="margin-top:40px;border-top:2px solid #333;padding-top:20px;"><h3>Signature Certificate</h3>${sigSummary}</div>`;
        envelope.signed_document_html = signedHtml;
      }

      envelope.audit_trail = [...envelope.audit_trail, {
        event: 'envelope_completed',
        actor: 'system',
        timestamp: new Date().toISOString(),
        details: 'All recipients have signed'
      }];
    }

    await base44.asServiceRole.entities.SignatureEnvelope.update(envelope.id, {
      recipients: envelope.recipients,
      fields: envelope.fields,
      status: envelope.status,
      completed_at: envelope.completed_at,
      signed_document_html: envelope.signed_document_html,
      audit_trail: envelope.audit_trail
    });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: envelope.organization_id,
      system: 'esign',
      action: 'sign',
      status: 'success',
      summary: `${recipient.email} signed "${envelope.title}" — envelope ${allSigned ? 'completed' : 'partially signed'}`,
      evidence: { envelope_id: envelope.id, recipient: recipient.email, all_signed: allSigned }
    });

    return Response.json({
      status: 'success',
      envelope_status: envelope.status,
      all_signed: allSigned,
      message: allSigned ? 'All recipients have signed. Document is complete.' : 'Your signature has been recorded. Waiting for other recipients.'
    });
  } catch (error) {
    console.error('signEnvelope error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}