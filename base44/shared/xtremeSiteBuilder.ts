// Builds the complete Xtreme AI Systems platform HTML — a self-contained
// website with epoxy floor gallery, AI tools, web packs, app packs, an
// embedded website generator preview, and Stripe-linked pricing/checkout.
// Deployed as a static HTML file to Vercel.

const LOGO_URL = 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/d4886862e_generated_image.png';
const VIDEO_URLS = [
  'https://media.base44.com/videos/public/6a6e5a0e8a902b5e240d7633/f9a457916_Hero_Video_1.mp4',
  'https://media.base44.com/videos/public/6a6e5a0e8a902b5e240d7633/cda5e7588_Hero_Video_2.mp4'
];

const EPOXY_IMAGES = {
  metallic: [
    { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/7fb9ea22f_generated_image.png', title: 'Black & White Metallic', desc: 'Swirling monochrome pigments with a 3D liquid marble effect' },
    { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/daaf3187d_generated_image.png', title: 'Silver Metallic', desc: 'Chrome-like reflective surface with swirling silver pigments' },
    { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/dc888082e_generated_image.png', title: 'Gold Metallic', desc: 'Luxurious shimmering gold pigments in opulent 3D patterns' },
    { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/b7328d438_generated_image.png', title: 'Copper Bronze Metallic', desc: 'Warm metallic pigments with rich copper and bronze tones' },
    { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/9854276f1_generated_image.png', title: 'Pearlescent White Metallic', desc: 'Iridescent pigments catching the light in a luxury boutique' },
    { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/914b381f2_generated_image.png', title: 'Deep Blue Metallic', desc: 'Cobalt and navy blue pigments with a 3D liquid effect' },
    { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/e570b45ae_generated_image.png', title: 'Crimson Red Metallic', desc: 'Rich red and burgundy pigments in organic 3D patterns' }
  ],
  flake: [
    { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/7cd010d4e_generated_image.png', title: 'Lamborghini on Flake Floor', desc: 'Multi-colored flake chips in clear epoxy, luxury showroom' },
    { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/2f269e8b2_generated_image.png', title: 'Ferrari & Porsche Showroom', desc: 'Blue and silver flake floor in a high-end car showroom' },
    { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/b2047b81c_generated_image.png', title: 'McLaren on Gold Metallic', desc: 'Exotic supercar on a mirror-finish gold metallic floor' },
    { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/7643b3b3c_generated_image.png', title: 'Black Flake Garage', desc: 'Dark black base with metallic silver and gray flake chips' },
    { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/5068c7740_generated_image.png', title: 'White Flake Commercial', desc: 'Bright white base with blue and gray flake chips in retail' }
  ],
  specialty: [
    { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/ef86f817b_generated_image.png', title: '3D Geometric Black & Gold', desc: 'Intricate geometric pattern with optical illusion depth' },
    { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/140e8f09f_generated_image.png', title: 'Quartz Commercial Kitchen', desc: 'Multi-colored quartz granules in a non-slip textured surface' }
  ]
};

function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function trunc(s, n) { s = String(s||''); return s.length > n ? s.slice(0,n)+'…' : s; }

function buildGallery() {
  const cats = [
    { key: 'metallic', label: 'Metallic Epoxy', icon: '✦' },
    { key: 'flake', label: 'Flake Epoxy', icon: '✧' },
    { key: 'specialty', label: 'Specialty Epoxy', icon: '◈' }
  ];
  const tabs = cats.map((c,i) => 
    '<button class="gallery-tab' + (i===0?' active':'') + '" data-tab="' + c.key + '">' + c.icon + ' ' + c.label + '</button>'
  ).join('');
  
  const panels = cats.map((c,i) => {
    const imgs = EPOXY_IMAGES[c.key].map(img => 
      '<div class="gallery-card" data-full="' + img.url + '" data-title="' + esc(img.title) + '" data-desc="' + esc(img.desc) + '">' +
        '<div class="gallery-img-wrap"><img src="' + img.url + '" alt="' + esc(img.title) + '" loading="lazy" /></div>' +
        '<div class="gallery-card-body"><h3>' + esc(img.title) + '</h3><p>' + esc(img.desc) + '</p></div>' +
      '</div>'
    ).join('');
    return '<div class="gallery-panel' + (i===0?' active':'') + '" id="panel-' + c.key + '">' + imgs + '</div>';
  }).join('');
  
  return `
    <section class="section" id="gallery">
      <div class="container">
        <div class="section-head">
          <p class="eyebrow">Premium Epoxy Floor Gallery</p>
          <h2>Epoxy Floor Categories</h2>
          <p>Browse our full gallery of ultra-lifelike epoxy floor designs. From metallic to flake to specialty — see the quality you can offer your clients.</p>
        </div>
        <div class="gallery-tabs">${tabs}</div>
        ${panels}
      </div>
    </section>`;
}

function buildToolCards(appUrl, tools) {
  if (!tools || tools.length === 0) {
    return '<div class="empty-state"><p>AI tools are being loaded. <a href="' + appUrl + '/store">Browse the store →</a></p></div>';
  }
  return tools.map(t => 
    '<article class="product-card">' +
      '<div class="product-media">' +
        (t.tool_url ? '<a href="' + esc(t.tool_url) + '" target="_blank"><img src="' + esc(t.image_url || LOGO_URL) + '" alt="' + esc(t.name) + '" loading="lazy" /></a>' : '<div class="product-icon">⚡</div>') +
        '<span class="product-badge">AI TOOL</span>' +
      '</div>' +
      '<div class="product-body">' +
        '<h3>' + esc(t.name) + '</h3>' +
        '<p>' + esc(trunc(t.description || t.business_problem || '', 100)) + '</p>' +
        (t.benefits && t.benefits.length ? '<div class="product-tags">' + t.benefits.slice(0,3).map(b => '<span>' + esc(trunc(b,30)) + '</span>').join('') + '</div>' : '') +
        '<div class="product-footer"><span class="price">$' + (t.price || 29) + '</span>' +
        '<a href="' + appUrl + '/store" class="btn btn-gold btn-sm">Get Started</a></div>' +
      '</div>' +
    '</article>'
  ).join('');
}

function buildPackCards(appUrl, packs, type, price, badge) {
  if (!packs || packs.length === 0) {
    return '<div class="empty-state"><p>' + badge + ' packs are being loaded. <a href="' + appUrl + '/store">Browse the store →</a></p></div>';
  }
  return packs.map(p =>
    '<article class="product-card">' +
      '<div class="product-media">' +
        (p.url ? '<a href="' + esc(p.url) + '" target="_blank"><img src="' + esc(p.image || p.image_url || LOGO_URL) + '" alt="' + esc(p.name) + '" loading="lazy" /></a>' : '<div class="product-icon">📦</div>') +
        '<span class="product-badge">' + badge + '</span>' +
      '</div>' +
      '<div class="product-body">' +
        '<h3>' + esc(p.name) + '</h3>' +
        '<p>' + esc(trunc(p.description || p.value_proposition || '', 100)) + '</p>' +
        (p.key_features && p.key_features.length ? '<div class="product-tags">' + p.key_features.slice(0,3).map(f => '<span>' + esc(trunc(f,30)) + '</span>').join('') + '</div>' : '') +
        '<div class="product-footer"><span class="price">$' + price + '</span>' +
        '<a href="' + appUrl + '/store" class="btn btn-gold btn-sm">Use This Pack</a></div>' +
      '</div>' +
    '</article>'
  ).join('');
}

function buildDesignPackCards(appUrl, packs) {
  if (!packs || packs.length === 0) return '';
  return packs.slice(0, 6).map(p =>
    '<article class="product-card">' +
      '<div class="product-media">' +
        '<img src="' + esc(p.image_url) + '" alt="' + esc(p.pack_name) + '" loading="lazy" />' +
        '<span class="product-badge">DESIGN PACK</span>' +
      '</div>' +
      '<div class="product-body">' +
        '<h3>' + esc(p.pack_name) + '</h3>' +
        '<p>' + esc(trunc(p.spec?.brand?.style_description || 'Premium design pack ready for your business.', 100)) + '</p>' +
        '<div class="product-footer"><span class="price">$199+</span>' +
        '<a href="' + appUrl + '/store" class="btn btn-gold btn-sm">Build Website</a></div>' +
      '</div>' +
    '</article>'
  ).join('');
}

export function buildXtremeHtml(appUrl, products) {
  const { tools, webPacks, appPacks, designPacks } = products || {};
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Xtreme AI Systems — AI Website Builder for Epoxy Contractors</title>
<meta name="description" content="Build your epoxy business website with AI. Browse premium epoxy floor designs, choose a web pack, and let AI build your website in minutes.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Libre+Caslon+Display&display=swap" rel="stylesheet">
<link rel="icon" href="${LOGO_URL}">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0a;--card:#161616;--border:#2b2b2b;--gold:#FFD60A;--gold-light:#E7C86E;--gold-dark:#C89B3C;--text:#fff;--muted:#aaa;--radius:12px}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif;line-height:1.6;overflow-x:hidden}
img{max-width:100%;display:block}
a{color:inherit;text-decoration:none}
.container{max-width:1280px;margin:0 auto;padding:0 24px}
.eyebrow{color:var(--gold);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;margin-bottom:12px}
h1,h2,h3{font-family:'Libre Caslon Display',serif;letter-spacing:-.02em;line-height:1.1}
h1{font-size:clamp(40px,6vw,76px)}
h2{font-size:clamp(32px,4vw,52px);margin-bottom:16px}
h3{font-size:20px}
p{color:var(--muted)}
.section{padding:80px 0;border-top:1px solid var(--border)}
.section-head{max-width:720px;margin-bottom:40px}
.section-head p{font-size:17px}
.btn{display:inline-flex;align-items:center;justify-content:center;padding:14px 28px;border-radius:8px;border:1px solid transparent;font-weight:700;font-size:15px;cursor:pointer;transition:all .2s;font-family:inherit}
.btn-gold{background:linear-gradient(135deg,var(--gold),var(--gold-dark));color:#111}
.btn-gold:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(255,214,10,.3)}
.btn-outline{background:transparent;border-color:#444;color:#fff}
.btn-outline:hover{border-color:var(--gold);color:var(--gold)}
.btn-sm{padding:8px 18px;font-size:13px}

/* Header */
.header{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(10,10,10,.85);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}
.header-inner{display:flex;align-items:center;justify-content:space-between;height:68px}
.header-logo{display:flex;align-items:center;gap:10px}
.header-logo img{height:36px;width:auto}
.header-logo b{font-family:'Libre Caslon Display',serif;font-size:18px;color:#fff}
.header-logo small{color:var(--gold);font-size:9px;text-transform:uppercase;letter-spacing:.12em}
.header-nav{display:flex;gap:28px}
.header-nav a{font-size:14px;font-weight:600;color:var(--muted);transition:color .2s}
.header-nav a:hover{color:var(--gold)}
.header-actions{display:flex;gap:12px;align-items:center}
.header-actions .btn{padding:9px 20px;font-size:13px}
.mobile-toggle{display:none;background:none;border:0;color:#fff;font-size:24px;cursor:pointer}

/* Hero */
.hero{position:relative;min-height:92vh;display:flex;align-items:center;overflow:hidden}
.hero-video{position:absolute;inset:0;z-index:0}
.hero-video video{width:100%;height:100%;object-fit:cover}
.hero-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,10,10,.7) 0%,rgba(10,10,10,.5) 50%,rgba(10,10,10,.95) 100%);z-index:1}
.hero-content{position:relative;z-index:2;text-align:center;max-width:840px;margin:0 auto;padding:120px 24px 80px}
.hero h1{margin-bottom:20px}
.hero h1 span{color:var(--gold)}
.hero p{font-size:19px;max-width:600px;margin:0 auto 32px}
.hero-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.hero-stats{display:flex;gap:40px;justify-content:center;margin-top:48px;flex-wrap:wrap}
.hero-stats div{text-align:center}
.hero-stats b{display:block;font-family:'Libre Caslon Display',serif;font-size:36px;color:var(--gold)}
.hero-stats small{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.1em}

/* Gallery */
.gallery-tabs{display:flex;gap:10px;margin-bottom:32px;flex-wrap:wrap}
.gallery-tab{padding:10px 22px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--muted);font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;font-family:inherit}
.gallery-tab:hover{border-color:var(--gold-dark);color:#fff}
.gallery-tab.active{background:linear-gradient(135deg,var(--gold),var(--gold-dark));color:#111;border-color:var(--gold)}
.gallery-panel{display:none;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px}
.gallery-panel.active{display:grid}
.gallery-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;cursor:pointer;transition:all .25s}
.gallery-card:hover{transform:translateY(-4px);border-color:var(--gold-dark)}
.gallery-img-wrap{height:240px;overflow:hidden}
.gallery-img-wrap img{width:100%;height:100%;object-fit:cover;transition:transform .4s}
.gallery-card:hover .gallery-img-wrap img{transform:scale(1.05)}
.gallery-card-body{padding:16px 18px}
.gallery-card-body h3{font-size:18px;margin-bottom:6px}
.gallery-card-body p{font-size:13px}

/* Products */
.product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}
.product-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;display:flex;flex-direction:column;transition:all .25s}
.product-card:hover{transform:translateY(-4px);border-color:var(--gold-dark)}
.product-media{position:relative;height:200px;overflow:hidden;background:#1a1a1a}
.product-media img{width:100%;height:100%;object-fit:cover}
.product-icon{display:flex;align-items:center;justify-content:center;height:100%;font-size:48px;color:var(--gold)}
.product-badge{position:absolute;top:10px;right:10px;background:rgba(0,0,0,.85);color:var(--gold);font-size:10px;font-weight:700;padding:4px 10px;border-radius:6px;letter-spacing:.08em}
.product-body{padding:18px;display:flex;flex-direction:column;gap:8px;flex:1}
.product-body h3{font-size:18px}
.product-body>p{font-size:13px;flex:1}
.product-tags{display:flex;gap:5px;flex-wrap:wrap}
.product-tags span{font-size:10px;background:#1e1e1e;border:1px solid #333;padding:3px 8px;border-radius:4px;color:var(--muted)}
.product-footer{display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:12px;border-top:1px solid var(--border)}
.product-footer .price{font-family:'Libre Caslon Display',serif;font-size:24px;color:var(--gold)}
.product-footer .price small{font-size:12px;color:var(--muted)}
.empty-state{grid-column:1/-1;text-align:center;padding:40px;color:var(--muted)}
.empty-state a{color:var(--gold)}

/* Generator */
.generator-section{background:linear-gradient(135deg,#0d0d0d,#1a1500)}
.generator-inner{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.generator-preview{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;position:relative}
.generator-preview img{border-radius:8px;border:1px solid var(--border)}
.generator-preview .play-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4);border-radius:var(--radius)}
.generator-preview .play-overlay div{width:64px;height:64px;border-radius:50%;background:var(--gold);display:flex;align-items:center;justify-content:center;font-size:24px;color:#111}
.generator-content h2{margin-bottom:16px}
.generator-content p{font-size:17px;margin-bottom:24px}
.generator-features{list-style:none;margin-bottom:28px}
.generator-features li{padding:10px 0;border-bottom:1px solid var(--border);color:#ccc;font-size:14px;display:flex;align-items:center;gap:10px}
.generator-features li:before{content:'✓';color:var(--gold);font-weight:700;font-size:18px}

/* Pricing */
.pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
.pricing-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:28px;display:flex;flex-direction:column;position:relative}
.pricing-card.featured{border-color:var(--gold);border-width:2px}
.pricing-card.featured .featured-tag{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--gold);color:#111;font-size:10px;font-weight:700;padding:4px 14px;border-radius:6px;text-transform:uppercase;letter-spacing:.1em}
.pricing-card h3{font-size:22px;margin-bottom:8px}
.pricing-card .price{font-family:'Libre Caslon Display',serif;font-size:42px;color:var(--gold);margin-bottom:4px}
.pricing-card .price small{font-size:14px;color:var(--muted);font-family:'DM Sans',sans-serif}
.pricing-card>p{font-size:13px;margin-bottom:20px}
.pricing-card ul{list-style:none;margin-bottom:24px;flex:1}
.pricing-card li{padding:8px 0;font-size:13px;color:#ccc;display:flex;align-items:start;gap:8px}
.pricing-card li:before{content:'✓';color:var(--gold);font-weight:700}
.pricing-card .btn{width:100%;margin-top:auto}

/* CTA */
.cta-section{text-align:center;padding:80px 24px;background:radial-gradient(circle at 50% 50%,rgba(255,214,10,.08),transparent 60%)}
.cta-section h2{font-size:clamp(32px,4vw,48px);margin-bottom:16px}
.cta-section p{font-size:18px;margin-bottom:28px}

/* Footer */
.footer{border-top:1px solid var(--border);padding:48px 0 24px}
.footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px;margin-bottom:32px}
.footer-brand{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.footer-brand img{height:32px}
.footer-brand b{font-family:'Libre Caslon Display',serif}
.footer-grid p{font-size:13px;margin-bottom:12px}
.footer-grid h4{font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);margin-bottom:12px}
.footer-grid a{display:block;font-size:13px;color:var(--muted);padding:4px 0;transition:color .2s}
.footer-grid a:hover{color:var(--gold)}
.footer-bottom{text-align:center;padding-top:24px;border-top:1px solid var(--border);color:#666;font-size:12px}

/* Lightbox */
.lightbox{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.94);display:none;align-items:center;justify-content:center;padding:24px;flex-direction:column}
.lightbox.open{display:flex}
.lightbox img{max-width:90vw;max-height:75vh;border-radius:12px;object-fit:contain}
.lightbox-info{text-align:center;margin-top:16px}
.lightbox-info h3{font-size:24px;margin-bottom:6px}
.lightbox-info p{color:var(--muted)}
.lightbox-close{position:absolute;top:20px;right:20px;width:44px;height:44px;border-radius:8px;background:var(--card);border:1px solid var(--border);color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.lightbox-nav{position:absolute;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:50%;background:var(--card);border:1px solid var(--border);color:#fff;font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.lightbox-prev{left:20px}
.lightbox-next{right:20px}

/* Mobile */
@media(max-width:900px){
.header-nav{display:none}
.mobile-toggle{display:block}
.header-nav.open{display:flex;position:absolute;top:68px;left:0;right:0;background:var(--bg);flex-direction:column;padding:16px 24px;border-bottom:1px solid var(--border);gap:0}
.header-nav.open a{padding:12px 0;border-bottom:1px solid var(--border)}
.generator-inner{grid-template-columns:1fr}
.footer-grid{grid-template-columns:1fr 1fr}
.hero-stats{gap:24px}
}
@media(max-width:600px){
.gallery-panel{grid-template-columns:1fr}
.product-grid{grid-template-columns:1fr}
.pricing-grid{grid-template-columns:1fr}
.footer-grid{grid-template-columns:1fr}
.hero-actions{flex-direction:column}
.hero-actions .btn{width:100%}
}
</style>
</head>
<body>

<!-- Header -->
<header class="header">
<div class="container header-inner">
  <a href="#" class="header-logo">
    <img src="${LOGO_URL}" alt="Xtreme AI Systems" />
    <span><b>Xtreme AI</b><small>Systems</small></span>
  </a>
  <nav class="header-nav" id="nav">
    <a href="#gallery">Gallery</a>
    <a href="#tools">AI Tools</a>
    <a href="#web-packs">Web Packs</a>
    <a href="#app-packs">App Packs</a>
    <a href="#generator">Generator</a>
    <a href="#pricing">Pricing</a>
  </nav>
  <div class="header-actions">
    <a href="${appUrl}/store" class="btn btn-outline btn-sm">Store</a>
    <a href="${appUrl}/register" class="btn btn-gold btn-sm">Sign Up</a>
    <button class="mobile-toggle" onclick="document.getElementById('nav').classList.toggle('open')">☰</button>
  </div>
</div>
</header>

<!-- Hero -->
<section class="hero">
<div class="hero-video">
  <video autoplay muted loop playsinline>
    <source src="${VIDEO_URLS[0]}" type="video/mp4">
  </video>
</div>
<div class="hero-overlay"></div>
<div class="hero-content">
  <p class="eyebrow">AI-Powered Website Builder for Epoxy Contractors</p>
  <h1>Build Your Epoxy Business <span>Website with AI</span></h1>
  <p>Browse our gallery of premium epoxy floor designs, choose a web pack, and let AI build your website in minutes. No coding required.</p>
  <div class="hero-actions">
    <a href="${appUrl}/register" class="btn btn-gold">Start Building →</a>
    <a href="#gallery" class="btn btn-outline">View Gallery</a>
  </div>
  <div class="hero-stats">
    <div><b>14+</b><small>Floor Designs</small></div>
    <div><b>AI</b><small>Website Builder</small></div>
    <div><b>$29</b><small>Starting Price</small></div>
    <div><b>5 Min</b><small>Build Time</small></div>
  </div>
</div>
</section>

<!-- Gallery -->
${buildGallery()}

<!-- AI Tools -->
<section class="section" id="tools">
<div class="container">
  <div class="section-head">
    <p class="eyebrow">AI-Powered Tools · $29 each</p>
    <h2>AI Tools for Epoxy Contractors</h2>
    <p>Bid writers, estimators, CRM tools, and more — AI-powered tools designed for epoxy and concrete contractors. Buy and deploy as your own.</p>
  </div>
  <div class="product-grid">${buildToolCards(appUrl, tools)}</div>
</div>
</section>

<!-- Web Packs -->
<section class="section" id="web-packs">
<div class="container">
  <div class="section-head">
    <p class="eyebrow">Website Template Packs · $49 each</p>
    <h2>Web Packs</h2>
    <p>Production-ready website templates for epoxy contractors. Buy a pack, swap your branding, and launch in minutes.</p>
  </div>
  <div class="product-grid">${buildPackCards(appUrl, webPacks, 'web_pack', 49, 'WEB PACK')}</div>
</div>
</section>

<!-- App Packs -->
<section class="section" id="app-packs">
<div class="container">
  <div class="section-head">
    <p class="eyebrow">App Template Packs · $99 each</p>
    <h2>App Packs</h2>
    <p>Full app clones of top platforms. Buy a pack, customize, and launch your own SaaS product.</p>
  </div>
  <div class="product-grid">${buildPackCards(appUrl, appPacks, 'app_pack', 99, 'APP PACK')}</div>
</div>
</section>

${designPacks && designPacks.length > 0 ? `
<section class="section" id="design-packs">
<div class="container">
  <div class="section-head">
    <p class="eyebrow">Custom Builds · $199+</p>
    <h2>Design Packs</h2>
    <p>Pick a design pack and we deliver a launch-ready website in that exact style.</p>
  </div>
  <div class="product-grid">${buildDesignPackCards(appUrl, designPacks)}</div>
</div>
</section>` : ''}

<!-- Generator -->
<section class="section generator-section" id="generator">
<div class="container">
  <div class="generator-inner">
    <div class="generator-preview">
      <img src="https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/dc888082e_generated_image.png" alt="AI Website Generator" style="width:100%;height:auto" />
      <div class="play-overlay"><div>▶</div></div>
    </div>
    <div class="generator-content">
      <p class="eyebrow">AI Website Generator</p>
      <h2>Generate Your Website with AI</h2>
      <p>Describe your epoxy business, pick a design from our gallery, and let AI build a production-ready website. Clone top competitors, upload a design pack, or start from scratch.</p>
      <ul class="generator-features">
        <li>AI-guided website creation — no coding required</li>
        <li>Clone top 3 competitors and build something better</li>
        <li>Upload a design pack and reproduce it exactly</li>
        <li>Deploy to Vercel with a custom domain</li>
        <li>Full SEO, mobile-responsive, production-ready</li>
      </ul>
      <a href="${appUrl}/register" class="btn btn-gold">Sign Up to Start Building →</a>
    </div>
  </div>
</div>
</section>

<!-- Pricing -->
<section class="section" id="pricing">
<div class="container">
  <div class="section-head">
    <p class="eyebrow">Simple, Transparent Pricing</p>
    <h2>Choose Your Plan</h2>
    <p>From AI tools to full custom builds — pick what you need and get started today.</p>
  </div>
  <div class="pricing-grid">
    <div class="pricing-card">
      <h3>AI Tool</h3>
      <div class="price">$29 <small>/ tool</small></div>
      <p>Single AI-powered tool for your business</p>
      <ul>
        <li>Bid writer, estimator, or CRM</li>
        <li>Instant download</li>
        <li>Deploy as your own product</li>
        <li>Full source code</li>
      </ul>
      <a href="${appUrl}/store" class="btn btn-outline">Get Started</a>
    </div>
    <div class="pricing-card featured">
      <span class="featured-tag">Most Popular</span>
      <h3>Web Pack</h3>
      <div class="price">$49 <small>/ pack</small></div>
      <p>Production-ready website template</p>
      <ul>
        <li>Full website template</li>
        <li>Swap your branding</li>
        <li>Launch in minutes</li>
        <li>Mobile responsive</li>
      </ul>
      <a href="${appUrl}/store" class="btn btn-gold">Get Started</a>
    </div>
    <div class="pricing-card">
      <h3>App Pack</h3>
      <div class="price">$99 <small>/ pack</small></div>
      <p>Full app clone template</p>
      <ul>
        <li>Complete app template</li>
        <li>Customize and launch</li>
        <li>Full SaaS product</li>
        <li>Source code included</li>
      </ul>
      <a href="${appUrl}/store" class="btn btn-outline">Get Started</a>
    </div>
    <div class="pricing-card">
      <h3>Custom Build</h3>
      <div class="price">$199+</div>
      <p>Full custom website build</p>
      <ul>
        <li>Custom design from pack</li>
        <li>AI-powered generation</li>
        <li>Deploy to Vercel</li>
        <li>Custom domain setup</li>
      </ul>
      <a href="${appUrl}/consultation" class="btn btn-outline">Book a Call</a>
    </div>
  </div>
</div>
</section>

<!-- CTA -->
<section class="cta-section">
  <h2>Ready to build your epoxy business website?</h2>
  <p>Sign up today and start building with AI.</p>
  <a href="${appUrl}/register" class="btn btn-gold">Get Started Free →</a>
</section>

<!-- Footer -->
<footer class="footer">
<div class="container">
  <div class="footer-grid">
    <div>
      <div class="footer-brand"><img src="${LOGO_URL}" alt="Xtreme AI Systems" /><b>Xtreme AI Systems</b></div>
      <p>AI-powered website builder for epoxy and concrete contractors. Build, launch, and grow your business with AI.</p>
    </div>
    <div>
      <h4>Platform</h4>
      <a href="#gallery">Gallery</a>
      <a href="#tools">AI Tools</a>
      <a href="#web-packs">Web Packs</a>
      <a href="#generator">Generator</a>
    </div>
    <div>
      <h4>Company</h4>
      <a href="${appUrl}/store">Store</a>
      <a href="${appUrl}/consultation">Book a Call</a>
      <a href="${appUrl}/register">Sign Up</a>
      <a href="${appUrl}/login">Log In</a>
    </div>
    <div>
      <h4>Resources</h4>
      <a href="#pricing">Pricing</a>
      <a href="${appUrl}/web-packs">Web Pack Gallery</a>
      <a href="${appUrl}/tools/ai-bid-writer">AI Bid Writer</a>
    </div>
  </div>
  <div class="footer-bottom">© 2026 Xtreme AI Systems — AI-Powered Website Builder for Epoxy Contractors</div>
</div>
</footer>

<!-- Lightbox -->
<div class="lightbox" id="lightbox">
  <button class="lightbox-close" onclick="closeLightbox()">✕</button>
  <button class="lightbox-nav lightbox-prev" onclick="navLightbox(-1)">‹</button>
  <button class="lightbox-nav lightbox-next" onclick="navLightbox(1)">›</button>
  <img id="lightbox-img" src="" alt="" />
  <div class="lightbox-info"><h3 id="lightbox-title"></h3><p id="lightbox-desc"></p></div>
</div>

<script>
// Gallery tabs
document.querySelectorAll('.gallery-tab').forEach(function(tab){
  tab.addEventListener('click', function(){
    document.querySelectorAll('.gallery-tab').forEach(function(t){t.classList.remove('active')});
    document.querySelectorAll('.gallery-panel').forEach(function(p){p.classList.remove('active')});
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
  });
});

// Lightbox
var allImages = [];
document.querySelectorAll('.gallery-card').forEach(function(c){
  allImages.push({url:c.dataset.full, title:c.dataset.title, desc:c.dataset.desc});
  c.addEventListener('click', function(){ openLightbox(allImages.findIndex(function(i){return i.url===c.dataset.full})); });
});
var currentIdx = 0;
function openLightbox(idx){ currentIdx=idx; updateLightbox(); document.getElementById('lightbox').classList.add('open'); }
function closeLightbox(){ document.getElementById('lightbox').classList.remove('open'); }
function navLightbox(dir){ currentIdx=(currentIdx+dir+allImages.length)%allImages.length; updateLightbox(); }
function updateLightbox(){
  var img=allImages[currentIdx];
  document.getElementById('lightbox-img').src=img.url;
  document.getElementById('lightbox-title').textContent=img.title;
  document.getElementById('lightbox-desc').textContent=img.desc;
}
document.getElementById('lightbox').addEventListener('click', function(e){ if(e.target===this) closeLightbox(); });
document.addEventListener('keydown', function(e){ if(!document.getElementById('lightbox').classList.contains('open'))return; if(e.key==='Escape')closeLightbox(); if(e.key==='ArrowLeft')navLightbox(-1); if(e.key==='ArrowRight')navLightbox(1); });

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(function(a){
  a.addEventListener('click', function(e){
    var href=a.getAttribute('href');
    if(href.length>1){ e.preventDefault(); document.querySelector(href).scrollIntoView({behavior:'smooth'}); document.getElementById('nav').classList.remove('open'); }
  });
});
</script>
</body>
</html>`;
}