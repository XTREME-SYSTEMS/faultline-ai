import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Seeds the PromptTemplate entity with the highest-quality, best-producing
// prompts for every generation task in the system. The promptLibrary.ts shared
// module then autonomously resolves these at generation time via resolvePrompt().
//
// Idempotent: skips prompt_ids that already exist for the org.
// Body: { organization_id?: string } — defaults to the caller's org.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = (await req.json().catch(() => ({}))).organization_id || user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization' }, { status: 400 });

    // The master prompt library — each entry is the highest-quality prompt for its task.
    // These are the prompts the system autonomously uses for best-quality results.
    const PROMPTS = [
      {
        prompt_id: 'logo-pack-generate-v2',
        tool_id: 'logo-pack',
        tool_name: 'Logo Pack Generator',
        title: 'Premium Logo Pack Generation',
        prompt_type: 'GENERATE',
        description: 'Generates a complete logo pack — primary, monogram, and mark — from business context.',
        required_inputs: ['business_name', 'industry'],
        optional_inputs: ['tone', 'target_audience', 'description'],
        prompt_text: `You are an elite brand designer. Generate a premium logo pack for {{business_name}}, a {{industry}} company.

Context: {{description|a leading business in its space}}
Tone: {{tone|professional}}
Target audience: {{target_audience|general professionals}}

Produce a logo pack with THREE variations:
1. PRIMARY LOGO — full business name, refined typography, a distinctive mark that reflects the industry. Describe the exact visual: layout, icon style, typographic treatment.
2. MONOGRAM — a 2-3 letter mark for app icons and favicons. Describe shape, geometry, and negative-space treatment.
3. ICON MARK — a standalone symbol that works at 16px and 512px.

For each, specify: exact hex colors (primary + accent), font pairing (heading + body), and a 2-sentence rationale for why it converts.

Return a JSON object with: primary_logo, monogram, icon_mark — each containing description, colors (hex array), fonts, and rationale. Also return a brand_name and style_description for the overall pack.`,
        tags: ['logo', 'branding', 'design-pack'],
        approval_required: false
      },
      {
        prompt_id: 'brand-pack-generate-v2',
        tool_id: 'brand-pack',
        tool_name: 'Brand Pack Generator',
        title: 'Complete Brand Pack Generation',
        prompt_type: 'GENERATE',
        description: 'Generates a full brand pack — colors, fonts, voice, tone, and visual direction.',
        required_inputs: ['business_name', 'industry'],
        optional_inputs: ['tone', 'target_audience', 'description', 'logo_url'],
        prompt_text: `You are a senior brand strategist. Build a complete brand pack for {{business_name}}, a {{industry}} business.

Context: {{description|a high-growth business}}
Tone: {{tone|professional}}
Target audience: {{target_audience|general professionals}}

Define the FULL brand system:
1. BRAND NAME — confirm or refine the name
2. BRAND VOICE — 3 adjectives that describe the voice (e.g. "confident, precise, warm")
3. BRAND COLORS — exact hex values for: background, primary, secondary, accent, text, muted, card. Choose a cohesive palette that signals trust + premium quality for this industry.
4. TYPOGRAPHY — heading font and body font (from Google Fonts), with rationale
5. VISUAL DIRECTION — 3-sentence description of the overall visual style
6. MESSAGING PILLARS — 3 core messages the brand should communicate
7. TAGLINE — a memorable tagline

Return a JSON object: { brand: { name, voice, style_description, tone }, colors: { background, primary, secondary, accent, text, muted, card }, fonts: { heading, body }, messaging: { pillars: [], tagline } }`,
        tags: ['brand', 'branding', 'design-pack'],
        approval_required: false
      },
      {
        prompt_id: 'web-pack-generate-v2',
        tool_id: 'web-pack',
        tool_name: 'Web Pack Generator',
        title: 'Complete Web Pack Generation',
        prompt_type: 'GENERATE',
        description: 'Generates a full web design pack — layout system, component library, page structure, and responsive rules.',
        required_inputs: ['business_name', 'industry'],
        optional_inputs: ['tone', 'target_audience', 'description', 'pages'],
        prompt_text: `You are an elite web design architect. Build a complete web pack for {{business_name}}, a {{industry}} business.

Context: {{description|a high-growth business}}
Tone: {{tone|professional}}

Define the FULL web design system:
1. LAYOUT SYSTEM — grid system (columns, gutters, max-width), responsive breakpoints, section spacing
2. COMPONENT LIBRARY — list every component the site needs (nav, hero, cards, pricing, testimonials, forms, footer, etc.) with a 1-line spec for each
3. PAGE STRUCTURE — the pages the site should have, each with: name, purpose, sections (array), components (array)
4. NAVIGATION — the nav structure and mobile menu behavior
5. RESPONSIVE RULES — how layouts collapse on mobile
6. CONVERSION ELEMENTS — CTAs, forms, and trust signals to include

Use a vanilla CSS approach with predefined utility classes (.grid, .cards, .card, .btn, .grid-2, .grid-3, .grid-4, .split, .img-card, .tag, .kpi-card, .pricing-card, .testimonial-card). The layout_system should describe this.

Return a JSON object: { brand: { name, style_description, tone, colors: { background, primary, secondary, accent, text, muted, card }, fonts: { heading, body } }, layout_system: string, pages: [{ name, purpose, sections: [], components: [] }] }`,
        tags: ['web', 'design-pack', 'layout'],
        approval_required: false
      },
      {
        prompt_id: 'website-generate-v2',
        tool_id: 'fl-website',
        tool_name: 'FaultLine Website Generator',
        title: 'High-Converting Website Generation',
        prompt_type: 'GENERATE',
        description: 'Generates a complete, responsive, production-ready website using the design pack spec.',
        required_inputs: ['business_name', 'industry'],
        optional_inputs: ['description', 'target_audience', 'tone', 'design_pack_spec'],
        prompt_text: `Generate a complete, responsive, production-ready website for {{business_name}} — a {{industry}} business.

Business description: {{description|a leading business in its space}}
Target audience: {{target_audience|general professionals}}
Tone: {{tone|professional}}

CRITICAL DESIGN RULES — use CSS custom properties via var() for EVERY color. NEVER hardcode hex values. Use the predefined CSS classes (.grid, .cards, .card, .btn, .grid-2, .grid-3, .grid-4, .split, .img-card, .tag, .kpi-card, .pricing-card, .testimonial-card, .section-head, .tabs, .progress-bar, .activity-item). NEVER use inline style="" attributes.

Build REAL marketing copy — no placeholders, no bracketed text. Write actual sentences that convert. Every CTA button uses class="btn". Every form uses real <form>, <input name="">, <label>, <button type="submit">. All hrefs point to valid section IDs.

Generate a full multi-section single-page site: hero, features, how-it-works, pricing, testimonials, FAQ, CTA, contact form, footer. Include emoji icons in <span class="icon"> for feature cards. Use Unsplash images in .img-card elements for visual sections.`,
        tags: ['website', 'generation', 'production'],
        approval_required: false
      },
      {
        prompt_id: 'system-clone-generate-v2',
        tool_id: 'system-clone',
        tool_name: 'System Clone Generator',
        title: 'Superior System Cloning',
        prompt_type: 'GENERATE',
        description: 'Analyzes a top performer and generates a superior clone strategy + implementation.',
        required_inputs: ['target_name', 'target_url', 'industry'],
        optional_inputs: ['niche', 'revenue_model', 'client_base'],
        prompt_text: `You are a competitive cloning strategist. Build a superior clone of {{target_name}} ({{target_url}}) in the {{industry}} industry.

Target niche: {{niche|N/A}}
Their revenue model: {{revenue_model|N/A}}
Their client base: {{client_base|N/A}}

Analyze the target and produce a superiority strategy:
1. DESIGN DIRECTION — how to make ours visually superior (specific)
2. CONTENT ADVANTAGES — content to include that they lack
3. FEATURE ADVANTAGES — features to add that exceed theirs
4. CONVERSION IMPROVEMENTS — how to convert better than them
5. RECOMMENDED SECTIONS — sections to include
6. RECOMMENDED TONE — tone recommendation
7. RECOMMENDED COLORS — color recommendation with exact hex codes
8. WEAKNESSES TO EXPLOIT — gaps in their offering

Return a JSON object with all 8 fields populated with specific, actionable detail.`,
        tags: ['clone', 'competitive', 'strategy'],
        approval_required: false
      },
      {
        prompt_id: 'top-performer-discover-v2',
        tool_id: 'top-performer-discovery',
        tool_name: 'Top Performer Discovery',
        title: 'Top Profit Performer Discovery',
        prompt_type: 'GENERATE',
        description: 'Discovers the top profit-generating websites in an industry and analyzes their niche, revenue model, and client base.',
        required_inputs: ['industry'],
        optional_inputs: ['limit'],
        prompt_text: `Research the top {{limit|3}} highest-profit, highest-traffic websites in the "{{industry}}" space. For each, identify: name, url, niche, revenue_model (exactly how they make money), estimated_revenue, client_base (who their customers are), target_audience, value_proposition, design_strengths, key_features, weaknesses, profit_potential, and a superiority_strategy for cloning. Focus on real, well-known, high-revenue sites.`,
        tags: ['discovery', 'top-performer', 'research'],
        approval_required: false
      },
      {
        prompt_id: 'website-validate-v2',
        tool_id: 'fl-website',
        tool_name: 'FaultLine Website Validator',
        title: 'Strict 100/100 Parity & Operational Validation',
        prompt_type: 'VALIDATE',
        description: 'Scores a generated website against its design pack for parity and operational readiness. 100/100 is mandatory.',
        required_inputs: ['business_name', 'design_pack_spec', 'live_html'],
        optional_inputs: ['screenshot_url', 'deployed_url'],
        prompt_text: `You are the FaultLine Autonomous Validation Engine. Score a generated website against its design pack spec and for operational readiness. 100/100 is MANDATORY to pass — only award 100 when there are zero defects.

BUSINESS: {{business_name}}
DEPLOYED URL: {{deployed_url|N/A}}

Score TWO dimensions, each 0-100:
1. PARITY SCORE — exact colors match hex values, exact fonts match, all pages present as distinct sections, all components present, responsive grid system. 100 = zero defects.
2. OPERATIONAL SCORE — navigation works, forms present with proper elements, no broken links, no JS errors, responsive, all CTAs functional, content renders fully. 100 = zero operational defects.

Return: parity_score, operational_score, test_score (min of two), mandatory_passed (true ONLY when both are exactly 100), summary, and issues array (each with severity, description, fix). Be STRICT — do not round up.`,
        tags: ['validation', 'qa', 'parity'],
        approval_required: false
      },
      {
        prompt_id: 'pipeline-coach-v2',
        tool_id: 'generation-pipeline',
        tool_name: 'Generation Pipeline AI Coach',
        title: 'AI Pipeline Step Guidance',
        prompt_type: 'COACH',
        description: 'Provides AI guidance for each step of the generation pipeline — recommends the best approach for maximum quality.',
        required_inputs: ['step', 'industry'],
        optional_inputs: ['business_name', 'target_name', 'previous_results'],
        prompt_text: `You are the FaultLine AI Pipeline Coach. The operator is on step "{{step}}" of the generation pipeline for {{business_name|a new business}} in the {{industry}} industry.

Previous step results: {{previous_results|none}}

Provide concise, actionable guidance for THIS step to achieve the highest possible quality:
1. RECOMMENDATION — what to do and why (2-3 sentences)
2. BEST_PRACTICES — 3 specific best practices for this step
3. PARAMETERS — recommended parameters/settings for this step
4. PITFALLS — 2 common mistakes to avoid
5. NEXT_ACTION — the exact action to take

Be specific and practical. No generic advice.`,
        tags: ['coach', 'pipeline', 'guidance'],
        approval_required: false
      }
    ];

    // Load existing prompt_ids to skip duplicates
    const existing = await base44.asServiceRole.entities.PromptTemplate.filter(
      { organization_id: orgId, status: 'active' }, '-created_date', 500
    );
    const existingIds = new Set(existing.map(p => p.prompt_id));

    const toCreate = PROMPTS.filter(p => !existingIds.has(p.prompt_id)).map(p => ({
      organization_id: orgId,
      prompt_id: p.prompt_id,
      tool_id: p.tool_id,
      tool_name: p.tool_name,
      title: p.title,
      prompt_type: p.prompt_type,
      description: p.description,
      required_inputs: p.required_inputs,
      optional_inputs: p.optional_inputs,
      prompt_text: p.prompt_text,
      tags: p.tags,
      approval_required: p.approval_required,
      version: '2.0.0',
      status: 'active'
    }));

    let created = 0;
    if (toCreate.length > 0) {
      try {
        await base44.asServiceRole.entities.PromptTemplate.bulkCreate(toCreate);
        created = toCreate.length;
      } catch (e) {
        // Fallback: create one by one
        for (const p of toCreate) {
          try { await base44.asServiceRole.entities.PromptTemplate.create(p); created++; } catch (e2) {}
        }
      }
    }

    return Response.json({
      status: 'success',
      organization_id: orgId,
      total_prompts_in_library: PROMPTS.length,
      newly_seeded: created,
      already_existed: PROMPTS.length - created
    });
  } catch (error) {
    console.error('seedPromptLibrary error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}