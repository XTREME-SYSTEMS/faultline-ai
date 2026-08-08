import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { fetchRenderedWithScreenshot } from '../../shared/browserbase.ts';

// Full-stack validator: scores a live clone on REAL VISUAL parity (screenshot comparison
// via Browserbase + vision LLM comparing clone vs target) and OPERATIONAL parity (form
// handler responds + saves, form is wired, page loads).
// Returns a 0-100 score, sub-scores, and a list of specific failures for the auto-healer.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    const body = await req.json().catch(() => ({}));
    const { live_url, target_url, target_dna, organization_id, clone_id } = body;
    if (!live_url) return Response.json({ error: 'live_url required' }, { status: 400 });
    const targetOrg = organization_id || orgId;

    // 1. Basic HTTP check on the live clone
    const r = await fetch(live_url, { signal: AbortSignal.timeout(15000) });
    const html = await r.text();
    const checks = {
      httpOk: r.status === 200,
      length: html.length,
      hasDoctype: /<!doctype/i.test(html),
      hasViewport: /viewport/i.test(html),
      hasNav: /<nav/i.test(html),
      hasForm: /<form/i.test(html),
      hasFormHandler: /ingestCloneLead/i.test(html)
    };

    // 2. Browserbase screenshots of BOTH the clone and the original target
    //    (stealth session + CDP capture — returns base64 PNG)
    //    Run in PARALLEL to halve validation time (was sequential = 60s, now ~30s)
    let cloneScreenshotB64 = null, targetScreenshotB64 = null;
    let cloneRendered = '', targetRendered = '';
    const [cloneBB, targetBB] = await Promise.allSettled([
      fetchRenderedWithScreenshot(live_url, { timeout: 20000 }),
      target_url ? fetchRenderedWithScreenshot(target_url, { timeout: 20000 }) : Promise.resolve(null)
    ]);
    if (cloneBB.status === 'fulfilled' && cloneBB.value) {
      cloneScreenshotB64 = cloneBB.value.screenshot;
      cloneRendered = cloneBB.value.html || '';
    } else if (cloneBB.status === 'rejected') {
      console.error('Clone screenshot failed:', cloneBB.reason?.message || cloneBB.reason);
    }
    if (targetBB.status === 'fulfilled' && targetBB.value) {
      targetScreenshotB64 = targetBB.value.screenshot;
      targetRendered = targetBB.value.html || '';
    } else if (targetBB.status === 'rejected') {
      console.error('Target screenshot failed:', targetBB.reason?.message || targetBB.reason);
    }

    // 2b. Upload base64 screenshots to storage so the vision LLM can fetch them
    const uploadScreenshot = async (b64, label) => {
      if (!b64) return null;
      // Already a URL? (Fetch API fallback returns URLs)
      if (typeof b64 === 'string' && b64.startsWith('http')) return b64;
      try {
        const bytes = atob(b64);
        const arr = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        const blob = new Blob([arr], { type: 'image/png' });
        const file = new File([blob], `${label}-${Date.now()}.png`, { type: 'image/png' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return file_url;
      } catch (e) { console.error(`${label} upload failed: ${e.message}`); return null; }
    };
    const [cloneScreenshot, targetScreenshot] = await Promise.all([
      uploadScreenshot(cloneScreenshotB64, 'clone'),
      uploadScreenshot(targetScreenshotB64, 'target')
    ]);

    // 3. Vision LLM comparison of the two screenshots (real visual parity)
    let visualScore = 0;
    let visualFailures = [];
    let llmSummary = '';
    const fileUrls = [cloneScreenshot, targetScreenshot].filter(Boolean);

    if (fileUrls.length === 2) {
      const scoringRes = await base44.integrations.Core.InvokeLLM({
        prompt: `You are the FaultLine Visual Parity Engine. Compare a cloned website screenshot against the original target site screenshot. Score how faithfully the clone reproduces the original's visual design.

TARGET SITE (original): ${target_url}
CLONE SITE (generated): ${live_url}

TARGET DNA (scraped design metadata):
- Primary color: ${target_dna?.primary || 'N/A'}
- Secondary color: ${target_dna?.secondary || 'N/A'}
- Navigation items: ${(target_dna?.nav || []).join(', ')}
- Section headings: ${(target_dna?.h2 || []).join(', ')}
- Phone: ${target_dna?.phone || 'N/A'}

Two screenshots are attached:
1. The CLONE (generated site)
2. The TARGET (original site)

Score VISUAL PARITY 0-100 based on:
- Color scheme match (do the clone's colors match the target's colors?)
- Typography match (fonts, font sizes, heading styles)
- Layout structure match (hero, sections, grid layout, spacing)
- Navigation match (same nav items, same positioning)
- Content presence (same headings, same text content, same imagery style)
- Overall visual impression (would a visitor recognize this as the same site?)

100 = pixel-perfect reproduction, zero visual differences.
90+ = very close, minor differences
70-89 = recognizable but noticeable differences
Below 70 = significantly different

Return a visual_score (0-100), a list of specific visual_failures (each with a description of what doesn't match and how to fix it), and a summary.

Be STRICT. Only award 100 when the clone truly looks identical to the target. List every visual difference you can spot.`,
        model: 'gemini_3_flash',
        add_context_from_internet: false,
        file_urls: fileUrls,
        response_json_schema: {
          type: 'object',
          properties: {
            visual_score: { type: 'number' },
            summary: { type: 'string' },
            visual_failures: { type: 'array', items: { type: 'object', properties: {
              description: { type: 'string' },
              fix: { type: 'string' }
            } } }
          }
        }
      });
      visualScore = Math.round(Number(scoringRes.visual_score) || 0);
      llmSummary = scoringRes.summary || '';
      visualFailures = (Array.isArray(scoringRes.visual_failures) ? scoringRes.visual_failures : []).map(f => f.description || f);
    } else {
      // Fallback: basic content check if screenshots failed
      const nav = (target_dna?.nav || []).filter(n => n && n.length > 1);
      const h2 = (target_dna?.h2 || []).filter(h => h && h.length > 1);
      const phone = target_dna?.phone;
      const stripRE = (s) => s.replace(/[^a-z0-9]/gi, '').slice(0, 15);
      const strippedHtml = html.replace(/[^a-z0-9]/gi, '');
      const navPresent = nav.filter(n => { const re = stripRE(n); return re && new RegExp(re, 'i').test(strippedHtml); }).length;
      const h2Present = h2.filter(h => { const re = stripRE(h); return re && new RegExp(re, 'i').test(strippedHtml); }).length;
      const phonePresent = phone ? new RegExp(phone.replace(/[^\d]/g, '').slice(0, 6)).test(html.replace(/[^\d]/g, '')) : true;
      const hasContact = /contact/i.test(html);
      const navScore = nav.length ? navPresent / nav.length : 1;
      const h2Score = h2.length ? h2Present / h2.length : 1;
      visualScore = Math.round(((navScore * 0.4) + (h2Score * 0.3) + (phonePresent ? 0.15 : 0) + (hasContact ? 0.15 : 0)) * 100);
      if (navScore < 1) visualFailures.push(`Missing ${nav.length - navPresent}/${nav.length} nav items`);
      if (h2Score < 1) visualFailures.push(`Missing ${h2.length - h2Present}/${h2.length} section headings`);
      if (phone && !phonePresent) visualFailures.push(`Target phone ${phone} not reproduced`);
      if (!hasContact) visualFailures.push('No contact section found');
      llmSummary = 'Screenshot comparison unavailable — used content fallback';
    }

    // 4. Operational parity — POST to the form handler
    let operationalScore = 0;
    const failures = [...visualFailures];
    const appId = secrets.get('BASE44_APP_ID');
    const handlerUrl = `https://base44.app/api/apps/${appId}/functions/ingestCloneLead`;
    try {
      const fr = await fetch(handlerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: targetOrg, clone_id: clone_id || 'validation', name: 'E2E Validation Test', email: 'validation@faultline.ai', message: 'Automated operational parity test', source_url: live_url })
      });
      const fj = await fr.json().catch(() => ({}));
      if (fr.status === 200 && fj.ok) operationalScore += 50;
      else failures.push(`Form handler responded ${fr.status}: ${fj.error || 'not ok'}`);
    } catch (e) { failures.push(`Form handler unreachable: ${e.message}`); }

    if (checks.hasFormHandler) operationalScore += 25; else failures.push('Form-handler script not injected into clone HTML');
    if (checks.hasForm) operationalScore += 15; else failures.push('No <form> element found on clone');
    if (checks.httpOk) operationalScore += 10; else failures.push(`Live URL returned HTTP ${r.status}`);
    operationalScore = Math.min(100, operationalScore);

    const score = Math.round((visualScore * 0.5) + (operationalScore * 0.5));
    return Response.json({
      status: 'success', score, visual_score: visualScore, operational_score: operationalScore,
      passed: score >= 100, failures, checks,
      visual_checks: { method: fileUrls.length === 2 ? 'screenshot_comparison' : 'content_fallback', summary: llmSummary },
      screenshots: { clone: cloneScreenshot, target: targetScreenshot },
      live_url, target_url, target_org: targetOrg
    });
  } catch (error) {
    return Response.json({ error: error.message, score: 0, passed: false, failures: [error.message] }, { status: 500 });
  }
}