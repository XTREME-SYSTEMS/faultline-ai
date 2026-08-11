import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Generates a customized website from a WebsiteTemplate.
// Loads the template HTML, applies the user's customizations (accent color,
// fonts, logo, images, copy), and returns ready-to-deploy HTML.
//
// Customizations applied:
//   - Accent color: hue-rotates the entire site to match the new accent
//   - Font pairing: injects Google Fonts + swaps font-family CSS variables
//   - Logo: replaces the site's logo image with the user's generated logo
//   - Hero images: replaces hero/background images with user's generated images
//   - Copy: replaces headlines, taglines, and CTAs with AI-generated copy
//   - Business name: swaps the template's business name for the user's

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { template_id, business_name, industry, accent_color, font_heading, font_body, logo_url, hero_image_url, copy_overrides, domain } = body;

    if (!template_id) return Response.json({ error: 'template_id is required' }, { status: 400 });
    if (!business_name) return Response.json({ error: 'business_name is required' }, { status: 400 });

    // 1. Load the template
    const template = await base44.asServiceRole.entities.WebsiteTemplate.get(template_id);
    if (!template) return Response.json({ error: 'Template not found' }, { status: 404 });

    // 2. Fetch the template HTML
    let html = '';
    if (template.html_file_url) {
      try {
        const r = await fetch(template.html_file_url, { signal: AbortSignal.timeout(15000) });
        if (r.ok) html = await r.text();
      } catch (e) { /* fall through to preview_url */ }
    }
    if (!html && template.preview_url) {
      try {
        const r = await fetch(template.preview_url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(15000),
        });
        if (r.ok) html = await r.text();
      } catch (e) { /* skip */ }
    }
    if (!html || html.length < 500) return Response.json({ error: 'Could not load template HTML' }, { status: 500 });

    // 3. Apply business name swap
    const sourceName = template.source_clone_name || '';
    if (sourceName && business_name) {
      // Extract the brand part from the source clone name (e.g. "Stripe Clone" → "Stripe")
      const brandPart = sourceName.replace(/\s+Clone$/i, '').trim();
      if (brandPart && brandPart.length > 2) {
        const brandRe = new RegExp(brandPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        html = html.replace(/>([^<]+)</g, (match, text) => '>' + text.replace(brandRe, business_name) + '<');
      }
    }

    // 4. Apply accent color via CSS hue-rotate filter
    if (accent_color && template.color_palette?.accent) {
      const originalAccent = template.color_palette.accent;
      const hueShift = hexHueDiff(originalAccent, accent_color);
      if (hueShift !== 0) {
        // Inject a hue-rotate filter on the body + override accent CSS variables
        const hueFilter = `<style>
/* Accent color override — hue-rotated from ${originalAccent} to ${accent_color} */
:root { --accent: ${accent_color}; --accent-hue: ${hueShift}deg; }
body { filter: hue-rotate(${hueShift}deg); }
/* Counter-rotate images so photos keep natural colors */
img, video, picture, figure { filter: hue-rotate(${-hueShift}deg); }
</style>`;
        html = html.includes('</head>')
          ? html.replace('</head>', hueFilter + '\n</head>')
          : hueFilter + html;
      }
    }

    // 5. Apply font pairing
    if (font_heading && font_body) {
      const fontImport = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(font_heading)}:wght@400;500;600;700&family=${encodeURIComponent(font_body)}:wght@400;500;600&display=swap" rel="stylesheet">`;
      const fontOverride = `<style>
/* Font pairing override — ${font_heading} + ${font_body} */
h1, h2, h3, h4, h5, h6, .heading, .title, [class*="heading"], [class*="title"] { font-family: '${font_heading}', serif !important; }
body, p, span, div, a, button, input, textarea, select, li, td, th, [class*="body"], [class*="text"] { font-family: '${font_body}', sans-serif !important; }
</style>`;
      html = html.includes('</head>')
        ? html.replace('</head>', fontImport + '\n' + fontOverride + '\n</head>')
        : fontImport + '\n' + fontOverride + html;
    }

    // 6. Apply logo replacement
    if (logo_url) {
      // Replace logo images — look for common logo patterns (img in header/nav, or class containing "logo")
      html = html.replace(/<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi, (match, before, src, after) => {
        const fullAttr = (before + ' ' + after).toLowerCase();
        if (fullAttr.includes('logo') || fullAttr.includes('brand') || src.includes('logo')) {
          return `<img${before}src="${logo_url}"${after} style="max-height:60px;width:auto;object-fit:contain;">`;
        }
        return match;
      });
    }

    // 7. Apply hero image replacement
    if (hero_image_url) {
      // Replace the first large background image or hero img with the user's image
      const heroReplaced = html.replace(/style=["']([^"']*background(?:-image)?\s*:\s*[^;"']*url\(["']?)([^"')]+)(["']?\)[^"']*?)["']/i, (match, prefix, url, suffix) => {
        return `style="${prefix}${hero_image_url}${suffix}`;
      });
      if (heroReplaced !== html) {
        html = heroReplaced;
      } else {
        // Fallback: replace the first <img> in the first <section> or <header>
        html = html.replace(/<(?:section|header)[^>]*>[\s\S]*?<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/i, (match, before, src, after) => {
          return match.replace(src, hero_image_url);
        });
      }
    }

    // 8. Apply copy overrides (headlines, taglines, CTAs)
    if (copy_overrides && typeof copy_overrides === 'object') {
      const { headline, subheadline, cta_text, tagline } = copy_overrides;
      if (headline) {
        // Replace the first <h1> content
        html = html.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/i, `<h1>${headline}</h1>`);
      }
      if (subheadline) {
        // Replace the first <p> after the <h1>
        html = html.replace(/(<\/h1>[\s\S]*?<p[^>]*>)([\s\S]*?)(<\/p>)/i, `$1${subheadline}$3`);
      }
      if (cta_text) {
        // Replace first button/link CTA text
        html = html.replace(/(<a[^>]*class=["'][^"']*(?:btn|button|cta)[^"']*["'][^>]*>)([\s\S]*?)(<\/a>)/i, `$1${cta_text}$3`);
        html = html.replace(/(<button[^>]*>)([\s\S]*?)(<\/button>)/i, `$1${cta_text}$3`);
      }
      if (tagline) {
        // Replace meta description and og:description
        html = html.replace(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i, `<meta name="description" content="${tagline}">`);
      }
    }

    // 9. Update meta tags with business name + domain
    if (business_name) {
      html = html.replace(/<title>([^<]*)<\/title>/i, `<title>${business_name}${domain ? ' — ' + domain : ''}</title>`);
      html = html.replace(/<meta[^>]+property=["']og:site_name["'][^>]*>/i, `<meta property="og:site_name" content="${business_name}">`);
      html = html.replace(/<meta[^>]+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${business_name}">`);
    }

    // 10. Increment template usage count
    try {
      await base44.asServiceRole.entities.WebsiteTemplate.update(template_id, {
        usage_count: (template.usage_count || 0) + 1,
      });
    } catch (e) { /* ignore */ }

    // 11. Upload the customized HTML
    let fileUrl = null;
    try {
      const fileObj = new File([html], `generated-${business_name.replace(/\s+/g, '-').toLowerCase()}.html`, { type: 'text/html' });
      const upload = await base44.integrations.Core.UploadFile({ file: fileObj });
      fileUrl = upload?.file_url || null;
    } catch (e) { /* skip */ }

    return Response.json({
      status: 'success',
      website_html: html,
      file_url: fileUrl,
      template_name: template.name,
      business_name,
      customizations: { accent_color, font_heading, font_body, logo_url, hero_image_url, copy_overrides },
    });
  } catch (error) {
    console.error('generateFromTemplate error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function hexToHsl(hex) {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return [0, 0, 50];
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function hexHueDiff(hex1, hex2) {
  const [h1] = hexToHsl(hex1);
  const [h2] = hexToHsl(hex2);
  return h2 - h1;
}