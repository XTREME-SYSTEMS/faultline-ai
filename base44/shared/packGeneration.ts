// Shared pack-driven website generation — used by generateWebsite and the
// autonomous launch pipeline. Creates a "generating" Deliverable, then builds
// the site page-by-page in the background (each InvokeLLM call stays well under
// the platform's 120s cap), uploads the stitched HTML to file storage, and marks
// the deliverable ready. The caller wraps `background` in waitUntil().

export async function runPackGenerationBackground(base44, orgId, deliverableId, designPackId, opts) {
  const { business_name, industry, description, target_audience, tone, logo_url, qa_feedback } = opts;
  try {
    const pack = await base44.asServiceRole.entities.DesignPack.get(designPackId);
    const s = pack?.spec || {};
    const b = s.brand || {};
    const cols = b.colors || {};
    const bgColor = cols.background || '#000000';
    const primary = cols.primary || '#EDD80C';
    const secondary = cols.secondary || cols.background || '#1A1A1A';
    const accent = cols.accent || cols.primary || '#C0C0C0';
    const textColor = cols.text || '#FFFFFF';
    const mutedColor = cols.muted || '#9CA3AF';
    const cardColor = cols.card || '#111111';
    const headingFont = b.fonts?.heading || 'Orbitron';
    const bodyFont = b.fonts?.body || 'Rajdhani';
    const pagesToBuild = s.pages || [];
    const allComponents = s.components || [];
    const slug = (n) => (n || '').replace(/^\d+\.\s*/, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const pageTitle = (n) => (n || '').replace(/^\d+\.\s*/, '');

    const head = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${business_name} — ${industry || ''}</title>
<meta name="description" content="${(description || '').slice(0, 160)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}&family=${encodeURIComponent(bodyFont)}&display=swap" rel="stylesheet">
<style>
:root{--background:${bgColor};--primary:${primary};--secondary:${secondary};--accent:${accent};--text:${textColor};--muted:${mutedColor};--card:${cardColor}}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'${bodyFont}',sans-serif;background:var(--background);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased;scroll-behavior:smooth}
h1,h2,h3,h4,h5{font-family:'${headingFont}',sans-serif;letter-spacing:-.01em;line-height:1.2}a{text-decoration:none;color:inherit}
.btn{display:inline-block;padding:13px 26px;background:var(--primary);color:var(--background);border-radius:6px;font-weight:700;border:0;cursor:pointer;font-size:14px;transition:transform .15s,opacity .15s}.btn:hover{transform:translateY(-2px);opacity:.9}
.btn.outline{background:transparent;border:2px solid var(--primary);color:var(--primary)}
.btn.large{padding:16px 36px;font-size:16px}
section{padding:80px 20px;max-width:1200px;margin:0 auto;scroll-margin-top:70px}
section .section-head{text-align:center;max-width:700px;margin:0 auto 50px}
section .section-head h2{font-size:clamp(28px,4vw,42px);margin-bottom:14px}
section .section-head p{color:var(--muted);font-size:16px}
.grid{display:grid;gap:24px}.cards{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.card{background:var(--card);padding:32px;border-radius:10px;border:1px solid var(--secondary);transition:border-color .2s}.card:hover{border-color:var(--accent)}
.card .icon{font-size:36px;margin-bottom:16px}
.card h3{font-size:20px;margin-bottom:10px}
.card p{color:var(--muted);font-size:14px}
nav{position:sticky;top:0;background:var(--background);padding:16px 24px;display:flex;justify-content:space-between;align-items:center;z-index:100;border-bottom:1px solid var(--secondary)}
nav .brand{font-family:'${headingFont}',sans-serif;font-size:20px;color:var(--primary);font-weight:700;display:flex;align-items:center;gap:10px}
nav .brand img{height:36px;width:auto}
nav .links{display:flex;gap:24px;font-size:13px;font-weight:600;align-items:center}
nav .links a{color:var(--text);transition:color .15s}nav .links a:hover{color:var(--primary)}
nav .hamburger{display:none;background:none;border:0;color:var(--text);font-size:24px;cursor:pointer}
footer{background:var(--secondary);padding:48px 24px;text-align:center;color:var(--muted);border-top:1px solid var(--accent)}
footer a{color:var(--accent)}
form{display:grid;gap:14px;max-width:500px;margin:0 auto}
form label{display:grid;gap:6px;font-size:13px;font-weight:600;color:var(--muted)}
form input,form textarea,form select{padding:12px 14px;background:var(--secondary);border:1px solid var(--accent);border-radius:6px;color:var(--text);font-size:14px;font-family:inherit}
form input:focus,form textarea:focus{outline:none;border-color:var(--primary)}
.pricing-card{background:var(--card);padding:36px;border-radius:12px;border:2px solid var(--secondary);text-align:center}
.pricing-card.featured{border-color:var(--primary)}
.pricing-card .price{font-family:'${headingFont}',sans-serif;font-size:42px;color:var(--primary);margin:16px 0}
.pricing-card ul{list-style:none;text-align:left;margin:24px 0}
.pricing-card li{padding:8px 0;color:var(--muted);font-size:14px}
.pricing-card li:before{content:'✓';color:var(--primary);margin-right:10px;font-weight:700}
.kpi-card{background:var(--card);padding:24px;border-radius:10px;border:1px solid var(--secondary);text-align:center}
.kpi-card .num{font-family:'${headingFont}',sans-serif;font-size:36px;color:var(--primary)}
.kpi-card .label{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin-top:6px}
.testimonial-card{background:var(--card);padding:28px;border-radius:10px;border:1px solid var(--secondary)}
.testimonial-card .stars{color:var(--primary);margin-bottom:12px}
.testimonial-card .quote{font-size:14px;color:var(--text);font-style:italic;margin-bottom:14px}
.testimonial-card .author{color:var(--muted);font-size:13px}
.tabs{display:flex;gap:4px;border-bottom:2px solid var(--secondary);margin-bottom:24px}
.tabs button{padding:12px 20px;background:none;border:0;color:var(--muted);font-size:14px;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;font-family:inherit}
.tabs button.active{color:var(--primary);border-bottom-color:var(--primary)}
.progress-bar{height:8px;background:var(--secondary);border-radius:4px;overflow:hidden}.progress-bar .fill{height:100%;background:var(--primary);border-radius:4px}
.activity-item{display:flex;gap:14px;padding:14px 0;border-bottom:1px solid var(--secondary)}
.activity-item .dot{width:10px;height:10px;border-radius:50%;background:var(--primary);margin-top:6px;flex-shrink:0}
.activity-item .content{font-size:14px}.activity-item .content small{display:block;color:var(--muted);font-size:12px;margin-top:2px}
@media(max-width:768px){nav .links{display:none;position:absolute;top:100%;left:0;right:0;background:var(--background);flex-direction:column;padding:16px;border-bottom:1px solid var(--secondary)}nav .links.open{display:flex}nav .hamburger{display:block}section{padding:50px 16px}section .section-head{margin-bottom:30px}}
</style></head><body>
<nav><div class="brand">${logo_url ? `<img src="${logo_url}" alt="${business_name}">` : business_name}</div><div class="links" id="navlinks">${pagesToBuild.map(p => `<a href="#${slug(p.name)}">${pageTitle(p.name)}</a>`).join('')}</div><button class="hamburger" onclick="document.getElementById('navlinks').classList.toggle('open')">☰</button></nav>`;

    const foot = `<footer><p>© ${new Date().getFullYear()} ${business_name}. ${industry || ''}.</p><p style="margin-top:8px;color:var(--accent)">${b.tone || tone || ''}</p></footer>
<script>
document.querySelectorAll('nav .links a').forEach(a=>a.addEventListener('click',()=>document.getElementById('navlinks').classList.remove('open')));
document.querySelectorAll('form').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();const b=f.querySelector('button');if(b){const o=b.textContent;b.textContent='✓ Done';setTimeout(()=>b.textContent=o,1500);}});
</script></body></html>`;

    // SINGLE-CALL GENERATION — all pages in one InvokeLLM call (~60-90s).
    // Far more reliable than page-by-page (10 calls × 30s = 300s) and produces
    // a more cohesive site. Falls back to per-page generation for any missing sections.
    const allPagesSpec = pagesToBuild.map((pg, i) => `PAGE ${i + 1}: "${pageTitle(pg.name)}"
  ID: ${slug(pg.name)}
  PURPOSE: ${pg.purpose || ''}
  SECTIONS (include ALL): ${(pg.sections || []).join(', ')}
  COMPONENTS (include ALL): ${(pg.components || []).join(', ')}`).join('\n\n');

    const masterPrompt = `Generate ALL ${pagesToBuild.length} page sections for ${business_name} (${industry || 'the client'}) as a single HTML fragment. Output ONLY the <section> blocks — no <html>, <head>, <body>, or <style> tags.

BUSINESS: ${business_name} — ${description}
TARGET AUDIENCE: ${target_audience || 'general'}
TONE: ${tone}

CRITICAL DESIGN RULES — the page shell already defines these CSS custom properties in :root. You MUST use var() for EVERY color. NEVER hardcode hex color values.
  --background: ${bgColor}   (page background)
  --primary: ${primary}       (buttons, highlights, key accents)
  --secondary: ${secondary}   (borders, secondary surfaces, nav background)
  --accent: ${accent}         (subtle borders, footer links, dividers)
  --text: ${textColor}        (body text)
  --muted: ${mutedColor}      (secondary text, labels)
  --card: ${cardColor}        (card backgrounds)
Heading font: "${headingFont}". Body font: "${bodyFont}". These are already loaded — use them via font-family.

PAGES TO GENERATE (output one <section id="..."> per page, in this order):
${allPagesSpec}

OUTPUT RULES:
- Output ${pagesToBuild.length} <section id="...">...</section> blocks, one per page, in the order listed above.
- Each section MUST have the exact id specified (e.g. id="${slug(pagesToBuild[0]?.name || '')}").
- Include EVERY section and EVERY component listed for each page. Do not skip any.
- If the spec calls for forms (login, checkout, contact), build REAL <form> elements with <input>, <label>, <button> fields — not just visual placeholders.
- Write REAL marketing copy for ${business_name} drawn from the business description above. DO NOT copy sample/placeholder text, fake testimonials, or dummy statistics.
- Be complete, polished, and production-quality. Every component must have real content.
- Start with <section and end with </section>. Output all ${pagesToBuild.length} sections back to back.${qa_feedback ? `\n\nMANDATORY FIXES FROM PREVIOUS QA REVIEW — you MUST address every issue:\n${qa_feedback}` : ''}`;

    let allFrags = '';
    try {
      const r = await base44.integrations.Core.InvokeLLM({ prompt: masterPrompt, model: 'claude_sonnet_4_6' });
      allFrags = typeof r === 'string' ? r : (r?.content || r?.text || '');
      allFrags = allFrags.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    } catch (e) { console.error('master generation failed:', e.message); }

    // Parse the generated sections and fill in any missing ones individually
    const fragments = [];
    for (const pg of pagesToBuild) {
      const expectedId = slug(pg.name);
      // Try to extract this section from the bulk output
      const re = new RegExp(`<section[^>]*id=["']${expectedId}["'][^>]*>[\\s\\S]*?</section>`, 'i');
      const match = allFrags.match(re);
      if (match) {
        fragments.push(match[0]);
      } else {
        // Fallback: generate this single missing page
        let frag = '';
        try {
          const r = await base44.integrations.Core.InvokeLLM({ prompt: `Generate the "${pageTitle(pg.name)}" page/section for ${business_name} (${industry || ''}). Output ONLY a <section id="${expectedId}">...</section> HTML fragment. Use var() for all colors (--background:${bgColor} --primary:${primary} --secondary:${secondary} --accent:${accent} --text:${textColor} --muted:${mutedColor} --card:${cardColor}). Heading font "${headingFont}", body font "${bodyFont}". PURPOSE: ${pg.purpose || ''}. SECTIONS: ${(pg.sections || []).join(', ')}. COMPONENTS: ${(pg.components || []).join(', ')}. Write real copy for ${business_name}. Start with <section and end with </section>.`, model: 'claude_sonnet_4_6' });
          frag = typeof r === 'string' ? r : (r?.content || r?.text || '');
          frag = frag.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        } catch (e) { console.error('fallback gen failed', pg.name, e.message); }
        if (!frag || frag.length < 100) frag = `<section id="${expectedId}"><div class="section-head"><h2>${pageTitle(pg.name)}</h2><p>${pg.purpose || ''}</p></div><div class="grid cards"><div class="card"><h3>${pageTitle(pg.name)}</h3><p>Content for ${business_name}.</p></div></div></section>`;
        if (!frag.startsWith('<section')) frag = `<section id="${expectedId}">${frag}</section>`;
        fragments.push(frag);
      }
    }

    const html = head + '\n' + fragments.join('\n') + '\n' + foot;
    let fileUrl = null;
    try {
      const up = await base44.integrations.Core.UploadFile({ file: new Blob([html], { type: 'text/html' }) });
      fileUrl = up?.file_url || null;
    } catch (e) { console.error('upload failed:', e.message); }

    await base44.asServiceRole.entities.Deliverable.update(deliverableId, {
      content: '',
      file_url: fileUrl,
      status: 'generated',
      metadata: { business_name, industry, design_pack_id: designPackId, tone, pages: pagesToBuild.map(p => pageTitle(p.name)), logo_url: logo_url || null, file_url: fileUrl, generated_at: new Date().toISOString(), html_length: html.length }
    });
    await base44.asServiceRole.entities.Receipt.create({
      organization_id: orgId, system: 'website_generator', action: 'generate', status: 'success',
      summary: `Pack-driven website generated for ${business_name} (${pagesToBuild.length} pages)`,
      evidence: { deliverable_id: deliverableId, business_name, industry, file_url: fileUrl, design_pack_id: designPackId }
    });
  } catch (e) {
    console.error('pack generation failed:', e.message);
    try { await base44.asServiceRole.entities.Deliverable.update(deliverableId, { status: 'failed', metadata: { error: e.message } }); } catch {}
  }
}

// Creates the "generating" Deliverable and returns { deliverable_id, background }.
// The caller MUST wrap `background` in waitUntil() so it survives the response.
export async function kickoffPackDeliverable(base44, orgId, opts) {
  const { business_name, industry, design_pack_id, tone, logo_url, company_id, qa_feedback } = opts;
  const deliverable = await base44.asServiceRole.entities.Deliverable.create({
    organization_id: orgId,
    deliverable_type: 'website',
    title: `Website — ${business_name}`,
    content: '',
    status: 'generating',
    metadata: { business_name, industry, design_pack_id, tone, logo_url: logo_url || null }
  });
  if (company_id) {
    try { await base44.asServiceRole.entities.Deliverable.update(deliverable.id, { company_id }); } catch (e) {}
  }
  const background = runPackGenerationBackground(base44, orgId, deliverable.id, design_pack_id, opts);
  return { deliverable_id: deliverable.id, background };
}