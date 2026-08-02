import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Headless User-POV Testing — simulates a real user walking through a generated
// frontend/backend system and reports UX issues, broken flows, missing states,
// accessibility problems, and error-handling gaps. Since a Deno function cannot
// launch a real browser, this uses an AI-driven "headless" review: it models the
// user journey step-by-step and flags where the generated system would fail the
// user. Accepts a deliverable_id (fetches content) or direct content/description.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { target_id, content, title, user_persona } = body;

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

    if (!targetContent.trim()) return Response.json({ error: 'No content to test — pass content or a valid deliverable target_id' }, { status: 400 });

    const persona = user_persona || 'a first-time non-technical end user on mobile';

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the FaultLine AI Headless Test Engine. You simulate ${persona} interacting with a generated frontend + backend system. You walk through the complete user journey step-by-step and report every place the system would fail, confuse, or frustrate the user.

SYSTEM UNDER TEST: ${targetTitle || 'Generated system'}
SYSTEM DESCRIPTION/CONTENT:
"""
${targetContent.substring(0, 12000)}
"""

Perform a thorough user-POV test:
1. Map the primary user journey (landing → signup/onboarding → core action → completion)
2. For EACH step, evaluate:
   - Can the user figure out what to do? (clarity, affordances, instructions)
   - Does the flow have all required states? (loading, empty, error, success)
   - Are there dead-ends or broken paths?
   - Is it accessible? (contrast, text size, keyboard nav, screen-reader labels)
   - Does it work on mobile? (touch targets, layout, responsive)
   - Are errors handled gracefully with actionable messages?
   - Is data validation present on inputs?
3. Test edge cases: empty data, very long input, network failure, concurrent actions
4. Check backend assumptions: missing auth checks, unvalidated data, race conditions, no rate limiting
5. Report any security issues visible from the user POV (data exposure, missing logout, etc.)

For each issue found, assign severity (critical/high/medium/low), category (ux/accessibility/error-handling/backend/security/mobile), description, and recommendation.

Compute a user-experience score (0-100) and status:
- "passed" if score >= 80 and no critical issues
- "warnings" if score >= 60 and no critical issues
- "failed" if score < 60 OR any critical issue

Provide a summary of the simulated journey and top recommendations.`,
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
      target_type: 'deliverable', target_id: target_id || '', target_title: targetTitle,
      check_type: 'headless_test',
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
      score: result.score, test_status: result.status,
      summary: result.summary, issues: result.issues, recommendations: result.recommendations
    });
  } catch (error) {
    console.error('runHeadlessTest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}