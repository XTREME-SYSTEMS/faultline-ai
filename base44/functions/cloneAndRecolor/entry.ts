import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { scrapeWithStealth } from '../../shared/stealthBrowser.ts';
import { slugify, createVercelProject, disableVercelSso, deployToVercel } from '../../shared/launchInfra.ts';

// Clones a site, replaces its accent color, and deploys to Vercel.
// Uses Browserbase to get fully rendered HTML (handles JS-heavy SPAs).

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { target_url, accent_from, accent_to, project_name } = body;
    if (!target_url) return Response.json({ error: 'target_url required' }, { status: 400 });

    // Default: Axion orange → metallic black
    const fromColor = (accent_from || '#F26522').toLowerCase();
    const toColor = accent_to || '#1a1a1a';
    const toHover = '#0d0d0d';
    const toLight = '#2a2a2a';

    console.log(`Cloning ${target_url} with accent ${fromColor} → ${toColor}`);

    // 1. Fetch rendered HTML via Browserbase stealth session (executes JS, renders SPA)
    let html = '';
    let renderMethod = 'stealth';
    let stealthError = null;
    try {
      console.log('Starting stealth scrape session...');
      const result = await scrapeWithStealth(target_url, {
        deepRender: true,
        waitAfterLoad: 5000,
        solveCaptchas: false,
        proxies: false,
        timeout: 45000,
        advancedStealth: false,
      });
      if (result.ok && result.html && result.html.length > 2000) {
        html = result.html;
        console.log(`Stealth scrape returned ${html.length} chars`);
      } else {
        stealthError = `ok=${result.ok}, len=${result.html?.length}, error=${result.error}`;
        console.log(`Stealth scrape insufficient: ${stealthError}`);
      }
    } catch (e) {
      stealthError = `${e.message}`;
      console.log(`Stealth scrape failed: ${e.message}`);
    }

    // Fallback to basic fetch
    if (html.length < 2000) {
      renderMethod = 'basic_fetch';
      console.log('Falling back to basic fetch');
      const r = await fetch(target_url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CloneAndRecolor/1.0)' },
        signal: AbortSignal.timeout(20000)
      });
      html = await r.text();
      console.log(`Basic fetch returned ${html.length} chars`);
    }

    if (html.length < 500) {
      return Response.json({ error: 'Could not fetch sufficient HTML content from target site' }, { status: 500 });
    }

    // 2. Replace accent color and its variants
    const fromHover = '#E05A1A';
    const fromLight = '#E8704E';
    
    html = html.split(fromColor).join(toColor);
    html = html.split(fromColor.toUpperCase()).join(toColor);
    html = html.split(fromHover.toLowerCase()).join(toHover);
    html = html.split(fromHover.toUpperCase()).join(toHover);
    html = html.split(fromHover).join(toHover);
    html = html.split(fromLight.toLowerCase()).join(toLight);
    html = html.split(fromLight.toUpperCase()).join(toLight);
    html = html.split(fromLight).join(toLight);

    // Replace in rgb() format (242, 101, 34 = #F26522)
    html = html.split('242, 101, 34').join('26, 26, 26');
    html = html.split('242,101,34').join('26,26,26');
    html = html.split('rgb(242, 101, 34)').join(`rgb(26, 26, 26)`);
    html = html.split('rgb(242,101,34)').join(`rgb(26, 26, 26)`);

    // 3. Strip Base44/app JS bundles — they won't work on a different domain
    html = html.replace(/<script[^>]*src="[^"]*(?:base44|_app|\/assets\/|\/static\/)[^"]*"[^>]*><\/script>/gi, '');
    html = html.replace(/<script[^>]*type="module"[^>]*src="[^"]*"[^>]*><\/script>/gi, '');
    // Remove inline module scripts that reference base44
    html = html.replace(/<script[^>]*type="module"[^>]*>[\s\S]*?<\/script>/gi, '');

    // 4. Add Tailwind CDN (site uses utility classes everywhere) + 3D background + fixes
    const headInject = `
<script src="https://cdn.tailwindcss.com"></script>
<style>
  /* ===== 3D Touch-Sensitive Background (canvas replaces WebGL shader) ===== */
  .fl-3d-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }

  /* ===== Layout & visibility fixes ===== */
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; min-height: 100vh; }
  /* Ensure all sections are visible (JS animation libs may hide them) */
  section, [data-section], [data-hero], [data-hero-extra] {
    opacity: 1 !important;
    visibility: visible !important;
  }
  [data-line] { opacity: 1 !important; transform: none !important; }
  [data-marquee-star] { display: inline-flex !important; }
  /* Hide the dead WebGL canvas (JS stripped), but keep [data-shader] div —
     it carries the captured shader PNG as a CSS background-image from the
     stealth deep-render, preserving the original shader's exact look */
  canvas[data-renderer="shaders"] {
    display: none !important;
  }
  /* Ensure the captured shader image shows through */
  [data-shader] .shader {
    background-size: cover !important;
    background-position: center !important;
  }
  /* Put #root and all content above the 3D background */
  #root { position: relative; z-index: 1; }
</style>
`;

    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, headInject + '\n</head>');
    } else if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, m => m + headInject);
    } else {
      html = headInject + html;
    }

    // 4b. The stealth deep-render captured the original WebGL shader as a PNG
    //     and set it as a CSS background-image on the [data-shader] .shader div.
    //     We keep that captured image (no canvas injection needed) so the hero
    //     background matches the original exactly.

    // 5. Deploy to Vercel
    const token = secrets.get('VERCEL_TOKEN');
    if (!token) throw new Error('VERCEL_TOKEN secret not set');
    const teamId = secrets.get('VERCEL_TEAM_ID') || null;

    const baseSlug = slugify(project_name || 'axion-studio-metallic') || 'axion-studio-metallic';
    const slug = baseSlug;
    console.log(`Creating Vercel project: ${slug}`);
    const vProject = await createVercelProject(token, teamId, slug);
    try { await disableVercelSso(token, teamId, vProject.id); } catch (e) { /* non-fatal */ }
    
    console.log('Deploying to Vercel...');
    const deploy = await deployToVercel(token, teamId, slug, vProject.id, html);

    return Response.json({
      status: 'success',
      original_url: target_url,
      clone_url: deploy.url,
      vercel_project: slug,
      accent_changed: `${fromColor} → ${toColor} (metallic black)`,
      html_size: html.length,
      rendered: renderMethod,
      stealth_error: stealthError
    });
  } catch (error) {
    console.error('cloneAndRecolor error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}