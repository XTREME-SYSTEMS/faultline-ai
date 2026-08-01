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