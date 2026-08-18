// Functional AI tool page templates — replace Envato's AI tools (which require
// their auth) with our own working AI tools powered by invokeAiTool.
// Each page is a self-contained HTML file with a prompt input, generate button,
// and results area, styled to match the Envato Elements dark theme.

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
export function buildAllAiToolPages(invokeUrl: string, checkoutUrl: string): Map<string, string> {
  const pages = new Map<string, string>();
  for (const tool of AI_TOOLS) {
    const filename = tool.slug + '.html';
    pages.set(filename, buildAiToolPage(tool, invokeUrl, checkoutUrl));
  }
  // Add AI tools index page
  pages.set('ai-tools.html', buildAiToolsIndexPage());
  return pages;
}

// Build an AI tools index page that lists all available AI tools with links
// to their individual pages. This is the /ai-tools route.
export function buildAiToolsIndexPage(): string {
  const toolsGrid = AI_TOOLS.map(t => `
    <a href="/${t.slug}.html" style="display:block;text-decoration:none;background:#161616;border:1px solid #2a2a2a;border-radius:12px;padding:24px;transition:transform .15s,border-color .15s;" onmouseover="this.style.transform='translateY(-3px)';this.style.borderColor='#4a9eff';" onmouseout="this.style.transform='none';this.style.borderColor='#2a2a2a';">
      <div style="font-size:36px;margin-bottom:12px;">${t.icon}</div>
      <h3 style="font-size:16px;font-weight:700;color:#fff;margin:0 0 8px;">${t.title.split('—')[0].trim()}</h3>
      <p style="font-size:13px;color:#888;line-height:1.5;margin:0;">${t.description}</p>
      <div style="margin-top:16px;font-size:13px;color:#4a9eff;font-weight:600;">Try now →</div>
    </a>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Tools — Create with AI</title>
<meta name="description" content="Create stunning content with our AI tools — generate videos, images, voiceovers, music, and more from text prompts.">
<script src="https://cdn.tailwindcss.com"></script>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #fff; min-height: 100vh; }
  .nav { background: #111; border-bottom: 1px solid #222; padding: 16px 24px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .nav a { color: #ccc; text-decoration: none; font-size: 14px; font-weight: 600; }
  .nav a:hover { color: #fff; }
  .nav .logo { font-size: 20px; font-weight: 800; color: #fff; }
  .nav .signin { margin-left: auto; }
  .nav .signin a { background: #4a9eff; color: #fff; padding: 8px 16px; border-radius: 6px; }
  .hero { padding: 60px 24px 40px; text-align: center; max-width: 900px; margin: 0 auto; }
  .hero h1 { font-size: 48px; font-weight: 800; margin: 0 0 16px; line-height: 1.1; }
  .hero p { font-size: 18px; color: #999; line-height: 1.6; margin: 0 0 32px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; padding: 0 24px 60px; max-width: 1400px; margin: 0 auto; }
  footer { text-align: center; padding: 40px 24px; color: #555; font-size: 13px; border-top: 1px solid #222; }
  footer a { color: #999; text-decoration: none; margin: 0 8px; }
  @media (max-width: 640px) { .hero h1 { font-size: 32px; } .grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<nav class="nav">
  <a href="/" class="logo">⚡ Creative Assets</a>
  <a href="/video-templates">Video</a>
  <a href="/audio">Audio</a>
  <a href="/graphics">Graphics</a>
  <a href="/fonts">Fonts</a>
  <a href="/photos">Photos</a>
  <a href="/ai-tools" style="color:#4a9eff;">AI Tools</a>
  <a href="/pricing">Pricing</a>
</nav>

<section class="hero">
  <div style="font-size: 56px; margin-bottom: 12px;">🤖</div>
  <h1>AI Tools — Create with AI</h1>
  <p>Generate stunning videos, images, voiceovers, music, and more from simple text prompts. Powered by AI.</p>
</section>

<div class="grid">
${toolsGrid}
</div>

<footer>
  <a href="/pricing">Pricing</a>
  <a href="/terms">Terms</a>
  <a href="/privacy">Privacy</a>
  <a href="/help">Help</a>
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
  { slug: 'all-items', title: 'All Items — Browse the full catalog', category: 'graphic_templates', description: 'Browse the full catalog of creative assets.', icon: '🗂️' },
  { slug: 'about', title: 'About — Our story', category: '', description: 'Learn about our company and mission.', icon: 'ℹ️' },
  { slug: 'contact', title: 'Contact — Get in touch', category: '', description: 'Contact us with any questions.', icon: '✉️' },
  { slug: 'help', title: 'Help Center — Support and FAQs', category: '', description: 'Find answers to common questions.', icon: '❓' },
  { slug: 'terms', title: 'Terms of Service', category: '', description: 'Our terms of service.', icon: '📋' },
  { slug: 'privacy', title: 'Privacy Policy', category: '', description: 'Our privacy policy.', icon: '🔒' },
  { slug: 'refund', title: 'Refund Policy', category: '', description: 'Our refund policy.', icon: '↩️' },
];

export function buildCategoryPage(cat: CategoryPageConfig, catalogApiUrl: string, checkoutUrl: string, loginUrl: string, registerUrl: string, preRenderedAssets?: any[]): string {
  const hasCatalog = cat.category.length > 0;
  // Pre-render asset cards server-side if data is provided — this eliminates
  // the "Loading..." flash and gives the page real content for crawlers,
  // differential validation, and headless browser audits.
  const preRenderedHtml = (preRenderedAssets && preRenderedAssets.length > 0)
    ? preRenderedAssets.map(a => {
        const price = a.license_type === 'subscription' ? 'Included' : ('$' + a.price);
        const badge = a.featured ? '<div class="featured-badge">FEATURED</div>' : '';
        const rating = a.rating ? '<div style="color:#FFD700;font-size:11px;">★ ' + a.rating + '</div>' : '';
        const safeName = (a.name || '').replace(/"/g, '&quot;');
        return '<div class="card" data-asset-id="' + a.id + '" data-asset-name="' + safeName + '">' +
          '<div class="card-img" style="position:relative;">' + badge +
            '<img src="' + (a.thumbnail_url || '') + '" alt="' + safeName + '" loading="lazy" onerror="this.style.display=\'none\'">' +
          '</div>' +
          '<div class="card-body">' +
            '<div class="card-title">' + (a.name || '') + '</div>' +
            '<div class="card-cat">' + (a.subcategory || a.category || '') + '</div>' +
            rating +
            '<div class="card-price">' + price + '</div>' +
          '</div>' +
        '</div>';
      }).join('')
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${cat.title}</title>
<meta name="description" content="${cat.description}">
<script src="https://cdn.tailwindcss.com"></script>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #fff; min-height: 100vh; }
  .nav { background: #111; border-bottom: 1px solid #222; padding: 16px 24px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .nav a { color: #ccc; text-decoration: none; font-size: 14px; font-weight: 600; }
  .nav a:hover { color: #fff; }
  .nav .logo { font-size: 20px; font-weight: 800; color: #fff; }
  .nav .signin { margin-left: auto; }
  .nav .signin a { background: #4a9eff; color: #fff; padding: 8px 16px; border-radius: 6px; }
  .hero { padding: 60px 24px 40px; text-align: center; max-width: 900px; margin: 0 auto; }
  .hero h1 { font-size: 48px; font-weight: 800; margin: 0 0 16px; line-height: 1.1; }
  .hero p { font-size: 18px; color: #999; line-height: 1.6; margin: 0 0 32px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; padding: 0 24px 60px; max-width: 1400px; margin: 0 auto; }
  .card { background: #161616; border: 1px solid #2a2a2a; border-radius: 8px; overflow: hidden; cursor: pointer; transition: transform .15s; }
  .card:hover { transform: translateY(-2px); }
  .card-img { aspect-ratio: 4/3; overflow: hidden; background: #0d0d0d; }
  .card-img img { width: 100%; height: 100%; object-fit: cover; }
  .card-body { padding: 12px; }
  .card-title { font-size: 13px; font-weight: 600; color: #fff; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .card-cat { font-size: 11px; color: #888; margin-bottom: 4px; }
  .card-price { font-size: 12px; color: #4a9eff; font-weight: 600; }
  .featured-badge { position: absolute; top: 8px; left: 8px; background: #FFD700; color: #111; padding: 3px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; }
  .loading { text-align: center; padding: 60px; color: #555; }
  .info-page { max-width: 800px; margin: 0 auto; padding: 60px 24px; }
  .info-page h2 { font-size: 28px; margin: 30px 0 16px; }
  .info-page p { color: #999; line-height: 1.8; margin: 0 0 16px; }
  .cta-btn { display: inline-block; background: linear-gradient(135deg, #4a9eff, #2563eb); color: #fff; padding: 14px 36px; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 16px; margin: 20px 0; }
  footer { text-align: center; padding: 40px 24px; color: #555; font-size: 13px; border-top: 1px solid #222; }
  footer a { color: #999; text-decoration: none; margin: 0 8px; }
  @media (max-width: 640px) { .hero h1 { font-size: 32px; } .grid { grid-template-columns: repeat(2, 1fr); } }
</style>
</head>
<body>
<nav class="nav">
  <a href="/" class="logo">⚡ Creative Assets</a>
  <a href="/video-templates">Video</a>
  <a href="/audio">Audio</a>
  <a href="/graphics">Graphics</a>
  <a href="/design-templates">Templates</a>
  <a href="/fonts">Fonts</a>
  <a href="/photos">Photos</a>
  <a href="/ai-image-generator">AI Tools</a>
  <a href="/pricing">Pricing</a>
  <span class="signin"><a href="${loginUrl}">Sign In</a></span>
</nav>

<section class="hero">
  <div style="font-size: 56px; margin-bottom: 12px;">${cat.icon}</div>
  <h1>${cat.title.split('—')[0].trim()}</h1>
  <p>${cat.description}</p>
</section>

${hasCatalog ? `<div class="grid" id="assetGrid">${preRenderedHtml || '<div class="loading">Loading assets...</div>'}</div>` : `
<div class="info-page">
  <h2>${cat.title.split('—')[0].trim()}</h2>
  <p>${cat.description}</p>
  <p>For more information or to get started, browse our catalog or sign up for a subscription.</p>
  <a href="/subscribe" class="cta-btn">Get Unlimited Downloads</a>
</div>`}

<footer>
  <a href="${loginUrl}">Sign In</a>
  <a href="${registerUrl}">Sign Up</a>
  <a href="/pricing">Pricing</a>
  <a href="/license">License</a>
  <a href="/terms">Terms</a>
  <a href="/privacy">Privacy</a>
  <a href="/help">Help</a>
</footer>

<script>
var CATALOG_API='${catalogApiUrl}';
var CHECKOUT_URL='${checkoutUrl}';
var LOGIN_URL='${loginUrl}';
var REGISTER_URL='${registerUrl}';
var CATEGORY='${cat.category}';

${hasCatalog ? `
function fetchAssets() {
  fetch(CATALOG_API+'?action=browse&category='+encodeURIComponent(CATEGORY)+'&limit=48')
    .then(function(r){return r.json();})
    .then(function(data){
      if(!data.assets||data.assets.length===0){
        document.getElementById('assetGrid').innerHTML='<div class="loading">No assets found.</div>';
        return;
      }
      var html=data.assets.map(function(a){
        var price=a.license_type==='subscription'?'Included':('$'+a.price);
        var badge=a.featured?'<div class="featured-badge">FEATURED</div>':'';
        var rating=a.rating?'<div style="color:#FFD700;font-size:11px;">★ '+a.rating+'</div>':'';
        return '<div class="card" data-asset-id="'+a.id+'" data-asset-name="'+a.name.replace(/"/g,'&quot;')+'">'+
          '<div class="card-img" style="position:relative;">'+badge+
            '<img src="'+(a.thumbnail_url||'')+'" alt="'+a.name.replace(/"/g,'&quot;')+'" loading="lazy" onerror="this.style.display=\\'none\\'">'+
          '</div>'+
          '<div class="card-body">'+
            '<div class="card-title">'+a.name+'</div>'+
            '<div class="card-cat">'+(a.subcategory||a.category)+'</div>'+
            rating+
            '<div class="card-price">'+price+'</div>'+
          '</div>'+
        '</div>';
      }).join('');
      document.getElementById('assetGrid').innerHTML=html;
      document.querySelectorAll('[data-asset-id]').forEach(function(card){
        card.addEventListener('click',function(){
          var aid=this.getAttribute('data-asset-id');
          var aname=this.getAttribute('data-asset-name');
          if(window.self!==window.top){alert('Checkout works only from the published app. Please open this site in a new tab.');return;}
          fetch(CHECKOUT_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:[{name:aname,amount:29,quantity:1,type:'ai_tool',asset_id:aid}]})})
            .then(function(r){return r.json();})
            .then(function(j){if(j.url)window.location.href=j.url;else alert('Could not start checkout.');})
            .catch(function(){alert('Checkout error.');});
        });
      });
    })
    .catch(function(){document.getElementById('assetGrid').innerHTML='<div class="loading">Error loading assets.</div>';});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fetchAssets);
else fetchAssets();
` : ''}

// Auth link interceptor
(function(){
  var LOGIN=LOGIN_URL,REGISTER=REGISTER_URL;
  var authPat=/(sign-in|signin|login|sign-up|signup|register|join|my-account|account|profile)/i;
  var regPat=/(sign-up|signup|register|join|create-account)/i;
  function rewrite(el){
    if(!el||!el.href)return;
    if(el.href.indexOf('autoleads')>=0)return;
    var t=(el.textContent||'').toLowerCase();
    if(authPat.test(t)||authPat.test(el.href)){
      el.href=regPat.test(t)?REGISTER:LOGIN;
    }
  }
  document.addEventListener('click',function(e){
    var el=e.target.closest('a,button');if(!el)return;
    var t=(el.textContent||'').toLowerCase();
    if(el.href&&el.href.indexOf('autoleads')>=0)return;
    if(authPat.test(t)){e.preventDefault();e.stopPropagation();window.location.href=regPat.test(t)?REGISTER:LOGIN;}
  },true);
  document.querySelectorAll('a[href]').forEach(rewrite);
  setTimeout(function(){document.querySelectorAll('a[href]').forEach(rewrite);},2000);
})();
</script>
</body>
</html>`;
}

export function buildAllCategoryPages(catalogApiUrl: string, checkoutUrl: string, loginUrl: string, registerUrl: string, preRenderedCatalog?: Map<string, any[]>): Map<string, string> {
  const pages = new Map<string, string>();
  for (const cat of CATEGORY_PAGES) {
    const preRendered = preRenderedCatalog?.get(cat.category);
    pages.set(cat.slug + '.html', buildCategoryPage(cat, catalogApiUrl, checkoutUrl, loginUrl, registerUrl, preRendered));
  }
  // Add search page (reads ?q= query parameter)
  pages.set('search.html', buildSearchPage(catalogApiUrl, checkoutUrl, loginUrl, registerUrl));
  return pages;
}

// Build a search page that reads the ?q= query parameter and searches the
// catalog API. This is a critical user journey — the search reconstruction
// script redirects all search inputs to /search.html?q=...
export function buildSearchPage(catalogApiUrl: string, checkoutUrl: string, loginUrl: string, registerUrl: string): string {
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
  .nav { background: #111; border-bottom: 1px solid #222; padding: 16px 24px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
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
  <a href="/fonts">Fonts</a>
  <a href="/photos">Photos</a>
  <a href="/ai-image-generator">AI Tools</a>
  <a href="/pricing">Pricing</a>
  <span class="signin"><a href="${loginUrl}">Sign In</a></span>
</nav>

<div class="search-bar">
  <h1>Search Creative Assets</h1>
  <input type="search" id="searchInput" placeholder="Search for templates, graphics, photos, AI tools..." value="">
</div>

<div class="results-info" id="resultsInfo"></div>
<div class="grid" id="assetGrid"><div class="loading">Enter a search term to find assets...</div></div>

<footer>
  <a href="${loginUrl}">Sign In</a>
  <a href="${registerUrl}">Sign Up</a>
  <a href="/pricing">Pricing</a>
  <a href="/terms">Terms</a>
  <a href="/privacy">Privacy</a>
  <a href="/help">Help</a>
</footer>

<script>
var CATALOG_API='${catalogApiUrl}';
var CHECKOUT_URL='${checkoutUrl}';
var LOGIN_URL='${loginUrl}';
var REGISTER_URL='${registerUrl}';

function getQueryParam(name) {
  var params = new URLSearchParams(window.location.search);
  return params.get(name) || '';
}

function searchAssets(query) {
  var grid = document.getElementById('assetGrid');
  var info = document.getElementById('resultsInfo');
  if (!query || query.length < 2) {
    grid.innerHTML = '<div class="loading">Enter a search term to find assets...</div>';
    info.textContent = '';
    return;
  }
  grid.innerHTML = '<div class="loading">Searching...</div>';
  info.textContent = 'Searching for "' + query + '"...';
  
  // Fetch from all categories and filter by query
  var categories = ['graphic_templates', 'video_templates', 'web_templates', 'photos', 'graphics', 'fonts', '3d', 'audio', 'app_templates', 'presentation_templates', 'addons'];
  var allAssets = [];
  var completed = 0;
  
  categories.forEach(function(cat) {
    fetch(CATALOG_API + '?action=browse&category=' + encodeURIComponent(cat) + '&limit=12')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.assets) {
          var q = query.toLowerCase();
          var matches = data.assets.filter(function(a) {
            return (a.name || '').toLowerCase().indexOf(q) >= 0 ||
                   (a.description || '').toLowerCase().indexOf(q) >= 0 ||
                   (a.subcategory || '').toLowerCase().indexOf(q) >= 0 ||
                   (a.tags || []).some(function(t) { return t.toLowerCase().indexOf(q) >= 0; });
          });
          allAssets = allAssets.concat(matches);
        }
      })
      .catch(function() {})
      .finally(function() {
        completed++;
        if (completed === categories.length) {
          renderResults(allAssets, query);
        }
      });
  });
}

function renderResults(assets, query) {
  var grid = document.getElementById('assetGrid');
  var info = document.getElementById('resultsInfo');
  if (assets.length === 0) {
    grid.innerHTML = '<div class="no-results">No results found for "' + query + '". <a href="/all-items">Browse all items</a></div>';
    info.textContent = '0 results';
    return;
  }
  info.textContent = assets.length + ' result' + (assets.length !== 1 ? 's' : '') + ' for "' + query + '"';
  grid.innerHTML = assets.slice(0, 48).map(function(a) {
    var price = a.license_type === 'subscription' ? 'Included' : ('$' + a.price);
    var rating = a.rating ? '<div style="color:#FFD700;font-size:11px;">★ ' + a.rating + '</div>' : '';
    return '<div class="card" data-asset-id="' + a.id + '" data-asset-name="' + a.name.replace(/"/g, '&quot;') + '">' +
      '<div class="card-img"><img src="' + (a.thumbnail_url || '') + '" alt="' + a.name.replace(/"/g, '&quot;') + '" loading="lazy" onerror="this.style.display=\\'none\\'"></div>' +
      '<div class="card-body"><div class="card-title">' + a.name + '</div>' +
      '<div class="card-cat">' + (a.subcategory || a.category) + '</div>' + rating +
      '<div class="card-price">' + price + '</div></div></div>';
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

// Initialize
var initialQuery = getQueryParam('q');
document.getElementById('searchInput').value = initialQuery;
if (initialQuery) searchAssets(initialQuery);

// Live search on input
var debounceTimer;
document.getElementById('searchInput').addEventListener('input', function() {
  clearTimeout(debounceTimer);
  var q = this.value.trim();
  debounceTimer = setTimeout(function() {
    var newUrl = window.location.pathname + (q ? '?q=' + encodeURIComponent(q) : '');
    window.history.replaceState({}, '', newUrl);
    searchAssets(q);
  }, 400);
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