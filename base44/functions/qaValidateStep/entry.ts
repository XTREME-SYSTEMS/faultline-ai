import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// QA Validation — double-checks any generated step/output for problems, gaps,
// weaknesses, faults, and missing requirements. Can validate a Deliverable by
// id, or arbitrary content passed directly. Stores a QAReport record.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { target_type, target_id, content, title } = body;
    if (!target_type) return Response.json({ error: 'target_type is required' }, { status: 400 });

    let targetContent = content || '';
    let targetTitle = title || '';

    if (target_id && !targetContent) {
      try {
        const d = await base44.asServiceRole.entities.Deliverable.get(target_id);
        if (d && d.organization_id === orgId) {
          targetContent = d.content || '';
          targetTitle = d.title || '';
        }
      } catch (e) {
        return Response.json({ error: 'Deliverable not found' }, { status: 404 });
      }
    }

    if (!targetContent.trim()) return Response.json({ error: 'No content to validate — pass content or a valid deliverable target_id' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the FaultLine AI QA Validator. Your job is to rigorously double-check a generated output for problems, gaps, weaknesses, faults, and missing requirements. Be critical and thorough — assume there ARE issues until you've verified otherwise.

TARGET TYPE: ${target_type}
${targetTitle ? `TARGET TITLE: ${targetTitle}` : ''}

CONTENT TO VALIDATE:
"""
${targetContent.substring(0, 12000)}
"""

Check for ALL of the following and report every issue you find:
1. Logical gaps — missing steps, undefined terms, circular reasoning, unsupported claims
2. Factual weaknesses — unverified statistics, vague benchmarks, missing evidence
3. Completeness faults — sections that are stubs, placeholders, or too thin to be actionable
4. Consistency problems — contradictions between sections, mismatched numbers/names
5. Actionability gaps — recommendations without owners, timelines, or success metrics
6. Compliance/ethics issues — missing disclaimers, privacy gaps, regulatory blind spots
7. Quality faults — poor structure, unclear language, formatting problems

For each issue, assign a severity (critical/high/medium/low), a category, a clear description, and a specific recommendation to fix it.

Then compute an overall quality score (0-100) where 100 = flawless, and a status:
- "passed" if score >= 80 and no critical issues
- "warnings" if score >= 60 and no critical issues
- "failed" if score < 60 OR any critical issue exists

Also provide a concise summary and a list of top recommendations.`,
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

    const report = await base44.asServiceRole.entities.QAReport.create({
      organization_id: orgId,
      target_type, target_id: target_id || '', target_title: targetTitle,
      check_type: 'qa_validation',
      status: result.status || 'warnings',
      score: result.score || 0,
      issues: result.issues || [],
      summary: result.summary || '',
      recommendations: result.recommendations || [],
      auto_generated: !!body.auto
    });

    return Response.json({
      status: 'success',
      report_id: report.id,
      score: result.score, validation_status: result.status,
      summary: result.summary, issues: result.issues, recommendations: result.recommendations
    });
  } catch (error) {
    console.error('qaValidateStep error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}