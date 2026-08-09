import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Deep forensic audit + auto-harden + auto-validate across ALL cloned sites.
// For each live clone: checks HTTP status, security headers (CSP, HSTS,
// X-Frame-Options, X-Content-Type-Options, Referrer-Policy), HTML structure
// (doctype, viewport, nav, form, form handler), and content depth. Any site
// below 100/100 or failing forensic checks gets re-healed via the autonomous
// clone engine. Returns a summary of audited, hardened, and still-failing sites.

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms)
    )
  ]);

const SECURITY_HEADERS = [
  'content-security-policy',
  'strict-transport-security',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy'
];

async function forensicAudit(url) {
  const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
  const html = await r.text();
  const headers = {};
  r.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

  const checks = {
    http_ok: r.status === 200,
    has_doctype: /<!doctype/i.test(html),
    has_viewport: /viewport/i.test(html),
    has_nav: /<nav/i.test(html),
    has_form: /<form/i.test(html),
    has_form_handler: /ingestCloneLead|action=["']/.test(html),
    content_length: html.length,
    has_https: url.startsWith('https://') || headers['strict-transport-security'] !== undefined,
    missing_security_headers: SECURITY_HEADERS.filter(h => !headers[h])
  };

  // Score: start at 100, deduct for each failure
  let score = 100;
  if (!checks.http_ok) score -= 30;
  if (!checks.has_doctype) score -= 5;
  if (!checks.has_viewport) score -= 5;
  if (!checks.has_nav) score -= 5;
  if (!checks.has_form) score -= 5;
  if (!checks.has_form_handler) score -= 10;
  if (checks.content_length < 5000) score -= 10;
  checks.missing_security_headers.forEach(() => score -= 3);

  return { score: Math.max(0, score), checks, headers };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const maxIterations = body.max_iterations || 2;

    // Get ALL launched clone projects with a live URL
    const allProjects = await base44.asServiceRole.entities.LaunchProject.filter(
      { organization_id: orgId }, '-created_date', 200
    );

    const auditable = allProjects.filter(
      p => p.vercel_deployment_url || p.metadata?.target_url
    );

    console.log(`forensicAuditAndHarden: ${auditable.length} sites to audit`);

    const results = [];
    let hardened = 0;
    let stillFailing = 0;
    let allClear = 0;

    for (const project of auditable) {
      const liveUrl = project.vercel_deployment_url;
      const beforeScore = project.parity_score || 0;
      console.log(`Forensic audit: ${project.project_name} (score ${beforeScore})`);

      let auditResult = null;
      try {
        if (liveUrl) {
          auditResult = await forensicAudit(liveUrl);
        } else {
          // No live URL — needs a heal pass to deploy first
          auditResult = { score: 0, checks: { http_ok: false, missing_security_headers: SECURITY_HEADERS } };
        }
      } catch (e) {
        auditResult = { score: 0, checks: { http_ok: false, error: e.message, missing_security_headers: SECURITY_HEADERS } };
      }

      const needsHeal = auditResult.score < 100 || beforeScore < 100;

      if (needsHeal) {
        try {
          const healRes = await withTimeout(
            base44.functions.invoke('autonomousCloneTo100', {
              launch_project_id: project.id,
              max_iterations: maxIterations,
              scan: false,
              harden: true, // signal to apply security headers during re-clone
              forensic_findings: auditResult.checks
            }),
            110000,
            `forensic heal ${project.project_name}`
          ).catch(e => ({ error: e.message }));

          const hd = healRes?.data || healRes;
          const afterScore = hd?.score ?? auditResult.score;

          results.push({
            id: project.id, name: project.project_name,
            before: beforeScore, after: afterScore,
            forensic_score: auditResult.score,
            missing_headers: auditResult.checks.missing_security_headers,
            status: afterScore >= 100 ? 'hardened' : 'partial',
            error: hd?.error || null
          });

          if (afterScore >= 100) hardened++;
          else stillFailing++;
          console.log(`  → ${project.project_name}: ${beforeScore} → ${afterScore} ${afterScore >= 100 ? '✓ HARDENED' : ''}`);
        } catch (e) {
          results.push({
            id: project.id, name: project.project_name,
            before: beforeScore, after: beforeScore,
            forensic_score: auditResult.score, status: 'error', error: e.message
          });
          stillFailing++;
        }
      } else {
        // Already at 100 and passes forensic checks
        results.push({
          id: project.id, name: project.project_name,
          before: beforeScore, after: beforeScore,
          forensic_score: auditResult.score, status: 'clear',
          missing_headers: auditResult.checks.missing_security_headers
        });
        allClear++;
      }
    }

    // Summary receipt
    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'forensic_audit', action: 'audit_and_harden',
        status: stillFailing === 0 ? 'success' : 'partial',
        summary: `Forensic audit: ${allClear} clear, ${hardened} hardened, ${stillFailing} still failing`,
        evidence: { total: auditable.length, allClear, hardened, stillFailing, results: results.slice(0, 30) }
      });
    } catch (e) { console.error('receipt failed:', e); }

    return Response.json({
      status: 'completed',
      total_audited: auditable.length,
      all_clear: allClear,
      hardened,
      still_failing: stillFailing,
      results: results.slice(0, 50)
    });
  } catch (error) {
    console.error('forensicAuditAndHarden error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}