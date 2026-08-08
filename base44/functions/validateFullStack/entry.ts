import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

// Full-stack validator: scores a live clone on VISUAL parity (vs the target's scraped
// DNA) and OPERATIONAL parity (form handler responds + saves, form is wired, page loads).
// Returns a 0-100 score, sub-scores, and a list of specific failures for the auto-healer.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    const body = await req.json().catch(() => ({}));
    const { live_url, target_dna, organization_id, clone_id } = body;
    if (!live_url) return Response.json({ error: 'live_url required' }, { status: 400 });
    const targetOrg = organization_id || orgId;

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

    // Visual parity vs target DNA
    const nav = (target_dna?.nav || []).filter(n => n && n.length > 1);
    const h2 = (target_dna?.h2 || []).filter(h => h && h.length > 1);
    const phone = target_dna?.phone;
    const stripRE = (s) => s.replace(/[^a-z0-9]/gi, '').slice(0, 15);
    // Strip the HTML to pure alnum too, so multi-word nav items / headings (e.g.
    // "Moisture Barriers") match even though the raw HTML has spaces between words.
    const strippedHtml = html.replace(/[^a-z0-9]/gi, '');
    const navPresent = nav.filter(n => { const re = stripRE(n); return re && new RegExp(re, 'i').test(strippedHtml); }).length;
    const h2Present = h2.filter(h => { const re = stripRE(h); return re && new RegExp(re, 'i').test(strippedHtml); }).length;
    const phonePresent = phone ? new RegExp(phone.replace(/[^\d]/g, '').slice(0, 6)).test(html.replace(/[^\d]/g, '')) : true;
    const hasContact = /contact/i.test(html);

    const navScore = nav.length ? navPresent / nav.length : 1;
    const h2Score = h2.length ? h2Present / h2.length : 1;
    const visualScore = Math.round(((navScore * 0.4) + (h2Score * 0.3) + (phonePresent ? 0.15 : 0) + (hasContact ? 0.15 : 0)) * 100);

    // Operational parity — POST to the form handler
    let operationalScore = 0;
    const failures = [];
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

    if (navScore < 1) failures.push(`Missing ${nav.length - navPresent}/${nav.length} nav items`);
    if (h2Score < 1) failures.push(`Missing ${h2.length - h2Present}/${h2.length} section headings`);
    if (phone && !phonePresent) failures.push(`Target phone ${phone} not reproduced`);
    if (!hasContact) failures.push('No contact section found');

    const score = Math.round((visualScore * 0.5) + (operationalScore * 0.5));
    return Response.json({
      status: 'success', score, visual_score: visualScore, operational_score: operationalScore,
      passed: score >= 100, failures, checks,
      visual_checks: { navPresent, navTotal: nav.length, h2Present, h2Total: h2.length, phonePresent, hasContact },
      live_url, target_org: targetOrg
    });
  } catch (error) {
    return Response.json({ error: error.message, score: 0, passed: false, failures: [error.message] }, { status: 500 });
  }
}