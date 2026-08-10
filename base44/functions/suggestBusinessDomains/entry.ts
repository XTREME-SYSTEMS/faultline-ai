import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// AI-powered business name + domain generator.
// Input: 1-2 word description of the business type (e.g. "epoxy flooring", "coffee shop")
// Output: 10 business names with matching available .com/.io/.co/.ai domains + availability status.
//
// The LLM generates creative business names, then we derive domain candidates for each,
// and check real availability via the Vercel domains API. Only available domains are returned.
// Supports retry — each call generates fresh names (seeded by timestamp + attempt number).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { keywords, industry, attempt } = body;
    if (!keywords) return Response.json({ error: 'keywords required' }, { status: 400 });

    const vercelToken = Deno.env.get('VERCEL_TOKEN');
    const teamId = Deno.env.get('VERCEL_TEAM_ID');
    const seed = `${keywords}-${Date.now()}-${attempt || 1}`;

    // 1. LLM generates 10 business names + domain candidates
    const prompt = `You are a business naming expert. A user wants to start a business in the "${industry || keywords}" space.
They described it as: "${keywords}"

Search the web to research existing businesses in this space, then generate exactly 10 creative, professional business names that are NOT already used by real operating companies.
Rules:
- Names should be memorable, short (1-2 words), and brandable
- Mix exact-match, keyword-rich, and creative variations
- Domain extensions: .com (preferred), .io, .co, .ai, .net, .build, .contractors where appropriate
- CRITICAL: Search online and avoid names already used by existing real businesses or trademarks
- Each name must be distinct from the others
- Use seed "${seed}" to ensure unique results on retry

Return a JSON array of objects with "name" (business name) and "domain" (suggested domain).`;

    const schema = {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              domain: { type: 'string' }
            },
            required: ['name', 'domain']
          }
        }
      },
      required: ['suggestions']
    };

    const result = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema, model: 'gemini_3_flash', add_context_from_internet: true });
    const data = typeof result === 'string' ? JSON.parse(result) : result;
    let suggestions = (data.suggestions || []).slice(0, 10);

    // 1b. Verify names aren't already used by real businesses — web search check
    const verifyPrompt = `Search the web for each of these business names. Identify which ones are already used by real, operating businesses or are well-known trademarks/brands.
Names to check: ${suggestions.map(s => s.name).join(', ')}

Return ONLY the names that are already taken by existing real businesses or trademarks. Be thorough — search each name individually.`;
    const verifySchema = { type: 'object', properties: { conflicts: { type: 'array', items: { type: 'string' } } }, required: ['conflicts'] };
    try {
      const verifyResult = await base44.integrations.Core.InvokeLLM({ prompt: verifyPrompt, response_json_schema: verifySchema, model: 'gemini_3_flash', add_context_from_internet: true });
      const verifyData = typeof verifyResult === 'string' ? JSON.parse(verifyResult) : verifyResult;
      const conflicts = new Set((verifyData.conflicts || []).map(n => n.toLowerCase().trim()));
      if (conflicts.size > 0) {
        suggestions = suggestions.filter(s => !conflicts.has(s.name.toLowerCase().trim()));
      }
    } catch (e) {
      console.error('Name verification failed:', e.message);
    }

    // 2. Check domain availability for each via Vercel API
    const checkAvailability = async (domain) => {
      if (!vercelToken) return { domain, available: null, error: 'No Vercel token' };
      try {
        const url = `https://api.vercel.com/v4/domains/status?domain=${encodeURIComponent(domain)}${teamId ? `&teamId=${teamId}` : ''}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${vercelToken}` },
          signal: AbortSignal.timeout(10000)
        });
        if (!res.ok) return { domain, available: null, error: `Status ${res.status}` };
        const d = await res.json();
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

    // Check all domains in parallel
    const domainsToCheck = suggestions.map(s => s.domain.toLowerCase().replace(/\s+/g, ''));
    const availabilityResults = await Promise.all(domainsToCheck.map(checkAvailability));
    const availMap = new Map(availabilityResults.map(r => [r.domain, r]));

    // Merge business names with availability
    const merged = suggestions.map(s => {
      const cleanDomain = s.domain.toLowerCase().replace(/\s+/g, '');
      const avail = availMap.get(cleanDomain) || { domain: cleanDomain, available: null, error: 'Not checked' };
      return {
        name: s.name,
        domain: cleanDomain,
        available: avail.available,
        price: avail.price || null,
        period: avail.period || 1,
        tld: avail.tld || cleanDomain.split('.').pop()
      };
    });

    // Sort: available first, then by price
    const sorted = merged.sort((a, b) => {
      if (a.available === true && b.available !== true) return -1;
      if (a.available !== true && b.available === true) return 1;
      if (a.price != null && b.price != null) return a.price - b.price;
      return 0;
    });

    return Response.json({
      suggestions: sorted,
      available_count: sorted.filter(s => s.available === true).length,
      keywords,
      industry: industry || null,
      attempt: attempt || 1
    });
  } catch (error) {
    console.error('suggestBusinessDomains error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}