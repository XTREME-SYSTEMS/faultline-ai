import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { deployToVercel, createVercelProject, disableVercelSso, slugify } from '../../shared/launchInfra.ts';
import { buildXtremeHtml } from '../../shared/xtremeSiteBuilder.ts';

// Builds and deploys the complete Xtreme AI Systems platform — a self-contained
// website with epoxy floor gallery, AI tools, web packs, app packs, an embedded
// website generator preview, and Stripe-linked pricing. Deployed as static HTML
// to Vercel.
//
// Input: { app_url: 'https://your-app.base44.app' }
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const appUrl = (body.app_url || '').replace(/\/$/, '');

    const vercelToken = Deno.env.get('VERCEL_TOKEN');
    const teamId = Deno.env.get('VERCEL_TEAM_ID');
    if (!vercelToken) return Response.json({ error: 'VERCEL_TOKEN not configured' }, { status: 500 });

    // 1. Fetch product catalog (bypass RLS to show all active products publicly)
    const [tools, webPacks, appPacks, designPacks] = await Promise.all([
      base44.asServiceRole.entities.ToolProduct.filter({ status: 'Ready' }, '-created_date', 12).catch(() => []),
      base44.asServiceRole.entities.UniversalCatalog.filter({ item_type: 'web_pack', status: 'active' }, '-created_date', 12).catch(() => []),
      base44.asServiceRole.entities.UniversalCatalog.filter({ item_type: 'app_pack', status: 'active' }, '-created_date', 12).catch(() => []),
      base44.asServiceRole.entities.DesignPack.filter({ pack_type: 'web_pack', status: 'extracted' }, '-created_date', 6).catch(() => [])
    ]);

    console.log(`Catalog: ${tools.length} tools, ${webPacks.length} webPacks, ${appPacks.length} appPacks, ${designPacks.length} designPacks`);

    // 2. Build the complete HTML
    const html = buildXtremeHtml(appUrl, { tools, webPacks, appPacks, designPacks });
    console.log(`Built Xtreme platform HTML: ${html.length} chars, appUrl=${appUrl}`);

    // 3. Deploy to Vercel
    const projectSlug = 'xtreme-ai-platform-' + Date.now().toString(36).slice(-5);
    const project = await createVercelProject(vercelToken, teamId, projectSlug);
    try { await disableVercelSso(vercelToken, teamId, project.id); } catch (e) { console.log('SSO disable skipped:', e.message); }
    const deploy = await deployToVercel(vercelToken, teamId, projectSlug, project.id, html);
    console.log(`Deployed to Vercel: ${deploy.url}`);

    return Response.json({
      status: 'success',
      vercel_url: deploy.url,
      project_name: projectSlug,
      app_url: appUrl,
      html_length: html.length,
      product_counts: { tools: tools.length, webPacks: webPacks.length, appPacks: appPacks.length, designPacks: designPacks.length }
    });
  } catch (error) {
    console.error('buildXtremePlatform error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}