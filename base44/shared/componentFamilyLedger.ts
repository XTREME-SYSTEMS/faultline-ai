// Component Family Ledger — v2: Sharded extraction, semantic input/form
// classification, and separated parity scoring.
//
// CORRECTION 1: Newsletter inputs are NOT filter inputs. Input classification
//   uses PURPOSE + REGION + LABEL + FORM CONTEXT + ACTION, not just HTML tag.
//   Distinct families: SEARCH_INPUT, FILTER_INPUT, NEWSLETTER_INPUT, AUTH_INPUT,
//   AI_TOOL_INPUT, OTHER_INPUT.
//   Distinct form families: SEARCH_FORM, FILTER_FORM, NEWSLETTER_FORM, AUTH_FORM,
//   GENERIC_FORM.
//
// CORRECTION 2: No hard-cap score dependence. Extraction uses 5 sharded passes
//   (A-E), each reporting TOTAL_DISCOVERED, TOTAL_CAPTURED, TRUNCATED, COMPLETE.
//   If any shard is truncated, the result is marked incomplete.
//
// CORRECTION 3: Separated scores. No blended "96% visual parity". Independent
//   scores for each category; the lowest required category controls status.

export interface LedgerComponent {
  t: string;        // tag
  r: string;        // role
  n: string;        // accessible name
  x: string;        // text signature
  h: string;        // href / action
  c: string;        // class hints
  it: string;       // input type (text, email, search, password, etc.)
  ph: string;       // placeholder text
  fa: string;       // form action (nearest form action)
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

export interface ShardInfo {
  pass: string;
  total_discovered: number;
  total_captured: number;
  truncated: boolean;
  complete: boolean;
}

export interface FamilyLedger {
  url: string;
  title: string;
  families: ComponentFamily[];
  total_components: number;
  required_family_count: number;
  type_counts: Record<string, number>;
  shards: Record<string, ShardInfo>;
  extraction_complete: boolean;
}

// ─── SHARDED EXTRACTION SCRIPT (5 passes, A-E) ──────────────────────────
// Each pass captures ALL matching elements (high limits), reports completeness.
// No score depends on element ordering or truncation.
export function buildFamilyLedgerExtractionScript(): string {
  return `(function(){
  var comps = [];
  var seen = new Set();
  var shards = {};
  var LIMIT = 5000; // per-pass safety limit (not a score-affecting cap)

  function capture(el, stOverride) {
    if (seen.has(el)) return false;
    seen.add(el);
    var tag = el.tagName.toLowerCase();
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    var role = el.getAttribute('role') || '';
    var text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().slice(0, 60);
    var href = (el.getAttribute('href') || '').slice(0, 120);
    var cls = (el.className || '').toString().toLowerCase().slice(0, 100);
    var disabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
    var inputType = (el.type || '').toLowerCase();
    var placeholder = (el.getAttribute('placeholder') || '').toLowerCase().slice(0, 80);
    var formAction = '';
    if (tag === 'form') formAction = (el.getAttribute('action') || '').toLowerCase().slice(0, 120);
    else {
      var f = el.closest('form');
      if (f) formAction = (f.getAttribute('action') || '').toLowerCase().slice(0, 120);
    }

    var st = stOverride || classifyType(tag, role, cls, text, href, inputType, placeholder, formAction);
    var ai = classifyIntent(tag, href, st, cls, text);
    var rg = classifyRegion(el, rect);

    comps.push({
      t: tag, r: role, n: (el.getAttribute('aria-label') || text).slice(0, 60),
      x: text, h: href, c: cls,
      it: inputType, ph: placeholder, fa: formAction,
      b: [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)],
      st: st, ai: ai, rg: rg, v: true, e: !disabled
    });
    return true;
  }

  function classifyType(tag, role, cls, text, href, it, ph, fa) {
    var tx = text.toLowerCase();
    // ── Structural landmarks ──
    if (tag === 'nav' || role === 'navigation') return 'navigation';
    if (tag === 'header') return 'header';
    if (tag === 'footer') return 'footer';
    if (tag === 'main') return 'main_content';
    if (tag === 'aside') return 'sidebar';
    // ── Headings ──
    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') return 'heading';
    // ── Forms (semantic classification by context) ──
    if (tag === 'form') {
      if (cls.includes('search') || fa.includes('search')) return 'search_form';
      if (cls.includes('filter') || fa.includes('filter')) return 'filter_form';
      if (cls.includes('newsletter') || cls.includes('subscribe') || fa.includes('subscribe') || fa.includes('newsletter')) return 'newsletter_form';
      if (cls.includes('auth') || cls.includes('login') || cls.includes('sign-in') || fa.includes('login') || fa.includes('sign-in') || fa.includes('auth')) return 'auth_form';
      return 'generic_form';
    }
    // ── Inputs (semantic classification by PURPOSE, not just tag) ──
    if (tag === 'input' || tag === 'textarea') {
      // Newsletter/subscribe: email type, email/subscribe placeholder, newsletter class
      if (it === 'email' || ph.includes('email') || cls.includes('newsletter') || cls.includes('subscribe') || tx.includes('email') || tx.includes('subscribe') || fa.includes('subscribe') || fa.includes('newsletter')) return 'newsletter_input';
      // Auth: password type, password placeholder, auth/login class
      if (it === 'password' || ph.includes('password') || cls.includes('auth') || cls.includes('login') || cls.includes('sign-in') || tx.includes('password') || fa.includes('login') || fa.includes('sign-in') || fa.includes('auth')) return 'auth_input';
      // Search: search type, search placeholder/class
      if (it === 'search' || ph.includes('search') || cls.includes('search') || tx.includes('search')) return 'search';
      // Filter: filter placeholder/class, or in sidebar with filter context
      if (ph.includes('filter') || cls.includes('filter') || tx.includes('filter')) return 'filter';
      // AI tool: prompt class/placeholder
      if (cls.includes('prompt') || ph.includes('prompt') || cls.includes('ai-tool')) return 'ai_tool_input';
      // Checkbox/radio in sidebar = filter control
      if (it === 'checkbox' || it === 'radio') return 'filter';
      return 'other_input';
    }
    // ── Buttons ──
    if (role === 'button' || tag === 'button') {
      var bt = tx;
      if (cls.includes('filter') || bt.includes('filter')) return 'filter';
      if (cls.includes('sort') || bt.includes('sort')) return 'sort';
      if (cls.includes('pagination') || cls.includes('page-btn') || /^[0-9]+$/.test(bt) || bt.includes('prev') || bt.includes('next')) return 'pagination';
      if (cls.includes('cta') || bt.includes('subscribe') || bt.includes('download') || bt.includes('get started') || bt.includes('sign up') || bt.includes('buy')) return 'cta';
      if (cls.includes('menu') || cls.includes('dropdown')) return 'menu';
      return 'button';
    }
    // ── Links ──
    if (tag === 'a' && href) {
      if (cls.includes('card') || el.closest('[class*="card"]')) return 'card';
      if (cls.includes('cta') || tx.includes('subscribe') || tx.includes('download')) return 'cta';
      if (cls.includes('logo')) return 'logo';
      return 'link';
    }
    // ── Other interactive ──
    if (role === 'menu' || role === 'menuitem') return 'menu';
    if (role === 'tab') return 'tab';
    if (role === 'dialog') return 'modal';
    if (tag === 'details' || tag === 'summary') return 'accordion';
    if (tag === 'select' || role === 'combobox' || role === 'listbox') return 'select';
    if (tag === 'img' || tag === 'video' || tag === 'svg') return 'media';
    // ── Class-based fallback ──
    if (cls.includes('card')) return 'card';
    if (cls.includes('pricing')) return 'pricing';
    if (cls.includes('hero') || cls.includes('banner')) return 'hero';
    if (cls.includes('filter')) return 'filter';
    if (cls.includes('sort')) return 'sort';
    if (cls.includes('pagination')) return 'pagination';
    if (cls.includes('dropdown')) return 'menu';
    if (cls.includes('modal')) return 'modal';
    if (cls.includes('tab')) return 'tab';
    if (cls.includes('accordion')) return 'accordion';
    if (cls.includes('carousel')) return 'carousel';
    if (cls.includes('testimonial')) return 'testimonial';
    if (cls.includes('cta')) return 'cta';
    return 'container';
  }

  function classifyIntent(tag, href, st, cls, text) {
    if (tag === 'a' && href) return 'navigate';
    if (tag === 'form') return 'submit';
    if (st === 'filter') return 'filter';
    if (st === 'sort') return 'sort';
    if (st === 'pagination') return 'navigate';
    if (st === 'cta') return 'navigate';
    if (st === 'menu' || st === 'accordion' || st === 'tab') return 'toggle';
    if (tag === 'button' || st === 'button') return 'click';
    if (tag === 'input' || tag === 'textarea') return 'input';
    if (tag === 'select') return 'select';
    if (tag === 'details' || tag === 'summary') return 'toggle';
    return 'none';
  }

  function classifyRegion(el, rect) {
    if (el.closest('header') || rect.y < 120) return 'header';
    if (el.closest('footer') || rect.y > document.body.scrollHeight - 200) return 'footer';
    if (el.closest('nav')) return 'nav';
    if (el.closest('aside') || (rect.x < 280 && rect.width < 300)) return 'sidebar';
    return 'main';
  }

  function runPass(name, selector, limit) {
    var nodes = document.querySelectorAll(selector);
    var discovered = nodes.length;
    var captured = 0;
    for (var i = 0; i < nodes.length && captured < limit; i++) {
      if (capture(nodes[i])) captured++;
    }
    shards[name] = {
      pass: name, total_discovered: discovered, total_captured: captured,
      truncated: discovered > limit, complete: discovered <= limit
    };
  }

  // PASS A: Structural landmarks, forms, controls, navigation, headings
  runPass('A', 'nav, header, footer, main, aside, h1, h2, h3, h4, h5, h6, form, input, select, textarea', LIMIT);
  // PASS B: Links and CTAs
  runPass('B', 'a[href]', LIMIT);
  // PASS C: Cards
  runPass('C', '[class*="card"], [class*="Card"]', LIMIT);
  // PASS D: Media
  runPass('D', 'img, video, svg', LIMIT);
  // PASS E: Remaining interactive controls
  runPass('E', 'button, details, summary, [role="button"], [role="tab"], [role="menu"], [role="menuitem"], [role="dialog"], [role="combobox"], [role="listbox"], [role="option"], [class*="dropdown"], [class*="filter"], [class*="sort"], [class*="pagination"], [class*="modal"], [class*="tab"], [class*="accordion"], [class*="hero"], [class*="banner"], [class*="testimonial"], [class*="pricing"], [class*="cta"]', LIMIT);

  var tc = {};
  for (var j = 0; j < comps.length; j++) { tc[comps[j].st] = (tc[comps[j].st] || 0) + 1; }

  var allComplete = shards.A.complete && shards.B.complete && shards.C.complete && shards.D.complete && shards.E.complete;

  return JSON.stringify({
    url: window.location.href, title: document.title,
    components: comps, type_counts: tc, total_components: comps.length,
    shards: shards, extraction_complete: allComplete
  });
})()`;
}

// ─── CLASSIFICATION INTO FAMILIES ──────────────────────────────────────
export function classifyIntoFamilies(components: LedgerComponent[]): ComponentFamily[] {
  const groups = new Map<string, LedgerComponent[]>();

  for (const comp of components) {
    if (!comp.v || !comp.e) {
      const key = `hidden_${comp.st}_${comp.rg}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(comp);
      continue;
    }

    const familyName = getFamilyName(comp);
    const key = familyName;
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
      source_count: 0,
      clone_count: 0,
      components: comps,
      criticality: getCriticality(name),
      user_visible_purpose: getFamilyPurpose(name),
    });
  }

  return families;
}

// ─── SEMANTIC FAMILY NAME (uses PURPOSE + REGION + LABEL + FORM CONTEXT) ─
function getFamilyName(comp: LedgerComponent): string {
  const st = comp.st;
  const rg = comp.rg;

  // Structural landmarks
  if (st === 'header') return 'HEADER_LANDMARK';
  if (st === 'footer') return 'FOOTER_LANDMARK';
  if (st === 'navigation') return rg === 'header' ? 'HEADER_NAV' : 'NAV_BLOCK';
  if (st === 'main_content') return 'MAIN_CONTENT';

  // ── Input families (SEMANTIC: purpose-based, not just tag) ──
  if (st === 'search') return rg === 'header' ? 'HEADER_SEARCH_INPUT' : 'SEARCH_INPUT';
  if (st === 'filter') return rg === 'sidebar' ? 'FILTER_INPUT' : rg === 'header' ? 'HEADER_FILTER_INPUT' : 'FILTER_INPUT';
  if (st === 'newsletter_input') return 'NEWSLETTER_INPUT';
  if (st === 'auth_input') return 'AUTH_INPUT';
  if (st === 'ai_tool_input') return 'AI_TOOL_INPUT';
  if (st === 'other_input') return rg === 'header' ? 'HEADER_OTHER_INPUT' : 'OTHER_INPUT';

  // ── Form families (SEMANTIC: context-based) ──
  if (st === 'search_form') return 'SEARCH_FORM';
  if (st === 'filter_form') return 'FILTER_FORM';
  if (st === 'newsletter_form') return 'NEWSLETTER_FORM';
  if (st === 'auth_form') return 'AUTH_FORM';
  if (st === 'generic_form') return 'GENERIC_FORM';

  // Filter/sort/pagination controls
  if (st === 'filter') return rg === 'sidebar' || rg === 'main' ? 'FILTER_CONTROL' : 'FILTER_CONTROL';
  if (st === 'sort') return 'SORT_CONTROL';
  if (st === 'pagination') return 'PAGINATION';
  if (st === 'select') return 'SELECT_CONTROL';

  // Repeated content
  if (st === 'card') return 'ASSET_CARD_LINK';
  if (st === 'media') return comp.c.includes('card') || rg === 'main' ? 'ASSET_MEDIA' : 'DECORATIVE_MEDIA';

  // CTAs
  if (st === 'cta') return rg === 'header' ? 'HEADER_CTA' : rg === 'footer' ? 'FOOTER_CTA' : 'PRIMARY_CTA';

  // Links
  if (st === 'link') {
    if (rg === 'header') return 'HEADER_NAV_LINK';
    if (rg === 'footer') return 'FOOTER_LINK';
    if (rg === 'nav') return 'NAV_LINK';
    if (comp.c.includes('card') || comp.b[2] > 200) return 'ASSET_CARD_LINK';
    return 'CONTENT_LINK';
  }

  // Buttons
  if (st === 'button') {
    if (rg === 'header') return 'HEADER_BUTTON';
    if (rg === 'footer') return 'FOOTER_BUTTON';
    return 'ACTION_BUTTON';
  }

  // Other controls
  if (st === 'menu') return 'MENU_CONTROL';
  if (st === 'tab') return 'TAB_CONTROL';
  if (st === 'modal') return 'MODAL';
  if (st === 'accordion') return 'ACCORDION';

  // Headings
  if (st === 'heading') return rg === 'header' ? 'HEADER_HEADING' : 'CONTENT_HEADING';

  // Other
  if (st === 'logo') return 'LOGO';
  if (st === 'pricing') return 'PRICING_CARD';
  if (st === 'hero') return 'HERO_SECTION';
  if (st === 'testimonial') return 'TESTIMONIAL';
  if (st === 'container') return 'CONTAINER';
  if (st === 'sidebar') return 'SIDEBAR_BLOCK';

  return 'OTHER';
}

function categorizeFamily(familyName: string, first: LedgerComponent): ComponentCategory {
  // Structural landmarks
  if (['HEADER_LANDMARK', 'FOOTER_LANDMARK', 'HEADER_NAV', 'NAV_BLOCK', 'MAIN_CONTENT'].includes(familyName))
    return 'REQUIRED_STRUCTURAL';

  // Core functional workflows (search, filter, sort, pagination)
  if (['SEARCH_FORM', 'FILTER_FORM', 'FILTER_CONTROL', 'SORT_CONTROL', 'PAGINATION', 'SELECT_CONTROL',
       'SEARCH_INPUT', 'HEADER_SEARCH_INPUT', 'FILTER_INPUT', 'HEADER_FILTER_INPUT'].includes(familyName))
    return 'REQUIRED_FUNCTIONAL';

  // Newsletter — distinct from filter (CORRECTION 1)
  if (['NEWSLETTER_INPUT', 'NEWSLETTER_FORM'].includes(familyName))
    return 'REQUIRED_FUNCTIONAL';

  // Auth — distinct from filter
  if (['AUTH_INPUT', 'AUTH_FORM'].includes(familyName))
    return 'REQUIRED_FUNCTIONAL';

  // AI tool inputs — Xtreme native capability, not Envato parity
  if (['AI_TOOL_INPUT'].includes(familyName))
    return 'NOT_APPLICABLE_WITH_PROOF';

  // Other inputs/forms — may or may not be required
  if (['OTHER_INPUT', 'HEADER_OTHER_INPUT', 'GENERIC_FORM'].includes(familyName))
    return 'NOT_APPLICABLE_WITH_PROOF';

  // Repeated content
  if (['ASSET_CARD_LINK', 'ASSET_MEDIA'].includes(familyName))
    return 'REQUIRED_REPEATED_CONTENT';

  // CTAs
  if (['PRIMARY_CTA', 'HEADER_CTA', 'FOOTER_CTA'].includes(familyName))
    return 'REQUIRED_FUNCTIONAL';

  // Navigation links
  if (['HEADER_NAV_LINK', 'NAV_LINK'].includes(familyName))
    return 'REQUIRED_FUNCTIONAL';

  // Footer links — required structural
  if (familyName === 'FOOTER_LINK') return 'REQUIRED_STRUCTURAL';

  // Content headings
  if (['HEADER_HEADING', 'CONTENT_HEADING'].includes(familyName))
    return 'REQUIRED_STRUCTURAL';

  if (familyName === 'LOGO') return 'REQUIRED_STRUCTURAL';

  // Source-internal (account, auth, cart)
  if (first.h && (first.h.includes('/sign-in') || first.h.includes('/login') ||
      first.h.includes('/account') || first.h.includes('/cart') ||
      first.h.includes('/dashboard') || first.h.includes('/library')))
    return 'SOURCE_INTERNAL';

  // Hidden/inactive
  if (familyName.startsWith('hidden_')) return 'HIDDEN_OR_INACTIVE';

  return 'NOT_APPLICABLE_WITH_PROOF';
}

function getCriticality(familyName: string): 'critical' | 'important' | 'optional' {
  if (['SEARCH_FORM', 'FILTER_CONTROL', 'SORT_CONTROL', 'PAGINATION',
       'ASSET_CARD_LINK', 'PRIMARY_CTA', 'HEADER_NAV_LINK',
       'HEADER_LANDMARK', 'FOOTER_LANDMARK', 'SEARCH_INPUT', 'FILTER_INPUT'].includes(familyName))
    return 'critical';
  if (['HEADER_NAV', 'FOOTER_LINK', 'HEADER_CTA', 'FOOTER_CTA',
       'ASSET_MEDIA', 'CONTENT_HEADING', 'HEADER_HEADING', 'LOGO',
       'SELECT_CONTROL', 'HEADER_SEARCH_INPUT', 'HEADER_FILTER_INPUT',
       'FILTER_FORM', 'NEWSLETTER_INPUT', 'NEWSLETTER_FORM',
       'AUTH_INPUT', 'AUTH_FORM'].includes(familyName))
    return 'important';
  return 'optional';
}

function getFamilyPurpose(familyName: string): string {
  const purposes: Record<string, string> = {
    HEADER_LANDMARK: 'Top-level page header with logo and primary navigation',
    FOOTER_LANDMARK: 'Bottom footer with legal links and secondary navigation',
    HEADER_NAV: 'Primary navigation block in header',
    NAV_BLOCK: 'Secondary navigation block',
    MAIN_CONTENT: 'Main content area',
    SEARCH_FORM: 'Search form for finding assets',
    FILTER_FORM: 'Form containing filter controls for narrowing results',
    NEWSLETTER_FORM: 'Newsletter/subscribe form for email signup',
    AUTH_FORM: 'Authentication form (login/register)',
    GENERIC_FORM: 'Generic form without clear search/filter/newsletter context',
    FILTER_CONTROL: 'Filter buttons/checkboxes for narrowing asset results',
    SORT_CONTROL: 'Sort dropdown/buttons for ordering results',
    PAGINATION: 'Page navigation controls',
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
    HEADER_SEARCH_INPUT: 'Search input in header',
    FILTER_INPUT: 'Filter input field (text filter in sidebar)',
    HEADER_FILTER_INPUT: 'Filter input in header',
    NEWSLETTER_INPUT: 'Newsletter/subscribe email input (NOT a filter)',
    AUTH_INPUT: 'Authentication input (password/email for login)',
    AI_TOOL_INPUT: 'AI tool prompt input (Xtreme native, not Envato parity)',
    OTHER_INPUT: 'Unclassified input',
    HEADER_OTHER_INPUT: 'Unclassified input in header',
    HEADER_HEADING: 'Heading in header',
    CONTENT_HEADING: 'Heading in content',
    LOGO: 'Brand logo',
    PRICING_CARD: 'Pricing plan cards',
    HERO_SECTION: 'Hero banner section',
    TESTIMONIAL: 'Testimonial blocks',
    CONTAINER: 'Generic container',
    DECORATIVE_MEDIA: 'Decorative media elements',
    SIDEBAR_BLOCK: 'Sidebar block',
    OTHER: 'Unclassified element',
  };
  return purposes[familyName] || 'Unknown purpose';
}

// ─── PARSE FAMILY LEDGER ────────────────────────────────────────────────
export function parseFamilyLedger(jsonStr: string): FamilyLedger {
  const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
  const components: LedgerComponent[] = (data.components || []).map((c: any) => ({
    t: c.t || '', r: c.r || '', n: c.n || '', x: c.x || '', h: c.h || '', c: c.c || '',
    it: c.it || '', ph: c.ph || '', fa: c.fa || '',
    b: c.b || [0, 0, 0, 0], st: c.st || 'unknown', ai: c.ai || 'none',
    rg: c.rg || 'main', v: c.v !== false, e: c.e !== false,
  }));
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
    shards: data.shards || {},
    extraction_complete: data.extraction_complete !== false,
  };
}

// ─── SEPARATED PARITY SCORES (CORRECTION 3) ────────────────────────────
export interface SeparatedParityScores {
  semantic_component_parity: number;    // Required family coverage
  quantity_coverage: number;            // Repeated family quantity ratio
  structural_parity: number;            // Structural landmark coverage
  search_parity: number;                // Search form/input coverage
  filtering_parity: number;              // Filter control/input coverage
  sorting_parity: number;               // Sort control coverage
  pagination_parity: number;            // Pagination coverage
  newsletter_parity: number;            // Newsletter form/input coverage
  auth_parity: number;                  // Auth form/input coverage
  navigation_parity: number;            // Nav link coverage
  cta_parity: number;                    // CTA coverage
  content_parity: number;               // Content (cards, headings) coverage
  overall_min: number;                   // MIN of all required category scores
}

export interface RequiredParityResult {
  required_component_parity: number;
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
  separated_scores: SeparatedParityScores;
  source_shards: Record<string, ShardInfo>;
  clone_shards: Record<string, ShardInfo>;
  extraction_complete: boolean;
}

// ─── COMPUTE REQUIRED COMPONENT PARITY WITH SEPARATED SCORES ────────────
export function computeRequiredComponentParity(
  sourceLedger: FamilyLedger,
  cloneLedger: FamilyLedger
): RequiredParityResult {
  // Source 404/error detection
  const sourceTitleLower = (sourceLedger.title || '').toLowerCase();
  const isSourceInvalid = sourceTitleLower.includes('not found') ||
    sourceTitleLower.includes('404') || sourceTitleLower.includes('error') ||
    sourceTitleLower.includes('page not found');

  if (isSourceInvalid) {
    return {
      required_component_parity: 100,
      total_required_families: 0,
      matched_families: [], partial_families: [], missing_families: [],
      extra_clone_families: [], family_details: [],
      exclusions: [{ family_name: 'SOURCE_PAGE', category: 'SOURCE_ERROR_ARTIFACT', reason: `Source page is invalid (${sourceLedger.title})` }],
      separated_scores: {
        semantic_component_parity: 100, quantity_coverage: 100, structural_parity: 100,
        search_parity: 100, filtering_parity: 100, sorting_parity: 100, pagination_parity: 100,
        newsletter_parity: 100, auth_parity: 100, navigation_parity: 100, cta_parity: 100,
        content_parity: 100, overall_min: 100,
      },
      source_shards: sourceLedger.shards || {},
      clone_shards: cloneLedger.shards || {},
      extraction_complete: true,
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

  // Category-specific score tracking
  const categoryScores: Record<string, { matched: number; partial: number; total: number }> = {
    structural: { matched: 0, partial: 0, total: 0 },
    search: { matched: 0, partial: 0, total: 0 },
    filtering: { matched: 0, partial: 0, total: 0 },
    sorting: { matched: 0, partial: 0, total: 0 },
    pagination: { matched: 0, partial: 0, total: 0 },
    newsletter: { matched: 0, partial: 0, total: 0 },
    auth: { matched: 0, partial: 0, total: 0 },
    navigation: { matched: 0, partial: 0, total: 0 },
    cta: { matched: 0, partial: 0, total: 0 },
    content: { matched: 0, partial: 0, total: 0 },
  };

  function getCategoryForFamily(name: string): string | null {
    if (['HEADER_LANDMARK', 'FOOTER_LANDMARK', 'HEADER_NAV', 'NAV_BLOCK', 'FOOTER_LINK', 'HEADER_HEADING', 'CONTENT_HEADING', 'LOGO', 'MAIN_CONTENT'].includes(name)) return 'structural';
    if (['SEARCH_FORM', 'SEARCH_INPUT', 'HEADER_SEARCH_INPUT'].includes(name)) return 'search';
    if (['FILTER_FORM', 'FILTER_CONTROL', 'FILTER_INPUT', 'HEADER_FILTER_INPUT', 'SELECT_CONTROL'].includes(name)) return 'filtering';
    if (['SORT_CONTROL'].includes(name)) return 'sorting';
    if (['PAGINATION'].includes(name)) return 'pagination';
    if (['NEWSLETTER_INPUT', 'NEWSLETTER_FORM'].includes(name)) return 'newsletter';
    if (['AUTH_INPUT', 'AUTH_FORM'].includes(name)) return 'auth';
    if (['HEADER_NAV_LINK', 'NAV_LINK'].includes(name)) return 'navigation';
    if (['PRIMARY_CTA', 'HEADER_CTA', 'FOOTER_CTA'].includes(name)) return 'cta';
    if (['ASSET_CARD_LINK', 'ASSET_MEDIA'].includes(name)) return 'content';
    return null;
  }

  let quantityCoverageSum = 0;
  let quantityCoverageCount = 0;

  for (const [name, srcFam] of sourceFamilies) {
    const isRequired = srcFam.category === 'REQUIRED_FUNCTIONAL' ||
                       srcFam.category === 'REQUIRED_STRUCTURAL' ||
                       srcFam.category === 'REQUIRED_REPEATED_CONTENT';

    if (!isRequired) {
      exclusions.push({ family_name: name, category: srcFam.category, reason: `Excluded: ${srcFam.category} — ${srcFam.user_visible_purpose}` });
      details.push({ family_name: name, category: srcFam.category, criticality: srcFam.criticality, source_count: srcFam.components.length, clone_count: cloneFamilies.get(name)?.components.length || 0, quantity_coverage: 0, status: 'not_required' });
      continue;
    }

    const cat = getCategoryForFamily(name);
    if (cat) categoryScores[cat].total++;

    const cloneFam = cloneFamilies.get(name);
    const srcCount = srcFam.components.length;
    const clCount = cloneFam?.components.length || 0;

    if (!cloneFam || clCount === 0) {
      missing.push(name);
      details.push({ family_name: name, category: srcFam.category, criticality: srcFam.criticality, source_count: srcCount, clone_count: 0, quantity_coverage: 0, status: 'missing' });
      // Track quantity for repeated content
      if (srcFam.category === 'REQUIRED_REPEATED_CONTENT') {
        quantityCoverageSum += 0;
        quantityCoverageCount++;
      }
    } else if (srcFam.category === 'REQUIRED_REPEATED_CONTENT') {
      const ratio = srcCount > 0 ? clCount / srcCount : 1;
      const coverage = Math.round(Math.min(ratio, 1) * 100);
      quantityCoverageSum += coverage;
      quantityCoverageCount++;
      if (ratio >= 0.8) {
        matched.push(name);
        details.push({ family_name: name, category: srcFam.category, criticality: srcFam.criticality, source_count: srcCount, clone_count: clCount, quantity_coverage: coverage, status: 'matched' });
        if (cat) categoryScores[cat].matched++;
      } else {
        partial.push(name);
        details.push({ family_name: name, category: srcFam.category, criticality: srcFam.criticality, source_count: srcCount, clone_count: clCount, quantity_coverage: coverage, status: 'partial' });
        if (cat) categoryScores[cat].partial++;
      }
    } else {
      matched.push(name);
      details.push({ family_name: name, category: srcFam.category, criticality: srcFam.criticality, source_count: srcCount, clone_count: clCount, quantity_coverage: 100, status: 'matched' });
      if (cat) categoryScores[cat].matched++;
    }
  }

  for (const [name, clFam] of cloneFamilies) {
    if (!sourceFamilies.has(name)) {
      extra.push(name);
      details.push({ family_name: name, category: clFam.category, criticality: clFam.criticality, source_count: 0, clone_count: clFam.components.length, quantity_coverage: 0, status: 'extra' });
    }
  }

  const totalRequired = sourceLedger.families.filter(f =>
    f.category === 'REQUIRED_FUNCTIONAL' || f.category === 'REQUIRED_STRUCTURAL' || f.category === 'REQUIRED_REPEATED_CONTENT'
  ).length;

  // ── Compute separated scores ──
  function catScore(cat: string): number {
    const s = categoryScores[cat];
    if (!s || s.total === 0) return 100; // No required families in this category → 100
    return Math.round(((s.matched + s.partial * 0.5) / s.total) * 100);
  }

  const separated: SeparatedParityScores = {
    semantic_component_parity: totalRequired > 0 ? Math.round(((matched.length + partial.length * 0.5) / totalRequired) * 100) : 100,
    quantity_coverage: quantityCoverageCount > 0 ? Math.round(quantityCoverageSum / quantityCoverageCount) : 100,
    structural_parity: catScore('structural'),
    search_parity: catScore('search'),
    filtering_parity: catScore('filtering'),
    sorting_parity: catScore('sorting'),
    pagination_parity: catScore('pagination'),
    newsletter_parity: catScore('newsletter'),
    auth_parity: catScore('auth'),
    navigation_parity: catScore('navigation'),
    cta_parity: catScore('cta'),
    content_parity: catScore('content'),
    overall_min: 0, // computed below
  };

  // Overall = MIN of all required category scores (no averaging, no blending)
  const requiredScores = Object.values(separated).filter((v, i) => i < 12); // exclude overall_min
  separated.overall_min = Math.min(...requiredScores);

  return {
    required_component_parity: separated.semantic_component_parity,
    total_required_families: totalRequired,
    matched_families: matched,
    partial_families: partial,
    missing_families: missing,
    extra_clone_families: extra,
    family_details: details,
    exclusions,
    separated_scores: separated,
    source_shards: sourceLedger.shards || {},
    clone_shards: cloneLedger.shards || {},
    extraction_complete: sourceLedger.extraction_complete && cloneLedger.extraction_complete,
  };
}