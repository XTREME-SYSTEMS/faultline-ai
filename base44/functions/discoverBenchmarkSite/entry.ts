import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Exhaustive discovery + audit report on a benchmark (target) site.
// Uses LLM with web search to research everything about the site:
// financials, strategy, niche, stack, target market, profit margins, customer base,
// monetization strategy for a clone, AI enhancement opportunities, and more.
// Stores the report on the linked LaunchProject as benchmark_report.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const { target_url, industry, business_name, launch_project_id } = body;
    if (!target_url) return Response.json({ error: 'target_url required' }, { status: 400 });

    const prompt = `You are a senior business analyst and competitive intelligence expert.
Conduct an EXHAUSTIVE discovery and audit report on this website/business: ${target_url}
${industry ? `Industry: ${industry}` : ''}
${business_name ? `Business name: ${business_name}` : ''}

Use web search to research everything publicly available about this site/business.
Produce a comprehensive, detailed report covering ALL of the following:

1. DISCOVERY SUMMARY — What the site does, its core offering, value proposition, and business model.
2. FINANCIAL SUMMARY — Revenue model, pricing tiers, estimated annual revenue, funding history, financial health.
3. STRATEGY SUMMARY — Business strategy, competitive positioning, go-to-market approach, differentiators.
4. NICHE SUMMARY — The specific niche they dominate, market segment, and positioning within that niche.
5. STACK SUMMARY — Technology stack detected (frontend, backend, hosting, analytics, marketing tools, CMS, frameworks).
6. TARGET MARKET SUMMARY — Who they serve, demographics, psychographics, geographic reach, market size.
7. FINANCIAL INTELLIGENCE SUMMARY — Profit margins, cost structure, unit economics, burn rate, break-even analysis, financial sustainability indicators.
8. AI ENHANCEMENT SUMMARY — How AI could enhance, automate, or disrupt this business; AI-powered features that could be added to a clone.
9. ESTIMATED PROFIT MARGIN YEARLY — Specific estimate of yearly profit margin percentage and dollar range with reasoning.
10. CUSTOMER BASE — Size, demographics, behavior patterns, loyalty, acquisition channels, retention.
11. MONETIZATION STRATEGY — How to monetize a clone of this site: revenue streams, pricing, upsells, partnerships.
12. STRENGTHS — Key competitive strengths (array).
13. WEAKNESSES — Gaps and weaknesses we can exploit (array).
14. OPPORTUNITIES — Market opportunities for a clone (array).
15. THREATS — Risks and competitive threats (array).
16. COMPETITIVE LANDSCAPE — Main competitors, market share, competitive dynamics.
17. TECH STACK DETECTED — Array of specific technologies detected.
18. REVENUE STREAMS — Array of identified/potential revenue streams.
19. KEY METRICS — Object of key business metrics (traffic, conversion, ARPU, LTV, CAC, etc.).
20. GROWTH TRAJECTORY — Growth stage, trajectory, and projections.
21. MARKETING CHANNELS — Array of marketing channels used (SEO, paid, social, email, etc.).
22. CONTENT STRATEGY — Content approach, SEO strategy, content gaps.
23. UX ASSESSMENT — User experience quality, design assessment, usability issues.
24. SEO STRENGTH — SEO profile strength, keyword rankings, backlink profile.
25. OVERALL ASSESSMENT — Overall verdict on the site's quality and clone-worthiness.
26. CLONE RECOMMENDATION — Specific recommendations for building a superior clone.

Be as detailed, specific, and exhaustive as possible. Use real data from web search.
Where exact data isn't available, provide well-reasoned estimates with methodology.`;

    const schema = {
      type: 'object',
      properties: {
        discovery_summary: { type: 'string' },
        financial_summary: { type: 'string' },
        strategy_summary: { type: 'string' },
        niche_summary: { type: 'string' },
        stack_summary: { type: 'string' },
        target_market_summary: { type: 'string' },
        financial_intelligence_summary: { type: 'string' },
        ai_enhancement_summary: { type: 'string' },
        estimated_profit_margin_yearly: { type: 'string' },
        customer_base: { type: 'string' },
        monetization_strategy: { type: 'string' },
        strengths: { type: 'array', items: { type: 'string' } },
        weaknesses: { type: 'array', items: { type: 'string' } },
        opportunities: { type: 'array', items: { type: 'string' } },
        threats: { type: 'array', items: { type: 'string' } },
        competitive_landscape: { type: 'string' },
        tech_stack_detected: { type: 'array', items: { type: 'string' } },
        revenue_streams: { type: 'array', items: { type: 'string' } },
        key_metrics: { type: 'object', additionalProperties: true },
        growth_trajectory: { type: 'string' },
        marketing_channels: { type: 'array', items: { type: 'string' } },
        content_strategy: { type: 'string' },
        ux_assessment: { type: 'string' },
        seo_strength: { type: 'string' },
        overall_assessment: { type: 'string' },
        clone_recommendation: { type: 'string' }
      },
      required: ['discovery_summary', 'financial_summary', 'strategy_summary', 'niche_summary', 'target_market_summary', 'monetization_strategy', 'overall_assessment']
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt, add_context_from_internet: true, model: 'gemini_3_1_pro', response_json_schema: schema
    });
    const report = typeof result === 'string' ? JSON.parse(result) : result;
    report.benchmark_url = target_url;
    report.generated_at = new Date().toISOString();

    if (launch_project_id) {
      try {
        await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, {
          benchmark_url: target_url, benchmark_report: report
        });
      } catch (e) { console.error('Failed to store report on LaunchProject:', e); }
    }
    return Response.json({ status: 'success', report });
  } catch (error) {
    console.error('discoverBenchmarkSite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}