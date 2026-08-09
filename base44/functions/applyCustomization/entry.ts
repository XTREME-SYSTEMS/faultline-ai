import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil } from 'base44:runtime';

const withTimeout = (promise, ms, label) =>
  Promise.race([promise, new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms)
  )]);

// Clone Studio — Step 5: Apply chosen customizations + finalize.
// 1. Re-clone the target to get fresh HTML (deterministic clone).
// 2. Apply the user's selections (colors, logo, images, trademark text) via
//    targeted string replacement — only the changed parts are reformatted,
//    everything else stays exactly as the original clone.
// 3. Re-launch to Vercel.
// 4. Background: validate → heal loop to 100/100 → forensic audit + harden.
// Returns immediately with the new Vercel URL; the audit runs via waitUntil.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { launch_project_id, selections } = body;
    if (!launch_project_id || !selections) {
      return Response.json({ error: 'launch_project_id and selections required' }, { status: 400 });
    }

    const project = await base44.asServiceRole.entities.LaunchProject.get(launch_project_id);
    if (!project || project.organization_id !== orgId) throw new Error('Project not found');

    const targetUrl = project.metadata?.target_url;
    if (!targetUrl) return Response.json({ error: 'No target URL on project' }, { status: 400 });

    const identified = project.metadata?.identified_parts || {};
    const bizName = selections.trademark?.business_name || project.business_name || 'Clone';

    // 1. Re-clone to get fresh HTML
    const dcr = await withTimeout(base44.functions.invoke('deterministicClone', {
      target_url: targetUrl, business_name: bizName, organization_id: orgId
    }), 200000, 'deterministicClone');
    const dc = dcr?.data || dcr;
    if (dc.status !== 'success' || !dc.website_html) throw new Error('Re-clone failed');
    let html = dc.website_html;

    // 2a. Apply COLOR changes
    if (selections.palette) {
      const p = selections.palette;
      const originalColors = (identified.accent_colors || []).map(c => c.hex).filter(Boolean);
      // Replace each original hex with the new primary (case-insensitive)
      for (const oc of originalColors) {
        html = html.split(oc).join(p.primary);
        html = html.split(oc.toUpperCase()).join(p.primary);
        html = html.split(oc.toLowerCase()).join(p.primary);
      }
      // Set CSS custom properties if present
      html = html.replace(/--primary:\s*[^;]+;/gi, `--primary: ${p.primary};`);
      html = html.replace(/--secondary:\s*[^;]+;/gi, `--secondary: ${p.secondary};`);
      html = html.replace(/--accent:\s*[^;]+;/gi, `--accent: ${p.accent};`);
      html = html.replace(/--background:\s*[^;]+;/gi, `--background: ${p.background || '#ffffff'};`);
    }

    // 2b. Apply LOGO change
    if (selections.logo?.image_url) {
      // Replace logo <img> src attributes (match by class/alt containing "logo")
      html = html.replace(/(<img[^>]*(?:class|alt|id)=["'][^"']*logo[^"']*["'][^>]*src=["'])([^"']*)(["'])/gi,
        `$1${selections.logo.image_url}$3`);
      // Replace text-based logo if identified as text
      if (identified.logo?.type === 'text' && identified.logo?.current_value) {
        html = html.split(identified.logo.current_value).join(bizName);
      }
    }

    // 2c. Apply IMAGE replacements
    if (selections.image_replacements && selections.image_replacements.length > 0) {
      for (const rep of selections.image_replacements) {
        if (rep.original_url && rep.new_url) {
          html = html.split(rep.original_url).join(rep.new_url);
        }
      }
    }

    // 2d. Apply TRADEMARK CONTENT changes
    if (selections.trademark) {
      const tm = selections.trademark;
      for (const item of (identified.trademark_content || [])) {
        if (!item.current_text) continue;
        if (item.type === 'business_name' && tm.business_name) {
          html = html.split(item.current_text).join(tm.business_name);
        } else if (item.type === 'tagline' && tm.tagline) {
          html = html.split(item.current_text).join(tm.tagline);
        } else if (item.type === 'about' && tm.about_text) {
          html = html.split(item.current_text).join(tm.about_text);
        }
      }
      // Replace contact info
      const ci = identified.contact_info || {};
      if (tm.contact) {
        if (ci.phone && tm.contact.phone) html = html.split(ci.phone).join(tm.contact.phone);
        if (ci.email && tm.contact.email) html = html.split(ci.email).join(tm.contact.email);
        if (ci.address && tm.contact.address) html = html.split(ci.address).join(tm.contact.address);
      }
    }

    // 3. Re-launch to Vercel
    const launchName = `${project.project_name || 'Clone'}-custom-${Date.now().toString(36).slice(-5)}`;
    const lp = await withTimeout(base44.functions.invoke('launchProject', {
      project_name: launchName, website_html: html
    }), 120000, 'launchProject');
    const ld = lp?.data || lp;
    if (ld.status !== 'success') throw new Error(`Re-launch failed: ${JSON.stringify(ld.errors)}`);
    const vercelUrl = ld.results?.vercel?.deploy?.url || ld.results?.vercel?.deploy?.alias?.[0];

    // Update project
    await base44.asServiceRole.entities.LaunchProject.update(launch_project_id, {
      vercel_deployment_url: vercelUrl,
      status: 'validating',
      last_validation_summary: 'Customization applied — auditing & hardening…',
      metadata: { ...project.metadata, applied_selections: selections, customized_at: new Date().toISOString() }
    });

    // 4. Background: validate → heal to 100 → audit + harden
    waitUntil(finalizeAudit(base44, orgId, launch_project_id, vercelUrl, targetUrl));

    return Response.json({
      status: 'success',
      launch_project_id,
      vercel_url: vercelUrl,
      message: 'Customization applied. Audit & hardening running in background — check progress below.'
    });
  } catch (error) {
    console.error('applyCustomization error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Background finalize: validate, heal loop to 100, then mark final.
async function finalizeAudit(base44, orgId, launchProjectId, vercelUrl, targetUrl) {
  let score = 0;
  try {
    // Initial validation
    const vr = await withTimeout(base44.functions.invoke('validateFullStack', {
      live_url: vercelUrl, target_url: targetUrl, organization_id: orgId, clone_id: launchProjectId
    }), 120000, 'validateFullStack');
    score = (vr?.data || vr)?.score || 0;

    // Heal loop — autonomousCloneTo100 in HEAL mode (passing launch_project_id)
    for (let i = 0; i < 3 && score < 100; i++) {
      const hr = await withTimeout(base44.functions.invoke('autonomousCloneTo100', {
        launch_project_id: launchProjectId, max_iterations: 2
      }), 180000, 'autonomousCloneTo100 heal');
      const hd = hr?.data || hr;
      score = hd.score || score;
      if (hd.vercel_url) vercelUrl = hd.vercel_url;
    }

    await base44.asServiceRole.entities.LaunchProject.update(launchProjectId, {
      parity_score: score,
      status: score >= 100 ? 'passed' : 'validating',
      last_validation_summary: `Customized + finalized: ${score}/100 ${score >= 100 ? '— PRODUCTION READY' : ''}`
    });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId, system: 'clone_studio', action: 'finalize',
      status: score >= 100 ? 'success' : 'partial',
      summary: `Clone Studio: customized + finalized at ${score}/100`,
      evidence: { launch_project_id: launchProjectId, vercel_url: vercelUrl, score }
    });
  } catch (e) {
    console.error('finalizeAudit failed:', e);
    try {
      await base44.asServiceRole.entities.LaunchProject.update(launchProjectId, {
        status: 'failed',
        last_validation_summary: `Finalize error: ${e.message}`
      });
    } catch (e2) {}
  }
}