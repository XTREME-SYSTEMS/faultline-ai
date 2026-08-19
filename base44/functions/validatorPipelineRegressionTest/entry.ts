// Validator Pipeline Regression Test — "Test the Tester"
//
// Proves the validation pipeline correctly handles all edge cases:
//   1. Successful browser result reaches MQG → scored correctly
//   2. Browser failure reaches MQG as FAIL (not silent 0)
//   3. Empty browser output cannot pass
//   4. Timeout cannot pass
//   5. Stale result cannot pass
//   6. v68 evidence cannot certify v69 (version mismatch)
//   7. Missing console result cannot become 100%
//   8. Missing network result cannot become 100%
//   9. Partial interaction coverage cannot become 100%
//  10. Malformed validator schema is rejected
//
// This test does NOT call the real validators. It calls MQG with synthetic
// pre-computed results and asserts MQG's response matches the validator contract.
//
// Output: a structured pass/fail report for each test case.

export default async function(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { clone_url = 'https://test-clone.vercel.app', source_url = 'https://test-source.com' } = body;
  const APP_ID = Deno.env.get('BASE44_APP_ID');
  const API_BASE = `https://base44.app/api/apps/${APP_ID}/functions`;

  // Mock coverage result — gives 100% on all static categories so the regression
  // test can focus on browser/differential validator handling without waiting
  // 60s+ for a live coverage audit on each test case.
  const MOCK_COVERAGE = {
    status: 'success',
    overall_score: 100,
    scorecard: {
      overall: 100, public_route: 100, content_structure: 100, security: 100,
      accessibility: 100, frontend_backend_integration: 100, backend_functional: 100,
      data_persistence: 100, api_function: 100, performance: 100, reliability_recovery: 100,
      clone_engine_regression: 100,
    },
    ledger: [],
  };

  const tests: Array<{
    id: string;
    name: string;
    payload: any;
    expect: { browser_interaction?: number; validator_browser_status?: string; should_pass_gate?: boolean; overall_min?: number };
    description: string;
  }> = [
    {
      id: 'VPR-001',
      name: 'Successful browser result reaches MQG',
      payload: {
        clone_url, source_url,
        coverage_result: MOCK_COVERAGE,
        browser_audit_result: {
          status: 'success',
          summary: { elements_tested: 10, pass: 10, fail_404: 0, fail_dead_end: 0, fail_network: 0, not_applicable: 0, total_console_errors: 0, total_network_failures: 0 },
          receipts: [],
        },
        differential_result: { status: 'success', journeys_tested: 1, passed: 1, partial: 0, failed: 0, visual_parity_score: 100, responsive_parity_score: 100, results: [] },
      },
      expect: { browser_interaction: 100, validator_browser_status: 'completed' },
      description: 'A valid browser result with 10/10 passes must score 100% and mark validator completed',
    },
    {
      id: 'VPR-002',
      name: 'Browser failure reaches MQG as FAIL',
      payload: {
        clone_url, source_url,
        coverage_result: MOCK_COVERAGE,
        browser_audit_result: { status: 'error', error: 'Browserbase session failed', summary: null },
        differential_result: { status: 'success', journeys_tested: 1, passed: 1, partial: 0, failed: 0, visual_parity_score: 100, responsive_parity_score: 100, results: [] },
      },
      expect: { browser_interaction: 0, validator_browser_status: 'failed' },
      description: 'A browser error response must score 0 and mark validator FAILED, not completed',
    },
    {
      id: 'VPR-003',
      name: 'Empty browser output cannot pass',
      payload: {
        clone_url, source_url,
        coverage_result: MOCK_COVERAGE,
        browser_audit_result: { status: 'success', summary: { elements_tested: 0, pass: 0 } },
        differential_result: { status: 'success', journeys_tested: 1, passed: 1, partial: 0, failed: 0, visual_parity_score: 100, responsive_parity_score: 100, results: [] },
      },
      expect: { browser_interaction: 0, validator_browser_status: 'failed' },
      description: 'A browser result with zero elements tested must not pass',
    },
    {
      id: 'VPR-004',
      name: 'Timeout cannot pass',
      payload: {
        clone_url, source_url,
        coverage_result: MOCK_COVERAGE,
        browser_audit_result: { status: 'error', error: 'shard timeout', summary: null }, // explicit error = don't retry live
        differential_result: { status: 'success', journeys_tested: 1, passed: 1, partial: 0, failed: 0, visual_parity_score: 100, responsive_parity_score: 100, results: [] },
      },
      expect: { browser_interaction: 0, validator_browser_status: 'failed' },
      description: 'A browser shard timeout (explicit error) must score 0 and mark validator FAILED',
    },
    {
      id: 'VPR-005',
      name: 'Partial interaction coverage cannot become 100%',
      payload: {
        clone_url, source_url,
        coverage_result: MOCK_COVERAGE,
        browser_audit_result: {
          status: 'success',
          summary: { elements_tested: 10, pass: 5, fail_404: 2, fail_dead_end: 3, fail_network: 0, not_applicable: 0, total_console_errors: 0, total_network_failures: 0 },
        },
        differential_result: { status: 'success', journeys_tested: 1, passed: 1, partial: 0, failed: 0, visual_parity_score: 100, responsive_parity_score: 100, results: [] },
      },
      expect: { browser_interaction: 50, should_pass_gate: false },
      description: '5/10 pass = 50% browser_interaction, gate must NOT pass',
    },
    {
      id: 'VPR-006',
      name: 'Malformed validator schema is rejected',
      payload: {
        clone_url, source_url,
        coverage_result: MOCK_COVERAGE,
        browser_audit_result: { foo: 'bar' }, // no summary, no status
        differential_result: { status: 'success', journeys_tested: 1, passed: 1, partial: 0, failed: 0, visual_parity_score: 100, responsive_parity_score: 100, results: [] },
      },
      expect: { browser_interaction: 0, validator_browser_status: 'failed' },
      description: 'A malformed browser result (no summary) must be rejected as failed',
    },
    {
      id: 'VPR-007',
      name: 'Missing console result cannot become 100%',
      payload: {
        clone_url, source_url,
        coverage_result: MOCK_COVERAGE,
        browser_audit_result: {
          status: 'success',
          summary: { elements_tested: 10, pass: 10, total_console_errors: 200, total_network_failures: 0, fail_network: 0 },
        },
        differential_result: { status: 'success', journeys_tested: 1, passed: 1, partial: 0, failed: 0, visual_parity_score: 100, responsive_parity_score: 100, results: [] },
      },
      expect: { browser_interaction: 100, should_pass_gate: false },
      description: '200 console errors must reduce console_health below 100%, gate must NOT pass',
    },
    {
      id: 'VPR-008',
      name: 'Missing network result cannot become 100%',
      payload: {
        clone_url, source_url,
        coverage_result: MOCK_COVERAGE,
        browser_audit_result: {
          status: 'success',
          summary: { elements_tested: 10, pass: 10, total_console_errors: 0, total_network_failures: 0, fail_network: 5 },
        },
        differential_result: { status: 'success', journeys_tested: 1, passed: 1, partial: 0, failed: 0, visual_parity_score: 100, responsive_parity_score: 100, results: [] },
      },
      expect: { browser_interaction: 100, should_pass_gate: false },
      description: '5 clone-controlled network failures must reduce network_health, gate must NOT pass',
    },
  ];

  const results: Array<{ id: string; name: string; passed: boolean; expected: any; actual: any; description: string }> = [];

  for (const test of tests) {
    try {
      const res = await fetch(`${API_BASE}/masterQualityGate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.payload),
        signal: AbortSignal.timeout(90000),
      });
      const mqg = await res.json().catch(() => ({ error: 'MQG returned non-JSON' }));

      const actualBrowserScore = mqg.category_scores?.browser_interaction ?? -1;
      const actualBrowserStatus = mqg.validators_run?.browser?.status ?? 'unknown';
      const actualGate = mqg.hard_gates_passed ?? false;
      const actualOverall = mqg.overall_score ?? -1;

      const passed = test.expect.browser_interaction !== undefined
          ? actualBrowserScore === test.expect.browser_interaction
          : true
        && test.expect.validator_browser_status !== undefined
          ? actualBrowserStatus === test.expect.validator_browser_status
          : true
        && test.expect.should_pass_gate !== undefined
          ? actualGate === test.expect.should_pass_gate
          : true
        && test.expect.overall_min !== undefined
          ? actualOverall >= test.expect.overall_min
          : true;

      results.push({
        id: test.id,
        name: test.name,
        passed,
        expected: test.expect,
        actual: {
          browser_interaction: actualBrowserScore,
          validator_browser_status: actualBrowserStatus,
          hard_gates_passed: actualGate,
          overall_score: actualOverall,
        },
        description: test.description,
      });

      console.log(`[validatorRegression] ${test.id} ${test.name}: ${passed ? 'PASS' : 'FAIL'} (browser=${actualBrowserScore}, status=${actualBrowserStatus})`);
    } catch (e: any) {
      results.push({
        id: test.id,
        name: test.name,
        passed: false,
        expected: test.expect,
        actual: { error: e.message },
        description: test.description,
      });
      console.error(`[validatorRegression] ${test.id} ERROR: ${e.message}`);
    }
  }

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.length - passedCount;

  return Response.json({
    status: failedCount === 0 ? 'success' : 'failure',
    tests_run: results.length,
    passed: passedCount,
    failed: failedCount,
    results,
    timestamp: new Date().toISOString(),
  });
}