import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { extractData, fetchPage, detectTechStack, calcHealthScore } from '../../shared/scraper.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found on user profile' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const companyId = body.company_id;
    if (!companyId) return Response.json({ error: 'company_id required' }, { status: 400 });

    const company = await base44.asServiceRole.entities.Company.get(companyId);
    if (!company || company.organization_id !== orgId) return Response.json({ error: 'Company not found' }, { status: 404 });

    // Phase 1: Discover competitors via web search
    const competitorRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Find 3 real competitor companies to "${company.name}" in the ${company.industry || 'general'} industry. For each, provide the company name and their website URL. Return only companies with real, accessible websites.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          competitors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                url: { type: 'string' }
              }
            }
          }
        }
      }
    });

    const competitors = (competitorRes.competitors || []).slice(0, 3);

    // Phase 2: Scan each competitor's homepage in parallel
    const scanResults = await Promise.all(competitors.map(async (comp) => {
      const pageResult = await fetchPage(comp.url);
      if (!pageResult.ok) return { name: comp.name, url: comp.url, ok: false, score: 0, findings: [] };
      const extracted = extractData(pageResult.html, comp.url);
      const techStack = detectTechStack(pageResult.html);

      // Quick LLM analysis for benchmark score
      const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Quickly analyze this website for ${comp.name} (${comp.url}). Score it 0-100 on positioning, conversion, trust, and technical quality.

Extracted data: ${JSON.stringify(extracted)}
Tech stack: ${techStack.join(', ')}

Return a score (0-100) and 3-5 key strengths/weaknesses.`,
        response_json_schema: {
          type: 'object',
          properties: {
            score: { type: 'number' },
            notes: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      return {
        name: comp.name,
        url: comp.url,
        ok: true,
        score: analysis.score || 0,
        tech_stack: techStack,
        notes: analysis.notes || [],
        extracted: { wordCount: extracted.wordCount, hasAnalytics: extracted.hasAnalytics, trustSignals: extracted.trustSignals, ctaCount: extracted.ctaCount }
      };
    }));

    // Phase 3: Store benchmark data on company
    const competitorScores = {};
    for (const r of scanResults) {
      competitorScores[r.name] = { url: r.url, score: r.score, tech_stack: r.tech_stack, notes: r.notes };
    }

    await base44.asServiceRole.entities.Company.update(companyId, { competitor_scores: competitorScores });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'scanner',
      action: 'scan_competitors',
      status: 'success',
      summary: `Benchmarked ${company.name} against ${scanResults.length} competitors`,
      evidence: { company_id: companyId, competitors: scanResults.map(r => ({ name: r.name, url: r.url, score: r.score })) }
    });

    return Response.json({ status: 'success', company_id: companyId, competitors: scanResults });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}