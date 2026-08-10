import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Clone Studio — Assign a custom domain to a Vercel project.
// 1. Adds the domain to the Vercel project (by project name from vercel_deployment_url).
// 2. Returns the DNS verification record the user must add at their registrar.
// Note: Vercel does not sell domains directly — the user buys the domain at a registrar
// (Namecheap, GoDaddy, etc.), points DNS to Vercel, and this function links it.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { launch_project_id, domain } = body;
    if (!launch_project_id || !domain) {
      return Response.json({ error: 'launch_project_id and domain required' }, { status: 400 });
    }

    const project = await base44.asServiceRole.entities.LaunchProject.get(launch_project_id);
    if (!project || project.organization_id !== orgId) throw new Error('Project not found');

    const vercelToken = Deno.env.get('VERCEL_TOKEN');
    const teamId = Deno.env.get('VERCEL_TEAM_ID');
    if (!vercelToken) return Response.json({ error: 'VERCEL_TOKEN not configured' }, { status: 500 });

    // Extract the Vercel project name from the deployment URL
    // e.g. https://my-project-abc123-xtreme-ai-systems.vercel.app → my-project-abc123
    const vercelUrl = project.vercel_deployment_url || project.metadata?.vercel_deployment_url;
    if (!vercelUrl) return Response.json({ error: 'No Vercel deployment URL on project — deploy first' }, { status: 400 });

    let projectName;
    try {
      const host = new URL(vercelUrl).hostname;
      projectName = host.split('.')[0];
    } catch (e) {
      return Response.json({ error: 'Could not parse Vercel project name from URL' }, { status: 400 });
    }

    const teamParam = teamId ? `?teamId=${teamId}` : '';

    // 1. Add the domain to the Vercel project
    const addRes = await fetch(`https://api.vercel.com/v8/projects/${encodeURIComponent(projectName)}/domains${teamParam}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: domain }),
      signal: AbortSignal.timeout(15000)
    });

    if (!addRes.ok) {
      const errText = await addRes.text();
      return Response.json({ error: `Vercel API error: ${addRes.status} — ${errText}` }, { status: 400 });
    }

    const addData = await addRes.json();

    // 2. Get the verification record (A/CNAME the user must add at their registrar)
    const verification = {
      domain: addData.name || domain,
      verification_record: addData.verification?.[0] || null,
      nameservers: ['ns1.vercel-dns.com', 'ns2.vercel-dns.com'],
      instructions: 'Add the verification record at your domain registrar, then DNS will propagate within minutes.',
      assigned_to_project: projectName,
      vercel_project_url: `https://vercel.com/${teamId ? `teams/${teamId}` : 'dashboard'}/${projectName}`
    };

    // Update the project with the custom domain
    await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, {
      domain_name: domain,
      metadata: { ...project.metadata, assigned_domain: domain, domain_verification: verification, domain_assigned_at: new Date().toISOString() }
    });

    return Response.json({
      status: 'success',
      domain,
      verification,
      message: `Domain ${domain} assigned to Vercel project ${projectName}. Add the DNS verification record at your registrar to go live.`
    });
  } catch (error) {
    console.error('assignVercelDomain error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}