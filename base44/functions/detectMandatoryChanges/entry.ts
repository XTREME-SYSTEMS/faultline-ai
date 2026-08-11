import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// MINIMAL-CHANGE DETECTOR
// Fetches a deployed clone and identifies ONLY the bare-minimum items that
// legally MUST change (trademarks, proprietary brand names, logos, copyrighted
// images). Returns precise find→replace pairs targeting the user's brand
// ("Lead Gen Near You" by default). It does NOT invent a new business name and
// does NOT rewrite general copy — the clone stays faithful to the original.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { clone_id, source_url, target_brand } = body;
    const BRAND = target_brand || 'Lead Gen Near You';
    if (!clone_id && !source_url) return Response.json({ error: 'clone_id or source_url required' }, { status: 400 });

    let url = source_url;
    let cloneName = '';
    let cloneId = clone_id || '';
    if (clone_id) {
      const clone = await base44.asServiceRole.entities.LaunchProject.get(clone_id);
      url = url || clone.vercel_deployment_url || clone.metadata?.vercel_deployment_url || clone.vercel_project_url;
      cloneName = clone.project_name;
      if (!url) return Response.json({ error: 'Clone has no deployed URL to audit' }, { status: 400 });
    }

    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MinimalChangeDetector/1.0)' } });
    const html = await r.text();
    const htmlSample = html.slice(0, 20000);
    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]).slice(0, 40);
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : '';

    const prompt = `You are a MINIMAL-CHANGE detector for a cloned website. The clone must stay FAITHFUL to the original — identical layout, copy, images, and functionality — EXCEPT for the bare-minimum items that legally MUST change.

The replacement brand is "${BRAND}" (domain: leadgennearyou.com). Do NOT invent any other business name. Do NOT suggest a new domain.

Source URL: ${url}
Page title: ${pageTitle}
Images found: ${JSON.stringify(imgs)}

HTML:
${htmlSample}

Identify ONLY mandatory legal changes. Return precise find→replace pairs where \`find\` is an EXACT verbatim substring copied character-for-character from the HTML (including any punctuation/spaces) and \`replace\` is the minimal safe substitution.

STRICT RULES:
- Trademarked/proprietary brand names ("GoHighLevel", "HighLevel", "High Level", "GHL", "LeadConnector") → "${BRAND}" (use "LGNY" only where a short acronym is genuinely required).
- Proprietary trademarked taglines/slogans → a minimal neutral equivalent of the SAME length/shape.
- The main brand logo image → flag as an image_swap with is_logo: true. Do NOT text-swap it.
- Branded/copyrighted images (logos, brand-specific illustrations, product screenshots, trademarked icons) → image_swaps with a replacement_prompt. Do NOT flag generic stock photography or lifestyle photos.
- Do NOT rewrite general marketing copy, headlines, or body text unless it contains a trademarked term.
- Do NOT change layout, structure, colors, fonts, links, or functionality.
- When in doubt, DO NOT flag it. Less is more.

Additionally, return brand_terms: the distinctive trademarked brand-name TOKENS that must be replaced GLOBALLY across the entire page (every occurrence), e.g. {term: "GoHighLevel", replacement: "Lead Gen Near You"}, {term: "HighLevel", replacement: "Lead Gen Near You"}. Only include distinctive full brand names — NOT short acronyms like "GHL" and NOT domain/path fragments like "leadconnector" (those would break URLs). These are applied to the whole HTML, so they cover body copy the sample did not show.

Return JSON:
- summary: one concise paragraph describing what must change and why.
- brand_terms: array of {term, replacement} — distinctive full brand names to replace globally.
- mandatory_swaps: array of {find, replace, reason, type} where type is "text" or "tagline" — specific taglines/strings needing a non-standard replacement (do NOT repeat plain brand-name occurrences here; those go in brand_terms).
- image_swaps: array of {src, reason, replacement_prompt, is_logo} — is_logo true ONLY for the main brand logo.`;

    const llm = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          brand_terms: { type: 'array', items: { type: 'object', properties: {
            term: { type: 'string' }, replacement: { type: 'string' }
          } } },
          mandatory_swaps: { type: 'array', items: { type: 'object', properties: {
            find: { type: 'string' }, replace: { type: 'string' }, reason: { type: 'string' }, type: { type: 'string' }
          } } },
          image_swaps: { type: 'array', items: { type: 'object', properties: {
            src: { type: 'string' }, reason: { type: 'string' }, replacement_prompt: { type: 'string' }, is_logo: { type: 'boolean' }
          } } }
        }
      }
    });

    const orgId = user.data?.organization_id || 'default';
    const project = await base44.entities.RebrandProject.create({
      organization_id: orgId,
      source_clone_id: cloneId,
      source_clone_name: cloneName,
      source_url: url,
      target_brand: BRAND,
      audit_summary: llm.summary,
      brand_references: (llm.brand_terms || []).map(b => b.term).filter(Boolean),
      recommended_business_name: BRAND,
      recommended_url: 'lead-gen-near-you',
      recommended_domain: 'leadgennearyou.com',
      mandatory_swaps: [
        ...(llm.brand_terms || []).map(b => ({ find: b.term, replace: b.replacement, reason: 'Trademarked brand name (global)', type: 'brand_term' })),
        ...(llm.mandatory_swaps || []),
      ],
      images_to_replace: (llm.image_swaps || []).map(i => ({ url: i.src, reason: i.reason, replacement_prompt: i.replacement_prompt, is_logo: !!i.is_logo })),
      content_to_replace: [],
      status: 'audited',
      approval_state: 'pending',
    });

    return Response.json({ project, audit: llm });
  } catch (error) {
    console.error('detectMandatoryChanges error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}