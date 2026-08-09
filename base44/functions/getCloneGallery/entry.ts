import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Derive the original site name from a Vercel deployment URL.
// Pattern: {site-slug}-heal{N}-{rand}-{rand}-xtreme-ai-systems.vercel.app
// e.g. revolut-heal1-gzpj-qtigfrruf-... → "Revolut"
//      gong-io-heal1-syaw-...            → "Gong Io"
//      clone-heal1-2jg6-...             → null (no site name embedded)
function deriveNameFromVercelUrl(url) {
  try {
    const host = new URL(url).hostname;
    const subdomain = host.replace(/\.vercel\.app$/, '');
    const withoutTeam = subdomain.replace(/-xtreme-ai-systems$/, '');
    const parts = withoutTeam.split('-');
    // Find the heal/codeheal marker (not "clone" — that's a generic slug)
    const markerIdx = parts.findIndex(p => /^(heal|codeheal)\d*$/.test(p));
    if (markerIdx > 0) {
      const slug = parts.slice(0, markerIdx).join('-');
      if (slug && slug !== 'clone' && !slug.startsWith('autonomous')) {
        return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
    // Fallback: find a random-looking ID (4+ chars, has both letters and digits)
    const uniqueId = parts.find(p =>
      p.length >= 4 && /[a-zA-Z]/.test(p) && /[0-9]/.test(p) &&
      !p.startsWith('iter') && !/^(heal|codeheal|clone)\d*$/.test(p)
    );
    if (uniqueId) return `Clone ${uniqueId}`;
    return null;
  } catch { return null; }
}

// Decode common HTML entities in names (e.g. "Banking &amp; Beyond" → "Banking & Beyond")
function decodeHtmlEntities(str) {
  if (!str) return str;
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

// Clone Gallery — returns all cloned LaunchProjects that have a live Vercel URL,
// grouped by industry, with a screenshot thumbnail of each clone's home page.
// Names are derived from the Vercel URL pattern when the stored name is generic.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const projects = await base44.asServiceRole.entities.LaunchProject.filter(
      { organization_id: orgId }, '-created_date', 100
    );

    const cloned = projects.filter(p =>
      p.vercel_deployment_url || p.metadata?.vercel_deployment_url
    );

    const withThumbs = cloned.map((p) => {
      const url = p.vercel_deployment_url || p.metadata?.vercel_deployment_url;

      // Use the original site name when the stored name is generic
      const isGeneric = !p.project_name ||
        p.project_name.startsWith('Autonomous Clone') ||
        p.project_name === 'Clone' || p.project_name === 'CLONE' ||
        /^Clone (heal\d+|[a-z0-9]{3,})$/.test(p.project_name);
      const derivedName = isGeneric ? deriveNameFromVercelUrl(url) : null;
      const rawName = (isGeneric && derivedName) ? derivedName : (p.project_name || 'Untitled Clone');
      const name = decodeHtmlEntities(rawName);

      // Screenshot of the clone's home page (mShots generates + caches on first request)
      const thumbnail = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=480&h=360`;

      return {
        id: p.id,
        name,
        business_name: p.business_name || derivedName || '',
        industry: p.industry || p.metadata?.target_dna?.industry || 'Uncategorized',
        url,
        thumbnail,
        score: p.parity_score || 0,
        status: p.status,
        target_url: p.metadata?.target_url || '',
        created_date: p.created_date,
        needsRename: isGeneric && derivedName ? true : false,
      };
    });

    // Fix generic names in the DB (non-blocking, one-time)
    const toRename = withThumbs.filter(c => c.needsRename);
    if (toRename.length > 0) {
      base44.asServiceRole.entities.LaunchProject.bulkUpdate(
        toRename.map(c => ({ id: c.id, project_name: c.name, business_name: c.name }))
      ).catch(() => {});
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