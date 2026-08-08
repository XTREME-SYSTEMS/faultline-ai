import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import {
  slugify, createDriveFolder, createGitHubRepo, pushGitHubFile,
  createSupabaseProject, createVercelProject, disableVercelSso, deployToVercel
} from '../../shared/launchInfra.ts';

// End-to-end project launcher: creates a Google Drive folder, GitHub repo,
// Supabase project, Vercel project + deployment, and optionally purchases a
// domain through Vercel's registrar — all in one orchestrated call.
// Each step runs independently and collects its own errors so partial success
// is always reported back. Uses authorized OAuth connectors for Drive/GitHub/
// Supabase (matching testProvisioning) and the VERCEL_TOKEN secret for Vercel.

async function buyDomain(token, teamId, domain, contactInfo) {
  const url = `https://api.vercel.com/v1/registrar/domains/${domain}/buy${teamId ? `?teamId=${teamId}` : ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ autoRenew: true, years: 1, expectedPrice: 0, contactInformation: contactInfo })
  });
  if (!res.ok) throw new Error(`Domain purchase failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return await res.json();
}

async function addDomainToProject(token, teamId, projectId, domain) {
  const url = `https://api.vercel.com/v9/projects/${projectId}/domains${teamId ? `?teamId=${teamId}` : ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: domain })
  });
  if (!res.ok) throw new Error(`Attach domain failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return await res.json();
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;

    const body = await req.json().catch(() => ({}));
    const { project_name, website_html, domain_name, steps, contact_info } = body;
    if (!project_name) return Response.json({ error: 'project_name required' }, { status: 400 });

    const want = steps || { drive: true, github: true, supabase: true, vercel: true, domain: false };
    const results = {};
    const errors = [];
    const slug = slugify(project_name);
    const html = website_html || '<!DOCTYPE html><html><head><title>Site</title></head><body><h1>Coming Soon</h1></body></html>';

    // Steps 1-4 run IN PARALLEL — Drive, GitHub, Supabase, and Vercel are fully
    // independent. Sequential provisioning took 30-60s; parallel cuts it to the
    // slowest single step (~15s). Each step collects its own errors for partial
    // success reporting. The domain step (5) stays sequential — it depends on Vercel.
    const provisionTasks = [];
    if (want.drive) {
      provisionTasks.push((async () => {
        try {
          const conn = await base44.asServiceRole.connectors.getConnection('googledrive');
          if (!conn?.accessToken) throw new Error('Google Drive connector not authorized');
          results.drive = await createDriveFolder(conn.accessToken, `${project_name} Website Assets`);
        } catch (e) { errors.push({ step: 'drive', error: e.message }); }
      })());
    }
    if (want.github) {
      provisionTasks.push((async () => {
        try {
          const conn = await base44.asServiceRole.connectors.getConnection('github');
          if (!conn?.accessToken) throw new Error('GitHub connector not authorized');
          const repo = await createGitHubRepo(conn.accessToken, slug);
          await pushGitHubFile(conn.accessToken, repo.owner, slug, 'index.html', html, 'Initial website from FaultLine AI');
          results.github = repo;
        } catch (e) { errors.push({ step: 'github', error: e.message }); }
      })());
    }
    if (want.supabase) {
      provisionTasks.push((async () => {
        try {
          const conn = await base44.asServiceRole.connectors.getConnection('supabase');
          if (!conn?.accessToken) throw new Error('Supabase connector not authorized');
          results.supabase = await createSupabaseProject(conn.accessToken, slug);
        } catch (e) { errors.push({ step: 'supabase', error: e.message }); }
      })());
    }
    if (want.vercel) {
      provisionTasks.push((async () => {
        try {
          const token = secrets.get('VERCEL_TOKEN');
          if (!token) throw new Error('VERCEL_TOKEN secret not set');
          const teamId = secrets.get('VERCEL_TEAM_ID') || null;
          const project = await createVercelProject(token, teamId, slug);
          try { await disableVercelSso(token, teamId, project.id); } catch (e) { /* non-fatal */ }
          const deploy = await deployToVercel(token, teamId, slug, project.id, html);
          results.vercel = { project, deploy };
        } catch (e) { errors.push({ step: 'vercel', error: e.message }); }
      })());
    }
    await Promise.all(provisionTasks);

    // 5. Domain purchase via Vercel registrar + attach to project
    if (want.domain && domain_name) {
      try {
        const token = secrets.get('VERCEL_TOKEN');
        if (!token) throw new Error('VERCEL_TOKEN secret not set');
        const teamId = secrets.get('VERCEL_TEAM_ID') || null;
        const order = await buyDomain(token, teamId, domain_name, contact_info || {});
        results.domain = { purchased: true, name: domain_name, order };
        if (results.vercel?.project?.id) {
          try {
            await addDomainToProject(token, teamId, results.vercel.project.id, domain_name);
            results.domain.attached = true;
          } catch (e) { errors.push({ step: 'domain_attach', error: e.message }); }
        }
      } catch (e) { errors.push({ step: 'domain', error: e.message }); }
    }

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'project_launcher',
      action: 'launch',
      status: errors.length === 0 ? 'success' : 'partial',
      summary: `Launched ${project_name}: ${Object.keys(results).join(', ') || 'none'}`,
      evidence: { results, errors: errors.length ? errors : undefined }
    });

    return Response.json({
      status: errors.length === 0 ? 'success' : 'partial',
      project_name,
      slug,
      results,
      errors: errors.length ? errors : undefined
    });
  } catch (error) {
    console.error('launchProject error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}