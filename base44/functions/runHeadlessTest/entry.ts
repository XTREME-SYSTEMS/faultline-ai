import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Headless User-POV Testing — simulates a real user operating the entire system
// end-to-end: navigating pages, filling forms, typing into inputs, scrolling,
// clicking buttons, and completing full flows. Since a Deno function cannot
// launch a real browser, this uses an AI-driven simulation that models each
// interaction step-by-step and reports UX issues, broken flows, missing states,
// accessibility problems, and error-handling gaps.
//
// Accepts:
//   - target_id (fetches a Deliverable's content), OR direct content/title
//   - interactions: an array of steps to simulate, each { action, ... }
//       actions: navigate | fill | type | scroll | click | wait | verify
//   - user_persona: who the simulated user is
//   - flow_goal: what the user is trying to accomplish end-to-end

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { target_id, content, title, user_persona, interactions, flow_goal } = body;

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

    if (!targetContent.trim() && !interactions) {
      return Response.json({ error: 'No content to test — pass content, a valid deliverable target_id, or an interactions script' }, { status: 400 });
    }

    const persona = user_persona || 'a first-time non-technical end user on mobile';
    const goal = flow_goal || 'complete the primary action successfully end-to-end';

    // Build the interaction script description. If the caller provided explicit
    // interactions (navigate/fill/type/scroll/click), describe them so the LLM
    // simulates each one. Otherwise let the LLM map the journey itself.
    let interactionScript = '';
    if (interactions && Array.isArray(interactions) && interactions.length > 0) {
      interactionScript = interactions.map((step, i) => {
        const a = step.action || 'step';
        const detail = [
          step.url ? `url: ${step.url}` : '',
          step.selector ? `target: ${step.selector}` : '',
          step.value !== undefined ? `value: "${step.value}"` : '',
          step.text ? `text: "${step.text}"` : '',
          step.direction ? `direction: ${step.direction}` : '',
          step.expectation ? `expect: ${step.expectation}` : ''
        ].filter(Boolean).join(', ');
        return `${i + 1}. ${a} — ${detail || '(no detail)'}`;
      }).join('\n');
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the FaultLine AI Headless Test Engine. You simulate ${persona} operating a generated frontend + backend system END-TO-END. You can navigate through pages, fill forms, type into inputs, scroll, click buttons, and verify outcomes — exactly like a real user driving the whole system.

SYSTEM UNDER TEST: ${targetTitle || 'Generated system'}
USER GOAL: ${goal}

SYSTEM DESCRIPTION/CONTENT:
"""
${targetContent.substring(0, 10000)}
"""

${interactionScript ? `INTERACTION SCRIPT (simulate each step in order):\n${interactionScript}\n` : 'Map the primary user journey yourself (landing → signup/onboarding → core action → completion).'}

Perform a thorough end-to-end user-POV test by simulating EVERY interaction:
1. For EACH step in the journey (or script), act it out as the user and evaluate:
   - NAVIGATE: Does the page load? Is the route reachable? Are there broken links/404s?
   - FILL/TYPE: Can the user figure out what to enter? Is there validation? Are errors clear? Does the field accept the input?
   - SCROLL: Is all content reachable by scroll? Are there infinite-scroll or lazy-load failures? Is important content below the fold without cues?
   - CLICK: Does the button do what it says? Are there dead buttons? Does it show a loading state? Does it lead to the right next step?
   - VERIFY: Did the step achieve its expected outcome? Is there confirmation feedback?
2. For each step check: required states (loading, empty, error, success), dead-ends, broken paths, accessibility (contrast, text size, keyboard nav, screen-reader labels), mobile (touch targets, layout, responsive), error handling, and data validation.
3. Test edge cases at each step: empty data, very long input, network failure, concurrent actions, browser back button.
4. Check backend assumptions visible from the user POV: missing auth checks, unvalidated data, race conditions, no rate limiting, data exposure.
5. End with a verdict: did the user achieve the goal end-to-end? Where did the flow break?

For each issue found, assign severity (critical/high/medium/low), category (ux/accessibility/error-handling/backend/security/mobile/navigation/form-validation), the step where it occurred, description, and recommendation.

Compute a user-experience score (0-100) and status:
- "passed" if score >= 80 and no critical issues
- "warnings" if score >= 60 and no critical issues
- "failed" if score < 60 OR any critical issue

Provide a step-by-step summary of the simulated journey, where it broke (if anywhere), and top recommendations.`,
      response_json_schema: {
        type: 'object',
        properties: {
          score: { type: 'number' },
          status: { type: 'string', enum: ['passed', 'failed', 'warnings'] },
          goal_achieved: { type: 'boolean' },
          summary: { type: 'string' },
          issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                category: { type: 'string' },
                step: { type: 'string' },
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
      score: result.score,
      test_status: result.status,
      goal_achieved: result.goal_achieved,
      summary: result.summary,
      issues: result.issues,
      recommendations: result.recommendations
    });
  } catch (error) {
    console.error('runHeadlessTest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}