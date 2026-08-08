import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { deployToVercel, createVercelProject, disableVercelSso, slugify } from '../../shared/launchInfra.ts';

// Rebrands a deployed clone site: swaps logo, accent colors, hero videos, and
// site name, then deploys the modified HTML as a new Vercel project.
// Input: { source_url, brand_name, logo_url, video_urls: [url1, url2], accent: {primary, light, dark} }
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const sourceUrl = body.source_url;
    const brandName = body.brand_name || 'Xtreme AI Systems';
    const logoUrl = body.logo_url;
    const videoUrls = body.video_urls || [];
    const accent = body.accent || { primary: '#FFD60A', light: '#E7C86E', dark: '#C89B3C' };

    if (!sourceUrl) return Response.json({ error: 'source_url is required' }, { status: 400 });
    if (!logoUrl) return Response.json({ error: 'logo_url is required' }, { status: 400 });

    const vercelToken = Deno.env.get('VERCEL_TOKEN');
    const teamId = Deno.env.get('VERCEL_TEAM_ID');
    if (!vercelToken) return Response.json({ error: 'VERCEL_TOKEN not configured' }, { status: 500 });

    // 1. Fetch the live clone HTML
    const fetchRes = await fetch(sourceUrl, { headers: { 'User-Agent': 'FaultLine-Rebrand/1.0' } });
    if (!fetchRes.ok) return Response.json({ error: `Failed to fetch source: ${fetchRes.status}` }, { status: 500 });
    let html = await fetchRes.text();
    console.log(`Fetched ${html.length} chars from ${sourceUrl}`);

    // 2. Inject CSS color variable overrides — redefines Hostinger's purple
    // primary palette to gold. Using !important ensures inline styles and
    // component-level CSS using these tokens all flip to gold.
    const cssOverride = `<style id="xas-rebrand">
:root, .theme-base, .theme-hWebsites, .mode-light, .mode-dark {
  --h-color-primary-50: #FFFDF0 !important;
  --h-color-primary-100: #FFF9CC !important;
  --h-color-primary-200: #FFF399 !important;
  --h-color-primary-300: #FFE866 !important;
  --h-color-primary-400: ${accent.primary} !important;
  --h-color-primary-500: ${accent.primary} !important;
  --h-color-primary-600: ${accent.dark} !important;
  --h-color-primary-700: #8A641C !important;
  --h-color-primary-800: #6B4E1A !important;
  --h-color-primary-900: #4A3600 !important;
  --h-color-accent-400: ${accent.light} !important;
  --h-color-accent-500: ${accent.primary} !important;
  --h-color-accent-600: ${accent.dark} !important;
  --h-color-brand-400: ${accent.primary} !important;
  --h-color-brand-500: ${accent.primary} !important;
  --h-color-brand-600: ${accent.dark} !important;
}
/* Force gold on gradient SVGs that use hardcoded purple stops */
linearGradient stop[stop-color="#673DE6"], stop[stop-color="#6B4BFF"] { stop-color: ${accent.primary} !important; }
linearGradient stop[stop-color="#8578FA"], stop[stop-color="#7B5CFF"] { stop-color: ${accent.light} !important; }
</style>`;

    // 3. Replace hardcoded purple hex values in inline styles and SVG attributes
    const hexReplacements = [
      [/#673DE6/gi, accent.primary],
      [/#8578FA/gi, accent.light],
      [/#6B4BFF/gi, accent.primary],
      [/#5B3DD6/gi, accent.dark],
      [/#7B5CFF/gi, accent.light],
      [/#7C5BFF/gi, accent.light],
      [/stop-color="#673DE6"/gi, `stop-color="${accent.primary}"`],
      [/stop-color="#8578FA"/gi, `stop-color="${accent.light}"`],
      [/stop-color="#6B4BFF"/gi, `stop-color="${accent.primary}"`],
    ];
    for (const [pattern, replacement] of hexReplacements) {
      html = html.replace(pattern, replacement);
    }

    // 4. Replace brand name text — "Hostinger" → brand name
    html = html.replace(/\bHostinger\b/g, brandName);

    // 5. Inject the CSS override before </head>
    html = html.replace('</head>', `${cssOverride}\n</head>`);

    // 6. Inject a script before </body> that:
    //   - Replaces the header logo (SVG or img) with the new logo image
    //   - Replaces hero video sources with the new video URLs
    const rebrandScript = `<script id="xas-rebrand-script">
(function() {
  var LOGO = ${JSON.stringify(logoUrl)};
  var VIDEOS = ${JSON.stringify(videoUrls)};
  var BRAND = ${JSON.stringify(brandName)};
  
  // Replace logo — target header logo containers (Hostinger uses .h-header__logo,
  // a[href*="hostinger"] in header, or any svg/img with "logo" in class/alt)
  function replaceLogo() {
    // Try common logo selectors
    var logoSelectors = [
      '.h-header__logo', '.header__logo', '[class*="logo"]', 
      'header a[href*="hostinger"] img', 'header a[href*="/"] img:first-child',
      '.h-logo', '[data-qa*="logo"]'
    ];
    logoSelectors.forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(el) {
        if (el.tagName === 'IMG') {
          el.src = LOGO; el.style.maxHeight = '40px'; el.style.width = 'auto';
        } else if (el.tagName === 'SVG') {
          var img = document.createElement('img');
          img.src = LOGO; img.style.maxHeight = '40px'; img.style.width = 'auto';
          img.alt = BRAND;
          el.replaceWith(img);
        } else {
          el.querySelectorAll('img, svg').forEach(function(child) {
            if (child.tagName === 'IMG') { child.src = LOGO; child.style.maxHeight = '40px'; }
            else if (child.tagName === 'SVG') {
              var img2 = document.createElement('img');
              img2.src = LOGO; img2.style.maxHeight = '40px'; img2.style.width = 'auto';
              img2.alt = BRAND;
              child.replaceWith(img2);
            }
          });
        }
      });
    });
  }
  
  // Replace hero videos
  function replaceVideos() {
    var videos = document.querySelectorAll('video');
    videos.forEach(function(v, i) {
      var url = VIDEOS[i % VIDEOS.length];
      if (!url) return;
      v.querySelectorAll('source').forEach(function(s) { s.src = url; });
      // Also set src attribute directly if no source elements
      if (!v.querySelector('source')) v.src = url;
      v.load && v.load();
    });
  }
  
  // Run immediately and again after a delay (Nuxt hydration may re-render)
  replaceLogo(); replaceVideos();
  setTimeout(replaceLogo, 500); setTimeout(replaceVideos, 500);
  setTimeout(replaceLogo, 2000); setTimeout(replaceVideos, 2000);
})();
</script>`;
    html = html.replace('</body>', `${rebrandScript}\n</body>`);

    // 7. Update <title> and meta
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${brandName} — AI-Powered Website Builder & Hosting</title>`);
    html = html.replace(/<meta\s+name="description"\s+content="[^"]*"/, `<meta name="description" content="${brandName} — Build and launch your website with AI. Fast, reliable, and powerful."`);

    console.log(`Rebranded HTML: ${html.length} chars, brand="${brandName}"`);

    // 8. Deploy to Vercel as a new project
    const projectSlug = slugify(brandName) + '-' + Date.now().toString(36).slice(-5);
    const project = await createVercelProject(vercelToken, teamId, projectSlug);
    // Disable SSO so the deployed site is publicly accessible
    try { await disableVercelSso(vercelToken, teamId, project.id); } catch (e) { console.log('SSO disable skipped:', e.message); }
    const deploy = await deployToVercel(vercelToken, teamId, projectSlug, project.id, html);
    console.log(`Deployed to Vercel: ${deploy.url}`);

    return Response.json({
      status: 'success',
      brand_name: brandName,
      vercel_url: deploy.url,
      project_name: projectSlug,
      logo_url: logoUrl,
      video_urls: videoUrls,
      accent: accent,
      html_length: html.length
    });
  } catch (error) {
    console.error('rebrandClone error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}