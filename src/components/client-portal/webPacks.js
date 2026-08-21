// Pre-configured Web Packs — attractive, ready-to-use website packages
// Each pack maps to a real epoxy template and includes branding, colors, and style.
// When a user selects a pack, the brand color, tagline, and style are pre-filled.

export const WEB_PACKS = [
  {
    id: 'garage-pro-premium',
    name: 'Garage Pro Premium',
    style: 'Industrial Bold',
    description: 'Bold, high-impact design for garage floor specialists. Red accents on dark backgrounds convey strength and durability.',
    colors: { primary: '#DC2626', secondary: '#1a1a1a', accent: '#F5F5F5' },
    logoStyle: 'Bold sans-serif wordmark with shield icon',
    tagline: 'Garage Floors That Turn Heads',
    features: ['Hero video banner', 'Before/after gallery', 'Instant quote form', 'Google reviews badge'],
    targetNiche: 'Garage Floor Epoxy',
    templateMatch: ['garage', 'supreme', 'apex'],
    badge: 'POPULAR',
  },
  {
    id: 'metallic-epoxy-elite',
    name: 'Metallic Epoxy Elite',
    style: 'Luxury Premium',
    description: 'Gold and charcoal palette for high-end metallic epoxy contractors. Elegant typography and premium feel throughout.',
    colors: { primary: '#C89B3C', secondary: '#171717', accent: '#FAF8F2' },
    logoStyle: 'Serif logotype with metallic gold accent',
    tagline: 'Premium Epoxy Floors That Last a Lifetime',
    features: ['Cinematic hero slider', 'Metallic finish showcase', 'Luxury project portfolio', 'VIP consultation CTA'],
    targetNiche: 'Metallic Epoxy',
    templateMatch: ['metallic', 'elite', 'top epoxy', 'pearl'],
    badge: 'LUXURY',
  },
  {
    id: 'concrete-shield-pro',
    name: 'Concrete Shield Pro',
    style: 'Professional Clean',
    description: 'Blue and white professional palette for commercial concrete coating contractors. Clean, trustworthy, corporate-ready.',
    colors: { primary: '#1a56DB', secondary: '#F8FAFC', accent: '#0EA5E9' },
    logoStyle: 'Geometric shield logo with bold sans-serif',
    tagline: 'Protect Your Concrete. Elevate Your Space.',
    features: ['Commercial project showcase', 'Service area map', 'Certification badges', 'Free estimate calculator'],
    targetNiche: 'Concrete Coatings',
    templateMatch: ['concrete', 'shield', 'coating', 'tri-state'],
    badge: null,
  },
  {
    id: 'industrial-floor-systems',
    name: 'Industrial Floor Systems',
    style: 'Rugged Industrial',
    description: 'Orange and dark charcoal palette for industrial and warehouse flooring contractors. Built tough, built to last.',
    colors: { primary: '#EA580C', secondary: '#1c1917', accent: '#78716C' },
    logoStyle: 'Heavy industrial wordmark with gear icon',
    tagline: 'Built for the Toughest Environments',
    features: ['Industrial project gallery', 'Safety compliance section', 'Material spec sheets', '24/7 service CTA'],
    targetNiche: 'Industrial Epoxy',
    templateMatch: ['industrial', 'floor', 'system', 'tx epoxy'],
    badge: null,
  },
  {
    id: 'epoxy-life',
    name: 'Epoxy Life',
    style: 'Eco Modern',
    description: 'Fresh green and white palette for residential epoxy contractors. Approachable, clean, family-friendly design.',
    colors: { primary: '#059669', secondary: '#F0FDF4', accent: '#365314' },
    logoStyle: 'Friendly rounded logo with leaf accent',
    tagline: 'Beautiful Floors for Beautiful Homes',
    features: ['Residential project gallery', 'Color visualizer tool', 'Financing options banner', '5-star reviews carousel'],
    targetNiche: 'Residential Epoxy',
    templateMatch: ['epoxy', 'life', 'best epoxy', 'martin'],
    badge: 'NEW',
  },
  {
    id: 'floor-armor',
    name: 'Floor Armor',
    style: 'Corporate Strong',
    description: 'Navy and silver palette for commercial flooring contractors. Corporate, reliable, and built for scale.',
    colors: { primary: '#1e3a5f', secondary: '#C9CDD3', accent: '#ffffff' },
    logoStyle: 'Bold armor-shield logo with steel accent',
    tagline: 'Armor for Your Floors. Confidence for Your Business.',
    features: ['Corporate capabilities deck', 'Client logos strip', 'Case study highlights', 'Schedule consultation CTA'],
    targetNiche: 'Commercial Flooring',
    templateMatch: ['armor', 'floor', 'best', 'coating'],
    badge: null,
  },
  {
    id: 'surface-pro-coatings',
    name: 'Surface Pro Coatings',
    style: 'Modern Minimal',
    description: 'Teal and dark palette for surface coating professionals. Modern, minimal, and tech-forward design.',
    colors: { primary: '#0EA5E9', secondary: '#0c4a6e', accent: '#e0f2fe' },
    logoStyle: 'Minimal geometric logo with surface texture',
    tagline: 'Next-Generation Surface Coatings',
    features: ['Interactive service menu', 'Before/after slider', 'Online booking widget', 'Live chat integration'],
    targetNiche: 'Surface Coatings',
    templateMatch: ['surface', 'pro', 'coating', 'top'],
    badge: null,
  },
  {
    id: 'elite-epoxy-systems',
    name: 'Elite Epoxy Systems',
    style: 'Premium Dark',
    description: 'Purple and black palette for premium epoxy contractors who want to stand out. Dark, dramatic, unforgettable.',
    colors: { primary: '#7C3AED', secondary: '#0a0a0a', accent: '#E9D5FF' },
    logoStyle: 'Premium dark logo with purple gradient accent',
    tagline: 'Where Excellence Meets Every Floor',
    features: ['Dark mode hero with animation', 'Premium project showcase', 'Award badges section', 'Priority booking CTA'],
    targetNiche: 'Premium Epoxy',
    templateMatch: ['elite', 'epoxy', 'supreme', 'premium'],
    badge: 'PREMIUM',
  },
];

// Match a web pack to a template by keywords in the template name
export function matchPackToTemplate(pack, templates) {
  const matchTerms = pack.templateMatch;
  return templates.find(t => {
    const name = (t.business_name || t.project_name || '').toLowerCase();
    return matchTerms.some(term => name.includes(term));
  });
}

// Assign templates to packs, filling gaps with round-robin
export function assignTemplatesToPacks(packs, templates) {
  const used = new Set();
  const result = packs.map(pack => {
    const match = matchPackToTemplate(pack, templates);
    if (match && !used.has(match.id)) {
      used.add(match.id);
      return { ...pack, template: match };
    }
    return { ...pack, template: null };
  });
  // Fill packs without a match using unused templates (round-robin)
  const unused = templates.filter(t => !used.has(t.id));
  let idx = 0;
  for (const pack of result) {
    if (!pack.template && unused[idx]) {
      pack.template = unused[idx++];
    }
  }
  return result;
}