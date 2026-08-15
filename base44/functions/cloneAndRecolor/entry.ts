import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { scrapeWithStealth } from '../../shared/stealthBrowser.ts';
import { slugify, createVercelProject, disableVercelSso, deployToVercel } from '../../shared/launchInfra.ts';

// Clones a site, replaces its accent color, and deploys to Vercel.
// Uses Browserbase to get fully rendered HTML (handles JS-heavy SPAs).

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { target_url, accent_from, accent_to, project_name } = body;
    if (!target_url) return Response.json({ error: 'target_url required' }, { status: 400 });

    // Default: Axion orange → metallic black
    const fromColor = (accent_from || '#F26522').toLowerCase();
    const toColor = accent_to || '#1a1a1a';
    const toHover = '#0d0d0d';
    const toLight = '#2a2a2a';

    console.log(`Cloning ${target_url} with accent ${fromColor} → ${toColor}`);

    // 1. Fetch rendered HTML via Browserbase stealth session (executes JS, renders SPA)
    let html = '';
    let renderMethod = 'stealth';
    let stealthError = null;
    let shaderSource: any = null;
    let shaderDebugInfo: string | null = null;
    try {
      console.log('Starting stealth scrape session...');
      const result = await scrapeWithStealth(target_url, {
        deepRender: true,
        waitAfterLoad: 5000,
        solveCaptchas: false,
        proxies: false,
        timeout: 45000,
        advancedStealth: false,
      });
      if (result.ok && result.html && result.html.length > 2000) {
        html = result.html;
        shaderSource = result.shaderSource || null;
        shaderDebugInfo = (result as any)?.shaderDebug || null;
        console.log(`Stealth scrape returned ${html.length} chars`);
      } else {
        stealthError = `ok=${result.ok}, len=${result.html?.length}, error=${result.error}`;
        console.log(`Stealth scrape insufficient: ${stealthError}`);
      }
    } catch (e) {
      stealthError = `${e.message}`;
      console.log(`Stealth scrape failed: ${e.message}`);
    }

    // Fallback to basic fetch
    if (html.length < 2000) {
      renderMethod = 'basic_fetch';
      console.log('Falling back to basic fetch');
      const r = await fetch(target_url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CloneAndRecolor/1.0)' },
        signal: AbortSignal.timeout(20000)
      });
      html = await r.text();
      console.log(`Basic fetch returned ${html.length} chars`);
    }

    if (html.length < 500) {
      return Response.json({ error: 'Could not fetch sufficient HTML content from target site' }, { status: 500 });
    }

    // 2. Replace accent color and its variants
    const fromHover = '#E05A1A';
    const fromLight = '#E8704E';
    
    html = html.split(fromColor).join(toColor);
    html = html.split(fromColor.toUpperCase()).join(toColor);
    html = html.split(fromHover.toLowerCase()).join(toHover);
    html = html.split(fromHover.toUpperCase()).join(toHover);
    html = html.split(fromHover).join(toHover);
    html = html.split(fromLight.toLowerCase()).join(toLight);
    html = html.split(fromLight.toUpperCase()).join(toLight);
    html = html.split(fromLight).join(toLight);

    // Replace in rgb() format (242, 101, 34 = #F26522)
    html = html.split('242, 101, 34').join('26, 26, 26');
    html = html.split('242,101,34').join('26,26,26');
    html = html.split('rgb(242, 101, 34)').join(`rgb(26, 26, 26)`);
    html = html.split('rgb(242,101,34)').join(`rgb(26, 26, 26)`);

    // 3. Strip Base44/app JS bundles — they won't work on a different domain
    html = html.replace(/<script[^>]*src="[^"]*(?:base44|_app|\/assets\/|\/static\/)[^"]*"[^>]*><\/script>/gi, '');
    html = html.replace(/<script[^>]*type="module"[^>]*src="[^"]*"[^>]*><\/script>/gi, '');
    // Remove inline module scripts that reference base44
    html = html.replace(/<script[^>]*type="module"[^>]*>[\s\S]*?<\/script>/gi, '');

    // 3a. Restore bg-[#EFEFEF] on hero section — the original JS removed this
    //     class and set style="background: transparent" at runtime.
    html = html.replace(/<section id="hero"([^>]*)>/i, (match, rest) => {
      let fixed = rest.replace(/background:\s*transparent;?\s*/gi, '');
      if (!/bg-\[#EFEFEF\]/.test(fixed)) {
        fixed = fixed.replace(/class="([^"]*)"/, 'class="$1 bg-[#EFEFEF]"');
      }
      fixed = fixed.replace(/\s*style="\s*"/gi, '');
      return '<section id="hero"' + fixed + '>';
    });

    // 3b. Check if we extracted a shader source for live rendering
    //     WGSL shaders are single strings with @vertex+@fragment; GLSL needs 2+.
    const hasShader = !!(shaderSource && shaderSource.shaders && (
      shaderSource.shaders.some((s: any) => s.type === 'wgsl' && s.source && (s.source.includes('@fragment') || s.source.includes('fn '))) ||
      shaderSource.shaders.length >= 2
    ));

    // 4. Add Tailwind CDN (site uses utility classes everywhere) + fixes
    const headInject = `
<script src="https://cdn.tailwindcss.com"></script>
<style>
  /* ===== 3D Touch-Sensitive Background (canvas replaces WebGL shader) ===== */
  .fl-3d-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }

  /* ===== Layout & visibility fixes ===== */
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; min-height: 100vh; }
  /* Ensure all sections are visible (JS animation libs may hide them) */
  section, [data-section], [data-hero], [data-hero-extra] {
    opacity: 1 !important;
    visibility: visible !important;
  }
  [data-line] { opacity: 1 !important; transform: none !important; }
  [data-marquee-star] { display: inline-flex !important; }
  /* Fix opacity-65 (not standard Tailwind, won't work with CDN) */
  .opacity-65 { opacity: 0.65; }
  /* If we have the live WebGL shader, clear the captured PNG so the canvas shows;
     otherwise hide the dead canvas and fall back to the captured PNG */
  ${hasShader ? '/* Canvas visible for WebGPU runner; captured PNG stays as fallback */' : 'canvas[data-renderer="shaders"] { display: none !important; } [data-shader] .shader { background-size: cover !important; background-position: center !important; }'}
  /* Put #root and all content above the 3D background */
  #root { position: relative; z-index: 1; }
</style>
`;

    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, headInject + '\n</head>');
    } else if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, m => m + headInject);
    } else {
      html = headInject + html;
    }

    // 4b. If we extracted the WebGL shader source, inject a live WebGL runner
    //     that renders the exact original shader on the canvas.
    if (hasShader) {
      const wgslShaders = shaderSource.shaders.filter((s: any) => s.type === 'wgsl');
      const glslVs = shaderSource.shaders.find((s: any) => s.type === 'vertex')?.source || '';
      const glslFs = shaderSource.shaders.find((s: any) => s.type === 'fragment')?.source || '';
      const uniformInfo = shaderSource.uniforms || [];
      const attribInfo = shaderSource.attributes || [];
      let runner = '';

      if (wgslShaders.length > 0) {
        // WebGPU runner with captured WGSL shader
        const wgslCode = wgslShaders.map((s: any) => s.source).join('\n\n');
        const vsMatch = wgslCode.match(/@vertex\s+fn\s+(\w+)/);
        const fsMatch = wgslCode.match(/@fragment\s+fn\s+(\w+)/);
        const vsEntry = vsMatch ? vsMatch[1] : 'vs_main';
        const fsEntry = fsMatch ? fsMatch[1] : 'fs_main';

        runner = `<script>
(function(){var c=document.querySelector('canvas[data-renderer="shaders"]');if(!c||!navigator.gpu)return;navigator.gpu.requestAdapter().then(function(ad){if(!ad)return;ad.requestDevice().then(function(dev){var ctx=c.getContext('webgpu');if(!ctx)return;var fmt=navigator.gpu.getPreferredCanvasFormat();ctx.configure({device:dev,format:fmt,alphaMode:'premultiplied'});var sm=dev.createShaderModule({code:${JSON.stringify(wgslCode)}});try{var pipe=dev.createRenderPipeline({layout:'auto',vertex:{module:sm,entryPoint:${JSON.stringify(vsEntry)}},fragment:{module:sm,entryPoint:${JSON.stringify(fsEntry)},targets:[{format:fmt}]},primitive:{topology:'triangle-list'}});}catch(e){console.error('Pipeline creation failed:',e);return;}function rz(){var d=Math.min(window.devicePixelRatio||1,2);var pa=c.parentElement;var w=pa?pa.offsetWidth:window.innerWidth;var h=pa?pa.offsetHeight:window.innerHeight;c.width=w*d;c.height=h*d;}rz();window.addEventListener('resize',rz);var bgs=[];for(var i=0;i<8;i++){try{bgs.push(dev.createBindGroup({layout:pipe.getBindGroupLayout(i),entries:[]}));}catch(e){bgs.push(null);break;}}function rd(){var enc=dev.createCommandEncoder();var pass=enc.beginRenderPass({colorAttachments:[{view:ctx.getCurrentTexture().createView(),clearValue:{r:0.93,g:0.94,b:0.94,a:1},loadOp:'clear',storeOp:'store'}]});pass.setPipeline(pipe);for(var i=0;i<bgs.length;i++){if(bgs[i])pass.setBindGroup(i,bgs[i]);}pass.draw(3,1,0,0);pass.end();dev.queue.submit([enc.finish()]);requestAnimationFrame(rd);}rd();});}).catch(function(e){console.error('WebGPU init failed:',e);});})();
</script>`;
      } else if (glslVs && glslFs) {
        // WebGL runner with captured GLSL shaders
        runner = `<script>
(function(){var c=document.querySelector('canvas[data-renderer="shaders"]');if(!c)return;var gl=c.getContext('webgl2')||c.getContext('webgl');if(!gl)return;var vs=${JSON.stringify(glslVs)},fs=${JSON.stringify(glslFs)};function cp(t,s){var sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);return sh;}var v=cp(gl.VERTEX_SHADER,vs),f=cp(gl.FRAGMENT_SHADER,fs);var p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.useProgram(p);var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);var pl=-1;var ai=${JSON.stringify(attribInfo)};for(var i=0;i<ai.length;i++){if(ai[i].name.toLowerCase().indexOf('pos')>=0){pl=gl.getAttribLocation(p,ai[i].name);if(pl>=0)break;}}if(pl<0)pl=gl.getAttribLocation(p,'a_position');if(pl<0)pl=gl.getAttribLocation(p,'position');if(pl>=0){gl.enableVertexAttribArray(pl);gl.vertexAttribPointer(pl,2,gl.FLOAT,false,0,0);}var ul={};var ui=${JSON.stringify(uniformInfo)};for(var i=0;i<ui.length;i++){ul[ui[i].name]=gl.getUniformLocation(p,ui[i].name);}function rz(){var d=Math.min(window.devicePixelRatio||1,2);var pa=c.parentElement;var w=pa?pa.offsetWidth:window.innerWidth;var h=pa?pa.offsetHeight:window.innerHeight;c.width=w*d;c.height=h*d;c.style.width=w+'px';c.style.height=h+'px';gl.viewport(0,0,c.width,c.height);}rz();window.addEventListener('resize',rz);var m={x:0.5,y:0.5};document.addEventListener('mousemove',function(e){var r=c.getBoundingClientRect();m.x=(e.clientX-r.left)/r.width;m.y=1-(e.clientY-r.top)/r.height;});var st=performance.now();function rd(){var t=(performance.now()-st)/1000;for(var n in ul){if(!ul[n])continue;var l=n.toLowerCase();if(l.indexOf('time')>=0){gl.uniform1f(ul[n],t);}else if(l.indexOf('resolution')>=0){gl.uniform2f(ul[n],c.width,c.height);}else if(l.indexOf('mouse')>=0){gl.uniform2f(ul[n],m.x*c.width,m.y*c.height);}}gl.drawArrays(gl.TRIANGLE_STRIP,0,4);requestAnimationFrame(rd);}rd();})();
</script>`;
      }

      if (runner) {
        if (/<\/body>/i.test(html)) {
          html = html.replace(/<\/body>/i, runner + '\n</body>');
        } else {
          html = html + runner;
        }
      }
    }

    // 5. Deploy to Vercel
    const token = secrets.get('VERCEL_TOKEN');
    if (!token) throw new Error('VERCEL_TOKEN secret not set');
    const teamId = secrets.get('VERCEL_TEAM_ID') || null;

    const baseSlug = slugify(project_name || 'axion-studio-metallic') || 'axion-studio-metallic';
    const slug = baseSlug;
    console.log(`Creating Vercel project: ${slug}`);
    const vProject = await createVercelProject(token, teamId, slug);
    try { await disableVercelSso(token, teamId, vProject.id); } catch (e) { /* non-fatal */ }
    
    console.log('Deploying to Vercel...');
    const deploy = await deployToVercel(token, teamId, slug, vProject.id, html);

    return Response.json({
      status: 'success',
      original_url: target_url,
      clone_url: deploy.url,
      vercel_project: slug,
      accent_changed: `${fromColor} → ${toColor} (metallic black)`,
      html_size: html.length,
      rendered: renderMethod,
      stealth_error: stealthError,
      has_shader: hasShader,
      shader_debug: shaderDebugInfo,
      shader_info: shaderSource ? {
        shader_count: shaderSource.shaders?.length || 0,
        shader_types: shaderSource.shaders?.map((s: any) => s.type) || [],
        uniform_count: shaderSource.uniforms?.length || 0,
        uniform_names: shaderSource.uniforms?.map((u: any) => u.name) || [],
        attrib_names: shaderSource.attributes?.map((a: any) => a.name) || [],
        vs_preview: (shaderSource.shaders?.find((s: any) => s.type === 'vertex')?.source || '').slice(0, 200),
        fs_preview: (shaderSource.shaders?.find((s: any) => s.type === 'fragment')?.source || '').slice(0, 200),
      } : null
    });
  } catch (error) {
    console.error('cloneAndRecolor error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}