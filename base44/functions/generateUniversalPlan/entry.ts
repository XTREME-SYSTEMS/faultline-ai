import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Universal Builder — takes a user/client idea (+ optional company context),
// runs AI research with web search, and generates a branded, exhaustive master
// plan plus 8 asset packs (logo, brand, web, lead-gen, social, security,
// financial, automation). Stores every output as a Deliverable record.

const PACKS = [
  { key: 'logo_pack', title: 'Logo Pack' },
  { key: 'brand_pack', title: 'Brand Pack' },
  { key: 'web_pack', title: 'Web Pack' },
  { key: 'lead_gen_pack', title: 'Lead Gen Pack' },
  { key: 'social_media_pack', title: 'Social Media Pack' },
  { key: 'security_pack', title: 'Security Pack' },
  { key: 'financial_pack', title: 'Financial Pack' },
  { key: 'automation_pack', title: 'Automation & Workflow Pack' }
];

async function gatherCompanyContext(base44, orgId, companyId) {
  if (!companyId) return null;
  const company = await base44.asServiceRole.entities.Company.get(companyId);
  if (!company || company.organization_id !== orgId) throw new Error('Company not found');
  const [nodes, audits, snapshots] = await Promise.all([
    base44.asServiceRole.entities.SystemNode.filter({ organization_id: orgId, company_id: companyId }),
    base44.asServiceRole.entities.Audit.filter({ organization_id: orgId, company_id: companyId }),
    base44.asServiceRole.entities.ScanSnapshot.filter({ organization_id: orgId, company_id: companyId }, '-scanned_at', 1)
  ]);
  let findings = [];
  for (const a of audits) {
    const fs = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId, audit_id: a.id });
    findings = findings.concat(fs);
  }
  return {
    company,
    healthScore: snapshots[0]?.health_score ?? 0,
    findingsCount: findings.length,
    systemsCount: nodes.length,
    systemsSummary: nodes.map(n => `${n.name} (${n.node_type})`).join(', '),
    findingsSummary: findings.slice(0, 8).map(f => `[${f.severity}] ${f.title}`).join('; ')
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { idea, company_id } = body;
    if (!idea || !idea.trim()) return Response.json({ error: 'idea is required' }, { status: 400 });

    const ctx = await gatherCompanyContext(base44, orgId, company_id);
    const companyContext = ctx ? `
EXISTING COMPANY CONTEXT:
- Company: ${ctx.company.name} (${ctx.company.industry || 'unknown'})
- Domain: ${ctx.company.domain || 'unknown'}
- Current Health Score: ${ctx.healthScore}/100
- Findings: ${ctx.findingsCount}
- Systems Mapped: ${ctx.systemsCount} (${ctx.systemsSummary})
- Key Findings: ${ctx.findingsSummary || 'none'}` : '';

    // STEP 1 — Research with web search
    const research = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the FaultLine AI Universal Builder engine. A user has submitted an idea for a business, product, or system. Research it exhaustively and return a structured analysis.

USER/CLIENT IDEA:
"${idea}"
${companyContext}

Research and return ALL of the following:
 1. idea_summary — a refined summary of the idea and its core value proposition
 2. top_3_benchmark_systems — the 3 leading companies/systems doing this today: for each {name, url, strengths, weaknesses, processes, what_we_can_learn, benchmark_metrics} where benchmark_metrics lists the key performance metrics they achieve (efficiency %, avg cost, accuracy %, speed, customer satisfaction)
 3. cost_roi — {estimated_startup_cost, estimated_monthly_cost, projected_annual_revenue, roi_percentage, payback_months}
 4. brand_recommendations — 3 brand directions: for each {name, tagline, color_palette (5 hex), rationale}
 5. pitfalls — array of possible pitfalls to avoid
 6. industry_issues_and_fixes — array of {issue, fix} for typical industry problems
 7. best_security_measures — array of recommended security measures
 8. ai_enhancements — array of all AI enhancements applicable {name, description, impact}
 9. comparison — {their_system_summary, our_enhanced_system_summary, key_improvements (array), improvement_percentages} where improvement_percentages shows how much better our system is vs benchmarks on each key metric (MUST be at least 20% on every metric)
 10. social_media_insights — {customer_reviews_summary, customer_needs, customer_wants, common_complaints, niche_identifier}
 11. industry_trends — array of current trends in this industry
 12. clone_combine_strategy — how to clone the top 3 systems' strengths, fix their weaknesses, and combine into one superior system
 13. exhaustive_plan — a full markdown master plan with sections: Executive Summary, Market Analysis, Competitive Landscape, System Architecture, AI Enhancement Roadmap, Security Plan, Brand Strategy, Financial Projections, Implementation Timeline (30/60/90), Go-to-Market, Risk Mitigation

MANDATORY 20% BETTER RULE: The system you design MUST be at least 20% better than the top 3 benchmark systems on EVERY key metric (efficiency, cost, accuracy, speed, customer experience). In the comparison.improvement_percentages object, list each metric with the % improvement — none may be below 20%. In the clone_combine_strategy and exhaustive_plan, explicitly state how each 20%+ improvement is achieved. If a benchmark cannot be beaten by 20% on a metric, identify a new metric where you CAN beat them by 20%+ and make that a core differentiator.

Be specific, evidence-based, and exhaustive. Use real benchmark companies.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          idea_summary: { type: 'string' },
          top_3_benchmark_systems: { type: 'array', items: { type: 'object', additionalProperties: true } },
          cost_roi: { type: 'object', additionalProperties: true },
          brand_recommendations: { type: 'array', items: { type: 'object', additionalProperties: true } },
          pitfalls: { type: 'array', items: { type: 'string' } },
          industry_issues_and_fixes: { type: 'array', items: { type: 'object', additionalProperties: true } },
          best_security_measures: { type: 'array', items: { type: 'string' } },
          ai_enhancements: { type: 'array', items: { type: 'object', additionalProperties: true } },
          comparison: { type: 'object', additionalProperties: true, properties: { improvement_percentages: { type: 'object', additionalProperties: true } } },
          social_media_insights: { type: 'object', additionalProperties: true },
          industry_trends: { type: 'array', items: { type: 'string' } },
          clone_combine_strategy: { type: 'string' },
          exhaustive_plan: { type: 'string' }
        }
      }
    });

    // STEP 2 — Generate the 8 asset packs AND the logo image in parallel
    const brandRec = research.brand_recommendations?.[0] || {};
    const palette = (brandRec.color_palette || ['#C89B3C', '#1a1a1a', '#ffffff']).join(', ');

    const [packsResponse, logoResult] = await Promise.all([
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the FaultLine AI asset pack generator. Based on the research below, generate 8 ready-to-use asset packs as markdown documents. Each pack must be detailed, actionable, and branded for a FaultLine AI client.

RESEARCH:
${JSON.stringify(research).substring(0, 8000)}

Generate these 8 packs (each a complete markdown document):
- logo_pack: logo concepts, usage guidelines, color-matched logo descriptions for 3 variations
- brand_pack: full brand identity — voice, tone, messaging pillars, color palette, typography, brand story
- web_pack: website structure, page-by-page copy outline, SEO keywords, CTA strategy
- lead_gen_pack: lead magnet ideas, landing page copy, email sequence (5 emails), qualification criteria
- social_media_pack: 30-day content calendar, platform strategy, post templates, hashtag sets
- security_pack: security policy, access control plan, incident response, compliance checklist
- financial_pack: P&L projection (12 months), pricing tiers, unit economics, funding requirements
- automation_pack: workflow automations, integration map, AI agent assignments, SOPs

Return a JSON object with one key per pack, each containing the full markdown content.`,
        response_json_schema: {
          type: 'object',
          properties: {
            logo_pack: { type: 'string' },
            brand_pack: { type: 'string' },
            web_pack: { type: 'string' },
            lead_gen_pack: { type: 'string' },
            social_media_pack: { type: 'string' },
            security_pack: { type: 'string' },
            financial_pack: { type: 'string' },
            automation_pack: { type: 'string' }
          }
        }
      }),
      base44.asServiceRole.integrations.Core.GenerateImage({
        prompt: `A professional, modern logo for "${brandRec.name || 'the client'}". Tagline: "${brandRec.tagline || ''}". Color palette: ${palette}. Clean, minimal, scalable, on white background. Suitable for a tech/AI company. High quality vector style.`
      })
    ]);

    // STEP 3 — Upload master plan + 8 packs in parallel, then bulkCreate all deliverables
    const baseTitle = ctx ? ctx.company.name : (brandRec.name || idea.substring(0, 40));

    const planBlob = new Blob([research.exhaustive_plan || ''], { type: 'text/markdown' });
    const planFile = new File([planBlob], `universal-plan-${Date.now()}.md`, { type: 'text/markdown' });

    const packUploads = await Promise.all(PACKS.map(pack => {
      const content = packsResponse[pack.key] || '';
      const blob = new Blob([content], { type: 'text/markdown' });
      const file = new File([blob], `${pack.key}-${Date.now()}.md`, { type: 'text/markdown' });
      return base44.asServiceRole.integrations.Core.UploadFile({ file });
    }));
    const planUpload = await base44.asServiceRole.integrations.Core.UploadFile({ file: planFile });

    const brandJson = JSON.stringify({ brand_recommendations: research.brand_recommendations, ...brandRec }, null, 2);

    const records = [
      {
        organization_id: orgId, company_id: company_id || '',
        deliverable_type: 'client_proposal', title: `Universal Master Plan — ${baseTitle}`,
        content: research.exhaustive_plan || '', file_url: planUpload.file_url,
        metadata: { source: 'universal_builder', idea, research_summary: research.idea_summary }, status: 'generated'
      },
      {
        organization_id: orgId, company_id: company_id || '',
        deliverable_type: 'brand', title: `Brand System — ${baseTitle}`,
        content: brandJson, file_url: logoResult.url,
        metadata: { source: 'universal_builder', logo_url: logoResult.url, ...brandRec }, status: 'generated'
      },
      ...PACKS.map((pack, i) => ({
        organization_id: orgId, company_id: company_id || '',
        deliverable_type: 'client_proposal', title: `${pack.title} — ${baseTitle}`,
        content: packsResponse[pack.key] || '', file_url: packUploads[i].file_url,
        metadata: { source: 'universal_builder', pack: pack.key, idea }, status: 'generated'
      }))
    ];

    const created = await base44.asServiceRole.entities.Deliverable.bulkCreate(records);

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId, system: 'universal_builder', action: 'generate_universal_plan',
      status: 'success',
      summary: `Generated universal plan + 8 asset packs for idea: "${idea.substring(0, 60)}"`,
      evidence: { idea, company_id: company_id || '', deliverable_count: created.length, logo_url: logoResult.url }
    });

    return Response.json({
      status: 'success',
      idea,
      research,
      logo_url: logoResult.url,
      deliverables: created.map(d => ({ id: d.id, title: d.title, file_url: d.file_url, deliverable_type: d.deliverable_type })),
      deliverable_count: created.length
    });
  } catch (error) {
    console.error('generateUniversalPlan error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}