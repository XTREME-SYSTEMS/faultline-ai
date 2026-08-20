// Component Family Ledger — classifies source/clone components into semantic
// families, categorizes them as required vs. non-required, and computes
// required-component parity (not raw count parity).
//
// A "family" is a group of equivalent components (e.g., all asset cards,
// all header nav links, all filter buttons). The parity denominator is the
// number of REQUIRED families, not the number of individual elements.
// Repeated families (asset cards) use quantity coverage AFTER semantic
// equivalence is proven.

export interface LedgerComponent {
  t: string;        // tag
  r: string;        // role
  n: string;        // accessible name
  x: string;        // text signature
  h: string;        // href / action
  c: string;        // class hints
  b: [number, number, number, number]; // x, y, w, h
  st: string;       // semantic type
  ai: string;       // action intent
  rg: string;       // region
  v: boolean;       // visible
  e: boolean;       // enabled
}

export type ComponentCategory =
  | 'REQUIRED_FUNCTIONAL'
  | 'REQUIRED_STRUCTURAL'
  | 'REQUIRED_REPEATED_CONTENT'
  | 'DUPLICATE_EQUIVALENT'
  | 'HIDDEN_OR_INACTIVE'
  | 'TRACKING_OR_ANALYTICS'
  | 'SOURCE_INTERNAL'
  | 'SOURCE_ERROR_ARTIFACT'
  | 'NOT_APPLICABLE_WITH_PROOF';

export interface ComponentFamily {
  family_id: string;
  family_name: string;
  semantic_type: string;
  region: string;
  action_intent: string;
  category: ComponentCategory;
  source_count: number;
  clone_count: number;
  components: LedgerComponent[];
  criticality: 'critical' | 'important' | 'optional';
  user_visible_purpose: string;
}

export interface FamilyLedger {
  url: string;
  title: string;
  families: ComponentFamily[];
  total_components: number;
  required_family_count: number;
  type_counts: Record<string, number>;
}

// Browser-side extraction script — compact keys to avoid CDP size limits.
// Captures tag, role, accessible name, text, href, class hints, bounding box,
// semantic type, action intent, region, visibility, enabled state.
export function buildFamilyLedgerExtractionScript(): string {
  return `(function(){
  var comps = [];
  var selectors = [
    'nav','header','footer','main','aside',
    '[role="navigation"]','[role="search"]','[role="button"]','[role="menu"]',
    '[role="menuitem"]','[role="tab"]','[role="dialog"]','[role="combobox"]',
    '[role="listbox"]','[role="option"]',
    'button','a[href]','input','select','textarea','form',
    'details','summary',
    '[class*="dropdown"]','[class*="filter"]','[class*="sort"]',
    '[class*="pagination"]','[class*="card"]','[class*="pricing"]',
    '[class*="cta"]','[class*="modal"]','[class*="tab"]','[class*="accordion"]',
    '[class*="hero"]','[class*="banner"]','[class*="testimonial"]',
    'h1','h2','h3','img','video','svg'
  ];
  var seen = new Set();
  // Pass 0b: Capture structural landmarks FIRST (footer, nav, pagination, filter
  // inputs) so they aren't crowded out by hundreds of card elements in later passes.
  var structuralLinkNodes = document.querySelectorAll('footer, footer a[href], nav, nav a[href], .pagination button, .pagination a, .page-btn, input[type="text"], input[type="search"], input[placeholder*="filter" i], .filter-btn, .sort-btn');
  for (var si = 0; si < structuralLinkNodes.length && comps.length < 100; si++) {
    var sel = structuralLinkNodes[si];
    if (seen.has(sel)) continue;
    seen.add(sel);
    var stag = sel.tagName.toLowerCase();
    var srect = sel.getBoundingClientRect();
    if (srect.width === 0 && srect.height === 0) continue;
    var srole = sel.getAttribute('role') || '';
    var stext = (sel.innerText || sel.getAttribute('aria-label') || sel.getAttribute('title') || '').trim().slice(0, 60);
    var shref = (sel.getAttribute('href') || '').slice(0, 120);
    var scls = (sel.className || '').toString().toLowerCase().slice(0, 100);
    var sdisabled = sel.hasAttribute('disabled') || sel.getAttribute('aria-disabled') === 'true';

    var sst = 'unknown';
    if (stag === 'footer') sst = 'footer';
    else if (stag === 'nav' || srole === 'navigation') sst = 'navigation';
    else if (stag === 'a' && shref) {
      sst = 'link';
      if (scls.includes('card') || sel.closest('[class*="card"]')) sst = 'card';
      else if (scls.includes('cta') || stext.toLowerCase().includes('subscribe') || stext.toLowerCase().includes('download') || stext.toLowerCase().includes('sign up') || stext.toLowerCase().includes('buy') || stext.toLowerCase().includes('get started')) sst = 'cta';
    }
    else if (stag === 'button') {
      sst = 'button';
      var sbt = stext.toLowerCase();
      if (scls.includes('filter') || sbt.includes('filter') || scls.includes('filter-btn')) sst = 'filter';
      else if (scls.includes('sort') || sbt.includes('sort')) sst = 'sort';
      else if (scls.includes('pagination') || scls.includes('page-btn') || /^[0-9]+$/.test(sbt) || sbt.includes('prev') || sbt.includes('next')) sst = 'pagination';
      else if (scls.includes('cta') || sbt.includes('subscribe') || sbt.includes('download')) sst = 'cta';
    }
    else if (stag === 'input') {
      var sit = (sel.type || '').toLowerCase();
      if (sit === 'search' || (sel.getAttribute('placeholder') || '').toLowerCase().includes('search')) sst = 'search';
      else sst = 'input';
    }

    // Region
    var srg = 'main';
    if (sel.closest('header') || srect.y < 120) srg = 'header';
    else if (sel.closest('footer') || srect.y > document.body.scrollHeight - 200) srg = 'footer';
    else if (sel.closest('nav')) srg = 'nav';
    else if (sel.closest('aside') || (srect.x < 280 && srect.width < 300)) srg = 'sidebar';

    // Action intent
    var sai = 'none';
    if (stag === 'a' && shref) sai = 'navigate';
    else if (sst === 'filter') sai = 'filter';
    else if (sst === 'sort') sai = 'sort';
    else if (sst === 'pagination') sai = 'navigate';
    else if (sst === 'cta') sai = 'navigate';
    else if (stag === 'button') sai = 'click';
    else if (stag === 'input') sai = 'input';

    comps.push({
      t: stag, r: srole, n: (sel.getAttribute('aria-label') || stext).slice(0, 60),
      x: stext, h: shref, c: scls,
      b: [Math.round(srect.x), Math.round(srect.y), Math.round(srect.width), Math.round(srect.height)],
      st: sst, ai: sai, rg: srg, v: true, e: !sdisabled
    });
  }
  // Pass 1: Capture ALL img/video/svg elements first (up to 200) so card images
  // aren't crowded out by hundreds of card <a> elements.
  var mediaNodes = document.querySelectorAll('img,video,svg');
  for (var mi = 0; mi < mediaNodes.length && comps.length < 200; mi++) {
    var mel = mediaNodes[mi];
    if (seen.has(mel)) continue;
    seen.add(mel);
    var mrect = mel.getBoundingClientRect();
    if (mrect.width === 0 && mrect.height === 0 && mel.parentElement) {
      var mprect = mel.parentElement.getBoundingClientRect();
      if (mprect.width > 0 && mprect.height > 0) { mrect = mprect; }
      else continue;
    } else if (mrect.width === 0 && mrect.height === 0) continue;
    var mtag = mel.tagName.toLowerCase();
    comps.push({
      t: mtag, r: '', n: '', x: '', h: '', c: (mel.className||'').toString().toLowerCase().slice(0,80),
      b: [Math.round(mrect.x), Math.round(mrect.y), Math.round(mrect.width), Math.round(mrect.height)],
      st: 'media', ai: 'none',
      rg: mrect.y < 120 ? 'header' : (mrect.y > document.body.scrollHeight - 200 ? 'footer' : 'main'),
      v: true, e: true
    });
  }
  // Pass 2: Capture all other semantic elements (up to 800 total)
  var nodes = document.querySelectorAll(selectors.join(','));
  for (var i = 0; i < nodes.length && comps.length < 800; i++) {
    var el = nodes[i];
    if (seen.has(el)) continue;
    seen.add(el);
    var tag = el.tagName.toLowerCase();
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    var role = el.getAttribute('role') || '';
    var text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().slice(0, 60);
    var href = (el.getAttribute('href') || '').slice(0, 120);
    var cls = (el.className || '').toString().toLowerCase().slice(0, 100);
    var ariaState = el.getAttribute('aria-expanded') || el.getAttribute('aria-selected') || el.getAttribute('aria-checked') || '';
    var disabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';

    // Semantic type
    var st = 'unknown';
    if (tag === 'nav' || role === 'navigation') st = 'navigation';
    else if (tag === 'header') st = 'header';
    else if (tag === 'footer') st = 'footer';
    else if (tag === 'main') st = 'main_content';
    else if (tag === 'aside') st = 'sidebar';
    else if (role === 'search' || (tag === 'input' && (el.type === 'search' || (el.getAttribute('placeholder') || '').toLowerCase().includes('search')))) st = 'search';
    else if (role === 'button' || tag === 'button') {
      st = 'button';
      var bt = text.toLowerCase();
      if (cls.includes('filter') || bt.includes('filter')) st = 'filter';
      else if (cls.includes('sort') || bt.includes('sort')) st = 'sort';
      else if (cls.includes('pagination') || /^[0-9]+$/.test(bt)) st = 'pagination';
      else if (cls.includes('cta') || bt.includes('subscribe') || bt.includes('download') || bt.includes('get started') || bt.includes('sign up') || bt.includes('buy')) st = 'cta';
      else if (cls.includes('menu') || cls.includes('dropdown')) st = 'menu';
    }
    else if (tag === 'a' && href) {
      st = 'link';
      if (cls.includes('card') || el.closest('[class*="card"]')) st = 'card';
      else if (cls.includes('cta') || text.toLowerCase().includes('subscribe') || text.toLowerCase().includes('download')) st = 'cta';
      else if (cls.includes('logo')) st = 'logo';
    }
    else if (role === 'menu' || role === 'menuitem') st = 'menu';
    else if (role === 'tab') st = 'tab';
    else if (role === 'dialog') st = 'modal';
    else if (tag === 'details' || tag === 'summary') st = 'accordion';
    else if (tag === 'form') st = 'form';
    else if (tag === 'select' || role === 'combobox' || role === 'listbox') st = 'select';
    else if (tag === 'input' || tag === 'textarea') {
      st = 'input';
      var it = (el.type || '').toLowerCase();
      if (it === 'checkbox' || it === 'radio') st = 'filter';
    }
    else if (tag === 'img' || tag === 'video' || tag === 'svg') st = 'media';
    else if (tag === 'h1' || tag === 'h2' || tag === 'h3') st = 'heading';
    else {
      if (cls.includes('card')) st = 'card';
      else if (cls.includes('pricing')) st = 'pricing';
      else if (cls.includes('hero') || cls.includes('banner')) st = 'hero';
      else if (cls.includes('filter')) st = 'filter';
      else if (cls.includes('sort')) st = 'sort';
      else if (cls.includes('pagination')) st = 'pagination';
      else if (cls.includes('dropdown')) st = 'menu';
      else if (cls.includes('modal')) st = 'modal';
      else if (cls.includes('tab')) st = 'tab';
      else if (cls.includes('accordion')) st = 'accordion';
      else if (cls.includes('carousel')) st = 'carousel';
      else if (cls.includes('testimonial')) st = 'testimonial';
      else if (cls.includes('cta')) st = 'cta';
      else if (tag === 'div' || tag === 'section' || tag === 'article' || tag === 'span' || tag === 'li' || tag === 'ul' || tag === 'ol') st = 'container';
    }

    // Action intent
    var ai = 'none';
    if (tag === 'a' && href) ai = 'navigate';
    else if (tag === 'form') ai = 'submit';
    else if (tag === 'input' || tag === 'textarea') ai = 'input';
    else if (tag === 'select') ai = 'select';
    else if (st === 'filter') ai = 'filter';
    else if (st === 'sort') ai = 'sort';
    else if (st === 'pagination') ai = 'navigate';
    else if (st === 'cta') ai = 'navigate';
    else if (st === 'menu' || st === 'accordion' || st === 'tab') ai = 'toggle';
    else if (tag === 'button' || role === 'button') ai = 'click';
    else if (tag === 'details' || tag === 'summary') ai = 'toggle';

    // Region
    var rg = 'main';
    if (el.closest('header') || rect.y < 120) rg = 'header';
    else if (el.closest('footer') || rect.y > document.body.scrollHeight - 200) rg = 'footer';
    else if (el.closest('nav')) rg = 'nav';
    else if (el.closest('aside') || (rect.x < 280 && rect.width < 300)) rg = 'sidebar';

    comps.push({
      t: tag, r: role, n: (el.getAttribute('aria-label') || text).slice(0, 60),
      x: text, h: href, c: cls,
      b: [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)],
      st: st, ai: ai, rg: rg, v: true, e: !disabled
    });
  }

  var tc = {};
  for (var j = 0; j < comps.length; j++) { tc[comps[j].st] = (tc[comps[j].st] || 0) + 1; }

  return JSON.stringify({
    url: window.location.href, title: document.title,
    components: comps, type_counts: tc, total_components: comps.length
  });
})()`;
}

// Classify components into named families.
// Groups by semantic_type + region + action_intent, then assigns a family name.
export function classifyIntoFamilies(components: LedgerComponent[]): ComponentFamily[] {
  const groups = new Map<string, LedgerComponent[]>();

  for (const comp of components) {
    // Skip hidden/inactive from family grouping (they get their own family)
    if (!comp.v || !comp.e) {
      const key = `hidden_${comp.st}_${comp.rg}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(comp);
      continue;
    }

    // Determine family name from semantic_type + region + action_intent
    let familyName = '';
    const st = comp.st;
    const rg = comp.rg;
    const ai = comp.ai;

    if (st === 'header') familyName = 'HEADER_LANDMARK';
    else if (st === 'footer') familyName = 'FOOTER_LANDMARK';
    else if (st === 'navigation') familyName = rg === 'header' ? 'HEADER_NAV' : 'NAV_BLOCK';
    else if (st === 'search') familyName = 'SEARCH_FORM';
    else if (st === 'form') familyName = rg === 'header' ? 'SEARCH_FORM' : 'FILTER_FORM';
    else if (st === 'filter') familyName = rg === 'sidebar' || rg === 'main' ? 'FILTER_CONTROL' : 'FILTER_CONTROL';
    else if (st === 'sort') familyName = 'SORT_CONTROL';
    else if (st === 'pagination') familyName = 'PAGINATION';
    else if (st === 'card') familyName = 'ASSET_CARD_LINK'; // merge with link-based cards — same purpose
    else if (st === 'media') familyName = comp.c.includes('card') || rg === 'main' ? 'ASSET_MEDIA' : 'DECORATIVE_MEDIA';
    else if (st === 'cta') familyName = rg === 'header' ? 'HEADER_CTA' : rg === 'footer' ? 'FOOTER_CTA' : 'PRIMARY_CTA';
    else if (st === 'link') {
      if (rg === 'header') familyName = 'HEADER_NAV_LINK';
      else if (rg === 'footer') familyName = 'FOOTER_LINK';
      else if (rg === 'nav') familyName = 'NAV_LINK';
      else if (comp.c.includes('card') || comp.b[2] > 200) familyName = 'ASSET_CARD_LINK';
      else familyName = 'CONTENT_LINK';
    }
    else if (st === 'button') {
      if (rg === 'header') familyName = 'HEADER_BUTTON';
      else if (rg === 'footer') familyName = 'FOOTER_BUTTON';
      else familyName = 'ACTION_BUTTON';
    }
    else if (st === 'menu') familyName = 'MENU_CONTROL';
    else if (st === 'tab') familyName = 'TAB_CONTROL';
    else if (st === 'modal') familyName = 'MODAL';
    else if (st === 'accordion') familyName = 'ACCORDION';
    else if (st === 'select') familyName = 'SELECT_CONTROL';
    else if (st === 'input') familyName = rg === 'header' ? 'SEARCH_INPUT' : 'FILTER_INPUT';
    else if (st === 'heading') familyName = rg === 'header' ? 'HEADER_HEADING' : 'CONTENT_HEADING';
    else if (st === 'logo') familyName = 'LOGO';
    else if (st === 'pricing') familyName = 'PRICING_CARD';
    else if (st === 'hero') familyName = 'HERO_SECTION';
    else if (st === 'testimonial') familyName = 'TESTIMONIAL';
    else if (st === 'container') familyName = 'CONTAINER';
    else familyName = 'OTHER';

    const key = `${familyName}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(comp);
  }

  const families: ComponentFamily[] = [];
  let fid = 0;
  for (const [name, comps] of groups) {
    const first = comps[0];
    families.push({
      family_id: `F${String(++fid).padStart(3, '0')}`,
      family_name: name,
      semantic_type: first.st,
      region: first.rg,
      action_intent: first.ai,
      category: categorizeFamily(name, first),
      source_count: 0,  // filled by caller
      clone_count: 0,   // filled by caller
      components: comps,
      criticality: getCriticality(name),
      user_visible_purpose: getFamilyPurpose(name),
    });
  }

  return families;
}

function categorizeFamily(familyName: string, first: LedgerComponent): ComponentCategory {
  // Structural landmarks
  if (familyName === 'HEADER_LANDMARK' || familyName === 'FOOTER_LANDMARK' ||
      familyName === 'HEADER_NAV' || familyName === 'NAV_BLOCK')
    return 'REQUIRED_STRUCTURAL';

  // Core functional workflows
  if (familyName === 'SEARCH_FORM' || familyName === 'FILTER_FORM' ||
      familyName === 'FILTER_CONTROL' || familyName === 'SORT_CONTROL' ||
      familyName === 'PAGINATION' || familyName === 'SELECT_CONTROL' ||
      familyName === 'SEARCH_INPUT' || familyName === 'FILTER_INPUT')
    return 'REQUIRED_FUNCTIONAL';

  // Repeated content
  if (familyName === 'ASSET_CARD' || familyName === 'ASSET_CARD_LINK' ||
      familyName === 'ASSET_MEDIA')
    return 'REQUIRED_REPEATED_CONTENT';

  // CTAs
  if (familyName === 'PRIMARY_CTA' || familyName === 'HEADER_CTA' ||
      familyName === 'FOOTER_CTA')
    return 'REQUIRED_FUNCTIONAL';

  // Navigation links
  if (familyName === 'HEADER_NAV_LINK' || familyName === 'NAV_LINK')
    return 'REQUIRED_FUNCTIONAL';

  // Footer links — required structural but lower criticality
  if (familyName === 'FOOTER_LINK') return 'REQUIRED_STRUCTURAL';

  // Content headings
  if (familyName === 'HEADER_HEADING' || familyName === 'CONTENT_HEADING')
    return 'REQUIRED_STRUCTURAL';

  if (familyName === 'LOGO') return 'REQUIRED_STRUCTURAL';

  // Source-internal (account, auth, cart)
  if (first.h && (first.h.includes('/sign-in') || first.h.includes('/login') ||
      first.h.includes('/account') || first.h.includes('/cart') ||
      first.h.includes('/dashboard') || first.h.includes('/library')))
    return 'SOURCE_INTERNAL';

  // Hidden/inactive
  if (familyName.startsWith('hidden_')) return 'HIDDEN_OR_INACTIVE';

  // Everything else — optional / not applicable unless proven required
  return 'NOT_APPLICABLE_WITH_PROOF';
}

function getCriticality(familyName: string): 'critical' | 'important' | 'optional' {
  if (['SEARCH_FORM', 'FILTER_CONTROL', 'SORT_CONTROL', 'PAGINATION',
       'ASSET_CARD', 'ASSET_CARD_LINK', 'PRIMARY_CTA', 'HEADER_NAV_LINK',
       'HEADER_LANDMARK', 'FOOTER_LANDMARK'].includes(familyName))
    return 'critical';
  if (['HEADER_NAV', 'FOOTER_LINK', 'HEADER_CTA', 'FOOTER_CTA',
       'ASSET_MEDIA', 'CONTENT_HEADING', 'HEADER_HEADING', 'LOGO',
       'SELECT_CONTROL', 'SEARCH_INPUT', 'FILTER_INPUT', 'FILTER_FORM'].includes(familyName))
    return 'important';
  return 'optional';
}

function getFamilyPurpose(familyName: string): string {
  const purposes: Record<string, string> = {
    HEADER_LANDMARK: 'Top-level page header with logo and primary navigation',
    FOOTER_LANDMARK: 'Bottom footer with legal links and secondary navigation',
    HEADER_NAV: 'Primary navigation block in header',
    NAV_BLOCK: 'Secondary navigation block',
    SEARCH_FORM: 'Search input and submit for finding assets',
    FILTER_FORM: 'Form containing filter controls',
    FILTER_CONTROL: 'Filter buttons/checkboxes for narrowing asset results',
    SORT_CONTROL: 'Sort dropdown/buttons for ordering results',
    PAGINATION: 'Page navigation controls',
    ASSET_CARD: 'Asset preview cards in the content grid',
    ASSET_CARD_LINK: 'Links wrapping asset cards',
    ASSET_MEDIA: 'Preview images/video inside asset cards',
    PRIMARY_CTA: 'Primary call-to-action buttons (subscribe, download)',
    HEADER_CTA: 'Call-to-action in header area',
    FOOTER_CTA: 'Call-to-action in footer area',
    HEADER_NAV_LINK: 'Navigation links in header',
    NAV_LINK: 'Navigation links in nav block',
    FOOTER_LINK: 'Links in footer',
    CONTENT_LINK: 'Content links in main body',
    HEADER_BUTTON: 'Buttons in header area',
    FOOTER_BUTTON: 'Buttons in footer area',
    ACTION_BUTTON: 'Action buttons in main content',
    MENU_CONTROL: 'Menu/dropdown toggle controls',
    TAB_CONTROL: 'Tab switching controls',
    MODAL: 'Modal dialog',
    ACCORDION: 'Expandable accordion sections',
    SELECT_CONTROL: 'Select dropdowns',
    SEARCH_INPUT: 'Search input field',
    FILTER_INPUT: 'Filter input field',
    HEADER_HEADING: 'Heading in header',
    CONTENT_HEADING: 'Heading in content',
    LOGO: 'Brand logo',
    PRICING_CARD: 'Pricing plan cards',
    HERO_SECTION: 'Hero banner section',
    TESTIMONIAL: 'Testimonial blocks',
    CONTAINER: 'Generic container',
    DECORATIVE_MEDIA: 'Decorative media elements',
    OTHER: 'Unclassified element',
  };
  return purposes[familyName] || 'Unknown purpose';
}

// Parse the extraction result into a FamilyLedger
export function parseFamilyLedger(jsonStr: string): FamilyLedger {
  const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
  const components: LedgerComponent[] = data.components || [];
  const families = classifyIntoFamilies(components);
  const requiredFamilyCount = families.filter(f =>
    f.category === 'REQUIRED_FUNCTIONAL' ||
    f.category === 'REQUIRED_STRUCTURAL' ||
    f.category === 'REQUIRED_REPEATED_CONTENT'
  ).length;

  return {
    url: data.url || '',
    title: data.title || '',
    families,
    total_components: components.length,
    required_family_count: requiredFamilyCount,
    type_counts: data.type_counts || {},
  };
}

// Compute required-component parity between source and clone ledgers.
// Only REQUIRED families contribute to the denominator.
// Repeated families use quantity coverage after semantic equivalence.
export interface RequiredParityResult {
  required_component_parity: number;  // 0-100
  total_required_families: number;
  matched_families: string[];
  partial_families: string[];
  missing_families: string[];
  extra_clone_families: string[];
  family_details: Array<{
    family_name: string;
    category: ComponentCategory;
    criticality: string;
    source_count: number;
    clone_count: number;
    quantity_coverage: number;
    status: 'matched' | 'partial' | 'missing' | 'extra' | 'not_required';
  }>;
  exclusions: Array<{ family_name: string; category: ComponentCategory; reason: string }>;
}

export function computeRequiredComponentParity(
  sourceLedger: FamilyLedger,
  cloneLedger: FamilyLedger
): RequiredParityResult {
  // Source 404/error detection: if the source page is a 404 or error page,
  // it is NOT a valid reference for comparison. The clone has a working page
  // where the source has none — do not penalize the clone.
  const sourceTitleLower = (sourceLedger.title || '').toLowerCase();
  const isSourceInvalid = sourceTitleLower.includes('not found') ||
    sourceTitleLower.includes('404') ||
    sourceTitleLower.includes('error') ||
    sourceTitleLower.includes('page not found');

  if (isSourceInvalid) {
    return {
      required_component_parity: 100,
      total_required_families: 0,
      matched_families: [],
      partial_families: [],
      missing_families: [],
      extra_clone_families: [],
      family_details: [],
      exclusions: [{
        family_name: 'SOURCE_PAGE',
        category: 'SOURCE_ERROR_ARTIFACT' as ComponentCategory,
        reason: `Source page is invalid (${sourceLedger.title}) — not a valid reference for comparison`,
      }],
    };
  }

  const sourceFamilies = new Map(sourceLedger.families.map(f => [f.family_name, f]));
  const cloneFamilies = new Map(cloneLedger.families.map(f => [f.family_name, f]));

  const matched: string[] = [];
  const partial: string[] = [];
  const missing: string[] = [];
  const extra: string[] = [];
  const details: any[] = [];
  const exclusions: any[] = [];

  // Process source families
  for (const [name, srcFam] of sourceFamilies) {
    const isRequired = srcFam.category === 'REQUIRED_FUNCTIONAL' ||
                       srcFam.category === 'REQUIRED_STRUCTURAL' ||
                       srcFam.category === 'REQUIRED_REPEATED_CONTENT';

    if (!isRequired) {
      exclusions.push({
        family_name: name,
        category: srcFam.category,
        reason: `Excluded: ${srcFam.category} — ${srcFam.user_visible_purpose}`,
      });
      details.push({
        family_name: name,
        category: srcFam.category,
        criticality: srcFam.criticality,
        source_count: srcFam.components.length,
        clone_count: cloneFamilies.get(name)?.components.length || 0,
        quantity_coverage: 0,
        status: 'not_required',
      });
      continue;
    }

    const cloneFam = cloneFamilies.get(name);
    const srcCount = srcFam.components.length;
    const clCount = cloneFam?.components.length || 0;

    if (!cloneFam || clCount === 0) {
      missing.push(name);
      details.push({
        family_name: name, category: srcFam.category, criticality: srcFam.criticality,
        source_count: srcCount, clone_count: 0, quantity_coverage: 0, status: 'missing',
      });
    } else if (srcFam.category === 'REQUIRED_REPEATED_CONTENT') {
      // Quantity coverage for repeated families
      const ratio = srcCount > 0 ? clCount / srcCount : 1;
      const coverage = Math.round(ratio * 100);
      if (ratio >= 0.8) {
        matched.push(name);
        details.push({ family_name: name, category: srcFam.category, criticality: srcFam.criticality, source_count: srcCount, clone_count: clCount, quantity_coverage: coverage, status: 'matched' });
      } else if (ratio >= 0.3) {
        partial.push(name);
        details.push({ family_name: name, category: srcFam.category, criticality: srcFam.criticality, source_count: srcCount, clone_count: clCount, quantity_coverage: coverage, status: 'partial' });
      } else {
        partial.push(name);
        details.push({ family_name: name, category: srcFam.category, criticality: srcFam.criticality, source_count: srcCount, clone_count: clCount, quantity_coverage: coverage, status: 'partial' });
      }
    } else {
      // Non-repeated required family — matched if present
      matched.push(name);
      details.push({ family_name: name, category: srcFam.category, criticality: srcFam.criticality, source_count: srcCount, clone_count: clCount, quantity_coverage: 100, status: 'matched' });
    }
  }

  // Extra clone families (not in source)
  for (const [name, clFam] of cloneFamilies) {
    if (!sourceFamilies.has(name)) {
      extra.push(name);
      details.push({
        family_name: name, category: clFam.category, criticality: clFam.criticality,
        source_count: 0, clone_count: clFam.components.length, quantity_coverage: 0, status: 'extra',
      });
    }
  }

  // Score = matched / total_required (partial counts as 0.5)
  const totalRequired = sourceLedger.families.filter(f =>
    f.category === 'REQUIRED_FUNCTIONAL' ||
    f.category === 'REQUIRED_STRUCTURAL' ||
    f.category === 'REQUIRED_REPEATED_CONTENT'
  ).length;

  const weighted = matched.length + partial.length * 0.5;
  const parity = totalRequired > 0 ? Math.round((weighted / totalRequired) * 100) : 100;

  return {
    required_component_parity: parity,
    total_required_families: totalRequired,
    matched_families: matched,
    partial_families: partial,
    missing_families: missing,
    extra_clone_families: extra,
    family_details: details,
    exclusions,
  };
}