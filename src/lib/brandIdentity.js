// Single source of truth for the AUTO LEADS brand identity.
// Import this everywhere brand assets are needed — never hardcode brand values.

export const BRAND = {
  name: 'AUTO LEADS',
  tagline: 'CONSTRUCTION INTELLIGENCE',
  domain: 'autoleads.ai',
  accent: '#FFD700',
  accentDark: '#0B0B0D',
  email: 'hello@autoleads.ai',
  phone: '(555) 010-2025',
  // Dark-master logo (yellow + white on transparent/black) — for dark surfaces
  logoDark: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/9a0697861_autoleads-logo-dark-master.png',
  // Same logo works on light surfaces too (high contrast design)
  logoLight: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/9a0697861_autoleads-logo-dark-master.png',
};

// CSS accent override injected into rebranded clone sites
export function accentCssOverride(accent = BRAND.accent) {
  return `<style id="autoleads-accent-override">:root{--autoleads-accent:${accent};--brand:${accent};--primary:${accent};--primary-color:${accent};--accent:${accent};}a:not([class*="btn"]):not([class*="button"]){color:${accent};}a.btn-primary,button[class*="primary"],.cta,.button-primary,[class*="cta"]:not(a),.btn.btn-primary{background:${accent}!important;border-color:${accent}!important;color:#0B0B0D!important;}[class*="btn"][class*="primary"]{background:${accent}!important;border-color:${accent}!important;}.text-primary,.text-brand,.has-text-color[class*="primary"]{color:${accent}!important;}.bg-primary,.bg-brand,.has-background[class*="primary"]{background:${accent}!important;}</style>`;
}