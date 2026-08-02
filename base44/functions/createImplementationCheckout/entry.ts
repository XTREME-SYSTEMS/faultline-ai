import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import Stripe from 'npm:stripe@17.0.0';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { service_id, success_url, cancel_url } = body;

    if (!service_id) return Response.json({ error: 'service_id required' }, { status: 400 });

    const services = await base44.asServiceRole.entities.ImplementationService.list();
    const service = services.find(s => s.id === service_id);
    if (!service) return Response.json({ error: 'Service not found' }, { status: 404 });

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    const stripe = new Stripe(stripeKey);

    // Use existing Stripe price if available, otherwise create one
    let priceId = service.stripe_price_id;
    if (!priceId) {
      const price = await stripe.prices.create({
        product_data: { name: service.title, description: service.description || '' },
        unit_amount: Math.round(service.price * 100),
        currency: 'usd'
      });
      priceId = price.id;
      await base44.asServiceRole.entities.ImplementationService.update(service_id, { stripe_price_id: priceId });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success_url || `${new URL(req.url).origin}/app/marketplace?status=success`,
      cancel_url: cancel_url || `${new URL(req.url).origin}/app/marketplace?status=canceled`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        service_id,
        service_title: service.title
      }
    });

    return Response.json({ status: 'success', checkout_url: session.url, session_id: session.id });
  } catch (error) {
    console.error('createImplementationCheckout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}