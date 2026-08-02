import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Autonomous Headless Scanner — runs continuously via a scheduled workflow.
// Iterates every generated Deliverable across all orgs (service role), finds
// ones that haven't been headless-tested recently, and runs a user-POV test
// on each from the client's perspective. Stores a QAReport per test.
// Capped at MAX_PER_RUN to stay within function time limits.

const MAX_PER_RUN = 8;
const RETEST_DAYS = 3;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Service role — no user context needed (this runs from a scheduled workflow)
    const deliverables = await base44.asServiceRole.entities.Deliverable.list('-created_date', 80);
    const existingReports = await base44.asServiceRole.entities.QAReport.filter({ check_type: 'headless_test' }, '-created_date', 100);

    // Map: target_id -> most recent test date
    const lastTested = {};
    for (const r of existingReports) {
      if (!r.target_id) continue;
      const d = new Date(r.created_date).getTime();
      if (!lastTested[r.target_id] || d > lastTested[r.target_id]) lastTested[r.target_id] = d;
    }

    const now = Date.now();
    const retestMs = RETEST_DAYS * 24 * 60 * 60 * 1000;
    const toTest = deliverables.filter(d => {
      if (!d.content || d.content.trim().length < 20) return false;
      const last = lastTested[d.id];
      if (!last) return true; // never tested
      return (now - last) > retestMs; // tested too long ago
    }).slice(0, MAX_PER_RUN);

    if (toTest.length === 0) {
      return Response.json({ status: 'success', scanned: 0, message: 'All deliverables up to date — no headless tests needed this run.' });
    }

    // Run tests in small batches to avoid overwhelming the LLM
    const BATCH = 3;
    const results = [];
    for (let i = 0; i < toTest.length; i += BATCH) {
      const batch = toTest.slice(i, i + BATCH);
      const batchResults = await Promise.all(batch.map(async (d) => {
        try {
          const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are the FaultLine AI Headless Test Engine. You simulate a client (the paying customer) interacting with a generated frontend + backend system from their perspective. Walk through the complete user journey step-by-step and report every place the system would fail, confuse, or frustrate the client.

SYSTEM UNDER TEST: ${d.title || 'Generated system'} (${d.deliverable_type})
SYSTEM CONTENT:
"""
${(d.content || '').substring(0, 12000)}
"""

Perform a thorough client-POV test:
1. Map the primary client journey (landing → onboarding → core value → results → ongoing use)
2. For EACH step evaluate: clarity, required states (loading/empty/error/success), dead-ends, accessibility, mobile, error handling, data validation
3. Test edge cases: empty data, long input, network failure, concurrent actions
4. Check backend assumptions: missing auth, unvalidated data, race conditions, no rate limiting
5. Report security issues visible from the client POV (data exposure, missing logout)

For each issue: severity (critical/high/medium/low), category (ux/accessibility/error-handling/backend/security/mobile), description, recommendation.
Compute a user-experience score (0-100) and status: passed (>=80, no critical), warnings (>=60, no critical), failed (<60 or any critical).
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

          await base44.asServiceRole.entities.QAReport.create({
            organization_id: d.organization_id,
            target_type: 'deliverable', target_id: d.id, target_title: d.title,
            check_type: 'headless_test',
            status: result.status || 'warnings',
            score: result.score || 0,
            issues: result.issues || [],
            summary: result.summary || '',
            recommendations: result.recommendations || [],
            auto_generated: true
          });
          return { target_id: d.id, title: d.title, score: result.score, status: result.status, issues: (result.issues || []).length };
        } catch (err) {
          return { target_id: d.id, title: d.title, error: err.message };
        }
      }));
      results.push(...batchResults);
    }

    const passed = results.filter(r => r.status === 'passed').length;
    const warned = results.filter(r => r.status === 'warnings').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const errors = results.filter(r => r.error).length;

    return Response.json({
      status: 'success',
      scanned: results.length,
      passed, warned, failed, errors,
      results
    });
  } catch (error) {
    console.error('autonomousHeadlessScan error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}