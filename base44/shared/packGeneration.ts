// Shared pack-driven website generation — used by the autonomous launch pipeline.
// The generation is driven by the workflow, which calls generateSiteBatch for each
// batch of pages, then stitchSite to combine them. This avoids waitUntil reliability
// issues and implements SPEED-03 (streaming generation with section-by-section progress).

// Build the HTML shell (head + nav + foot) from the design pack spec.
export function buildShell(spec, opts) {
  const { business_name, industry, description, tone, logo_url } = opts;
  const s = spec || {};
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
document.querySelectorAll('form').forEach(f=>f.addEventListener('submit',e=>{e.preventDefault();const b=f.querySelector('button');if(b){const o=b.textContent;b.textContent='✓ Done';setTimeout(()=>b.textContent=o,1500);}}));
</script></body></html>`;

  return { head, foot, colors: { bgColor, primary, secondary, accent, textColor, mutedColor, cardColor }, fonts: { headingFont, bodyFont }, pages: pagesToBuild, slug, pageTitle };
}

// Build the LLM prompt for a single batch of pages.
export function buildBatchPrompt(shellData, batch, batchStartIndex, opts) {
  const { business_name, industry, description, target_audience, tone, qa_feedback } = opts;
  const { colors, fonts, slug, pageTitle } = shellData;
  const batchSpec = batch.map((pg, i) => `PAGE ${batchStartIndex + i + 1}: "${pageTitle(pg.name)}"
  ID: ${slug(pg.name)}
  PURPOSE: ${pg.purpose || ''}
  SECTIONS (include ALL): ${(pg.sections || []).join(', ')}
  COMPONENTS (include ALL): ${(pg.components || []).join(', ')}`).join('\n\n');

  return `Generate ${batch.length} page sections for ${business_name} (${industry || 'the client'}). Output ONLY <section> blocks — no <html>, <head>, <body>, or <style> tags.

BUSINESS: ${business_name} — ${description}
TARGET AUDIENCE: ${target_audience || 'general'}
TONE: ${tone}

CRITICAL DESIGN RULES — the page shell already defines these CSS custom properties in :root. You MUST use var() for EVERY color. NEVER hardcode hex values.
  --background: ${colors.bgColor}  --primary: ${colors.primary}  --secondary: ${colors.secondary}  --accent: ${colors.accent}
  --text: ${colors.textColor}  --muted: ${colors.mutedColor}  --card: ${colors.cardColor}
Heading font: "${fonts.headingFont}". Body font: "${fonts.bodyFont}". Already loaded — use via font-family.

PAGES TO GENERATE (one <section id="..."> per page, in order):
${batchSpec}

OUTPUT RULES:
- Output ${batch.length} <section id="...">...</section> blocks, one per page, in order.
- Each section MUST have the exact id specified.
- Include EVERY section and EVERY component. Do not skip any.
- Build REAL <form> elements with <input>, <label>, <button> where forms are needed.
- Write REAL marketing copy for ${business_name}. No placeholder text or fake testimonials.
- Start with <section and end with </section>.${qa_feedback ? `\n\nMANDATORY FIXES FROM PREVIOUS QA REVIEW:\n${qa_feedback}` : ''}`;
}

// Parse sections from LLM output, fill missing ones with fallback.
export function parseBatchSections(batchFrags, batch, shellData) {
  const { slug, pageTitle, colors, fonts } = shellData;
  const fragments = [];
  for (const pg of batch) {
    const expectedId = slug(pg.name);
    const re = new RegExp(`<section[^>]*id=["']${expectedId}["'][^>]*>[\\s\\S]*?</section>`, 'i');
    const match = batchFrags.match(re);
    if (match) {
      fragments.push(match[0]);
    } else {
      fragments.push(`<section id="${expectedId}"><div class="section-head"><h2>${pageTitle(pg.name)}</h2><p>${pg.purpose || ''}</p></div><div class="grid cards"><div class="card"><h3>${pageTitle(pg.name)}</h3><p>Content for this section.</p></div></div></section>`);
    }
  }
  return fragments;
}

// Clean LLM output (strip markdown code fences).
export function cleanLlmOutput(r) {
  let text = typeof r === 'string' ? r : (r?.content || r?.text || '');
  return text.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
}

// Creates the "generating" Deliverable and returns its id.
// The workflow drives batch generation by calling generateSiteBatch repeatedly.
export async function kickoffPackDeliverable(base44, orgId, opts) {
  const { business_name, industry, design_pack_id, tone, logo_url, company_id } = opts;
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
  return { deliverable_id: deliverable.id };
}