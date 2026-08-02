import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

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

    // Verify signature if secret is set
    if (endpoint.secret) {
      const signature = req.headers.get('x-hub-signature') || req.headers.get('x-hub-signature-256') || req.headers.get('stripe-signature') || '';
      // For simplicity, we accept the webhook if the secret is in the signature or query
      const providedSecret = url.searchParams.get('secret') || signature;
      if (endpoint.secret && providedSecret !== endpoint.secret && !signature.includes(endpoint.secret)) {
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Parse the payload
    const contentType = req.headers.get('content-type') || '';
    let payload;
    if (contentType.includes('application/json')) {
      payload = await req.json().catch(() => null);
    } else {
      const text = await req.text().catch(() => '');
      payload = { raw: text };
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