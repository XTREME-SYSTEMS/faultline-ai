import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

// Generic, CORS-enabled form backend for every deployed clone. The clone's contact
// form POSTs here (injected by buildInferredBackend); this saves a real Lead record,
// making the clone operationally complete — not just a static visual copy.
// Also syncs the lead to the IBEAM Supabase leads table for centralized reporting.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export default async function(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { organization_id, clone_id, name, email, phone, message, source_url } = body;
    if (!organization_id) return Response.json({ ok: false, error: 'organization_id required' }, { status: 400, headers: cors });
    if (!name && !email) return Response.json({ ok: false, error: 'name or email required' }, { status: 400, headers: cors });
    const origin = req.headers.get('origin') || req.headers.get('referer') || '';
    const isAllowed = !origin || /vercel\.app|base44\.app|localhost/i.test(origin);
    if (!isAllowed) {
      console.warn(`ingestCloneLead rejected from origin: ${origin}`);
      return Response.json({ ok: false, error: 'Origin not allowed' }, { status: 403, headers: cors });
    }
    await base44.asServiceRole.entities.Lead.create({
      organization_id,
      customer_name: name || 'Clone Lead',
      email: email || '',
      phone: phone || '',
      notes: [message || '', source_url ? `source: ${source_url}` : '', clone_id ? `clone: ${clone_id}` : ''].filter(Boolean).join(' | '),
      source: 'manual',
      status: 'new'
    });

    // Best-effort sync to IBEAM Supabase leads table
    const sbUrl = secrets.get('IBEAM_SUPABASE_URL');
    const sbKey = secrets.get('IBEAM_SUPABASE_SERVICE_KEY');
    if (sbUrl && sbKey) {
      await fetch(`${sbUrl}/rest/v1/leads`, {
        method: 'POST',
        headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({
          full_name: name || 'Clone Lead',
          email: email || '',
          phone: phone || '',
          message: message || '',
          source: 'clone_form',
          clone_url: source_url || clone_id || origin,
          status: 'new',
        }),
      }).catch(() => {});
    }

    return Response.json({ ok: true, status: 'captured' }, { headers: cors });
  } catch (error) {
    console.error('ingestCloneLead error:', error);
    return Response.json({ ok: false, error: error.message }, { status: 500, headers: cors });
  }
}