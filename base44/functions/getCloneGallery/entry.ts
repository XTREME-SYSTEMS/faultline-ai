import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Clone Gallery — returns all cloned LaunchProjects that have a live Vercel URL,
// grouped by industry, with a thumbnail (og:image) extracted from each live site.
// Only clones with a working URL are included — every card links to a real Vercel deployment.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    // Fetch all launch projects, sorted by most recent
    const projects = await base44.asServiceRole.entities.LaunchProject.filter(
      { organization_id: orgId }, '-created_date', 100
    );

    // Keep only clones that have a Vercel deployment URL (working URL required)
    const cloned = projects.filter(p =>
      p.vercel_deployment_url || p.metadata?.vercel_deployment_url
    );

    // Fetch thumbnails (og:image) from each live site in parallel — 8s timeout each
    const withThumbs = await Promise.all(cloned.map(async (p) => {
      const url = p.vercel_deployment_url || p.metadata?.vercel_deployment_url;
      let thumbnail = null;
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'FaultLine-CloneGallery/1.0' },
          signal: AbortSignal.timeout(8000), redirect: 'follow'
        });
        const html = await res.text();
        // Try og:image first, then twitter:image, then first large img
        const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i)
          || html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']*)["']/i);
        if (ogMatch) {
          thumbnail = ogMatch[1];
        } else {
          const imgMatch = html.match(/<img[^>]*src=["'](https?:\/\/[^"']+\.(?:png|jpg|jpeg|webp|svg)[^"']*)["']/i);
          if (imgMatch) thumbnail = imgMatch[1];
        }
      } catch (e) { /* thumbnail stays null — frontend shows placeholder */ }
      return {
        id: p.id,
        name: p.project_name || p.business_name || 'Untitled Clone',
        business_name: p.business_name || '',
        industry: p.industry || p.metadata?.target_dna?.industry || 'Uncategorized',
        url,
        thumbnail,
        score: p.parity_score || 0,
        status: p.status,
        target_url: p.metadata?.target_url || '',
        created_date: p.created_date,
      };
    }));

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