import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Search the top N highest-ranking real websites in a given industry.
// Uses LLM + web search to return business intelligence for each site.
//
// Input:
//   max_results (number, default 10) — how many top websites to return
//   industry (string) — the industry/sub-industry to search within
//
// Output: { websites: [...], industry, count }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const maxResults = Math.min(20, Math.max(1, body.max_results || 10));
    const industry = body.industry || 'general';

    const searchRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a business research analyst. Find the top ${maxResults} highest-ranking, most successful REAL websites and businesses in the ${industry !== 'general' ? industry : 'most popular and trending'} industry/space.

These must be REAL, well-known businesses with actual live websites. Do NOT invent fictional companies. Rank them from #1 (highest performing / most successful) down to #${maxResults}.

For EACH website, provide ALL of these fields:
- name: the business/website name
- url: the full website URL starting with https:// (must be a real, working URL)
- description: a 2-3 sentence summary of what the business does and sells
- industry: the specific sub-industry or niche they operate in
- estimated_revenue: estimated annual revenue range (e.g. "$10M-$50M", "$1B+")
- monthly_traffic: estimated monthly website visitors (e.g. "500K-1M", "10M+")
- key_strengths: their main competitive advantages (1-2 sentences)
- ranking_reason: why this site ranks highly / why it's a top performer (1 sentence)
- target_market: who they serve (e.g. "Homeowners and contractors", "Enterprise SaaS")
- monetization: how they make money (e.g. "Product sales", "Subscriptions", "Lead gen")

Focus on businesses that are market leaders, have strong web presence, high traffic, and proven revenue models. Include a mix of large enterprises and high-growth mid-market companies if relevant.`,
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          websites: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                url: { type: 'string' },
                description: { type: 'string' },
                industry: { type: 'string' },
                estimated_revenue: { type: 'string' },
                monthly_traffic: { type: 'string' },
                key_strengths: { type: 'string' },
                ranking_reason: { type: 'string' },
                target_market: { type: 'string' },
                monetization: { type: 'string' }
              }
            }
          }
        }
      }
    });

    const websites = Array.isArray(searchRes.websites) ? searchRes.websites.slice(0, maxResults) : [];
    if (websites.length === 0) return Response.json({ error: 'No websites found for this industry' }, { status: 500 });

    // Normalize URLs
    const normalized = websites.map(w => ({
      ...w,
      url: w.url && !w.url.match(/^https?:\/\//) ? `https://${w.url}` : w.url,
    }));

    return Response.json({ websites: normalized, industry, count: normalized.length });
  } catch (e) {
    console.error('searchTopWebsitesByIndustry error:', e);
    return Response.json({ error: e.message || 'Search failed' }, { status: 500 });
  }
}