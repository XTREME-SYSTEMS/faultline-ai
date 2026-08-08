import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Timeout wrapper — prevents generation/launch calls from hanging indefinitely.
// If a sub-call exceeds the deadline, we reject and the engine's catch block
// records the error on the tracker instead of stalling silently at the last
// progress value (which is what happens when waitUntil is killed mid-flight).
const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms)
    )
  ]);

// The autonomous recursive engine. Three modes:
//  BUILD  — given target_url: scrape -> infer backend -> generate clone -> build backend
//           -> launch -> validate -> heal loop to 100/100.
//  HEAL   — given launch_project_id: validate -> auto-fix -> re-deploy -> re-validate loop.
//  SCAN   — given scan:true: find a project below 100 to heal, or a discovered performer to build.
//
// Always runs synchronously (waitUntil background processes get killed by the platform).
// Live progress is written to a tracking LaunchProject each iteration; the final result
// is logged to a QAReport + Receipt. Goal: 100/100 visual + operational parity, autonomously.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const params = {
      target_url: body.target_url, industry: body.industry, business_name: body.business_name,
      project_name: body.project_name, launch_project_id: body.launch_project_id,
      scan: !!body.scan, max_iterations: body.max_iterations || 5, orgId
    };

    // Tracking LaunchProject for live progress
    const tracker = await base44.asServiceRole.entities.LaunchProject.create({
      organization_id: orgId, project_name: params.project_name || `Autonomous Clone ${Date.now().toString(36)}`,
      project_type: 'website', status: 'queued', parity_score: 0,
      last_validation_summary: 'Autonomous clone-to-100 engine started',
      metadata: { autonomous: true, scan: params.scan, target_url: params.target_url }
    });

    // Always run synchronously — waitUntil background processes get killed by the
    // platform before long-running clone/launch/validate operations complete.
    // Sync mode ensures the full pipeline finishes within the function's lifetime
    // (the function continues server-side even if the HTTP client disconnects).
    await runEngine(base44, orgId, { ...params, tracker_id: tracker.id, fix_directives: body.fix_directives });
    const final = await base44.asServiceRole.entities.LaunchProject.get(tracker.id);
    return Response.json({
      status: 'completed', launch_project_id: tracker.id,
      score: final.parity_score, progress: final.progress,
      vercel_url: final.vercel_deployment_url,
      summary: final.last_validation_summary
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function runEngine(base44, orgId, p) {
  const log = [];
  const add = (m) => log.push(`${new Date().toISOString()} — ${m}`);
  let score = 0, failures = [], urls = {}, launchProjectId = p.launch_project_id, targetDna = null, bizName = p.business_name, progress = 0, prevFailureSig = null;
  const progressHistory = [];
  const setProgress = async (pct, stageLabel) => {
    progress = pct;
    progressHistory.push({ ts: Date.now(), progress: pct, stage: stageLabel });
    try {
      await base44.asServiceRole.entities.LaunchProject.update(p.tracker_id, {
        progress: pct, last_validation_summary: stageLabel,
        metadata: { autonomous: true, log: log.slice(-12), urls, progress_history: progressHistory.slice(-60) }
      });
    } catch (e) { /* ignore */ }
  };

  const updateTracker = async (summary, parityScore, extra = {}) => {
    progressHistory.push({ ts: Date.now(), progress: extra.progress ?? progress, stage: summary });
    try {
      await base44.asServiceRole.entities.LaunchProject.update(p.tracker_id, {
        status: parityScore >= 100 ? 'passed' : 'validating',
        parity_score: parityScore, progress: extra.progress ?? progress, last_validation_summary: summary,
        drive_folder_url: urls.drive || undefined,
        github_repo_url: urls.github || undefined,
        supabase_project_url: urls.supabase || undefined,
        vercel_deployment_url: urls.vercel || undefined,
        metadata: { autonomous: true, log: log.slice(-12), urls, progress_history: progressHistory.slice(-60), ...extra }
      });
    } catch (e) {}
  };

  try {
    add('Engine started');
    await setProgress(2, 'Engine started');

    // SCAN MODE: find work
    if (p.scan && !p.target_url && !launchProjectId) {
      add('Scan mode: looking for projects below 100…');
      const projects = await base44.asServiceRole.entities.LaunchProject.filter({ organization_id: orgId }, '-created_date', 30);
      const needsHeal = projects.find(pr => pr.id !== p.tracker_id && (pr.parity_score || 0) > 0 && (pr.parity_score || 0) < 100 && pr.metadata?.target_url);
      if (needsHeal) {
        launchProjectId = needsHeal.id;
        add(`Found project to heal: ${needsHeal.project_name} (score ${needsHeal.parity_score || 0})`);
      } else {
        const performers = await base44.asServiceRole.entities.TopPerformer.filter({ organization_id: orgId, clone_status: 'discovered' }, '-clone_priority', 5);
        if (performers.length > 0) {
          const tp = performers[0];
          p.target_url = tp.url; p.industry = tp.industry; bizName = tp.name;
          add(`Scan: building discovered performer ${tp.name}`);
        } else {
          add('Scan: no work found — all projects at 100, no discovered performers');
          await updateTracker('No work found', 100);
          await finishQa(base44, orgId, p, { score: 100, status: 'passed', log, urls, failures: [], launch_project_id: p.tracker_id });
          return;
        }
      }
    }

    // HEAL MODE: read existing project
    if (launchProjectId && !p.target_url) {
      add(`Heal mode: loading project ${launchProjectId}…`);
      const proj = await base44.asServiceRole.entities.LaunchProject.get(launchProjectId);
      if (!proj) throw new Error('LaunchProject not found');
      targetDna = proj.metadata?.target_dna || null;
      p.target_url = proj.metadata?.target_url || p.target_url;
      p.industry = proj.industry || p.industry;
      bizName = proj.business_name || bizName;
      p.brief = proj.metadata?.brief || p.brief;
      urls.vercel = proj.vercel_deployment_url || proj.metadata?.vercel_deployment_url;
      if (!targetDna && p.target_url) {
        add('Re-scraping for target DNA…');
        const sr = await withTimeout(base44.functions.invoke('deepCloneTarget', { target_url: p.target_url, industry: p.industry }), 90000, 'deepCloneTarget (heal re-scrape)');
        targetDna = (sr?.data || sr)?.dna;
      }
      add(`Healing ${proj.project_name} at ${urls.vercel || 'no url yet'}`);
    }

    // BUILD MODE: full pipeline from a target
    if (p.target_url && (!launchProjectId || !urls.vercel)) {
      add(`Scraping target ${p.target_url}…`);
      const sr = await withTimeout(base44.functions.invoke('deepCloneTarget', { target_url: p.target_url, industry: p.industry }), 90000, 'deepCloneTarget');
      const s = sr?.data || sr;
      if (s.status !== 'success') throw new Error(`Scrape failed: ${s.error}`);
      targetDna = s.dna; bizName = bizName || s.bizName;
      add(`Scraped ${bizName}: ${s.rendered_chars} chars, nav=${targetDna.nav?.length || 0}`);
      await setProgress(5, 'Target site scraped');

      add('Generating benchmark discovery report (background, non-blocking)…');
      base44.functions.invoke('discoverBenchmarkSite', { target_url: p.target_url, industry: p.industry, business_name: bizName, launch_project_id: p.tracker_id }).then(() => add('Benchmark report generated (background)')).catch(e => add(`Benchmark report failed: ${e.message}`));
      await setProgress(8, 'Benchmark report running in background');

      // DETERMINISTIC CLONE: use the target's actual HTML + CSS + images (not LLM
      // reconstruction). This achieves near-100% visual parity because we re-host
      // the real design, swap branding, and inject our form handler. The LLM
      // generation path is kept only as a fallback for targets that block scraping.
      add('Building deterministic clone (re-hosting target HTML + CSS + images)…');
      await setProgress(12, 'Deterministic clone — re-hosting target assets…');
      let cloneHtml;
      let usedDeterministic = false;
      try {
        const dcr = await withTimeout(base44.functions.invoke('deterministicClone', {
          target_url: p.target_url, business_name: bizName,
          organization_id: orgId
        }), 200000, 'deterministicClone');
        const dc = dcr?.data || dcr;
        if (dc.status === 'success' && dc.website_html && dc.website_html.length > 1000) {
          cloneHtml = dc.website_html;
          usedDeterministic = true;
          add(`Deterministic clone built: ${cloneHtml.length} chars, ${dc.images_rehosted}/${dc.images_total} images re-hosted`);
          await setProgress(30, `Deterministic clone built — ${dc.images_rehosted} images re-hosted`);
        } else {
          throw new Error(`Deterministic clone returned ${dc.status || 'empty'} (${dc.website_html?.length || 0} chars)`);
        }
      } catch (dcErr) {
        add(`Deterministic clone failed (${dcErr.message}) — falling back to LLM generation…`);
        await setProgress(15, 'Fallback: LLM generation — parts 1 & 2…');
        const ws = { business_name: bizName, industry: p.industry, description: s.brief, primary_color: targetDna.primary, secondary_color: targetDna.secondary, target_dna: targetDna, fix_directives: p.fix_directives };
        const [p1r, p2r] = await Promise.all([
          withTimeout(base44.functions.invoke('generateWebsite', { ...ws, part: 'first_half' }), 120000, 'generateWebsite first_half'),
          withTimeout(base44.functions.invoke('generateWebsite', { ...ws, part: 'second_half' }), 120000, 'generateWebsite second_half')
        ]);
        const p1 = p1r.data || p1r, p2 = p2r.data || p2r;
        const p3 = await withTimeout(base44.functions.invoke('generateWebsite', { ...ws, part: 'third_half', first_html: p1.html, second_html: p2.html }), 120000, 'generateWebsite third_half');
        cloneHtml = (p3.data || p3).website_html;
        add(`LLM clone generated: ${cloneHtml.length} chars`);
        await setProgress(30, 'LLM clone HTML generated');
        // LLM path still needs backend injection
        const br = await withTimeout(base44.functions.invoke('buildInferredBackend', { clone_html: cloneHtml, organization_id: orgId, clone_id: p.tracker_id }), 60000, 'buildInferredBackend');
        cloneHtml = (br?.data || br).operational_html || cloneHtml;
      }
      // Deterministic path already has the form handler injected — no build step needed.

      add('Launching to Drive/GitHub/Supabase/Vercel…');
      const launchName = `${p.project_name || bizName || 'Clone'}-${Date.now().toString(36).slice(-5)}`;
      const lp = await withTimeout(base44.functions.invoke('launchProject', { project_name: launchName, website_html: cloneHtml }), 120000, 'launchProject');
      const ld = lp?.data || lp;
      if (ld.status !== 'success') throw new Error(`Launch failed: ${JSON.stringify(ld.errors)}`);
      urls = { drive: ld.results?.drive?.url, github: ld.results?.github?.url, supabase: ld.results?.supabase?.url, vercel: ld.results?.vercel?.deploy?.url || ld.results?.vercel?.deploy?.alias?.[0] };
      add(`Launched: ${urls.vercel}`);
      await setProgress(55, `Launched to Vercel — ${urls.vercel}`);
      await updateTracker(`Built + launched ${bizName}`, 0, { target_dna: targetDna, target_url: p.target_url, vercel_deployment_url: urls.vercel, brief: s.brief });
    }

    // HEAL LOOP — validate -> fix -> re-deploy -> re-validate until 100 or max iterations
    const maxIter = p.max_iterations || 5;
    for (let i = 1; i <= maxIter; i++) {
      // Check for user cancellation before starting this iteration
      try {
        const cur = await base44.asServiceRole.entities.LaunchProject.get(p.tracker_id);
        if (cur?.status === 'cancelled') {
          add('Project cancelled by user — stopping');
          await setProgress(progress, 'Cancelled by user');
          break;
        }
      } catch (e) {}
      add(`Iteration ${i}/${maxIter}: validating ${urls.vercel}…`);
      const vr = await withTimeout(base44.functions.invoke('validateFullStack', { live_url: urls.vercel, target_url: p.target_url, target_dna: targetDna, organization_id: orgId, clone_id: p.tracker_id }), 120000, 'validateFullStack');
      const v = vr?.data || vr;
      score = v.score || 0; failures = v.failures || [];
      add(`Iteration ${i}: score=${score} (visual=${v.visual_score} operational=${v.operational_score}) failures=${failures.length}`);
      await setProgress(55 + Math.round((i / maxIter) * 40), `Validation iter ${i}: ${score}/100`);
      await updateTracker(`Iter ${i}: ${score}/100 — ${failures.length} failures`, score);
      if (score >= 100) { add('100/100 reached — goal achieved'); break; }

      // Convergence detection: if the same failures persist across iterations,
      // stop early — further regeneration won't help and wastes time + credits.
      const failureSig = failures.slice().sort().join('|');
      if (failureSig === prevFailureSig) {
        add(`Iteration ${i}: convergence failure — same failures as previous iteration, stopping early`);
        break;
      }
      prevFailureSig = failureSig;

      // AUTO-FIX: re-run deterministic clone (re-hosts any failed images, re-swaps branding)
      // or fall back to LLM generation with fix guidance.
      add(`Iteration ${i}: auto-fixing — ${failures.slice(0, 3).join('; ')}…`);
      const fixHint = failures.join('. ');
      let healHtml;
      try {
        const hcr = await withTimeout(base44.functions.invoke('deterministicClone', {
          target_url: p.target_url, business_name: bizName, organization_id: orgId
        }), 200000, 'heal deterministicClone');
        const hc = hcr?.data || hcr;
        if (hc.status === 'success' && hc.website_html?.length > 1000) {
          healHtml = hc.website_html;
          add(`Iteration ${i}: deterministic re-clone — ${hc.images_rehosted} images re-hosted`);
        } else throw new Error('deterministic clone returned empty');
      } catch (dcErr) {
        add(`Iteration ${i}: deterministic failed (${dcErr.message}) — LLM fallback…`);
        const directives = (i === 1 && p.fix_directives) ? `${p.fix_directives}\n\nAdditional validation failures: ${fixHint}` : fixHint;
        const ws = { business_name: bizName || 'Clone', industry: p.industry, description: p.brief || `Premium ${p.industry || ''} business website.`, primary_color: targetDna?.primary, secondary_color: targetDna?.secondary, target_dna: targetDna, fix_directives: directives };
        const [f1r, f2r] = await Promise.all([
          withTimeout(base44.functions.invoke('generateWebsite', { ...ws, part: 'first_half' }), 120000, 'heal generateWebsite first_half'),
          withTimeout(base44.functions.invoke('generateWebsite', { ...ws, part: 'second_half' }), 120000, 'heal generateWebsite second_half')
        ]);
        const f1 = f1r.data || f1r, f2 = f2r.data || f2r;
        const f3 = await withTimeout(base44.functions.invoke('generateWebsite', { ...ws, part: 'third_half', first_html: f1.html, second_html: f2.html }), 120000, 'heal generateWebsite third_half');
        const fc = f3.data || f3;
        const br = await withTimeout(base44.functions.invoke('buildInferredBackend', { clone_html: fc.website_html, organization_id: orgId, clone_id: p.tracker_id }), 60000, 'heal buildInferredBackend');
        healHtml = (br?.data || br).operational_html || fc.website_html;
      }
      const lp = await withTimeout(base44.functions.invoke('launchProject', { project_name: `${bizName || 'Clone'}-heal${i}-${Date.now().toString(36).slice(-4)}`, website_html: healHtml }), 120000, 'heal launchProject');
      const ld = lp?.data || lp;
      if (ld.status === 'success') urls.vercel = ld.results?.vercel?.deploy?.url || ld.results?.vercel?.deploy?.alias?.[0];
      add(`Iteration ${i}: re-deployed to ${urls.vercel}`);
      await setProgress(55 + Math.round((i / maxIter) * 40) + 5, `Auto-fixed + re-deployed (iter ${i})`);
      await updateTracker(`Iter ${i}: auto-fixed + re-deployed`, score, { vercel_deployment_url: urls.vercel });
      await new Promise(r => setTimeout(r, 3000)); // let Vercel settle before re-validation
    }

    const passed = score >= 100;
    add(`Final: ${score}/100 — ${passed ? 'PASSED' : 'PARTIAL'}`);
    await setProgress(passed ? 100 : progress, passed ? '100/100 achieved' : `Final ${score}/100`);
    await updateTracker(passed ? '100/100 achieved' : `Final ${score}/100`, score, { final: true });
    await finishQa(base44, orgId, p, { score, status: passed ? 'passed' : 'failed', log, urls, failures, launch_project_id: p.tracker_id, bizName });
    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId, system: 'autonomous_clone', action: 'run',
      status: passed ? 'success' : 'partial', summary: `Clone-to-100: ${score}/100 for ${bizName || 'target'}`,
      evidence: { score, urls, failures, iterations: log.filter(l => l.includes('Iteration')).length, qa_target: p.tracker_id }
    });
  } catch (e) {
    add(`ENGINE ERROR: ${e.message}`);
    try {
      await base44.asServiceRole.entities.LaunchProject.update(p.tracker_id, {
        status: 'failed', parity_score: score, progress: progress,
        last_validation_summary: `Engine error: ${e.message}`,
        metadata: { autonomous: true, log: log.slice(-12), urls, error: e.message }
      });
    } catch (e2) {}
    await finishQa(base44, orgId, p, { score, status: 'failed', log, urls, failures: [e.message], launch_project_id: p.tracker_id, bizName });
  }
}

async function finishQa(base44, orgId, p, data) {
  try {
    await base44.asServiceRole.entities.QAReport.create({
      organization_id: orgId,
      target_type: 'website', target_id: data.launch_project_id, target_title: data.bizName || 'Autonomous Clone',
      check_type: 'qa_validation', status: data.status, score: data.score,
      summary: data.status === 'passed' ? '100/100 visual + operational parity achieved' : `Final score ${data.score}/100`,
      issues: (data.failures || []).map(f => ({ severity: 'high', category: 'parity', description: f, recommendation: 'Auto-fix attempted via regeneration + re-deploy' })),
      recommendations: (data.failures || []).slice(0, 5),
      auto_generated: true
    });
  } catch (e) { console.error('finishQa failed:', e); }
}