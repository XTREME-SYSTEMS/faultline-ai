import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Autonomous Code Heal — recursive code implementation + test + score loop.
//
// For each cloned site below 100/100:
//   1. Creates a to-do list (RepairTask per identified gap)
//   2. Fetches the live HTML from Vercel
//   3. LLM generates targeted code fixes (find-and-replace operations)
//   4. Applies fixes, deploys to Vercel
//   5. Validates with validateFullStack → writes QA report (proof score)
//   6. Updates RepairTasks (resolved or remaining)
//   7. Recurses with new gaps until 100/100 or max iterations
//
// Unlike autonomousCloneTo100 (which re-clones from target), this fixes the
// EXISTING deployed HTML with surgical code patches — no re-scraping needed.

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
    const projectId = body.project_id;
    const maxIter = body.max_iterations || 5;
    const maxSites = body.max_sites || 10;

    const vercelToken = Deno.env.get('VERCEL_TOKEN');
    const vercelTeamId = Deno.env.get('VERCEL_TEAM_ID');
    if (!vercelToken) return Response.json({ error: 'VERCEL_TOKEN not set' }, { status: 500 });

    // ── Find sites to heal ──
    let sites;
    if (projectId) {
      const p = await base44.asServiceRole.entities.LaunchProject.get(projectId);
      if (!p) return Response.json({ error: 'Project not found' }, { status: 404 });
      sites = [p];
    } else {
      const all = await base44.asServiceRole.entities.LaunchProject.filter(
        { organization_id: orgId, project_type: 'website' }, '-created_date', 200
      );
      // Deduplicate by vercel URL (keep newest), filter to below 100
      const urlMap = {};
      for (const p of all) {
        if (!p.vercel_deployment_url) continue;
        const url = p.vercel_deployment_url;
        if (!urlMap[url] || new Date(p.created_date) > new Date(urlMap[url].created_date)) {
          urlMap[url] = p;
        }
      }
      sites = Object.values(urlMap)
        .filter(p => (p.parity_score || 0) < 100)
        .sort((a, b) => (a.parity_score || 0) - (b.parity_score || 0))
        .slice(0, maxSites);
    }

    if (sites.length === 0) {
      return Response.json({ status: 'success', message: 'No sites below 100/100 found', results: [] });
    }

    console.log(`Code heal: processing ${sites.length} sites…`);
    const results = [];

    for (const site of sites) {
      try {
        const result = await healSiteRecursive(base44, orgId, site, maxIter, vercelToken, vercelTeamId);
        results.push(result);
      } catch (e) {
        console.error(`Heal failed for ${site.project_name}: ${e.message}`);
        results.push({
          project_id: site.id, name: site.project_name,
          error: e.message, healed: false
        });
      }
    }

    // ── Write batch receipt ──
    const healedCount = results.filter(r => r.healed).length;
    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'autonomous_code_heal',
      action: 'run',
      status: healedCount === results.length ? 'success' : 'partial',
      summary: `Code heal: ${results.length} sites processed, ${healedCount} healed to 100/100, ${results.length - healedCount} still failing`,
      evidence: {
        total_sites: results.length,
        healed: healedCount,
        still_failing: results.length - healedCount,
        site_results: results.map(r => ({
          name: r.name,
          initial_score: r.initial_score,
          final_score: r.final_score,
          iterations: r.iterations,
          healed: r.healed
        }))
      }
    });

    return Response.json({ status: 'success', total_sites: results.length, healed: healedCount, results });
  } catch (error) {
    console.error('autonomousCodeHeal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════
// Recursive heal loop for a single site
// ═══════════════════════════════════════════════════════════════
async function healSiteRecursive(base44, orgId, site, maxIter, vercelToken, vercelTeamId) {
  let currentUrl = site.vercel_deployment_url;
  let currentScore = site.parity_score || 0;
  let currentGaps = [];
  const history = [];
  let prevGapSig = null;

  // ── Initial validation to get current gaps ──
  console.log(`[${site.project_name}] Initial validation…`);
  const initialAudit = await validateSite(base44, orgId, site, currentUrl);
  currentScore = initialAudit.score;
  currentGaps = initialAudit.failures;

  if (currentScore >= 100) {
    return {
      project_id: site.id, name: site.project_name,
      initial_score: currentScore, final_score: currentScore,
      iterations: 0, healed: true, history: []
    };
  }

  // ── Create to-do list: RepairTask per gap ──
  console.log(`[${site.project_name}] Creating ${currentGaps.length} repair tasks…`);
  const repairTasks = [];
  for (const gap of currentGaps) {
    try {
      const task = await base44.asServiceRole.entities.RepairTask.create({
        organization_id: orgId,
        project_id: site.id,
        description: gap,
        fix_strategy: 'autonomous code fix via LLM',
        status: 'identified',
        priority: 'high',
        area: 'quality',
        check_name: 'forensic_audit'
      });
      repairTasks.push({ gap, taskId: task.id, resolved: false });
    } catch (e) { /* non-blocking */ }
  }

  // ── Recursive code heal loop ──
  for (let iter = 1; iter <= maxIter && currentScore < 100; iter++) {
    console.log(`[${site.project_name}] Iteration ${iter}/${maxIter}: score=${currentScore}, gaps=${currentGaps.length}`);

    // Convergence check: same gaps as last iteration → stop
    const gapSig = currentGaps.slice().sort().join('|');
    if (gapSig === prevGapSig && iter > 1) {
      console.log(`[${site.project_name}] Convergence: same gaps as previous iteration, stopping`);
      break;
    }
    prevGapSig = gapSig;

    // 1. Fetch live HTML
    const html = await fetchLiveHtml(currentUrl);
    if (!html || html.length < 500) {
      console.log(`[${site.project_name}] Could not fetch HTML, skipping`);
      break;
    }

    // 2. Generate code fixes via LLM (find-and-replace operations)
    const fixResult = await generateCodeFixes(base44, html, currentGaps, site);

    // 3. Apply fixes
    let fixedHtml = html;
    let appliedCount = 0;
    const appliedChanges = [];
    for (const change of (fixResult.changes || [])) {
      if (change.find && change.replace !== undefined && fixedHtml.includes(change.find)) {
        fixedHtml = fixedHtml.replace(change.find, change.replace);
        appliedCount++;
        appliedChanges.push(change.gap_addressed || 'unnamed fix');
      }
    }

    console.log(`[${site.project_name}] Iter ${iter}: ${appliedCount}/${(fixResult.changes || []).length} fixes applied`);

    if (appliedCount === 0) {
      console.log(`[${site.project_name}] No fixes could be applied, stopping`);
      history.push({ iteration: iter, score: currentScore, changes_applied: 0, reason: 'no matching find strings' });
      break;
    }

    // 4. Deploy fixed HTML to Vercel
    const slug = slugify(`${site.project_name}-codeheal-iter${iter}-${Date.now().toString(36).slice(-4)}`);
    try {
      const projectResult = await createVercelProject(vercelToken, vercelTeamId, slug);
      await disableVercelSso(vercelToken, vercelTeamId, projectResult.id);
      const deployResult = await deployToVercel(vercelToken, vercelTeamId, slug, projectResult.id, fixedHtml);
      currentUrl = deployResult.url || currentUrl;
    } catch (e) {
      console.log(`[${site.project_name}] Deploy failed: ${e.message}`);
      history.push({ iteration: iter, score: currentScore, changes_applied: appliedCount, error: e.message });
      break;
    }

    // 5. Update LaunchProject with new URL
    await base44.asServiceRole.entities.LaunchProject.update(site.id, {
      vercel_deployment_url: currentUrl,
      last_validation_summary: `Code heal iter ${iter}: deployed, validating…`
    });

    // 6. Wait for Vercel to settle
    await new Promise(r => setTimeout(r, 5000));

    // 7. Validate the fixed site
    const audit = await validateSite(base44, orgId, site, currentUrl);

    // 8. Write QA report (proof score)
    await base44.asServiceRole.entities.QAReport.create({
      organization_id: orgId,
      target_type: 'website',
      target_id: site.id,
      target_title: `${site.project_name} — Code Heal Iter ${iter}`,
      check_type: 'qa_validation',
      status: audit.score >= 100 ? 'passed' : 'failed',
      score: audit.score,
      summary: `Code heal iter ${iter}: ${audit.score}/100 (visual=${audit.visual_score}, operational=${audit.operational_score}) — ${audit.failures.length} remaining gaps`,
      issues: audit.failures.map(f => ({
        severity: 'high', category: 'parity',
        description: f, recommendation: 'Further code fixes needed'
      })),
      auto_generated: true
    });

    // 9. Update RepairTasks — mark resolved if gap is gone
    const newGapsSet = new Set(audit.failures);
    for (const rt of repairTasks) {
      if (!rt.resolved && !newGapsSet.has(rt.gap)) {
        rt.resolved = true;
        try {
          await base44.asServiceRole.entities.RepairTask.update(rt.taskId, {
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolution_notes: `Fixed in code heal iteration ${iter}`
          });
        } catch (e) { /* non-blocking */ }
      }
    }

    history.push({
      iteration: iter,
      score: audit.score,
      gaps_before: currentGaps.length,
      gaps_after: audit.failures.length,
      changes_applied: appliedCount,
      changes_total: (fixResult.changes || []).length,
      fixes: appliedChanges
    });

    currentScore = audit.score;
    currentGaps = audit.failures;

    if (currentScore >= 100) {
      console.log(`[${site.project_name}] 100/100 achieved!`);
      break;
    }
  }

  // ── Finalize: update LaunchProject + unresolved RepairTasks ──
  await base44.asServiceRole.entities.LaunchProject.update(site.id, {
    parity_score: currentScore,
    last_validation_summary: `Code heal complete: ${currentScore}/100 after ${history.length} iteration${history.length !== 1 ? 's' : ''}`,
    status: currentScore >= 100 ? 'passed' : 'failed'
  });

  // Mark unresolved tasks as blocked
  for (const rt of repairTasks) {
    if (!rt.resolved) {
      try {
        await base44.asServiceRole.entities.RepairTask.update(rt.taskId, {
          status: 'blocked',
          resolution_notes: `Could not resolve after ${history.length} iterations (final score: ${currentScore}/100)`
        });
      } catch (e) { /* non-blocking */ }
    }
  }

  return {
    project_id: site.id,
    name: site.project_name,
    url: currentUrl,
    initial_score: site.parity_score || 0,
    final_score: currentScore,
    iterations: history.length,
    healed: currentScore >= 100,
    repair_tasks_total: repairTasks.length,
    repair_tasks_resolved: repairTasks.filter(r => r.resolved).length,
    history
  };
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

async function validateSite(base44, orgId, site, url) {
  const vr = await withTimeout(
    base44.functions.invoke('validateFullStack', {
      live_url: url,
      target_url: site.metadata?.target_url,
      target_dna: site.metadata?.target_dna,
      organization_id: orgId,
      clone_id: site.id
    }),
    120000, 'validateFullStack'
  );
  const v = vr?.data || vr;
  return {
    score: v.score || 0,
    failures: v.failures || [],
    visual_score: v.visual_score || 0,
    operational_score: v.operational_score || 0
  };
}

async function fetchLiveHtml(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'FaultLine-AI-CodeHeal/1.0' } });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    console.error(`fetchLiveHtml failed: ${e.message}`);
    return null;
  }
}

async function generateCodeFixes(base44, html, gaps, site) {
  const truncated = html.length > 80000;
  const htmlContent = truncated ? html.slice(0, 80000) : html;

  const prompt = `You are an expert web developer fixing a cloned website to achieve 100/100 visual and operational parity.

CURRENT HTML${truncated ? ` (first 80K of ${html.length} chars)` : ''}:
\`\`\`html
${htmlContent}
\`\`\`

VALIDATION GAPS TO FIX:
${gaps.map((g, i) => `${i + 1}. ${g}`).join('\n')}

SITE: ${site.project_name}
TARGET: ${site.metadata?.target_url || 'unknown'}

INSTRUCTIONS:
For each gap, provide a find-and-replace operation that fixes it.
- The "find" string MUST be an EXACT substring copied verbatim from the HTML above (copy a unique snippet around the issue)
- The "replace" string is the corrected version
- Keep changes minimal — only fix what's needed to address the gap
- Do NOT remove existing content, scripts, or styles unless they're causing the issue
- If a gap is about missing images, fix the image URLs or add proper img tags
- If a gap is about JavaScript errors (like NaN), fix the calculation
- If a gap is about cookie banners, remove or hide the banner element
- If a gap is about mobile layout, add responsive CSS

Return JSON with:
- changes: array of { find, replace, gap_addressed }
- summary: brief summary of all changes`;

  const res = await base44.integrations.Core.InvokeLLM({
    prompt,
    model: 'gemini_3_flash',
    response_json_schema: {
      type: 'object',
      properties: {
        changes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              find: { type: 'string' },
              replace: { type: 'string' },
              gap_addressed: { type: 'string' }
            }
          }
        },
        summary: { type: 'string' }
      }
    }
  });

  return res;
}

// ── Vercel helpers (inlined to avoid import path issues) ──

function slugify(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'faultline-site';
}

async function sha1hex(data) {
  const buf = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function createVercelProject(token, teamId, name) {
  const url = `https://api.vercel.com/v10/projects${teamId ? `?teamId=${teamId}` : ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 409 && /already exists/i.test(errText)) {
      const getRes = await fetch(`https://api.vercel.com/v9/projects/${name}${teamId ? `?teamId=${teamId}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
      if (getRes.ok) { const d = await getRes.json(); return { id: d.id, name: d.name, reused: true }; }
    }
    throw new Error(`Vercel project failed (${res.status}): ${errText.slice(0, 200)}`);
  }
  const d = await res.json();
  return { id: d.id, name: d.name };
}

async function disableVercelSso(token, teamId, projectId) {
  const url = `https://api.vercel.com/v9/projects/${projectId}${teamId ? `?teamId=${teamId}` : ''}`;
  await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ssoProtection: null })
  }).catch(() => {});
}

async function deployToVercel(token, teamId, projectName, projectId, html) {
  const fileData = new TextEncoder().encode(html);
  const sha = await sha1hex(fileData);
  const size = fileData.length;
  const uploadUrl = `https://api.vercel.com/v2/files${teamId ? `?teamId=${teamId}` : ''}`;
  const upRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream', 'x-vercel-digest': sha },
    body: fileData
  });
  if (!upRes.ok) throw new Error(`Vercel file upload failed (${upRes.status}): ${(await upRes.text()).slice(0, 200)}`);
  const depUrl = `https://api.vercel.com/v13/deployments${teamId ? `?teamId=${teamId}` : ''}`;
  const depBody = { name: projectName, files: [{ file: 'index.html', sha, size }], target: 'production', projectSettings: { framework: null } };
  if (projectId) depBody.project = projectId;
  const depRes = await fetch(depUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(depBody)
  });
  if (!depRes.ok) throw new Error(`Vercel deploy failed (${depRes.status}): ${(await depRes.text()).slice(0, 200)}`);
  const d = await depRes.json();
  return { id: d.id, url: d.url ? `https://${d.url}` : null, alias: d.alias || [] };
}