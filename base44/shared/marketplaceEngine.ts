// Marketplace Engine — reusable clone-side marketplace experience with
// dynamic filtering, sorting, pagination, search, and same-origin placeholder
// images. This is the core of the behavioral reconstruction for marketplace
// category pages, replacing static pre-rendered grids with a real interactive
// browsing experience that matches source-site parity.
//
// KEY DESIGN DECISIONS:
// 1. Same-origin SVG data-URI placeholder images — eliminates ALL cross-origin
//    image failures (ORB, CORS, ERR_FAILED). No Unsplash, no Envato CDN.
// 2. Client-side filtering/sorting/pagination — works on the pre-rendered
//    asset data embedded in the page, no API calls needed.
// 3. URL/query synchronization — filter/sort/page state is reflected in the
//    URL query string, enabling browser back/forward, direct URL loads,
//    and shareable filtered views.
// 4. Mobile-responsive filter drawer — collapsible filter panel on mobile.

// Generate a same-origin SVG data URI placeholder for an asset.
// Uses a deterministic gradient based on the asset name hash, plus the
// asset name and category icon. This eliminates ALL cross-origin image
// failures (ORB, CORS, ERR_FAILED) while providing visual variety.
export function generateAssetPlaceholder(asset: any, categoryIcon: string = '📦'): string {
  const name = asset.name || 'Asset';
  const sub = asset.subcategory || asset.category || '';
  // Deterministic hash → hue for gradient
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 40) % 360;
  const c1 = `hsl(${hue1}, 45%, 25%)`;
  const c2 = `hsl(${hue2}, 35%, 15%)`;
  // Truncate name for display
  const displayName = name.length > 28 ? name.substring(0, 25) + '...' : name;
  const displaySub = sub.length > 20 ? sub.substring(0, 17) + '...' : sub;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect width="400" height="300" fill="url(#g)"/>
    <text x="200" y="130" font-size="48" text-anchor="middle" opacity="0.3">${categoryIcon}</text>
    <text x="200" y="175" font-size="16" font-weight="600" fill="white" text-anchor="middle" opacity="0.9" font-family="sans-serif">${escapeXml(displayName)}</text>
    <text x="200" y="200" font-size="12" fill="white" text-anchor="middle" opacity="0.6" font-family="sans-serif">${escapeXml(displaySub)}</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoaSafe(svg);
}

// Generate placeholder for the pre-rendered HTML (server-side, uses Buffer)
export function generateAssetPlaceholderServer(asset: any, categoryIcon: string = '📦'): string {
  const name = asset.name || 'Asset';
  const sub = asset.subcategory || asset.category || '';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 40) % 360;
  const c1 = `hsl(${hue1}, 45%, 25%)`;
  const c2 = `hsl(${hue2}, 35%, 15%)`;
  const displayName = name.length > 28 ? name.substring(0, 25) + '...' : name;
  const displaySub = sub.length > 20 ? sub.substring(0, 17) + '...' : sub;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect width="400" height="300" fill="url(#g)"/>
    <text x="200" y="130" font-size="48" text-anchor="middle" opacity="0.3">${categoryIcon}</text>
    <text x="200" y="175" font-size="16" font-weight="600" fill="white" text-anchor="middle" opacity="0.9" font-family="sans-serif">${escapeXml(displayName)}</text>
    <text x="200" y="200" font-size="12" fill="white" text-anchor="middle" opacity="0.6" font-family="sans-serif">${escapeXml(displaySub)}</text>
  </svg>`;
  // Server-side: use Buffer for base64
  if (typeof Buffer !== 'undefined') {
    return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  }
  // Fallback: use btoa (client-side)
  return 'data:image/svg+xml;base64,' + btoaSafe(svg);
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function btoaSafe(s: string): string {
  try { return btoa(s); } catch { return ''; }
}

// Build the marketplace CSS — shared across all category pages
export function buildMarketplaceCSS(): string {
  return `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #fff; min-height: 100vh; }
  .nav { background: #111; border-bottom: 1px solid #222; padding: 16px 24px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; position: sticky; top: 0; z-index: 50; }
  .nav a { color: #ccc; text-decoration: none; font-size: 14px; font-weight: 600; }
  .nav a:hover { color: #fff; }
  .nav .logo { font-size: 20px; font-weight: 800; color: #fff; }
  .nav .signin { margin-left: auto; }
  .nav .signin a { background: #4a9eff; color: #fff; padding: 8px 16px; border-radius: 6px; }
  .layout { display: flex; max-width: 1400px; margin: 0 auto; gap: 0; }
  .filters { width: 240px; flex-shrink: 0; padding: 24px; border-right: 1px solid #222; }
  .filters h3 { font-size: 14px; font-weight: 700; margin: 0 0 12px; color: #fff; }
  .filter-group { margin-bottom: 24px; }
  .filter-group label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #aaa; cursor: pointer; padding: 4px 0; }
  .filter-group label:hover { color: #fff; }
  .filter-group input[type="checkbox"] { accent-color: #4a9eff; }
  .filter-group input[type="radio"] { accent-color: #4a9eff; }
  .main { flex: 1; min-width: 0; padding: 24px; }
  .hero { padding: 40px 24px 30px; text-align: center; max-width: 900px; margin: 0 auto; }
  .hero h1 { font-size: 42px; font-weight: 800; margin: 0 0 12px; line-height: 1.1; }
  .hero p { font-size: 16px; color: #999; line-height: 1.6; margin: 0; }
  .toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .toolbar .count { font-size: 14px; color: #888; }
  .toolbar .sort { margin-left: auto; }
  .toolbar select { background: #161616; color: #fff; border: 1px solid #333; padding: 8px 12px; border-radius: 6px; font-size: 13px; cursor: pointer; }
  .toolbar .search-within { flex: 1; min-width: 200px; }
  .toolbar input[type="search"] { width: 100%; background: #161616; color: #fff; border: 1px solid #333; padding: 8px 12px; border-radius: 6px; font-size: 13px; }
  .toolbar input[type="search"]:focus { border-color: #4a9eff; outline: none; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
  .card { background: #161616; border: 1px solid #2a2a2a; border-radius: 8px; overflow: hidden; cursor: pointer; transition: transform .15s, border-color .15s; text-decoration: none; color: inherit; display: block; }
  .card:hover { transform: translateY(-2px); border-color: #4a9eff; }
  .card-img { aspect-ratio: 4/3; overflow: hidden; background: #0d0d0d; position: relative; }
  .card-img img { width: 100%; height: 100%; object-fit: cover; }
  .card-body { padding: 12px; }
  .card-title { font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .card-cat { font-size: 11px; color: #888; margin-bottom: 4px; }
  .card-price { font-size: 12px; color: #4a9eff; font-weight: 600; }
  .featured-badge { position: absolute; top: 8px; left: 8px; background: #FFD700; color: #111; padding: 3px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; }
  .rating { color: #FFD700; font-size: 11px; }
  .empty { text-align: center; padding: 60px; color: #555; }
  .empty a { color: #4a9eff; }
  .pagination { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 32px 0; }
  .pagination button { background: #161616; color: #fff; border: 1px solid #333; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; }
  .pagination button:hover { border-color: #4a9eff; }
  .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
  .pagination .page-info { color: #888; font-size: 13px; padding: 0 8px; }
  .load-more { display: block; margin: 32px auto; background: #161616; color: #fff; border: 1px solid #333; padding: 12px 32px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; }
  .load-more:hover { border-color: #4a9eff; }
  .filter-toggle { display: none; background: #161616; color: #fff; border: 1px solid #333; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; margin-bottom: 16px; }
  .filter-reset { background: none; border: none; color: #4a9eff; font-size: 12px; cursor: pointer; padding: 4px 0; margin-bottom: 12px; }
  .filter-reset:hover { text-decoration: underline; }
  .info-page { max-width: 800px; margin: 0 auto; padding: 60px 24px; }
  .info-page h2 { font-size: 28px; margin: 30px 0 16px; }
  .info-page p { color: #999; line-height: 1.8; margin: 0 0 16px; }
  .cta-btn { display: inline-block; background: linear-gradient(135deg, #4a9eff, #2563eb); color: #fff; padding: 14px 36px; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 16px; margin: 20px 0; }
  footer { text-align: center; padding: 40px 24px; color: #555; font-size: 13px; border-top: 1px solid #222; }
  footer a { color: #999; text-decoration: none; margin: 0 8px; }
  @media (max-width: 768px) {
    .layout { flex-direction: column; }
    .filters { width: 100%; border-right: none; border-bottom: 1px solid #222; display: none; padding: 16px; }
    .filters.open { display: block; }
    .filter-toggle { display: inline-block; }
    .hero h1 { font-size: 28px; }
    .grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  }
  @media (max-width: 480px) {
    .grid { grid-template-columns: 1fr; }
  }
  `;
}

// Build the marketplace JavaScript — client-side filtering, sorting, pagination,
// search, and URL synchronization. This is injected into each category page.
export function buildMarketplaceJS(config: {
  category: string;
  checkoutUrl: string;
  loginUrl: string;
  registerUrl: string;
  categoryIcon: string;
}): string {
  const { category, checkoutUrl, loginUrl, registerUrl, categoryIcon } = config;
  return `
  var CHECKOUT_URL='${checkoutUrl}';
  var LOGIN_URL='${loginUrl}';
  var REGISTER_URL='${registerUrl}';
  var CATEGORY='${category}';
  var CATEGORY_ICON='${categoryIcon}';
  var PAGE_SIZE = 24;
  var currentPage = 1;
  var currentSort = 'featured';
  var currentSearch = '';
  var activeFilters = { subcategory: [], software: [], minRating: 0 };

  // ALL_ASSETS is embedded in the page as a JSON script tag
  var ALL_ASSETS = [];
  try {
    var dataEl = document.getElementById('asset-data');
    if (dataEl) ALL_ASSETS = JSON.parse(dataEl.textContent || '[]');
  } catch(e) { ALL_ASSETS = []; }

  // Generate same-origin SVG placeholder for an asset
  function placeholder(asset) {
    var name = asset.name || 'Asset';
    var sub = asset.subcategory || asset.category || '';
    var hash = 0;
    for (var i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    var hue1 = Math.abs(hash) % 360;
    var hue2 = (hue1 + 40) % 360;
    var c1 = 'hsl(' + hue1 + ', 45%, 25%)';
    var c2 = 'hsl(' + hue2 + ', 35%, 15%)';
    var dn = name.length > 28 ? name.substring(0, 25) + '...' : name;
    var ds = sub.length > 20 ? sub.substring(0, 17) + '...' : sub;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/></linearGradient></defs>' +
      '<rect width="400" height="300" fill="url(#g)"/>' +
      '<text x="200" y="130" font-size="48" text-anchor="middle" opacity="0.3">' + CATEGORY_ICON + '</text>' +
      '<text x="200" y="175" font-size="16" font-weight="600" fill="white" text-anchor="middle" opacity="0.9" font-family="sans-serif">' + dn.replace(/</g, '&lt;') + '</text>' +
      '<text x="200" y="200" font-size="12" fill="white" text-anchor="middle" opacity="0.6" font-family="sans-serif">' + ds.replace(/</g, '&lt;') + '</text>' +
      '</svg>';
    return 'data:image/svg+xml;base64,' + btoa(svg);
  }

  // Extract unique filter values from ALL_ASSETS
  function buildFilterOptions() {
    var subs = {}, softwares = {};
    ALL_ASSETS.forEach(function(a) {
      if (a.subcategory) subs[a.subcategory] = (subs[a.subcategory] || 0) + 1;
      if (a.software && Array.isArray(a.software)) a.software.forEach(function(s) { softwares[s] = (softwares[s] || 0) + 1; });
    });
    return { subcategories: Object.keys(subs).sort(), software: Object.keys(softwares).sort() };
  }

  // Render filter sidebar
  function renderFilters() {
    var opts = buildFilterOptions();
    var subHtml = opts.subcategories.map(function(s) {
      return '<label><input type="checkbox" data-filter="subcategory" value="' + s + '"' + (activeFilters.subcategory.indexOf(s) >= 0 ? ' checked' : '') + '> ' + s + '</label>';
    }).join('');
    var softHtml = opts.software.slice(0, 10).map(function(s) {
      return '<label><input type="checkbox" data-filter="software" value="' + s + '"' + (activeFilters.software.indexOf(s) >= 0 ? ' checked' : '') + '> ' + s + '</label>';
    }).join('');
    var ratingHtml = ['<label><input type="radio" name="minRating" value="0"' + (activeFilters.minRating === 0 ? ' checked' : '') + '> All ratings</label>'].
      concat([4.5, 4.0, 3.5].map(function(r) {
        return '<label><input type="radio" name="minRating" value="' + r + '"' + (activeFilters.minRating === r ? ' checked' : '') + '> ★ ' + r + '+</label>';
      })).join('');

    var sidebar = document.getElementById('filterSidebar');
    if (!sidebar) return;
    sidebar.innerHTML =
      '<button class="filter-reset" onclick="resetFilters()">Reset all filters</button>' +
      '<div class="filter-group"><h3>Subcategory</h3>' + (subHtml || '<p style="color:#555;font-size:12px;">No subcategories</p>') + '</div>' +
      '<div class="filter-group"><h3>Software</h3>' + (softHtml || '<p style="color:#555;font-size:12px;">No software filters</p>') + '</div>' +
      '<div class="filter-group"><h3>Minimum Rating</h3>' + ratingHtml + '</div>';

    // Wire filter events
    sidebar.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
      cb.addEventListener('change', function() {
        var f = this.getAttribute('data-filter');
        var v = this.value;
        if (this.checked) { if (activeFilters[f].indexOf(v) < 0) activeFilters[f].push(v); }
        else { activeFilters[f] = activeFilters[f].filter(function(x) { return x !== v; }); }
        currentPage = 1;
        syncUrl();
        renderGrid();
      });
    });
    sidebar.querySelectorAll('input[type="radio"]').forEach(function(r) {
      r.addEventListener('change', function() {
        activeFilters.minRating = parseFloat(this.value) || 0;
        currentPage = 1;
        syncUrl();
        renderGrid();
      });
    });
  }

  function resetFilters() {
    activeFilters = { subcategory: [], software: [], minRating: 0 };
    currentPage = 1;
    currentSearch = '';
    var sw = document.getElementById('searchWithin');
    if (sw) sw.value = '';
    syncUrl();
    renderFilters();
    renderGrid();
  }

  // Filter + sort + search the assets
  function getFilteredAssets() {
    var filtered = ALL_ASSETS.filter(function(a) {
      // Subcategory filter
      if (activeFilters.subcategory.length > 0 && activeFilters.subcategory.indexOf(a.subcategory) < 0) return false;
      // Software filter
      if (activeFilters.software.length > 0) {
        var sw = a.software || [];
        if (!Array.isArray(sw)) sw = [sw];
        var hasSw = activeFilters.software.some(function(s) { return sw.indexOf(s) >= 0; });
        if (!hasSw) return false;
      }
      // Rating filter
      if (activeFilters.minRating > 0 && (a.rating || 0) < activeFilters.minRating) return false;
      // Search within
      if (currentSearch) {
        var q = currentSearch.toLowerCase();
        var text = ((a.name || '') + ' ' + (a.description || '') + ' ' + (a.subcategory || '') + ' ' + (a.category || '') + ' ' + ((a.tags || []).join(' '))).toLowerCase();
        if (text.indexOf(q) < 0) return false;
      }
      return true;
    });
    // Sort
    switch (currentSort) {
      case 'newest': filtered.sort(function(a, b) { return (b.created_date || '').localeCompare(a.created_date || ''); }); break;
      case 'popular': filtered.sort(function(a, b) { return (b.downloads_count || 0) - (a.downloads_count || 0); }); break;
      case 'rating': filtered.sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); }); break;
      case 'name': filtered.sort(function(a, b) { return (a.name || '').localeCompare(b.name || ''); }); break;
      case 'price_low': filtered.sort(function(a, b) { return (a.price || 0) - (b.price || 0); }); break;
      case 'price_high': filtered.sort(function(a, b) { return (b.price || 0) - (a.price || 0); }); break;
      default: // featured
        filtered.sort(function(a, b) {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return (b.rating || 0) - (a.rating || 0);
        });
    }
    return filtered;
  }

  // Render the asset grid with pagination
  function renderGrid() {
    var grid = document.getElementById('assetGrid');
    var countEl = document.getElementById('resultCount');
    var paginationEl = document.getElementById('pagination');
    if (!grid) return;

    var filtered = getFilteredAssets();
    var total = filtered.length;
    var totalPages = Math.ceil(total / PAGE_SIZE);
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
    var start = (currentPage - 1) * PAGE_SIZE;
    var pageItems = filtered.slice(start, start + PAGE_SIZE);

    if (countEl) countEl.textContent = total + ' result' + (total !== 1 ? 's' : '');

    if (total === 0) {
      grid.innerHTML = '<div class="empty">No assets match your filters. <a href="#" onclick="resetFilters();return false;">Reset filters</a></div>';
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    grid.innerHTML = pageItems.map(function(a) {
      var price = a.license_type === 'subscription' ? 'Included' : ('$' + (a.price || 0));
      var badge = a.featured ? '<div class="featured-badge">FEATURED</div>' : '';
      var rating = a.rating ? '<div class="rating">★ ' + a.rating + (a.rating_count ? ' (' + a.rating_count + ')' : '') + '</div>' : '';
      var img = placeholder(a);
      var safeName = (a.name || '').replace(/"/g, '&quot;');
      return '<div class="card" data-asset-id="' + a.id + '" data-asset-name="' + safeName + '">' +
        '<div class="card-img">' + badge + '<img src="' + img + '" alt="' + safeName + '" loading="lazy">' +
        '</div><div class="card-body"><div class="card-title">' + (a.name || '') + '</div>' +
        '<div class="card-cat">' + (a.subcategory || a.category || '') + '</div>' + rating +
        '<div class="card-price">' + price + '</div></div></div>';
    }).join('');

    // Wire checkout clicks
    grid.querySelectorAll('[data-asset-id]').forEach(function(card) {
      card.addEventListener('click', function() {
        var aid = this.getAttribute('data-asset-id');
        var aname = this.getAttribute('data-asset-name');
        if (window.self !== window.top) { alert('Checkout works only from the published app. Please open this site in a new tab.'); return; }
        fetch(CHECKOUT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ name: aname, amount: 29, quantity: 1, type: 'ai_tool', asset_id: aid }] }) })
          .then(function(r) { return r.json(); })
          .then(function(j) { if (j.url) window.location.href = j.url; else alert('Could not start checkout.'); })
          .catch(function() { alert('Checkout error.'); });
      });
    });

    // Render pagination
    if (paginationEl) {
      if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }
      var html = '<button onclick="goPage(' + (currentPage - 1) + ')"' + (currentPage <= 1 ? ' disabled' : '') + '>← Prev</button>';
      html += '<span class="page-info">Page ' + currentPage + ' of ' + totalPages + '</span>';
      html += '<button onclick="goPage(' + (currentPage + 1) + ')"' + (currentPage >= totalPages ? ' disabled' : '') + '>Next →</button>';
      paginationEl.innerHTML = html;
    }
  }

  window.goPage = function(p) { currentPage = p; syncUrl(); renderGrid(); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // URL synchronization
  function syncUrl() {
    var params = new URLSearchParams();
    if (currentSort !== 'featured') params.set('sort', currentSort);
    if (currentPage > 1) params.set('page', currentPage);
    if (currentSearch) params.set('q', currentSearch);
    activeFilters.subcategory.forEach(function(s) { params.append('sub', s); });
    activeFilters.software.forEach(function(s) { params.append('sw', s); });
    if (activeFilters.minRating > 0) params.set('rating', activeFilters.minRating);
    var qs = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (qs ? '?' + qs : ''));
  }

  function loadUrlState() {
    var params = new URLSearchParams(window.location.search);
    currentSort = params.get('sort') || 'featured';
    currentPage = parseInt(params.get('page') || '1', 10) || 1;
    currentSearch = params.get('q') || '';
    activeFilters.subcategory = params.getAll('sub');
    activeFilters.software = params.getAll('sw');
    activeFilters.minRating = parseFloat(params.get('rating') || '0') || 0;
    var sw = document.getElementById('searchWithin');
    if (sw) sw.value = currentSearch;
    var sortSel = document.getElementById('sortSelect');
    if (sortSel) sortSel.value = currentSort;
  }

  // Initialize
  if (ALL_ASSETS.length > 0) {
    loadUrlState();
    renderFilters();
    renderGrid();
  }

  // Sort dropdown
  var sortSel = document.getElementById('sortSelect');
  if (sortSel) sortSel.addEventListener('change', function() { currentSort = this.value; currentPage = 1; syncUrl(); renderGrid(); });

  // Search within
  var sw = document.getElementById('searchWithin');
  if (sw) {
    var debounce;
    sw.addEventListener('input', function() { clearTimeout(debounce); var v = this.value.trim(); debounce = setTimeout(function() { currentSearch = v; currentPage = 1; syncUrl(); renderGrid(); }, 300); });
  }

  // Mobile filter toggle
  var ft = document.getElementById('filterToggle');
  if (ft) ft.addEventListener('click', function() { var sb = document.getElementById('filterSidebar'); sb.classList.toggle('open'); });

  // Auth link interceptor
  (function() {
    var authPat = /(sign-in|signin|login|sign-up|signup|register|join|my-account|account|profile)/i;
    var regPat = /(sign-up|signup|register|join|create-account)/i;
    function rewrite(el) {
      if (!el || !el.href || el.href.indexOf('autoleads') >= 0) return;
      var t = (el.textContent || '').toLowerCase();
      if (authPat.test(t) || authPat.test(el.href)) el.href = regPat.test(t) ? REGISTER_URL : LOGIN_URL;
    }
    document.addEventListener('click', function(e) {
      var el = e.target.closest('a,button'); if (!el) return;
      if (el.href && el.href.indexOf('autoleads') >= 0) return;
      var t = (el.textContent || '').toLowerCase();
      if (authPat.test(t)) { e.preventDefault(); e.stopPropagation(); window.location.href = regPat.test(t) ? REGISTER_URL : LOGIN_URL; }
    }, true);
    document.querySelectorAll('a[href]').forEach(rewrite);
    setTimeout(function() { document.querySelectorAll('a[href]').forEach(rewrite); }, 2000);
  })();
  `;
}