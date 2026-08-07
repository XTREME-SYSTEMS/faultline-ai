import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { SERVICE_TYPES, GATE_SEQUENCES, getGateSequence } from '../../shared/clientWorkflow.ts';

// Client Workflow Engine — drives the approval-gated client funnel:
// discovery → logo/brand → ... → launch, with upsells, cart, and SMS/email notifications.
// Client-facing actions (getProject, submitDiscovery, submitGateReview, addUpsell,
// removeUpsell, checkoutCart) are public and validated by project_id.
// Operator actions (createProject, assignDeliverable, advanceGate) require admin auth.

async function sendSms(phone, message) {
  if (!phone) return { skipped: true };
  const sid = secrets.get('TWILIO_ACCOUNT_SID');
  const token = secrets.get('TWILIO_AUTH_TOKEN');
  const from = secrets.get('TWILIO_FROM_NUMBER');
  if (!sid || !token || !from) return { skipped: 'twilio_not_configured' };
  try {
    const res = await fetch(`https://${sid}:${token}@api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: from, To: phone, Body: message.substring(0, 1500) })
    });
    if (!res.ok) return { error: `twilio_${res.status}` };
    return { ok: true };
  } catch (e) { return { error: e.message }; }
}

async function notify(base44, orgId, project, event, message) {
  // Email the operator (always registered). SMS the client if phone present.
  const results = {};
  try {
    const operator = await base44.asServiceRole.auth.me().catch(() => null);
    const operatorEmail = operator?.email;
    if (operatorEmail) {
      await base44.integrations.Core.SendEmail({
        to: operatorEmail,
        subject: `Client Portal — ${project.project_name} — ${event}`,
        body: message
      }).catch(() => {});
      results.operator_email = 'sent';
    }
  } catch (e) { results.operator_email = 'failed'; }
  if (project.client_phone) {
    results.sms = await sendSms(project.client_phone, message);
  }
  // Best-effort email to client (only works if they're a registered user)
  if (project.client_email) {
    try {
      await base44.integrations.Core.SendEmail({
        to: project.client_email,
        subject: `FaultLine — ${project.project_name} — ${event}`,
        body: message
      });
      results.client_email = 'sent';
    } catch (e) { results.client_email = 'not_registered'; }
  }
  try {
    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'client_workflow',
      action: event,
      status: 'success',
      summary: message.substring(0, 200),
      evidence: { project_id: project.id, project_name: project.project_name, notifications: results }
    });
  } catch (e) {}
  return results;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // ---- PUBLIC: get project state ----
    if (action === 'getProject') {
      const { project_id } = body;
      if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });
      const project = await base44.asServiceRole.entities.ClientProject.get(project_id);
      if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
      const reviews = await base44.asServiceRole.entities.GateReview.filter({ project_id });
      const gates = getGateSequence(project.service_type);
      let cart = null;
      if (project.cart_order_id) {
        cart = await base44.asServiceRole.entities.CartOrder.get(project.cart_order_id).catch(() => null);
      }
      const upsells = await base44.asServiceRole.entities.ImplementationService.filter({ organization_id: project.organization_id, status: 'active' });
      return Response.json({ project, gates, reviews, cart, upsells, service_types: SERVICE_TYPES });
    }

    // ---- ADMIN: create project shell ----
    if (action === 'createProject') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
      const orgId = user.data?.organization_id;
      if (!orgId) return Response.json({ error: 'No organization' }, { status: 400 });
      const { service_type, project_name, client_name, client_email, client_phone, account_id } = body;
      if (!service_type || !project_name) return Response.json({ error: 'service_type and project_name required' }, { status: 400 });
      const gates = getGateSequence(service_type);
      const project = await base44.asServiceRole.entities.ClientProject.create({
        organization_id: orgId,
        account_id: account_id || null,
        service_type,
        project_name,
        client_name: client_name || '',
        client_email: client_email || '',
        client_phone: client_phone || '',
        current_gate: gates[0].slug,
        gate_index: 0,
        total_gates: gates.length,
        status: 'discovery',
        gates: gates.map(g => g.slug),
        discovery_responses: {}
      });
      return Response.json({ project, gates });
    }

    // ---- PUBLIC: submit discovery questionnaire ----
    if (action === 'submitDiscovery') {
      const { project_id, responses } = body;
      if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });
      const project = await base44.asServiceRole.entities.ClientProject.get(project_id);
      if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
      await base44.asServiceRole.entities.ClientProject.update(project_id, {
        discovery_responses: responses || {},
        status: 'in_progress'
      });
      const updated = { ...project, discovery_responses: responses, status: 'in_progress' };
      await notify(base44, project.organization_id, updated, 'Discovery Complete',
        `${project.project_name}: The client has completed discovery. Review their responses and prepare the first gate (Logo & Brand Pack).`);
      return Response.json({ project: updated });
    }

    // ---- PUBLIC: submit gate review (approve or fix) ----
    if (action === 'submitGateReview') {
      const { project_id, gate_slug, decision, fix_responses, decision_note } = body;
      if (!project_id || !gate_slug || !decision) return Response.json({ error: 'project_id, gate_slug, decision required' }, { status: 400 });
      const project = await base44.asServiceRole.entities.ClientProject.get(project_id);
      if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
      const gates = getGateSequence(project.service_type);
      const gateIdx = gates.findIndex(g => g.slug === gate_slug);
      if (gateIdx < 0) return Response.json({ error: 'Invalid gate' }, { status: 400 });
      const gate = gates[gateIdx];

      // Count existing reviews for this gate to track iterations
      const existing = await base44.asServiceRole.entities.GateReview.filter({ project_id, gate_slug });
      const iteration = existing.length + 1;

      const state = decision === 'approve' ? 'approved' : 'fix_requested';
      const review = await base44.asServiceRole.entities.GateReview.create({
        organization_id: project.organization_id,
        project_id,
        gate_slug,
        gate_title: gate.title,
        gate_index: gateIdx,
        deliverable_id: project.current_deliverable_id || null,
        state,
        fix_responses: decision === 'fix' ? (fix_responses || {}) : {},
        decision_note: decision_note || '',
        iteration,
        reviewed_at: new Date().toISOString()
      });

      if (decision === 'approve') {
        // Advance to next gate
        const nextIdx = gateIdx + 1;
        if (nextIdx >= gates.length) {
          // All gates complete
          await base44.asServiceRole.entities.ClientProject.update(project_id, {
            status: 'completed',
            current_gate: '',
            gate_index: nextIdx,
            current_deliverable_id: null
          });
          await notify(base44, project.organization_id, { ...project, project_name: project.project_name }, 'Project Complete 🎉',
            `${project.project_name}: The client has approved the final gate. The project is complete!`);
          return Response.json({ review, project: { ...project, status: 'completed', gate_index: nextIdx }, complete: true });
        } else {
          const nextGate = gates[nextIdx];
          await base44.asServiceRole.entities.ClientProject.update(project_id, {
            status: 'in_progress',
            current_gate: nextGate.slug,
            gate_index: nextIdx,
            current_deliverable_id: null
          });
          await notify(base44, project.organization_id, { ...project, project_name: project.project_name }, `Approved: ${gate.title}`,
            `${project.project_name}: The client approved "${gate.title}". Next up: ${nextGate.title}. Prepare the deliverable for review.`);
          return Response.json({ review, project: { ...project, current_gate: nextGate.slug, gate_index: nextIdx, status: 'in_progress', current_deliverable_id: null } });
        }
      } else {
        // Fix requested — keep gate, mark in_progress so operator revises
        await base44.asServiceRole.entities.ClientProject.update(project_id, {
          status: 'in_progress',
          current_deliverable_id: null
        });
        await notify(base44, project.organization_id, { ...project, project_name: project.project_name }, `Fix Requested: ${gate.title}`,
          `${project.project_name}: The client requested fixes on "${gate.title}" (iteration ${iteration}). Review their feedback and prepare a revision.`);
        return Response.json({ review, project: { ...project, status: 'in_progress', current_deliverable_id: null } });
      }
    }

    // ---- ADMIN: assign a deliverable to the current gate (ready for client review) ----
    if (action === 'assignDeliverable') {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
      const { project_id, deliverable_id } = body;
      if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });
      const project = await base44.asServiceRole.entities.ClientProject.get(project_id);
      if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
      await base44.asServiceRole.entities.ClientProject.update(project_id, {
        current_deliverable_id: deliverable_id || null,
        status: 'in_review'
      });
      await notify(base44, project.organization_id, project, 'Ready for Review',
        `${project.project_name}: A new deliverable is ready for your review. Open your client portal to approve or request changes.`);
      return Response.json({ project: { ...project, current_deliverable_id: deliverable_id, status: 'in_review' } });
    }

    // ---- PUBLIC: add upsell to cart ----
    if (action === 'addUpsell') {
      const { project_id, service_id } = body;
      if (!project_id || !service_id) return Response.json({ error: 'project_id and service_id required' }, { status: 400 });
      const project = await base44.asServiceRole.entities.ClientProject.get(project_id);
      if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
      const service = await base44.asServiceRole.entities.ImplementationService.get(service_id);
      if (!service) return Response.json({ error: 'Service not found' }, { status: 404 });

      let cart = project.cart_order_id ? await base44.asServiceRole.entities.CartOrder.get(project.cart_order_id).catch(() => null) : null;
      if (!cart) {
        cart = await base44.asServiceRole.entities.CartOrder.create({
          organization_id: project.organization_id,
          owner_user_id: null,
          items: [],
          subtotal: 0, total: 0, item_count: 0,
          status: 'draft'
        });
        await base44.asServiceRole.entities.ClientProject.update(project_id, { cart_order_id: cart.id });
      }
      const items = cart.items || [];
      if (items.some(i => i.tool_id === service_id)) {
        return Response.json({ cart, already_added: true });
      }
      items.push({ tool_id: service.id, name: service.title, price: service.price, price_mode: 'one_time', type: 'implementation' });
      const subtotal = items.reduce((s, i) => s + (i.price || 0), 0);
      const updated = await base44.asServiceRole.entities.CartOrder.update(cart.id, { items, subtotal, total: subtotal, item_count: items.length });
      return Response.json({ cart: updated });
    }

    // ---- PUBLIC: remove upsell from cart ----
    if (action === 'removeUpsell') {
      const { project_id, service_id } = body;
      if (!project_id || !service_id) return Response.json({ error: 'project_id and service_id required' }, { status: 400 });
      const project = await base44.asServiceRole.entities.ClientProject.get(project_id);
      if (!project || !project.cart_order_id) return Response.json({ error: 'No cart' }, { status: 400 });
      const cart = await base44.asServiceRole.entities.CartOrder.get(project.cart_order_id);
      const items = (cart.items || []).filter(i => i.tool_id !== service_id);
      const subtotal = items.reduce((s, i) => s + (i.price || 0), 0);
      const updated = await base44.asServiceRole.entities.CartOrder.update(cart.id, { items, subtotal, total: subtotal, item_count: items.length });
      return Response.json({ cart: updated });
    }

    // ---- PUBLIC: checkout cart (Stripe) ----
    if (action === 'checkoutCart') {
      const { project_id } = body;
      if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });
      const project = await base44.asServiceRole.entities.ClientProject.get(project_id);
      if (!project || !project.cart_order_id) return Response.json({ error: 'No cart' }, { status: 400 });
      const cart = await base44.asServiceRole.entities.CartOrder.get(project.cart_order_id);
      if (!cart.items || cart.items.length === 0) return Response.json({ error: 'Cart is empty' }, { status: 400 });

      const stripeKey = secrets.get('STRIPE_SECRET_KEY');
      if (!stripeKey) return Response.json({ error: 'Stripe not configured' }, { status: 500 });
      const appId = secrets.get('BASE44_APP_ID');

      const lineItems = cart.items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name },
          unit_amount: Math.round((item.price || 0) * 100)
        },
        quantity: 1
      }));

      const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          'mode': 'payment',
          'success_url': `${req.headers.get('origin') || 'https://app.base44.com'}/funnel/${project_id}?checkout=success`,
          'cancel_url': `${req.headers.get('origin') || 'https://app.base44.com'}/funnel/${project_id}?checkout=cancelled`,
          'metadata[base44_app_id]': appId || '',
          'metadata[project_id]': project_id,
          'metadata[cart_order_id]': cart.id,
          'metadata[organization_id]': project.organization_id
        })
      });
      // append line items
      const lineItemParams = new URLSearchParams();
      cart.items.forEach((item, i) => {
        lineItemParams.append(`line_items[${i}][price_data][currency]`, 'usd');
        lineItemParams.append(`line_items[${i}][price_data][product_data][name]`, item.name);
        lineItemParams.append(`line_items[${i}][price_data][unit_amount]`, String(Math.round((item.price || 0) * 100)));
        lineItemParams.append(`line_items[${i}][quantity]`, '1');
      });
      const sessionRes2 = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          'mode': 'payment',
          'success_url': `${req.headers.get('origin') || 'https://app.base44.com'}/funnel/${project_id}?checkout=success`,
          'cancel_url': `${req.headers.get('origin') || 'https://app.base44.com'}/funnel/${project_id}?checkout=cancelled`,
          'metadata[base44_app_id]': appId || '',
          'metadata[project_id]': project_id,
          'metadata[cart_order_id]': cart.id,
          'metadata[organization_id]': project.organization_id,
          ...Object.fromEntries(lineItemParams)
        })
      });
      const session = await sessionRes2.json();
      if (!session.url) return Response.json({ error: 'Stripe session creation failed', detail: session }, { status: 502 });
      await base44.asServiceRole.entities.CartOrder.update(cart.id, { status: 'submitted', stripe_checkout_session_id: session.id });
      return Response.json({ checkout_url: session.url });
    }

    // ---- ADMIN: advance gate (operator override) ----
    if (action === 'advanceGate') {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
      const { project_id, note } = body;
      if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });
      const project = await base44.asServiceRole.entities.ClientProject.get(project_id);
      if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
      const gates = getGateSequence(project.service_type);
      const gateIdx = gates.findIndex(g => g.slug === project.current_gate);
      if (gateIdx < 0) return Response.json({ error: 'No active gate' }, { status: 400 });
      const gate = gates[gateIdx];
      const nextIdx = gateIdx + 1;
      // Log the override as an approved review
      await base44.asServiceRole.entities.GateReview.create({
        organization_id: project.organization_id,
        project_id,
        gate_slug: gate.slug,
        gate_title: gate.title,
        gate_index: gateIdx,
        deliverable_id: project.current_deliverable_id || null,
        state: 'approved',
        fix_responses: {},
        decision_note: note || 'Operator override — advanced without client review',
        iteration: 1,
        reviewed_at: new Date().toISOString()
      });
      if (nextIdx >= gates.length) {
        await base44.asServiceRole.entities.ClientProject.update(project_id, {
          status: 'completed', current_gate: '', gate_index: nextIdx, current_deliverable_id: null
        });
        return Response.json({ project: { ...project, status: 'completed', gate_index: nextIdx }, complete: true });
      }
      const nextGate = gates[nextIdx];
      await base44.asServiceRole.entities.ClientProject.update(project_id, {
        status: 'in_progress', current_gate: nextGate.slug, gate_index: nextIdx, current_deliverable_id: null
      });
      await notify(base44, project.organization_id, { ...project, project_name: project.project_name }, `Operator Advanced: ${gate.title}`,
        `${project.project_name}: Operator advanced past "${gate.title}". Next up: ${nextGate.title}.`);
      return Response.json({ project: { ...project, current_gate: nextGate.slug, gate_index: nextIdx, status: 'in_progress' } });
    }

    // ---- ADMIN: get full project detail (operator view) ----
    if (action === 'getProjectDetail') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const { project_id } = body;
      if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });
      const project = await base44.asServiceRole.entities.ClientProject.get(project_id);
      if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
      const reviews = await base44.asServiceRole.entities.GateReview.filter({ project_id });
      const gates = getGateSequence(project.service_type);
      let cart = null;
      if (project.cart_order_id) cart = await base44.asServiceRole.entities.CartOrder.get(project.cart_order_id).catch(() => null);
      return Response.json({ project, gates, reviews, cart, service_types: SERVICE_TYPES });
    }

    // ---- ADMIN: list all projects ----
    if (action === 'listProjects') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const orgId = user.data?.organization_id;
      if (!orgId) return Response.json({ error: 'No organization' }, { status: 400 });
      const projects = await base44.asServiceRole.entities.ClientProject.filter({ organization_id: orgId }, '-created_date', 100);
      return Response.json({ projects, service_types: SERVICE_TYPES });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('clientWorkflowEngine error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}