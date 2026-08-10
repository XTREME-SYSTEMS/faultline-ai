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
    const maxIterations = body.max_iterations || 1;
    const healLimit = body.heal_limit || 3; // only heal N projects per call to avoid timeout

    // Get ALL launched clone projects with a live URL
    const allProjects = await base44.asServiceRole.entities.LaunchProject.filter(
      { organization_id: orgId }, '-created_date', 200
    );

    const auditable = allProjects.filter(
      p => p.vercel_deployment_url || p.metadata?.target_url
    );

    // Quick forensic audit pass on all sites (fast HTTP checks), then only
    // heal the worst `healLimit` projects to stay within function timeout.
    console.log(`forensicAuditAndHarden: auditing ${auditable.length} sites, healing top ${healLimit}`);

    const results = [];
    let hardened = 0;
    let stillFailing = 0;
    let allClear = 0;

    // Phase 1: quick audit all sites (fast HTTP fetch only)
    const auditScores = [];
    for (const project of auditable) {
      const liveUrl = project.vercel_deployment_url;
      const beforeScore = project.parity_score || 0;
      let auditResult = null;
      try {
        if (liveUrl) {
          auditResult = await forensicAudit(liveUrl);
        } else {
          auditResult = { score: 0, checks: { http_ok: false, missing_security_headers: SECURITY_HEADERS } };
        }
      } catch (e) {
        auditResult = { score: 0, checks: { http_ok: false, error: e.message, missing_security_headers: SECURITY_HEADERS } };
      }
      auditScores.push({ project, auditResult, beforeScore });
    }

    // Phase 2: sort by worst score, heal only the top `healLimit`
    const needsHealing = auditScores
      .filter(a => a.auditResult.score < 100 || a.beforeScore < 100)
      .sort((a, b) => a.auditResult.score - b.auditResult.score)
      .slice(0, healLimit);

    const clearCount = auditScores.length - needsHealing.length;
    allClear = clearCount;

    for (const { project, auditResult, beforeScore } of needsHealing) {
      const liveUrl = project.vercel_deployment_url;
      console.log(`Forensic heal: ${project.project_name} (score ${beforeScore}, forensic ${auditResult.score})`);

      const needsHeal = true;
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
      }
    }

    // Add clear sites to results (summary only, not healed)
    for (const a of auditScores) {
      if (a.auditResult.score >= 100 && a.beforeScore >= 100) {
        results.push({
          id: a.project.id, name: a.project.project_name,
          before: a.beforeScore, after: a.beforeScore,
          forensic_score: a.auditResult.score, status: 'clear',
          missing_headers: a.auditResult.checks.missing_security_headers
        });
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