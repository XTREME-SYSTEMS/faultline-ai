import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Unified deliverable generator. Compiles a company's security scan results,
// system clone, and findings into a professional, ready-to-send document.
// Types: client_proposal | website | brand | cost_roi | ai_operating_system

async function gatherCompanyContext(base44, orgId, companyId) {
  const company = await base44.asServiceRole.entities.Company.get(companyId);
  if (!company || company.organization_id !== orgId) throw new Error('Company not found');

  const [nodes, audits, snapshots] = await Promise.all([
    base44.asServiceRole.entities.SystemNode.filter({ organization_id: orgId, company_id: companyId }),
    base44.asServiceRole.entities.Audit.filter({ organization_id: orgId, company_id: companyId }),
    base44.asServiceRole.entities.ScanSnapshot.filter({ organization_id: orgId, company_id: companyId }, '-scanned_at', 1)
  ]);

  let allFindings = [];
  for (const a of audits) {
    const fs = await base44.asServiceRole.entities.Finding.filter({ organization_id: orgId, audit_id: a.id });
    allFindings = allFindings.concat(fs);
  }

  const healthScore = snapshots[0]?.health_score ?? 0;
  const critical = allFindings.filter(f => f.severity === 'critical').length;
  const high = allFindings.filter(f => f.severity === 'high').length;
  const leakPoints = nodes.reduce((s, n) => s + (n.leak_points?.length || 0), 0);

  const findingsSummary = allFindings.slice(0, 12).map(f =>
    `- [${f.severity}] ${f.title} (${f.category || 'general'}): ${f.business_impact || ''} → Repair: ${f.recommended_repair || ''}`
  ).join('\n');

  const systemsSummary = nodes.map(n =>
    `- ${n.name} (${n.node_type}, health: ${n.health_status || 'unknown'}). Leaks: ${(n.leak_points || []).join('; ')}. AI enhancement: ${n.ai_enhancement || 'none'}`
  ).join('\n');

  return { company, nodes, audits, findings: allFindings, healthScore, critical, high, leakPoints, findingsSummary, systemsSummary };
}

const PROMPTS = {
  client_proposal: (ctx) => `You are the FaultLine AI proposal writer. Compile the security scan results and system cloning analysis below into a complete, professional, ready-to-send client proposal in markdown.

COMPANY: ${ctx.company.name} (${ctx.company.industry || 'unknown industry'}, ${ctx.company.domain || 'no domain'})

CURRENT SECURITY POSTURE:
- Health Score: ${ctx.healthScore}/100
- Total Findings: ${ctx.findings.length} (${ctx.critical} critical, ${ctx.high} high)
- Systems Mapped: ${ctx.nodes.length}
- Leak Points: ${ctx.leakPoints}

KEY FINDINGS:
${ctx.findingsSummary || '(none)'}

SYSTEM CLONE / MAP:
${ctx.systemsSummary || '(none)'}

Write a polished, client-ready proposal with these sections:
# ${ctx.company.name} — Security & AI Enhancement Proposal
## Executive Summary
## Current Security Posture
## Identified Vulnerabilities & Business Impact
## System Map & Leak Points
## Proposed AI Enhancements
## Investment & Pricing (itemized: remediation, enhancements, monitoring, implementation)
## Recommended Plan (Growth $299/mo or Operating System $699/mo)
## Implementation Timeline (30/60/90 days)
## Next Steps

Be specific, evidence-based, and professional. Use the real numbers above.`,

  website: (ctx) => `You are a senior web designer and copywriter. Generate a complete, production-ready website for the client based on their security profile and industry. Output as a single self-contained HTML document with inline CSS (no external dependencies).

COMPANY: ${ctx.company.name} (${ctx.company.industry || 'unknown'}, ${ctx.company.domain || 'no domain'})
HEALTH SCORE: ${ctx.healthScore}/100
KEY FINDINGS TO ADDRESS: ${ctx.findingsSummary || '(none)'}
SYSTEMS: ${ctx.systemsSummary || '(none)'}

Generate a modern, responsive, conversion-focused website with:
1. Hero section with compelling headline and CTA
2. Services/solutions section (3-6 offerings tailored to their industry)
3. Trust/credibility section
4. About section
5. Contact section with form markup
Use a clean, professional design with a cohesive color palette. Write all copy — no placeholders. Output ONLY the HTML document.`,

  brand: (ctx) => `You are a brand strategist. Generate a complete rebranding system for the client based on their industry and security profile. Return JSON.

COMPANY: ${ctx.company.name} (${ctx.company.industry || 'unknown'})
INDUSTRY: ${ctx.company.industry || 'general'}

Generate a brand identity system:
1. brand_name: A refined brand name (can keep current if strong)
2. tagline: A memorable tagline
3. mission: A one-sentence mission statement
4. color_palette: Array of 5 hex colors with names and usage
5. typography: { heading_font, body_font, rationale }
6. voice_and_tone: 3-4 bullet guidelines
7. messaging_pillars: Array of 3 core messages
8. logo_concept: A text description of a logo concept
9. brand_story: A 2-3 sentence origin story
10. competitive_positioning: One sentence`,

  cost_roi: (ctx) => `You are a financial analyst and ROI strategist. Generate a detailed cost and ROI analysis for the client's security and AI enhancement program. Return JSON.

COMPANY: ${ctx.company.name} (${ctx.company.industry || 'unknown'})
CURRENT STATE:
- Health Score: ${ctx.healthScore}/100
- Findings: ${ctx.findings.length} (${ctx.critical} critical, ${ctx.high} high)
- Systems: ${ctx.nodes.length}
- Leak Points: ${ctx.leakPoints}

Generate:
1. cost_breakdown: object with line items (security_remediation, ai_enhancements, ongoing_monitoring_monthly, implementation, training) as numbers in USD
2. one_time_total: number
3. annual_total: number (including 12 months monitoring)
4. roi_projection: object with { revenue_recovered_annual, efficiency_gains_annual, risk_reduction_value, total_annual_benefit, net_roi_percentage, payback_months }
5. recommended_plan: "Growth Plan ($299/mo)" or "Operating System Plan ($699/mo)"
6. roi_narrative: A 3-4 sentence executive summary of the financial case
Base numbers on the actual finding/system counts. Be realistic and defensible.`,

  ai_operating_system: (ctx) => `You are an AI operations architect. Generate a complete AI-enhanced operating system for the client — transforming their current systems into an AI-powered operating model. Output as markdown.

COMPANY: ${ctx.company.name} (${ctx.company.industry || 'unknown'})
CURRENT SYSTEMS:
${ctx.systemsSummary || '(none)'}
KEY LEAKS TO FIX:
${ctx.findingsSummary || '(none)'}

Generate a comprehensive AI-enhanced operating system document:
# ${ctx.company.name} — AI-Enhanced Operating System
## Operating Model Overview
## AI-Powered Workflows (for each major system: before → after with AI)
## Automation Architecture (what automates what, which AI agents)
## Data & Integration Layer
## Roles & AI Augmentation (how each role is enhanced)
## Governance & Guardrails
## Implementation Roadmap (30/60/90 days)
## Expected Outcomes & KPIs
Be specific and actionable, referencing the actual systems and leaks above.`
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { company_id, deliverable_type } = body;
    if (!company_id) return Response.json({ error: 'company_id required' }, { status: 400 });
    if (!PROMPTS[deliverable_type]) return Response.json({ error: 'Invalid deliverable_type' }, { status: 400 });

    const ctx = await gatherCompanyContext(base44, orgId, company_id);

    const isJson = deliverable_type === 'brand' || deliverable_type === 'cost_roi';
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: PROMPTS[deliverable_type](ctx),
      ...(isJson ? { response_json_schema: { type: 'object', additionalProperties: true } } : {})
    });

    // Normalize to a markdown/text content string + metadata
    let content = '';
    let metadata = {};
    if (isJson && typeof llmResponse === 'object') {
      content = JSON.stringify(llmResponse, null, 2);
      metadata = llmResponse;
    } else {
      content = typeof llmResponse === 'string' ? llmResponse : JSON.stringify(llmResponse, null, 2);
    }

    // Upload as a downloadable file
    const ext = deliverable_type === 'website' ? 'html' : 'md';
    const fileName = `faultline-${deliverable_type}-${ctx.company.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.${ext}`;
    const fileBlob = new Blob([content], { type: ext === 'html' ? 'text/html' : 'text/markdown' });
    const file = new File([fileBlob], fileName, { type: ext === 'html' ? 'text/html' : 'text/markdown' });
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    const fileUrl = uploadResult.file_url;

    const titles = {
      client_proposal: `Client Proposal — ${ctx.company.name}`,
      website: `Website — ${ctx.company.name}`,
      brand: `Brand System — ${ctx.company.name}`,
      cost_roi: `Cost & ROI Analysis — ${ctx.company.name}`,
      ai_operating_system: `AI Operating System — ${ctx.company.name}`
    };

    const record = await base44.asServiceRole.entities.Deliverable.create({
      organization_id: orgId,
      company_id,
      deliverable_type,
      title: titles[deliverable_type],
      content,
      file_url: fileUrl,
      metadata,
      status: 'generated'
    });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'deliverable_studio',
      action: `generate_${deliverable_type}`,
      status: 'success',
      summary: `Generated ${deliverable_type} deliverable for ${ctx.company.name}`,
      evidence: { company_id, deliverable_id: record.id, file_url: fileUrl }
    });

    // ===== QA GATE — double-check every generated output before presenting to client =====
    let qaResult = null;
    let qaStatus = 'passed';
    try {
      qaResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are the FaultLine AI QA Validator. Rigorously double-check this generated ${deliverable_type} for problems, gaps, weaknesses, faults, and missing requirements before it is presented to the client. Be critical — assume there ARE issues until verified.

TARGET TYPE: ${deliverable_type}
TITLE: ${titles[deliverable_type]}

CONTENT:
"""
${content.substring(0, 12000)}
"""

Check for: logical gaps, factual weaknesses, incomplete/stub sections, consistency problems, actionability gaps (missing owners/timelines/metrics), compliance/ethics issues, and quality faults.
For each issue: severity (critical/high/medium/low), category, description, recommendation.
Compute a score (0-100) and status: passed (>=80, no critical), warnings (>=60, no critical), failed (<60 or any critical).
Provide a summary and top recommendations.`,
        response_json_schema: {
          type: 'object',
          properties: {
            score: { type: 'number' },
            status: { type: 'string', enum: ['passed', 'failed', 'warnings'] },
            summary: { type: 'string' },
            issues: { type: 'array', items: { type: 'object', properties: {
              severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
              category: { type: 'string' },
              description: { type: 'string' },
              recommendation: { type: 'string' }
            } } },
            recommendations: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      qaStatus = qaResult.status || 'warnings';
      await base44.asServiceRole.entities.QAReport.create({
        organization_id: orgId,
        target_type: 'deliverable', target_id: record.id, target_title: titles[deliverable_type],
        check_type: 'qa_validation',
        status: qaStatus,
        score: qaResult.score || 0,
        issues: qaResult.issues || [],
        summary: qaResult.summary || '',
        recommendations: qaResult.recommendations || [],
        auto_generated: true
      });

      const finalStatus = qaStatus === 'failed' ? 'needs_revision' : 'qa_passed';
      await base44.asServiceRole.entities.Deliverable.update(record.id, { status: finalStatus });
    } catch (e) {
      console.error('QA gate error:', e);
    }

    return Response.json({
      status: 'success',
      deliverable_id: record.id,
      deliverable_type,
      title: titles[deliverable_type],
      file_url: fileUrl,
      content: content.substring(0, 500),
      metadata,
      qa: qaResult ? { score: qaResult.score, status: qaStatus, issues: qaResult.issues, summary: qaResult.summary } : null
    });
  } catch (error) {
    console.error('generateDeliverable error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}