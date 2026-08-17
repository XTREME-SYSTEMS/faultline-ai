import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import Stripe from 'npm:stripe@17.3.0';

export default async function(req) {
  try {
    const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'));
    const sig = req.headers.get('stripe-signature');
    const rawBody = await req.text();

    const event = await stripe.webhooks.constructEventAsync(
      rawBody,
      sig,
      secrets.get('STRIPE_WEBHOOK_SECRET')
    );

    const base44 = createClientFromRequest(req);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('Payment completed:', session.id, 'Plan:', session.metadata?.plan_name);

      // Log the subscription in Receipt entity
      try {
        await base44.asServiceRole.entities.Receipt.create({
          organization_id: 'stripe',
          system: 'billing',
          action: 'subscription_created',
          status: 'success',
          summary: `New subscription: ${session.metadata?.plan_name || 'Unknown plan'} — ${session.customer_email || 'no email'}`,
          evidence: {
            session_id: session.id,
            customer_email: session.customer_email,
            plan_name: session.metadata?.plan_name,
            amount_total: session.amount_total,
            subscription_id: session.subscription
          }
        });
      } catch (e) {
        console.error('Receipt log failed:', e.message);
      }

      // ─── Grant asset access for purchased items ──────────────────
      // Parse the items from session metadata and grant download access
      // for each item that has an asset_id (EnvatoAsset catalog items).
      try {
        const itemsJson = session.metadata?.items || '[]';
        const items = JSON.parse(itemsJson);
        const customerEmail = session.customer_email || session.customer_details?.email || '';
        const customerName = session.customer_details?.name || '';
        const appId = Deno.env.get('BASE44_APP_ID');
        const grantUrl = `https://base44.app/api/apps/${appId}/functions/grantAssetAccess`;

        for (const item of items) {
          if (!item.asset_id) continue;
          try {
            await fetch(grantUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                asset_id: item.asset_id,
                customer_email: customerEmail,
                customer_name: customerName,
                stripe_session_id: session.id,
                stripe_customer_id: session.customer,
                license_type: item.type === 'growth' || item.type === 'operating' ? 'subscription' : 'one_time',
                organization_id: 'stripe',
              }),
            });
            console.log(`[stripeWebhook] Granted access for asset ${item.asset_id} to ${customerEmail}`);
          } catch (e) {
            console.error(`[stripeWebhook] Grant failed for asset ${item.asset_id}:`, e.message);
          }
        }
      } catch (e) {
        console.error('[stripeWebhook] Asset grant parsing failed:', e.message);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      console.log('Subscription cancelled:', sub.id);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('stripeWebhook error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
}