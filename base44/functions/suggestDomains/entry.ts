import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Clone Studio — Domain name generator + availability checker.
// 1. Uses LLM to generate 10+ domain name suggestions based on business name + industry.
// 2. Checks availability for each via the Vercel domains API.
// 3. Returns available + taken domains with pricing info.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { business_name, industry, launch_project_id } = body;
    if (!business_name) return Response.json({ error: 'business_name required' }, { status: 400 });

    const ind = industry || 'business';
    const vercelToken = Deno.env.get('VERCEL_TOKEN');
    const teamId = Deno.env.get('VERCEL_TEAM_ID');

    // 1. Generate domain suggestions via LLM
    const prompt = `Search the web to research the business "${business_name}" in the ${ind} industry, then generate 12 available domain name suggestions.
Rules:
- Use .com, .io, .co, .net, .ai, .build, .contractors extensions
- Mix exact-match (businessname.com), keyword-rich (businessname+industry.com), and creative variations
- Keep them short, memorable, and professional
- Avoid hyphens unless necessary
- CRITICAL: Avoid domains already used by existing real businesses — search online to verify
Return as a simple array of domain strings (e.g. ["businessname.com", "getbusinessname.io"]).`;
    const schema = {
      type: 'object',
      properties: {
        domains: { type: 'array', items: { type: 'string' } }
      },
      required: ['domains']
    };
    const result = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema, model: 'gemini_3_flash', add_context_from_internet: true });
    const data = typeof result === 'string' ? JSON.parse(result) : result;
    const suggestions = (data.domains || []).slice(0, 12);

    // 2. Check availability for each via Vercel API
    const checkAvailability = async (domain) => {
      if (!vercelToken) return { domain, available: null, error: 'No Vercel token configured' };
      try {
        const url = `https://api.vercel.com/v4/domains/status?domain=${encodeURIComponent(domain)}${teamId ? `&teamId=${teamId}` : ''}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${vercelToken}` },
          signal: AbortSignal.timeout(10000)
        });
        if (!res.ok) return { domain, available: null, error: `Status ${res.status}` };
        const d = await res.json();
        // Vercel returns: { available: boolean, price: number, period: 1, tld: "com" }
        return {
          domain,
          available: d.available === true,
          price: d.price || null,
          period: d.period || 1,
          tld: d.tld || domain.split('.').pop()
        };
      } catch (e) {
        return { domain, available: null, error: e.message };
      }
    };

    const availabilityResults = await Promise.all(suggestions.map(checkAvailability));

    // Sort: available first, then by price ascending
    const sorted = availabilityResults.sort((a, b) => {
      if (a.available === true && b.available !== true) return -1;
      if (a.available !== true && b.available === true) return 1;
      if (a.price != null && b.price != null) return a.price - b.price;
      return 0;
    });

    // Save suggestions on the project if provided
    if (launch_project_id) {
      try {
        const project = await base44.asServiceRole.entities.LaunchProject.get(launch_project_id);
        if (project && project.organization_id === orgId) {
          await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, {
            metadata: { ...project.metadata, domain_suggestions: sorted, domain_suggested_at: new Date().toISOString() }
          });
        }
      } catch (e) {}
    }

    return Response.json({
      suggestions: sorted,
      available_count: sorted.filter(s => s.available === true).length,
      business_name: business_name,
      industry: ind
    });
  } catch (error) {
    console.error('suggestDomains error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}