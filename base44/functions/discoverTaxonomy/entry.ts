import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { createStealthSession, releaseSession, CDPClient } from '../../shared/stealthBrowser.ts';

// Taxonomy Discovery — crawls Envato category pages to extract the full taxonomy
// tree: categories, subcategories, tags, software, formats, styles, filter families.
// Populates the EnvatoTaxonomyLedger entity with evidence for each node.
//
// This is Phase 2 of the autonomous loop. The heartbeat dispatches this when
// route discovery is complete but taxonomy coverage is below 50%.

const SOURCE_URL = 'https://elements.envato.com';

// Known top-level categories to seed the crawl
const CATEGORY_SEEDS = [
  '/graphic-templates', '/video-templates', '/presentation-templates',
  '/audio', '/fonts', '/photos', '/graphics', '/3d',
  '/web-templates', '/app-templates', '/addons', '/cms-templates',
  '/all-items',
];

interface TaxonomyNode {
  taxonomy_node_id: string;
  node_type: string;
  node_name: string;
  parent_node: string;
  source_evidence: string;
}

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const orgId = body.organization_id || (await base44.auth.me().catch(() => null))?.data?.organization_id || 'default';
    const maxCategories = body.max_categories || 13;

    console.log(`[discoverTaxonomy] Starting for org ${orgId}`);

    // Get existing taxonomy to avoid re-crawling
    const existing = await base44.asServiceRole.entities.EnvatoTaxonomyLedger.filter({ organization_id: orgId });
    const existingIds = new Set(existing.map((t: any) => t.taxonomy_node_id));
    console.log(`[discoverTaxonomy] Existing taxonomy nodes: ${existing.length}`);

    const discoveredNodes: TaxonomyNode[] = [];
    const seenNodeIds = new Set<string>();

    // P0-5: Taxonomy truth class — determines whether a node participates in
    // TAXONOMY_ROUTE_COVERAGE and CONTENT_FAMILY_COVERAGE.
    // Only OFFICIAL_NAVIGABLE_TAXONOMY participates in those metrics.
    function getTruthClass(node_type: string, evidence: string, name: string): string {
      if (node_type === 'category') return 'official_navigable_taxonomy';
      if (node_type === 'subcategory') {
        // P0-6: Require strong taxonomy evidence for subcategories.
        // A unique URL alone is not enough — must have navigation/menu/breadcrumb evidence.
        if (evidence.includes('navigation') || evidence.includes('breadcrumb') || evidence.includes('menu') || evidence.includes('sidebar')) {
          return 'official_navigable_taxonomy';
        }
        // Check for free-form slug patterns (like "rosyz", "abc123") — likely SEO/search landings
        if (name.length < 3 || /^[a-z0-9]{1,5}$/i.test(name) || /similar\s*to/i.test(name)) {
          return 'search_term_landing';
        }
        return 'search_term_landing'; // default for subcategories without nav evidence
      }
      if (node_type === 'filter_family') return 'filter_dimension';
      if (node_type === 'tag') return 'tag_landing';
      if (node_type === 'sort_mode') return 'dynamic_state';
      if (node_type === 'software') return 'filter_dimension';
      return 'other_with_evidence';
    }

    function addNode(node_type: string, node_name: string, parent_node: string, evidence: string) {
      const nodeId = `${node_type}:${node_name.toLowerCase().replace(/\s+/g, '-')}`;
      if (seenNodeIds.has(nodeId) || existingIds.has(nodeId)) return;
      seenNodeIds.add(nodeId);
      const truthClass = getTruthClass(node_type, evidence, node_name);
      discoveredNodes.push({
        taxonomy_node_id: nodeId,
        node_type,
        node_name,
        parent_node,
        source_evidence: evidence,
        taxonomy_truth_class: truthClass,
      });
    }

    let session: { id: string; connectUrl: string } | null = null;
    let cdp: CDPClient | null = null;
    let cdpSessionId: string | null = null;

    try {
      session = await createStealthSession({
        deepRender: true, timeout: 20000, waitAfterLoad: 1500, solveCaptchas: true, proxies: true,
      });
      cdp = new CDPClient();
      await cdp.connect(session.connectUrl);
      const { targetInfos } = await cdp.send('Target.getTargets');
      const pageTarget = targetInfos.find((t: any) => t.type === 'page') || targetInfos[0];
      const attach = await cdp.send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
      cdpSessionId = attach.sessionId;
      await cdp.send('Page.enable', {}, cdpSessionId);
      await cdp.send('Runtime.enable', {}, cdpSessionId);

      // Crawl each category page to extract subcategories and filter families
      for (const catPath of CATEGORY_SEEDS.slice(0, maxCategories)) {
        try {
          const fullUrl = SOURCE_URL + catPath;
          console.log(`[discoverTaxonomy] Crawling category: ${catPath}`);

          // Add the category node itself
          const catName = catPath.replace(/^\//, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          addNode('category', catName, '', `Discovered from URL: ${fullUrl}`);

          await cdp.send('Page.navigate', { url: fullUrl }, cdpSessionId, 15000);
          await new Promise<void>((resolve) => {
            let done = false;
            const finish = () => { if (!done) { done = true; resolve(); } };
            cdp!.on('Page.loadEventFired', finish);
            setTimeout(finish, 8000);
          });
          await new Promise(r => setTimeout(r, 2000));

          // Scroll to trigger lazy content
          try {
            await cdp.send('Runtime.evaluate', {
              expression: `(async()=>{var h=document.body.scrollHeight;for(var y=0;y<Math.min(h,3000);y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,100));}window.scrollTo(0,0);})()`,
              returnByValue: true, awaitPromise: true,
            }, cdpSessionId, 5000);
          } catch {}

          // P0-6: Extract subcategories ONLY from navigation/menu/breadcrumb context.
          // A unique URL alone is not enough — must have strong source evidence.
          const extractResult = await cdp.send('Runtime.evaluate', {
            expression: `(function(){
              var nodes = [];
              
              // P0-6: Subcategory links — ONLY from navigation/sidebar/breadcrumb/menu context
              // Do not accept arbitrary links from card content or footer
              var navLinks = document.querySelectorAll(
                'nav a[href*="${catPath}/"], ' +
                '[class*="sidebar"] a[href*="${catPath}/"], ' +
                '[class*="breadcrumb"] a[href*="${catPath}/"], ' +
                '[class*="menu"] a[href*="${catPath}/"], ' +
                '[class*="navigation"] a[href*="${catPath}/"], ' +
                '[data-testid*="navigation"] a[href*="${catPath}/"], ' +
                '[class*="filter"] a[href*="${catPath}/"]'
              );
              var seenSub = new Set();
              navLinks.forEach(function(a){
                var href = a.getAttribute('href') || '';
                var match = href.match(/${catPath.replace(/\//g, '\\/')}\\/([a-z0-9-]+)/i);
                if (match && !seenSub.has(match[1])) {
                  seenSub.add(match[1]);
                  // Determine evidence context
                  var parentEl = a.closest('nav, [class*="sidebar"], [class*="breadcrumb"], [class*="menu"], [class*="navigation"], [class*="filter"]');
                  var context = parentEl ? (parentEl.className || parentEl.tagName).toLowerCase() : 'unknown';
                  nodes.push({ type: 'subcategory', name: match[1].replace(/-/g,' ').replace(/\\+/g,' '), evidence: 'Navigation link in ' + context + ': ' + href });
                }
              });
              
              // Filter facets — typically in sidebar with checkboxes/radios
              var filterSections = document.querySelectorAll('[class*="filter"], [class*="facet"], [data-testid*="filter"]');
              filterSections.forEach(function(section){
                var sectionName = (section.getAttribute('aria-label') || section.querySelector('h3,h4,label')?.textContent || 'unknown_filter').trim().slice(0, 40);
                nodes.push({ type: 'filter_family', name: sectionName, evidence: 'Filter section on ' + window.location.pathname });
                var options = section.querySelectorAll('input[type="checkbox"], input[type="radio"], option, [role="option"]');
                options.forEach(function(opt, i){
                  if (i < 20) {
                    var optName = (opt.getAttribute('value') || opt.textContent || opt.getAttribute('aria-label') || '').trim().slice(0, 40);
                    if (optName) nodes.push({ type: 'tag', name: optName, evidence: 'Filter option in ' + sectionName });
                  }
                });
              });
              
              // Software compatibility badges
              var softwareBadges = document.querySelectorAll('[class*="software"], [data-testid*="software"]');
              softwareBadges.forEach(function(badge){
                var name = (badge.textContent || '').trim().slice(0, 40);
                if (name && name.length > 1) nodes.push({ type: 'software', name: name, evidence: 'Software badge on ' + window.location.pathname });
              });
              
              // Sort modes
              var sortControls = document.querySelectorAll('[class*="sort"], [data-testid*="sort"]');
              sortControls.forEach(function(control){
                var options = control.querySelectorAll('option, [role="option"], button');
                options.forEach(function(opt){
                  var name = (opt.textContent || opt.getAttribute('value') || '').trim().slice(0, 30);
                  if (name) nodes.push({ type: 'sort_mode', name: name, evidence: 'Sort option on ' + window.location.pathname });
                });
              });
              
              return JSON.stringify(nodes);
            })()`,
            returnByValue: true,
          }, cdpSessionId);

          const pageNodes = JSON.parse(extractResult?.result?.value || '[]');
          console.log(`[discoverTaxonomy] ${catPath}: extracted ${pageNodes.length} taxonomy nodes`);

          for (const node of pageNodes) {
            const parentId = node.type === 'subcategory' ? `category:${catName.toLowerCase().replace(/\s+/g, '-')}` : '';
            addNode(node.type, node.name, parentId, node.evidence);
          }
        } catch (e) {
          console.error(`[discoverTaxonomy] Failed category ${catPath}: ${e.message}`);
        }
      }
    } finally {
      if (cdp) await cdp.close().catch(() => {});
      if (session) await releaseSession(session.id);
    }

    // ─── PERSIST DISCOVERED NODES ──────────────────────────────────
    let created = 0;
    if (discoveredNodes.length > 0) {
      try {
        const records = discoveredNodes.map(node => ({
          organization_id: orgId,
          taxonomy_node_id: node.taxonomy_node_id,
          node_type: node.node_type as any,
          node_name: node.node_name,
          parent_node: node.parent_node,
          source_present: true,
          clone_present: false,
          clone_supported: false,
          content_available: false,
          status: 'discovered',
          source_evidence: node.source_evidence,
          taxonomy_truth_class: (node as any).taxonomy_truth_class || 'other_with_evidence',
        }));
        await base44.asServiceRole.entities.EnvatoTaxonomyLedger.bulkCreate(records);
        created = records.length;
        console.log(`[discoverTaxonomy] Created ${created} taxonomy nodes`);
      } catch (e) {
        console.error(`[discoverTaxonomy] Bulk create failed: ${e.message}`);
        // Fallback: create one at a time
        for (const node of discoveredNodes) {
          try {
            await base44.asServiceRole.entities.EnvatoTaxonomyLedger.create({
              organization_id: orgId,
              taxonomy_node_id: node.taxonomy_node_id,
              node_type: node.node_type as any,
              node_name: node.node_name,
              parent_node: node.parent_node,
              source_present: true,
              status: 'discovered',
              source_evidence: node.source_evidence,
            });
            created++;
          } catch {}
        }
      }
    }

    // Count by type
    const typeCounts: Record<string, number> = {};
    for (const node of discoveredNodes) {
      typeCounts[node.node_type] = (typeCounts[node.node_type] || 0) + 1;
    }

    return Response.json({
      status: 'success',
      total_nodes_discovered: discoveredNodes.length,
      nodes_created: created,
      type_counts: typeCounts,
      categories_crawled: CATEGORY_SEEDS.length,
      existing_nodes: existing.length,
    });
  } catch (error) {
    console.error('[discoverTaxonomy] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}