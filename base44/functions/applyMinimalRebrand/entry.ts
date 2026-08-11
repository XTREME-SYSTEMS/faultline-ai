import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { slugify, createVercelProject, disableVercelSso, deployToVercel } from '../../shared/launchInfra.ts';

// MINIMAL-CHANGE GENERATOR
// Starts from the ORIGINAL clone HTML (faithful to the source), applies ONLY
// the mandatory swaps detected by detectMandatoryChanges (exact find→replace),
// swaps the logo to the Lead Gen Near You pinwheel, regenerates only flagged
// copyrighted images, then deploys the result to Vercel. Nothing else changes.
const LGNY_LOGO_SVG = `<svg width="40" height="48" viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg"><path d="M20 0C9 0 0 9 0 20c0 14 20 28 20 28s20-14 20-28C40 9 31 0 20 0z" fill="#0B1120"/><g transform="translate(20 20)"><path d="M0 0 L0 -10 A10 10 0 0 1 10 0 Z" fill="#E7C86E"/><path d="M0 0 L10 0 A10 10 0 0 1 0 10 Z" fill="#059669"/><path d="M0 0 L0 10 A10 10 0 0 1 -10 0 Z" fill="#2563EB"/><path d="M0 0 L-10 0 A10 10 0 0 1 0 -10 Z" fill="#DC2626"/><circle cx="0" cy="0" r="2.2" fill="#fff"/></g></svg>`;
const LGNY_LOGO_URI = 'data:image/svg+xml,' + encodeURIComponent(LGNY_LOGO_SVG);

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rebrand_project_id } = await req.json();
    if (!rebrand_project_id) return Response.json({ error: 'rebrand_project_id required' }, { status: 400 });

    const project = await base44.entities.RebrandProject.get(rebrand_project_id);
    await base44.entities.RebrandProject.update(rebrand_project_id, { status: 'generating_assets' });

    // 1. Fetch the ORIGINAL clone HTML — the source of truth. We keep it faithful.
    const r = await fetch(project.source_url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MinimalRebrand/1.0)' } });
    let html = await r.text();

    // 2. Apply mandatory text swaps — global find→replace, longest-first so
    //    "GoHighLevel" replaces before "HighLevel" (avoids double-substitution).
    const swaps = (project.mandatory_swaps || [])
      .filter(s => s.find)
      .sort((a, b) => b.find.length - a.find.length);
    let applied = 0;
    const missed = [];
    for (const s of swaps) {
      if (s.find && html.includes(s.find)) {
        html = html.split(s.find).join(s.replace || '');
        applied++;
      } else if (s.find) {
        missed.push(s.find.slice(0, 60));
      }
    }

    // 3. Image swaps — logo uses the LGNY pinwheel data URI; others are AI-generated.
    const imgSwaps = project.images_to_replace || [];
    const genImages = [];
    for (const img of imgSwaps) {
      let replacementUrl;
      if (img.is_logo) {
        replacementUrl = LGNY_LOGO_URI;
      } else {
        const r2 = await base44.integrations.Core.GenerateImage({
          prompt: img.replacement_prompt || `Professional original marketing image for a ${project.target_brand || 'Lead Gen Near You'} website, modern, high quality, no logos or watermarks.`
        });
        replacementUrl = r2.url;
        genImages.push(replacementUrl);
      }
      if (img.url && html.includes(img.url)) {
        html = html.split(img.url).join(replacementUrl);
      }
    }

    // 4. Deploy to Vercel — pure token calls via shared infra (no user-session dependency).
    //    HTML is too large for an entity field, so we deploy it straight to Vercel
    //    and store only the live deployment URL.
    const token = secrets.get('VERCEL_TOKEN');
    if (!token) throw new Error('VERCEL_TOKEN secret not set');
    const teamId = secrets.get('VERCEL_TEAM_ID') || null;
    const baseSlug = slugify(project.source_clone_name || 'lead-gen-near-you') || 'lead-gen-near-you';
    const slug = `${baseSlug}-lgny`;
    const vProject = await createVercelProject(token, teamId, slug);
    try { await disableVercelSso(token, teamId, vProject.id); } catch (e) { /* non-fatal */ }
    const deploy = await deployToVercel(token, teamId, slug, vProject.id, html);

    await base44.entities.RebrandProject.update(rebrand_project_id, {
      status: 'completed',
      approval_state: 'approved',
      generated_logo_url: LGNY_LOGO_URI,
      generated_images: genImages,
      provisioned: {
        vercel_project_url: `https://${slug}.vercel.app`,
        vercel_deployment_url: deploy.url,
        domain_name: slug,
      },
    });

    const updated = await base44.entities.RebrandProject.get(rebrand_project_id);
    return Response.json({
      project: updated,
      applied_swaps: applied,
      missed_swaps: missed,
      image_swaps: imgSwaps.length,
      deploy_url: deploy.url,
    });
  } catch (error) {
    console.error('applyMinimalRebrand error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}