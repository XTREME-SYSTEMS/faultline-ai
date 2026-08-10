import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { deriveNameFromUrl, decodeHtmlEntities, findParentId, traceBenchmarkUrl, isGenericName } from '../../shared/cloneUtils.ts';

// Clone Gallery — returns all cloned LaunchProjects that have a live Vercel URL,
// with the original site name (traced via benchmark_url or heal chain),
// the original URL, and the Vercel clone URL.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    // Load ALL projects (not just 100) so we can trace heal chains
    const projects = await base44.asServiceRole.entities.LaunchProject.filter(
      { organization_id: orgId }, '-created_date', 500
    );

    // Build a lookup map for heal-chain tracing
    const projectMap = new Map(projects.map(p => [p.id, p]));

    // Fetch CloneQueue items to infer industry for projects that don't have one stored
    const queueItems = await base44.asServiceRole.entities.CloneQueue.filter(
      { organization_id: orgId }, '-created_date', 500
    );
    const queueByLaunchId = new Map(queueItems.filter(q => q.launch_project_id).map(q => [q.launch_project_id, q]));
    const queueByTargetUrl = new Map(queueItems.filter(q => q.target_url).map(q => [q.target_url, q]));

    const cloned = projects.filter(p =>
      p.vercel_deployment_url || p.metadata?.vercel_deployment_url
    );

    const withThumbs = cloned.map((p) => {
      const vercelUrl = p.vercel_deployment_url || p.metadata?.vercel_deployment_url;

      // Trace the original target URL: check this project's benchmark_url first,
      // then walk the heal chain via logs to find an ancestor that has it.
      const originalUrl = p.benchmark_url || traceBenchmarkUrl(p, projectMap);

      // Derive the site name from the original URL when the stored name is generic
      const isGeneric = !p.project_name ||
        p.project_name.startsWith('Autonomous Clone') ||
        p.project_name === 'Clone' || p.project_name === 'CLONE' ||
        /^Clone (heal\d+|[a-z0-9]{3,})$/.test(p.project_name);
      const derivedName = originalUrl ? deriveNameFromUrl(originalUrl) : null;
      const rawName = (isGeneric && derivedName) ? derivedName : (p.project_name || 'Untitled Clone');
      const name = decodeHtmlEntities(rawName);

      // Screenshot of the clone's Vercel home page (mShots generates + caches on first request)
      const thumbnail = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(vercelUrl)}?w=480&h=360`;

      return {
        id: p.id,
        name,
        business_name: p.business_name || derivedName || '',
        industry: p.industry || p.metadata?.target_dna?.industry ||
          (originalUrl && queueByTargetUrl.get(originalUrl)?.industry) ||
          queueByLaunchId.get(p.id)?.industry || 'Uncategorized',
        url: vercelUrl,
        target_url: originalUrl || '',
        thumbnail,
        score: p.parity_score || 0,
        status: p.status,
        created_date: p.created_date,
        needsRename: isGeneric && derivedName ? true : false,
      };
    });

    // Fix generic names in the DB (non-blocking, one-time)
    const toRename = withThumbs.filter(c => c.needsRename);
    if (toRename.length > 0) {
      base44.asServiceRole.entities.LaunchProject.bulkUpdate(
        toRename.map(c => ({ id: c.id, project_name: c.name, business_name: c.name, benchmark_url: c.target_url || undefined }))
      ).catch(() => {});
    }

    // Backfill industry on projects that don't have one stored (non-blocking)
    for (const c of withThumbs) {
      if (c.industry !== 'Uncategorized') {
        const proj = projectMap.get(c.id);
        if (proj && !proj.industry) {
          base44.asServiceRole.entities.LaunchProject.update(c.id, { industry: c.industry }).catch(() => {});
        }
      }
    }

    // Group by industry
    const groups = {};
    for (const c of withThumbs) {
      const ind = c.industry || 'Uncategorized';
      if (!groups[ind]) groups[ind] = [];
      groups[ind].push(c);
    }

    // Sort clones alphabetically within each group, then group industries alphabetically
    const grouped = Object.entries(groups)
      .map(([industry, clones]) => ({
        industry,
        clones: clones.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }))
      }))
      .sort((a, b) => (a.industry || '').localeCompare(b.industry || '', undefined, { sensitivity: 'base' }));

    return Response.json({
      total: withThumbs.length,
      at100: withThumbs.filter(c => c.score >= 100).length,
      below100: withThumbs.filter(c => c.score > 0 && c.score < 100).length,
      groups: grouped,
    });
  } catch (error) {
    console.error('getCloneGallery error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}