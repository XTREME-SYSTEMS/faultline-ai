import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Auto-derives reusable templates from 100/100 parity clones.
// Scans all LaunchProjects with parity_score >= 100 + a live Vercel URL,
// uses LLM to extract layout type, sections, color palette, font pairings,
// target audience, and tone from the clone's HTML, then stores each as a
// WebsiteTemplate record with the HTML uploaded as a reusable file.
//
// Called by the "Derive Templates" button on the Template Library page.

const LAYOUT_TYPES = ['hero_centric', 'split_hero', 'grid', 'magazine', 'dashboard', 'portfolio', 'ecommerce', 'landing_page', 'agency', 'blog'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 20; // max clones to process per run
    const force = body.force || false; // re-derive even if template exists

    // 1. Gather all 100/100 gallery clones
    const projects = await base44.asServiceRole.entities.LaunchProject.filter(
      { organization_id: orgId }, '-parity_score', 200
    );

    const perfectClones = projects.filter(p =>
      (p.parity_score || 0) >= 100 &&
      (p.vercel_deployment_url || p.metadata?.vercel_deployment_url) &&
      p.project_name && !p.project_name.startsWith('Autonomous Clone')
    );

    console.log(`deriveTemplatesFromClones: ${perfectClones.length} perfect clones found`);

    // 2. Get existing templates to skip already-derived ones
    const existingTemplates = await base44.asServiceRole.entities.WebsiteTemplate.filter(
      { organization_id: orgId }, '-created_date', 500
    ).catch(() => []);
    const existingCloneIds = new Set(existingTemplates.map(t => t.source_clone_id));
    const toProcess = force ? perfectClones.slice(0, limit) : perfectClones.filter(p => !existingCloneIds.has(p.id)).slice(0, limit);

    console.log(`Processing ${toProcess.length} clones (skipping ${existingCloneIds.size} existing)`);

    if (toProcess.length === 0) {
      return Response.json({
        status: 'success',
        processed: 0,
        total_perfect: perfectClones.length,
        existing_templates: existingCloneIds.size,
        message: 'All perfect clones already have templates. Use force:true to re-derive.',
      });
    }

    // 3. For each clone, fetch its HTML and use LLM to extract template metadata
    const results = [];
    let created = 0, failed = 0;

    for (const clone of toProcess) {
      try {
        const vercelUrl = clone.vercel_deployment_url || clone.metadata?.vercel_deployment_url;
        const targetUrl = clone.benchmark_url || clone.metadata?.target_url;

        // Fetch the clone's rendered HTML
        let html = '';
        try {
          const r = await fetch(vercelUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal: AbortSignal.timeout(15000),
          });
          if (r.ok) html = await r.text();
        } catch (e) { /* skip if fetch fails */ }

        if (!html || html.length < 500) {
          console.log(`Skipping ${clone.project_name} — could not fetch HTML (${html.length} chars)`);
          failed++;
          results.push({ id: clone.id, name: clone.project_name, status: 'skipped', reason: 'no_html' });
          continue;
        }

        // Use LLM to extract template metadata from the HTML
        const extractPrompt = `You are a senior web designer analyzing a website's HTML to create a reusable template.
Analyze this website HTML and extract template metadata.

WEBSITE NAME: ${clone.project_name}
INDUSTRY: ${clone.industry || 'General'}
TARGET URL: ${targetUrl || 'N/A'}

HTML (first 8000 chars):
${html.slice(0, 8000)}

Return a JSON object with:
- name: a short, descriptive template name (e.g. "Modern SaaS Landing", "Bold Agency Hero", "Clean Portfolio Grid") — NOT the business name
- layout_type: one of ${LAYOUT_TYPES.map(t => `"${t}"`).join(', ')}
- layout_description: 1-2 sentence description of the layout structure
- sections: ordered array of page sections visible in the HTML (e.g. ["Hero","Features","Testimonials","Pricing","CTA","Footer"])
- color_palette: object with primary, secondary, accent, background, text (hex codes extracted from the HTML's CSS)
- suggested_accents: array of 5 hex colors that would work well as accent alternatives for this layout
- font_pairings: array of 3 objects with {heading, body, vibe} — Google Font names that match this layout's style
- target_audience: who this template is best for (e.g. "B2B SaaS startups", "Creative agencies", "E-commerce brands")
- tone: the overall tone (e.g. "Professional & modern", "Bold & edgy", "Clean & minimal")
- tags: 3-5 descriptive tags (e.g. ["dark","minimal","saas","pricing-table"])`;

        const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: extractPrompt,
          response_json_schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              layout_type: { type: 'string' },
              layout_description: { type: 'string' },
              sections: { type: 'array', items: { type: 'string' } },
              color_palette: {
                type: 'object',
                properties: {
                  primary: { type: 'string' },
                  secondary: { type: 'string' },
                  accent: { type: 'string' },
                  background: { type: 'string' },
                  text: { type: 'string' },
                },
              },
              suggested_accents: { type: 'array', items: { type: 'string' } },
              font_pairings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    heading: { type: 'string' },
                    body: { type: 'string' },
                    vibe: { type: 'string' },
                  },
                },
              },
              target_audience: { type: 'string' },
              tone: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
            },
          },
        });

        const meta = llmRes || {};
        if (!meta.name) {
          failed++;
          results.push({ id: clone.id, name: clone.project_name, status: 'failed', reason: 'no_metadata' });
          continue;
        }

        // Upload the HTML as a reusable template file
        let htmlFileUrl = null;
        try {
          const fileObj = new File([html], `template-${clone.id}.html`, { type: 'text/html' });
          const upload = await base44.integrations.Core.UploadFile({ file: fileObj });
          htmlFileUrl = upload?.file_url || null;
        } catch (e) { /* skip file upload failure */ }

        // Create the WebsiteTemplate record
        const template = await base44.asServiceRole.entities.WebsiteTemplate.create({
          organization_id: orgId,
          name: meta.name,
          source_clone_id: clone.id,
          source_clone_name: clone.project_name,
          industry: clone.industry || undefined,
          layout_type: LAYOUT_TYPES.includes(meta.layout_type) ? meta.layout_type : 'hero_centric',
          layout_description: meta.layout_description || '',
          sections: meta.sections || [],
          color_palette: meta.color_palette || {},
          suggested_accents: meta.suggested_accents || [],
          font_pairings: meta.font_pairings || [],
          screenshot_url: clone.metadata?.screenshot_url || null,
          preview_url: vercelUrl,
          html_file_url: htmlFileUrl,
          target_audience: meta.target_audience || '',
          tone: meta.tone || '',
          tags: meta.tags || [],
          status: 'published',
          featured: false,
          usage_count: 0,
        });

        created++;
        results.push({ id: clone.id, name: clone.project_name, status: 'created', template_id: template.id, template_name: meta.name });
        console.log(`Created template: ${meta.name} from ${clone.project_name}`);
      } catch (e) {
        failed++;
        results.push({ id: clone.id, name: clone.project_name, status: 'failed', error: e.message });
        console.error(`Failed to derive template from ${clone.project_name}: ${e.message}`);
      }
    }

    // 4. Log receipt
    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'template_library', action: 'derive_templates',
        status: failed === 0 ? 'success' : 'partial',
        summary: `Derived ${created} templates from ${toProcess.length} perfect clones (${failed} failed)`,
        evidence: { total_perfect: perfectClones.length, processed: toProcess.length, created, failed, results: results.slice(0, 20) },
      });
    } catch (e) { /* ignore */ }

    return Response.json({
      status: 'success',
      total_perfect: perfectClones.length,
      processed: toProcess.length,
      created,
      failed,
      results,
    });
  } catch (error) {
    console.error('deriveTemplatesFromClones error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}