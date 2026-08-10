import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Scans the top 50 websites in a given industry group + sub-industry.
// Uses LLM with web search to discover the sites and produce a rich
// business intelligence analysis for each: market cap, revenue, customer
// base, niche, competition, audit (leaks/problems), strengths, weaknesses,
// recommendations, and enhancements. Returns industry-level market data too.
//
// Thumbnails are rendered on the frontend via a screenshot service URL,
// so this function stays fast (one LLM call, no per-site fetching).

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const industryGroup = body.industry_group;
    const subIndustry = body.sub_industry;
    const maxSites = body.max_sites || 50;

    if (!industryGroup || !subIndustry) {
      return Response.json({ error: 'industry_group and sub_industry are required' }, { status: 400 });
    }

    const prompt = `You are an expert business intelligence analyst and website auditor.
Analyze the "${industryGroup}" industry, specifically the "${subIndustry}" sub-industry/niche.

TASK 1 — INDUSTRY OVERVIEW:
Provide the total addressable market size (market cap or total market value) for this industry,
the annual growth rate, and a brief industry summary.

TASK 2 — TOP ${maxSites} WEBSITES:
Identify the top ${maxSites} most successful, highest-traffic, or most relevant websites in this specific sub-industry.
For EACH website, provide ALL of the following fields:
- name: The company/website name
- url: The full website URL (https://...)
- estimated_market_share: Their estimated share of this niche market (e.g. "8%")
- estimated_annual_revenue: Estimated annual revenue in USD (e.g. "$12M")
- customer_base: Description of their target customer base + estimated size
- niche: Their specific niche within this sub-industry
- top_competitors: Array of 3-5 direct competitor names
- strengths: Array of 3-5 key strengths of their website/business
- weaknesses: Array of 3-5 weaknesses or problems with their website/business
- leaks_or_problems: Array of 2-4 specific revenue leaks, conversion issues, or technical problems
- recommendations: Array of 3-5 actionable recommendations to fix the problems/weaknesses
- enhancements: Array of 3-5 recommended enhancements to improve the website

Be specific and realistic with revenue and market share estimates based on publicly available data.
Return exactly ${maxSites} sites (or as many as you can confidently identify, minimum 20).`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          industry_summary: { type: 'string' },
          industry_market_cap: { type: 'string' },
          industry_growth_rate: { type: 'string' },
          sites: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                url: { type: 'string' },
                estimated_market_share: { type: 'string' },
                estimated_annual_revenue: { type: 'string' },
                customer_base: { type: 'string' },
                niche: { type: 'string' },
                top_competitors: { type: 'array', items: { type: 'string' } },
                strengths: { type: 'array', items: { type: 'string' } },
                weaknesses: { type: 'array', items: { type: 'string' } },
                leaks_or_problems: { type: 'array', items: { type: 'string' } },
                recommendations: { type: 'array', items: { type: 'string' } },
                enhancements: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    });

    const sites = (result.sites || []).map((s, i) => ({
      ...s,
      rank: i + 1,
      thumbnail: s.url ? `https://s.wordpress.com/mshots/v1/${encodeURIComponent(s.url)}?w=400&h=300` : null,
    }));

    return Response.json({
      status: 'success',
      industry_group: industryGroup,
      sub_industry: subIndustry,
      industry_summary: result.industry_summary,
      industry_market_cap: result.industry_market_cap,
      industry_growth_rate: result.industry_growth_rate,
      total_sites: sites.length,
      sites,
    });
  } catch (error) {
    console.error('scanTopSitesInCategory error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}