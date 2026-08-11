import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Public endpoint (no user auth) — called by form submissions on published
// funnel pages. Creates a GhlContact, drops it into the default pipeline as a
// new opportunity, logs an activity, and increments funnel/form counters.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { _form_id, ...fields } = body;
    if (!_form_id) return Response.json({ error: 'form_id required' }, { status: 400 });

    const form = await base44.asServiceRole.entities.GhlForm.get(_form_id).catch(() => null);
    if (!form) return Response.json({ error: 'Form not found' }, { status: 404 });
    const orgId = form.organization_id;
    const funnel = await base44.asServiceRole.entities.GhlFunnel.get(form.funnel_id).catch(() => null);

    const fullName = (fields.name || fields.full_name || '').trim();
    const first_name = fields.first_name || fields.firstname || fullName.split(' ')[0] || '';
    const last_name = fields.last_name || fields.lastname || fullName.split(' ').slice(1).join(' ') || '';
    const email = fields.email || '';
    const phone = fields.phone || fields.phone_number || fields.tel || '';
    const company = fields.company || fields.business || '';
    const message = fields.message || fields.notes || '';

    const contact = await base44.asServiceRole.entities.GhlContact.create({
      organization_id: orgId, first_name, last_name, email, phone, company,
      status: 'lead', source: `Funnel: ${funnel?.name || 'Unknown'}`,
      tags: ['funnel-lead'], avatar_color: '#C89B3C',
      last_activity_at: new Date().toISOString(),
      custom_fields: message ? { message } : {},
    });

    // Drop into the default pipeline as a new opportunity.
    const pipes = await base44.asServiceRole.entities.GhlPipeline.filter({ organization_id: orgId }, '-created_date', 10);
    const pipe = pipes.find(p => p.is_default) || pipes[0];
    if (pipe) {
      const firstStage = (pipe.stages || [])[0]?.id || 'new';
      const dealTitle = company || `${first_name} ${last_name}`.trim() || 'New Funnel Lead';
      await base44.asServiceRole.entities.GhlOpportunity.create({
        organization_id: orgId, title: `${dealTitle} — Funnel Lead`,
        contact_id: contact.id, contact_name: `${first_name} ${last_name}`.trim(),
        pipeline_id: pipe.id, stage: firstStage, value: 0, status: 'open',
        notes: `Submitted via "${form.name}"${message ? ': ' + message : ''}`,
      });
    }

    await base44.asServiceRole.entities.GhlActivity.create({
      organization_id: orgId, contact_id: contact.id,
      type: 'note', title: `Form submission: ${form.name}`,
      description: JSON.stringify(fields).slice(0, 800),
    });

    await base44.asServiceRole.entities.GhlForm.update(_form_id, { submissions: (form.submissions || 0) + 1 });
    if (funnel) await base44.asServiceRole.entities.GhlFunnel.update(funnel.id, { leads_captured: (funnel.leads_captured || 0) + 1 });

    return Response.json({ status: 'success', contact_id: contact.id });
  } catch (error) {
    console.error('ghlFormSubmit error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}