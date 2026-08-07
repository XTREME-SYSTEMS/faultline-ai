import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { resolvePrompt } from '../../shared/promptLibrary.ts';

// Ultra-powered AI Website Generator
// Generates a complete, production-ready website as a single HTML file with:
// - Modern responsive design with animations
// - SEO-optimized content and meta tags
// - Schema.org structured data
// - Conversion-optimized CTAs
// - Brand-matched colors and typography
// - Multiple sections (hero, services, about, testimonials, contact, footer)
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = user.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const {
      business_name, industry, description, target_audience,
      primary_color, secondary_color, font_style,
      pages, tone, include_features, company_id, competitor_analysis, logo_url
    } = body;

    if (!business_name) return Response.json({ error: 'business_name required' }, { status: 400 });
    if (!description) return Response.json({ error: 'description required' }, { status: 400 });

    const color = primary_color || '#C89B3C';
    const color2 = secondary_color || '#0a0a0a';
    const font = font_style || 'modern';
    const requestedPages = pages || ['home', 'about', 'services', 'contact'];
    const features = include_features || ['hero', 'services', 'testimonials', 'contact_form', 'footer'];
    const voice = tone || 'professional';

    const googleFonts = font === 'classic' ? 'Playfair Display + Lato' : font === 'bold' ? 'Oswald + Open Sans' : 'Inter + Poppins';
    const competitorSection = competitor_analysis ? `
COMPETITOR ANALYSIS — you must create a website that is EQUIVALENT OR BETTER than these top 3 competitors:
${JSON.stringify(competitor_analysis, null, 2)}

You must incorporate the superiority strategy: match their best features, avoid their weaknesses, and exceed their design quality. The generated website must be demonstrably superior to all 3 competitors analyzed above.
` : '';

    const promptVars = {
      BUSINESS_NAME: business_name,
      INDUSTRY: industry || 'General',
      DESCRIPTION: description,
      TARGET_AUDIENCE: target_audience || 'General consumers and businesses',
      PRIMARY_COLOR: color,
      SECONDARY_COLOR: color2,
      FONT_STYLE: font,
      TONE: voice,
      LOGO_INSTRUCTION: logo_url ? `Use this logo image URL in the navbar and footer: ${logo_url}` : 'No logo provided — create a text-based wordmark logo',
      PAGES: requestedPages.join(', '),
      FEATURES: features.join(', '),
      COMPETITOR_SECTION: competitorSection,
      GOOGLE_FONTS: googleFonts
    };

    // Load PCU Website Generator library context (master prompt + curated assets)
    let pcuContext = '';
    try {
      const [masterPrompts, templates, heroCopy, sections, brandPacks, industryTemplates] = await Promise.all([
        base44.asServiceRole.entities.PromptTemplate.filter({ organization_id: orgId, tool_id: 'pcu-website-generator', prompt_type: 'MASTER', status: 'active' }, '-created_date', 1),
        base44.asServiceRole.entities.WebsiteLibraryAsset.filter({ organization_id: orgId, library_type: 'template_catalog', status: 'active' }, '-created_date', 3),
        base44.asServiceRole.entities.WebsiteLibraryAsset.filter({ organization_id: orgId, library_type: 'hero_copy', status: 'active' }, '-created_date', 3),
        base44.asServiceRole.entities.WebsiteLibraryAsset.filter({ organization_id: orgId, library_type: 'section_library', status: 'active' }, '-created_date', 5),
        base44.asServiceRole.entities.WebsiteLibraryAsset.filter({ organization_id: orgId, library_type: 'brand_pack', status: 'active' }, '-created_date', 2),
        base44.asServiceRole.entities.WebsiteLibraryAsset.filter({ organization_id: orgId, library_type: 'industry_template', status: 'active' }, '-created_date', 15)
      ]);
      if (masterPrompts.length > 0) {
        pcuContext += `\n\n=== PCU GOVERNANCE FRAMEWORK ===\n${masterPrompts[0].prompt_text}\n=== END GOVERNANCE ===\n`;
      }
      if (templates.length > 0) {
        pcuContext += `\n\nAPPROVED TEMPLATE OPTIONS (use as design direction):\n${templates.map(t => `- ${t.record_id}: ${t.name} — ${t.data['Visual DNA'] || t.data['Layout System'] || ''}`).join('\n')}\n`;
      }
      if (heroCopy.length > 0) {
        pcuContext += `\nHERO COPY DIRECTIONS (adapt tone, don't copy verbatim):\n${heroCopy.map(h => `- ${h.record_id}: ${h.data['Hero Headline'] || h.data['Headline'] || h.name}`).join('\n')}\n`;
      }
      if (sections.length > 0) {
        pcuContext += `\nSECTION PATTERNS (incorporate relevant ones):\n${sections.map(s => `- ${s.record_id}: ${s.name} — ${s.data['Section Type'] || s.data['Purpose'] || ''}`).join('\n')}\n`;
      }
      if (brandPacks.length > 0) {
        pcuContext += `\nBRAND PACK REFERENCES:\n${brandPacks.map(b => `- ${b.record_id}: ${b.name} — ${b.data['Color Palette'] || b.data['Typography'] || ''}`).join('\n')}\n`;
      }
      if (industryTemplates.length > 0) {
        pcuContext += `\n\n=== INDUSTRY REFERENCE TEMPLATES (real-world top contractor websites — STUDY these and produce a site that MATCHES OR EXCEEDS their quality) ===\n`;
        pcuContext += industryTemplates.map(t => {
          const d = t.data || {};
          const s = d.scraped || {};
          return `- ${t.record_id}: ${t.name} (${d.url})
    Niche: ${d.niche_label} | Location: ${d.location || 'US'}
    Design Strengths: ${(d.design_strengths || []).join('; ')}
    Key Features: ${(d.key_features || []).join(', ')}
    Content Strategy: ${d.content_strategy}
    Colors: ${(s.colors || []).join(', ') || d.color_scheme || 'unknown'}
    Fonts: ${(s.fonts || []).join(', ') || 'unknown'}
    Tech: ${(s.techStack || []).join(', ')}
    Word Count: ${s.wordCount || 'unknown'} | Images: ${s.imageCount || 'unknown'} | CTAs: ${s.ctaCount || 'unknown'}`;
        }).join('\n');
        pcuContext += `\n=== END INDUSTRY TEMPLATES ===\nUse these as your quality benchmark. Adopt the best design patterns, color schemes, and content strategies. Ensure the generated website is at least as polished and feature-rich as these real-world leaders.\n`;
      }
    } catch (e) { console.log('PCU library load skipped:', e.message); }

    const prompt = await resolvePrompt(base44, orgId, 'fl-website', 'GENERATE', promptVars,
      `You are an elite web designer and developer. Generate a COMPLETE, production-ready website for the following business. Output ONLY valid HTML with embedded CSS and JS — no markdown, no explanations, no code fences.

BUSINESS: ${business_name}
INDUSTRY: ${industry || 'General'}
DESCRIPTION: ${description}
TARGET AUDIENCE: ${target_audience || 'General consumers and businesses'}
BRAND COLOR: ${color}
SECONDARY COLOR: ${color2}
FONT STYLE: ${font} (modern=sans-serif, classic=serif, bold=condensed)
TONE: ${voice}
LOGO: ${logo_url ? `Use this logo image URL in the navbar and footer: ${logo_url}` : 'No logo provided — create a text-based wordmark logo'}
PAGES: ${requestedPages.join(', ')}
FEATURES: ${features.join(', ')}
${competitorSection}
${pcuContext}
REQUIREMENTS — this must be an ULTRA-AMAZING website:
1. Single HTML file with ALL CSS in <style> tags and ALL JS in <script> tags
2. Fully responsive — mobile-first design with breakpoints
3. Modern animations: fade-in on scroll, hover effects, smooth transitions, parallax hero
4. Sticky navigation with mobile hamburger menu (JS toggle)
5. Hero section with gradient/animated background, compelling headline, dual CTA buttons
6. Services/features grid with icons (use inline SVG or emoji), hover lift effect
7. Stats/numbers section with animated counters (JS)
8. Testimonials carousel (JS-powered, auto-rotating)
9. About section with image placeholder (use gradient div)
10. Contact section with working form (name, email, message, submit button)
11. Footer with links, social icons, copyright
12. SEO: title, meta description, Open Graph tags, Schema.org JSON-LD structured data
13. Use CSS custom properties for brand colors: --primary:${color}, --secondary:${color2}
14. Google Fonts: ${googleFonts}
15. Smooth scroll behavior, scroll-triggered animations using IntersectionObserver
16. Back-to-top button
17. Loading animation on hero
18. Accessible: alt texts, ARIA labels, semantic HTML5
19. Performance: lazy loading hints, optimized CSS
20. The design must be VISUALLY STUNNING — gradients, shadows, glassmorphism, micro-interactions

Generate the COMPLETE website now. Start with <!DOCTYPE html> and end with </html>. Make it long, detailed, and beautiful. Every section must have real, compelling copy tailored to ${business_name}. Do not use placeholder text — write actual marketing copy.`);

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_opus_4_8'
    });

    let websiteHtml = typeof res === 'string' ? res : res?.content || res?.text || JSON.stringify(res);
    // Strip any markdown code fences if present
    websiteHtml = websiteHtml.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    // Ensure it starts with <!DOCTYPE
    if (!websiteHtml.startsWith('<!DOCTYPE') && !websiteHtml.startsWith('<!doctype')) {
      websiteHtml = '<!DOCTYPE html>\n' + websiteHtml;
    }

    // Save as a Deliverable
    const deliverableData = {
      organization_id: orgId,
      deliverable_type: 'website',
      title: `Website — ${business_name}`,
      content: websiteHtml,
      metadata: {
        business_name, industry, primary_color: color, secondary_color: color2,
        font_style: font, tone: voice, pages: requestedPages, features,
        logo_url: logo_url || null, generated_at: new Date().toISOString()
      },
      status: 'generated'
    };
    if (company_id) deliverableData.company_id = company_id;
    const deliverable = await base44.asServiceRole.entities.Deliverable.create(deliverableData);

    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId,
      system: 'website_generator',
      action: 'generate',
      status: 'success',
      summary: `Generated website for ${business_name} (${industry || 'general'})`,
      evidence: { deliverable_id: deliverable.id, business_name, industry }
    });

    return Response.json({
      status: 'success',
      deliverable_id: deliverable.id,
      website_html: websiteHtml,
      business_name,
      message: 'Website generated successfully'
    });
  } catch (error) {
    console.error('generateWebsite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}