import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

// Deletes test/stalled project resources from GitHub, Vercel, Supabase, and Drive.
// KEEPS "good" projects: status === 'passed' OR (vercel_deployment_url && parity_score >= 60).
// DELETES resources for stalled projects (generating/failed/queued/retrying with no good deploy)
//   AND any resources matching the fl-test-* naming pattern from testProvisioning runs.
//
// Safety: dry_run defaults to true. Pass { dry_run: false } to actually delete.
export default async function(req) {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const dryRun = body.dry_run !== false;
  const user = await base44.auth.me().catch(() => null);
  const orgId = user?.data?.organization_id;
  if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

  const deleted = { github: [], vercel: [], supabase: [], drive: [] };
  const errors = [];
  const goodProjects = [];
  const testProjects = [];

  // --- Get tokens ---
  let ghToken = null, supaToken = null, driveToken = null;
  const vercelToken = secrets.get('VERCEL_TOKEN');
  const vercelTeamId = secrets.get('VERCEL_TEAM_ID') || null;
  try { const c = await base44.asServiceRole.connectors.getConnection('github'); ghToken = c?.accessToken; } catch (e) { errors.push(`GitHub connector: ${e.message}`); }
  try { const c = await base44.asServiceRole.connectors.getConnection('supabase'); supaToken = c?.accessToken; } catch (e) { errors.push(`Supabase connector: ${e.message}`); }
  try { const c = await base44.asServiceRole.connectors.getConnection('googledrive'); driveToken = c?.accessToken; } catch (e) { errors.push(`Drive connector: ${e.message}`); }

  // --- Classify LaunchProjects ---
  const projects = await base44.asServiceRole.entities.LaunchProject.filter({ organization_id: orgId }, '-created_date', 200);
  for (const p of projects) {
    const isGood = p.status === 'passed' || (!!p.vercel_deployment_url && (p.parity_score || 0) >= 60);
    const info = { id: p.id, name: p.project_name, status: p.status, parity: p.parity_score,
      drive: p.drive_folder_url, github: p.github_repo_url, supabase: p.supabase_project_url,
      vercel: p.vercel_deployment_url || p.vercel_project_url };
    if (isGood) goodProjects.push(info);
    else testProjects.push(info);
  }

  if (dryRun) {
    return Response.json({
      dry_run: true,
      message: 'Dry run — nothing deleted. Call again with { dry_run: false } to execute.',
      good_projects: goodProjects,
      test_projects: testProjects,
      would_delete_count: testProjects.length
    });
  }

  // --- Delete resources for stalled projects ---
  for (const p of testProjects) {
    // GitHub
    if (p.github && ghToken) {
      const m = p.github.match(/github\.com\/([^/]+)\/([^/?#]+)/);
      if (m) {
        try {
          const r = await fetch(`https://api.github.com/repos/${m[1]}/${m[2]}`, { method: 'DELETE', headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'FaultLine-Cleanup' } });
          if (r.ok || r.status === 404) deleted.github.push(`${m[1]}/${m[2]}`);
          else errors.push(`GitHub delete ${m[1]}/${m[2]}: ${r.status}`);
        } catch (e) { errors.push(`GitHub: ${e.message}`); }
      }
    }
    // Vercel — resolve project ID by name (slug), then delete
    if (p.vercel && vercelToken) {
      try {
        const name = p.vercel.replace(/^https?:\/\//, '').split('/')[1] || p.vercel.replace(/^https?:\/\//, '').split('.')[0];
        const slug = name ? name.replace(/[^a-z0-9-]/g, '') : null;
        // Try to get project by name
        const gRes = await fetch(`https://api.vercel.com/v9/projects/${slug}${vercelTeamId ? `?teamId=${vercelTeamId}` : ''}`, { headers: { Authorization: `Bearer ${vercelToken}` } });
        if (gRes.ok) {
          const d = await gRes.json();
          const delRes = await fetch(`https://api.vercel.com/v9/projects/${d.id}${vercelTeamId ? `?teamId=${vercelTeamId}` : ''}`, { method: 'DELETE', headers: { Authorization: `Bearer ${vercelToken}` } });
          if (delRes.ok) deleted.vercel.push(d.name);
          else errors.push(`Vercel delete ${d.name}: ${delRes.status}`);
        }
      } catch (e) { errors.push(`Vercel: ${e.message}`); }
    }
    // Supabase
    if (p.supabase && supaToken) {
      const m = p.supabase.match(/project\/([^/?#]+)/);
      if (m) {
        try {
          const r = await fetch(`https://api.supabase.com/v1/projects/${m[1]}/delete`, { method: 'POST', headers: { Authorization: `Bearer ${supaToken}` } });
          if (r.ok || r.status === 404) deleted.supabase.push(m[1]);
          else errors.push(`Supabase delete ${m[1]}: ${r.status}`);
        } catch (e) { errors.push(`Supabase: ${e.message}`); }
      }
    }
    // Drive
    if (p.drive && driveToken) {
      const m = p.drive.match(/folders\/([^?#]+)/);
      if (m) {
        try {
          const r = await fetch(`https://www.googleapis.com/drive/v3/files/${m[1]}`, { method: 'DELETE', headers: { Authorization: `Bearer ${driveToken}` } });
          if (r.ok || r.status === 204) deleted.drive.push(m[1]);
          else errors.push(`Drive delete ${m[1]}: ${r.status}`);
        } catch (e) { errors.push(`Drive: ${e.message}`); }
      }
    }
  }

  // --- Also scan for fl-test-* orphaned resources (from testProvisioning) ---
  // GitHub: list repos, find fl-test-*
  if (ghToken) {
    try {
      const r = await fetch('https://api.github.com/user/repos?per_page=100&sort=created&direction=desc', { headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'FaultLine-Cleanup' } });
      if (r.ok) {
        const repos = await r.json();
        for (const repo of repos) {
          if (/^fl-test-/i.test(repo.name)) {
            try {
              const dr = await fetch(`https://api.github.com/repos/${repo.owner.login}/${repo.name}`, { method: 'DELETE', headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'FaultLine-Cleanup' } });
              if (dr.ok) deleted.github.push(`${repo.owner.login}/${repo.name} (orphan test)`);
            } catch (e) { errors.push(`GitHub orphan ${repo.name}: ${e.message}`); }
          }
        }
      }
    } catch (e) { errors.push(`GitHub scan: ${e.message}`); }
  }

  // Vercel: list projects, find fl-test-*
  if (vercelToken) {
    try {
      const r = await fetch(`https://api.vercel.com/v9/projects?limit=100${vercelTeamId ? `&teamId=${vercelTeamId}` : ''}`, { headers: { Authorization: `Bearer ${vercelToken}` } });
      if (r.ok) {
        const d = await r.json();
        for (const proj of (d.projects || [])) {
          if (/^fl-test-/i.test(proj.name)) {
            try {
              const dr = await fetch(`https://api.vercel.com/v9/projects/${proj.id}${vercelTeamId ? `?teamId=${vercelTeamId}` : ''}`, { method: 'DELETE', headers: { Authorization: `Bearer ${vercelToken}` } });
              if (dr.ok) deleted.vercel.push(`${proj.name} (orphan test)`);
            } catch (e) { errors.push(`Vercel orphan ${proj.name}: ${e.message}`); }
          }
        }
      }
    } catch (e) { errors.push(`Vercel scan: ${e.message}`); }
  }

  // Supabase: list projects, find fl-test-*
  if (supaToken) {
    try {
      const r = await fetch('https://api.supabase.com/v1/projects', { headers: { Authorization: `Bearer ${supaToken}` } });
      if (r.ok) {
        const projects = await r.json();
        for (const proj of (Array.isArray(projects) ? projects : [])) {
          if (/^fl-test-/i.test(proj.name)) {
            try {
              const dr = await fetch(`https://api.supabase.com/v1/projects/${proj.ref}/delete`, { method: 'POST', headers: { Authorization: `Bearer ${supaToken}` } });
              if (dr.ok) deleted.supabase.push(`${proj.ref} (orphan test)`);
            } catch (e) { errors.push(`Supabase orphan ${proj.name}: ${e.message}`); }
          }
        }
      }
    } catch (e) { errors.push(`Supabase scan: ${e.message}`); }
  }

  // Drive: search for fl-test* folders
  if (driveToken) {
    try {
      const r = await fetch("https://www.googleapis.com/drive/v3/files?q=name+contains+'fl-test'+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)", { headers: { Authorization: `Bearer ${driveToken}` } });
      if (r.ok) {
        const d = await r.json();
        for (const f of (d.files || [])) {
          try {
            const dr = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${driveToken}` } });
            if (dr.ok || dr.status === 204) deleted.drive.push(`${f.name} (orphan test)`);
          } catch (e) { errors.push(`Drive orphan ${f.name}: ${e.message}`); }
        }
      }
    } catch (e) { errors.push(`Drive scan: ${e.message}`); }
  }

  // --- Audit receipt ---
  try {
    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId, system: 'cleanup', action: 'delete_test_resources',
      status: 'success', summary: `Cleaned up test resources — GH:${deleted.github.length} Vercel:${deleted.vercel.length} Supabase:${deleted.supabase.length} Drive:${deleted.drive.length}`,
      evidence: { deleted, errors: errors.length ? errors.slice(0, 10) : null, good_projects_kept: goodProjects.length, test_projects_cleaned: testProjects.length }
    });
  } catch (e) {}

  return Response.json({
    status: 'success',
    dry_run: false,
    good_projects: goodProjects,
    test_projects_cleaned: testProjects.length,
    deleted,
    errors: errors.length ? errors.slice(0, 15) : undefined,
    summary: `Kept ${goodProjects.length} good projects. Deleted ${deleted.github.length} GitHub repos, ${deleted.vercel.length} Vercel projects, ${deleted.supabase.length} Supabase projects, ${deleted.drive.length} Drive folders.`
  });
}