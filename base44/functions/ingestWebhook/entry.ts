import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Constant-time string comparison to prevent timing attacks
function constantTimeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Verify webhook HMAC signature over the raw request body.
// Supports GitHub-style (sha256=<hex> / sha1=<hex>), generic (<hex>),
// and Stripe-style (t=<timestamp>,v1=<hex>) signature headers.
async function verifyWebhookSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  async function computeHmac(data) {
    const buf = await crypto.subtle.sign('HMAC', key, enc.encode(data));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Stripe format: t=<timestamp>,v1=<hex> — HMAC computed over "<timestamp>.<body>"
  const stripeSig = signatureHeader.match(/v1=([a-f0-9]+)/i);
  const stripeTs = signatureHeader.match(/t=(\d+)/);
  if (stripeSig && stripeTs) {
    const computed = await computeHmac(`${stripeTs[1]}.${rawBody}`);
    return constantTimeEqual(stripeSig[1].toLowerCase(), computed);
  }

  // GitHub / generic format: sha256=<hex>, sha1=<hex>, or plain <hex>
  const provided = signatureHeader.replace(/^sha256=/i, '').replace(/^sha1=/i, '').trim().toLowerCase();
  const computed = await computeHmac(rawBody);
  return constantTimeEqual(provided, computed);
}

// Generic webhook ingestion endpoint — receives external webhooks,
// verifies them against registered WebhookEndpoint configs, and logs them.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const pathSegment = url.pathname.split('/').pop();

    // Find the webhook config by url_path
    const endpoints = await base44.asServiceRole.entities.WebhookEndpoint.filter({ url_path: pathSegment, active: true });
    if (endpoints.length === 0) {
      return Response.json({ error: 'Webhook endpoint not found' }, { status: 404 });
    }

    const endpoint = endpoints[0];

    // Read the raw body once — needed for HMAC signature verification
    const rawBody = await req.text();

    // Verify HMAC signature if a secret is configured on the endpoint
    if (endpoint.secret) {
      const signatureHeader = req.headers.get('x-hub-signature-256') || req.headers.get('x-hub-signature') || req.headers.get('stripe-signature') || '';
      const isValid = await verifyWebhookSignature(rawBody, signatureHeader, endpoint.secret);
      if (!isValid) {
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Parse the payload from the already-read raw body
    const contentType = req.headers.get('content-type') || '';
    let payload;
    if (contentType.includes('application/json')) {
      try { payload = JSON.parse(rawBody); } catch { payload = null; }
    } else {
      payload = { raw: rawBody };
    }

    // Log the webhook
    await base44.asServiceRole.entities.Receipt.create({
      organization_id: endpoint.organization_id,
      system: 'webhook',
      action: endpoint.source,
      status: 'success',
      summary: `Webhook received from ${endpoint.source}: ${JSON.stringify(payload).substring(0, 200)}`,
      evidence: { endpoint_id: endpoint.id, payload }
    });

    // Update endpoint stats
    await base44.asServiceRole.entities.WebhookEndpoint.update(endpoint.id, {
      last_triggered: new Date().toISOString(),
      trigger_count: (endpoint.trigger_count || 0) + 1
    });

    return Response.json({ status: 'success', received: true, source: endpoint.source });
  } catch (error) {
    console.error('ingestWebhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}