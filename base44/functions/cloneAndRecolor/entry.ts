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
  /* Replace broken WebGL shader canvas with 3D CSS background */
  .shader, [data-shader], canvas[data-renderer="shaders"] {
    display: none !important;
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

    // 4b. Inject canvas directly into the hero section + animation script at end of body
    //     Insert the canvas right after the opening <section id="hero" ...> tag
    if (/<section id="hero"/i.test(html)) {
      html = html.replace(/<section id="hero"([^>]*)>/i,
        '<section id="hero"$1>\n<canvas id="fl-bg-canvas" style="position:absolute;inset:0;width:100%;height:100%;display:block;z-index:10;pointer-events:none;"></canvas>');
      // Make hero bg transparent so canvas is visible
      html = html.replace(/<section id="hero"([^>]*)>/i,
        (match) => match.replace(/bg-\[#EFEFEF\]/i, ''));
    }

    const bodyInject = `
<script>
(function() {
  var canvas = document.getElementById('fl-bg-canvas');
  if (!canvas) { console.log('fl-bg-canvas not found'); return; }
  console.log('fl-bg-canvas found, starting animation');
  var hero = canvas.parentElement;
  hero.style.background = 'transparent';
  var ctx = canvas.getContext('2d');
  var w, h, dpr;
  var mouse = { x: 0.5, y: 0.4, tx: 0.5, ty: 0.4 };
  var t = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = hero.offsetWidth || window.innerWidth;
    h = hero.offsetHeight || window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  function setTarget(x, y) { mouse.tx = x / w; mouse.ty = y / h; }
  document.addEventListener('mousemove', function(e) { setTarget(e.clientX, e.clientY); });
  document.addEventListener('touchmove', function(e) {
    if (e.touches[0]) setTarget(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  // Match the original WebGL shader: extremely subtle, large, soft, flowing
  // gradients over a flat #EFEFEF base. No dot pattern, no hard edges.
  var blobs = [];
  for (var i = 0; i < 5; i++) {
    blobs.push({
      ox: 0.1 + Math.random() * 0.8, oy: 0.1 + Math.random() * 0.8,
      rx: 0.08 + Math.random() * 0.06, ry: 0.08 + Math.random() * 0.06,
      speed: 0.08 + Math.random() * 0.12, phase: Math.random() * Math.PI * 2,
      radius: 320 + Math.random() * 200,
    });
  }

  function draw() {
    t += 0.002;
    mouse.x += (mouse.tx - mouse.x) * 0.03;
    mouse.y += (mouse.ty - mouse.y) * 0.03;

    // Flat base matching original bg-[#EFEFEF]
    ctx.fillStyle = '#EFEFEF';
    ctx.fillRect(0, 0, w, h);

    // Very subtle, large, soft flowing gradients — barely visible, matching the
    // original WebGL shader at 65% opacity (which renders as near-flat grey
    // with the faintest organic variation)
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      var cx = (b.ox + Math.sin(t * b.speed + b.phase) * b.rx + (mouse.x - 0.5) * 0.08) * w;
      var cy = (b.oy + Math.cos(t * b.speed * 0.7 + b.phase) * b.ry + (mouse.y - 0.5) * 0.08) * h;
      var r = b.radius * (1 + Math.sin(t * 0.5 + i) * 0.1);
      var bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      bg.addColorStop(0, 'rgba(20,20,20,0.035)');
      bg.addColorStop(0.5, 'rgba(20,20,20,0.015)');
      bg.addColorStop(1, 'rgba(20,20,20,0)');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }
  draw();
})();
</script>
`;
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, bodyInject + '\n</body>');
    } else if (/<body[^>]*>/i.test(html)) {
      html = html.replace(/<body([^>]*)>/i, '<body$1>\n' + bodyInject);
    } else {
      html = html + bodyInject;
    }

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