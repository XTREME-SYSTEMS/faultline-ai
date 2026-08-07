// Shared pack-driven website generation — used by generateWebsite and the
// autonomous launch pipeline. Creates a "generating" Deliverable, then builds
// the site page-by-page in the background (each InvokeLLM call stays well under
// the platform's 120s cap), uploads the stitched HTML to file storage, and marks
// the deliverable ready. The caller wraps `background` in waitUntil().

export async function runPackGenerationBackground(base44, orgId, deliverableId, designPackId, opts) {
  const { business_name, industry, description, target_audience, tone, logo_url } = opts;
  try {
    const pack = await base44.asServiceRole.entities.DesignPack.get(designPackId);
    const s = pack?.spec || {};
    const b = s.brand || {};
    const cols = b.colors || {};
    const bgColor = cols.background || '#0A0A0A';
    const primary = cols.primary || '#C89B3C';
    const accent = cols.accent || cols.primary || '#C89B3C';
    const textColor = cols.text || '#FFFFFF';
    const mutedColor = cols.muted || '#A3A3A3';
    const cardColor = cols.card || '#171717';
    const headingFont = b.fonts?.heading || 'Inter';
    const bodyFont = b.fonts?.body || 'DM Sans';
    const pagesToBuild = (s.pages || []).slice(0, 5);
    const slug = (n) => (n || '').replace(/^\d+\.\s*/, '').replace(/[^a-z0-9]/gi, '').toLowerCase();

    const head = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${business_name} — ${industry || ''}</title>
<meta name="description" content="${(description || '').slice(0, 160)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}&family=${encodeURIComponent(bodyFont)}&display=swap" rel="stylesheet">
<style>
:root{--primary:${primary};--secondary:${bgColor};--accent:${accent};--text:${textColor};--muted:${mutedColor};--card:${cardColor}}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'${bodyFont}',sans-serif;background:${bgColor};color:${textColor};line-height:1.6;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4,h5{font-family:'${headingFont}',serif;letter-spacing:-.02em}a{text-decoration:none;color:inherit}
.btn{display:inline-block;padding:13px 26px;background:var(--primary);color:${bgColor};border-radius:6px;font-weight:700;border:0;cursor:pointer;font-size:14px}
.btn.outline{background:transparent;border:1px solid var(--accent);color:var(--text)}
section{padding:90px 20px;max-width:1200px;margin:0 auto}
.grid{display:grid;gap:24px}.cards{grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.card{background:var(--card);padding:28px;border-radius:10px;border:1px solid var(--accent)}
nav{position:sticky;top:0;background:var(--secondary);padding:18px 24px;display:flex;justify-content:space-between;align-items:center;z-index:50;border-bottom:1px solid var(--accent);backdrop-filter:blur(8px)}
nav .brand{font-family:'${headingFont}',serif;font-size:20px;color:var(--primary);font-weight:700}
nav .links{display:flex;gap:22px;font-size:13px;font-weight:600}
footer{background:var(--secondary);padding:48px 24px;text-align:center;color:var(--muted);border-top:1px solid var(--accent)}
@media(max-width:768px){nav .links{display:none}section{padding:60px 16px}}
</style></head><body>
<nav><div class="brand">${logo_url ? `<img src="${logo_url}" alt="${business_name}" style="height:36px">` : business_name}</div><div class="links">${pagesToBuild.map(p => `<a href="#${slug(p.name)}">${(p.name || '').replace(/^\d+\.\s*/, '')}</a>`).join('')}</div></nav>`;

    const foot = `<footer><p>© ${new Date().getFullYear()} ${business_name}. ${industry || ''}.</p><p style="margin-top:8px;color:var(--accent)">${b.tone || tone || ''}</p></footer></body></html>`;

    const fragments = [];
    for (const pg of pagesToBuild) {
      const pagePrompt = `Generate the "${pg.name}" page/section for ${business_name} (${industry || 'the client'}).
BUSINESS: ${business_name} — ${description}
TARGET AUDIENCE: ${target_audience || 'general'}
TONE: ${tone}
EXACT DESIGN (CSS variables already defined in the page shell — use them, do not redefine): --primary:${primary}, --secondary:${bgColor}, --accent:${accent}, --text:${textColor}, --muted:${mutedColor}, --card:${cardColor}. Heading font: "${headingFont}". Body font: "${bodyFont}".
PAGE PURPOSE: ${pg.purpose || ''}
SECTIONS TO INCLUDE: ${(pg.sections || []).join(', ')}
COMPONENTS TO INCLUDE: ${(pg.components || []).join(', ')}
LAYOUT: ${pg.layout_description || 'modular responsive grid'}

OUTPUT RULES:
- Output a single <section id="${slug(pg.name)}">...</section> HTML fragment ONLY.
- NO <html>, <head>, <body>, or <style> tags — the shell already has them. You MAY use inline style attributes and <style> scoped to this section if needed.
- Write REAL marketing copy for ${business_name} drawn from the business description above.
- DO NOT copy any sample/placeholder text, fake testimonials, or dummy statistics — the pack's sample text only informs style and role.
- Be complete and polished but efficient.
Start with <section and end with </section>.`;
      try {
        const r = await base44.integrations.Core.InvokeLLM({ prompt: pagePrompt, model: 'claude_sonnet_4_6' });
        let frag = typeof r === 'string' ? r : (r?.content || r?.text || '');
        frag = frag.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        if (!frag.startsWith('<section')) frag = `<section id="${slug(pg.name)}">${frag}</section>`;
        fragments.push(frag);
      } catch (e) { console.error('page gen failed', pg.name, e.message); }
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
      metadata: { business_name, industry, design_pack_id: designPackId, tone, pages: pagesToBuild.map(p => p.name), logo_url: logo_url || null, file_url: fileUrl, generated_at: new Date().toISOString() }
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
  const background = runPackGenerationBackground(base44, orgId, deliverable.id, design_pack_id, opts);
  return { deliverable_id: deliverable.id, background };
}