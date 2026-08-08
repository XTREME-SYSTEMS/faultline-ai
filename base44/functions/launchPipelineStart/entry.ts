import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { kickoffPackDeliverable } from '../../shared/packGeneration.ts';
import { slugify, createDriveFolder, createGitHubRepo, createSupabaseProject, createVercelProject, disableVercelSso } from '../../shared/launchInfra.ts';

// Step 1 of the Autonomous Launch Pipeline.
// Triggered by the workflow when a LaunchProject is created (status 'queued').
// - Creates / links a CRM CustomerAccount + Company for the client
// - Kicks off pack-driven website generation (background, async)
// - Provisions Google Drive folder, GitHub repo, Supabase project, Vercel project
// - Updates the LaunchProject with all refs and status 'generating'
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { launch_project_id } = await req.json().catch(() => ({}));
    if (!launch_project_id) return Response.json({ error: 'launch_project_id required' }, { status: 400 });

    const lp = await base44.asServiceRole.entities.LaunchProject.get(launch_project_id);
    if (!lp) return Response.json({ error: 'LaunchProject not found' }, { status: 404 });
    const orgId = lp.organization_id;
    const slug = slugify(lp.project_name || lp.business_name || 'faultline-site');

    await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, { status: 'provisioning', slug });

    const errors = {};
    let customerAccountId = lp.customer_account_id;
    let companyId = lp.company_id;

    // 1. CRM — create or link CustomerAccount + Company
    try {
      if (!customerAccountId) {
        const existing = await base44.asServiceRole.entities.CustomerAccount.filter({ organization_id: orgId, business_name: lp.business_name }, '-created_date', 1);
        if (existing.length > 0) {
          customerAccountId = existing[0].id;
        } else {
          const account = await base44.asServiceRole.entities.CustomerAccount.create({
            organization_id: orgId,
            account_name: lp.client_name || lp.business_name || lp.project_name,
            business_name: lp.business_name || lp.project_name,
            industry: lp.industry || '',
            stage: 'pre_launch',
            status: 'trial',
            lifecycle_state: 'launch_in_progress',
            notes: `Autonomous launch project: ${lp.project_name}. Contact: ${lp.client_name || ''} ${lp.client_email || ''} ${lp.client_phone || ''}`.trim()
          });
          customerAccountId = account.id;
        }
      }
    } catch (e) { errors.crm = e.message; }

    try {
      if (!companyId && lp.business_name) {
        const existingCo = await base44.asServiceRole.entities.Company.filter({ organization_id: orgId, name: lp.business_name }, '-created_date', 1);
        if (existingCo.length > 0) {
          companyId = existingCo[0].id;
        } else {
          const co = await base44.asServiceRole.entities.Company.create({
            organization_id: orgId,
            name: lp.business_name,
            industry: lp.industry || '',
            status: 'active'
          });
          companyId = co.id;
        }
      }
    } catch (e) { errors.company = e.message; }

    // 2. Create the "generating" Deliverable — the workflow drives batch generation
    //    via generateSiteBatch calls (no waitUntil needed, each batch < 120s).
    let deliverableId = lp.deliverable_id;
    try {
      if (!deliverableId && lp.design_pack_id) {
        const { deliverable_id } = await kickoffPackDeliverable(base44, orgId, {
          business_name: lp.business_name || lp.project_name,
          industry: lp.industry,
          description: lp.description,
          target_audience: lp.target_audience,
          tone: lp.tone || 'professional',
          design_pack_id: lp.design_pack_id,
          logo_url: lp.metadata?.logo_url || null,
          company_id: companyId || null
        });
        deliverableId = deliverable_id;
      }
    } catch (e) { errors.generation = e.message; }

    // If no deliverable could be created (no design pack), fail gracefully
    // instead of leaving the project stuck at 'generating' forever.
    if (!deliverableId) {
      await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, {
        status: 'failed',
        last_validation_summary: 'No design pack attached — upload a design pack to generate a site, or use the autonomous clone engine for target-URL cloning.',
        errors: { ...errors, no_deliverable: 'No design_pack_id on this project' }
      });
      return Response.json({ error: 'No design pack attached — cannot generate site', launch_project_id }, { status: 400 });
    }

    // 3. Provision infrastructure
    let driveFolderUrl = lp.drive_folder_url;
    let githubRepoUrl = lp.github_repo_url;
    let supabaseProjectUrl = lp.supabase_project_url;
    let vercelProjectUrl = lp.vercel_project_url;
    let vercelProjectId = lp.metadata?.vercel_project_id || null;

    try {
      if (!driveFolderUrl) {
        const conn = await base44.asServiceRole.connectors.getConnection('googledrive');
        if (!conn?.accessToken) throw new Error('Google Drive connector not authorized');
        const drive = await createDriveFolder(conn.accessToken, `${lp.project_name} Website Assets`);
        driveFolderUrl = drive.url;
      }
    } catch (e) { errors.drive = e.message; }

    try {
      if (!githubRepoUrl) {
        const ghConn = await base44.asServiceRole.connectors.getConnection('github');
        if (!ghConn?.accessToken) throw new Error('GitHub connector not authorized');
        const repo = await createGitHubRepo(ghConn.accessToken, slug);
        githubRepoUrl = repo.url;
      }
    } catch (e) { errors.github = e.message; }

    try {
      if (!supabaseProjectUrl) {
        const supaConn = await base44.asServiceRole.connectors.getConnection('supabase');
        if (!supaConn?.accessToken) throw new Error('Supabase connector not authorized');
        const supa = await createSupabaseProject(supaConn.accessToken, slug);
        supabaseProjectUrl = supa.url;
      }
    } catch (e) { errors.supabase = e.message; }

    try {
      if (!vercelProjectUrl) {
        const token = Deno.env.get('VERCEL_TOKEN');
        if (!token) throw new Error('VERCEL_TOKEN secret not set');
        const teamId = Deno.env.get('VERCEL_TEAM_ID') || null;
        const vp = await createVercelProject(token, teamId, slug);
        vercelProjectId = vp.id;
        vercelProjectUrl = `https://vercel.com/${teamId ? teamId + '/' : ''}${slug}`;
        // Disable Vercel SSO so deployments are publicly accessible for Browserbase validation
        try { await disableVercelSso(token, teamId, vp.id); } catch (e) { errors.vercel_sso = e.message; }
      }
    } catch (e) { errors.vercel = e.message; }

    // 4. Update LaunchProject
    await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, {
      slug,
      customer_account_id: customerAccountId,
      company_id: companyId,
      deliverable_id: deliverableId,
      drive_folder_url: driveFolderUrl,
      github_repo_url: githubRepoUrl,
      supabase_project_url: supabaseProjectUrl,
      vercel_project_url: vercelProjectUrl,
      metadata: { ...(lp.metadata || {}), ...(vercelProjectId ? { vercel_project_id: vercelProjectId } : {}) },
      status: 'generating',
      progress: 15,
      errors: Object.keys(errors).length ? errors : null
    });

    // 5. Analytics — audit event
    try {
      await base44.asServiceRole.entities.AuditEvent.create({
        organization_id: orgId,
        entity_type: 'LaunchProject',
        entity_id: launch_project_id,
        action: 'launch_started',
        project_id: launch_project_id,
        metadata: { slug, deliverable_id: deliverableId, customer_account_id: customerAccountId, company_id: companyId, drive: !!driveFolderUrl, github: !!githubRepoUrl, supabase: !!supabaseProjectUrl, vercel: !!vercelProjectUrl, errors }
      });
    } catch (e) {}

    return Response.json({
      status: 'started',
      launch_project_id,
      deliverable_id: deliverableId,
      customer_account_id: customerAccountId,
      company_id: companyId,
      drive_folder_url: driveFolderUrl,
      github_repo_url: githubRepoUrl,
      supabase_project_url: supabaseProjectUrl,
      vercel_project_url: vercelProjectUrl,
      errors: Object.keys(errors).length ? errors : undefined
    });
  } catch (error) {
    console.error('launchPipelineStart error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}