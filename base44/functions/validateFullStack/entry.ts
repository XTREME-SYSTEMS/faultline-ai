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

    // 2. Browserbase screenshots: desktop clone + target + MOBILE clone (responsive)
    //    Run in PARALLEL. If a cached target screenshot URL is provided (from a
    //    previous validation in the heal loop), reuse it — saves 15-20s per heal.
    let cloneScreenshotB64 = null, targetScreenshotB64 = null, mobileScreenshotB64 = null;
    let cloneRendered = '', targetRendered = '';
    const cachedTargetUrl = body.cached_target_screenshot || null;
    const [cloneBB, targetBB, mobileBB] = await Promise.allSettled([
      fetchRenderedWithScreenshot(live_url, { timeout: 20000 }),
      (target_url && !cachedTargetUrl) ? fetchRenderedWithScreenshot(target_url, { timeout: 20000 }) : Promise.resolve(null),
      fetchRenderedWithScreenshot(live_url, { timeout: 20000, viewport: { width: 375, height: 812, mobile: true, deviceScaleFactor: 2 } }),
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
    if (mobileBB.status === 'fulfilled' && mobileBB.value) {
      mobileScreenshotB64 = mobileBB.value.screenshot;
    } else if (mobileBB.status === 'rejected') {
      console.error('Mobile screenshot failed:', mobileBB.reason?.message || mobileBB.reason);
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
    const [cloneScreenshot, targetScreenshot, mobileScreenshot] = await Promise.all([
      uploadScreenshot(cloneScreenshotB64, 'clone'),
      uploadScreenshot(targetScreenshotB64, 'target'),
      uploadScreenshot(mobileScreenshotB64, 'clone-mobile'),
    ]);
    // Use cached target screenshot if provided (heal iteration optimization)
    const finalTargetScreenshot = cachedTargetUrl || targetScreenshot;

    // 3. STRUCTURAL CONTENT AUDIT — compare the clone's rendered HTML against
    //    the target's rendered HTML to detect MISSING SECTIONS. The vision LLM
    //    alone is too lenient: it scores 100/100 when entire sections are absent
    //    because it only judges the elements it can see. This structural check
    //    extracts all heading text from both pages and flags any target section
    //    heading that is completely missing from the clone — a hard penalty.
    let structuralFailures = [];
    let structuralScore = 100;
    if (targetRendered && cloneRendered) {
      try {
        const extractHeadings = (htmlStr) => {
          const headings = [];
          const re = /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi;
          let m;
          while ((m = re.exec(htmlStr)) !== null) {
            const text = m[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
            if (text.length > 3) headings.push(text);
          }
          return headings;
        };
        const targetHeadings = extractHeadings(targetRendered);
        const cloneHeadings = extractHeadings(cloneRendered);
        const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim().slice(0, 25);
        const cloneNorm = new Set(cloneHeadings.map(norm));
        let missingCount = 0;
        for (const th of targetHeadings) {
          const tn = norm(th);
          const found = cloneNorm.has(tn) || [...cloneNorm].some(cn => cn.includes(tn) || tn.includes(cn));
          if (!found && tn.length > 5) {
            structuralFailures.push(`Missing section: "${th}"`);
            missingCount++;
          }
        }
        structuralScore = Math.max(0, 100 - (missingCount * 15));
        console.log(`Structural audit: target=${targetHeadings.length} headings, clone=${cloneHeadings.length} headings, missing=${missingCount}, score=${structuralScore}`);
      } catch (e) { console.error('Structural audit failed:', e.message); }
    }

    // 3b. Vision LLM comparison of the two screenshots (real visual parity)
    let visualScore = 0;
    let visualFailures = [];
    let llmSummary = '';
    const fileUrls = [cloneScreenshot, finalTargetScreenshot, mobileScreenshot].filter(Boolean);

    if (fileUrls.length >= 2) {
      const scoringRes = await base44.integrations.Core.InvokeLLM({
        prompt: `You are the FaultLine Visual Parity Engine — STRICT MODE. Compare a cloned website screenshot against the original target site screenshot. Score how faithfully the clone reproduces the original's visual design.

TARGET SITE (original): ${target_url}
CLONE SITE (generated): ${live_url}

TARGET DNA (scraped design metadata):
- Primary color: ${target_dna?.primary || 'N/A'}
- Secondary color: ${target_dna?.secondary || 'N/A'}
- Navigation items: ${(target_dna?.nav || []).join(', ')}
- Section headings: ${(target_dna?.h2 || []).join(', ')}
- Phone: ${target_dna?.phone || 'N/A'}

Screenshots are attached in this order:
1. CLONE desktop (generated site)
2. TARGET desktop (original site)
3. CLONE mobile 375px viewport (responsive validation — if present)

Score MOBILE RESPONSIVENESS as part of visual parity: if the mobile layout is broken
(overflow, tiny text, unstacked columns, horizontal scroll), deduct points.

Score VISUAL PARITY 0-100 based on:
- Color scheme match (do the clone's colors match the target's colors?)
- Typography match (fonts, font sizes, heading styles)
- Layout structure match (hero, sections, grid layout, spacing)
- Navigation match (same nav items, same positioning)
- Content presence (same headings, same text content, same imagery style)
- MISSING SECTIONS: if ANY section visible in the target screenshot is completely ABSENT from the clone screenshot, this is a CRITICAL failure — deduct at least 20 points per missing section
- COOKIE BANNER: if the clone shows a cookie consent banner instead of real content, deduct 30 points
- Overall visual impression (would a visitor recognize this as the same site?)

100 = pixel-perfect reproduction, zero visual differences. NEVER award 100 if any section is missing or any visual difference is visible.
90+ = very close, minor differences (a single small element differs)
70-89 = recognizable but noticeable differences (multiple elements differ or one section is simplified)
Below 70 = significantly different (sections missing, wrong layout, wrong colors)

Return a visual_score (0-100), a list of specific visual_failures (each with a description of what doesn't match and how to fix it), and a summary.

Be EXTREMELY STRICT. Only award 100 when the clone is pixel-perfect. List EVERY visual difference — missing sections, wrong colors, wrong fonts, missing images, cookie banners, simplified layouts.`,
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
      // Merge structural failures (deduped) and take the MINIMUM of LLM + structural
      // score — if sections are missing, the structural audit drags the score down
      // regardless of how lenient the vision LLM was.
      for (const sf of structuralFailures) {
        if (!visualFailures.some(vf => vf.includes(sf.slice(0, 20)))) visualFailures.push(sf);
      }
      visualScore = Math.min(visualScore, structuralScore);
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

    // 4b. BROKEN CTA LINK CHECK — scan the clone HTML for internal app-action
    //     links (/app/signup, /app/login, /signup, /login, etc.) that would 404
    //     on a static single-page clone. These are the primary CTA buttons
    //     ("Start for free", "Launch", "Log in") — if they point to a relative
    //     path instead of the original target, visitors hit a 404 and the
    //     auto-heal loop should catch and fix them.
    const appRouteRe = /href=["'](\/(?:app\/|signup|login|register|signin|dashboard|admin|get-started|start|onboarding|auth\/)[^"']*)["']/gi;
    const brokenCtaLinks = new Set();
    let ctaMatch;
    while ((ctaMatch = appRouteRe.exec(html)) !== null) {
      brokenCtaLinks.add(ctaMatch[1]);
    }
    if (brokenCtaLinks.size > 0) {
      const linkList = [...brokenCtaLinks].slice(0, 5);
      failures.push(`Broken CTA links (would 404 on static clone): ${linkList.join(', ')}`);
      operationalScore = Math.max(0, operationalScore - 15);
    }

    operationalScore = Math.min(100, operationalScore);

    const score = Math.round((visualScore * 0.5) + (operationalScore * 0.5));
    return Response.json({
      status: 'success', score, visual_score: visualScore, operational_score: operationalScore,
      passed: score >= 100, failures, checks,
      visual_checks: { method: fileUrls.length === 2 ? 'screenshot_comparison' : 'content_fallback', summary: llmSummary },
      screenshots: { clone: cloneScreenshot, target: finalTargetScreenshot, mobile: mobileScreenshot },
      target_screenshot: finalTargetScreenshot,
      live_url, target_url, target_org: targetOrg
    });
  } catch (error) {
    return Response.json({ error: error.message, score: 0, passed: false, failures: [error.message] }, { status: 500 });
  }
}