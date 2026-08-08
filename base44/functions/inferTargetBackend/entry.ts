import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Infers the highest-probability backend for a target site from its scraped DNA.
// Analyzes forms, nav, sections, and internal pages to determine the data models,
// API endpoints, auth model, and form handlers the clone needs for 100% operational parity.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const { target_url, industry, scrape_result } = body;

    let dna = scrape_result;
    if (!dna && target_url) {
      const sr = await base44.functions.invoke('deepCloneTarget', { target_url, industry });
      dna = sr?.data || sr;
    }
    if (!dna) return Response.json({ error: 'No scrape DNA provided and no target_url to scrape' }, { status: 400 });

    const d = dna.dna || {};
    const prompt = `You are a senior backend architect. Given this website's scraped DNA, infer the MOST PROBABLE backend needed for 100% operational parity.

TARGET: ${dna.bizName} (${dna.industry || industry || 'General'})
NAV: ${JSON.stringify(d.nav || [])}
SECTIONS (h2): ${JSON.stringify(d.h2 || [])}
INTERNAL PAGES: ${JSON.stringify((d.internalPages || []).map(p => p.replace(dna.target_url || '', '')))}
FORMS PRESENT: ${d.extract?.formCount || 0}
CTA COUNT: ${d.extract?.ctaCount || 0}
CONTACT PHONE: ${d.phone || 'none'}

Infer the highest-probability backend as JSON. Be specific to THIS site's actual content — name entities after what the site actually has (e.g. for a flooring site: Service, GalleryImage, ContactSubmission, Testimonial).`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          entities: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, fields: { type: 'array', items: { type: 'string' } } } } },
          endpoints: { type: 'array', items: { type: 'object', properties: { method: { type: 'string' }, path: { type: 'string' }, purpose: { type: 'string' } } } },
          auth_model: { type: 'string' },
          form_handlers: { type: 'array', items: { type: 'object', properties: { form: { type: 'string' }, entity: { type: 'string' }, fields: { type: 'array', items: { type: 'string' } } } } },
          operational_requirements: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    const blueprint = res;
    const del = await base44.asServiceRole.entities.Deliverable.create({
      organization_id: orgId,
      deliverable_type: 'backend_blueprint',
      title: `Backend Blueprint — ${dna.bizName}`,
      metadata: { blueprint, target_url: dna.target_url, inferred_at: new Date().toISOString() },
      status: 'generated'
    });
    return Response.json({ status: 'success', blueprint, deliverable_id: del.id, bizName: dna.bizName });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}