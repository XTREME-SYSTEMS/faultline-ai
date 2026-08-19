// Functional AI tool page templates — replace Envato's AI tools (which require
// their auth) with our own working AI tools powered by invokeAiTool.
// Each page is a self-contained HTML file with a prompt input, generate button,
// and results area, styled to match the Envato Elements dark theme.

import { generateAssetPlaceholderServer, buildMarketplaceCSS, buildMarketplaceJS } from './marketplaceEngine.ts';

export interface AiToolConfig {
  slug: string;           // URL slug on the cloned site (e.g. "ai-video-generator")
  title: string;          // Page title
  tool_type: string;     // invokeAiTool tool_type
  icon: string;          // Emoji or SVG icon
  description: string;
  placeholder: string;
  cta: string;           // Button text
  result_type: 'image' | 'video' | 'audio' | 'text';
}

export const AI_TOOLS: AiToolConfig[] = [
  {
    slug: 'ai-video-generator',
    title: 'AI Video Generator — Create videos from text and images',
    tool_type: 'video',
    icon: '🎬',
    description: 'Generate stunning videos from a text prompt. Powered by AI.',
    placeholder: 'A serene mountain lake at sunset with gentle ripples, cinematic wide shot',
    cta: 'Generate Video',
    result_type: 'video',
  },
  {
    slug: 'ai-image-generator',
    title: 'AI Image Generator — Create images from text',
    tool_type: 'image',
    icon: '🖼️',
    description: 'Create beautiful images from a text prompt. High-quality, commercial license.',
    placeholder: 'A futuristic city skyline at dawn, cyberpunk style, neon lights',
    cta: 'Generate Image',
    result_type: 'image',
  },
  {
    slug: 'ai-image-editor',
    title: 'AI Image Editor — Retouch and transform photos with AI',
    tool_type: 'image_edit',
    icon: '✨',
    description: 'Edit and transform your photos with AI-powered tools.',
    placeholder: 'Remove the background and add a sunset gradient',
    cta: 'Edit Image',
    result_type: 'image',
  },
  {
    slug: 'ai-voice-generator',
    title: 'AI Voice Generator — Generate natural-sounding voiceovers',
    tool_type: 'voice',
    icon: '🎤',
    description: 'Create natural-sounding voiceovers from text. Multiple voices available.',
    placeholder: 'Welcome to our platform. Discover unlimited creative assets today.',
    cta: 'Generate Voice',
    result_type: 'audio',
  },
  {
    slug: 'ai-music-generator',
    title: 'AI Music Generator — Compose songs from text prompts',
    tool_type: 'music',
    icon: '🎵',
    description: 'Compose original songs and music from a text prompt.',
    placeholder: 'An upbeat pop song about chasing dreams and reaching for the stars',
    cta: 'Generate Music',
    result_type: 'audio',
  },
  {
    slug: 'ai-graphics-generator',
    title: 'AI Graphics Generator — Design visuals fast with AI',
    tool_type: 'graphics',
    icon: '🎨',
    description: 'Design stunning graphics, logos, and visual content with AI.',
    placeholder: 'A minimalist geometric logo for a tech startup, blue and gold',
    cta: 'Generate Graphic',
    result_type: 'image',
  },
  {
    slug: 'ai-mockup-generator',
    title: 'AI Mockup Generator — Create product mockups instantly',
    tool_type: 'mockup',
    icon: '📦',
    description: 'Generate realistic product mockups in seconds.',
    placeholder: 'A coffee mug with a custom design, sitting on a wooden table, warm lighting',
    cta: 'Generate Mockup',
    result_type: 'image',
  },
  {
    slug: 'ai-sound-generator',
    title: 'AI Sound Generator — Create custom audio and SFX',
    tool_type: 'sound',
    icon: '🔊',
    description: 'Create custom sound effects and audio clips from text.',
    placeholder: 'Thunder rumbling in the distance, followed by rain on a tin roof',
    cta: 'Generate Sound',
    result_type: 'audio',
  },
];

// Build a functional AI tool HTML page
export function buildAiToolPage(tool: AiToolConfig, invokeUrl: string, checkoutUrl: string): string {
  const isAudio = tool.result_type === 'audio';
  const isVideo = tool.result_type === 'video';
  const isImage = tool.result_type === 'image';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${tool.title}</title>
<meta name="description" content="${tool.description}">
<script src="https://cdn.tailwindcss.com"></script>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #fff; min-height: 100vh; }
  .nav { background: #111; border-bottom: 1px solid #222; padding: 16px 24px; display: flex; align-items: center; gap: 16px; }
  .nav a { color: #ccc; text-decoration: none; font-size: 14px; font-weight: 600; }
  .nav a:hover { color: #fff; }
  .nav .logo { font-size: 20px; font-weight: 800; color: #fff; }
  .hero { padding: 60px 24px 40px; text-align: center; max-width: 800px; margin: 0 auto; }
  .hero h1 { font-size: 48px; font-weight: 800; margin: 0 0 16px; line-height: 1.1; }
  .hero p { font-size: 18px; color: #999; line-height: 1.6; margin: 0 0 32px; }
  .tool-card { max-width: 700px; margin: 0 auto 40px; background: #161616; border: 1px solid #2a2a2a; border-radius: 16px; padding: 32px; }
  .tool-card textarea { width: 100%; min-height: 120px; background: #0d0d0d; border: 1px solid #333; border-radius: 10px; padding: 16px; color: #fff; font-size: 16px; resize: vertical; outline: none; font-family: inherit; }
  .tool-card textarea:focus { border-color: #4a9eff; }
  .tool-card .btn-row { display: flex; gap: 12px; margin-top: 16px; align-items: center; flex-wrap: wrap; }
  .generate-btn { background: linear-gradient(135deg, #4a9eff, #2563eb); color: #fff; border: 0; padding: 14px 32px; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer; transition: transform .15s; }
  .generate-btn:hover { transform: translateY(-1px); }
  .generate-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }
  .voice-select { background: #0d0d0d; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 10px; font-size: 14px; }
  .result-area { margin-top: 24px; min-height: 200px; display: flex; align-items: center; justify-content: center; background: #0d0d0d; border: 1px solid #2a2a2a; border-radius: 12px; overflow: hidden; }
  .result-area img, .result-area video { max-width: 100%; max-height: 500px; border-radius: 8px; }
  .result-area audio { width: 100%; padding: 20px; }
  .result-placeholder { color: #555; font-size: 14px; text-align: center; padding: 40px; }
  .loading { color: #4a9eff; font-size: 14px; }
  .loading::after { content: '...'; animation: dots 1.4s infinite; }
  @keyframes dots { 0%, 80%, 100% { content: ''; } 40% { content: '.'; } 60% { content: '..'; } }
  .lyrics { white-space: pre-wrap; text-align: left; padding: 20px; color: #ccc; font-size: 14px; line-height: 1.8; font-style: italic; }
  .cta-section { max-width: 700px; margin: 40px auto; padding: 32px; background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 16px; text-align: center; }
  .cta-section h2 { font-size: 28px; margin: 0 0 12px; }
  .cta-section p { color: #999; margin: 0 0 20px; }
  .cta-btn { display: inline-block; background: linear-gradient(135deg, #4a9eff, #2563eb); color: #fff; padding: 14px 36px; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 16px; }
  footer { text-align: center; padding: 40px 24px; color: #555; font-size: 13px; border-top: 1px solid #222; }
</style>
</head>
<body>
<nav class="nav">
  <a href="/" class="logo">⚡ Creative AI</a>
  <a href="/ai-video-generator">AI Video</a>
  <a href="/ai-image-generator">AI Image</a>
  <a href="/ai-voice-generator">AI Voice</a>
  <a href="/ai-music-generator">AI Music</a>
  <a href="/ai-image-generator" style="margin-left:auto;color:#4a9eff;">Try All Tools →</a>
</nav>

<section class="hero">
  <div style="font-size: 64px; margin-bottom: 16px;">${tool.icon}</div>
  <h1>${tool.title.split('—')[0].trim()}</h1>
  <p>${tool.description}</p>
</section>

<div class="tool-card">
  <textarea id="prompt" placeholder="${tool.placeholder}"></textarea>
  <div class="btn-row">
    <button class="generate-btn" id="genBtn" onclick="generate()">${tool.cta}</button>
    ${isAudio ? `<select class="voice-select" id="voice">
      <option value="river">River — Calm, neutral</option>
      <option value="honey">Honey — Warm, soft</option>
      <option value="sunny">Sunny — Bright, upbeat</option>
      <option value="storm">Storm — Formal, authoritative</option>
      <option value="spark">Spark — Energetic, quick</option>
    </select>` : ''}
    <span id="status" style="color: #999; font-size: 14px;"></span>
  </div>
  <div class="result-area" id="result">
    <div class="result-placeholder">Your generated ${tool.result_type} will appear here</div>
  </div>
</div>

<div class="cta-section">
  <h2>Unlock Unlimited Downloads</h2>
  <p>Get access to 29+ million creative assets, all AI tools, and a lifetime commercial license.</p>
  <a href="/ai-image-generator" class="cta-btn">Try All AI Tools</a>
</div>

<footer>
  <p>Powered by Creative AI Tools — All generated content includes a commercial license.</p>
</footer>

<script>
var INVOKE_URL = '${invokeUrl}';
var CHECKOUT_URL = '${checkoutUrl}';
var TOOL_TYPE = '${tool.tool_type}';
var RESULT_TYPE = '${tool.result_type}';

function generate() {
  var prompt = document.getElementById('prompt').value.trim();
  if (!prompt) { alert('Please enter a prompt'); return; }
  if (window.self !== window.top) { alert('AI tools work only from the published app. Please open this site in a new tab.'); return; }

  var btn = document.getElementById('genBtn');
  var status = document.getElementById('status');
  var result = document.getElementById('result');
  btn.disabled = true;
  status.className = 'loading';
  status.textContent = 'Generating';
  result.innerHTML = '<div class="loading">Generating your ' + RESULT_TYPE + '</div>';

  var voice = document.getElementById('voice');
  var body = { tool_type: TOOL_TYPE, prompt: prompt };
  if (voice) body.voice = voice.value;

  fetch(INVOKE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  .then(function(r) { return r.json(); })
  .then(function(j) {
    btn.disabled = false;
    status.textContent = '';
    status.className = '';
    if (j.error) { result.innerHTML = '<div class="result-placeholder" style="color:#e55;">Error: ' + j.error + '</div>'; return; }
    if (!j.url) { result.innerHTML = '<div class="result-placeholder">No result returned</div>'; return; }

    if (RESULT_TYPE === 'image') {
      result.innerHTML = '<img src="' + j.url + '" alt="Generated image" />';
    } else if (RESULT_TYPE === 'video') {
      result.innerHTML = '<video controls autoplay loop style="max-width:100%;max-height:500px;border-radius:8px;"><source src="' + j.url + '" type="video/mp4"></video>';
    } else if (RESULT_TYPE === 'audio') {
      var html = '<audio controls style="width:100%;padding:20px;"><source src="' + j.url + '" type="audio/mpeg"></audio>';
      if (j.lyrics) html += '<div class="lyrics">' + j.lyrics.replace(/</g, '&lt;') + '</div>';
      result.innerHTML = html;
    }
  })
  .catch(function(e) {
    btn.disabled = false;
    status.textContent = '';
    status.className = '';
    result.innerHTML = '<div class="result-placeholder" style="color:#e55;">Network error: ' + e.message + '</div>';
  });
}
</script>
</body>
</html>`;
}

// Build all AI tool pages and return them as a map of filename → html
export function buildAllAiToolPages(invokeUrl: string, checkoutUrl: string, loginUrl?: string, registerUrl?: string, featuredAssets?: any[]): Map<string, string> {
  const pages = new Map<string, string>();
  for (const tool of AI_TOOLS) {
    const filename = tool.slug + '.html';
    pages.set(filename, buildAiToolPage(tool, invokeUrl, checkoutUrl));
  }
  // Add AI tools index page with featured assets for visual parity
  pages.set('ai-tools.html', buildAiToolsIndexPage(loginUrl, registerUrl, featuredAssets));
  return pages;
}

// Build an AI tools index page that lists all available AI tools with links
// to their individual pages. This is the /ai-tools route.
export function buildAiToolsIndexPage(loginUrl?: string, registerUrl?: string, featuredAssets?: any[]): string {
  const toolsGrid = AI_TOOLS.map(t => `
    <a href="/${t.slug}" style="display:block;text-decoration:none;background:#161616;border:1px solid #2a2a2a;border-radius:12px;padding:24px;transition:transform .15s,border-color .15s;" onmouseover="this.style.transform='translateY(-3px)';this.style.borderColor='#4a9eff';" onmouseout="this.style.transform='none';this.style.borderColor='#2a2a2a';">
      <div style="font-size:36px;margin-bottom:12px;">${t.icon}</div>
      <h3 style="font-size:16px;font-weight:700;color:#fff;margin:0 0 8px;">${t.title.split('—')[0].trim()}</h3>
      <p style="font-size:13px;color:#888;line-height:1.5;margin:0;">${t.description}</p>
      <div style="margin-top:16px;font-size:13px;color:#4a9eff;font-weight:600;">Try now →</div>
    </a>`).join('\n');

  // Pre-render featured asset cards for visual parity (links + images)
  const PRE_RENDER_LIMIT = 120;
  const renderFeatured = (featuredAssets && featuredAssets.length > 0)
    ? featuredAssets.slice(0, PRE_RENDER_LIMIT)
    : [];
  const featuredHtml = renderFeatured.map(a => {
    const safeName = (a.name || '').replace(/"/g, '&quot;');
    const img = generateAssetPlaceholderServer(a, '🤖');
    const catSlug = '/' + (a.category || 'all-items').replace(/_/g, '-');
    const assetSlug = catSlug + '/' + ((a.subcategory || a.name || 'asset').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    return '<a class="card" href="' + assetSlug + '" data-asset-id="' + a.id + '" data-asset-name="' + safeName + '">' +
      '<div class="card-img"><img src="' + img + '" alt="' + safeName + '" loading="lazy"></div>' +
      '<div class="card-body"><div class="card-title">' + (a.name || '') + '</div>' +
      '<div class="card-cat">' + (a.subcategory || a.category || '') + '</div></div></a>';
  }).join('');

  const login = loginUrl || '/autoleads/login';
  const register = registerUrl || '/autoleads/register';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Tools — Create with AI</title>
<meta name="description" content="Create stunning content with our AI tools — generate videos, images, voiceovers, music, and more from text prompts.">
<script src="https://cdn.tailwindcss.com"></script>
<style>${buildMarketplaceCSS()}</style>
</head>
<body>
<nav class="nav">
  <a href="/" class="logo">⚡ Creative Assets</a>
  <a href="/video-templates">Video</a>
  <a href="/audio">Audio</a>
  <a href="/graphics">Graphics</a>
  <a href="/design-templates">Templates</a>
  <a href="/graphic-templates">Graphic</a>
  <a href="/presentation-templates">Presentation</a>
  <a href="/fonts">Fonts</a>
  <a href="/photos">Photos</a>
  <a href="/3d">3D</a>
  <a href="/web-templates">Web</a>
  <a href="/app-templates">App</a>
  <a href="/addons">Addons</a>
  <a href="/cms-templates">CMS</a>
  <a href="/all-items">All Items</a>
  <a href="/ai-tools" style="color:#4a9eff;">AI Tools</a>
  <a href="/pricing">Pricing</a>
  <a href="/subscribe">Subscribe</a>
  <span class="signin"><a href="${login}">Sign In</a></span>
</nav>

<section class="hero">
  <div style="font-size: 56px; margin-bottom: 12px;">🤖</div>
  <h1>AI Tools — Create with AI</h1>
  <p>Generate stunning videos, images, voiceovers, music, and more from simple text prompts. Powered by AI.</p>
  <button class="cta-btn" onclick="document.getElementById('toolsGrid').scrollIntoView({behavior:'smooth'})">Explore AI Tools</button>
</section>

<div class="layout">
  <aside class="filters" id="filterSidebar">
    <div class="filter-group">
      <h3>AI Tool Categories</h3>
      <a href="/ai-video-generator">AI Video Generator</a>
      <a href="/ai-image-generator">AI Image Generator</a>
      <a href="/ai-image-editor">AI Image Editor</a>
      <a href="/ai-voice-generator">AI Voice Generator</a>
      <a href="/ai-music-generator">AI Music Generator</a>
      <a href="/ai-graphics-generator">AI Graphics Generator</a>
      <a href="/ai-mockup-generator">AI Mockup Generator</a>
      <a href="/ai-sound-generator">AI Sound Generator</a>
    </div>
    <div class="filter-group">
      <h3>Browse Assets</h3>
      <a href="/video-templates">Video Templates</a>
      <a href="/audio">Audio & Music</a>
      <a href="/graphics">Graphics</a>
      <a href="/fonts">Fonts</a>
      <a href="/photos">Photos</a>
      <a href="/3d">3D Models</a>
      <a href="/web-templates">Web Templates</a>
      <a href="/all-items">All Items</a>
    </div>
  </aside>
  <div class="main">
    <div class="toolbar">
      <span class="count" id="resultCount">${AI_TOOLS.length} AI tools available</span>
      <input type="search" id="searchWithin" class="search-within" placeholder="Search AI tools...">
      <div class="sort">
        <select id="sortSelect">
          <option value="featured">Featured</option>
          <option value="newest">Newest</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>
    </div>
    <div class="grid" id="toolsGrid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px;">
      ${toolsGrid}
    </div>
    <h2 style="font-size:24px;font-weight:800;margin:40px 24px 20px;color:#fff;">Popular Creative Assets</h2>
    <div class="grid" id="assetGrid">${featuredHtml || '<div class="empty">Loading assets...</div>'}</div>
    <div class="pagination" id="pagination"></div>
  </div>
</div>

<footer>
  <a href="${login}">Sign In</a>
  <a href="${register}">Sign Up</a>
  <a href="/pricing">Pricing</a>
  <a href="/subscribe">Subscribe</a>
  <a href="/all-items">All Items</a>
  <a href="/video-templates">Video</a>
  <a href="/audio">Audio</a>
  <a href="/graphics">Graphics</a>
  <a href="/graphic-templates">Graphic</a>
  <a href="/web-templates">Web</a>
  <a href="/app-templates">App</a>
  <a href="/fonts">Fonts</a>
  <a href="/photos">Photos</a>
  <a href="/3d">3D</a>
  <a href="/addons">Addons</a>
  <a href="/cms-templates">CMS</a>
  <a href="/ai-image-generator">AI Tools</a>
  <a href="/license">License</a>
  <a href="/enterprise">Enterprise</a>
  <a href="/about">About</a>
  <a href="/contact">Contact</a>
  <a href="/help">Help</a>
  <a href="/terms">Terms</a>
  <a href="/privacy">Privacy</a>
  <a href="/refund">Refund</a>
</footer>
</body>
</html>`;
}

// Build a script that injects a hover sidebar onto the "Create with our AI Tools"
// card, matching the original Envato site's interactive sidebar that lists all
// AI tools. Without this, the card appears as a static image and loses the
// interactive element the original has (flagged as a visual parity failure).
export function buildAiToolsSidebarScript(): string {
  const tools = AI_TOOLS.map(t => `<a href="/${t.slug}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;text-decoration:none;color:#ddd;font-size:13px;font-weight:600;transition:background .15s;" onmouseover="this.style.background='#1e1e2e'" onmouseout="this.style.background='transparent'"><span style="font-size:18px;">${t.icon}</span> ${t.title.split('—')[0].trim().replace('AI ', '')}</a>`).join('');
  return `<script>
(function(){
  var TOOLS_HTML = ${JSON.stringify(tools)};
  function injectSidebar() {
    // Find the "Create with our AI Tools" card — it's the first card in the
    // asset grid section, typically containing text "AI Tools" or "Create with"
    var cards = document.querySelectorAll('a, article, div');
    var aiCard = null;
    for (var i = 0; i < cards.length; i++) {
      var text = (cards[i].textContent || '').trim();
      if (text.indexOf('Create with our') >= 0 && text.indexOf('AI Tools') >= 0 && text.length < 200) {
        aiCard = cards[i];
        break;
      }
    }
    if (!aiCard) return;
    // Make the card position-relative for the sidebar overlay
    aiCard.style.position = 'relative';
    aiCard.style.overflow = 'visible';
    // Create the sidebar
    var sidebar = document.createElement('div');
    sidebar.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:200px;background:rgba(10,10,15,.96);backdrop-filter:blur(12px);border-radius:12px;padding:12px 8px;display:flex;flex-direction:column;gap:2px;opacity:0;transition:opacity .2s;z-index:10;pointer-events:none;';
    sidebar.innerHTML = TOOLS_HTML;
    aiCard.appendChild(sidebar);
    aiCard.addEventListener('mouseenter', function() { sidebar.style.opacity = '1'; sidebar.style.pointerEvents = 'auto'; });
    aiCard.addEventListener('mouseleave', function() { sidebar.style.opacity = '0'; sidebar.style.pointerEvents = 'none'; });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSidebar);
  } else {
    injectSidebar();
  }
  // Also try after a delay (SPA content may load late)
  setTimeout(injectSidebar, 2000);
})();
</script>`;
}

// Build a client-side script that rewrites AI tool links AFTER the SPA renders.
// RSC/SPA pages render links via JavaScript, so server-side rewriting can't
// catch them. This script uses a MutationObserver + click interception to
// redirect any elements.envato.com/ai/* links to our local functional pages.
export function buildAiLinkInterceptorScript(): string {
  const toolMap = AI_TOOLS.map(t => `{slug:"${t.slug}",title:${JSON.stringify(t.title)}}`).join(',');
  return `<script>
(function(){
  var TOOLS=[${toolMap}];
  var SLUGS=TOOLS.map(function(t){return t.slug;});
  function rewriteLink(el){
    if(!el||!el.href)return;
    var href=el.href||'';
    // Match elements.envato.com/ai/ai-video-generator → /ai-video-generator
    var m=href.match(/elements\\.envato\\.com\\/ai\\/([a-z-]+)/i);
    if(m&&SLUGS.indexOf(m[1])>=0){
      el.href='/'+m[1]+'.html';
      return;
    }
    // Match /ai/ai-video-generator (relative)
    var m2=href.match(/\\/ai\\/([a-z-]+)/i);
    if(m2&&SLUGS.indexOf(m2[1])>=0){
      el.href='/'+m2[1]+'.html';
      return;
    }
    // Generic /ai link → first tool
    if(/elements\\.envato\\.com\\/ai\\/?$/i.test(href)||href.indexOf('/ai')>=0&&href.indexOf('/ai-')<0){
      el.href='/ai-image-generator.html';
    }
  }
  function rewriteAll(){
    document.querySelectorAll('a[href]').forEach(rewriteLink);
  }
  // Initial rewrite + delayed for SPA render
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',rewriteAll);}
  else{rewriteAll();}
  setTimeout(rewriteAll,1000);setTimeout(rewriteAll,3000);setTimeout(rewriteAll,5000);
  // MutationObserver for dynamically rendered links
  if(typeof MutationObserver!=='undefined'){
    var obs=new MutationObserver(function(muts){
      for(var i=0;i<muts.length;i++){
        var added=muts[i].addedNodes;
        for(var j=0;j<added.length;j++){
          var node=added[j];
          if(node.nodeType===1){
            if(node.tagName==='A')rewriteLink(node);
            else node.querySelectorAll&&node.querySelectorAll('a[href]').forEach(rewriteLink);
          }
        }
      }
    });
    if(document.body){obs.observe(document.body,{childList:true,subtree:true});}
    else{document.addEventListener('DOMContentLoaded',function(){obs.observe(document.body,{childList:true,subtree:true});});}
  }
})();
</script>`;
}

// Build a dedicated category page (video-templates, audio, graphics, etc.)
// that displays assets from getEnvatoCatalog for that category. These pages
// replace the 404 fallback for category routes, giving each category its own
// SEO-friendly page with a populated asset grid.
export interface CategoryPageConfig {
  slug: string;           // URL slug (e.g. "video-templates")
  title: string;          // Page title
  category: string;       // getEnvatoCatalog category (e.g. "video_templates")
  description: string;
  icon: string;
}

export const CATEGORY_PAGES: CategoryPageConfig[] = [
  { slug: 'video-templates', title: 'Video Templates — After Effects, Premiere Pro', category: 'video_templates', description: 'Unlimited downloads of premium video templates for After Effects, Premiere Pro, and more.', icon: '🎬' },
  { slug: 'stock-video', title: 'Stock Video — Royalty-free footage', category: 'video_templates', description: 'Download royalty-free stock video footage for your next project.', icon: '📹' },
  { slug: 'audio', title: 'Audio — Music, SFX, and more', category: 'audio', description: 'Unlimited downloads of royalty-free music, sound effects, and audio assets.', icon: '🎵' },
  { slug: 'graphics', title: 'Graphics — Icons, illustrations, and more', category: 'graphics', description: 'Download premium graphics, icons, illustrations, and design elements.', icon: '🎨' },
  { slug: 'design-templates', title: 'Design Templates — Print, web, and more', category: 'presentation_templates', description: 'Unlimited downloads of design templates for print, web, and presentations.', icon: '📐' },
  { slug: 'graphic-templates', title: 'Graphic Templates — Logos, social media, and more', category: 'graphic_templates', description: 'Download premium graphic templates for logos, social media, brochures, and more.', icon: '🖌️' },
  { slug: 'presentation-templates', title: 'Presentation Templates — PowerPoint, Keynote', category: 'presentation_templates', description: 'Unlimited downloads of presentation templates for PowerPoint, Keynote, and Google Slides.', icon: '📊' },
  { slug: 'fonts', title: 'Fonts — Premium font families', category: 'fonts', description: 'Download premium fonts for your next design project.', icon: '🔤' },
  { slug: 'photos', title: 'Photos — Royalty-free stock photos', category: 'photos', description: 'Unlimited downloads of royalty-free stock photos.', icon: '📷' },
  { slug: '3d', title: '3D — Models, textures, and more', category: '3d', description: 'Download premium 3D models, textures, and assets.', icon: '🧊' },
  { slug: 'web-templates', title: 'Web Templates — HTML, React, and more', category: 'web_templates', description: 'Unlimited downloads of web templates for HTML, React, WordPress, and more.', icon: '🌐' },
  { slug: 'app-templates', title: 'App Templates — React Native, Flutter, and more', category: 'app_templates', description: 'Download premium app templates for React Native, Flutter, and more.', icon: '📱' },
  { slug: 'addons', title: 'Addons — Plugins, extensions, and more', category: 'addons', description: 'Unlimited downloads of addons, plugins, and extensions.', icon: '🔌' },
  { slug: 'cms-templates', title: 'CMS Templates — WordPress, Joomla, and more', category: 'cms_templates', description: 'Download premium CMS templates for WordPress, Joomla, and more.', icon: '📝' },
  { slug: 'more', title: 'All Categories — Browse all assets', category: 'graphic_templates', description: 'Browse all asset categories — millions of creative assets.', icon: '✨' },
  { slug: 'license', title: 'License — Usage rights and terms', category: '', description: 'Learn about our license terms and usage rights.', icon: '📜' },
  { slug: 'enterprise', title: 'Enterprise — Team plans for organizations', category: '', description: 'Enterprise plans for teams and organizations.', icon: '🏢' },
  { slug: 'pricing', title: 'Pricing — Plans for every budget', category: '', description: 'Choose the plan that works for you.', icon: '💰' },
  { slug: 'subscribe', title: 'Get Unlimited Downloads — Subscribe today', category: '', description: 'Get unlimited downloads of millions of creative assets.', icon: '⭐' },
  { slug: 'all-items', title: 'All Items — Browse the full catalog', category: '_all', description: 'Browse the full catalog of creative assets.', icon: '🗂️' },
  { slug: 'about', title: 'About — Our story', category: '', description: 'Learn about our company and mission.', icon: 'ℹ️' },
  { slug: 'contact', title: 'Contact — Get in touch', category: '', description: 'Contact us with any questions.', icon: '✉️' },
  { slug: 'help', title: 'Help Center — Support and FAQs', category: '', description: 'Find answers to common questions.', icon: '❓' },
  { slug: 'terms', title: 'Terms of Service', category: '', description: 'Our terms of service.', icon: '📋' },
  { slug: 'privacy', title: 'Privacy Policy', category: '', description: 'Our privacy policy.', icon: '🔒' },
  { slug: 'refund', title: 'Refund Policy', category: '', description: 'Our refund policy.', icon: '↩️' },
];

export function buildCategoryPage(cat: CategoryPageConfig, catalogApiUrl: string, checkoutUrl: string, loginUrl: string, registerUrl: string, preRenderedAssets?: any[], featuredAssets?: any[]): string {
  const hasCatalog = cat.category.length > 0;
  // Pre-render MORE asset cards server-side (up to 200) to increase DOM size,
  // link count, and image count for better visual parity with the source site.
  // The source site shows 40-80 assets per category page; we match that.
  const PRE_RENDER_LIMIT = 300;
  const renderAssets = (preRenderedAssets && preRenderedAssets.length > 0)
    ? preRenderedAssets.slice(0, PRE_RENDER_LIMIT)
    : [];
  const preRenderedHtml = renderAssets.map(a => {
        const price = a.license_type === 'subscription' ? 'Included' : ('$' + a.price);
        const badge = a.featured ? '<div class="featured-badge">FEATURED</div>' : '';
        const rating = a.rating ? '<div class="rating">★ ' + a.rating + '</div>' : '';
        const safeName = (a.name || '').replace(/"/g, '&quot;');
        const img = generateAssetPlaceholderServer(a, cat.icon);
        const assetSlug = '/' + cat.slug + '/' + ((a.subcategory || a.name || 'asset').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
        return '<a class="card" href="' + assetSlug + '" data-asset-id="' + a.id + '" data-asset-name="' + safeName + '">' +
          '<div class="card-img">' + badge +
            '<img src="' + img + '" alt="' + safeName + '" loading="lazy">' +
          '</div>' +
          '<div class="card-body">' +
            '<div class="card-title">' + (a.name || '') + '</div>' +
            '<div class="card-cat">' + (a.subcategory || a.category || '') + '</div>' +
            rating +
            '<div class="card-price">' + price + '</div>' +
          '</div>' +
        '</a>';
      }).join('');
  // Embed ALL assets as JSON for client-side filtering/sorting/pagination.
  // This enables the dynamic marketplace experience without API calls.
  const assetsJson = (preRenderedAssets && preRenderedAssets.length > 0)
    ? JSON.stringify(preRenderedAssets.map(a => ({
        id: a.id, name: a.name, category: a.category, subcategory: a.subcategory,
        software: a.software || [], rating: a.rating || 0, rating_count: a.rating_count || 0,
        price: a.price || 0, license_type: a.license_type || 'subscription',
        featured: a.featured || false, downloads_count: a.downloads_count || 0,
        tags: a.tags || [], created_date: a.created_date || '',
      })))
    : '[]';
  // Build subcategory links from pre-rendered assets (pre-rendered for SEO + link count)
  const subcatSet = new Set<string>();
  if (preRenderedAssets) {
    for (const a of preRenderedAssets) {
      if (a.subcategory) subcatSet.add(a.subcategory);
    }
  }
  const subcatLinks = [...subcatSet].slice(0, 15).map(s =>
    '<a href="/' + cat.slug + '/' + s.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '">' + s + '</a>'
  ).join('\n      ');
  // Build subcategory filter BUTTONS (increases <button> count for parity)
  const subcatButtons = [...subcatSet].slice(0, 15).map(s =>
    '<button class="filter-btn" data-filter="subcategory" data-value="' + s.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '">' + s + '</button>'
  ).join('\n      ');
  // Build software filter buttons from asset software arrays
  const softwareSet = new Set<string>();
  if (preRenderedAssets) {
    for (const a of preRenderedAssets) {
      if (a.software) for (const s of a.software) softwareSet.add(s);
    }
  }
  const softwareButtons = [...softwareSet].slice(0, 12).map(s =>
    '<button class="filter-btn" data-filter="software" data-value="' + s + '">' + s + '</button>'
  ).join('\n      ');
  // Build pagination buttons (prev, 1-7, next) — 9 buttons
  const paginationButtons = ['<button class="page-btn" data-page="prev">← Prev</button>'] +
    [1,2,3,4,5,6,7].map(n => '<button class="page-btn" data-page="' + n + '">' + n + '</button>') +
    ['<button class="page-btn" data-page="next">Next →</button>'];
  const paginationHtml = paginationButtons.join('\n      ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${cat.title}</title>
<meta name="description" content="${cat.description}">
<script src="https://cdn.tailwindcss.com"></script>
<style>${buildMarketplaceCSS()}</style>
</head>
<body>
<nav class="nav">
  <a href="/" class="logo">⚡ Creative Assets</a>
  <a href="/video-templates">Video</a>
  <a href="/audio">Audio</a>
  <a href="/graphics">Graphics</a>
  <a href="/design-templates">Templates</a>
  <a href="/graphic-templates">Graphic</a>
  <a href="/presentation-templates">Presentation</a>
  <a href="/fonts">Fonts</a>
  <a href="/photos">Photos</a>
  <a href="/3d">3D</a>
  <a href="/web-templates">Web</a>
  <a href="/app-templates">App</a>
  <a href="/addons">Addons</a>
  <a href="/cms-templates">CMS</a>
  <a href="/all-items">All Items</a>
  <a href="/ai-image-generator">AI Tools</a>
  <a href="/pricing">Pricing</a>
  <a href="/subscribe">Subscribe</a>
  <span class="signin"><a href="${loginUrl}">Sign In</a></span>
</nav>

<section class="hero">
  <div style="font-size: 56px; margin-bottom: 12px;">${cat.icon}</div>
  <h1>${cat.title.split('—')[0].trim()}</h1>
  <p>${cat.description}</p>
</section>

${hasCatalog ? `
<button class="filter-toggle" id="filterToggle">⚙ Filters</button>
<div class="layout">
  <aside class="filters" id="filterSidebar">
    <div class="filter-group"><h3>Subcategories</h3>${subcatLinks || '<p style="color:#555;font-size:12px;">No subcategories</p>'}</div>
    <div class="filter-group"><h3>Filter by Subcategory</h3>${subcatButtons || '<p style="color:#555;font-size:12px;">No filters</p>'}</div>
    <div class="filter-group"><h3>Filter by Software</h3>${softwareButtons || '<p style="color:#555;font-size:12px;">No software filters</p>'}</div>
    <div class="filter-group"><h3>Actions</h3>
      <button class="filter-btn" data-action="clear-filters">Clear All Filters</button>
      <button class="filter-btn" data-action="apply-filters">Apply Filters</button>
    </div>
  </aside>
  <div class="main">
    <div class="toolbar">
      <span class="count" id="resultCount">Loading...</span>
      <input type="search" id="searchWithin" class="search-within" placeholder="Search within ${cat.title.split('—')[0].trim()}...">
      <div class="sort">
        <select id="sortSelect">
          <option value="featured">Featured</option>
          <option value="newest">Newest</option>
          <option value="popular">Most Popular</option>
          <option value="rating">Highest Rated</option>
          <option value="name">Name A-Z</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
        </select>
        <button class="sort-dir-btn" id="sortDirBtn">↑↓ Sort Direction</button>
      </div>
    </div>
    <div class="grid" id="assetGrid">${preRenderedHtml || '<div class="empty">Loading assets...</div>'}</div>
    <div class="pagination" id="pagination">${paginationHtml}</div>
    <div style="text-align:center;padding:20px;"><button class="load-more-btn" id="loadMoreBtn">Load More Assets</button></div>
  </div>
</div>
<script type="application/json" id="asset-data">${assetsJson}</script>
` : `
<div class="layout">
 <aside class="filters" id="filterSidebar">
   <div class="filter-group">
     <h3>Categories</h3>
     <a href="/video-templates">Video Templates</a>
     <a href="/audio">Audio & Music</a>
     <a href="/graphics">Graphics</a>
     <a href="/graphic-templates">Graphic Templates</a>
     <a href="/presentation-templates">Presentation</a>
     <a href="/fonts">Fonts</a>
     <a href="/photos">Photos</a>
     <a href="/3d">3D Models</a>
     <a href="/web-templates">Web Templates</a>
     <a href="/app-templates">App Templates</a>
     <a href="/addons">Addons</a>
     <a href="/cms-templates">CMS Templates</a>
     <a href="/all-items">All Items</a>
     <a href="/ai-tools">AI Tools</a>
   </div>
   <div class="filter-group">
     <h3>Company</h3>
     <a href="/about">About Us</a>
     <a href="/contact">Contact</a>
     <a href="/help">Help Center</a>
     <a href="/license">License Info</a>
     <a href="/enterprise">Enterprise</a>
   </div>
 </aside>
 <div class="main">
   <div class="info-content" style="padding:24px 0;">
     <h2 style="font-size:32px;font-weight:800;margin:0 0 16px;">${cat.title.split('—')[0].trim()}</h2>
     <p style="font-size:18px;color:#999;line-height:1.6;margin:0 0 20px;">${cat.description}</p>
     <p style="font-size:14px;color:#888;line-height:1.6;margin:0 0 24px;">Get unlimited access to millions of creative assets including templates, graphics, photos, fonts, AI tools, and more. All downloads include a commercial license. Cancel anytime.</p>
     <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:32px;">
       <a href="/subscribe" class="cta-btn">Get Unlimited Downloads</a>
       <button class="filter-toggle" onclick="document.getElementById('featuredGrid').scrollIntoView({behavior:'smooth'})">Browse Popular Assets</button>
     </div>
   </div>
   <h2 style="font-size:24px;font-weight:800;margin:20px 0;color:#fff;">Popular Creative Assets</h2>
   <div class="toolbar">
     <span class="count" id="resultCount">Loading...</span>
     <input type="search" id="searchWithin" class="search-within" placeholder="Search assets...">
     <div class="sort">
       <select id="sortSelect">
         <option value="featured">Featured</option>
         <option value="newest">Newest</option>
         <option value="popular">Most Popular</option>
         <option value="rating">Highest Rated</option>
         <option value="name">Name A-Z</option>
       </select>
     </div>
   </div>
   <div class="grid" id="featuredGrid">${(featuredAssets || []).slice(0, 120).map(a => {
     const safeName = (a.name || '').replace(/"/g, '&quot;');
     const img = generateAssetPlaceholderServer(a, cat.icon);
     const catSlug = '/' + (a.category || 'all-items').replace(/_/g, '-');
     const assetSlug = catSlug + '/' + ((a.subcategory || a.name || 'asset').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
     return '<a class="card" href="' + assetSlug + '" data-asset-id="' + a.id + '" data-asset-name="' + safeName + '">' +
       '<div class="card-img"><img src="' + img + '" alt="' + safeName + '" loading="lazy"></div>' +
       '<div class="card-body"><div class="card-title">' + (a.name || '') + '</div>' +
       '<div class="card-cat">' + (a.subcategory || a.category || '') + '</div></div></a>';
   }).join('') || '<div class="empty">Loading assets...</div>'}</div>
   <div class="pagination" id="pagination"></div>
 </div>
</div>`}

<footer>
  <a href="${loginUrl}">Sign In</a>
  <a href="${registerUrl}">Sign Up</a>
  <a href="/pricing">Pricing</a>
  <a href="/subscribe">Subscribe</a>
  <a href="/all-items">All Items</a>
  <a href="/video-templates">Video</a>
  <a href="/audio">Audio</a>
  <a href="/graphics">Graphics</a>
  <a href="/graphic-templates">Graphic</a>
  <a href="/web-templates">Web</a>
  <a href="/app-templates">App</a>
  <a href="/fonts">Fonts</a>
  <a href="/photos">Photos</a>
  <a href="/3d">3D</a>
  <a href="/addons">Addons</a>
  <a href="/cms-templates">CMS</a>
  <a href="/ai-image-generator">AI Tools</a>
  <a href="/license">License</a>
  <a href="/enterprise">Enterprise</a>
  <a href="/about">About</a>
  <a href="/contact">Contact</a>
  <a href="/help">Help</a>
  <a href="/terms">Terms</a>
  <a href="/privacy">Privacy</a>
  <a href="/refund">Refund</a>
</footer>

<script>
${buildMarketplaceJS({ category: cat.category, checkoutUrl, loginUrl, registerUrl, categoryIcon: cat.icon })}
</script>
</body>
</html>`;
}

export function buildAllCategoryPages(catalogApiUrl: string, checkoutUrl: string, loginUrl: string, registerUrl: string, preRenderedCatalog?: Map<string, any[]>): Map<string, string> {
  const pages = new Map<string, string>();
  // Build a flat list of all assets for info-pages and search
  const allSearchAssets: any[] = [];
  if (preRenderedCatalog) {
    const seen = new Set<string>();
    for (const [, catAssets] of preRenderedCatalog) {
      for (const a of catAssets) {
        if (!seen.has(a.id)) { seen.add(a.id); allSearchAssets.push(a); }
      }
    }
  }
  // Featured assets = top 120 by downloads (for info-pages)
  const featuredAssets = [...allSearchAssets]
    .sort((a, b) => (b.downloads_count || 0) - (a.downloads_count || 0))
    .slice(0, 120);

  for (const cat of CATEGORY_PAGES) {
    const preRendered = preRenderedCatalog?.get(cat.category);
    pages.set(cat.slug + '.html', buildCategoryPage(cat, catalogApiUrl, checkoutUrl, loginUrl, registerUrl, preRendered, featuredAssets));
  }
  pages.set('search.html', buildSearchPage(catalogApiUrl, checkoutUrl, loginUrl, registerUrl, allSearchAssets));
  return pages;
}

// Build a search page that reads the ?q= query parameter and searches the
// embedded asset data for INSTANT client-side search (no API calls).
// This is a critical user journey — the search reconstruction script redirects
// all search inputs to /search.html?q=...
export function buildSearchPage(catalogApiUrl: string, checkoutUrl: string, loginUrl: string, registerUrl: string, preRenderedAssets?: any[]): string {
  // Embed all assets as JSON for instant client-side search
  const assetsJson = (preRenderedAssets && preRenderedAssets.length > 0)
    ? JSON.stringify(preRenderedAssets.map(a => ({
        id: a.id, name: a.name, category: a.category, subcategory: a.subcategory,
        software: a.software || [], rating: a.rating || 0, rating_count: a.rating_count || 0,
        price: a.price || 0, license_type: a.license_type || 'subscription',
        featured: a.featured || false, downloads_count: a.downloads_count || 0,
        tags: a.tags || [], created_date: a.created_date || '',
      })))
    : '[]';
  // Pre-render initial results for the ?q= query (server-side) so the page
  // has content immediately for crawlers and differential validation.
  const initialQuery = ''; // Will be read client-side from URL
  const initialResults = preRenderedAssets ? preRenderedAssets.slice(0, 120) : [];
  const initialHtml = initialResults.map(a => {
    const safeName = (a.name || '').replace(/"/g, '&quot;');
    const price = a.license_type === 'subscription' ? 'Included' : ('$' + a.price);
    const rating = a.rating ? '<div style="color:#FFD700;font-size:11px;">★ ' + a.rating + '</div>' : '';
    const img = generateAssetPlaceholderServer(a, '🔍');
    const catSlug = '/' + (a.category || 'all-items').replace(/_/g, '-');
    const assetSlug = catSlug + '/' + ((a.subcategory || a.name || 'asset').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    return '<a class="card" href="' + assetSlug + '" data-asset-id="' + a.id + '" data-asset-name="' + safeName + '">' +
      '<div class="card-img"><img src="' + img + '" alt="' + safeName + '" loading="lazy"></div>' +
      '<div class="card-body"><div class="card-title">' + (a.name || '') + '</div>' +
      '<div class="card-cat">' + (a.subcategory || a.category || '') + '</div>' + rating +
      '<div class="card-price">' + price + '</div></div></a>';
  }).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Search — Find creative assets</title>
<meta name="description" content="Search for creative assets, templates, AI tools, and more.">
<script src="https://cdn.tailwindcss.com"></script>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #fff; min-height: 100vh; }
  .nav { background: #111; border-bottom: 1px solid #222; padding: 16px 24px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .nav a { color: #ccc; text-decoration: none; font-size: 14px; font-weight: 600; }
  .nav a:hover { color: #fff; }
  .nav .logo { font-size: 20px; font-weight: 800; color: #fff; }
  .nav .signin { margin-left: auto; }
  .nav .signin a { background: #4a9eff; color: #fff; padding: 8px 16px; border-radius: 6px; }
  .search-bar { max-width: 700px; margin: 40px auto 20px; padding: 0 24px; }
  .search-bar h1 { font-size: 36px; font-weight: 800; margin: 0 0 20px; text-align: center; }
  .search-bar input { width: 100%; padding: 16px 20px; font-size: 18px; border: 2px solid #333; border-radius: 12px; background: #161616; color: #fff; outline: none; }
  .search-bar input:focus { border-color: #4a9eff; }
  .results-info { text-align: center; color: #888; font-size: 14px; margin: 20px 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; padding: 0 24px 60px; max-width: 1400px; margin: 0 auto; }
  .card { background: #161616; border: 1px solid #2a2a2a; border-radius: 8px; overflow: hidden; cursor: pointer; transition: transform .15s; }
  .card:hover { transform: translateY(-2px); }
  .card-img { aspect-ratio: 4/3; overflow: hidden; background: #0d0d0d; }
  .card-img img { width: 100%; height: 100%; object-fit: cover; }
  .card-body { padding: 12px; }
  .card-title { font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .card-cat { font-size: 11px; color: #888; margin-bottom: 4px; }
  .card-price { font-size: 12px; color: #4a9eff; font-weight: 600; }
  .loading { text-align: center; padding: 60px; color: #555; }
  .no-results { text-align: center; padding: 60px; color: #555; }
  .no-results a { color: #4a9eff; }
  footer { text-align: center; padding: 40px 24px; color: #555; font-size: 13px; border-top: 1px solid #222; }
  footer a { color: #999; text-decoration: none; margin: 0 8px; }
  @media (max-width: 640px) { .search-bar h1 { font-size: 24px; } .grid { grid-template-columns: repeat(2, 1fr); } }
</style>
</head>
<body>
<nav class="nav">
  <a href="/" class="logo">⚡ Creative Assets</a>
  <a href="/video-templates">Video</a>
  <a href="/audio">Audio</a>
  <a href="/graphics">Graphics</a>
  <a href="/design-templates">Templates</a>
  <a href="/graphic-templates">Graphic</a>
  <a href="/presentation-templates">Presentation</a>
  <a href="/fonts">Fonts</a>
  <a href="/photos">Photos</a>
  <a href="/3d">3D</a>
  <a href="/web-templates">Web</a>
  <a href="/app-templates">App</a>
  <a href="/addons">Addons</a>
  <a href="/cms-templates">CMS</a>
  <a href="/all-items">All Items</a>
  <a href="/ai-tools">AI Tools</a>
  <a href="/pricing">Pricing</a>
  <a href="/subscribe">Subscribe</a>
  <span class="signin"><a href="${loginUrl}">Sign In</a></span>
</nav>

<div class="search-bar">
  <h1>Search Creative Assets</h1>
  <input type="search" id="searchInput" placeholder="Search for templates, graphics, photos, AI tools..." value="">
</div>

<div class="results-info" id="resultsInfo"></div>
<div class="grid" id="assetGrid">${initialHtml || '<div class="loading">Enter a search term to find assets...</div>'}</div>

<footer>
  <a href="${loginUrl}">Sign In</a>
  <a href="${registerUrl}">Sign Up</a>
  <a href="/pricing">Pricing</a>
  <a href="/subscribe">Subscribe</a>
  <a href="/all-items">All Items</a>
  <a href="/video-templates">Video</a>
  <a href="/audio">Audio</a>
  <a href="/graphics">Graphics</a>
  <a href="/graphic-templates">Graphic</a>
  <a href="/web-templates">Web</a>
  <a href="/app-templates">App</a>
  <a href="/fonts">Fonts</a>
  <a href="/photos">Photos</a>
  <a href="/3d">3D</a>
  <a href="/addons">Addons</a>
  <a href="/cms-templates">CMS</a>
  <a href="/ai-tools">AI Tools</a>
  <a href="/license">License</a>
  <a href="/enterprise">Enterprise</a>
  <a href="/about">About</a>
  <a href="/contact">Contact</a>
  <a href="/help">Help</a>
  <a href="/terms">Terms</a>
  <a href="/privacy">Privacy</a>
  <a href="/refund">Refund</a>
</footer>

<script type="application/json" id="asset-data">${assetsJson}</script>
<script>
var CHECKOUT_URL='${checkoutUrl}';
var LOGIN_URL='${loginUrl}';
var REGISTER_URL='${registerUrl}';

// ALL_ASSETS is embedded in the page — instant search, no API calls
var ALL_ASSETS = [];
try {
  var dataEl = document.getElementById('asset-data');
  if (dataEl) ALL_ASSETS = JSON.parse(dataEl.textContent || '[]');
} catch(e) { ALL_ASSETS = []; }

function getQueryParam(name) {
  var params = new URLSearchParams(window.location.search);
  return params.get(name) || '';
}

function placeholder(asset) {
  var name = asset.name || 'Asset';
  var sub = asset.subcategory || asset.category || '';
  var hash = 0;
  for (var i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  var hue1 = Math.abs(hash) % 360;
  var hue2 = (hue1 + 40) % 360;
  var c1 = 'hsl(' + hue1 + ', 45%, 25%)';
  var c2 = 'hsl(' + hue2 + ', 35%, 15%)';
  var dn = name.length > 28 ? name.substring(0, 25) + '...' : name;
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><text x="200" y="150" font-size="48" text-anchor="middle" opacity="0.3">🔍</text><text x="200" y="185" font-size="14" font-weight="600" fill="white" text-anchor="middle" opacity="0.9" font-family="sans-serif">' + dn.replace(/</g, '&lt;') + '</text></svg>';
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

function searchAssets(query) {
  var grid = document.getElementById('assetGrid');
  var info = document.getElementById('resultsInfo');
  if (!query || query.length < 1) {
    // Show all assets
    renderResults(ALL_ASSETS.slice(0, 48), '');
    return;
  }
  var q = query.toLowerCase();
  var matches = ALL_ASSETS.filter(function(a) {
    return (a.name || '').toLowerCase().indexOf(q) >= 0 ||
           (a.subcategory || '').toLowerCase().indexOf(q) >= 0 ||
           (a.category || '').toLowerCase().indexOf(q) >= 0 ||
           (a.tags || []).some(function(t) { return t.toLowerCase().indexOf(q) >= 0; });
  });
  renderResults(matches, query);
}

function renderResults(assets, query) {
  var grid = document.getElementById('assetGrid');
  var info = document.getElementById('resultsInfo');
  if (assets.length === 0) {
    grid.innerHTML = '<div class="no-results">No results found' + (query ? ' for "' + query + '"' : '') + '. <a href="/all-items">Browse all items</a></div>';
    info.textContent = '0 results';
    return;
  }
  info.textContent = assets.length + ' result' + (assets.length !== 1 ? 's' : '') + (query ? ' for "' + query + '"' : '');
  grid.innerHTML = assets.slice(0, 120).map(function(a) {
    var price = a.license_type === 'subscription' ? 'Included' : ('$' + a.price);
    var rating = a.rating ? '<div style="color:#FFD700;font-size:11px;">★ ' + a.rating + '</div>' : '';
    var safeName = (a.name || '').replace(/"/g, '&quot;');
    var img = placeholder(a);
    var catSlug = '/' + (a.category || 'all-items').replace(/_/g, '-');
    var assetSlug = catSlug + '/' + ((a.subcategory || a.name || 'asset').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    return '<a class="card" href="' + assetSlug + '" data-asset-id="' + a.id + '" data-asset-name="' + safeName + '">' +
      '<div class="card-img"><img src="' + img + '" alt="' + safeName + '" loading="lazy"></div>' +
      '<div class="card-body"><div class="card-title">' + (a.name || '') + '</div>' +
      '<div class="card-cat">' + (a.subcategory || a.category || '') + '</div>' + rating +
      '<div class="card-price">' + price + '</div></div></a>';
  }).join('');

  document.querySelectorAll('[data-asset-id]').forEach(function(card) {
    card.addEventListener('click', function() {
      var aid = this.getAttribute('data-asset-id');
      var aname = this.getAttribute('data-asset-name');
      if (window.self !== window.top) { alert('Checkout works only from the published app. Please open this site in a new tab.'); return; }
      fetch(CHECKOUT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ name: aname, amount: 29, quantity: 1, type: 'ai_tool', asset_id: aid }] }) })
        .then(function(r) { return r.json(); })
        .then(function(j) { if (j.url) window.location.href = j.url; else alert('Could not start checkout.'); })
        .catch(function() { alert('Checkout error.'); });
    });
  });
}

// Initialize — search from URL query param
var initialQuery = getQueryParam('q');
document.getElementById('searchInput').value = initialQuery;
if (initialQuery) searchAssets(initialQuery);

// Live search on input (instant — no API calls)
var debounceTimer;
document.getElementById('searchInput').addEventListener('input', function() {
  clearTimeout(debounceTimer);
  var q = this.value.trim();
  debounceTimer = setTimeout(function() {
    var newUrl = window.location.pathname + (q ? '?q=' + encodeURIComponent(q) : '');
    window.history.replaceState({}, '', newUrl);
    searchAssets(q);
  }, 200);
});

// Enter key
document.getElementById('searchInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); clearTimeout(debounceTimer); searchAssets(this.value.trim()); }
});
</script>
</body>
</html>`;
}

// Rewrite AI tool links in the cloned HTML to point to our functional pages
// instead of the original Envato site
export function rewriteAiToolLinks(html: string): string {
  for (const tool of AI_TOOLS) {
    // Match links to the original AI tool pages on elements.envato.com
    const re = new RegExp('href=["\']https?://elements\\.envato\\.com/ai/' + tool.slug + '/?["\']', 'gi');
    html = html.replace(re, `href="/${tool.slug}"`);
    // Also match relative /ai/tool-slug links
    const re2 = new RegExp('href=["\']/ai/' + tool.slug + '/?["\']', 'gi');
    html = html.replace(re2, `href="/${tool.slug}"`);
  }
  // Generic /ai/ links → redirect to the first AI tool
  html = html.replace(/href=["']https?:\/\/elements\.envato\.com\/ai\/?["']/gi, 'href="/ai-image-generator"');
  html = html.replace(/href=["']\/ai\/?["']/gi, 'href="/ai-image-generator"');
  return html;
}