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
  return pages;
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