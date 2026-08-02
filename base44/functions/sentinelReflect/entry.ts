import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { test_result, flow_goal, failures } = body;

    if (!test_result && !failures) {
      return Response.json({ error: 'test_result or failures required' }, { status: 400 });
    }

    // Use LLM to perform root-cause analysis on the failed headless test
    const reflection = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the FaultLine AI Sentinel self-reflection engine. A headless test sweep was run and produced failures. Your job is to perform root-cause analysis and produce specific, actionable fix recommendations.

FLOW GOAL: ${flow_goal || 'system-wide headless sweep'}

TEST RESULT:
${JSON.stringify(test_result || failures, null, 2)}

Perform a rigorous self-reflection:
1. For each failure, identify the ROOT CAUSE — not just the symptom. Was it a missing import? A broken route? An unhandled null? A failed API call? A missing entity field?
2. For each root cause, produce a SPECIFIC fix recommendation in the format: "File: <path> — Issue: <description> — Fix: <exact change needed>"
3. Identify any patterns across failures (e.g., multiple failures from the same root cause)
4. Rate your confidence in each diagnosis (high/medium/low)
5. Produce a prioritized action list — most critical fixes first

Be specific and technical. Do not give generic advice — give exact file paths and exact changes.`,
      response_json_schema: {
        type: 'object',
        properties: {
          root_causes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                failure: { type: 'string' },
                root_cause: { type: 'string' },
                file_path: { type: 'string' },
                fix_recommendation: { type: 'string' },
                confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                priority: { type: 'number' }
              }
            }
          },
          patterns: { type: 'array', items: { type: 'string' } },
          prioritized_actions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string' },
                file: { type: 'string' },
                priority: { type: 'number' }
              }
            }
          },
          summary: { type: 'string' }
        }
      }
    });

    // Persist the reflection as a QAReport
    const qaReport = await base44.asServiceRole.entities.QAReport.create({
      organization_id: orgId,
      target_type: 'system',
      target_title: `Sentinel Self-Reflection — ${flow_goal || 'headless sweep'}`,
      check_type: 'headless_test',
      status: (reflection.root_causes || []).length === 0 ? 'passed' : 'warnings',
      score: Math.max(0, 100 - (reflection.root_causes || []).length * 10),
      issues: (reflection.root_causes || []).map(rc => ({
        severity: rc.priority <= 2 ? 'critical' : rc.priority <= 4 ? 'high' : 'medium',
        category: 'Headless Test Failure',
        description: `${rc.failure}: ${rc.root_cause}`,
        recommendation: `${rc.file_path}: ${rc.fix_recommendation}`
      })),
      summary: reflection.summary || `Self-reflection complete: ${(reflection.root_causes || []).length} root causes identified`,
      recommendations: (reflection.prioritized_actions || []).map(a => `${a.file}: ${a.action}`),
      auto_generated: true
    });

    return Response.json({
      status: 'success',
      qa_report_id: qaReport.id,
      root_causes: reflection.root_causes || [],
      patterns: reflection.patterns || [],
      prioritized_actions: reflection.prioritized_actions || [],
      summary: reflection.summary
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}