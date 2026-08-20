// Semantic Component Manifest — replaces raw count-based scoring with
// meaningful component classification and semantic parity comparison.
//
// Instead of counting buttons/links/images, we classify every visible
// meaningful element by its semantic type (navigation, search, filter,
// card, CTA, pricing, etc.) and compare the SETS of semantic types
// between source and clone.
//
// Only MISSING_REQUIRED semantic types generate repairs — never raw
// count differences.

export interface SemanticComponent {
  component_id: string;
  tag: string;
  role: string;
  accessible_name: string;
  text_signature: string;
  href_or_action: string;
  bounding_box: { x: number; y: number; w: number; h: number };
  visible: boolean;
  enabled: boolean;
  aria_state: string;
  component_region: string;
  interaction_type: string;
  semantic_type: string;
}

export interface ComponentManifest {
  url: string;
  title: string;
  page_type: SourcePageType;
  components: SemanticComponent[];
  semantic_type_counts: Record<string, number>;
  total_components: number;
}

export type SourcePageType =
  | 'valid_content'
  | 'not_found_404'
  | 'error_page'
  | 'auth_wall'
  | 'redirect'
  | 'blocked';

// Lite manifest script — returns only type counts and totals, not the
// full components array. This avoids CDP returnByValue size limits.
export function buildComponentManifestLiteScript(): string {
  return `var types=[];var selectors=['nav','header','footer','main','aside','[role="navigation"]','[role="search"]','[role="button"]','[role="menu"]','[role="menuitem"]','[role="tab"]','[role="dialog"]','button','a[href]','input','select','textarea','form','details','summary','[class*="dropdown"]','[class*="filter"]','[class*="sort"]','[class*="pagination"]','[class*="card"]','[class*="pricing"]','[class*="cta"]','[class*="modal"]','[class*="tab"]','h1','h2','h3','img','video','svg'];var seen=new Set();var nodes=document.querySelectorAll(selectors.join(','));for(var i=0;i<nodes.length&&types.length<200;i++){var el=nodes[i];if(seen.has(el))continue;seen.add(el);var rect=el.getBoundingClientRect();if(rect.width===0&&rect.height===0)continue;var tag=el.tagName.toLowerCase();var role=el.getAttribute('role')||'';var text=(el.innerText||el.getAttribute('aria-label')||'').trim().slice(0,80);var href=el.getAttribute('href')||'';var st='unknown';if(tag==='nav'||role==='navigation')st='navigation';else if(tag==='header')st='header';else if(tag==='footer')st='footer';else if(role==='search'||(tag==='input'&&el.type==='search'))st='search';else if(role==='button'||tag==='button'){st='button';var bt=text.toLowerCase();var bc=(el.className||'').toLowerCase();if(bc.includes('filter')||bt.includes('filter'))st='filter';else if(bc.includes('sort')||bt.includes('sort'))st='sort';else if(bc.includes('pagination')||/^[0-9]+$/.test(bt))st='pagination';else if(bc.includes('cta')||bt.includes('subscribe')||bt.includes('download'))st='cta';else if(bc.includes('menu')||bc.includes('dropdown'))st='menu';}else if(tag==='a'&&href){st='link';var lc=(el.className||'').toLowerCase();if(lc.includes('card')||el.closest('[class*="card"]'))st='card';else if(lc.includes('cta')||text.toLowerCase().includes('subscribe'))st='cta';}else if(role==='menu'||role==='menuitem')st='menu';else if(role==='tab')st='tab';else if(role==='dialog')st='modal';else if(tag==='details'||tag==='summary')st='accordion';else if(tag==='form')st='form';else if(tag==='select')st='select';else if(tag==='input'||tag==='textarea')st='input';else if(tag==='img'||tag==='video'||tag==='svg')st='media';else if(tag==='h1'||tag==='h2'||tag==='h3')st='heading';else{var fc=(el.className||'').toLowerCase();if(fc.includes('card'))st='card';else if(fc.includes('pricing'))st='pricing';else if(fc.includes('hero')||fc.includes('banner'))st='hero';else if(fc.includes('filter'))st='filter';else if(fc.includes('sort'))st='sort';else if(fc.includes('pagination'))st='pagination';else if(fc.includes('dropdown'))st='menu';else if(fc.includes('modal'))st='modal';else if(fc.includes('tab'))st='tab';else if(fc.includes('accordion'))st='accordion';else if(fc.includes('carousel'))st='carousel';else if(fc.includes('testimonial'))st='testimonial';else if(fc.includes('cta'))st='cta';else if(tag==='div'||tag==='section'||tag==='article'||tag==='span'||tag==='li'||tag==='ul'||tag==='ol')st='container';}types.push(st);}var tc={};for(var j=0;j<types.length;j++){var t=types[j];tc[t]=(tc[t]||0)+1;}JSON.stringify({url:window.location.href,title:document.title,semantic_type_counts:tc,total_components:types.length});`;
}

// Browser-side evaluate script that extracts semantic components.
// Runs in the browser via CDP Runtime.evaluate or CloudBrowser execute.
export function buildComponentManifestScript(): string {
  return `(function(){
  var components = [];
  var selectors = [
    'nav', 'header', 'footer', 'main', 'aside',
    '[role="navigation"]', '[role="search"]', '[role="button"]', '[role="menu"]',
    '[role="menuitem"]', '[role="tab"]', '[role="dialog"]', '[role="tabpanel"]',
    '[role="combobox"]', '[role="listbox"]', '[role="option"]',
    'button', 'a[href]', 'input', 'select', 'textarea', 'form',
    'details', 'summary',
    '[class*="dropdown"]', '[class*="filter"]', '[class*="sort"]',
    '[class*="pagination"]', '[class*="card"]', '[class*="pricing"]',
    '[class*="cta"]', '[class*="modal"]', '[class*="drawer"]',
    '[class*="tab"]', '[class*="accordion"]', '[class*="carousel"]',
    '[class*="hero"]', '[class*="banner"]', '[class*="testimonial"]',
    'h1', 'h2', 'h3', 'img', 'video', 'svg'
  ];
  var seen = new Set();
  var nodes = document.querySelectorAll(selectors.join(','));
  var maxComponents = 200;
  for (var i = 0; i < nodes.length && components.length < maxComponents; i++) {
    var el = nodes[i];
    if (seen.has(el)) continue;
    seen.add(el);
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    var style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

    var tag = el.tagName.toLowerCase();
    var role = el.getAttribute('role') || '';
    var text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().slice(0, 80);
    var href = el.getAttribute('href') || '';
    var ariaState = el.getAttribute('aria-expanded') || el.getAttribute('aria-selected') || el.getAttribute('aria-checked') || '';
    var disabled = el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';

    // Classify semantic type
    var semanticType = 'unknown';
    var interactionType = 'none';
    if (tag === 'nav' || role === 'navigation') { semanticType = 'navigation'; interactionType = 'navigate'; }
    else if (tag === 'header') { semanticType = 'header'; interactionType = 'none'; }
    else if (tag === 'footer') { semanticType = 'footer'; interactionType = 'navigate'; }
    else if (tag === 'main') { semanticType = 'main_content'; interactionType = 'none'; }
    else if (tag === 'aside') { semanticType = 'sidebar'; interactionType = 'none'; }
    else if (role === 'search' || (tag === 'input' && (el.type === 'search' || el.getAttribute('placeholder') || '').toLowerCase().includes('search'))) { semanticType = 'search'; interactionType = 'input'; }
    else if (role === 'button' || tag === 'button') {
      semanticType = 'button';
      interactionType = 'click';
      // Refine button semantic type
      var btnText = text.toLowerCase();
      var btnClass = (el.className || '').toLowerCase();
      if (btnClass.includes('filter') || btnText.includes('filter')) { semanticType = 'filter'; }
      else if (btnClass.includes('sort') || btnText.includes('sort')) { semanticType = 'sort'; }
      else if (btnClass.includes('pagination') || btnClass.includes('page-') || /^[0-9]+$/.test(btnText)) { semanticType = 'pagination'; }
      else if (btnClass.includes('cta') || btnText.includes('subscribe') || btnText.includes('download') || btnText.includes('get started') || btnText.includes('sign up') || btnText.includes('buy')) { semanticType = 'cta'; }
      else if (btnClass.includes('menu') || btnClass.includes('dropdown') || el.closest('[class*="dropdown"]') || el.closest('[class*="menu"]')) { semanticType = 'menu'; }
      else if (btnClass.includes('tab') || el.closest('[role="tablist"]')) { semanticType = 'tab'; }
    }
    else if (tag === 'a' && href) {
      semanticType = 'link';
      interactionType = 'navigate';
      var linkClass = (el.className || '').toLowerCase();
      if (linkClass.includes('card') || el.closest('[class*="card"]')) { semanticType = 'card'; }
      else if (linkClass.includes('cta') || text.toLowerCase().includes('subscribe') || text.toLowerCase().includes('download')) { semanticType = 'cta'; }
      else if (linkClass.includes('logo') || (el.closest('header') && text.length < 20)) { semanticType = 'logo'; }
    }
    else if (role === 'menu' || role === 'menuitem') { semanticType = 'menu'; interactionType = 'click'; }
    else if (role === 'tab') { semanticType = 'tab'; interactionType = 'click'; }
    else if (role === 'dialog') { semanticType = 'modal'; interactionType = 'none'; }
    else if (tag === 'details' || tag === 'summary') { semanticType = 'accordion'; interactionType = 'click'; }
    else if (tag === 'form') { semanticType = 'form'; interactionType = 'submit'; }
    else if (tag === 'select' || role === 'combobox' || role === 'listbox') { semanticType = 'select'; interactionType = 'select'; }
    else if (tag === 'input' || tag === 'textarea') {
      semanticType = 'input';
      interactionType = 'input';
      var inputType = (el.type || '').toLowerCase();
      if (inputType === 'checkbox' || inputType === 'radio') { semanticType = 'filter'; interactionType = 'click'; }
    }
    else if (tag === 'img' || tag === 'video' || tag === 'svg') { semanticType = 'media'; interactionType = 'none'; }
    else if (tag === 'h1' || tag === 'h2' || tag === 'h3') { semanticType = 'heading'; interactionType = 'none'; }
    else {
      var cls = (el.className || '').toLowerCase();
      if (cls.includes('card')) { semanticType = 'card'; }
      else if (cls.includes('pricing')) { semanticType = 'pricing'; }
      else if (cls.includes('hero') || cls.includes('banner')) { semanticType = 'hero'; }
      else if (cls.includes('testimonial')) { semanticType = 'testimonial'; }
      else if (cls.includes('filter')) { semanticType = 'filter'; }
      else if (cls.includes('sort')) { semanticType = 'sort'; }
      else if (cls.includes('pagination')) { semanticType = 'pagination'; }
      else if (cls.includes('dropdown')) { semanticType = 'dropdown'; }
      else if (cls.includes('modal')) { semanticType = 'modal'; }
      else if (cls.includes('drawer')) { semanticType = 'drawer'; }
      else if (cls.includes('tab')) { semanticType = 'tab'; }
      else if (cls.includes('accordion')) { semanticType = 'accordion'; }
      else if (cls.includes('carousel')) { semanticType = 'carousel'; }
    }

    // Determine region
    var region = 'main';
    if (rect.y < 120) region = 'header';
    else if (rect.y > document.body.scrollHeight - 200) region = 'footer';
    else if (rect.x < 280 && rect.width < 300) region = 'sidebar';

    components.push({
      component_id: 'c' + components.length,
      tag: tag,
      role: role,
      accessible_name: (el.getAttribute('aria-label') || text).slice(0, 80),
      text_signature: text,
      href_or_action: href,
      bounding_box: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
      visible: true,
      enabled: !disabled,
      aria_state: ariaState,
      component_region: region,
      interaction_type: interactionType,
      semantic_type: semanticType
    });
  }

  // Count semantic types
  var typeCounts = {};
  for (var j = 0; j < components.length; j++) {
    var st = components[j].semantic_type;
    typeCounts[st] = (typeCounts[st] || 0) + 1;
  }

  return JSON.stringify({
    url: window.location.href,
    title: document.title,
    components: components,
    semantic_type_counts: typeCounts,
    total_components: components.length
  });
})()`;
}

// Classify the source page type — detect 404, error, auth wall, redirect
export function classifySourcePage(title: string, bodyText: string, url: string, status?: number): SourcePageType {
  const lowerTitle = (title || '').toLowerCase();
  const lowerBody = (bodyText || '').toLowerCase().slice(0, 2000);

  // 404 detection
  if (lowerTitle.includes('not found') || lowerTitle.includes('404') ||
      lowerBody.includes('page not found') || lowerBody.includes('404 error') ||
      lowerBody.includes("doesn't exist") || lowerBody.includes('does not exist')) {
    return 'not_found_404';
  }

  // Error page detection
  if (lowerTitle.includes('error') || lowerTitle.includes('server error') ||
      lowerBody.includes('internal server error') || lowerBody.includes('something went wrong') ||
      lowerBody.includes('error occurred') || (status && status >= 500)) {
    return 'error_page';
  }

  // Auth wall detection
  if (lowerTitle.includes('sign in') || lowerTitle.includes('log in') || lowerTitle.includes('login') ||
      url.includes('/login') || url.includes('/sign-in') || url.includes('/auth/') ||
      (lowerBody.includes('sign in') && lowerBody.includes('password') && lowerBody.length < 500)) {
    return 'auth_wall';
  }

  // Redirect detection (if URL changed significantly from intended)
  // This is handled by the caller comparing intended vs actual URL

  return 'valid_content';
}

// Compare two component manifests semantically.
// Returns a parity score based on SEMANTIC TYPE COVERAGE, not raw counts.
export interface SemanticParityResult {
  semantic_parity_score: number;  // 0-100
  source_page_type: SourcePageType;
  clone_page_type: SourcePageType;
  source_type_counts: Record<string, number>;
  clone_type_counts: Record<string, number>;
  matched_types: string[];
  missing_required_types: string[];
  extra_clone_types: string[];
  differences: string[];
  status: 'pass' | 'fail' | 'partial' | 'source_invalid_reference';
}

export function compareManifests(
  source: ComponentManifest,
  clone: ComponentManifest
): SemanticParityResult {
  // If source is an invalid reference (404, error, auth wall), don't
  // penalize the clone — mark as SOURCE_INVALID_REFERENCE
  if (source.page_type !== 'valid_content') {
    return {
      semantic_parity_score: 100, // Not penalized — source is invalid
      source_page_type: source.page_type,
      clone_page_type: clone.page_type,
      source_type_counts: source.semantic_type_counts,
      clone_type_counts: clone.semantic_type_counts,
      matched_types: [],
      missing_required_types: [],
      extra_clone_types: [],
      differences: [`Source page is ${source.page_type} — not a valid reference for comparison`],
      status: 'source_invalid_reference',
    };
  }

  const sourceTypes = new Set(Object.keys(source.semantic_type_counts || {}));
  const cloneTypes = new Set(Object.keys(clone.semantic_type_counts || {}));

  const matched: string[] = [];
  const missing: string[] = [];
  const extra: string[] = [];

  for (const type of sourceTypes) {
    if (cloneTypes.has(type)) {
      matched.push(type);
    } else {
      missing.push(type);
    }
  }
  for (const type of cloneTypes) {
    if (!sourceTypes.has(type)) {
      extra.push(type);
    }
  }

  // Quantity-weighted semantic parity — a type only counts as fully matched
  // if the clone has >= 50% of the source's count for that type. Types present
  // but with low quantity count as partial (0.5 weight). This prevents a
  // clone with 1 card from scoring 100% against a source with 40 cards.
  const totalSourceTypes = sourceTypes.size;
  let weightedScore = 0;
  const partialTypes: string[] = [];
  const underweightTypes: string[] = [];

  for (const type of sourceTypes) {
    const sourceCount = source.semantic_type_counts[type] || 0;
    const cloneCount = clone.semantic_type_counts[type] || 0;
    if (cloneCount === 0) {
      // completely missing — 0 weight
      continue;
    }
    if (sourceCount === 0) {
      weightedScore += 1;
      continue;
    }
    const ratio = cloneCount / sourceCount;
    if (ratio >= 0.5) {
      weightedScore += 1; // full match
    } else if (ratio >= 0.15) {
      weightedScore += 0.5; // partial match
      partialTypes.push(`${type}(${cloneCount}/${sourceCount})`);
    } else {
      underweightTypes.push(`${type}(${cloneCount}/${sourceCount})`);
    }
  }

  const semanticParityScore = totalSourceTypes > 0
    ? Math.round((weightedScore / totalSourceTypes) * 100)
    : 100;

  const differences: string[] = [];
  if (missing.length > 0) {
    differences.push(`Missing required semantic types: ${missing.join(', ')}`);
  }
  if (partialTypes.length > 0) {
    differences.push(`Partial coverage (clone/source): ${partialTypes.join(', ')}`);
  }
  if (underweightTypes.length > 0) {
    differences.push(`Underweight coverage (clone/source): ${underweightTypes.join(', ')}`);
  }
  if (extra.length > 0 && extra.length > 5) {
    differences.push(`Extra clone types (informational): ${extra.join(', ')}`);
  }

  // Check for critical missing types
  const criticalTypes = ['navigation', 'search', 'card', 'cta', 'footer', 'form', 'header'];
  const missingCritical = missing.filter(t => criticalTypes.includes(t));
  if (missingCritical.length > 0) {
    differences.push(`Missing CRITICAL types: ${missingCritical.join(', ')}`);
  }

  let status: 'pass' | 'fail' | 'partial';
  if (semanticParityScore >= 90 && missingCritical.length === 0 && partialTypes.length === 0) status = 'pass';
  else if (semanticParityScore >= 70) status = 'partial';
  else status = 'fail';

  return {
    semantic_parity_score: semanticParityScore,
    source_page_type: source.page_type,
    clone_page_type: clone.page_type,
    source_type_counts: source.semantic_type_counts,
    clone_type_counts: clone.semantic_type_counts,
    matched_types: matched,
    missing_required_types: missing,
    extra_clone_types: extra,
    differences,
    status,
  };
}

// Parse a manifest from a JSON string (result of the evaluate script)
export function parseManifest(jsonStr: string, pageType?: SourcePageType): ComponentManifest {
  const data = JSON.parse(jsonStr);
  return {
    url: data.url,
    title: data.title,
    page_type: pageType || classifySourcePage(data.title, '', data.url),
    components: data.components || [],
    semantic_type_counts: data.semantic_type_counts || {},
    total_components: data.total_components || 0,
  };
}