import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// DocuSign — sends a deliverable (proposal/contract) for e-signature
// and returns envelope status. Uses the DocuSign eSignature REST API.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { deliverable_id, recipient_email, recipient_name, subject, message } = body;

    let content = '';
    let title = subject || 'Document for Signature';

    if (deliverable_id) {
      const d = await base44.asServiceRole.entities.Deliverable.get(deliverable_id);
      if (!d || d.organization_id !== orgId) return Response.json({ error: 'Deliverable not found' }, { status: 404 });
      content = d.content || '';
      title = d.title || title;
    }

    if (!content && !body.html) return Response.json({ error: 'deliverable_id or html content required' }, { status: 400 });
    if (!recipient_email) return Response.json({ error: 'recipient_email required' }, { status: 400 });

    const htmlContent = body.html || content;

    // Get DocuSign connection
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('docusign');

    // Get user info to find the correct base URI and account ID
    const userInfoRes = await fetch('https://account.docusign.com/oauth/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const userInfo = await userInfoRes.json();
    const defaultAccount = userInfo.accounts?.find(a => a.is_default) || userInfo.accounts?.[0];
    if (!defaultAccount) return Response.json({ error: 'No DocuSign account found' }, { status: 400 });

    const basePath = `${defaultAccount.base_uri}/restapi/v2.1/accounts/${defaultAccount.account_id}`;

    // Create and send the envelope
    const envelopePayload = {
      emailSubject: title,
      emailBlurb: message || 'Please review and sign the attached document.',
      documents: [{
        documentId: '1',
        name: title,
        fileExtension: 'html',
        documentBase64: btoa(unescape(encodeURIComponent(htmlContent)))
      }],
      recipients: {
        signers: [{
          email: recipient_email,
          name: recipient_name || recipient_email,
          recipientId: '1',
          tabs: {
            signHereTabs: [{
              anchorString: '/s1/',
              anchorXOffset: '0',
              anchorYOffset: '0'
            }]
          }
        }]
      },
      status: 'sent'
    };

    const envelopeRes = await fetch(`${basePath}/envelopes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(envelopePayload)
    });

    if (!envelopeRes.ok) {
      const err = await envelopeRes.text();
      console.error('DocuSign envelope error:', err);
      return Response.json({ error: `DocuSign error: ${envelopeRes.status}` }, { status: 502 });
    }

    const envelope = await envelopeRes.json();

    // Get the recipient view URL for embedded signing
    const viewRes = await fetch(`${basePath}/envelopes/${envelope.envelopeId}/views/recipient`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        returnUrl: `${new URL(req.url).origin}/app/e-signature?envelope_id=${envelope.envelopeId}`,
        authenticationMethod: 'email',
        email: recipient_email,
        userName: recipient_name || recipient_email
      })
    });

    const viewData = await viewRes.json().catch(() => ({}));

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'docusign',
      action: 'send_for_signature',
      status: 'success',
      summary: `Sent "${title}" to ${recipient_email} for e-signature (envelope ${envelope.envelopeId})`,
      evidence: { envelope_id: envelope.envelopeId, deliverable_id, recipient_email }
    });

    return Response.json({
      status: 'success',
      envelope_id: envelope.envelopeId,
      signing_url: viewData.url || null,
      recipient: recipient_email
    });
  } catch (error) {
    console.error('sendForSignature error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}