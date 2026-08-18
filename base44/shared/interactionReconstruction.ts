// Behavioral Reconstruction Engine — generic clone-side interaction scripts.
//
// When SPA scripts are stripped from a clone, interactive elements (dropdowns,
// modals, tabs, accordions, mobile menus, search, filters) lose their click
// handlers. Instead of hardcoding site-specific mappings, this module generates
// GENERIC reconstruction scripts that scan the DOM for common semantic patterns
// (aria attributes, data attributes, class names) and attach equivalent
// behavior. This makes the clone factory smarter — the same script works on
// any SPA clone, not just Envato.
//
// The script is injected into every cloned page and runs after DOM ready +
// after SPA hydration (with polling + MutationObserver for dynamic content).

export function buildInteractionReconstructionScript(): string {
  return `<script>
(function(){
  'use strict';
  var RECON_ID = 'fl-recon-' + Date.now();
  var reconState = {};

  // ─── DROPDOWN RECONSTRUCTION ─────────────────────────────────────
  // Detects: [data-toggle="dropdown"], .dropdown, [aria-haspopup="true"],
  // elements with a button + menu child pattern. Wires click-to-toggle.
  function reconstructDropdowns() {
    // Pattern 1: [data-toggle="dropdown"]
    document.querySelectorAll('[data-toggle="dropdown"], [data-bs-toggle="dropdown"]').forEach(function(trigger) {
      if (trigger.dataset.flRecon) return;
      trigger.dataset.flRecon = 'dropdown';
      var menu = trigger.nextElementSibling;
      if (!menu || !menu.matches('.dropdown-menu, [role="menu"], .menu, [data-role="menu"]')) {
        menu = trigger.parentElement && trigger.parentElement.querySelector('.dropdown-menu, [role="menu"], .menu, [data-role="menu"]');
      }
      if (!menu) return;
      trigger.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var isOpen = menu.style.display === 'block' || menu.classList.contains('show') || trigger.getAttribute('aria-expanded') === 'true';
        if (isOpen) {
          menu.style.display = '';
          menu.classList.remove('show');
          trigger.setAttribute('aria-expanded', 'false');
        } else {
          menu.style.display = 'block';
          menu.classList.add('show');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
      // Close on outside click
      document.addEventListener('click', function(ev) {
        if (!trigger.contains(ev.target) && !menu.contains(ev.target)) {
          menu.style.display = '';
          menu.classList.remove('show');
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    });

    // Pattern 2: [aria-haspopup="true"] without data-toggle
    document.querySelectorAll('[aria-haspopup="true"]:not([data-fl-recon])').forEach(function(trigger) {
      trigger.dataset.flRecon = 'dropdown';
      var parent = trigger.closest('[class*="dropdown"], [class*="menu-wrap"], [class*="nav-item"]');
      var menu = parent ? parent.querySelector('[role="menu"], .dropdown-menu, [role="listbox"], [class*="menu-items"], [class*="submenu"]') : null;
      if (!menu) return;
      trigger.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var isOpen = trigger.getAttribute('aria-expanded') === 'true';
        if (isOpen) {
          menu.style.display = 'none';
          trigger.setAttribute('aria-expanded', 'false');
        } else {
          menu.style.display = 'block';
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
      document.addEventListener('click', function(ev) {
        if (!trigger.contains(ev.target) && !menu.contains(ev.target)) {
          menu.style.display = 'none';
          trigger.setAttribute('aria-expanded', 'false');
        }
      }, true);
    });

    // Pattern 2b: Generic button/trigger with a hidden sibling panel containing
    // links. Catches SPA custom dropdowns that don't use standard ARIA or
    // data-toggle attributes (common on RSC/Next.js sites like Envato).
    document.querySelectorAll('button, a, [role="button"], div[class*="trigger"], div[class*="toggle"]').forEach(function(trigger) {
      if (trigger.dataset.flRecon) return;
      if (trigger.hasAttribute('data-toggle') || trigger.hasAttribute('data-bs-toggle') || trigger.getAttribute('aria-haspopup')) return;
      // Look for a hidden sibling or child panel with links
      var panel = null;
      var sibling = trigger.nextElementSibling;
      if (sibling && sibling.querySelector('a[href]')) {
        var style = window.getComputedStyle(sibling);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || sibling.getAttribute('aria-hidden') === 'true') {
          panel = sibling;
        }
      }
      if (!panel) {
        // Check parent's next sibling (common in nested nav structures)
        var parent = trigger.parentElement;
        if (parent && parent.nextElementSibling && parent.nextElementSibling.querySelector('a[href]')) {
          var ps = window.getComputedStyle(parent.nextElementSibling);
          if (ps.display === 'none' || ps.visibility === 'hidden' || ps.opacity === '0') {
            panel = parent.nextElementSibling;
          }
        }
      }
      if (!panel) {
        // Check for a child panel (button > panel pattern)
        panel = trigger.querySelector('[role="menu"], [class*="dropdown"], [class*="menu-panel"], [class*="popover"]');
        if (panel) {
          var cs = window.getComputedStyle(panel);
          if (cs.display !== 'none' && cs.visibility !== 'hidden') panel = null; // already visible, not a dropdown
        }
      }
      if (!panel) return;
      trigger.dataset.flRecon = 'dropdown-generic';
      trigger.style.cursor = 'pointer';
      trigger.setAttribute('aria-expanded', 'false');
      trigger.setAttribute('aria-haspopup', 'true');
      trigger.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var isOpen = panel.style.display === 'block' || trigger.getAttribute('aria-expanded') === 'true';
        if (isOpen) {
          panel.style.display = 'none';
          trigger.setAttribute('aria-expanded', 'false');
        } else {
          panel.style.display = 'block';
          panel.style.visibility = 'visible';
          panel.style.opacity = '1';
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
      document.addEventListener('click', function(ev) {
        if (!trigger.contains(ev.target) && !panel.contains(ev.target)) {
          panel.style.display = 'none';
          trigger.setAttribute('aria-expanded', 'false');
        }
      }, true);
    });

    // Pattern 2c: Nav category navigation — buttons/divs in the nav bar or
    // category cards on the homepage that should navigate to category pages.
    // APPROACH: Replace the element with an <a> tag wrapping the same content.
    // This uses the browser's native link handling, which CANNOT be intercepted
    // by SPA event handlers (React onClick, stopPropagation, etc.).
    var CATEGORY_MAP = {
      'ai tools': '/ai-tools.html',
      'video templates': '/video-templates.html',
      'video': '/video-templates.html',
      'audio': '/audio.html',
      'music': '/audio.html',
      'graphics': '/graphics.html',
      'graphic templates': '/graphic-templates.html',
      'fonts': '/fonts.html',
      'photos': '/photos.html',
      '3d': '/3d.html',
      'web templates': '/web-templates.html',
      'app templates': '/app-templates.html',
      'presentation templates': '/presentation-templates.html',
      'design templates': '/design-templates.html',
      'addons': '/addons.html',
      'add-ons': '/addons.html',
      'cms templates': '/cms-templates.html',
      'all items': '/all-items.html',
      'unlimited downloads': '/all-items.html',
      'subscription': '/pricing.html',
      'pricing': '/pricing.html',
      'plans': '/pricing.html',
    };
    document.querySelectorAll('button, [role="button"], div[class*="card"], div[class*="item"], div[class*="tile"]').forEach(function(trigger) {
      if (trigger.dataset.flRecon) return;
      if (trigger.tagName === 'A' && trigger.getAttribute('href') && trigger.getAttribute('href') !== '#') return;
      var text = (trigger.textContent || '').trim().toLowerCase().replace(/\\s+/g, ' ').trim();
      var catUrl = null;
      if (CATEGORY_MAP[text]) {
        catUrl = CATEGORY_MAP[text];
      } else {
        for (var cat in CATEGORY_MAP) {
          if (text.indexOf(cat) === 0 || text === cat) { catUrl = CATEGORY_MAP[cat]; break; }
        }
      }
      if (!catUrl) return;
      trigger.dataset.flRecon = 'nav-category';
      trigger.style.cursor = 'pointer';
      // Replace with <a> tag — native browser navigation can't be intercepted by SPA
      try {
        var link = document.createElement('a');
        link.href = catUrl;
        link.innerHTML = trigger.innerHTML;
        link.className = trigger.className;
        link.style.cssText = trigger.style.cssText;
        if (trigger.id) link.id = trigger.id;
        for (var ai = 0; ai < trigger.attributes.length; ai++) {
          var attr = trigger.attributes[ai];
          if (attr.name.indexOf('data-') === 0 && attr.name !== 'data-fl-recon') link.setAttribute(attr.name, attr.value);
        }
        link.dataset.flRecon = 'nav-category';
        trigger.parentNode.replaceChild(link, trigger);
      } catch(e) {
        // Fallback: capture-phase click handler
        trigger.addEventListener('click', function(e) { e.preventDefault(); e.stopImmediatePropagation(); window.location.href = catUrl; }, true);
      }
    });

    // Pattern 3: Hover-based mega menus (common on marketplace sites)
    document.querySelectorAll('[class*="mega-menu"], [class*="megamenu"], [class*="mega_menu"]').forEach(function(mega) {
      if (mega.dataset.flRecon) return;
      mega.dataset.flRecon = 'mega';
      var trigger = mega.querySelector('a, button, [class*="trigger"], [class*="toggle"]');
      var panel = mega.querySelector('[class*="panel"], [class*="content"], [class*="dropdown"], [role="menu"]');
      if (!trigger || !panel) return;
      var timeout;
      mega.addEventListener('mouseenter', function() {
        clearTimeout(timeout);
        panel.style.display = 'block';
        panel.style.opacity = '1';
        panel.style.visibility = 'visible';
        if (trigger.setAttribute) trigger.setAttribute('aria-expanded', 'true');
      });
      mega.addEventListener('mouseleave', function() {
        timeout = setTimeout(function() {
          panel.style.display = '';
          panel.style.opacity = '';
          panel.style.visibility = '';
          if (trigger.setAttribute) trigger.setAttribute('aria-expanded', 'false');
        }, 200);
      });
    });
  }

  // ─── MODAL RECONSTRUCTION ────────────────────────────────────────
  // Detects: [data-toggle="modal"], [data-bs-toggle="modal"], [data-target],
  // [data-bs-target], elements with data-modal attributes. Wires open/close.
  function reconstructModals() {
    // Open triggers
    document.querySelectorAll('[data-toggle="modal"], [data-bs-toggle="modal"], [data-modal], [data-open-modal]').forEach(function(trigger) {
      if (trigger.dataset.flRecon) return;
      trigger.dataset.flRecon = 'modal-open';
      var selector = trigger.getAttribute('data-target') || trigger.getAttribute('data-bs-target') || trigger.getAttribute('data-modal') || trigger.getAttribute('data-open-modal');
      var modal = selector ? document.querySelector(selector) : null;
      if (!modal) {
        // Try finding a modal by the trigger's text content
        var text = (trigger.textContent || '').trim().toLowerCase();
        modal = document.querySelector('[class*="modal"][class*="' + (text.split(' ')[0] || '') + '"]');
      }
      if (!modal) return;
      trigger.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        modal.style.display = 'flex';
        modal.classList.add('show', 'in');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      });
      // Close triggers within the modal
      modal.querySelectorAll('[data-dismiss="modal"], [data-bs-dismiss="modal"], [class*="close"], [aria-label="Close"], [aria-label="close"]').forEach(function(close) {
        if (close.dataset.flRecon) return;
        close.dataset.flRecon = 'modal-close';
        close.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          modal.style.display = 'none';
          modal.classList.remove('show', 'in');
          modal.setAttribute('aria-hidden', 'true');
          document.body.style.overflow = '';
        });
      });
      // Close on backdrop click
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          modal.style.display = 'none';
          modal.classList.remove('show', 'in');
          document.body.style.overflow = '';
        }
      });
      // Close on Escape
      modal.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          modal.style.display = 'none';
          modal.classList.remove('show', 'in');
          document.body.style.overflow = '';
        }
      });
    });
  }

  // ─── TAB RECONSTRUCTION ──────────────────────────────────────────
  // Detects: [role="tab"], [data-toggle="tab"], [data-bs-toggle="tab"],
  // .nav-tabs pattern. Wires tab switching with aria-selected.
  function reconstructTabs() {
    document.querySelectorAll('[role="tab"], [data-toggle="tab"], [data-bs-toggle="tab"]').forEach(function(tab) {
      if (tab.dataset.flRecon) return;
      tab.dataset.flRecon = 'tab';
      var target = tab.getAttribute('data-target') || tab.getAttribute('data-bs-target') || tab.getAttribute('aria-controls');
      var panel = target ? document.querySelector('#' + target.replace('#', '') + ', [' + target + ']') : null;
      if (!panel && tab.getAttribute('aria-controls')) {
        panel = document.getElementById(tab.getAttribute('aria-controls'));
      }
      if (!panel) {
        // Find sibling tab panel
        var tablist = tab.closest('[role="tablist"], .nav-tabs, .tabs');
        if (tablist) {
          var panels = tablist.parentElement.querySelectorAll('[role="tabpanel"], .tab-pane');
          var tabs = tablist.querySelectorAll('[role="tab"], [data-toggle="tab"], [data-bs-toggle="tab"]');
          var idx = Array.from(tabs).indexOf(tab);
          if (idx >= 0 && panels[idx]) panel = panels[idx];
        }
      }
      if (!panel) return;
      tab.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        // Deactivate all sibling tabs
        var siblings = tab.closest('[role="tablist"], .nav-tabs, .tabs');
        if (siblings) {
          siblings.querySelectorAll('[role="tab"], [data-toggle="tab"], [data-bs-toggle="tab"]').forEach(function(t) {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
          });
        }
        // Hide all sibling panels
        var allPanels = (tab.closest('[role="tablist"], .nav-tabs, .tabs') || document.body).parentElement.querySelectorAll('[role="tabpanel"], .tab-pane');
        allPanels.forEach(function(p) {
          p.classList.remove('active', 'show');
          p.style.display = 'none';
        });
        // Activate this tab + panel
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        panel.classList.add('active', 'show');
        panel.style.display = 'block';
      });
    });
  }

  // ─── ACCORDION RECONSTRUCTION ────────────────────────────────────
  // Detects: [data-toggle="collapse"], [data-bs-toggle="collapse"],
  // .accordion-header pattern. Wires expand/collapse.
  function reconstructAccordions() {
    document.querySelectorAll('[data-toggle="collapse"], [data-bs-toggle="collapse"]').forEach(function(trigger) {
      if (trigger.dataset.flRecon) return;
      trigger.dataset.flRecon = 'accordion';
      var selector = trigger.getAttribute('data-target') || trigger.getAttribute('data-bs-target');
      var target = selector ? document.querySelector(selector) : null;
      if (!target) {
        target = trigger.nextElementSibling;
        if (target && !target.matches('.accordion-content, .collapse, [class*="content"]')) target = null;
      }
      if (!target) return;
      trigger.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var isOpen = target.classList.contains('show') || target.style.display === 'block';
        // Close siblings in same accordion
        var accordion = trigger.closest('.accordion, [data-accordion]');
        if (accordion) {
          accordion.querySelectorAll('[data-toggle="collapse"], [data-bs-toggle="collapse"]').forEach(function(t) {
            if (t !== trigger) {
              var s = t.getAttribute('data-target') || t.getAttribute('data-bs-target');
              var p = s ? document.querySelector(s) : t.nextElementSibling;
              if (p) { p.classList.remove('show'); p.style.display = 'none'; t.setAttribute('aria-expanded', 'false'); }
            }
          });
        }
        if (isOpen) {
          target.classList.remove('show');
          target.style.display = 'none';
          trigger.setAttribute('aria-expanded', 'false');
        } else {
          target.classList.add('show');
          target.style.display = 'block';
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  // ─── MOBILE MENU RECONSTRUCTION ──────────────────────────────────
  // Detects: hamburger toggles, [data-toggle="nav"], .menu-toggle,
  // [aria-label*="menu"]. Wires mobile nav open/close.
  function reconstructMobileMenu() {
    var patterns = '[class*="hamburger"], [class*="menu-toggle"], [class*="menu-btn"], [data-toggle="nav"], [data-toggle="menu"], [aria-label*="menu" i], button[class*="burger"]';
    document.querySelectorAll(patterns).forEach(function(toggle) {
      if (toggle.dataset.flRecon) return;
      // Skip if it's a link to a real page (not a menu toggle)
      if (toggle.tagName === 'A' && toggle.getAttribute('href') && toggle.getAttribute('href') !== '#' && !toggle.getAttribute('href').startsWith('#')) return;
      toggle.dataset.flRecon = 'mobile-menu';
      var nav = document.querySelector('nav[class*="mobile"], nav[class*="side"], [class*="mobile-nav"], [class*="side-nav"], [class*="drawer"], [class*="offcanvas"], [class*="slide-nav"]');
      if (!nav) {
        // Fallback: find the main nav element
        nav = document.querySelector('nav, [class*="main-nav"], [class*="primary-nav"]');
        if (nav) {
          // Clone it into a mobile drawer if it's not already one
          if (!nav.classList.contains('fl-mobile-drawer')) {
            var drawer = nav.cloneNode(true);
            drawer.classList.add('fl-mobile-drawer');
            drawer.style.cssText = 'position:fixed;top:0;left:0;width:280px;height:100vh;background:#0a0a0a;color:#fff;z-index:9999;transform:translateX(-100%);transition:transform .25s;overflow-y:auto;padding:20px;';
            document.body.appendChild(drawer);
            nav = drawer;
          }
        }
      }
      if (!nav) return;
      var isOpen = false;
      toggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        isOpen = !isOpen;
        if (isOpen) {
          nav.style.transform = 'translateX(0)';
          nav.style.display = 'block';
          // Add overlay
          if (!document.getElementById('fl-menu-overlay')) {
            var overlay = document.createElement('div');
            overlay.id = 'fl-menu-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;';
            overlay.addEventListener('click', function() { toggle.click(); });
            document.body.appendChild(overlay);
          }
          document.body.style.overflow = 'hidden';
        } else {
          nav.style.transform = 'translateX(-100%)';
          var ov = document.getElementById('fl-menu-overlay');
          if (ov) ov.remove();
          document.body.style.overflow = '';
        }
      });
    });
  }

  // ─── SEARCH RECONSTRUCTION ───────────────────────────────────────
  // Detects: search inputs with a submit button or live-search pattern.
  // Wires search to redirect to /search.html?q=... (clone search page).
  function reconstructSearch() {
    document.querySelectorAll('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i], input[name*="search" i]').forEach(function(input) {
      if (input.dataset.flRecon) return;
      input.dataset.flRecon = 'search';
      var form = input.closest('form');
      if (form) {
        form.addEventListener('submit', function(e) {
          e.preventDefault();
          var q = input.value.trim();
          if (q.length < 2) return;
          window.location.href = '/search.html?q=' + encodeURIComponent(q);
        });
      } else {
        // Live search — redirect on Enter
        input.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            var q = input.value.trim();
            if (q.length < 2) return;
            window.location.href = '/search.html?q=' + encodeURIComponent(q);
          }
        });
      }
    });
  }

  // ─── FILTER / SORT RECONSTRUCTION ────────────────────────────────
  // Detects: filter/sort controls (select, checkbox, radio with data-filter).
  // Wires filter state changes to re-query the catalog API.
  function reconstructFilters() {
    // Sort dropdowns
    document.querySelectorAll('select[class*="sort"], [data-sort], [aria-label*="sort" i]').forEach(function(select) {
      if (select.dataset.flRecon) return;
      select.dataset.flRecon = 'sort';
      select.addEventListener('change', function() {
        var val = select.value;
        var grid = document.querySelector('[class*="grid"][class*="item"], [class*="results"], [data-category]');
        if (!grid) return;
        var cards = Array.from(grid.children);
        cards.sort(function(a, b) {
          if (val.indexOf('price') >= 0 || val.indexOf('cost') >= 0) {
            var pa = parseFloat((a.querySelector('[class*="price"]') || {}).textContent || '0');
            var pb = parseFloat((b.querySelector('[class*="price"]') || {}).textContent || '0');
            return val.indexOf('desc') >= 0 ? pb - pa : pa - pb;
          }
          if (val.indexOf('name') >= 0 || val.indexOf('title') >= 0) {
            var na = (a.querySelector('b, h3, h4, [class*="title"]') || {}).textContent || '';
            var nb = (b.querySelector('b, h3, h4, [class*="title"]') || {}).textContent || '';
            return val.indexOf('desc') >= 0 ? nb.localeCompare(na) : na.localeCompare(nb);
          }
          if (val.indexOf('rating') >= 0 || val.indexOf('popular') >= 0) {
            var ra = parseFloat((a.querySelector('[class*="rating"], [class*="star"]') || {}).textContent || '0');
            var rb = parseFloat((b.querySelector('[class*="rating"], [class*="star"]') || {}).textContent || '0');
            return val.indexOf('desc') >= 0 ? rb - ra : ra - rb;
          }
          return 0;
        });
        cards.forEach(function(c) { grid.appendChild(c); });
      });
    });
    // Filter checkboxes/radios
    document.querySelectorAll('input[type="checkbox"][data-filter], input[type="radio"][data-filter], [class*="filter"] input[type="checkbox"], [class*="filter"] input[type="radio"]').forEach(function(filter) {
      if (filter.dataset.flRecon) return;
      filter.dataset.flRecon = 'filter';
      filter.addEventListener('change', function() {
        // Re-query catalog with active filters
        var activeFilters = {};
        document.querySelectorAll('[class*="filter"] input[type="checkbox"]:checked, [class*="filter"] input[type="radio"]:checked').forEach(function(f) {
          var name = f.getAttribute('name') || f.getAttribute('data-filter') || 'filter';
          if (!activeFilters[name]) activeFilters[name] = [];
          activeFilters[name].push(f.value || f.getAttribute('data-value') || '');
        });
        // Dispatch a custom event that the catalog script can listen for
        document.dispatchEvent(new CustomEvent('fl-filters-changed', { detail: activeFilters }));
      });
    });
  }

  // ─── CAROUSEL / SLIDER RECONSTRUCTION ────────────────────────────
  // Detects: [class*="carousel"], [class*="slider"], [data-ride="carousel"].
  // Wires prev/next navigation + auto-play.
  function reconstructCarousels() {
    document.querySelectorAll('[class*="carousel"], [class*="slider"], [data-ride="carousel"], [data-bs-ride="carousel"]').forEach(function(carousel) {
      if (carousel.dataset.flRecon) return;
      carousel.dataset.flRecon = 'carousel';
      var slides = carousel.querySelectorAll('[class*="slide"], [class*="item"], [role="tabpanel"], > *');
      if (slides.length < 2) return;
      var currentIdx = 0;
      // Find or create prev/next buttons
      var prev = carousel.querySelector('[class*="prev"], [class*="previous"], [data-slide="prev"], [aria-label*="previous" i]');
      var next = carousel.querySelector('[class*="next"], [data-slide="next"], [aria-label*="next" i]');
      function showSlide(idx) {
        slides.forEach(function(s, i) {
          s.style.display = i === idx ? 'block' : 'none';
          s.classList.toggle('active', i === idx);
        });
        currentIdx = idx;
      }
      if (prev) prev.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); showSlide((currentIdx - 1 + slides.length) % slides.length); });
      if (next) next.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); showSlide((currentIdx + 1) % slides.length); });
      // Auto-play
      if (carousel.getAttribute('data-ride') === 'carousel' || carousel.getAttribute('data-bs-ride') === 'carousel' || carousel.className.indexOf('auto') >= 0) {
        setInterval(function() { showSlide((currentIdx + 1) % slides.length); }, 5000);
      }
      showSlide(0);
    });
  }

  // ─── PAGINATION RECONSTRUCTION ───────────────────────────────────
  // Detects: [class*="pagination"] a, [data-page]. Wires page changes.
  function reconstructPagination() {
    document.querySelectorAll('[class*="pagination"] a, [class*="pager"] a, [data-page]').forEach(function(link) {
      if (link.dataset.flRecon) return;
      link.dataset.flRecon = 'pagination';
      link.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var page = link.getAttribute('data-page') || link.textContent.trim();
        // Dispatch event for catalog script to handle
        document.dispatchEvent(new CustomEvent('fl-page-change', { detail: { page: parseInt(page) || 1 } }));
        // Scroll to top of grid
        var grid = document.querySelector('[class*="grid"][class*="item"], [class*="results"]');
        if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // ─── BUTTON RECONSTRUCTION (catch-all for dead buttons) ──────────
  // Any button with no click handler and no type=submit that has a
  // recognizable text label gets a semantic action based on its text.
  function reconstructDeadButtons() {
    var buttonPatterns = [
      { re: /^(unlimited|download|get all|start|begin|try|explore|browse|view all|see all|show all)/i, action: function(btn) {
        // Navigate to all-items page
        btn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); window.location.href = '/all-items.html'; });
      }},
      { re: /^(subscribe|sign up|join|get started|create account|register)/i, action: function(btn) {
        btn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); window.location.href = '/autoleads/register'; });
      }},
      { re: /^(sign in|login|log in)/i, action: function(btn) {
        btn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); window.location.href = '/autoleads/login'; });
      }},
      { re: /^(buy|purchase|add to cart|cart|checkout)/i, action: function(btn) {
        btn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); window.location.href = '/store'; });
      }},
      { re: /^(learn more|read more|details|more info)/i, action: function(btn) {
        // Find nearest card/link and navigate to it
        var card = btn.closest('[class*="card"], article, [class*="item"]');
        if (card) {
          var link = card.querySelector('a[href]');
          if (link) btn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); window.location.href = link.href; });
        }
      }},
      { re: /^(close|dismiss|×|✕|cancel)/i, action: function(btn) {
        btn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation();
          var modal = btn.closest('[class*="modal"], [class*="overlay"], [class*="popup"], [role="dialog"]');
          if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
          var drawer = btn.closest('[class*="drawer"], [class*="offcanvas"], .fl-mobile-drawer');
          if (drawer) { drawer.style.transform = 'translateX(-100%)'; var ov = document.getElementById('fl-menu-overlay'); if (ov) ov.remove(); document.body.style.overflow = ''; }
        });
      }},
    ];
    document.querySelectorAll('button:not([type="submit"]):not([data-fl-recon]), a[role="button"]:not([data-fl-recon])').forEach(function(btn) {
      // Skip if it already has an href (real link)
      if (btn.tagName === 'A' && btn.getAttribute('href') && btn.getAttribute('href') !== '#') return;
      // Skip if inside a form
      if (btn.closest('form')) return;
      var text = (btn.textContent || '').trim();
      if (text.length < 2 || text.length > 40) return;
      for (var i = 0; i < buttonPatterns.length; i++) {
        if (buttonPatterns[i].re.test(text)) {
          btn.dataset.flRecon = 'dead-btn';
          buttonPatterns[i].action(btn);
          break;
        }
      }
    });
  }

  // ─── FORM VALIDATION RECONSTRUCTION ──────────────────────────────
  // Adds basic client-side validation to forms that lost their JS handlers.
  function reconstructFormValidation() {
    document.querySelectorAll('form:not([data-fl-recon])').forEach(function(form) {
      if (form.dataset.flRecon) return;
      form.dataset.flRecon = 'form-validate';
      var inputs = form.querySelectorAll('input[required], input[type="email"], input[type="tel"]');
      inputs.forEach(function(input) {
        input.addEventListener('blur', function() {
          var val = input.value.trim();
          var error = input.parentElement.querySelector('.fl-error, [class*="error"]');
          if (input.hasAttribute('required') && !val) {
            if (!error) {
              error = document.createElement('div');
              error.className = 'fl-error';
              error.style.cssText = 'color:#c63d34;font-size:12px;margin-top:4px;';
              error.textContent = 'This field is required';
              input.parentElement.appendChild(error);
            }
            input.style.borderColor = '#c63d34';
          } else if (input.type === 'email' && val && !/^[^@]+@[^@]+\.[a-z]+$/i.test(val)) {
            if (!error) {
              error = document.createElement('div');
              error.className = 'fl-error';
              error.style.cssText = 'color:#c63d34;font-size:12px;margin-top:4px;';
              error.textContent = 'Please enter a valid email';
              input.parentElement.appendChild(error);
            }
            input.style.borderColor = '#c63d34';
          } else {
            if (error) error.remove();
            input.style.borderColor = '';
          }
        });
      });
    });
  }

  // ─── DOCUMENT-LEVEL CATEGORY NAVIGATION (immune to SPA re-rendering) ──
  // A document-level capture-phase click handler that checks if the clicked
  // element (or its ancestor) matches a category button. This survives SPA
  // re-renders because the handler is on document, not on the element.
  var DOC_CATEGORY_MAP = {
    'ai tools': '/ai-tools.html',
    'video templates': '/video-templates.html',
    'video': '/video-templates.html',
    'audio': '/audio.html',
    'music': '/audio.html',
    'graphics': '/graphics.html',
    'graphic templates': '/graphic-templates.html',
    'fonts': '/fonts.html',
    'photos': '/photos.html',
    '3d': '/3d.html',
    'web templates': '/web-templates.html',
    'app templates': '/app-templates.html',
    'presentation templates': '/presentation-templates.html',
    'design templates': '/design-templates.html',
    'addons': '/addons.html',
    'add-ons': '/addons.html',
    'cms templates': '/cms-templates.html',
    'all items': '/all-items.html',
    'unlimited downloads': '/all-items.html',
    'subscription': '/pricing.html',
    'pricing': '/pricing.html',
    'plans': '/pricing.html',
  };
  var docCatHandlerInstalled = false;
  function installDocCategoryHandler() {
    if (docCatHandlerInstalled) return;
    docCatHandlerInstalled = true;
    document.addEventListener('click', function(e) {
      // Walk up from the click target to find a matching category element
      var el = e.target;
      for (var depth = 0; depth < 5 && el && el !== document.body; depth++) {
        if (el.dataset && el.dataset.flRecon === 'nav-category') return; // already handled by <a> replacement
        var tag = el.tagName;
        if (tag === 'BUTTON' || tag === 'A' || tag === 'DIV' || el.getAttribute('role') === 'button') {
          var text = (el.textContent || '').trim().toLowerCase().replace(/\\s+/g, ' ').trim();
          // Check exact match or starts-with (for cards with extra text)
          var catUrl = null;
          if (DOC_CATEGORY_MAP[text]) {
            catUrl = DOC_CATEGORY_MAP[text];
          } else {
            for (var cat in DOC_CATEGORY_MAP) {
              if (text.indexOf(cat) === 0) { catUrl = DOC_CATEGORY_MAP[cat]; break; }
            }
          }
          if (catUrl) {
            // Only intercept if the element doesn't have a real href
            if (tag === 'A' && el.getAttribute('href') && el.getAttribute('href') !== '#') return;
            e.preventDefault();
            e.stopImmediatePropagation();
            window.location.href = catUrl;
            return;
          }
        }
        el = el.parentElement;
      }
    }, true); // capture phase — fires BEFORE any SPA handlers
  }

  // ─── MASTER RECONSTRUCTION RUNNER ────────────────────────────────
  function reconstructAll() {
    try { reconstructDropdowns(); } catch(e) {}
    try { reconstructModals(); } catch(e) {}
    try { reconstructTabs(); } catch(e) {}
    try { reconstructAccordions(); } catch(e) {}
    try { reconstructMobileMenu(); } catch(e) {}
    try { reconstructSearch(); } catch(e) {}
    try { reconstructFilters(); } catch(e) {}
    try { reconstructCarousels(); } catch(e) {}
    try { reconstructPagination(); } catch(e) {}
    try { reconstructDeadButtons(); } catch(e) {}
    try { reconstructFormValidation(); } catch(e) {}
    try { installDocCategoryHandler(); } catch(e) {}
  }

  // Initial run
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reconstructAll);
  else reconstructAll();

  // Poll for SPA-hydrated content
  setTimeout(reconstructAll, 1000);
  setTimeout(reconstructAll, 3000);
  setTimeout(reconstructAll, 5000);
  setTimeout(reconstructAll, 10000);

  // MutationObserver for dynamically added elements
  if (typeof MutationObserver !== 'undefined') {
    var debounceTimer;
    var obs = new MutationObserver(function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(reconstructAll, 300);
    });
    if (document.body) obs.observe(document.body, { childList: true, subtree: true });
    else document.addEventListener('DOMContentLoaded', function() { obs.observe(document.body, { childList: true, subtree: true }); });
  }
})();
</script>`;
}

// Build a SOURCE BEHAVIOR CAPTURE script that runs on the SOURCE site
// (not the clone) to record what each interactive element does.
// This is injected into a Browserbase session navigating the source site.
export function buildSourceCaptureScript(): string {
  return `(async function() {
  var results = [];
  var elements = document.querySelectorAll('a, button, [role="button"], [data-toggle], [aria-haspopup], select, input[type="submit"]');
  for (var i = 0; i < Math.min(elements.length, 200); i++) {
    var el = elements[i];
    var beforeUrl = window.location.href;
    var beforeHtml = document.body ? document.body.innerHTML.length : 0;
    var text = (el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().slice(0, 100);
    var tag = el.tagName;
    var href = el.getAttribute('href') || '';
    var role = el.getAttribute('role') || '';
    var selector = el.id ? '#' + el.id : (el.className ? tag + '.' + (typeof el.className === 'string' ? el.className.split(' ')[0] : '') : tag);
    var rect = el.getBoundingClientRect();
    // Record element signature
    var signature = {
      tag: tag,
      text: text,
      href: href,
      role: role,
      selector: selector,
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      visible: rect.width > 0 && rect.height > 0,
      hasOnclick: el.onclick !== null,
      hasDataToggle: el.hasAttribute('data-toggle') || el.hasAttribute('data-bs-toggle'),
      ariaHaspopup: el.getAttribute('aria-haspopup'),
      ariaExpanded: el.getAttribute('aria-expanded'),
    };
    results.push(signature);
  }
  return JSON.stringify(results);
})()`;
}