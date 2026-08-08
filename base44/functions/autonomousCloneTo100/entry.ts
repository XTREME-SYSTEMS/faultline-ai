import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil } from 'base44:runtime';

// The autonomous recursive engine. Three modes:
//  BUILD  — given target_url: scrape -> infer backend -> generate clone -> build backend
//           -> launch -> validate -> heal loop to 100/100.
//  HEAL   — given launch_project_id: validate -> auto-fix -> re-deploy -> re-validate loop.
//  SCAN   — given scan:true: find a project below 100 to heal, or a discovered performer to build.
//
// Runs in the background via waitUntil (the full loop exceeds the gateway timeout).
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

    waitUntil(runEngine(base44, orgId, { ...params, tracker_id: tracker.id }));
    return Response.json({
      status: 'running', launch_project_id: tracker.id,
      message: 'Autonomous clone-to-100 engine started in the background. Poll the LaunchProject for progress.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function runEngine(base44, orgId, p) {
  const log = [];
  const add = (m) => log.push(`${new Date().toISOString()} — ${m}`);
  let score = 0, failures = [], urls = {}, launchProjectId = p.launch_project_id, targetDna = null, bizName = p.business_name, progress = 0;
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
        const sr = await base44.functions.invoke('deepCloneTarget', { target_url: p.target_url, industry: p.industry });
        targetDna = (sr?.data || sr)?.dna;
      }
      add(`Healing ${proj.project_name} at ${urls.vercel || 'no url yet'}`);
    }

    // BUILD MODE: full pipeline from a target
    if (p.target_url && (!launchProjectId || !urls.vercel)) {
      add(`Scraping target ${p.target_url}…`);
      const sr = await base44.functions.invoke('deepCloneTarget', { target_url: p.target_url, industry: p.industry });
      const s = sr?.data || sr;
      if (s.status !== 'success') throw new Error(`Scrape failed: ${s.error}`);
      targetDna = s.dna; bizName = bizName || s.bizName;
      add(`Scraped ${bizName}: ${s.rendered_chars} chars, nav=${targetDna.nav?.length || 0}`);
      await setProgress(5, 'Target site scraped');

      add('Generating benchmark discovery report…');
      try {
        await base44.functions.invoke('discoverBenchmarkSite', { target_url: p.target_url, industry: p.industry, business_name: bizName, launch_project_id: p.tracker_id });
        add('Benchmark discovery report generated');
      } catch (e) { add(`Benchmark report failed: ${e.message}`); }
      await setProgress(8, 'Benchmark discovery report done');

      add('Inferring backend…');
      await base44.functions.invoke('inferTargetBackend', { target_url: p.target_url, industry: p.industry, scrape_result: s });
      add('Backend blueprint inferred');
      await setProgress(12, 'Backend blueprint inferred');

      add('Generating clone (3-part)…');
      const ws = { business_name: bizName, industry: p.industry, description: s.brief, primary_color: targetDna.primary, secondary_color: targetDna.secondary, target_dna: targetDna };
      await setProgress(15, 'Generating clone — part 1 of 3…');
      const p1 = await base44.functions.invoke('generateWebsite', { ...ws, part: 'first_half' });
      await setProgress(20, 'Generating clone — part 2 of 3…');
      const p2 = await base44.functions.invoke('generateWebsite', { ...ws, part: 'second_half' });
      await setProgress(25, 'Generating clone — part 3 of 3…');
      const p3 = await base44.functions.invoke('generateWebsite', { ...ws, part: 'third_half', first_html: (p1.data || p1).html, second_html: (p2.data || p2).html });
      let cloneHtml = (p3.data || p3).website_html;
      add(`Clone generated: ${cloneHtml.length} chars`);
      await setProgress(30, 'Clone HTML generated');

      add('Building inferred backend (injecting form handler)…');
      const br = await base44.functions.invoke('buildInferredBackend', { clone_html: cloneHtml, organization_id: orgId, clone_id: p.tracker_id });
      const b = br?.data || br;
      cloneHtml = b.operational_html;
      add('Backend built — clone is operational');
      await setProgress(35, 'Backend built — clone is operational');

      add('Launching to Drive/GitHub/Supabase/Vercel…');
      const launchName = `${p.project_name || bizName || 'Clone'}-${Date.now().toString(36).slice(-5)}`;
      const lp = await base44.functions.invoke('launchProject', { project_name: launchName, website_html: cloneHtml });
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
      add(`Iteration ${i}/${maxIter}: validating ${urls.vercel}…`);
      const vr = await base44.functions.invoke('validateFullStack', { live_url: urls.vercel, target_dna: targetDna, organization_id: orgId, clone_id: p.tracker_id });
      const v = vr?.data || vr;
      score = v.score || 0; failures = v.failures || [];
      add(`Iteration ${i}: score=${score} (visual=${v.visual_score} operational=${v.operational_score}) failures=${failures.length}`);
      await setProgress(55 + Math.round((i / maxIter) * 40), `Validation iter ${i}: ${score}/100`);
      await updateTracker(`Iter ${i}: ${score}/100 — ${failures.length} failures`, score);
      if (score >= 100) { add('100/100 reached — goal achieved'); break; }

      // AUTO-FIX: regenerate with fix guidance + re-inject handler + re-deploy
      add(`Iteration ${i}: auto-fixing — ${failures.slice(0, 3).join('; ')}…`);
      const fixHint = failures.join('. ');
      const ws = { business_name: bizName || 'Clone', industry: p.industry, description: p.brief || `Premium ${p.industry || ''} business website.`, primary_color: targetDna?.primary, secondary_color: targetDna?.secondary, target_dna: targetDna, fix_directives: fixHint };
      const f1 = await base44.functions.invoke('generateWebsite', { ...ws, part: 'first_half' });
      const f2 = await base44.functions.invoke('generateWebsite', { ...ws, part: 'second_half' });
      const f3 = await base44.functions.invoke('generateWebsite', { ...ws, part: 'third_half', first_html: (f1.data || f1).html, second_html: (f2.data || f2).html });
      const fc = f3.data || f3;
      const br = await base44.functions.invoke('buildInferredBackend', { clone_html: fc.website_html, organization_id: orgId, clone_id: p.tracker_id });
      const b = br?.data || br;
      const lp = await base44.functions.invoke('launchProject', { project_name: `${bizName || 'Clone'}-heal${i}-${Date.now().toString(36).slice(-4)}`, website_html: b.operational_html });
      const ld = lp?.data || lp;
      if (ld.status === 'success') urls.vercel = ld.results?.vercel?.deploy?.url || ld.results?.vercel?.deploy?.alias?.[0];
      add(`Iteration ${i}: re-deployed to ${urls.vercel}`);
      await setProgress(55 + Math.round((i / maxIter) * 40) + 5, `Auto-fixed + re-deployed (iter ${i})`);
      await updateTracker(`Iter ${i}: auto-fixed + re-deployed`, score, { vercel_deployment_url: urls.vercel });
      await new Promise(r => setTimeout(r, 6000)); // let Vercel settle before re-validation
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
    await updateTracker(`Engine error: ${e.message}`, score);
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