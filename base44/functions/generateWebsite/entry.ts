import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil } from "base44:runtime";
import { resolvePrompt } from '../../shared/promptLibrary.ts';
import { kickoffPackDeliverable } from '../../shared/packGeneration.ts';
import { enforceDnaParity } from '../../shared/dnaEnforcer.ts';

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
      pages, tone, include_features, company_id, competitor_analysis, logo_url, platform, design_pack_id,
      part, first_html, second_html, target_dna, fix_directives
    } = body;

    if (!business_name) return Response.json({ error: 'business_name required' }, { status: 400 });
    if (!description) return Response.json({ error: 'description required' }, { status: 400 });

    let color = primary_color || '#C89B3C';
    let color2 = secondary_color || '#0a0a0a';
    const font = font_style || 'modern';
    let requestedPages = pages || ['home', 'about', 'services', 'contact'];
    let features = include_features || ['hero', 'services', 'testimonials', 'contact_form', 'footer'];
    const voice = tone || 'professional';

    let googleFonts = font === 'classic' ? 'Playfair Display + Lato' : font === 'bold' ? 'Oswald + Open Sans' : 'Inter + Poppins';

    // Load design pack (vision-extracted spec) if provided — authoritative design DNA
    let designPackSection = '';
    if (design_pack_id) {
      try {
        const designPack = await base44.asServiceRole.entities.DesignPack.get(design_pack_id);
        if (designPack?.spec) {
          const s = designPack.spec;
          const b = s.brand || {};
          const cols = b.colors || {};
          if (cols.primary) color = cols.primary;
          if (cols.secondary || cols.background) color2 = cols.secondary || cols.background;
          if (b.fonts?.heading) googleFonts = `${b.fonts.heading} + ${b.fonts.body || b.fonts.heading}`;
          if (s.pages?.length) requestedPages = s.pages.slice(0, 3).map(p => p.name);
          if (s.components?.length) features = s.components.slice(0, 10);
          designPackSection = `
=== DESIGN PACK: REPRODUCE EXACTLY (Source of Truth) ===
Pack: ${designPack.pack_name} (${designPack.pack_type})
Brand: ${b.name || business_name} — ${b.style_description || ''}
Exact colors (use as CSS custom properties — DO NOT shift hues):
  --background: ${cols.background || '#0A0A0A'}
  --primary: ${cols.primary || color}
  --secondary: ${cols.secondary || color2}
  --accent: ${cols.accent || cols.primary || color}
  --text: ${cols.text || '#FFFFFF'}
  --muted: ${cols.muted || '#A3A3A3'}
  --card: ${cols.card || '#171717'}
Exact fonts: heading "${b.fonts?.heading || 'Inter'}", body "${b.fonts?.body || 'DM Sans'}" — load from Google Fonts.
Tone: ${b.tone || voice}
Pages (build in this exact order, with these exact sections):
${(s.pages || []).slice(0, 3).map((p, i) => `${i + 1}. ${p.name} — ${p.purpose || ''}
   Sections: ${(p.sections || []).join(', ')}
   Layout: ${p.layout_description || 'modular grid'}
   Components: ${(p.components || []).join(', ')}`).join('\n')}
Reusable components (include all): ${(s.components || []).slice(0, 10).join(', ')}
Layout system: ${s.layout_system || 'modular card-based grid'}
Visual hierarchy: ${s.visual_hierarchy || 'high-contrast headers on dark backgrounds'}
Tech stack: ${(s.tech_stack || []).join(', ')}
Architecture: ${s.architecture || 'N/A'}
PWA features: ${(s.pwa_features || []).join(', ') || 'none specified'}
Generation instructions: ${s.generation_instructions || 'Reproduce the design above faithfully.'}

FAITHFULNESS CONTRACT:
- Use the EXACT hex colors above as CSS custom properties. Do not invent or shift colors.
- Load the EXACT fonts above from Google Fonts. Do not substitute.
- Build every page above, in order, with the listed sections and components. Do not add or drop pages.
- Reproduce every component listed above.
- Follow the layout system and visual hierarchy exactly.
- CONTENT RULE: Write REAL copy for ${business_name} (${industry || 'the client'}) using the business description and target audience provided. DO NOT copy any sample/placeholder text from the pack — the pack's sample text only informs STYLE and ROLE. Never invent fake testimonials, stats, or business names.
=== END DESIGN PACK ===
`;
        }
      } catch (e) { console.log('design pack load skipped:', e.message); }
    }

    // ===== Pack-driven path: async page-by-page generation (delegated to shared module) =====
    if (design_pack_id) {
      const { deliverable_id, background } = await kickoffPackDeliverable(base44, orgId, {
        business_name, industry, description, target_audience, tone: voice, design_pack_id, logo_url, company_id
      });
      waitUntil(background);
      return Response.json({
        status: 'generating',
        deliverable_id,
        business_name,
        message: 'Pack-driven generation started. Poll the deliverable for the file_url.'
      });
    }
    // ===== end pack-driven path =====

    // ===== Split (2-call) path: keeps each browser call under the ~60s gateway timeout =====
    // The frontend calls first_half, then second_half with the returned html.
    // Both calls use a lean prompt (no PCU library load) and the second half does NOT
    // feed first_html back into the LLM — it only uses it for the final stitch — so each
    // call stays well under the gateway limit.
    if (part === 'first_half' || part === 'second_half' || part === 'third_half') {
      // Reproduction contract from scraped target DNA — drives visual parity to 100.
      let reproductionContract = '';
      if (target_dna) {
        const nav = (target_dna.nav || []).filter(n => n && n.length > 1);
        const h2 = (target_dna.h2 || []).filter(h => h && h.length > 1);
        const phone = target_dna.phone;
        const palette = (target_dna.colors || []).slice(0, 6);
        reproductionContract = `
=== TARGET REPRODUCTION CONTRACT (MANDATORY — reproduce VERBATIM) ===
These elements were scraped from the original site and MUST appear in the generated site EXACTLY as written:
NAVIGATION ITEMS — use these exact labels in the navbar (reproduce every one, in order):
${nav.map((n, i) => `${i + 1}. ${n}`).join('\n')}
SECTION HEADINGS — use these exact texts as <h2> elements:
${h2.map((h, i) => `${i + 1}. ${h}`).join('\n')}
PHONE NUMBER — display it in the header, footer, and contact section: ${phone || '(none found — omit)'}
BRAND PALETTE — use these exact hex colors as CSS custom properties: ${palette.join(', ') || (color + ', ' + color2)}
CONTACT SECTION — include a "Contact" section containing the phone number and a <form>.
${target_dna.layout ? `STRUCTURAL LAYOUT BLUEPRINT (reproduce this structure — these are real patterns detected from the target):
${target_dna.layout}` : ''}
CONTENT RULE: Write fresh marketing copy for ${business_name}, but the NAV ITEMS, SECTION HEADINGS, PHONE NUMBER, and STRUCTURAL LAYOUT above are STRUCTURAL REQUIREMENTS — reproduce them faithfully. Do NOT invent different nav labels, headings, or layouts. If the target has a before/after slider, vertical tabs, 3D diagrams, or a gallery grid — BUILD those interactive elements, do not substitute simpler versions.
=== END REPRODUCTION CONTRACT ===`;
      }
      if (fix_directives) {
        reproductionContract += `

=== FIX DIRECTIVES (previous validation failed — resolve these specifically) ===
${fix_directives}
Fix every issue above while still reproducing the TARGET REPRODUCTION CONTRACT elements verbatim.
=== END FIX DIRECTIVES ===`;
      }
      const sharedCtx = `You are an elite web designer and developer. Output ONLY valid HTML — no markdown, no code fences, no explanations.

BUSINESS: ${business_name}
INDUSTRY: ${industry || 'General'}
DESCRIPTION: ${description}
TARGET AUDIENCE: ${target_audience || 'General consumers and businesses'}
BRAND COLOR: ${color}
SECONDARY COLOR: ${color2}
FONT STYLE: ${font} (modern=sans-serif, classic=serif, bold=condensed)
TONE: ${voice}
LOGO: ${logo_url ? `Use this logo image URL in the navbar and footer: ${logo_url}` : 'No logo — create a text-based wordmark'}
GOOGLE FONTS: ${googleFonts}
${reproductionContract}`;

      const healModel = 'gemini_3_flash'; // layout blueprint + fix-dominant prompt are the key improvements
      // Target screenshot for visual reference — if present, the LLM can SEE what to reproduce
      const targetScreenshotUrl = target_dna?.screenshot_url || null;
      const visionFileUrls = targetScreenshotUrl ? [targetScreenshotUrl] : [];
      // gemini_3_flash supports vision + file_urls — use it when we have a screenshot
      const visionModel = targetScreenshotUrl ? 'gemini_3_flash' : healModel;

      if (part === 'first_half') {
        // When fix_directives are present (heal mode), they ARE the structure guide —
        // the generic section list is replaced by the specific failures to resolve.
        const healStructure = fix_directives ? `
CRITICAL — this is a HEAL iteration. The previous version was validated by screenshot comparison and FAILED. You MUST resolve every fix directive below. These are NOT suggestions — they are mandatory structural changes derived from a real screenshot diff:

${fix_directives}

Build the first half to specifically resolve every issue above. Match the target's ACTUAL layout (hero with background image + form box, 3D diagrams, vertical tabbed services, before/after sliders, etc.) — do NOT fall back to a generic hero/services/stats template. Use real Unsplash image URLs (https://images.unsplash.com/...) for all images — never use /api/placeholder or broken image paths.` : '';

        const visualRef = targetScreenshotUrl ? `
A SCREENSHOT OF THE TARGET SITE IS ATTACHED. Reproduce its visual layout, section structure, colors, spacing, and component placement as faithfully as possible. The screenshot is your primary visual reference — match the hero layout, section order, image placement, and overall design language you see in it.` : '';

        const firstPrompt = `${sharedCtx}
${healStructure}
${visualRef}

Generate the FIRST HALF of a single-page website as ONE complete HTML document. Start with <!DOCTYPE html>. Include <head> with: charset, viewport, title, meta description, Open Graph tags, Schema.org JSON-LD (LocalBusiness), Google Fonts links, and ALL CSS inside a single <style> tag (use CSS custom properties --primary:${color} and --secondary:${color2}; fully responsive mobile-first; modern animations, gradients, shadows, glassmorphism, micro-interactions). Then open <body> and include these sections ONLY: sticky navbar with mobile hamburger toggle, hero (gradient/animated background, compelling headline, dual CTA buttons), services grid (inline SVG icons, hover lift), about (gradient image placeholder), stats with animated counters. Write REAL compelling copy tailored to ${business_name} from the description — no placeholder text, no fake stats. STOP after the stats section — do NOT output testimonials, contact, footer, </body>, or </html>.`;

        const r1 = await base44.integrations.Core.InvokeLLM({ prompt: firstPrompt, model: visionModel, file_urls: visionFileUrls.length ? visionFileUrls : undefined });
        let html = typeof r1 === 'string' ? r1 : r1?.content || r1?.text || JSON.stringify(r1);
        html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        return Response.json({ status: 'success', part: 'first_half', html });
      }

      // second_half — testimonials + contact + footer ONLY (HTML fragments, no <script>).
      // Keeping JS out of this call keeps it fast; the script is generated in third_half.
      if (part === 'second_half') {
        const healNote = fix_directives ? `
CRITICAL — HEAL iteration. Resolve these specific failures from the screenshot diff (apply to the sections you're generating — testimonials, contact, footer, and any lower-page sections like before/after sliders, upgrade sections, locations accordion):
${fix_directives}
Use real Unsplash image URLs for all images. Style every section fully — no raw unstyled HTML dumps.` : '';

        const secondPrompt = `${sharedCtx}
${healNote}

Generate the SECOND PART of the same single-page website. Output HTML fragments — NO <!DOCTYPE>, NO <html>, NO <head>, NO <script>. You MUST include a <style> block at the top with all CSS needed for these sections (using --primary:${color} and --secondary:${color2} custom properties; fully responsive; match the visual style of the first half). Output these sections in order, each with proper CSS classes and full styling: a testimonials section (styled cards with star ratings on a themed background), a contact section (working form: name, email, message, submit button — styled inputs, not raw unstyled HTML), and a footer (multi-column layout with links, inline SVG social icons, copyright). Fully responsive. Write REAL compelling copy for ${business_name} — no placeholder text, no fake testimonials. Use ONLY real Unsplash image URLs (https://images.unsplash.com/photo-...) for any images — never use /api/placeholder or relative paths.`;

        const r2 = await base44.integrations.Core.InvokeLLM({ prompt: secondPrompt, model: visionModel, file_urls: visionFileUrls.length ? visionFileUrls : undefined });
        let secondHtml = typeof r2 === 'string' ? r2 : r2?.content || r2?.text || JSON.stringify(r2);
        secondHtml = secondHtml.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        return Response.json({ status: 'success', part: 'second_half', html: secondHtml });
      }

      // third_half — deterministic JS (hardcoded for reliability + speed) + stitch.
      // No LLM call needed: the JS is standard boilerplate (nav toggle, reveal on
      // scroll, stat counters, smooth scroll, back-to-top). Hardcoding eliminates a
      // full LLM round-trip (~10-15s) and the risk of broken/malformed JS from the model.
      const scriptTag = `<script>
(function(){
  var btn=document.querySelector('.nav-toggle,.menu-toggle,.hamburger,[aria-label="Menu"]');
  var nav=document.querySelector('nav');
  if(btn&&nav){btn.addEventListener('click',function(){nav.classList.toggle('open');btn.classList.toggle('active');});}
  var obs=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target);}});},{threshold:0.15});
  document.querySelectorAll('.reveal,[data-reveal]').forEach(function(el){obs.observe(el);});
  var counters=document.querySelectorAll('[data-count],.stat-number,.counter');
  var co=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;var el=e.target;var target=parseInt(el.getAttribute('data-count')||el.textContent||'0',10);var cur=0;var step=Math.max(1,Math.ceil(target/40));var t=setInterval(function(){cur+=step;if(cur>=target){cur=target;clearInterval(t);}el.textContent=cur.toLocaleString();},25);co.unobserve(el);});},{threshold:0.5});
  counters.forEach(function(c){co.observe(c);});
  document.querySelectorAll('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){var id=a.getAttribute('href');if(id.length>1){var t=document.querySelector(id);if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth'});}}});});
  var bt=document.createElement('button');bt.innerHTML='\\u2191';bt.style.cssText='position:fixed;bottom:20px;right:20px;width:44px;height:44px;border-radius:50%;border:0;background:var(--primary,#C89B3C);color:#fff;font-size:20px;cursor:pointer;opacity:0;transition:opacity .3s;z-index:999;box-shadow:0 4px 12px rgba(0,0,0,.2)';bt.onclick=function(){window.scrollTo({top:0,behavior:'smooth'});};document.body.appendChild(bt);window.addEventListener('scroll',function(){bt.style.opacity=window.scrollY>400?'1':'0';});
})();
</script>`;

      // Stitch: first_html + second_html + script, inserted before </body>
      const combined = (second_html || '') + '\n' + scriptTag;
      let websiteHtml;
      if (first_html && /<\/body>/i.test(first_html)) {
        websiteHtml = first_html.replace(/<\/body>/i, combined + '\n</body>');
        if (!/<\/html>/i.test(websiteHtml)) websiteHtml += '\n</html>';
      } else {
        websiteHtml = (first_html || '') + '\n' + combined + '\n</body>\n</html>';
        if (!/<!DOCTYPE/i.test(websiteHtml)) websiteHtml = '<!DOCTYPE html>\n' + websiteHtml;
      }

      // Deterministically enforce target DNA parity (nav, headings, phone, contact) → visual 100
      if (target_dna) websiteHtml = enforceDnaParity(websiteHtml, target_dna);

      // Upload + save deliverable
      let fileUrl = null;
      try {
        const fileObj = typeof File !== 'undefined'
          ? new File([websiteHtml], 'index.html', { type: 'text/html' })
          : new Blob([websiteHtml], { type: 'text/html' });
        const upload = await base44.integrations.Core.UploadFile({ file: fileObj });
        fileUrl = upload?.file_url || null;
      } catch (e) { console.error('generateWebsite upload failed:', e); }

      const deliverableData = {
        organization_id: orgId,
        deliverable_type: 'website',
        title: `Website — ${business_name}`,
        content: fileUrl ? '' : websiteHtml.slice(0, 5000),
        file_url: fileUrl,
        metadata: { business_name, industry, primary_color: color, secondary_color: color2, font_style: font, tone: voice, generated_at: new Date().toISOString() },
        status: 'generated'
      };
      if (company_id) deliverableData.company_id = company_id;
      const deliverable = await base44.asServiceRole.entities.Deliverable.create(deliverableData);
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId, system: 'website_generator', action: 'generate', status: 'success',
        summary: `Generated website for ${business_name} (${industry || 'general'})`,
        evidence: { deliverable_id: deliverable.id, business_name, industry, file_url: fileUrl }
      });
      return Response.json({ status: 'success', deliverable_id: deliverable.id, website_html: websiteHtml, file_url: fileUrl, business_name, message: 'Website generated successfully' });
    }
    // ===== end split path =====

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
    if (!design_pack_id) {
    try {
      const [masterPrompts, templates, heroCopy, sections, brandPacks, industryTemplates] = await Promise.all([
        base44.asServiceRole.entities.PromptTemplate.filter({ organization_id: orgId, tool_id: 'pcu-website-generator', prompt_type: 'MASTER', status: 'active' }, '-created_date', 1),
        base44.asServiceRole.entities.WebsiteLibraryAsset.filter({ organization_id: orgId, library_type: 'template_catalog', status: 'active' }, '-created_date', 3),
        base44.asServiceRole.entities.WebsiteLibraryAsset.filter({ organization_id: orgId, library_type: 'hero_copy', status: 'active' }, '-created_date', 3),
        base44.asServiceRole.entities.WebsiteLibraryAsset.filter({ organization_id: orgId, library_type: 'section_library', status: 'active' }, '-created_date', 5),
        base44.asServiceRole.entities.WebsiteLibraryAsset.filter({ organization_id: orgId, library_type: 'brand_pack', status: 'active' }, '-created_date', 2),
        base44.asServiceRole.entities.WebsiteLibraryAsset.filter({ organization_id: orgId, library_type: 'industry_template', status: 'active' }, '-created_date', 5)
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
        pcuContext += `\n\n=== INDUSTRY REFERENCE TEMPLATES (match or exceed these real-world leaders' quality) ===\n`;
        pcuContext += industryTemplates.map(t => {
          const d = t.data || {};
          const s = d.scraped || {};
          const v = s.visual || {};
          return `- ${t.name}: niche=${d.niche_label || 'unknown'} | strengths=${(d.design_strengths || []).slice(0, 3).join('; ')} | colors=${(v.visual_palette || s.colors || []).slice(0, 4).join(', ') || d.color_scheme || 'n/a'} | fonts=${(s.fonts || []).slice(0, 2).join(', ') || 'n/a'} | aesthetic=${v.aesthetic_score || '?'}/10 | layout=${v.layout_pattern || 'n/a'} | conversion=${(v.conversion_patterns || []).slice(0, 2).join('; ')}`;
        }).join('\n');
        pcuContext += `\n=== END INDUSTRY TEMPLATES ===\nAdopt the best patterns above as your quality benchmark.\n`;
      }
    } catch (e) { console.log('PCU library load skipped:', e.message); }
    }

    // Load platform blueprint if a platform was specified
    let platformBlueprint = null;
    if (platform) {
      try {
        const blueprints = await base44.asServiceRole.entities.WebsiteLibraryAsset.filter(
          { organization_id: orgId, library_type: 'platform_blueprint', status: 'active' },
          '-created_date', 10
        );
        platformBlueprint = blueprints.find(b =>
          (b.data?.platform_name || '').toLowerCase() === platform.toLowerCase() ||
          (b.record_id || '').toLowerCase().includes(platform.toLowerCase().replace(/[^a-z0-9]/g, '-'))
        ) || blueprints[0] || null;
      } catch (e) { console.log('platform blueprint load skipped:', e.message); }
    }
    const platformSection = platformBlueprint ? `
=== PLATFORM BLUEPRINT: Replicate the approach of ${platformBlueprint.data?.platform_name || platform} ===
Editor Type: ${platformBlueprint.data?.editor_type || 'N/A'}
Template System: ${platformBlueprint.data?.template_system || 'N/A'}
Component Library (include these): ${(platformBlueprint.data?.component_library || []).join(', ')}
Design System: ${platformBlueprint.data?.design_system || 'N/A'}
Page Types: ${(platformBlueprint.data?.page_types || []).join(', ')}
Built-in Features (include these): ${(platformBlueprint.data?.built_in_features || []).join(', ')}
Content Management: ${platformBlueprint.data?.content_management || 'N/A'}
Generation Approach: ${platformBlueprint.data?.generation_approach || 'N/A'}
Replication Instructions: ${platformBlueprint.data?.replication_instructions || 'N/A'}
=== END PLATFORM BLUEPRINT ===
Follow the replication instructions above. Include the listed components, features, and design patterns. The generated website should feel like it was built using ${platformBlueprint.data?.platform_name || platform}'s builder.
` : '';

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
${platformSection}
${designPackSection}
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

Generate the COMPLETE website now. Start with <!DOCTYPE html> and end with </html>. Be COMPLETE and POLISHED but EFFICIENT — every section present with tight, non-redundant copy; do not pad with filler. Every section must have real, compelling copy tailored to ${business_name} using the business description above. Do NOT copy the pack's sample/placeholder text, fake testimonials, or dummy stats — write actual marketing copy from the real business data. Do not use placeholder text.`);

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash'
    });

    let websiteHtml = typeof res === 'string' ? res : res?.content || res?.text || JSON.stringify(res);
    // Strip any markdown code fences if present
    websiteHtml = websiteHtml.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    // Ensure it starts with <!DOCTYPE
    if (!websiteHtml.startsWith('<!DOCTYPE') && !websiteHtml.startsWith('<!doctype')) {
      websiteHtml = '<!DOCTYPE html>\n' + websiteHtml;
    }

    // Deterministically enforce target DNA parity (nav, headings, phone, contact) → visual 100
    if (target_dna) websiteHtml = enforceDnaParity(websiteHtml, target_dna);

    // Save as a Deliverable
    // Large HTML exceeds the entity field-size limit — upload to file storage and store the URL.
    let fileUrl = null;
    try {
      const fileObj = typeof File !== 'undefined'
        ? new File([websiteHtml], 'index.html', { type: 'text/html' })
        : new Blob([websiteHtml], { type: 'text/html' });
      const upload = await base44.integrations.Core.UploadFile({ file: fileObj });
      fileUrl = upload?.file_url || null;
    } catch (e) { console.error('generateWebsite upload failed:', e); }

    const deliverableData = {
      organization_id: orgId,
      deliverable_type: 'website',
      title: `Website — ${business_name}`,
      content: fileUrl ? '' : websiteHtml.slice(0, 5000),
      file_url: fileUrl,
      metadata: {
        business_name, industry, primary_color: color, secondary_color: color2,
        font_style: font, tone: voice, pages: requestedPages, features,
        logo_url: logo_url || null, generated_at: new Date().toISOString(),
        design_pack_id: design_pack_id || null
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
      evidence: { deliverable_id: deliverable.id, business_name, industry, file_url: fileUrl }
    });

    return Response.json({
      status: 'success',
      deliverable_id: deliverable.id,
      website_html: websiteHtml,
      file_url: fileUrl,
      business_name,
      message: 'Website generated successfully'
    });
  } catch (error) {
    console.error('generateWebsite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}