import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { SECTOR_ONE_INDUSTRIES } from '../../shared/industriesSectorOne.ts';
import { SECTOR_TWO_INDUSTRIES } from '../../shared/industriesSectorTwo.ts';

// Auto-Discovery & Queue — the autonomous discovery engine.
//
// Iterates through the full industry taxonomy (80+ industries across all
// sectors), finds the top N websites for each, and adds them to the CloneQueue
// with source='discovery'. The Clone Queue Processor workflow then clones,
// validates, and adds them to the gallery automatically.
//
// Two modes:
//   1. KNOWN (free, instant) — queues the real businesses already listed in
//      the taxonomy (3-4 per industry). No LLM credits used.
//   2. SEARCH (costs credits) — uses LLM + web search to discover additional
//      top-ranking sites beyond the taxonomy. Fills up to sites_per_industry.
//
// Processes a batch of industries per run (start_index → start_index + max_industries)
// to stay under the gateway timeout. The workflow calls this on a schedule with
// a rotating start_index, so all industries are covered over multiple runs.
//
// Input:
//   max_industries (default 10) — how many industries to process per run
//   sites_per_industry (default 5) — target number of sites per industry
//   include_search (default true) — also search for new sites via LLM
//   start_index (default 0) — which industry to start from (rotating)

const ALL_INDUSTRIES = [...SECTOR_ONE_INDUSTRIES, ...SECTOR_TWO_INDUSTRIES];

function normalizeUrl(url: string): string {
  if (!url) return '';
  try {
    const full = url.startsWith('http') ? url : `https://${url}`;
    const u = new URL(full);
    return u.hostname.replace(/^www\./, '').toLowerCase() + (u.pathname || '/').replace(/\/$/, '');
  } catch { return (url || '').toLowerCase(); }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const maxIndustries = Math.min(20, Math.max(1, body.max_industries || 10));
    const sitesPerIndustry = Math.min(10, Math.max(1, body.sites_per_industry || 5));
    const includeSearch = body.include_search !== false;
    // Rotate through all industries: if no start_index provided, pick a random
    // one so the workflow covers all 371 industries over multiple runs instead
    // of always processing the same first batch.
    const startIdx = body.start_index != null ? body.start_index : Math.floor(Math.random() * ALL_INDUSTRIES.length);

    // Get existing queue + gallery URLs to skip duplicates
    const existingQueue = await base44.asServiceRole.entities.CloneQueue.list('-created_date', 500).catch(() => []);
    const existingUrls = new Set<string>();
    existingQueue.forEach(q => { const n = normalizeUrl(q.target_url); if (n) existingUrls.add(n); });

    // Process a batch of industries (wraps around to the beginning)
    const indices: number[] = [];
    for (let i = 0; i < maxIndustries; i++) {
      indices.push((startIdx + i) % ALL_INDUSTRIES.length);
    }
    const industriesToProcess = indices.map(i => ALL_INDUSTRIES[i]);

    const results: any[] = [];
    let totalAdded = 0;

    for (const industry of industriesToProcess) {
      const industryAdded: string[] = [];

      // 1. Queue known businesses from taxonomy (free, no LLM)
      for (const biz of (industry.businesses || [])) {
        const url = normalizeUrl(biz.url);
        if (!url || existingUrls.has(url)) continue;

        try {
          await base44.asServiceRole.entities.CloneQueue.create({
            organization_id: orgId,
            target_url: biz.url,
            site_name: biz.name,
            industry: industry.label,
            priority: 'medium',
            status: 'queued',
            source: 'discovery',
            notes: `Auto-discovered from ${industry.group} taxonomy`,
          });
          existingUrls.add(url);
          industryAdded.push(biz.name);
          totalAdded++;
        } catch (e) { /* skip on error */ }
      }

      // 2. Optionally search for more top sites via LLM + web search
      if (includeSearch && industryAdded.length < sitesPerIndustry) {
        try {
          const needed = sitesPerIndustry - industryAdded.length;
          const searchRes = await base44.integrations.Core.InvokeLLM({
            prompt: `You are a business research analyst. Find the top ${needed} highest-ranking, most successful REAL websites in the ${industry.label} industry (category: ${industry.group}).

These must be REAL, well-known businesses with actual live websites. Do NOT invent fictional companies. Do NOT include any of these already-queued sites: ${industryAdded.join(', ') || 'none'}.

For each website, provide:
- name: the business/website name
- url: the full website URL starting with https://
- description: a 1-2 sentence summary of what the business does

Focus on market leaders with strong web presence and proven revenue models.`,
            model: 'gemini_3_flash',
            add_context_from_internet: true,
            response_json_schema: {
              type: 'object',
              properties: {
                websites: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      url: { type: 'string' },
                      description: { type: 'string' },
                    },
                  },
                },
              },
            },
          });

          for (const site of (searchRes.websites || [])) {
            const fullUrl = site.url && !site.url.match(/^https?:\/\//) ? `https://${site.url}` : site.url;
            const url = normalizeUrl(fullUrl);
            if (!url || existingUrls.has(url)) continue;

            try {
              await base44.asServiceRole.entities.CloneQueue.create({
                organization_id: orgId,
                target_url: fullUrl,
                site_name: site.name,
                industry: industry.label,
                priority: 'medium',
                status: 'queued',
                source: 'discovery',
                notes: `Auto-discovered via LLM search in ${industry.label}`,
              });
              existingUrls.add(url);
              industryAdded.push(site.name);
              totalAdded++;
            } catch (e) { /* skip on error */ }
          }
        } catch (e) {
          console.error(`Search failed for ${industry.label}:`, e.message);
        }
      }

      results.push({
        industry: industry.label,
        group: industry.group,
        added: industryAdded.length,
        sites: industryAdded,
      });
    }

    const nextIndex = (startIdx + maxIndustries) % ALL_INDUSTRIES.length;

    // Receipt
    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'auto_discovery', action: 'discover_and_queue',
        status: 'success',
        summary: `Auto-discovered ${totalAdded} sites across ${industriesToProcess.length} industries (index ${startIdx}→${nextIndex})`,
        evidence: { total_added: totalAdded, industries_processed: industriesToProcess.length, next_index: nextIndex, include_search: includeSearch, results },
      });
    } catch (e) { /* ignore */ }

    return Response.json({
      status: 'completed',
      industries_processed: industriesToProcess.length,
      total_added: totalAdded,
      next_index: nextIndex,
      total_industries: ALL_INDUSTRIES.length,
      results,
    });
  } catch (error) {
    console.error('autoDiscoverAndQueue error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}