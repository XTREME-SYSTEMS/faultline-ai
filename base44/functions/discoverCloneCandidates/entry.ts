import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Clone Studio — Step 1: Discovery.
// Three input modes:
//   url      → scrape the page for title/description, return as single candidate
//   idea     → LLM + web search finds top 5 websites matching the idea
//   industry → LLM + web search finds top 5 websites in that industry
// Returns: { candidates: [{ name, url, description, industry, why }] }
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { url, idea, industry } = body;
    if (!url && !idea && !industry) {
      return Response.json({ error: 'Provide a url, idea, or industry' }, { status: 400 });
    }

    // URL mode — direct target, scrape for name/description
    if (url) {
      let name = url.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
      let description = '';
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'FaultLine-CloneStudio/1.0' },
          signal: AbortSignal.timeout(15000), redirect: 'follow'
        });
        const html = await res.text();
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        if (titleMatch) name = titleMatch[1].trim().slice(0, 80);
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
          || html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
        if (descMatch) description = descMatch[1].trim();
      } catch (e) { /* fallback to domain name */ }
      return Response.json({
        candidates: [{
          name, url, industry: industry || '',
          description: description || `Direct clone target — ${name}`,
          why: 'User-provided URL'
        }]
      });
    }

    // Idea or industry mode — LLM + web search
    const query = idea || `top businesses in the ${industry} industry`;
    const prompt = `Find the top 5 most successful, well-designed websites ${idea ? `for this idea: "${idea}"` : `in the ${industry} industry`}.
For each website provide:
- name: the business/website name
- url: the full website URL (must start with https://)
- description: 1-2 sentence description of what they do and their value proposition
- industry: the specific industry/niche
- why: why this is a strong clone candidate (design quality, revenue model, market position, growth)

Focus on real, well-known sites with excellent design, proven revenue models, and strong market presence.
Return exactly 5 candidates, ordered by clone-worthiness (best first).`;

    const schema = {
      type: 'object',
      properties: {
        candidates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              url: { type: 'string' },
              description: { type: 'string' },
              industry: { type: 'string' },
              why: { type: 'string' }
            },
            required: ['name', 'url', 'description', 'why']
          }
        }
      },
      required: ['candidates']
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt, add_context_from_internet: true, model: 'gemini_3_1_pro', response_json_schema: schema
    });
    const data = typeof result === 'string' ? JSON.parse(result) : result;
    const candidates = (data.candidates || []).filter(c => c.url && c.url.startsWith('http'));
    return Response.json({ candidates });
  } catch (error) {
    console.error('discoverCloneCandidates error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}