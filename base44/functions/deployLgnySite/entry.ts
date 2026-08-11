import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { generateLgnySiteHtml } from '../../shared/lgnySiteTemplate.ts';

// Deploys a standalone copy of the LGNY marketing site with configurable branding.
// 1. Generates standalone HTML from the LGNY template (brand name, domain, accent, logo).
// 2. Deploys to Vercel via the existing launchProject function (Vercel only).
// 3. Creates a MultiSite record to track the deployed site.
// 4. Optionally assigns a custom domain via the existing assignVercelDomain function.
//
// This lets the user "sprout up" branded copies of the site across multiple domains
// (leadgennearyou.com, leadgenerationnearyou.com, leadgenerationnearme.com, etc.)

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const {
      brand_name, domain, accent_color, logo_url, tagline,
      connect_domain = false,
    } = body;

    if (!brand_name) return Response.json({ error: 'brand_name required' }, { status: 400 });

    const cleanDomain = (domain || '').replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
    const accent = accent_color || '#CCFF00';
    const logo = logo_url || 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/20de672b0_ChatGPTImageAug9202611_49_11PM.png';

    // 1. Create MultiSite record (status: deploying)
    const site = await base44.entities.MultiSite.create({
      organization_id: orgId,
      brand_name,
      domain: cleanDomain,
      accent_color: accent,
      logo_url: logo,
      tagline: tagline || undefined,
      status: 'deploying',
      domain_status: cleanDomain ? 'pending_dns' : 'not_connected',
    });

    // 2. Generate standalone HTML
    const html = generateLgnySiteHtml({
      brandName: brand_name,
      domain: cleanDomain || 'leadgenerationnearyou.com',
      accentColor: accent,
      logoUrl: logo,
      tagline,
    });

    // 3. Deploy to Vercel via launchProject (Vercel only — no Drive/GitHub/Supabase)
    const projectName = `${brand_name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${site.id.slice(-6)}`;
    let launchResult;
    try {
      launchResult = await base44.functions.invoke('launchProject', {
        project_name: projectName,
        website_html: html,
        steps: { vercel: true, drive: false, github: false, supabase: false },
      });
    } catch (e) {
      console.error('launchProject failed:', e.message);
      await base44.asServiceRole.entities.MultiSite.update(site.id, {
        status: 'failed',
        error: `Deploy failed: ${e.message}`,
      });
      return Response.json({ error: `Deploy failed: ${e.message}` }, { status: 500 });
    }

    const ld = launchResult?.data || launchResult;
    if (ld?.error) {
      await base44.asServiceRole.entities.MultiSite.update(site.id, {
        status: 'failed',
        error: ld.error,
      });
      return Response.json({ error: ld.error }, { status: 500 });
    }

    const vercelUrl = ld?.results?.vercel?.deploy?.url || ld?.results?.vercel?.deploy?.alias?.[0];
    const vercelProjectName = ld?.results?.vercel?.project?.name || projectName;
    const launchProjectId = ld?.results?.vercel?.projectId;

    if (!vercelUrl) {
      await base44.asServiceRole.entities.MultiSite.update(site.id, {
        status: 'failed',
        error: 'No Vercel URL returned from deploy',
      });
      return Response.json({ error: 'Deploy succeeded but no Vercel URL returned' }, { status: 500 });
    }

    // 4. Update MultiSite record with deploy info
    await base44.asServiceRole.entities.MultiSite.update(site.id, {
      status: 'live',
      vercel_url: vercelUrl,
      vercel_project_name: vercelProjectName,
      launch_project_id: launchProjectId,
    });

    // 5. Optionally connect custom domain
    let domainResult = null;
    if (connect_domain && cleanDomain && launchProjectId) {
      try {
        const dr = await base44.functions.invoke('assignVercelDomain', {
          launch_project_id: launchProjectId,
          domain: cleanDomain,
        });
        const dd = dr?.data || dr;
        if (dd?.error) {
          domainResult = { error: dd.error };
          await base44.asServiceRole.entities.MultiSite.update(site.id, {
            domain_status: 'failed',
          });
        } else {
          domainResult = dd;
          await base44.asServiceRole.entities.MultiSite.update(site.id, {
            domain_status: 'pending_dns',
            domain_verification: dd?.verification || null,
          });
        }
      } catch (e) {
        domainResult = { error: e.message };
      }
    }

    return Response.json({
      status: 'success',
      site_id: site.id,
      vercel_url: vercelUrl,
      vercel_project_name: vercelProjectName,
      launch_project_id: launchProjectId,
      domain_result: domainResult,
    });
  } catch (error) {
    console.error('deployLgnySite error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}