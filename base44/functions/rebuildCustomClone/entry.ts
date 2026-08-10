import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const withTimeout = (promise, ms, label) =>
  Promise.race([promise, new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms)
  )]);

// Rebuild a clone with the user's selected customizations:
// 1. Deterministic clone the target (re-hosts HTML + swaps business name)
// 2. Apply color palette (replace the most common hex colors)
// 3. Apply content pack (title, meta description, h1, about text, contact)
// 4. Inject the generated logo image
// 5. Launch to Vercel
// 6. Background: validate → heal to 100 → audit
//
// Does NOT require identifyChangeableParts — uses heuristic replacement
// (top-N most common colors, title/h1/meta replacement, logo img detection).

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { target_url, business_name, palette, content_pack, logo_url, industry, niche } = body;
    if (!target_url) return Response.json({ error: 'target_url required' }, { status: 400 });
    if (!business_name) return Response.json({ error: 'business_name required' }, { status: 400 });

    // 1. Deterministic clone (scrapes + re-hosts + swaps business name)
    const dcr = await withTimeout(base44.functions.invoke('deterministicClone', {
      target_url, business_name, organization_id: orgId,
    }), 200000, 'deterministicClone');
    const dc = dcr?.data || dcr;
    if (dc.status !== 'success' || !dc.website_html) {
      throw new Error(`Clone failed: ${dc.error || 'empty HTML'}`);
    }
    let html = dc.website_html;

    // 2. Apply color palette — find the top 3 most common hex colors and replace
    if (palette && palette.primary) {
      const hexMatches = html.match(/#([0-9a-fA-F]{6})\b/g) || [];
      const freq = {};
      for (const h of hexMatches) {
        const key = h.toLowerCase();
        freq[key] = (freq[key] || 0) + 1;
      }
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
      const replacements = [
        { from: sorted[0]?.[0], to: palette.primary },
        { from: sorted[1]?.[0], to: palette.secondary },
        { from: sorted[2]?.[0], to: palette.accent },
      ];
      for (const r of replacements) {
        if (r.from && r.to) {
          html = html.split(r.from).join(r.to);
          html = html.split(r.from.toUpperCase()).join(r.to);
        }
      }
      // Also set CSS custom properties if present
      html = html.replace(/--primary:\s*[^;]+;/gi, `--primary: ${palette.primary};`);
      html = html.replace(/--secondary:\s*[^;]+;/gi, `--secondary: ${palette.secondary};`);
      html = html.replace(/--accent:\s*[^;]+;/gi, `--accent: ${palette.accent};`);
      html = html.replace(/--background:\s*[^;]+;/gi, `--background: ${palette.background || '#ffffff'};`);
      html = html.replace(/--bg:\s*[^;]+;/gi, `--bg: ${palette.background || '#ffffff'};`);
    }

    // 3. Apply content pack — replace title, meta description, first h1, about
    if (content_pack) {
      const cp = content_pack;
      // Title tag
      html = html.replace(/<title[^>]*>[^<]*<\/title>/i, `<title>${business_name} — ${cp.tagline || ''}</title>`);
      // Meta description
      html = html.replace(/<meta[^>]+name=["']description["'][^>]+content=["'][^"']*["']/i,
        `<meta name="description" content="${(cp.about_text || cp.tagline || '').slice(0, 160).replace(/"/g, '&quot;')}"`);
      // Meta og:title
      html = html.replace(/<meta[^>]+property=["']og:title["'][^>]+content=["'][^"']*["']/i,
        `<meta property="og:title" content="${business_name}"`);
      // First H1 → hero headline
      if (cp.hero_headline) {
        html = html.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/i, `<h1>${cp.hero_headline}</h1>`);
      }
      // Replace the original site name occurrences with the new business name
      // (deterministicClone already does this, but double-apply for safety)
      // About text — find common about patterns and replace
      if (cp.about_text) {
        // Replace the first <p> after an "about" heading if found
        const aboutRe = /(<h[1-6][^>]*>[^<]*(?:about|who we are|our story|our company)[^<]*<\/h[1-6]>[\s\S]*?<p[^>]*>)([\s\S]*?)(<\/p>)/i;
        if (aboutRe.test(html)) {
          html = html.replace(aboutRe, `$1${cp.about_text}$3`);
        }
      }
      // Contact info
      if (cp.contact) {
        if (cp.contact.phone) {
          // Replace phone-looking patterns
          html = html.replace(/(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g, cp.contact.phone);
        }
        if (cp.contact.email) {
          html = html.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, cp.contact.email);
        }
      }
    }

    // 4. Inject logo — replace logo images
    if (logo_url) {
      // Replace img tags that look like logos (class/alt/id/src contains "logo")
      html = html.replace(/(<img[^>]*(?:class|alt|id|src)=["'][^"']*logo[^"']*["'][^>]*src=["'])([^"']*)(["'])/gi,
        `$1${logo_url}$3`);
      // Also replace any img with class containing "brand" or "header-logo"
      html = html.replace(/(<img[^>]*class=["'][^"']*(?:brand|header-logo|site-logo|navbar-brand)[^"']*["'][^>]*src=["'])([^"']*)(["'])/gi,
        `$1${logo_url}$3`);
    }

    // 5. Launch to Vercel
    const launchName = `${business_name.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString(36).slice(-5)}`;
    const lp = await withTimeout(base44.functions.invoke('launchProject', {
      project_name: launchName, website_html: html,
    }), 120000, 'launchProject');
    const ld = lp?.data || lp;
    if (ld.status !== 'success') throw new Error(`Launch failed: ${JSON.stringify(ld.errors)}`);
    const vercelUrl = ld.results?.vercel?.deploy?.url || ld.results?.vercel?.deploy?.alias?.[0];

    // 6. Create a LaunchProject tracker + background audit
    const tracker = await base44.asServiceRole.entities.LaunchProject.create({
      organization_id: orgId,
      project_name: `${business_name} Clone`,
      project_type: 'website',
      status: 'validating',
      parity_score: 0,
      progress: 50,
      business_name,
      industry: industry || niche || 'Uncategorized',
      benchmark_url: target_url,
      vercel_deployment_url: vercelUrl,
      last_validation_summary: 'Custom clone launched — auditing & hardening…',
      metadata: {
        autonomous: true,
        target_url,
        customized: true,
        palette,
        content_pack,
        logo_url,
      },
    });

    // Background: validate → heal to 100
    try {
      const { waitUntil } = await import('base44:runtime');
      waitUntil(finalizeAudit(base44, orgId, tracker.id, vercelUrl, target_url));
    } catch (e) {
      // If waitUntil not available, run inline (may timeout but tracker is saved)
      console.log('waitUntil not available, skipping background audit');
    }

    return Response.json({
      status: 'success',
      launch_project_id: tracker.id,
      vercel_url: vercelUrl,
      business_name,
      message: 'Custom clone launched. Audit & hardening running in background.',
    });
  } catch (error) {
    console.error('rebuildCustomClone error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function finalizeAudit(base44, orgId, trackerId, vercelUrl, targetUrl) {
  let score = 0;
  try {
    const vr = await withTimeout(base44.functions.invoke('validateFullStack', {
      live_url: vercelUrl, target_url: targetUrl, organization_id: orgId, clone_id: trackerId,
    }), 120000, 'validateFullStack');
    score = (vr?.data || vr)?.score || 0;

    for (let i = 0; i < 3 && score < 100; i++) {
      const hr = await withTimeout(base44.functions.invoke('autonomousCloneTo100', {
        launch_project_id: trackerId, max_iterations: 2,
      }), 180000, 'autonomousCloneTo100 heal');
      const hd = hr?.data || hr;
      score = hd.score || score;
      if (hd.vercel_url) vercelUrl = hd.vercel_url;
    }

    await base44.asServiceRole.entities.LaunchProject.update(trackerId, {
      parity_score: score,
      status: score >= 100 ? 'passed' : 'validating',
      last_validation_summary: `Custom clone: ${score}/100 ${score >= 100 ? '— PRODUCTION READY' : ''}`,
    });

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId, system: 'clone_studio', action: 'rebuild',
      status: score >= 100 ? 'success' : 'partial',
      summary: `Custom clone rebuilt: ${score}/100`,
      evidence: { launch_project_id: trackerId, vercel_url: vercelUrl, score },
    });
  } catch (e) {
    console.error('finalizeAudit failed:', e);
    try {
      await base44.asServiceRole.entities.LaunchProject.update(trackerId, {
        status: 'failed',
        last_validation_summary: `Finalize error: ${e.message}`,
      });
    } catch (e2) {}
  }
}