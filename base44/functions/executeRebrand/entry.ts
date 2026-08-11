import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Executes an approved rebrand: provisions Drive folder, GitHub repo, Vercel project,
// Supabase project, buys/assigns a domain via Vercel, and runs SEO/AEO optimization.
// Each step is resilient — partial failures are recorded, not fatal.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rebrand_project_id } = await req.json();
    if (!rebrand_project_id) return Response.json({ error: 'rebrand_project_id required' }, { status: 400 });

    const project = await base44.entities.RebrandProject.get(rebrand_project_id);
    if (project.approval_state !== 'approved') return Response.json({ error: 'Project must be approved first' }, { status: 400 });
    if (!project.rebrand_html) return Response.json({ error: 'Generate rebrand assets first' }, { status: 400 });

    await base44.entities.RebrandProject.update(rebrand_project_id, { status: 'provisioning' });

    const biz = project.recommended_business_name || 'New Local Business';
    const domain = project.recommended_domain || '';
    const provisioned = { ...(project.provisioned || {}) };
    const log = [];

    // 1. Drive folder (Google Drive connector)
    try {
      const token = await base44.asServiceRole.connectors.getConnection('googledrive');
      const folderRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,webViewLink', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${biz} — Rebrand Assets`, mimeType: 'application/vnd.google-apps.folder' })
      });
      if (folderRes.ok) {
        const f = await folderRes.json();
        provisioned.drive_folder_url = f.webViewLink || `https://drive.google.com/drive/folders/${f.id}`;
        log.push('Drive folder created');
      } else log.push('Drive folder skipped');
    } catch (e) { log.push('Drive folder skipped: ' + e.message); }

    // 2. GitHub repo + Vercel project + deploy (reuse launchProject)
    try {
      const launch = await base44.functions.invoke('launchProject', {
        project_name: `${biz.replace(/\s+/g, '-').toLowerCase()}-rebrand-${Date.now().toString(36).slice(-4)}`,
        website_html: project.rebrand_html,
        domain: domain || undefined
      });
      const d = launch.data || launch;
      if (d.status === 'success' || d.results) {
        provisioned.github_repo_url = d.results?.github?.url || '';
        provisioned.vercel_project_url = d.results?.vercel?.project?.url || '';
        provisioned.vercel_deployment_url = d.results?.vercel?.deploy?.url || '';
        log.push('GitHub + Vercel deployed');
      } else log.push('Launch partial: ' + JSON.stringify(d.errors || d).slice(0, 200));
    } catch (e) { log.push('Launch failed: ' + e.message); }

    // 3. Supabase project (connector)
    try {
      const token = await base44.asServiceRole.connectors.getConnection('supabase');
      const sbRes = await fetch('https://api.supabase.com/v1/projects', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: biz.replace(/\s+/g, '-').toLowerCase().slice(0, 40), organization_id: '', region: 'us-east-1', db_pass: Math.random().toString(36).slice(2) + 'Aa1!' })
      });
      if (sbRes.ok) {
        const sb = await sbRes.json();
        provisioned.supabase_project_url = `https://supabase.com/dashboard/project/${sb.id}`;
        log.push('Supabase project created');
      } else log.push('Supabase skipped');
    } catch (e) { log.push('Supabase skipped: ' + e.message); }

    // 4. Domain purchase / assignment via Vercel
    if (domain && provisioned.vercel_deployment_url) {
      try {
        const dom = await base44.functions.invoke('assignVercelDomain', { domain, deployment_url: provisioned.vercel_deployment_url });
        const dd = dom.data || dom;
        provisioned.domain_name = domain;
        provisioned.domain_purchased = !dd.error;
        log.push(dd.error ? `Domain ${domain}: ${dd.error}` : `Domain ${domain} assigned (configure DNS / purchase in Vercel dashboard to complete)`);
      } catch (e) { log.push('Domain step skipped: ' + e.message); }
    }

    // 5. SEO + AEO optimization (generate tags + report)
    let seoReport = {};
    try {
      const tags = await base44.functions.invoke('seoGenerateTags', {
        site_url: provisioned.vercel_deployment_url || project.source_url,
        business_name: biz,
        domain
      });
      seoReport.generated_tags = (tags.data || tags);
      // Inject tags into the deployed site if possible
      if (provisioned.vercel_deployment_url) {
        const inj = await base44.functions.invoke('seoInjectTags', { site_url: provisioned.vercel_deployment_url, tags: seoReport.generated_tags });
        seoReport.injection = (inj.data || inj);
      }
      seoReport.aeo_note = 'AEO: structured FAQ + service schema recommended for AI search visibility. Generated tags include Organization + LocalBusiness + FAQ schema.';
      log.push('SEO/AEO tags generated');
    } catch (e) { log.push('SEO step skipped: ' + e.message); }

    await base44.entities.RebrandProject.update(rebrand_project_id, {
      provisioned,
      seo_aeo_report: seoReport,
      status: 'completed'
    });

    const updated = await base44.entities.RebrandProject.get(rebrand_project_id);
    return Response.json({ project: updated, log });
  } catch (error) {
    console.error('executeRebrand error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}