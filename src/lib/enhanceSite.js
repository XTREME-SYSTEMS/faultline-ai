// Enhances generated HTML with PWA support + light/dark mode toggle.
// Injects CSS variables, a theme toggle button, PWA manifest, and meta tags.

function isLightColor(hex) {
  if (!hex || typeof hex !== 'string') return true;
  const c = hex.replace('#', '');
  if (c.length < 6) return true;
  const r = parseInt(c.substr(0, 2), 16);
  const g = parseInt(c.substr(2, 2), 16);
  const b = parseInt(c.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

function shiftColor(hex, amount) {
  if (!hex || typeof hex !== 'string') return hex;
  const c = hex.replace('#', '');
  if (c.length < 6) return hex;
  const r = Math.min(255, Math.max(0, parseInt(c.substr(0, 2), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(c.substr(2, 2), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(c.substr(4, 2), 16) + amount));
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

export function enhanceSite(html, config) {
  if (!html) return html;
  const {
    bg_color, font_color, accent_color, primary_color,
    business_name, logo_url,
  } = config || {};

  const lightBg = bg_color || '#ffffff';
  const lightFg = font_color || primary_color || '#0a0a0a';
  const accent = accent_color || primary_color || '#C89B3C';

  // Derive dark mode colors — invert bg/fg, keep accent
  const darkBg = isLightColor(lightBg) ? '#0a0a0a' : '#f8f7f4';
  const darkFg = isLightColor(lightBg) ? '#f8f7f4' : '#0a0a0a';
  const lightSurface = shiftColor(lightBg, isLightColor(lightBg) ? -5 : 5);
  const darkSurface = shiftColor(darkBg, 5);

  const safeName = (business_name || 'App').replace(/"/g, '&quot;');

  // PWA manifest
  const manifest = {
    name: business_name || 'App',
    short_name: (business_name || 'App').substring(0, 12),
    display: 'standalone',
    background_color: lightBg,
    theme_color: accent,
    start_url: '/',
    icons: logo_url ? [
      { src: logo_url, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: logo_url, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ] : [],
  };
  const manifestUrl = `data:application/manifest+json,${encodeURIComponent(JSON.stringify(manifest))}`;

  const injection = `
<style>
:root {
  --brand-bg: ${lightBg};
  --brand-fg: ${lightFg};
  --brand-accent: ${accent};
  --brand-surface: ${lightSurface};
}
[data-theme="dark"] {
  --brand-bg: ${darkBg};
  --brand-fg: ${darkFg};
  --brand-accent: ${accent};
  --brand-surface: ${darkSurface};
}
body {
  background: var(--brand-bg) !important;
  color: var(--brand-fg) !important;
  transition: background .3s ease, color .3s ease;
}
.theme-toggle-btn {
  position: fixed !important;
  top: 16px !important;
  right: 16px !important;
  z-index: 999999 !important;
  width: 42px !important;
  height: 42px !important;
  border-radius: 50% !important;
  background: var(--brand-accent) !important;
  color: #fff !important;
  border: none !important;
  cursor: pointer !important;
  font-size: 20px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: 0 2px 10px rgba(0,0,0,.2) !important;
  transition: transform .15s !important;
  font-family: inherit !important;
  line-height: 1 !important;
}
.theme-toggle-btn:hover { transform: scale(1.1) !important; }
</style>
<script>
(function(){
  var btn = document.createElement('button');
  btn.className = 'theme-toggle-btn';
  btn.innerHTML = '🌙';
  btn.title = 'Toggle dark / light mode';
  btn.onclick = function(){
    var cur = document.documentElement.getAttribute('data-theme');
    var next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    btn.innerHTML = next === 'dark' ? '☀️' : '🌙';
    try { localStorage.setItem('theme', next); } catch(e){}
  };
  document.body.appendChild(btn);
  try {
    var saved = localStorage.getItem('theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = saved || (prefersDark ? 'dark' : 'light');
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      btn.innerHTML = '☀️';
    }
  } catch(e){}
})();
</script>`;

  const metaTags = `
<meta name="theme-color" content="${accent}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="${safeName}">
<meta name="mobile-web-app-capable" content="yes">
<link rel="manifest" href="${manifestUrl}">
${logo_url ? `<link rel="apple-touch-icon" href="${logo_url}">\n<link rel="icon" href="${logo_url}">` : '<link rel="icon" href="data:," />'}`;

  // Inject meta tags + style/script before </head>
  if (html.includes('</head>')) {
    return html.replace('</head>', `${metaTags}\n${injection}\n</head>`);
  }
  // Fallback: inject after the opening <html ...> tag
  if (html.includes('<html')) {
    const idx = html.indexOf('>', html.indexOf('<html')) + 1;
    return html.substring(0, idx) + metaTags + injection + html.substring(idx);
  }
  return metaTags + injection + html;
}