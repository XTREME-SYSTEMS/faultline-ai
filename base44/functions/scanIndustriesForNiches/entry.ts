import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Autonomous Industry Niche Scanner — scans all (or a focused set of) industries
// to find the best AI-automation opportunities. Scores each niche on automation
// potential, ROI, problem severity, need-creation, and a composite opportunity
// score. Returns a ranked list with a ready-to-build recommended_idea that feeds
// directly into the Universal Builder. Enforces a mandatory 20%-better-than-
// benchmark rule in scoring.

const INDUSTRIES = [
  'Healthcare & Medical', 'Real Estate', 'Legal Services', 'Construction & Contracting',
  'Manufacturing', 'Logistics & Supply Chain', 'Hospitality & Travel', 'Retail',
  'Financial Services', 'Insurance', 'Education & EdTech', 'Automotive',
  'Agriculture & AgTech', 'Energy & Utilities', 'Media & Entertainment',
  'E-commerce', 'Fitness & Wellness', 'Food & Beverage', 'Transportation & Fleet',
  'Professional Services & Consulting', 'Property Management', 'Home Services',
  'Dental & Orthodontics', 'Veterinary', 'Accounting & Bookkeeping',
  'HR & Recruiting', 'Telecom & IT Services', 'Nonprofit & Associations'
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const focusIndustry = body.focus_industry?.trim() || null;
    const maxResults = Math.min(body.max_results || 12, 20);

    const industryList = focusIndustry ? [focusIndustry] : INDUSTRIES;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the FaultLine AI Autonomous Industry Niche Scanner. Your job is to scan industries and find the BEST business opportunities for AI automation — niches where AI can solve real, painful problems, create new demand, and deliver massive ROI. Many users don't know what to ask AI or what to search for — so YOU generate the ideas.

${focusIndustry ? `Focus industry: ${focusIndustry}` : `Scan these industries: ${INDUSTRIES.join(', ')}`}

For each high-potential niche you discover through web research, return an opportunity object with:
- industry: the industry
- niche: the specific niche within it
- problem_solved: the core painful problem this solves
- recommended_idea: a clear one-to-two sentence idea for an AI-powered business/system that addresses this niche (this feeds directly into the Universal Builder to generate a full plan + asset packs)
- automation_potential: score 0-100 (how automatable is this workflow/problem)
- roi_score: score 0-100 (potential return on investment — revenue vs cost)
- problem_severity: score 0-100 (how painful/urgent is the problem today)
- need_creation: score 0-100 (does this create a brand-new need/market, not just serve an existing one)
- opportunity_score: score 0-100 (your composite ranking — weight automation, ROI, severity, and need-creation)
- why: one sentence on why this is a top opportunity right now
- target_customer: who buys this
- estimated_market_size: rough market size (e.g. "$2.1B US")
- benchmark_systems: 1-3 existing companies/systems already in this space (name only)

MANDATORY RULE: Any system built from these ideas MUST be at least 20% better than existing benchmark solutions on key metrics (efficiency, cost, accuracy, speed, or customer experience). Factor this into your opportunity_score — prefer niches where a 20%+ improvement is clearly achievable, and penalize niches where incumbents are already dominant and hard to beat by 20%.

Return the top ${maxResults} opportunities ranked by opportunity_score (highest first). Be specific and evidence-based — use real, current industry pain points you find via web search. Avoid generic/vague niches; be concrete.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          opportunities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                industry: { type: 'string' },
                niche: { type: 'string' },
                problem_solved: { type: 'string' },
                recommended_idea: { type: 'string' },
                automation_potential: { type: 'number' },
                roi_score: { type: 'number' },
                problem_severity: { type: 'number' },
                need_creation: { type: 'number' },
                opportunity_score: { type: 'number' },
                why: { type: 'string' },
                target_customer: { type: 'string' },
                estimated_market_size: { type: 'string' },
                benchmark_systems: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          scan_summary: { type: 'string' }
        }
      }
    });

    const opportunities = (result.opportunities || []).sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0));

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId, system: 'universal_builder', action: 'scan_industries_for_niches',
      status: 'success',
      summary: `Scanned ${industryList.length} industries, found ${opportunities.length} niche opportunities`,
      evidence: { focus_industry: focusIndustry, count: opportunities.length, top_score: opportunities[0]?.opportunity_score }
    });

    return Response.json({
      status: 'success',
      opportunities,
      scan_summary: result.scan_summary || '',
      industries_scanned: industryList
    });
  } catch (error) {
    console.error('scanIndustriesForNiches error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}