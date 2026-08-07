import { secrets } from 'base44:runtime';
import Stripe from 'npm:stripe@17.3.0';

// One-time store checkout. Builds Stripe line items inline via price_data so
// the store catalog (web packs, apps, AI tools) doesn't need pre-created
// Stripe products — each cart item carries its own name/amount/image.

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { items, customer_email } = body;
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'items array required' }, { status: 400 });
    }

    const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'));
    const origin = req.headers.get('origin') || 'https://app.base44.com';

    const line_items = items.map((it) => ({
      quantity: it.quantity || 1,
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(Number(it.amount) * 100),
        product_data: {
          name: it.name,
          ...(it.image ? { images: [it.image] } : {}),
          ...(it.description ? { description: String(it.description).slice(0, 500) } : {})
        }
      }
    }));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${origin}/store?status=success`,
      cancel_url: `${origin}/store?status=canceled`,
      ...(customer_email ? { customer_email } : {}),
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        items: JSON.stringify(items.map((it) => ({ pack_id: it.pack_id, type: it.type, name: it.name, amount: it.amount })))
      }
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('createStoreCheckout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}