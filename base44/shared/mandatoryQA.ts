// Mandatory QA Gate — the single source of truth for validating ANY generated
// output before it reaches a client or external party. Every generation function
// (emails, reports, proposals, repair plans, deliverables) calls this before
// returning its result. If the gate fails (critical issues), the caller marks the
// output as 'needs_revision' and blocks client delivery.
//
// Returns: { status, score, issues, summary, recommendations, report_id, passed }

export async function runMandatoryQA(base44, orgId, opts) {
  const { target_type, target_id, target_title, content, auto = true } = opts;
  if (!content || !content.trim()) {
    return { status: 'skipped', score: 0, issues: [], summary: 'No content to validate', recommendations: [], report_id: null, passed: true };
  }

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `You are the FaultLine AI Mandatory QA Validator. Your job is to rigorously double-check a generated output BEFORE anyone — client, operator, or external party — sees the final product. Be critical and thorough. Assume there ARE issues until you've verified otherwise. This is a mandatory gate: if you find critical issues, the output will be blocked from delivery.

TARGET TYPE: ${target_type || 'general'}
${target_title ? `TARGET TITLE: ${target_title}` : ''}

CONTENT TO VALIDATE:
"""
${content.substring(0, 12000)}
"""

Check for ALL of the following and report every issue:
1. Logical gaps — missing steps, undefined terms, circular reasoning, unsupported claims
2. Factual weaknesses — unverified statistics, vague benchmarks, missing evidence, false claims
3. Completeness faults — stubs, placeholders, or sections too thin to be actionable
4. Consistency problems — contradictions between sections, mismatched numbers/names
5. Actionability gaps — recommendations without owners, timelines, or success metrics
6. Compliance/ethics — missing disclaimers, privacy gaps, regulatory blind spots, misleading claims
7. Deliverability faults (for emails) — broken subject, missing CTA, overly salesy tone, no opt-out, spam-trigger phrases, false urgency
8. Quality faults — poor structure, unclear language, formatting problems

For each issue, assign severity (critical/high/medium/low), category, description, and a specific recommendation.

Compute an overall quality score (0-100) and status:
- "passed" if score >= 80 and no critical issues
- "warnings" if score >= 60 and no critical issues
- "failed" if score < 60 OR any critical issue exists

Provide a concise summary and top recommendations.`,
    response_json_schema: {
      type: 'object',
      properties: {
        score: { type: 'number' },
        status: { type: 'string', enum: ['passed', 'failed', 'warnings'] },
        summary: { type: 'string' },
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
              category: { type: 'string' },
              description: { type: 'string' },
              recommendation: { type: 'string' }
            }
          }
        },
        recommendations: { type: 'array', items: { type: 'string' } }
      }
    }
  });

  const status = result.status || 'warnings';
  const report = await base44.asServiceRole.entities.QAReport.create({
    organization_id: orgId,
    target_type: target_type || 'general',
    target_id: target_id || '',
    target_title: target_title || '',
    check_type: 'qa_validation',
    status,
    score: result.score || 0,
    issues: result.issues || [],
    summary: result.summary || '',
    recommendations: result.recommendations || [],
    auto_generated: auto
  });

  return {
    status,
    score: result.score || 0,
    issues: result.issues || [],
    summary: result.summary || '',
    recommendations: result.recommendations || [],
    report_id: report.id,
    passed: status === 'passed' || status === 'warnings'
  };
}