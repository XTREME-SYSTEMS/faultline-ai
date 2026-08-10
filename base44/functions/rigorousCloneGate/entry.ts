import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Rigorous Recursive Clone Gate — the mandatory quality gate EVERY clone must
// pass before it enters the gallery. For a given clone (launch_project_id):
//
//   Loop up to max_iterations:
//     1. VALIDATE  — validateFullStack (visual + operational parity, 0-100)
//     2. AUDIT     — forensic audit (HTTP, security headers, HTML structure, content depth)
//     3. ANALYZE   — collect all failures from validation + audit
//     4. If score == 100 AND no critical audit issues → PASSED (gallery-ready)
//     5. FIX/HEAL  — autonomousCloneTo100 with fix directives from the failures
//     6. HARDEN    — security header findings passed to the heal engine
//     7. Re-validate (next iteration)
//
// If max iterations are reached without 100/100 + clean audit → FAILED (NOT gallery-ready).
// This is intentionally strict: a clone only enters the gallery when it is truly 100/100.

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
    const { launch_project_id, target_url, max_iterations } = body;
    if (!launch_project_id) return Response.json({ error: 'launch_project_id required' }, { status: 400 });

    let project = await base44.asServiceRole.entities.LaunchProject.get(launch_project_id);
    if (!project) return Response.json({ error: 'LaunchProject not found' }, { status: 404 });

    const maxIter = max_iterations || 3;
    const log = [];
    const add = (m) => log.push(`${new Date().toISOString()} — ${m}`);

    let score = project.parity_score || 0;
    let auditScore = 0;
    let failures = [];
    let auditChecks = {};
    let passed = false;
    let liveUrl = project.vercel_deployment_url || project.metadata?.vercel_deployment_url;
    const benchmarkUrl = target_url || project.benchmark_url || project.metadata?.target_url;

    add(`Rigorous gate started for ${project.project_name} (max ${maxIter} iterations)`);

    for (let i = 1; i <= maxIter; i++) {
      add(`Iteration ${i}/${maxIter}: validating + auditing…`);

      // Re-fetch project to get latest URL
      project = await base44.asServiceRole.entities.LaunchProject.get(launch_project_id);
      liveUrl = project.vercel_deployment_url || project.metadata?.vercel_deployment_url;

      if (!liveUrl) {
        add(`Iteration ${i}: no live URL — building clone from scratch…`);
        const buildRes = await withTimeout(
          base44.functions.invoke('autonomousCloneTo100', {
            target_url: benchmarkUrl,
            launch_project_id,
            industry: project.industry,
            business_name: project.business_name,
            project_name: project.project_name,
            max_iterations: 3,
          }), 300000, 'rigorousGate build'
        ).catch(e => ({ error: e.message }));
        const bd = buildRes?.data || buildRes;
        if (bd.error) add(`Build error: ${bd.error}`);
        continue; // re-loop to validate the new build
      }

      // 1. VALIDATE — visual + operational parity
      let v;
      try {
        const vRes = await withTimeout(
          base44.functions.invoke('validateFullStack', {
            live_url: liveUrl,
            target_url: benchmarkUrl,
            target_dna: project.metadata?.target_dna,
            organization_id: orgId,
            clone_id: launch_project_id,
          }), 120000, 'validateFullStack'
        );
        v = vRes?.data || vRes;
        if (v.error) throw new Error(v.error);
      } catch (e) {
        add(`Validation error: ${e.message}`);
        v = { score: 0, failures: [`Validation error: ${e.message}`], visual_score: 0, operational_score: 0 };
      }
      score = v.score || 0;
      failures = v.failures || [];

      // 2. AUDIT — forensic security + structure check
      let audit;
      try {
        audit = await forensicAudit(liveUrl);
      } catch (e) {
        audit = { score: 0, checks: { http_ok: false, error: e.message, missing_security_headers: SECURITY_HEADERS } };
      }
      auditScore = audit.score;
      auditChecks = audit.checks;

      add(`Iteration ${i}: validate=${score}/100 (visual=${v.visual_score} op=${v.operational_score}), forensic=${auditScore}/100, failures=${failures.length}`);

      // 3. ANALYZE — critical audit issues that block gallery entry
      const criticalAuditIssues = [];
      if (!auditChecks.http_ok) criticalAuditIssues.push('HTTP not returning 200');
      if (!auditChecks.has_doctype) criticalAuditIssues.push('Missing <!doctype>');
      if (!auditChecks.has_form_handler) criticalAuditIssues.push('Missing form handler script');
      if (auditChecks.content_length < 5000) criticalAuditIssues.push('Content too thin (<5KB)');
      if (auditChecks.missing_security_headers?.length > 3) criticalAuditIssues.push(`${auditChecks.missing_security_headers.length} missing security headers`);

      // 4. PASS CONDITION: validate 100 AND no critical audit issues AND forensic >= 85
      if (score >= 100 && criticalAuditIssues.length === 0 && auditScore >= 85) {
        passed = true;
        add(`PASSED at iteration ${i}: 100/100 validation + forensic ${auditScore}/100 + no critical issues`);
        break;
      }

      // 5. FIX / HEAL / HARDEN — recursive heal with all failures as directives
      const allFailures = [...failures, ...criticalAuditIssues.map(iss => `Fix: ${iss}`)];
      add(`Iteration ${i}: healing — ${allFailures.slice(0, 4).join('; ')}…`);

      const fixDirectives = allFailures.join('. ');
      const healRes = await withTimeout(
        base44.functions.invoke('autonomousCloneTo100', {
          launch_project_id,
          target_url: benchmarkUrl,
          industry: project.industry,
          business_name: project.business_name,
          project_name: project.project_name,
          max_iterations: 2,
          fix_directives: fixDirectives,
          harden: true,
          forensic_findings: auditChecks,
        }), 280000, 'rigorousGate heal'
      ).catch(e => ({ error: e.message }));
      const hd = healRes?.data || healRes;
      if (hd.error) add(`Heal error: ${hd.error}`);
      else add(`Heal complete: score ${hd.score ?? 'unknown'}`);

      // Re-fetch to get the new score/URL after healing
      project = await base44.asServiceRole.entities.LaunchProject.get(launch_project_id);
      score = project.parity_score || 0;
      liveUrl = project.vercel_deployment_url || project.metadata?.vercel_deployment_url;

      // Let Vercel settle before re-validation
      await new Promise(r => setTimeout(r, 4000));
    }

    // Final status update on the LaunchProject
    await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, {
      status: passed ? 'passed' : 'failed',
      parity_score: score,
      last_validation_summary: passed
        ? 'Rigorous gate passed: 100/100 + forensic audit clear'
        : `Rigorous gate failed at ${score}/100 after ${maxIter} iterations`,
    });

    // QA report — rigorous gate result
    try {
      await base44.asServiceRole.entities.QAReport.create({
        organization_id: orgId,
        target_type: 'website', target_id: launch_project_id, target_title: project.project_name,
        check_type: 'qa_validation', status: passed ? 'passed' : 'failed', score,
        summary: passed
          ? 'Rigorous recursive gate passed (100/100 visual+operational parity + forensic audit clear)'
          : `Failed rigorous gate after ${maxIter} recursive iterations at ${score}/100`,
        issues: failures.map(f => ({ severity: 'high', category: 'parity', description: f, recommendation: 'Auto-fix attempted via recursive heal/harden loop' })),
        recommendations: failures.slice(0, 5),
        auto_generated: true,
      });
    } catch (e) { console.error('QA report failed:', e.message); }

    // Receipt
    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'rigorous_clone_gate', action: 'gate',
        status: passed ? 'success' : 'partial',
        summary: `Rigorous gate ${passed ? 'PASSED' : 'FAILED'}: ${project.project_name} at ${score}/100 (forensic ${auditScore}/100)`,
        evidence: { passed, score, audit_score: auditScore, iterations: log.length, missing_headers: auditChecks.missing_security_headers, failures: failures.slice(0, 10) },
      });
    } catch (e) { /* ignore */ }

    return Response.json({
      status: passed ? 'passed' : 'failed',
      passed,
      score,
      audit_score: auditScore,
      iterations: log.length,
      summary: passed
        ? '100/100 visual + operational parity + forensic audit clear'
        : `Failed after ${maxIter} rigorous iterations at ${score}/100`,
      failures: failures.slice(0, 10),
      log,
    });
  } catch (error) {
    console.error('rigorousCloneGate error:', error.message);
    return Response.json({ error: error.message, passed: false, score: 0 }, { status: 500 });
  }
}