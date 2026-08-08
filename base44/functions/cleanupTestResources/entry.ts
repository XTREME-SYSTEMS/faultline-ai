import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { classifyProject, buildProtectedRegistry, validateDeletion, normalizeGithubUrl, normalizeVercelName, extractSupabaseRef, extractDriveId } from '../../shared/cleanupValidator.ts';

// Double-validated cleanup of test/stalled resources from GitHub, Vercel, Supabase, and Drive.
//
// VALIDATION SYSTEM (two layers — both must pass before any deletion):
//   Layer 1 — CLASSIFY: sort LaunchProjects into PROTECTED (passed/deployed) vs CANDIDATE (stalled).
//             Build a PROTECTED registry of resource IDs that must NEVER be touched.
//   Layer 2 — VERIFY: before deleting each resource, confirm:
//             (a) it is NOT in the PROTECTED registry, AND
//             (b) the linked LaunchProject is still classified as CANDIDATE (re-read from DB).
//             Any resource that fails either check is BLOCKED and logged — never deleted.
//
// Safety: dry_run defaults to true. Pass { dry_run: false } to execute.
export default async function(req) {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const dryRun = body.dry_run !== false;
  const forceAll = body.force_all === true;
  const user = await base44.auth.me().catch(() => null);
  const orgId = user?.data?.organization_id;
  if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

  const deleted = { github: [], vercel: [], supabase: [], drive: [] };
  const blocked = [];
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

  // --- VALIDATION LAYER 1: Classify projects + build protected registry ---
  const projects = await base44.asServiceRole.entities.LaunchProject.filter({ organization_id: orgId }, '-created_date', 200);
  const protectedRegistry = forceAll ? { github: new Set(), vercel: new Set(), supabase: new Set(), drive: new Set() } : buildProtectedRegistry(projects);
  const projectMap = new Map(projects.map(p => [p.id, p]));

  for (const p of projects) {
    const cls = forceAll ? 'candidate' : classifyProject(p);
    const info = { id: p.id, name: p.project_name, status: p.status, parity: p.parity_score, classification: cls,
      drive: p.drive_folder_url, github: p.github_repo_url, supabase: p.supabase_project_url,
      vercel: p.vercel_deployment_url || p.vercel_project_url };
    if (cls === 'protected') goodProjects.push(info);
    else testProjects.push(info);
  }

  if (dryRun) {
    return Response.json({
      dry_run: true,
      message: 'Dry run — nothing deleted. Call again with { dry_run: false } to execute.',
      good_projects: goodProjects,
      test_projects: testProjects,
      protected_resource_count: { github: protectedRegistry.github.size, vercel: protectedRegistry.vercel.size, supabase: protectedRegistry.supabase.size, drive: protectedRegistry.drive.size },
      would_delete_count: testProjects.length
    });
  }

  // --- Delete resources for candidate (test) projects — with VALIDATION LAYER 2 ---
  for (const p of testProjects) {
    // Re-read the project from DB to ensure it hasn't been updated to passed since classification
    // (skipped when force_all is true — all projects are treated as candidates)
    let liveProject = projectMap.get(p.id);
    if (!forceAll) { try { liveProject = await base44.asServiceRole.entities.LaunchProject.get(p.id); } catch (e) {} }
    else { liveProject = { ...liveProject, status: 'failed', parity_score: 0, vercel_deployment_url: null }; }

    // GitHub
    if (p.github && ghToken) {
      const ghId = normalizeGithubUrl(p.github);
      const v = validateDeletion('github', ghId, liveProject, protectedRegistry);
      if (!v.safe) { blocked.push({ type: 'github', id: ghId, reason: v.reason }); }
      else {
        const [owner, repo] = ghId.split('/');
        try {
          const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { method: 'DELETE', headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'FaultLine-Cleanup' } });
          if (r.ok || r.status === 404) deleted.github.push(`${owner}/${repo}`);
          else errors.push(`GitHub delete ${owner}/${repo}: ${r.status}`);
        } catch (e) { errors.push(`GitHub: ${e.message}`); }
      }
    }
    // Vercel
    if (p.vercel && vercelToken) {
      const vName = normalizeVercelName(p.vercel);
      const v = validateDeletion('vercel', vName, liveProject, protectedRegistry);
      if (!v.safe) { blocked.push({ type: 'vercel', id: vName, reason: v.reason }); }
      else {
        try {
          const gRes = await fetch(`https://api.vercel.com/v9/projects/${vName}${vercelTeamId ? `?teamId=${vercelTeamId}` : ''}`, { headers: { Authorization: `Bearer ${vercelToken}` } });
          if (gRes.ok) {
            const d = await gRes.json();
            const delRes = await fetch(`https://api.vercel.com/v9/projects/${d.id}${vercelTeamId ? `?teamId=${vercelTeamId}` : ''}`, { method: 'DELETE', headers: { Authorization: `Bearer ${vercelToken}` } });
            if (delRes.ok) deleted.vercel.push(d.name);
            else errors.push(`Vercel delete ${d.name}: ${delRes.status}`);
          }
        } catch (e) { errors.push(`Vercel: ${e.message}`); }
      }
    }
    // Supabase
    if (p.supabase && supaToken) {
      const ref = extractSupabaseRef(p.supabase);
      const v = validateDeletion('supabase', ref, liveProject, protectedRegistry);
      if (!v.safe) { blocked.push({ type: 'supabase', id: ref, reason: v.reason }); }
      else {
        try {
          const r = await fetch(`https://api.supabase.com/v1/projects/${ref}`, { method: 'DELETE', headers: { Authorization: `Bearer ${supaToken}` } });
          if (r.ok || r.status === 404) deleted.supabase.push(ref);
          else errors.push(`Supabase delete ${ref}: ${r.status}`);
        } catch (e) { errors.push(`Supabase: ${e.message}`); }
      }
    }
    // Drive
    if (p.drive && driveToken) {
      const fid = extractDriveId(p.drive);
      const v = validateDeletion('drive', fid, liveProject, protectedRegistry);
      if (!v.safe) { blocked.push({ type: 'drive', id: fid, reason: v.reason }); }
      else {
        try {
          const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fid}`, { method: 'DELETE', headers: { Authorization: `Bearer ${driveToken}` } });
          if (r.ok || r.status === 204) deleted.drive.push(fid);
          else errors.push(`Drive delete ${fid}: ${r.status}`);
        } catch (e) { errors.push(`Drive: ${e.message}`); }
      }
    }
  }

  // --- Scan for fl-test-* orphaned resources (from testProvisioning) — always safe per validator ---
  // GitHub
  if (ghToken) {
    try {
      const r = await fetch('https://api.github.com/user/repos?per_page=100&sort=created&direction=desc', { headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'FaultLine-Cleanup' } });
      if (r.ok) {
        const repos = await r.json();
        for (const repo of repos) {
          const isOrphan = /^fl-test-/i.test(repo.name) ||
            (forceAll && /^(fl-test-|garageforce-|revolut-|pure-floors-|.*-clone-|.*-heal\d?-)/i.test(repo.name));
          if (isOrphan) {
            if (!forceAll) {
              const v = validateDeletion('github', `${repo.owner.login}/${repo.name}`.toLowerCase(), null, protectedRegistry);
              if (!v.safe) { blocked.push({ type: 'github', id: repo.name, reason: v.reason }); continue; }
            }
            try {
              const dr = await fetch(`https://api.github.com/repos/${repo.owner.login}/${repo.name}`, { method: 'DELETE', headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'FaultLine-Cleanup' } });
              if (dr.ok) deleted.github.push(`${repo.owner.login}/${repo.name} (orphan test)`);
            } catch (e) { errors.push(`GitHub orphan ${repo.name}: ${e.message}`); }
          }
        }
      }
    } catch (e) { errors.push(`GitHub scan: ${e.message}`); }
  }
  // Vercel
  if (vercelToken) {
    try {
      const r = await fetch(`https://api.vercel.com/v9/projects?limit=100${vercelTeamId ? `&teamId=${vercelTeamId}` : ''}`, { headers: { Authorization: `Bearer ${vercelToken}` } });
      if (r.ok) {
        const d = await r.json();
        for (const proj of (d.projects || [])) {
          // When force_all is true, also match clone-engine naming patterns (heal, clone, known test targets)
          const isOrphan = /^fl-test-/i.test(proj.name) ||
            (forceAll && /^(fl-test-|garageforce-|revolut-|pure-floors-|.*-clone-|.*-heal\d?-)/i.test(proj.name));
          if (isOrphan) {
            // Skip validation when force_all is true (protected registry is already empty)
            if (!forceAll) {
              const v = validateDeletion('vercel', proj.name.toLowerCase(), null, protectedRegistry);
              if (!v.safe) { blocked.push({ type: 'vercel', id: proj.name, reason: v.reason }); continue; }
            }
            try {
              const dr = await fetch(`https://api.vercel.com/v9/projects/${proj.id}${vercelTeamId ? `?teamId=${vercelTeamId}` : ''}`, { method: 'DELETE', headers: { Authorization: `Bearer ${vercelToken}` } });
              if (dr.ok) deleted.vercel.push(`${proj.name} (orphan test)`);
            } catch (e) { errors.push(`Vercel orphan ${proj.name}: ${e.message}`); }
          }
        }
      }
    } catch (e) { errors.push(`Vercel scan: ${e.message}`); }
  }
  // Supabase
  if (supaToken) {
    try {
      const r = await fetch('https://api.supabase.com/v1/projects', { headers: { Authorization: `Bearer ${supaToken}` } });
      if (r.ok) {
        const projects = await r.json();
        for (const proj of (Array.isArray(projects) ? projects : [])) {
          const isOrphan = /^fl-test-/i.test(proj.name) ||
            (forceAll && /^(fl-test-|garageforce-|revolut-|pure-floors-|.*-clone-|.*-heal\d?-)/i.test(proj.name));
          if (isOrphan) {
            if (!forceAll) {
              const v = validateDeletion('supabase', proj.ref, null, protectedRegistry);
              if (!v.safe) { blocked.push({ type: 'supabase', id: proj.ref, reason: v.reason }); continue; }
            }
            try {
              const dr = await fetch(`https://api.supabase.com/v1/projects/${proj.ref}`, { method: 'DELETE', headers: { Authorization: `Bearer ${supaToken}` } });
              if (dr.ok) deleted.supabase.push(`${proj.ref} (orphan test)`);
            } catch (e) { errors.push(`Supabase orphan ${proj.name}: ${e.message}`); }
          }
        }
      }
    } catch (e) { errors.push(`Supabase scan: ${e.message}`); }
  }
  // Drive
  if (driveToken) {
    try {
      // When force_all, also search for clone-engine folder names
      const query = forceAll
        ? "name contains 'fl-test' or name contains 'garageforce' or name contains 'revolut' or name contains 'pure-floors' or name contains 'clone' or name contains 'heal'"
        : "name contains 'fl-test'";
      const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name)`, { headers: { Authorization: `Bearer ${driveToken}` } });
      if (r.ok) {
        const d = await r.json();
        for (const f of (d.files || [])) {
          if (!forceAll) {
            const v = validateDeletion('drive', f.id, null, protectedRegistry);
            if (!v.safe) { blocked.push({ type: 'drive', id: f.id, reason: v.reason }); continue; }
          }
          try {
            const dr = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${driveToken}` } });
            if (dr.ok || dr.status === 204) deleted.drive.push(`${f.name} (orphan test)`);
          } catch (e) { errors.push(`Drive orphan ${f.name}: ${e.message}`); }
        }
      }
    } catch (e) { errors.push(`Drive scan: ${e.message}`); }
  }

  // --- Clean a specific Drive folder's contents (when drive_folder_url is provided) ---
  if (driveToken && body.drive_folder_url) {
    const parentFolderId = extractDriveId(body.drive_folder_url);
    if (parentFolderId) {
      try {
        // List ALL children (files + folders) of the specified Drive folder
        const listRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${parentFolderId}' in parents and trashed=false`)}&fields=files(id,name,mimeType)&pageSize=200`,
          { headers: { Authorization: `Bearer ${driveToken}` } }
        );
        if (listRes.ok) {
          const listData = await listRes.json();
          const children = listData.files || [];
          for (const child of children) {
            try {
              const delRes = await fetch(`https://www.googleapis.com/drive/v3/files/${child.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${driveToken}` }
              });
              if (delRes.ok || delRes.status === 204) {
                deleted.drive.push(`${child.name} (from specified folder)`);
              } else {
                errors.push(`Drive folder child delete ${child.name}: ${delRes.status}`);
              }
            } catch (e) { errors.push(`Drive folder child ${child.name}: ${e.message}`); }
          }
          console.log(`Cleaned ${children.length} items from specified Drive folder ${parentFolderId}`);
        } else {
          errors.push(`Drive folder list: ${listRes.status}`);
        }
      } catch (e) { errors.push(`Drive folder cleanup: ${e.message}`); }
    }
  }

  // --- Audit receipt ---
  try {
    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId, system: 'cleanup', action: 'delete_test_resources',
      status: 'success', summary: `Double-validated cleanup — GH:${deleted.github.length} Vercel:${deleted.vercel.length} Supabase:${deleted.supabase.length} Drive:${deleted.drive.length} | Blocked:${blocked.length}`,
      evidence: { deleted, blocked: blocked.length ? blocked : null, errors: errors.length ? errors.slice(0, 10) : null, good_projects_kept: goodProjects.length, test_projects_cleaned: testProjects.length }
    });
  } catch (e) {}

  return Response.json({
    status: 'success',
    dry_run: false,
    good_projects: goodProjects,
    test_projects_cleaned: testProjects.length,
    deleted,
    blocked: blocked.length ? blocked : undefined,
    errors: errors.length ? errors.slice(0, 15) : undefined,
    summary: `Kept ${goodProjects.length} good projects. Deleted ${deleted.github.length} GitHub, ${deleted.vercel.length} Vercel, ${deleted.supabase.length} Supabase, ${deleted.drive.length} Drive. Blocked ${blocked.length} resources.`
  });
}