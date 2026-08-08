import { secrets } from 'base44:runtime';
import Stripe from 'npm:stripe@17.3.0';

// Toolio Store checkout — creates a Stripe Checkout Session for a single
// product purchase. Called from the Toolio storefront (published domain only;
// the frontend blocks checkout when running inside an iframe/builder preview).
//
// Catalog (one-time prices):
//   AI Tools  — $29
//   Web Packs — $49
//   App Packs — $99

const CATALOG = {
  'ai-tools':  { name: 'AI Tool — Lifetime Access',         amount: 2900, description: 'Lifetime access to one AI tool from the Toolio catalog.' },
  'web-pack':  { name: 'Web Pack — Lifetime Access',        amount: 4900, description: 'Lifetime access to one web pack from the Toolio catalog.' },
  'app-pack':  { name: 'App Pack — Lifetime Access',        amount: 9900, description: 'Lifetime access to one app pack from the Toolio catalog.' },
};

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { product_id, price, success_url, cancel_url, customer_email } = body;

    if (!product_id) return Response.json({ error: 'product_id required' }, { status: 400 });

    const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'));
    const origin = req.headers.get('origin') || req.headers.get('referer') || 'https://toolio-store.vercel.app';

    // Resolve the catalog item; fall back to a dynamic price if an explicit
    // amount was passed (covers custom/one-off purchases).
    const item = CATALOG[product_id];
    let unitAmount;
    let productName;
    let productDescription;
    if (item) {
      unitAmount = item.amount;
      productName = item.name;
      productDescription = item.description;
    } else {
      unitAmount = Math.round(Number(price) * 100);
      productName = `Toolio Product — ${product_id}`;
      productDescription = 'One-time purchase from the Toolio store.';
    }
    if (!unitAmount || unitAmount < 100) {
      return Response.json({ error: 'Invalid price' }, { status: 400 });
    }

    const successUrl = success_url || `${origin}/?status=success`;
    const cancelUrl = cancel_url || `${origin}/?status=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: unitAmount,
          product_data: {
            name: productName,
            description: productDescription,
          },
        },
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...(customer_email ? { customer_email } : {}),
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        product_id,
        source: 'toolio-store',
      },
    });

    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('toolioCheckout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}