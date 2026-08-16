import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { scrapeWithStealth } from '../../shared/stealthBrowser.ts';
import {
  slugify, createDriveFolder, createGitHubRepo, pushGitHubFile,
  createSupabaseProject, createVercelProject, disableVercelSso, deployToVercel
} from '../../shared/launchInfra.ts';

// End-to-end clone + provision: scrapes a target site with the stealth browser
// (deep render, JS execution), fixes the HTML for static deployment, then
// provisions to Google Drive, GitHub, Supabase, and Vercel — all in one call.
// Returns all platform URLs + the cloned HTML for downstream validation.

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;

    const body = await req.json();
    const { target_url, project_name, accent_from, accent_to } = body;
    if (!target_url) return Response.json({ error: 'target_url required' }, { status: 400 });
    if (!project_name) return Response.json({ error: 'project_name required' }, { status: 400 });

    console.log(`cloneAndProvisionFull: ${target_url} → ${project_name}`);

    // 1. SCRAPE — stealth browser with deep render (executes JS, scrolls, resolves lazy images)
    let html = '';
    let renderMethod = 'stealth';
    let stealthError = null;
    try {
      const result = await scrapeWithStealth(target_url, {
        deepRender: true,
        waitAfterLoad: 6000,
        solveCaptchas: true,
        proxies: true,
        timeout: 50000,
        advancedStealth: false,
      });
      if (result.ok && result.html && result.html.length > 2000) {
        html = result.html;
        console.log(`Stealth scrape returned ${html.length} chars`);
      } else {
        stealthError = `ok=${result.ok}, len=${result.html?.length}, error=${result.error}`;
        console.log(`Stealth scrape insufficient: ${stealthError}`);
      }
    } catch (e) {
      stealthError = e.message;
      console.log(`Stealth scrape failed: ${e.message}`);
    }

    // Fallback to basic fetch
    if (html.length < 2000) {
      renderMethod = 'basic_fetch';
      console.log('Falling back to basic fetch');
      const r = await fetch(target_url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CloneProvisioner/1.0)' },
        signal: AbortSignal.timeout(20000)
      });
      html = await r.text();
      console.log(`Basic fetch returned ${html.length} chars`);
    }

    if (html.length < 500) {
      return Response.json({ error: 'Could not fetch sufficient HTML content from target site', stealth_error: stealthError }, { status: 500 });
    }

    // 2. FIX HTML for static deployment

    // 2a. Force all images to load immediately (no JS to manage lazy loading on a static clone)
    html = html.replace(/\s+loading=["']lazy["']/gi, ' loading="eager"');

    // 2b. Strip Base44/app JS bundles — they won't work on a different domain
    html = html.replace(/<script[^>]*src="[^"]*(?:base44|_app|\/assets\/|\/static\/)[^"]*"[^>]*><\/script>/gi, '');
    html = html.replace(/<script[^>]*type="module"[^>]*src="[^"]*"[^>]*><\/script>/gi, '');
    html = html.replace(/<script[^>]*type="module"[^>]*>[\s\S]*?<\/script>/gi, '');

    // 2c. Apply accent color change if requested
    if (accent_from && accent_to) {
      const from = accent_from.toLowerCase();
      html = html.split(from).join(accent_to);
      html = html.split(from.toUpperCase()).join(accent_to);
    }

    // 2d. Inject Tailwind CDN + visibility fixes
    const headInject = `
<script src="https://cdn.tailwindcss.com"></script>
<style>
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; min-height: 100vh; }
  section, [data-section], [data-hero] { opacity: 1 !important; visibility: visible !important; }
  [data-line] { opacity: 1 !important; transform: none !important; }
  #root { position: relative; z-index: 1; }
</style>
`;
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, headInject + '\n</head>');
    } else if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, m => m + headInject);
    } else {
      html = headInject + html;
    }

    // 2e. Ensure <!DOCTYPE html> is present
    if (!/<!doctype/i.test(html)) {
      html = '<!DOCTYPE html>\n' + html;
    }

    console.log(`HTML prepared: ${html.length} chars`);

    // 3. PROVISION — Drive, GitHub, Supabase, Vercel IN PARALLEL
    // Use a unique slug (append short timestamp) to avoid reusing stale Vercel
    // projects that may have build commands from previous GitHub-linked deployments.
    const slug = `${slugify(project_name)}-${Date.now().toString(36).slice(-5)}`;
    const results: any = {};
    const errors: any = [];

    const provisionTasks: Promise<void>[] = [];

    // 3a. Google Drive
    provisionTasks.push((async () => {
      try {
        const conn = await base44.asServiceRole.connectors.getConnection('googledrive');
        if (!conn?.accessToken) throw new Error('Google Drive connector not authorized');
        results.drive = await createDriveFolder(conn.accessToken, `${project_name} Website Assets`);
        console.log('Drive folder created');
      } catch (e) { errors.push({ step: 'drive', error: e.message }); console.error('Drive failed:', e.message); }
    })());

    // 3b. GitHub
    provisionTasks.push((async () => {
      try {
        const conn = await base44.asServiceRole.connectors.getConnection('github');
        if (!conn?.accessToken) throw new Error('GitHub connector not authorized');
        const repo = await createGitHubRepo(conn.accessToken, slug);
        await pushGitHubFile(conn.accessToken, repo.owner, slug, 'index.html', html, `Initial clone of ${target_url}`);
        results.github = repo;
        console.log('GitHub repo created:', repo.html_url);
      } catch (e) { errors.push({ step: 'github', error: e.message }); console.error('GitHub failed:', e.message); }
    })());

    // 3c. Supabase
    provisionTasks.push((async () => {
      try {
        const conn = await base44.asServiceRole.connectors.getConnection('supabase');
        if (!conn?.accessToken) throw new Error('Supabase connector not authorized');
        results.supabase = await createSupabaseProject(conn.accessToken, slug);
        console.log('Supabase project created');
      } catch (e) { errors.push({ step: 'supabase', error: e.message }); console.error('Supabase failed:', e.message); }
    })());

    // 3d. Vercel
    provisionTasks.push((async () => {
      try {
        const token = secrets.get('VERCEL_TOKEN');
        if (!token) throw new Error('VERCEL_TOKEN secret not set');
        const teamId = secrets.get('VERCEL_TEAM_ID') || null;
        const project = await createVercelProject(token, teamId, slug);
        try { await disableVercelSso(token, teamId, project.id); } catch (e) { /* non-fatal */ }
        // Clear any stale build settings (buildCommand, framework) so Vercel
        // serves our static HTML directly instead of trying to run a build step.
        try {
          await fetch(`https://api.vercel.com/v9/projects/${project.id}${teamId ? `?teamId=${teamId}` : ''}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ buildCommand: null, framework: null, outputDirectory: null })
          });
        } catch (e) { /* best-effort */ }
        const deploy = await deployToVercel(token, teamId, slug, project.id, html);
        results.vercel = { project, deploy };
        console.log('Vercel deployed:', deploy.url);
      } catch (e) { errors.push({ step: 'vercel', error: e.message }); console.error('Vercel failed:', e.message); }
    })());

    await Promise.all(provisionTasks);

    // 4. Create a LaunchProject record to track this clone
    let launchProjectId = null;
    try {
      const lp = await base44.asServiceRole.entities.LaunchProject.create({
        organization_id: orgId,
        project_name,
        slug,
        project_type: 'website',
        status: results.vercel ? 'passed' : 'failed',
        vercel_deployment_url: results.vercel?.deploy?.url,
        vercel_project_url: results.vercel?.project?.id,
        github_repo_url: results.github?.html_url,
        supabase_project_url: results.supabase?.url,
        drive_folder_url: results.drive?.webViewLink,
        benchmark_url: target_url,
        industry: 'Marketplace',
        business_name: project_name,
        parity_score: 0,
      });
      launchProjectId = lp.id;
    } catch (e) { console.error('LaunchProject create failed:', e.message); }

    // 5. Receipt
    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId,
        system: 'clone_and_provision_full',
        action: 'clone_provision',
        status: errors.length === 0 ? 'success' : 'partial',
        summary: `Cloned + provisioned ${project_name}: ${Object.keys(results).join(', ') || 'none'}`,
        evidence: { target_url, results, errors: errors.length ? errors : undefined },
      });
    } catch (e) { /* ignore */ }

    return Response.json({
      status: errors.length === 0 ? 'success' : 'partial',
      target_url,
      project_name,
      slug,
      clone_url: results.vercel?.deploy?.url,
      vercel_url: results.vercel?.deploy?.url,
      github_url: results.github?.html_url,
      supabase_url: results.supabase?.url,
      drive_url: results.drive?.webViewLink,
      launch_project_id: launchProjectId,
      html_size: html.length,
      rendered: renderMethod,
      stealth_error: stealthError,
      results,
      errors: errors.length ? errors : undefined,
    });
  } catch (error) {
    console.error('cloneAndProvisionFull error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}