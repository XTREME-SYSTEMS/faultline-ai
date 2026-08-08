import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// The Template Extraction Engine — the value compounding layer.
//
// MISSION: Turn every cloned site into a reusable asset library.
//
// A clone is a single website. A template library is infinite websites. This function
// takes a deployed clone's HTML and decomposes it into reusable components — hero
// sections, navigation patterns, pricing tables, CTA blocks, testimonial grids,
// contact forms, footer patterns — each stored as a WebsiteLibraryAsset that can be
// mixed and matched to build new sites in seconds, not hours.
//
// Over time, this creates a compounding asset library: every clone makes the next
// generation faster and higher-quality, because the best components from every site
// are available for reuse. This is the flywheel that makes the system get better
// the more it runs.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const { live_url, source_url, business_name, industry, organization_id } = body;
    const targetOrg = organization_id || orgId;

    // 1. FETCH the live clone HTML (from the deployed Vercel URL)
    if (!live_url) return Response.json({ error: 'live_url required' }, { status: 400 });

    const r = await fetch(live_url, { signal: AbortSignal.timeout(15000) });
    const html = await r.text();
    if (html.length < 500) return Response.json({ error: 'Clone HTML too short', html_length: html.length }, { status: 400 });

    // 2. LLM DECOMPOSITION — extract reusable components from the clone
    //    The LLM identifies structural patterns (hero, nav, pricing, CTA, etc.)
    //    and extracts each as a self-contained HTML snippet with metadata.
    //    Using gemini_3_flash for speed (large HTML payloads need a fast model
    //    to stay within the function timeout — claude_sonnet times out on 5k+ chars).
    //    Truncate HTML to 5000 chars to keep the LLM call under 30s.
    const htmlSample = html.slice(0, 5000);
    const extractionRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are the FaultLine Template Extraction Engine. Decompose this website HTML into reusable components.

SOURCE: ${live_url}
BUSINESS: ${business_name || 'Unknown'}
INDUSTRY: ${industry || 'general'}

HTML (first 5000 chars):
${htmlSample}

${html.length > 5000 ? `... (${html.length - 5000} more chars truncated)` : ''}

Extract up to 5 reusable components (hero, navigation, pricing_table, cta_block, testimonial, feature_grid, contact_form, footer, stats_bar, faq, newsletter_signup). For each: component_type, name, html_snippet (under 1500 chars), description, best_for (array), quality_rating (1-5), conversion_notes. Only extract components actually present in the HTML.`,
      model: 'gemini_3_flash',
      add_context_from_internet: false,
      response_json_schema: {
        type: 'object',
        properties: {
          components: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                component_type: { type: 'string' },
                name: { type: 'string' },
                html_snippet: { type: 'string' },
                description: { type: 'string' },
                best_for: { type: 'array', items: { type: 'string' } },
                quality_rating: { type: 'number' },
                conversion_notes: { type: 'string' }
              }
            }
          }
        }
      }
    });

    const components = Array.isArray(extractionRes.components) ? extractionRes.components : [];

    // 3. STORE each component as a WebsiteLibraryAsset for future reuse
    //    library_type: 'section_library' — these are reusable section templates
    //    that the website generator can pull from when building new sites.
    let stored = 0;
    const storedComponents = [];

    for (let i = 0; i < components.length; i++) {
      const comp = components[i];
      try {
        if (!comp.html_snippet || comp.html_snippet.length < 50) continue;

        const recordId = `SEC-${Date.now().toString(36)}-${i}`;
        const asset = await base44.entities.WebsiteLibraryAsset.create({
          organization_id: targetOrg,
          library_type: 'section_library',
          record_id: recordId,
          name: comp.name || comp.component_type || 'Unnamed Component',
          category: comp.component_type || 'section',
          data: {
            html: comp.html_snippet,
            description: comp.description,
            best_for: comp.best_for || [],
            quality_rating: comp.quality_rating || 3,
            conversion_notes: comp.conversion_notes,
            source_url: source_url || live_url,
            business_name,
            industry: industry || 'general',
            extracted_at: new Date().toISOString()
          },
          status: 'active'
        });

        stored++;
        storedComponents.push({
          record_id: recordId,
          name: comp.name,
          type: comp.component_type,
          quality: comp.quality_rating,
          asset_id: asset.id
        });
      } catch (e) {
        console.error(`Failed to store component ${i}: ${e.message}`);
      }
    }

    // 4. RECEIPT — log the extraction for auditability
    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: targetOrg,
        system: 'template_extraction',
        action: 'extract',
        status: 'success',
        summary: `Extracted ${stored} reusable components from ${business_name || live_url}`,
        evidence: { live_url, source_url, business_name, industry, components_found: components.length, components_stored: stored, stored_components: storedComponents }
      });
    } catch (e) { console.error('Receipt failed:', e); }

    return Response.json({
      status: 'success',
      live_url,
      business_name,
      components_found: components.length,
      components_stored: stored,
      stored_components: storedComponents,
      message: `Extracted ${stored} reusable template components into the library`
    });
  } catch (error) {
    console.error('extractReusableTemplates error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}