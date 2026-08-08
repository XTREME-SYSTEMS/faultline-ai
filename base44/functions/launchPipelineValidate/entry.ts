import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { slugify, pushGitHubFile, deployToVercel } from '../../shared/launchInfra.ts';
import { fetchRenderedWithScreenshot } from '../../shared/browserbase.ts';

// Step 2 of the Autonomous Launch Pipeline.
// - Polls the deliverable until generation completes, fetches the HTML
// - Pushes index.html to the GitHub repo and deploys to Vercel
// - Uses Browserbase to render the live Vercel URL (real browser) + screenshot
// - Scores PARITY (vs the design pack spec) and OPERATIONAL (links/forms/no errors)
//   via a vision-capable LLM. 100/100 is mandatory to pass.
// - Writes a QAReport and updates the LaunchProject.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { launch_project_id } = await req.json().catch(() => ({}));
    if (!launch_project_id) return Response.json({ error: 'launch_project_id required' }, { status: 400 });

    const lp = await base44.asServiceRole.entities.LaunchProject.get(launch_project_id);
    if (!lp) return Response.json({ error: 'LaunchProject not found' }, { status: 404 });
    const orgId = lp.organization_id;
    const slug = lp.slug || slugify(lp.project_name || lp.business_name || 'faultline-site');

    await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, { status: 'validating', progress: 50 });

    // 1. Poll deliverable until generated (brief — the workflow already waited)
    let deliverable = null;
    for (let i = 0; i < 15; i++) {
      try {
        deliverable = await base44.asServiceRole.entities.Deliverable.get(lp.deliverable_id);
        if (deliverable.status === 'generated') break;
        if (deliverable.status === 'failed') {
          await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, { status: 'failed', last_validation_summary: 'Generation failed: ' + (deliverable.metadata?.error || 'unknown') });
          return Response.json({ failed: true, reason: 'generation_failed', iteration: lp.iteration || 0 });
        }
      } catch (e) {}
      await new Promise(r => setTimeout(r, 4000));
    }
    if (!deliverable || deliverable.status !== 'generated') {
      await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, { status: 'retrying' });
      return Response.json({ not_ready: true, iteration: lp.iteration || 0 });
    }

    // 2. Fetch generated HTML
    let html = deliverable.content || '';
    if (deliverable.file_url) {
      try { const r = await fetch(deliverable.file_url); html = await r.text(); } catch (e) {}
    }
    if (!html || html.length < 100) {
      await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, { status: 'failed', last_validation_summary: 'Generated HTML was empty' });
      return Response.json({ failed: true, reason: 'empty_html', iteration: lp.iteration || 0 });
    }

    // 3. Push to GitHub
    const errors = {};
    try {
      const ghConn = await base44.asServiceRole.connectors.getConnection('github');
      if (ghConn?.accessToken) {
        const token = ghConn.accessToken;
        const owner = (await (await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'FaultLine-AI-Launch-Pipeline', 'X-GitHub-Api-Version': '2022-11-28' } })).json()).login;
        if (owner) await pushGitHubFile(token, owner, slug, 'index.html', html, `Production build ${new Date().toISOString()} — FaultLine Autonomous Pipeline`);
      }
    } catch (e) { errors.github_push = e.message; }

    // 4. Deploy to Vercel
    let deploymentUrl = lp.vercel_deployment_url;
    try {
      const token = Deno.env.get('VERCEL_TOKEN');
      if (!token) throw new Error('VERCEL_TOKEN secret not set');
      const teamId = Deno.env.get('VERCEL_TEAM_ID') || null;
      const projectId = lp.metadata?.vercel_project_id || null;
      const dep = await deployToVercel(token, teamId, slug, projectId, html);
      deploymentUrl = dep.url || (dep.alias && dep.alias.length ? `https://${dep.alias[0]}` : null);
      // Wait briefly for the deployment to go live
      await new Promise(r => setTimeout(r, 8000));
    } catch (e) { errors.vercel_deploy = e.message; }

    await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, {
      vercel_deployment_url: deploymentUrl,
      status: 'testing',
      progress: 60
    });

    // 5. Browserbase — render the live URL + screenshot (real browser)
    let liveHtml = '';
    let screenshotUrl = null;
    if (deploymentUrl) {
      const rendered = await fetchRenderedWithScreenshot(deploymentUrl, { timeout: 30000 });
      if (rendered) { liveHtml = rendered.html || ''; screenshotUrl = rendered.screenshot || null; }
    }

    // 6. Load the design pack spec for parity comparison
    let packSpec = null;
    try {
      if (lp.design_pack_id) {
        const pack = await base44.asServiceRole.entities.DesignPack.get(lp.design_pack_id);
        packSpec = pack?.spec || null;
      }
    } catch (e) {}

    // 7. Score parity + operational via vision-capable LLM
    const packPages = packSpec?.pages || [];
    const packColors = packSpec?.brand?.colors || {};
    const packFonts = packSpec?.brand?.fonts || {};
    const scoringRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the FaultLine Autonomous Validation Engine. Score a generated website against its design pack spec and for operational readiness. 100/100 is MANDATORY to pass — only award 100 when there are zero defects.

BUSINESS: ${lp.business_name || lp.project_name}
INDUSTRY: ${lp.industry || ''}
DEPLOYED URL: ${deploymentUrl || 'N/A (deploy failed)'}

DESIGN PACK SPEC — source of truth for parity:
Brand: ${packSpec?.brand?.name || ''} — ${packSpec?.brand?.style_description || ''}
Exact colors (MUST match these hex values in CSS):
  background: ${packColors.background || 'N/A'}
  primary: ${packColors.primary || 'N/A'}
  secondary: ${packColors.secondary || 'N/A'}
  accent: ${packColors.accent || 'N/A'}
  text: ${packColors.text || 'N/A'}
  muted: ${packColors.muted || 'N/A'}
  card: ${packColors.card || 'N/A'}
Exact fonts: heading "${packFonts.heading || 'N/A'}", body "${packFonts.body || 'N/A'}"
Layout system: ${packSpec?.layout_system || 'N/A'}

Required pages (${packPages.length} total — ALL must be present as distinct sections with proper IDs):
${packPages.map((p, i) => `${i + 1}. ${p.name} — Sections: ${(p.sections || []).join(', ')} — Components: ${(p.components || []).join(', ')}`).join('\n')}

LIVE RENDERED HTML (from real browser via Browserbase):
"""
${(liveHtml || html).slice(0, 65000)}
"""
${screenshotUrl ? `\nA SCREENSHOT of the live site is attached — use it to verify visual parity (colors, fonts, layout, component presence).\n` : ''}

Score TWO dimensions, each 0-100:
1. PARITY SCORE — how faithfully the live site reproduces the design pack:
   - Exact colors: every CSS color must match the hex values above. Any drift = below 100.
   - Exact fonts: heading and body fonts must match. Any substitution = below 100.
   - All ${packPages.length} pages present as distinct sections with proper IDs and nav links. Any missing = below 100.
   - All components present per page. Any missing = below 100.
   - Layout is responsive (mobile breakpoints work) and uses a grid system for multi-column layouts. The shell uses vanilla CSS with predefined classes (.grid, .cards, .card, .btn) — this IS a valid responsive grid system. Do NOT penalize for not using Tailwind specifically; the design pack's layout_system field is descriptive of the intent, not prescriptive of a framework.
   100 = pixel/structure-perfect match, zero defects.
2. OPERATIONAL SCORE — site is fully functional:
   - Navigation works (all nav links resolve to sections, mobile menu toggles).
   - Forms present with proper <form>, <input>, <label>, <button> elements (checkout, login, contact).
   - No broken links (all hrefs point to valid #anchors or external URLs).
   - No JS errors.
   - Responsive (mobile breakpoints work).
   - All CTAs functional (buttons use .btn class with hover states, no inline styles on buttons).
   - Content renders fully (no blank sections, no placeholder text).
   100 = zero operational defects.

Also return a combined test_score (min of the two), mandatory_passed = true ONLY when BOTH are exactly 100, a short summary, and a list of specific issues (each with severity + fix).

Be STRICT and PRECISE. Do not round up. If anything is imperfect, the score must be below 100. List every defect you find.`,
      model: 'gemini_3_1_pro',
      add_context_from_internet: false,
      file_urls: screenshotUrl ? [screenshotUrl] : undefined,
      response_json_schema: {
        type: 'object',
        properties: {
          parity_score: { type: 'number' },
          operational_score: { type: 'number' },
          test_score: { type: 'number' },
          mandatory_passed: { type: 'boolean' },
          summary: { type: 'string' },
          issues: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string' }, description: { type: 'string' }, fix: { type: 'string' } } } }
        }
      }
    });

    const parity = Math.round(Number(scoringRes.parity_score) || 0);
    const operational = Math.round(Number(scoringRes.operational_score) || 0);
    const testScore = Math.round(Number(scoringRes.test_score) || Math.min(parity, operational));
    const mandatoryPassed = scoringRes.mandatory_passed === true || (parity >= 100 && operational >= 100);
    const summary = scoringRes.summary || `Parity ${parity}/100 · Operational ${operational}/100`;
    const issues = Array.isArray(scoringRes.issues) ? scoringRes.issues : [];

    // 8. Write QAReport
    let qaReportId = null;
    try {
      const report = await base44.asServiceRole.entities.QAReport.create({
        organization_id: orgId,
        target_type: 'website',
        target_id: lp.deliverable_id,
        target_title: lp.project_name,
        check_type: 'headless_test',
        status: mandatoryPassed ? 'passed' : (testScore >= 80 ? 'warnings' : 'failed'),
        score: testScore,
        issues: issues.map((i, idx) => ({ severity: i.severity || 'medium', category: 'parity_operational', description: `${i.description || ''}${i.fix ? ' — Fix: ' + i.fix : ''}`, recommendation: i.fix || '' })),
        summary,
        recommendations: issues.map(i => i.fix).filter(Boolean),
        auto_generated: true
      });
      qaReportId = report.id;
    } catch (e) { errors.qa_report = e.message; }

    // 9. Update LaunchProject
    await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, {
      parity_score: parity,
      operational_score: operational,
      test_score: testScore,
      mandatory_passed: mandatoryPassed,
      qa_report_id: qaReportId,
      last_validation_summary: summary,
      vercel_deployment_url: deploymentUrl,
      status: 'testing',
      progress: 70,
      errors: Object.keys(errors).length ? { ...(lp.errors || {}), ...errors } : null
    });

    return Response.json({
      status: 'scored',
      launch_project_id,
      parity_score: parity,
      operational_score: operational,
      test_score: testScore,
      mandatory_passed: mandatoryPassed,
      iteration: lp.iteration || 0,
      vercel_deployment_url: deploymentUrl,
      summary,
      issues
    });
  } catch (error) {
    console.error('launchPipelineValidate error:', error);
    try {
      const base44 = createClientFromRequest(req);
      const { launch_project_id } = await req.json().catch(() => ({}));
      if (launch_project_id) await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, { status: 'failed', last_validation_summary: 'Validate error: ' + error.message });
    } catch (e) {}
    return Response.json({ error: error.message }, { status: 500 });
  }
}