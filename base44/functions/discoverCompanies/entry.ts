import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found on user profile' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const industry = body.industry || '';
    const location = body.location || '';

    const locationPhrase = location ? ` located in "${location}"` : '';
    const industryPhrase = industry ? ` in the "${industry}" industry` : '';
    const prompt = `Find 10 real, currently operating businesses${locationPhrase}${industryPhrase} that have active websites. For each business provide the company name, website domain (full URL), a one-sentence description, and the specific sub-industry or niche. Focus on businesses with operational complexity — field operations, multi-location services, distribution, or fragmented systems — that would benefit from a diagnostic audit. Only return businesses you can verify have live websites.`;

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          businesses: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                domain: { type: 'string' },
                description: { type: 'string' },
                sub_industry: { type: 'string' }
              }
            }
          }
        }
      }
    });

    const businesses = llmResponse.businesses || [];
    let created = 0;
    let skipped = 0;

    for (const biz of businesses) {
      if (!biz.name || !biz.domain) { skipped++; continue; }
      let url = biz.domain;
      if (!url.startsWith('http')) url = 'https://' + url;
      const domain = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

      const existing = await base44.asServiceRole.entities.Company.filter({ organization_id: orgId, domain });
      if (existing.length > 0) { skipped++; continue; }

      const company = await base44.asServiceRole.entities.Company.create({
        organization_id: orgId,
        name: biz.name,
        domain,
        industry: biz.sub_industry || industry || 'General',
        status: 'discovered'
      });

      await base44.asServiceRole.entities.Website.create({
        organization_id: orgId,
        company_id: company.id,
        url,
        status: 'pending_scan'
      });
      created++;
    }

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'discovery_engine',
      action: 'discover_companies',
      status: 'success',
      summary: `Discovered ${created} new companies${location ? ' in ' + location : ''}${industry ? ' (' + industry + ')' : ''} (${skipped} skipped as duplicates)`,
      evidence: { industry, location, found: businesses.length, created, skipped }
    });

    return Response.json({ status: 'success', industry, location, found: businesses.length, created, skipped });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}