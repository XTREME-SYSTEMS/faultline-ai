import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Deep forensic audit across ALL cloned websites in the system.
// Phase 1: Parallel audit — validateFullStack on every deployed site (batches of 3)
// Phase 2: Write QA reports with identified gaps + update LaunchProject scores
// Phase 3: Heal sites below 100 (sequential — each heal is resource-intensive)
// Phase 4: Re-validate healed sites and write final proof scores
//
// Every audit + heal writes a QAReport (proof) and a Receipt (batch evidence).

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms)
    )
  ]);

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const maxSites = body.max_sites || 30;
    const doHeal = body.heal !== false;
    const maxHealSites = body.max_heal_sites || 10;
    const batchSize = body.parallel_batch_size || 3;

    // ── Find all deployed clone sites ──
    const allProjects = await base44.asServiceRole.entities.LaunchProject.filter(
      { organization_id: orgId }, '-created_date', 200
    );

    // Only sites with a live Vercel URL
    const deployed = allProjects.filter(p =>
      p.vercel_deployment_url && p.project_type === 'website'
    );

    // Deduplicate by vercel_deployment_url (keep the newest record per URL)
    const urlMap = {};
    for (const p of deployed) {
      const url = p.vercel_deployment_url;
      if (!urlMap[url] || new Date(p.created_date) > new Date(urlMap[url].created_date)) {
        urlMap[url] = p;
      }
    }
    const uniqueSites = Object.values(urlMap).slice(0, maxSites);

    const results = {
      total_audited: 0,
      passed_initial: 0,
      healed_to_100: 0,
      still_failing: 0,
      heal_errors: 0,
      sites: []
    };

    // ═══════════════════════════════════════════════════════════════
    // PHASE 1: Deep forensic audit — parallel batches
    // ═══════════════════════════════════════════════════════════════
    console.log(`Phase 1: Auditing ${uniqueSites.length} sites in batches of ${batchSize}…`);
    const auditResults = [];
    for (let i = 0; i < uniqueSites.length; i += batchSize) {
      const batch = uniqueSites.slice(i, i + batchSize);
      const batchAudits = await Promise.all(
        batch.map(p => auditOne(base44, orgId, p).catch(e => ({
          project: p, score: 0, failures: [`Audit error: ${e.message}`],
          visual_score: 0, operational_score: 0
        })))
      );
      auditResults.push(...batchAudits);
      console.log(`  Batch ${Math.floor(i / batchSize) + 1} done: ${batchAudits.map(a => a.score).join(', ')}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 2: Write QA reports with gaps + update scores
    // ═══════════════════════════════════════════════════════════════
    console.log('Phase 2: Writing QA reports + updating scores…');
    for (const audit of auditResults) {
      results.total_audited++;

      // Write QA report — the "proof" with all identified gaps
      const qaReport = await base44.asServiceRole.entities.QAReport.create({
        organization_id: orgId,
        target_type: 'website',
        target_id: audit.project.id,
        target_title: audit.project.project_name,
        check_type: 'qa_validation',
        status: audit.score >= 100 ? 'passed' : 'failed',
        score: audit.score,
        summary: `Deep forensic audit: ${audit.score}/100 (visual=${audit.visual_score || 0}, operational=${audit.operational_score || 0}) — ${audit.failures.length} gaps identified`,
        issues: audit.failures.map(f => ({
          severity: 'high',
          category: 'parity',
          description: f,
          recommendation: 'Auto-heal via regeneration + re-deploy'
        })),
        auto_generated: true
      });

      // Update LaunchProject with score + qa_report_id
      await base44.asServiceRole.entities.LaunchProject.update(audit.project.id, {
        parity_score: audit.score,
        qa_report_id: qaReport.id,
        last_validation_summary: `Forensic audit: ${audit.score}/100 — ${audit.failures.length} gaps`,
        status: audit.score >= 100 ? 'passed' : 'validating'
      });

      results.sites.push({
        project_id: audit.project.id,
        name: audit.project.project_name,
        url: audit.project.vercel_deployment_url,
        target_url: audit.project.metadata?.target_url,
        initial_score: audit.score,
        visual_score: audit.visual_score,
        operational_score: audit.operational_score,
        gaps: audit.failures,
        qa_report_id: qaReport.id
      });

      if (audit.score >= 100) results.passed_initial++;
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 3 + 4: Heal sites below 100, then re-validate
    // ═══════════════════════════════════════════════════════════════
    if (doHeal) {
      const needsHeal = auditResults
        .filter(a => a.score < 100 && a.project.metadata?.target_url)
        .slice(0, maxHealSites);

      console.log(`Phase 3: Healing ${needsHeal.length} sites below 100/100…`);

      for (const audit of needsHeal) {
        const siteResult = results.sites.find(s => s.project_id === audit.project.id);
        try {
          // Heal via autonomousCloneTo100 (heal mode — reads existing project data)
          const hr = await withTimeout(
            base44.functions.invoke('autonomousCloneTo100', {
              launch_project_id: audit.project.id,
              max_iterations: 5
            }),
            600000, // 10 min per site
            `heal ${audit.project.project_name}`
          );
          const h = hr?.data || hr;
          const healedUrl = h.vercel_url || audit.project.vercel_deployment_url;

          // Update original project with healed URL + score
          await base44.asServiceRole.entities.LaunchProject.update(audit.project.id, {
            vercel_deployment_url: healedUrl,
            parity_score: h.score || 0,
            last_validation_summary: `Post-heal: ${h.score || 0}/100`
          });

          // Phase 4: Re-validate the healed site for proof
          console.log(`Phase 4: Re-validating ${audit.project.project_name}…`);
          const reval = await auditOne(base44, orgId, audit.project, healedUrl);

          // Write final QA report — the proof score after healing
          const finalQa = await base44.asServiceRole.entities.QAReport.create({
            organization_id: orgId,
            target_type: 'website',
            target_id: audit.project.id,
            target_title: audit.project.project_name,
            check_type: 'qa_validation',
            status: reval.score >= 100 ? 'passed' : 'failed',
            score: reval.score,
            summary: `Post-heal validation: ${reval.score}/100 (visual=${reval.visual_score || 0}, operational=${reval.operational_score || 0}) — ${reval.failures.length} remaining gaps`,
            issues: reval.failures.map(f => ({
              severity: reval.score >= 90 ? 'medium' : 'high',
              category: 'parity',
              description: f,
              recommendation: 'Further regeneration needed'
            })),
            auto_generated: true
          });

          // Final update with proof score
          await base44.asServiceRole.entities.LaunchProject.update(audit.project.id, {
            parity_score: reval.score,
            qa_report_id: finalQa.id,
            last_validation_summary: `Post-heal: ${reval.score}/100 — ${reval.failures.length} remaining`,
            status: reval.score >= 100 ? 'passed' : 'failed'
          });

          if (siteResult) {
            siteResult.final_score = reval.score;
            siteResult.healed_url = healedUrl;
            siteResult.healed = reval.score >= 100;
            siteResult.remaining_gaps = reval.failures;
            siteResult.final_qa_report_id = finalQa.id;
          }

          if (reval.score >= 100) results.healed_to_100++;
          else results.still_failing++;

          console.log(`  ${audit.project.project_name}: ${audit.score} → ${reval.score}/100`);
        } catch (e) {
          if (siteResult) siteResult.heal_error = e.message;
          results.heal_errors++;
          results.still_failing++;
          console.error(`  Heal failed for ${audit.project.project_name}: ${e.message}`);
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // Write batch receipt — the proof record for the entire batch
    // ═══════════════════════════════════════════════════════════════
    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'batch_forensic_audit',
      action: 'run',
      status: results.still_failing > 0 ? 'partial' : 'success',
      summary: `Forensic audit: ${results.total_audited} sites audited, ${results.passed_initial} passed initial, ${results.healed_to_100} healed to 100, ${results.still_failing} still failing`,
      evidence: {
        total_audited: results.total_audited,
        passed_initial: results.passed_initial,
        healed_to_100: results.healed_to_100,
        still_failing: results.still_failing,
        heal_errors: results.heal_errors,
        site_scores: results.sites.map(s => ({
          name: s.name,
          url: s.url,
          initial_score: s.initial_score,
          final_score: s.final_score || s.initial_score,
          healed: s.healed || s.initial_score >= 100,
          gaps: (s.gaps || []).length,
          remaining_gaps: (s.remaining_gaps || []).length
        }))
      }
    });

    console.log(`Batch complete: ${results.total_audited} audited, ${results.passed_initial} passed, ${results.healed_to_100} healed, ${results.still_failing} failing`);

    return Response.json({ status: 'success', ...results });
  } catch (error) {
    console.error('batchForensicAudit error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Run a deep forensic validation on one site — returns score + identified gaps
async function auditOne(base44, orgId, project, overrideUrl) {
  const liveUrl = overrideUrl || project.vercel_deployment_url;
  const vr = await withTimeout(
    base44.functions.invoke('validateFullStack', {
      live_url: liveUrl,
      target_url: project.metadata?.target_url,
      target_dna: project.metadata?.target_dna,
      organization_id: orgId,
      clone_id: project.id
    }),
    120000,
    `validateFullStack ${project.project_name}`
  );
  const v = vr?.data || vr;
  return {
    project,
    score: v.score || 0,
    failures: v.failures || [],
    visual_score: v.visual_score || 0,
    operational_score: v.operational_score || 0
  };
}