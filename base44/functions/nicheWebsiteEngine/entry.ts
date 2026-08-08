import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Niche Website Engine — discovers trending, high-demand niches via LLM + web search,
// then generates a polished, production-ready website for each niche with Google Analytics
// tracking injected. Each site is a self-contained HTML page with modern design, SEO meta
// tags, schema markup, and conversion-optimized layout.
//
// Input:
//   max_niches (number, default 5) — how many niches to discover and build
//   ga_measurement_id (string, optional) — Google Analytics 4 measurement ID (G-XXXXXXXXXX)
//   industry (string, optional) — focus industry (default: general/trending)
//
// Output: array of generated websites with file_url for each

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const user = await base44.auth.me().catch(() => null);
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'No organization found' }, { status: 400 });

    const maxNiches = Math.min(10, Math.max(1, body.max_niches || 5));
    const gaId = body.ga_measurement_id || '';
    const industry = body.industry || 'general';

    // 1. Discover trending niches + generate website content in one LLM call
    const discoveryRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a master digital strategist. Discover the top ${maxNiches} trending, high-demand niches that people are most drawn to right now${industry !== 'general' ? ` in the ${industry} space` : ''}.

For EACH niche, generate complete, production-ready website content for a polished business website. The website must be conversion-optimized, mobile-responsive, and SEO-friendly.

For each niche, provide ALL of these fields:
- niche: the niche name (e.g. "AI-Powered Personal Finance", "Home Gym Equipment", "Pet Wellness")
- business_name: a professional, brandable business name for this niche
- tagline: a compelling 3-5 word tagline
- hero_headline: a powerful main headline (8-12 words)
- hero_subheadline: a supporting subheadline (15-25 words)
- primary_color: a hex color that fits the niche (e.g. "#2563eb")
- accent_color: a complementary hex color (e.g. "#f59e0b")
- features: 4-6 objects with { icon (emoji), title (3-5 words), description (15-25 words) }
- testimonials: 3 objects with { name, role, quote (15-30 words), rating (1-5) }
- cta_headline: a call-to-action headline (5-10 words)
- cta_button: CTA button text (2-4 words)
- contact_email: a professional email
- contact_phone: a phone number
- services: 4-6 service names (2-5 words each)
- about_text: 2-3 sentences about the business
- faqs: 3-5 objects with { question, answer }
- seo_description: meta description (150-160 chars)
- seo_keywords: comma-separated keywords

Focus on niches with HIGH search volume, STRONG commercial intent, and BROAD appeal. Mix evergreen niches (health, wealth, relationships) with trending ones (AI tools, sustainability, remote work). Each website should feel like a real, polished business — not a template.`,
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          websites: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                niche: { type: 'string' },
                business_name: { type: 'string' },
                tagline: { type: 'string' },
                hero_headline: { type: 'string' },
                hero_subheadline: { type: 'string' },
                primary_color: { type: 'string' },
                accent_color: { type: 'string' },
                features: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      icon: { type: 'string' },
                      title: { type: 'string' },
                      description: { type: 'string' }
                    }
                  }
                },
                testimonials: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      role: { type: 'string' },
                      quote: { type: 'string' },
                      rating: { type: 'number' }
                    }
                  }
                },
                cta_headline: { type: 'string' },
                cta_button: { type: 'string' },
                contact_email: { type: 'string' },
                contact_phone: { type: 'string' },
                services: { type: 'array', items: { type: 'string' } },
                about_text: { type: 'string' },
                faqs: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      question: { type: 'string' },
                      answer: { type: 'string' }
                    }
                  }
                },
                seo_description: { type: 'string' },
                seo_keywords: { type: 'string' }
              }
            }
          }
        }
      }
    });

    const websites = Array.isArray(discoveryRes.websites) ? discoveryRes.websites.slice(0, maxNiches) : [];
    if (websites.length === 0) return Response.json({ error: 'No niches generated' }, { status: 500 });

    // 2. Build polished HTML + upload each website
    const generated = [];
    for (const content of websites) {
      try {
        const html = buildWebsite(content, gaId);
        const safeName = (content.business_name || content.niche || 'website').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        const file = new File([html], `${safeName}.html`, { type: 'text/html' });
        const upload = await base44.integrations.Core.UploadFile({ file });

        // Save as Deliverable
        await base44.entities.Deliverable.create({
          organization_id: orgId,
          deliverable_type: 'website',
          title: `${content.business_name} — ${content.niche}`,
          file_url: upload.file_url || null,
          content: '',
          metadata: {
            niche: content.niche,
            business_name: content.business_name,
            ga_measurement_id: gaId,
            seo_keywords: content.seo_keywords,
            generated_by: 'nicheWebsiteEngine'
          },
          status: 'generated'
        });

        generated.push({
          niche: content.niche,
          business_name: content.business_name,
          tagline: content.tagline,
          file_url: upload.file_url,
          seo_description: content.seo_description
        });
      } catch (e) {
        console.error(`Failed to build website for ${content.niche}: ${e.message}`);
      }
    }

    // 3. Receipt
    try {
      await base44.asServiceRole.entities.Receipt.create({
        organization_id: orgId,
        system: 'niche_website_engine',
        action: 'generate_niche_websites',
        status: 'success',
        summary: `Generated ${generated.length} polished niche websites with Google Analytics tracking`,
        evidence: { count: generated.length, ga_id: gaId, industry, niches: generated.map(g => g.niche) }
      });
    } catch (e) {}

    return Response.json({
      status: 'success',
      count: generated.length,
      ga_measurement_id: gaId,
      websites: generated,
      message: `Generated ${generated.length} polished, production-ready niche websites`
    });
  } catch (error) {
    console.error('nicheWebsiteEngine error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ===== Polished HTML Template Builder =====
function buildWebsite(c, gaId) {
  const primary = c.primary_color || '#2563eb';
  const accent = c.accent_color || '#f59e0b';
  const features = (c.features || []).map(f => `
    <div class="feature-card">
      <div class="feature-icon">${f.icon || '✨'}</div>
      <h3>${esc(f.title)}</h3>
      <p>${esc(f.description)}</p>
    </div>`).join('');
  const testimonials = (c.testimonials || []).map(t => `
    <div class="testimonial-card">
      <div class="stars">${'★'.repeat(t.rating || 5)}${'☆'.repeat(5 - (t.rating || 5))}</div>
      <p class="quote">"${esc(t.quote)}"</p>
      <div class="author"><b>${esc(t.name)}</b> <span>${esc(t.role)}</span></div>
    </div>`).join('');
  const services = (c.services || []).map(s => `<li>${esc(s)}</li>`).join('');
  const faqs = (c.faqs || []).map(f => `
    <details class="faq-item">
      <summary>${esc(f.question)}</summary>
      <p>${esc(f.answer)}</p>
    </details>`).join('');
  const gaScript = gaId ? `
    <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}');
    </script>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(c.business_name)} — ${esc(c.tagline)}</title>
  <meta name="description" content="${esc(c.seo_description || c.hero_subheadline || '')}">
  <meta name="keywords" content="${esc(c.seo_keywords || '')}">
  <meta property="og:title" content="${esc(c.business_name)} — ${esc(c.tagline)}">
  <meta property="og:description" content="${esc(c.seo_description || '')}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  ${gaScript}
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"LocalBusiness","name":"${esc(c.business_name)}","description":"${esc(c.seo_description || '')}","email":"${esc(c.contact_email || '')}","telephone":"${esc(c.contact_phone || '')}"}
  </script>
  <style>
    :root { --primary: ${primary}; --accent: ${accent}; --dark: #0f172a; --gray: #64748b; --light: #f8fafc; --border: #e2e8f0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; color: var(--dark); line-height: 1.6; }
    a { text-decoration: none; color: inherit; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    header { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,.85); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); }
    .nav { display: flex; align-items: center; justify-content: space-between; height: 72px; }
    .logo { font-size: 20px; font-weight: 800; color: var(--primary); }
    .logo span { color: var(--accent); }
    .nav-links { display: flex; gap: 32px; }
    .nav-links a { font-size: 15px; font-weight: 500; color: var(--gray); transition: color .2s; }
    .nav-links a:hover { color: var(--primary); }
    .btn { display: inline-block; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; border: none; cursor: pointer; transition: transform .2s, box-shadow .2s; }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px ${primary}40; }
    .btn-accent { background: var(--accent); color: #fff; }
    .hero { padding: 80px 0 100px; background: linear-gradient(135deg, ${primary}08, ${accent}08); position: relative; overflow: hidden; }
    .hero::before { content: ''; position: absolute; top: -50%; right: -10%; width: 600px; height: 600px; background: radial-gradient(circle, ${primary}15, transparent 70%); border-radius: 50%; }
    .hero-grid { display: grid; grid-template-columns: 1.2fr .8fr; gap: 60px; align-items: center; position: relative; }
    .hero h1 { font-size: clamp(36px, 5vw, 56px); font-weight: 900; line-height: 1.1; letter-spacing: -.02em; margin-bottom: 20px; }
    .hero h1 span { color: var(--primary); }
    .hero p { font-size: 19px; color: var(--gray); margin-bottom: 32px; max-width: 540px; }
    .hero-actions { display: flex; gap: 16px; flex-wrap: wrap; }
    .hero-visual { background: linear-gradient(135deg, var(--primary), var(--accent)); border-radius: 20px; height: 380px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 64px; box-shadow: 0 20px 60px ${primary}30; }
    .features { padding: 100px 0; }
    .section-head { text-align: center; margin-bottom: 60px; }
    .section-head h2 { font-size: clamp(30px, 4vw, 42px); font-weight: 800; margin-bottom: 16px; }
    .section-head p { color: var(--gray); font-size: 18px; max-width: 600px; margin: 0 auto; }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .feature-card { padding: 32px; border: 1px solid var(--border); border-radius: 16px; transition: transform .2s, box-shadow .2s; }
    .feature-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px #0001; border-color: var(--primary); }
    .feature-icon { width: 56px; height: 56px; border-radius: 12px; background: ${primary}15; display: flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 20px; }
    .feature-card h3 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    .feature-card p { color: var(--gray); font-size: 15px; }
    .testimonials { padding: 100px 0; background: var(--light); }
    .testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
    .testimonial-card { background: #fff; padding: 32px; border-radius: 16px; border: 1px solid var(--border); }
    .stars { color: var(--accent); font-size: 18px; margin-bottom: 16px; }
    .quote { font-size: 16px; font-style: italic; color: var(--dark); margin-bottom: 20px; }
    .author b { display: block; font-size: 15px; }
    .author span { font-size: 13px; color: var(--gray); }
    .cta { padding: 100px 0; background: linear-gradient(135deg, var(--primary), var(--accent)); color: #fff; text-align: center; }
    .cta h2 { font-size: clamp(30px, 4vw, 42px); font-weight: 800; margin-bottom: 16px; }
    .cta p { font-size: 18px; opacity: .9; margin-bottom: 32px; }
    .cta .btn { background: #fff; color: var(--primary); font-size: 17px; padding: 16px 36px; }
    .about { padding: 100px 0; }
    .about-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
    .about-grid h2 { font-size: 32px; font-weight: 800; margin-bottom: 20px; }
    .about-grid p { color: var(--gray); font-size: 17px; margin-bottom: 24px; }
    .about-grid ul { list-style: none; }
    .about-grid li { padding: 10px 0; border-bottom: 1px solid var(--border); font-weight: 500; display: flex; align-items: center; gap: 10px; }
    .about-grid li::before { content: '✓'; color: var(--accent); font-weight: 900; }
    .faq { padding: 100px 0; background: var(--light); }
    .faq-grid { max-width: 760px; margin: 0 auto; }
    .faq-item { background: #fff; border: 1px solid var(--border); border-radius: 12px; margin-bottom: 12px; overflow: hidden; }
    .faq-item summary { padding: 20px 24px; font-weight: 600; cursor: pointer; font-size: 16px; list-style: none; display: flex; justify-content: space-between; }
    .faq-item summary::after { content: '+'; font-size: 24px; color: var(--primary); }
    .faq-item[open] summary::after { content: '−'; }
    .faq-item p { padding: 0 24px 20px; color: var(--gray); font-size: 15px; }
    .contact { padding: 100px 0; }
    .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
    .contact-info h2 { font-size: 32px; font-weight: 800; margin-bottom: 20px; }
    .contact-info p { color: var(--gray); font-size: 17px; margin-bottom: 12px; }
    .contact-form { display: grid; gap: 16px; }
    .contact-form input, .contact-form textarea { padding: 14px 18px; border: 2px solid var(--border); border-radius: 10px; font-size: 15px; font-family: inherit; transition: border-color .2s; }
    .contact-form input:focus, .contact-form textarea:focus { outline: none; border-color: var(--primary); }
    footer { background: var(--dark); color: #fff; padding: 60px 0 30px; }
    .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 40px; margin-bottom: 40px; }
    .footer-grid h4 { font-size: 14px; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 16px; color: var(--accent); }
    .footer-grid a { display: block; color: #94a3b8; font-size: 14px; margin-bottom: 8px; transition: color .2s; }
    .footer-grid a:hover { color: #fff; }
    .footer-bottom { border-top: 1px solid #1e293b; padding-top: 30px; text-align: center; color: #64748b; font-size: 14px; }
    @media (max-width: 768px) {
      .nav-links { display: none; }
      .hero-grid, .about-grid, .contact-grid { grid-template-columns: 1fr; }
      .hero-visual { display: none; }
      .footer-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <nav class="nav">
        <a href="#" class="logo">${esc(c.business_name)}<span>.</span></a>
        <div class="nav-links">
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#testimonials">Reviews</a>
          <a href="#faq">FAQ</a>
          <a href="#contact">Contact</a>
        </div>
        <a href="#contact" class="btn btn-primary" style="padding:10px 22px;font-size:14px;">${esc(c.cta_button || 'Get Started')}</a>
      </nav>
    </div>
  </header>

  <section class="hero">
    <div class="container">
      <div class="hero-grid">
        <div>
          <h1>${esc(c.hero_headline)}</h1>
          <p>${esc(c.hero_subheadline)}</p>
          <div class="hero-actions">
            <a href="#contact" class="btn btn-primary">${esc(c.cta_button || 'Get Started')}</a>
            <a href="#features" class="btn btn-accent" style="background:#fff;color:var(--primary);">Learn More</a>
          </div>
        </div>
        <div class="hero-visual">${(c.features && c.features[0]) ? c.features[0].icon : '🚀'}</div>
      </div>
    </div>
  </section>

  <section class="features" id="features">
    <div class="container">
      <div class="section-head">
        <h2>Why Choose ${esc(c.business_name)}?</h2>
        <p>We deliver exceptional results tailored to your needs in the ${esc(c.niche)} space.</p>
      </div>
      <div class="features-grid">${features}</div>
    </div>
  </section>

  <section class="about" id="about">
    <div class="container">
      <div class="about-grid">
        <div>
          <h2>About ${esc(c.business_name)}</h2>
          <p>${esc(c.about_text)}</p>
          <ul>${services}</ul>
        </div>
        <div class="hero-visual" style="height:300px;">${(c.features && c.features[1]) ? c.features[1].icon : '💡'}</div>
      </div>
    </div>
  </section>

  <section class="testimonials" id="testimonials">
    <div class="container">
      <div class="section-head">
        <h2>What Our Clients Say</h2>
        <p>Trusted by thousands of satisfied customers.</p>
      </div>
      <div class="testimonials-grid">${testimonials}</div>
    </div>
  </section>

  <section class="faq" id="faq">
    <div class="container">
      <div class="section-head">
        <h2>Frequently Asked Questions</h2>
      </div>
      <div class="faq-grid">${faqs}</div>
    </div>
  </section>

  <section class="cta">
    <div class="container">
      <h2>${esc(c.cta_headline)}</h2>
      <p>Join thousands who trust ${esc(c.business_name)} for their ${esc(c.niche)} needs.</p>
      <a href="#contact" class="btn">${esc(c.cta_button || 'Get Started')}</a>
    </div>
  </section>

  <section class="contact" id="contact">
    <div class="container">
      <div class="contact-grid">
        <div class="contact-info">
          <h2>Get In Touch</h2>
          <p>📧 ${esc(c.contact_email || 'hello@example.com')}</p>
          <p>📞 ${esc(c.contact_phone || '(555) 123-4567')}</p>
          <p>Ready to get started? Send us a message and we'll respond within 24 hours.</p>
        </div>
        <form class="contact-form" onsubmit="event.preventDefault(); this.reset(); alert('Thank you! We\\'ll be in touch shortly.');">
          <input type="text" placeholder="Your Name" required>
          <input type="email" placeholder="Your Email" required>
          <textarea rows="4" placeholder="Your Message" required></textarea>
          <button type="submit" class="btn btn-primary">Send Message</button>
        </form>
      </div>
    </div>
  </section>

  <footer>
    <div class="container">
      <div class="footer-grid">
        <div>
          <a href="#" class="logo" style="color:#fff;">${esc(c.business_name)}<span style="color:var(--accent);">.</span></a>
          <p style="color:#94a3b8;font-size:14px;margin-top:12px;max-width:300px;">${esc(c.seo_description || c.tagline || '')}</p>
        </div>
        <div>
          <h4>Services</h4>
          ${(c.services || []).slice(0, 5).map(s => `<a href="#">${esc(s)}</a>`).join('')}
        </div>
        <div>
          <h4>Company</h4>
          <a href="#about">About Us</a>
          <a href="#contact">Contact</a>
          <a href="#faq">FAQ</a>
          <a href="#testimonials">Reviews</a>
        </div>
      </div>
      <div class="footer-bottom">
        © ${new Date().getFullYear()} ${esc(c.business_name)}. All rights reserved.
      </div>
    </div>
  </footer>
</body>
</html>`;
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}