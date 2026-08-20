// CloudBrowser Shadow Test Specification
// Defines how to run the EXACT SAME browser contract against both
// Browserbase (primary) and CloudBrowser (shadow) and compare outcomes.
//
// STATUS: SPECIFICATION ONLY — do not implement until CloudBrowser
// passes Fortress certification.

export interface ShadowTestSpec {
  name: string;
  description: string;
  providers: ['browserbase', 'cloudbrowser'];
  contract: string[];
  test_cases: ShadowTestCase[];
  comparison_criteria: string[];
  pass_criteria: string;
}

export interface ShadowTestCase {
  id: string;
  name: string;
  steps: { action: string; params: any; expected: any }[];
}

export const SHADOW_TEST_SPEC: ShadowTestSpec = {
  name: 'CloudBrowser Shadow Test',
  description: `Run the same browser contract against Browserbase and CloudBrowser
in parallel. Compare normalized outputs. CloudBrowser must produce equivalent
results before being promoted from shadow to primary provider.

PREREQUISITES:
- CloudBrowser Fortress certification passed
- CLOUDBROWSER_GATEWAY_URL and CLOUDBROWSER_API_KEY secrets set
- CloudBrowser engineHealth returns ok=true
- CloudBrowser engine version verified against expected deployment version

SAFETY RULES:
- Never modify CloudBrowser during shadow tests
- Never copy secrets between systems
- Shadow tests run in isolation — CloudBrowser results do NOT affect MQG scores
- Shadow test failures do NOT block Xtreme Clone Systems operations`,

  providers: ['browserbase', 'cloudbrowser'],
  contract: [
    'createSession',
    'closeSession',
    'goto',
    'click',
    'hover',
    'fill',
    'type',
    'press',
    'select',
    'scroll',
    'evaluate',
    'extract',
    'screenshot',
    'getConsoleEvidence',
    'getNetworkEvidence',
  ],

  test_cases: [
    {
      id: 'SHADOW-001',
      name: 'Connectivity smoke test',
      steps: [
        { action: 'createSession', params: { viewport: { width: 1440, height: 900 }, locale: 'en-US', timezone: 'America/New_York' }, expected: { status: 'active' } },
        { action: 'goto', params: { url: 'https://elements.envato.com/graphic-templates' }, expected: { ok: true } },
        { action: 'evaluate', params: { expression: 'document.title' }, expected: { ok: true } },
        { action: 'screenshot', params: {}, expected: { base64: 'non-empty' } },
        { action: 'closeSession', params: {}, expected: { status: 'closed' } },
      ],
    },
    {
      id: 'SHADOW-002',
      name: 'Semantic component manifest parity',
      steps: [
        { action: 'createSession', params: {}, expected: { status: 'active' } },
        { action: 'goto', params: { url: 'https://elements.envato.com/graphic-templates' }, expected: { ok: true } },
        { action: 'evaluate', params: { expression: 'MANIFEST_SCRIPT' }, expected: { ok: true, data: 'JSON with semantic_type_counts' } },
        { action: 'screenshot', params: {}, expected: { base64: 'non-empty' } },
        { action: 'closeSession', params: {}, expected: { status: 'closed' } },
      ],
    },
    {
      id: 'SHADOW-003',
      name: 'Interaction state transition',
      steps: [
        { action: 'createSession', params: {}, expected: { status: 'active' } },
        { action: 'goto', params: { url: 'https://elements.envato.com/graphic-templates' }, expected: { ok: true } },
        { action: 'evaluate', params: { expression: 'document.querySelector("a[href]").getAttribute("href")' }, expected: { ok: true } },
        { action: 'closeSession', params: {}, expected: { status: 'closed' } },
      ],
    },
  ],

  comparison_criteria: [
    'Both providers return the same page title for the same URL',
    'Both providers return non-empty screenshots of similar visual content',
    'Both providers return the same set of semantic component types',
    'Both providers return equivalent console evidence (structural errors only)',
    'Both providers return equivalent network evidence (real failures only)',
    'Both providers complete the test within 2x of each other',
  ],

  pass_criteria: `All comparison criteria must pass for ALL test cases.
If any criterion fails, CloudBrowser remains in shadow mode.
Promotion to primary requires 3 consecutive clean shadow test passes
plus explicit operator approval.`,
};