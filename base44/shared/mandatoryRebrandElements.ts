// CANONICAL MANDATORY REBRAND ELEMENTS
// The legally-must-change checklist for any cloned site rebrand.
// Each element has an id, label, the minimum action required, and the
// generator strategy the autonomous rebrand engine uses to fix it.
export const MANDATORY_REBRAND_ELEMENTS = [
  {
    id: 'business_name',
    label: 'Business Name',
    action: 'Replace with a name cleared for confusingly similar trademarks',
    generator: 'target_brand',
  },
  {
    id: 'domain',
    label: 'Domain',
    action: 'Replace with the new brand domain',
    generator: 'domain_suggest',
  },
  {
    id: 'logo',
    label: 'Logo / Trademark / Branded Icons',
    action: 'Replace',
    generator: 'logo_gen',
  },
  {
    id: 'tagline',
    label: 'Tagline / Distinctive Branding',
    action: 'Replace',
    generator: 'ai_rewrite',
  },
  {
    id: 'written_copy',
    label: 'Written Copy',
    action: 'Replace copied original text with independently written content',
    generator: 'ai_rewrite',
  },
  {
    id: 'photos',
    label: 'Photos / Artwork / Graphics / Video',
    action: 'Replace unless ownership/license is verified',
    generator: 'image_gen',
  },
  {
    id: 'source_code',
    label: 'Exact Proprietary Source Code',
    action: 'Independently reimplement or verify license',
    generator: 'verify',
  },
  {
    id: 'testimonials',
    label: 'Testimonials / Reviews / Case Studies',
    action: 'Replace with your own real ones',
    generator: 'ai_generate',
  },
  {
    id: 'customer_facts',
    label: 'Customer/Company-Specific Facts & Claims',
    action: 'Replace with verified facts for the new business',
    generator: 'ai_rewrite',
  },
  {
    id: 'contact_info',
    label: 'Contact Info / Emails / Addresses / Tracking IDs',
    action: 'Replace',
    generator: 'swap',
  },
  {
    id: 'legal_pages',
    label: 'Privacy / Terms / Cookie Disclosures',
    action: 'Generate for what the new site actually does, then review',
    generator: 'ai_generate',
  },
  {
    id: 'overall_branding',
    label: 'Overall Branding',
    action: 'Transform further if the finished property could reasonably look like it comes from the original company',
    generator: 'accent_restyle',
  },
];

export const DEFAULT_ACCENT = '#FFD700';
export const DEFAULT_BRAND = 'AUTO LEADS';
export const DEFAULT_TAGLINE = 'CONSTRUCTION INTELLIGENCE';
export const DEFAULT_DOMAIN = 'autoleads.ai';
export const DEFAULT_LOGO_URL = 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/9a0697861_autoleads-logo-dark-master.png';