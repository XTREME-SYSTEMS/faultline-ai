import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Generates replacement assets for a RebrandProject: logo, hero/section images,
// and replacement copy — using the platform's GenerateImage + InvokeLLM integrations.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { rebrand_project_id } = await req.json();
    if (!rebrand_project_id) return Response.json({ error: 'rebrand_project_id required' }, { status: 400 });

    const project = await base44.entities.RebrandProject.get(rebrand_project_id);
    const biz = project.recommended_business_name || 'New Local Business';
    const domain = project.recommended_domain || 'newlocalbiz.com';

    await base44.entities.RebrandProject.update(rebrand_project_id, { status: 'generating_assets' });

    // 1. Logo
    const logoRes = await base44.integrations.Core.GenerateImage({
      prompt: `Minimalist modern logo for a business named "${biz}". Clean vector mark, professional, simple, on white background, centered, no text watermark. Brand-safe original design.`
    });
    const logoUrl = logoRes.url;

    // 2. Replacement images (limit to 4 to control cost)
    const imgTasks = (project.images_to_replace || []).slice(0, 4).map(async (img) => {
      const r = await base44.integrations.Core.GenerateImage({
        prompt: img.replacement_prompt || `Professional original marketing image for a ${biz} website, modern, high quality, no logos or watermarks.`
      });
      return r.url;
    });
    const generatedImages = await Promise.all(imgTasks);

    // 3. Replacement copy — generate a full content map via LLM
    const contentPrompt = `You are a brand-safe content writer. A cloned website is being rebranded to a new, legally-safe business named "${biz}" (domain: ${domain}). The following content must be replaced. For each item, provide a polished, original replacement. Also generate any missing core sections a local-service business website needs (hero headline, about, services, CTA, contact). Return a JSON object mapping section names to replacement copy.

Content to replace:
${JSON.stringify(project.content_to_replace || [], null, 2)}

Brand references that must NOT appear: ${JSON.stringify(project.brand_references || [])}`;

    const content = await base44.integrations.Core.InvokeLLM({
      prompt: contentPrompt,
      response_json_schema: {
        type: 'object',
        additionalProperties: { type: 'string' },
        properties: {
          hero_headline: { type: 'string' },
          hero_subheadline: { type: 'string' },
          about: { type: 'string' },
          services: { type: 'string' },
          cta: { type: 'string' },
          contact: { type: 'string' }
        }
      }
    });

    // 4. Build the rebranded HTML by applying replacements to a clean template
    const html = buildRebrandedHtml(biz, domain, logoUrl, generatedImages, content);

    await base44.entities.RebrandProject.update(rebrand_project_id, {
      generated_logo_url: logoUrl,
      generated_images: generatedImages,
      generated_content: content,
      rebrand_html: html,
      status: 'ready'
    });

    const updated = await base44.entities.RebrandProject.get(rebrand_project_id);
    return Response.json({ project: updated });
  } catch (error) {
    console.error('generateRebrandAssets error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function buildRebrandedHtml(biz, domain, logoUrl, images, content) {
  const hero = images[0] || '';
  const about = images[1] || '';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${biz} | Local Services</title><meta name="description" content="${content.hero_subheadline || biz + ' — professional local services.'}"><style>
*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
body{color:#0f172a;background:#fff}
header{display:flex;align-items:center;justify-content:space-between;padding:20px 6vw;border-bottom:1px solid #e2e8f0}
.logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:20px}
.logo img{height:40px}
nav a{margin-left:24px;color:#475569;text-decoration:none;font-size:14px;font-weight:600}
.hero{text-align:center;padding:80px 6vw;background:linear-gradient(180deg,#f8fafc,#fff)}
.hero h1{font-size:clamp(32px,5vw,56px);line-height:1.1;letter-spacing:-.02em}
.hero p{margin:18px auto 0;max-width:640px;color:#475569;font-size:18px}
.hero img{display:block;margin:36px auto 0;max-width:1000px;width:100%;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.1)}
.cta{display:inline-block;margin-top:28px;padding:14px 28px;background:#0f766e;color:#fff;border-radius:8px;font-weight:700;text-decoration:none}
section{padding:80px 6vw;max-width:1100px;margin:0 auto}
.about{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}
.about img{width:100%;border-radius:16px}
h2{font-size:32px;margin-bottom:16px}
p.body{color:#475569;line-height:1.7;font-size:17px}
.services{background:#f8fafc}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px;margin-top:32px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px}
.card h3{margin-bottom:8px}
footer{padding:40px 6vw;background:#0f172a;color:#cbd5e1;text-align:center}
@media(max-width:700px){.about{grid-template-columns:1fr}}
</style></head><body>
<header><div class="logo"><img src="${logoUrl}" alt="${biz} logo">${biz}</div><nav><a href="#about">About</a><a href="#services">Services</a><a href="#contact">Contact</a></nav></header>
<div class="hero"><h1>${content.hero_headline || biz}</h1><p>${content.hero_subheadline || ''}</p>${hero ? `<img src="${hero}" alt="${biz} hero">` : ''}<a class="cta" href="#contact">Get a Free Quote</a></div>
<section class="about" id="about"><div>${about ? `<img src="${about}" alt="About ${biz}">` : ''}</div><div><h2>About ${biz}</h2><p class="body">${content.about || ''}</p></div></section>
<section class="services" id="services"><h2>Our Services</h2><p class="body">${content.services || ''}</p><div class="grid">${(content.services||'').split(/[.,]/).filter(s=>s.trim().length>3).slice(0,6).map(s=>`<div class="card"><h3>${s.trim()}</h3></div>`).join('')}</div></section>
<section id="contact"><h2>Contact ${biz}</h2><p class="body">${content.contact || 'Call or email us today to get started.'}</p><p class="body" style="margin-top:12px"><strong>${domain}</strong></p></section>
<footer><p>&copy; ${new Date().getFullYear()} ${biz}. All rights reserved.</p></footer>
</body></html>`;
}