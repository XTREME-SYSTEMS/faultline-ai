import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Clones a SaaS/app builder platform (Wix, Squarespace, Webflow, HubSpot CMS, Shopify, etc.)
// Researches its builder/editor capabilities via web search and encodes them as a
// "platform blueprint" stored as a WebsiteLibraryAsset (library_type: 'platform_blueprint').
// The website/app generators can then use the blueprint to replicate that platform's
// generation approach — components, design system, features, page types.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { platform } = body;
    if (!platform) return Response.json({ error: 'platform required' }, { status: 400 });

    const prompt = `Research the website/app builder platform "${platform}" in deep detail. This is a SaaS platform that lets users build websites or apps (e.g. Wix, Squarespace, Webflow, HubSpot CMS, Shopify, WordPress, Framer, Figma, Bubble, etc.).

Analyze and document its COMPLETE capability set so it can be replicated by an AI generator:

1. platform_name: The official platform name
2. platform_url: The official website URL
3. editor_type: How does the editor work? (drag-and-drop, block-based, grid-based, code-based, AI-assisted, canvas)
4. template_system: How do templates work? (pre-designed themes, blank canvas, AI-generated, marketplace, industry-specific)
5. component_library: What components/sections/elements are available? List ALL major ones (headers, hero sections, galleries, forms, maps, pricing tables, testimonials, sliders, CTAs, footers, blogs, e-commerce product grids, booking widgets, etc.)
6. design_system: How does styling work? (global themes, color palettes, typography controls, spacing systems, responsive breakpoints, dark mode, animations)
7. page_types: What page types are supported? (landing pages, blog posts, product pages, dynamic collection pages, portfolio, about, contact, etc.)
8. built_in_features: What built-in features exist? (SEO tools, e-commerce, blogging, forms, CRM, email marketing, analytics, A/B testing, memberships, bookings, payments, multilingual, etc.)
9. content_management: How is content managed? (static pages, dynamic collections/CMS, databases, custom post types, API-driven)
10. generation_approach: How does the platform build/generate sites? (template selection then customization, AI prompt to site, blank then drag-build, import)
11. strengths: What makes this platform great? (3-5 key strengths)
12. weaknesses: What are its limitations?
13. replication_instructions: Detailed step-by-step instructions for how an AI website generator should replicate this platform's approach when generating a single-file HTML website — what structure, components, features, design patterns, and UX conventions to include so the output feels like it was built with this platform's builder.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          platform_name: { type: 'string' },
          platform_url: { type: 'string' },
          editor_type: { type: 'string' },
          template_system: { type: 'string' },
          component_library: { type: 'array', items: { type: 'string' } },
          design_system: { type: 'string' },
          page_types: { type: 'array', items: { type: 'string' } },
          built_in_features: { type: 'array', items: { type: 'string' } },
          content_management: { type: 'string' },
          generation_approach: { type: 'string' },
          strengths: { type: 'array', items: { type: 'string' } },
          weaknesses: { type: 'array', items: { type: 'string' } },
          replication_instructions: { type: 'string' }
        }
      }
    });

    const blueprint = res;
    const cleanName = (blueprint.platform_name || platform).toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-').slice(0, 20);

    // Check for existing blueprint and update or create
    const existing = await base44.asServiceRole.entities.WebsiteLibraryAsset.filter(
      { organization_id: orgId, library_type: 'platform_blueprint', record_id: `PLATFORM-${cleanName}` },
      '-created_date', 1
    );

    let record;
    const payload = {
      organization_id: orgId,
      library_type: 'platform_blueprint',
      record_id: `PLATFORM-${cleanName}`,
      name: `${blueprint.platform_name || platform} Platform Blueprint`,
      category: 'platform_blueprint',
      data: {
        ...blueprint,
        platform_name: blueprint.platform_name || platform,
        cloned_at: new Date().toISOString()
      },
      status: 'active'
    };

    if (existing && existing.length > 0) {
      record = await base44.asServiceRole.entities.WebsiteLibraryAsset.update(existing[0].id, {
        name: payload.name, data: payload.data, status: 'active'
      });
    } else {
      record = await base44.entities.WebsiteLibraryAsset.create(payload);
    }

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'website_generator',
      action: 'clone_platform',
      status: 'success',
      summary: `Cloned platform blueprint for ${blueprint.platform_name || platform}`,
      evidence: {
        platform: blueprint.platform_name || platform,
        blueprint_id: record.id,
        components: (blueprint.component_library || []).length,
        features: (blueprint.built_in_features || []).length
      }
    });

    return Response.json({
      status: 'success',
      platform: blueprint.platform_name || platform,
      blueprint_id: record.id,
      blueprint: {
        platform_name: blueprint.platform_name || platform,
        editor_type: blueprint.editor_type,
        component_count: (blueprint.component_library || []).length,
        feature_count: (blueprint.built_in_features || []).length,
        page_type_count: (blueprint.page_types || []).length,
        strengths: blueprint.strengths || [],
        weaknesses: blueprint.weaknesses || [],
        replication_instructions: blueprint.replication_instructions || ''
      }
    });
  } catch (error) {
    console.error('clonePlatform error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}