import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Scans a deployed clone for items that ABSOLUTELY MUST change due to legal risk
// (trademarks, copyrighted images, proprietary copy/brand names), then produces a
// single-page summary + recommendations: new business name, URL, images, content.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { clone_id, source_url } = body;
    if (!clone_id && !source_url) return Response.json({ error: 'clone_id or source_url required' }, { status: 400 });

    // Resolve the source URL + name
    let url = source_url;
    let cloneName = '';
    if (clone_id) {
      const clone = await base44.asServiceRole.entities.LaunchProject.get(clone_id);
      url = url || clone.vercel_deployment_url || clone.metadata?.vercel_deployment_url || clone.vercel_project_url;
      cloneName = clone.project_name;
      if (!url) return Response.json({ error: 'Clone has no deployed URL to audit' }, { status: 400 });
    }

    // Fetch the deployed HTML
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LegalAuditBot/1.0)' } });
    const html = await r.text();

    // Extract image URLs + visible text hints
    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]).slice(0, 40);
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : '';

    // Truncate HTML for the LLM context
    const htmlSample = html.slice(0, 18000);

    const prompt = `You are a legal & brand-safety auditor for cloned websites. Analyze the following cloned website HTML and identify ONLY items that ABSOLUTELY MUST be changed due to legal risk — trademarks, copyrighted images, proprietary brand names, logos, copied marketing copy, or any content that would cause legal/branding problems if kept as-is.

Do NOT flag generic, non-infringing content. Only flag what legally must change.

Source URL: ${url}
Page title: ${pageTitle}
Images found: ${JSON.stringify(imgs)}

HTML:
${htmlSample}

Produce a complete rebrand plan:
1. A single-page plain-text SUMMARY (concise paragraph) of the audit findings and the recommended rebrand.
2. legal_issues: array of {type, severity (critical|high|medium|low), description, location, recommendation}.
3. brand_references: array of trademarked/proprietary names found that must be changed.
4. recommended_business_name: a fresh, legally-safe business name suggestion.
5. recommended_url: a slug-style URL path for the new brand (e.g. apex-local-services).
6. recommended_domain: a suggested available .com domain name for the new brand.
7. images_to_replace: array of {url, reason, replacement_prompt} for each image that must be replaced (logo, branded hero, copyrighted photos). replacement_prompt should be a detailed prompt to generate a safe replacement.
8. content_to_replace: array of {text, reason, suggested_replacement} for each piece of copy that must be changed (brand mentions, proprietary taglines, copyrighted text).`;

    const llm = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          legal_issues: { type: 'array', items: { type: 'object', properties: {
            type: { type: 'string' }, severity: { type: 'string' }, description: { type: 'string' },
            location: { type: 'string' }, recommendation: { type: 'string' }
          } } },
          brand_references: { type: 'array', items: { type: 'string' } },
          recommended_business_name: { type: 'string' },
          recommended_url: { type: 'string' },
          recommended_domain: { type: 'string' },
          images_to_replace: { type: 'array', items: { type: 'object', properties: {
            url: { type: 'string' }, reason: { type: 'string' }, replacement_prompt: { type: 'string' }
          } } },
          content_to_replace: { type: 'array', items: { type: 'object', properties: {
            text: { type: 'string' }, reason: { type: 'string' }, suggested_replacement: { type: 'string' }
          } } }
        }
      }
    });

    // Persist a RebrandProject record
    const orgId = user.data?.organization_id || 'default';
    const project = await base44.entities.RebrandProject.create({
      organization_id: orgId,
      source_clone_id: clone_id || '',
      source_clone_name: cloneName,
      source_url: url,
      audit_summary: llm.summary,
      legal_issues: llm.legal_issues || [],
      brand_references: llm.brand_references || [],
      recommended_business_name: llm.recommended_business_name,
      recommended_url: llm.recommended_url,
      recommended_domain: llm.recommended_domain,
      images_to_replace: (llm.images_to_replace || []).map(i => ({ url: i.url, reason: i.reason, replacement_prompt: i.replacement_prompt })),
      content_to_replace: llm.content_to_replace || [],
      status: 'audited',
      approval_state: 'pending',
    });

    return Response.json({ project, audit: llm });
  } catch (error) {
    console.error('legalAuditClone error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}