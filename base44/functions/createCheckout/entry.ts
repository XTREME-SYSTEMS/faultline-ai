import { secrets } from 'base44:runtime';
import Stripe from 'npm:stripe@17.3.0';

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { priceId, planName } = body;
    if (!priceId) return Response.json({ error: 'priceId required' }, { status: 400 });

    const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'));
    const origin = req.headers.get('origin') || 'https://app.base44.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/checkout?status=success`,
      cancel_url: `${origin}/checkout?status=canceled`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        plan_name: planName || ''
      }
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('createCheckout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}