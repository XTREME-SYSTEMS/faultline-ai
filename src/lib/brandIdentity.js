// Single source of truth for the FaultLine AI brand identity.
// Import this everywhere brand assets are needed — never hardcode brand values.

export const BRAND = {
  name: 'FaultLine AI',
  tagline: 'Expose What\'s Broken. Build What Works.',
  domain: 'faultline.ai',
  accent: '#C89B3C',
  accentDark: '#0B0B0B',
  email: 'hello@faultline.ai',
  phone: '(555) 010-2025',
  // Logo for DARK surfaces (white text + gold F) — sidebar, dark headers, dark footers
  logoDark: '/assets/faultline/logos/svg/logo-horizontal-light-transparent.svg',
  // Logo for LIGHT surfaces (dark text + gold F) — white pages, light headers
  logoLight: '/assets/faultline/logos/svg/logo-horizontal-dark-transparent.svg',
  // Compact monogram (gold F) — favicons, app icons, narrow spaces
  monogram: '/assets/faultline/monogram/svg/monogram-gold-black-transparent.svg',
};

// CSS accent override injected into rebranded clone sites
export function accentCssOverride(accent = BRAND.accent) {
  return `<style id="faultline-accent-override">:root{--faultline-accent:${accent};--brand:${accent};--primary:${accent};--primary-color:${accent};--accent:${accent};}a:not([class*="btn"]):not([class*="button"]){color:${accent};}a.btn-primary,button[class*="primary"],.cta,.button-primary,[class*="cta"]:not(a),.btn.btn-primary{background:${accent}!important;border-color:${accent}!important;color:#0B0B0B!important;}[class*="btn"][class*="primary"]{background:${accent}!important;border-color:${accent}!important;}.text-primary,.text-brand,.has-text-color[class*="primary"]{color:${accent}!important;}.bg-primary,.bg-brand,.has-background[class*="primary"]{background:${accent}!important;}</style>`;
}