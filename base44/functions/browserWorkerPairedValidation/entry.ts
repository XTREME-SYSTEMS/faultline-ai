// Browser Worker Paired Validation — Proof-of-Concept
// 1. Runs a Browserbase connectivity smoke test
// 2. Runs ONE paired Envato Graphic Templates source/clone validation shard
// 3. Persists durable evidence to VisualParityReceipt
// 4. Returns normalized evidence in the common model
//
// Does NOT run full MQG — this is a single shard proof-of-concept.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getProvider, WorkerSession } from '../../shared/browserWorkerAdapter.ts';
import { classifySourcePage, compareManifests, buildComponentManifestLiteScript } from '../../shared/semanticManifest.ts';

export default async function(req: Request) {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));

  const journeyPath = body.journey_path || '/graphic-templates';
  const journeyId = body.journey_id || 'J-003';
  const journeyName = body.journey_name || 'Graphic Templates category';

  // Find latest clone if URLs not provided
  const user = await base44.auth.me().catch(() => null);
  const orgId = user?.data?.organization_id;

  let sourceUrl = body.source_url;
  let cloneUrl = body.clone_url;

  if (!sourceUrl || !cloneUrl) {
    const projects = await base44.asServiceRole.entities.LaunchProject.list('-created_date', 10);
    const latest = projects.find(p => p.vercel_deployment_url && p.benchmark_url);
    if (!sourceUrl) sourceUrl = latest?.benchmark_url || 'https://elements.envato.com';
    if (!cloneUrl) cloneUrl = latest?.vercel_deployment_url;
  }

  if (!cloneUrl) {
    return Response.json({ error: 'No clone URL found — pass clone_url or ensure a clone exists' }, { status: 400 });
  }

  const provider = getProvider('browserbase');
  const manifestScript = buildComponentManifestLiteScript();
  const sessionConfig = {
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
    timezone: 'America/New_York',
    proxy: false,
    solveCaptchas: false,
    timeoutMs: 30000,
  };

  // ─── 1. BROWSERBASE CONNECTIVITY SMOKE TEST ───────────────────
  let smokeTest: any = { status: 'pending' };
  let smokeSession: WorkerSession | null = null;
  const smokeStart = Date.now();

  try {
    smokeSession = await provider.createSession(sessionConfig);
    const gotoResult = await provider.goto(smokeSession, new URL(journeyPath, sourceUrl).href, 3000);
    const evalResult = await provider.evaluate(smokeSession, 'JSON.stringify({title:document.title,bodyChars:document.body?document.body.innerText.length:0})');
    const screenshot = await provider.screenshot(smokeSession);
    const consoleEvidence = provider.getConsoleEvidence(smokeSession);
    const networkEvidence = provider.getNetworkEvidence(smokeSession);

    smokeTest = {
      status: 'pass',
      provider: 'browserbase',
      session_id: smokeSession.sessionId,
      goto_ok: gotoResult.ok,
      page_title: gotoResult.title,
      eval_ok: evalResult.ok,
      body_chars: evalResult.data ? (JSON.parse(evalResult.data).bodyChars || 0) : 0,
      screenshot_captured: screenshot.base64.length > 100,
      console_entries: consoleEvidence.length,
      network_failures: networkEvidence.length,
      duration_ms: Date.now() - smokeStart,
    };
  } catch (e: any) {
    smokeTest = { status: 'fail', error: e.message, duration_ms: Date.now() - smokeStart };
  } finally {
    if (smokeSession) await provider.closeSession(smokeSession);
  }

  // If smoke test failed, don't proceed to paired validation
  if (smokeTest.status !== 'pass') {
    return Response.json({
      browserbase_connectivity: smokeTest,
      provider_adapter_status: {
        primary: 'browserbase',
        future_primary: 'cloudbrowser (awaiting Fortress certification)',
        shadow: 'cloudbrowser (spec ready, not implemented)',
      },
      graphic_templates_paired_test: { status: 'skipped', reason: 'smoke test failed' },
      normalized_evidence: null,
      cloudbrowser_shadow_test_plan: 'SPEC_READY — see base44/shared/cloudBrowserShadowTestSpec.ts',
    });
  }

  // ─── 2. PAIRED GRAPHIC TEMPLATES VALIDATION ───────────────────
  let pairedTest: any = { status: 'pending' };
  let sourceSession: WorkerSession | null = null;
  let cloneSession: WorkerSession | null = null;
  const pairedStart = Date.now();

  try {
    // SOURCE session
    sourceSession = await provider.createSession(sessionConfig);
    await provider.goto(sourceSession, new URL(journeyPath, sourceUrl).href, 3000);
    await provider.scroll(sourceSession, 'down', 600);
    await new Promise(r => setTimeout(r, 1000));

    const sourceManifestResult = await provider.evaluate(sourceSession, manifestScript);
    const sourceScreenshot = await provider.screenshot(sourceSession);
    const sourceConsole = provider.getConsoleEvidence(sourceSession);
    const sourceNetwork = provider.getNetworkEvidence(sourceSession);

    // CLONE session
    cloneSession = await provider.createSession(sessionConfig);
    await provider.goto(cloneSession, new URL(journeyPath, cloneUrl).href, 3000);
    await provider.scroll(cloneSession, 'down', 600);
    await new Promise(r => setTimeout(r, 1000));

    const cloneManifestResult = await provider.evaluate(cloneSession, manifestScript);
    const cloneScreenshot = await provider.screenshot(cloneSession);
    const cloneConsole = provider.getConsoleEvidence(cloneSession);
    const cloneNetwork = provider.getNetworkEvidence(cloneSession);

    // Parse manifests — handle null/undefined data from evaluate
    let sourceData: any = {};
    let cloneData: any = {};
    try {
      const sourceRaw = sourceManifestResult.data || '{}';
      sourceData = typeof sourceRaw === 'string' ? JSON.parse(sourceRaw) : sourceRaw;
    } catch (e: any) {
      console.log('[pairedValidation] Source manifest parse failed:', e.message);
    }
    try {
      const cloneRaw = cloneManifestResult.data || '{}';
      cloneData = typeof cloneRaw === 'string' ? JSON.parse(cloneRaw) : cloneRaw;
    } catch (e: any) {
      console.log('[pairedValidation] Clone manifest parse failed:', e.message);
    }

    // Classify page types
    const sourcePageType = classifySourcePage(sourceData.title || '', '', sourceData.url || '');
    const clonePageType = classifySourcePage(cloneData.title || '', '', cloneData.url || '');

    // Build manifests with page types
    const sourceManifest = { ...sourceData, page_type: sourcePageType };
    const cloneManifest = { ...cloneData, page_type: clonePageType };

    // Compare semantically
    const comparison = compareManifests(sourceManifest, cloneManifest);

    // Upload screenshots
    let sourceScreenshotUrl = '';
    let cloneScreenshotUrl = '';
    try {
      const sourceFile = new File([Uint8Array.from(atob(sourceScreenshot.base64), c => c.charCodeAt(0))], `${journeyId}-source.jpg`, { type: 'image/jpeg' });
      const cloneFile = new File([Uint8Array.from(atob(cloneScreenshot.base64), c => c.charCodeAt(0))], `${journeyId}-clone.jpg`, { type: 'image/jpeg' });
      const [sourceUpload, cloneUpload] = await Promise.all([
        base44.integrations.Core.UploadFile({ file: sourceFile }),
        base44.integrations.Core.UploadFile({ file: cloneFile }),
      ]);
      sourceScreenshotUrl = sourceUpload?.file_url || '';
      cloneScreenshotUrl = cloneUpload?.file_url || '';
    } catch (e: any) {
      console.log('[pairedValidation] Screenshot upload failed:', e.message);
    }

    // Persist durable evidence to VisualParityReceipt
    if (orgId) {
      try {
        await base44.asServiceRole.entities.VisualParityReceipt.create({
          organization_id: orgId,
          clone_url: cloneUrl,
          source_url: sourceUrl,
          page_path: journeyPath,
          viewport: 'desktop_1440',
          component_name: journeyName,
          source_screenshot: sourceScreenshotUrl,
          clone_screenshot: cloneScreenshotUrl,
          component_presence_parity: comparison.semantic_parity_score,
          overall_parity: comparison.semantic_parity_score,
          differences: comparison.differences,
          root_cause: comparison.missing_required_types.length > 0 ? 'missing_semantic_types' : 'none',
          status: comparison.status === 'source_invalid_reference' ? 'partial' : comparison.status,
        });
      } catch (e: any) {
        console.log('[pairedValidation] Evidence persist failed:', e.message);
      }
    }

    pairedTest = {
      status: comparison.status,
      journey_id: journeyId,
      journey_name: journeyName,
      source_url: sourceData.url,
      clone_url: cloneData.url,
      source_page_type: sourcePageType,
      clone_page_type: clonePageType,
      source_title: sourceData.title,
      clone_title: cloneData.title,
      source_type_counts: sourceData.semantic_type_counts || {},
      clone_type_counts: cloneData.semantic_type_counts || {},
      semantic_parity_score: comparison.semantic_parity_score,
      matched_types: comparison.matched_types,
      missing_required_types: comparison.missing_required_types,
      differences: comparison.differences,
      source_screenshot_url: sourceScreenshotUrl,
      clone_screenshot_url: cloneScreenshotUrl,
      source_console_count: sourceConsole.length,
      clone_console_count: cloneConsole.length,
      source_network_failures: sourceNetwork.length,
      clone_network_failures: cloneNetwork.length,
      duration_ms: Date.now() - pairedStart,
    };
  } catch (e: any) {
    pairedTest = { status: 'fail', error: e.message, duration_ms: Date.now() - pairedStart };
  } finally {
    if (sourceSession) await provider.closeSession(sourceSession);
    if (cloneSession) await provider.closeSession(cloneSession);
  }

  // ─── 3. RETURN STRUCTURED RESPONSE ────────────────────────────
  return Response.json({
    browserbase_connectivity: smokeTest,
    provider_adapter_status: {
      primary: 'browserbase',
      future_primary: 'cloudbrowser (awaiting Fortress certification)',
      shadow: 'cloudbrowser (spec ready, not implemented)',
      contract: ['createSession', 'closeSession', 'goto', 'click', 'hover', 'fill', 'type', 'press', 'select', 'scroll', 'evaluate', 'extract', 'screenshot', 'getConsoleEvidence', 'getNetworkEvidence'],
    },
    graphic_templates_paired_test: pairedTest,
    normalized_evidence: {
      model: ['SOURCE_SESSION', 'CLONE_SESSION', 'PAIRED_TEST_RUN', 'COMPONENT_MANIFEST', 'SCREENSHOT_PAIR', 'CONSOLE_RESULT', 'NETWORK_RESULT', 'DIFFERENTIAL_RESULT', 'VALIDATION_RECEIPT'],
      persisted_to: 'VisualParityReceipt',
      provider: 'browserbase',
      run_id: `run_${Date.now()}`,
      timestamp: new Date().toISOString(),
    },
    cloudbrowser_shadow_test_plan: 'SPEC_READY — see base44/shared/cloudBrowserShadowTestSpec.ts',
  });
}