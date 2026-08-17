import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { runFullValidation } from '../../shared/endToEndValidator.ts';

// Recursive End-to-End Validator
// Crawls every page on the deployed clone, tests every AI tool, every Stripe
// checkout, every form, and reports all failures. The 404 catch-all in
// vercel.json (deployed by cloneFullSite) handles missing pages gracefully.

const AI_TOOLS = [
  { slug: 'ai-video-generator', tool_type: 'video' },
  { slug: 'ai-image-generator', tool_type: 'image' },
  { slug: 'ai-image-editor', tool_type: 'image_edit' },
  { slug: 'ai-voice-generator', tool_type: 'voice' },
  { slug: 'ai-music-generator', tool_type: 'music' },
  { slug: 'ai-graphics-generator', tool_type: 'graphics' },
  { slug: 'ai-mockup-generator', tool_type: 'mockup' },
  { slug: 'ai-sound-generator', tool_type: 'sound' },
];

const STRIPE_PRODUCTS = [
  { id: 'ai_tool', name: 'AI Tool — Lifetime', price: 29 },
  { id: 'web_pack', name: 'Web Pack — Lifetime', price: 49 },
  { id: 'app_pack', name: 'App Pack — Lifetime', price: 99 },
  { id: 'growth', name: 'Growth Plan — Monthly', price: 299 },
  { id: 'operating', name: 'Operating System — Monthly', price: 699 },
];

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;

    const body = await req.json().catch(() => ({}));
    const {
      live_url,
      target_url,
      launch_project_id,
      max_iterations = 1,
      organization_id,
    } = body;

    if (!live_url) return Response.json({ error: 'live_url required' }, { status: 400 });

    const targetOrg = organization_id || orgId;
    const appId = Deno.env.get('BASE44_APP_ID');
    const invokeAiUrl = `https://base44.app/api/apps/${appId}/functions/invokeAiTool`;
    const checkoutUrl = `https://base44.app/api/apps/${appId}/functions/createStoreCheckout`;
    const formHandlerUrl = `https://base44.app/api/apps/${appId}/functions/ingestCloneLead`;

    console.log(`[E2E] Starting validation: ${live_url}`);

    // Run validation
    const report = await runFullValidation({
      liveUrl: live_url,
      invokeAiUrl,
      checkoutUrl,
      formHandlerUrl,
      organizationId: targetOrg || 'test',
      aiTools: AI_TOOLS,
      stripeProducts: STRIPE_PRODUCTS,
      maxPages: 100,
      iteration: 1,
    });

    console.log(`[E2E] Done: ${report.pages_passed}/${report.pages_tested} pages, ${report.tools_tested.filter(t => t.ok).length}/${report.tools_tested.length} tools, ${report.checkouts_tested.filter(c => c.ok).length}/${report.checkouts_tested.length} checkouts, form: ${report.forms_tested[0]?.ok}`);

    // Save QA report
    if (targetOrg) {
      try {
        await base44.asServiceRole.entities.QAReport.create({
          organization_id: targetOrg,
          target_type: 'website',
          target_id: launch_project_id || live_url,
          target_title: `E2E Validation — ${live_url}`,
          check_type: 'headless_test',
          status: report.overall_pass ? 'passed' : 'failed',
          score: Math.round((report.pages_passed / Math.max(report.pages_tested, 1)) * 100),
          issues: report.page_failures.slice(0, 20).map(f => ({
            severity: 'high',
            category: 'page_validation',
            description: `${f.url}: ${f.issues.join(', ')}`,
            recommendation: 'Check if page was crawled; 404 catch-all should handle it',
          })).concat(
            report.tools_tested.filter(t => !t.ok && !t.error?.includes('skipped')).slice(0, 10).map(t => ({
              severity: 'critical',
              category: 'ai_tool',
              description: `Tool ${t.slug} (${t.tool_type}) failed: ${t.error}`,
              recommendation: 'Check invokeAiTool backend function',
            }))
          ).concat(
            report.checkouts_tested.filter(c => !c.ok).slice(0, 10).map(c => ({
              severity: 'critical',
              category: 'checkout',
              description: `Checkout for ${c.name} failed: ${c.error}`,
              recommendation: 'Check createStoreCheckout backend function',
            }))
          ),
          summary: `Pages: ${report.pages_passed}/${report.pages_tested} passed. Tools: ${report.tools_tested.filter(t => t.ok).length}/${report.tools_tested.length} passed. Checkouts: ${report.checkouts_tested.filter(c => c.ok).length}/${report.checkouts_tested.length} passed. Form: ${report.forms_tested[0]?.ok ? 'passed' : 'failed'}.`,
          auto_generated: true,
        });
      } catch (e) { console.error('[E2E] QAReport save failed:', e.message); }
    }

    return Response.json({
      status: report.overall_pass ? 'passed' : 'failed',
      overall_pass: report.overall_pass,
      live_url,
      pages: {
        tested: report.pages_tested,
        passed: report.pages_passed,
        failed: report.pages_failed,
      },
      tools: report.tools_tested.map(t => ({ slug: t.slug, tool_type: t.tool_type, ok: t.ok, error: t.error })),
      checkouts: report.checkouts_tested.map(c => ({ product: c.name, ok: c.ok, error: c.error })),
      form: report.forms_tested[0],
      page_failures: report.page_failures.slice(0, 50),
      summary: `Pages: ${report.pages_passed}/${report.pages_tested} | Tools: ${report.tools_tested.filter(t => t.ok).length}/${report.tools_tested.length} | Checkouts: ${report.checkouts_tested.filter(c => c.ok).length}/${report.checkouts_tested.length} | Form: ${report.forms_tested[0]?.ok ? 'OK' : 'FAIL'}`,
    });
  } catch (error) {
    console.error('recursiveEndToEndValidator error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}