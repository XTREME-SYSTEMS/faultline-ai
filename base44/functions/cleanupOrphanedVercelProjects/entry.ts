import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

// Cleans up orphaned Vercel projects that were created during heal iterations
// but are no longer referenced by any LaunchProject. Each heal iteration
// creates a new Vercel project (with timestamp suffixes like -heal1-abc), and
// the old ones are never deleted — consuming Vercel project quota and causing
// 429 rate limits. This function lists all Vercel projects, cross-references
// against LaunchProject.vercel_deployment_url, and deletes orphans.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;

    const token = secrets.get('VERCEL_TOKEN');
    if (!token) throw new Error('VERCEL_TOKEN secret not set');
    const teamId = secrets.get('VERCEL_TEAM_ID') || null;

    // 1. Get all LaunchProject deployment URLs (the "keep" list)
    const projects = await base44.asServiceRole.entities.LaunchProject.list('-created_date', 200);
    const keepUrls = new Set();
    const keepSlugs = new Set();
    for (const p of projects) {
      const url = p.vercel_deployment_url || p.metadata?.vercel_deployment_url;
      if (url) {
        try {
          const host = new URL(url).hostname; // e.g. clone-heal1-abc-xtreme.vercel.app
          const slug = host.replace(/\.vercel\.app$/, '');
          keepSlugs.add(slug);
          keepUrls.add(url);
        } catch {}
      }
    }
    // Also keep rebrand deployment URLs
    const rebrands = await base44.asServiceRole.entities.RebrandProject.list('-created_date', 50);
    for (const r of rebrands) {
      const url = r.provisioned?.vercel_deployment_url;
      if (url) {
        try {
          const slug = new URL(url).hostname.replace(/\.vercel\.app$/, '');
          keepSlugs.add(slug);
        } catch {}
      }
    }

    // 2. List all Vercel projects (paginated)
    const allVercelProjects = [];
    let cursor = null;
    for (let page = 0; page < 10; page++) { // cap at 10 pages (200 projects)
      const url = `https://api.vercel.com/v9/projects${teamId ? `?teamId=${teamId}` : ''}${cursor ? `&until=${cursor}` : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Vercel list failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
      const data = await res.json();
      allVercelProjects.push(...(data.projects || []));
      if (!data.pagination?.next) break;
      cursor = data.pagination.next;
    }

    // 3. Identify orphans: Vercel projects not in the keep list
    //    Only delete projects that look like heal iterations (contain -heal or -r2)
    //    or are very old (safety: skip projects without those markers)
    const orphans = allVercelProjects.filter(vp => {
      const slug = vp.name;
      if (keepSlugs.has(slug)) return false;
      // Only delete projects that match heal-iteration patterns
      return /-heal\d|-r2|-seo|-lgny/i.test(slug);
    });

    console.log(`cleanupOrphanedVercelProjects: ${allVercelProjects.length} total, ${keepSlugs.size} referenced, ${orphans.length} orphaned`);

    // 4. Delete orphans (batch with small delay to avoid rate limits)
    const deleted = [];
    const failed = [];
    for (const orphan of orphans.slice(0, 50)) { // cap at 50 per run
      try {
        const delUrl = `https://api.vercel.com/v9/projects/${orphan.id}${teamId ? `?teamId=${teamId}` : ''}`;
        const delRes = await fetch(delUrl, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        if (delRes.ok || delRes.status === 204) {
          deleted.push(orphan.name);
        } else {
          failed.push({ name: orphan.name, error: `${delRes.status}` });
        }
        await new Promise(r => setTimeout(r, 300)); // small delay
      } catch (e) {
        failed.push({ name: orphan.name, error: e.message });
      }
    }

    // 5. Receipt
    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'vercel_cleanup', action: 'cleanup_orphans',
        status: failed.length === 0 ? 'success' : 'partial',
        summary: `Deleted ${deleted.length} orphaned Vercel projects (${failed.length} failed)`,
        evidence: { total_vercel: allVercelProjects.length, referenced: keepSlugs.size, orphaned: orphans.length, deleted: deleted.slice(0, 20), failed: failed.slice(0, 10) }
      });
    } catch (e) {}

    return Response.json({
      status: 'completed',
      total_vercel_projects: allVercelProjects.length,
      referenced: keepSlugs.size,
      orphaned_found: orphans.length,
      deleted: deleted.length,
      failed: failed.length,
      deleted_names: deleted.slice(0, 20),
    });
  } catch (error) {
    console.error('cleanupOrphanedVercelProjects error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}