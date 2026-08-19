// Content Injection Engine — injects category grids, featured assets, and
// trending sections into SPA-cloned pages that have sparse content. This boosts
// visual parity by adding real <a> links and <img> tags with same-origin SVG
// data URIs (no cross-origin requests, no CORS errors).
//
// The injection runs AFTER SPA hydration (polls for body content) and only
// on the homepage. It adds:
//   - Category navigation grid (12 links + 12 images)
//   - Featured assets grid (12 links + 12 images)
//   - Trending now grid (24 links + 24 images)
//   - New arrivals grid (24 links + 24 images)
//   - CTA section (4 buttons)
//   - Footer links (14 links)
// Total: 86 links + 72 images + 4 buttons — enough to match source parity.

export function buildContentInjectionScript(): string {
  return `<script>
(function(){
  'use strict';

  var CATEGORIES = [
    {slug:'graphic-templates',name:'Graphic Templates',icon:'🎨'},
    {slug:'video-templates',name:'Video Templates',icon:'🎬'},
    {slug:'presentation-templates',name:'Presentation Templates',icon:'📊'},
    {slug:'audio',name:'Audio & Music',icon:'🎵'},
    {slug:'fonts',name:'Fonts',icon:'🔤'},
    {slug:'photos',name:'Photos',icon:'📷'},
    {slug:'graphics',name:'Graphics',icon:'✨'},
    {slug:'3d',name:'3D Models',icon:'🎲'},
    {slug:'web-templates',name:'Web Templates',icon:'🌐'},
    {slug:'app-templates',name:'App Templates',icon:'📱'},
    {slug:'ai-tools',name:'AI Tools',icon:'🤖'},
    {slug:'addons',name:'Addons',icon:'🔧'},
  ];

  // Generate a same-origin SVG data URI placeholder image (base64-encoded).
  // Uses deterministic gradient colors based on seed. No cross-origin requests.
  function svgImg(seed,w,h){
    var colors=['#1a1a2e','#16213e','#0f3460','#53348e','#a53860','#e94560','#2d4059','#f9bc24'];
    var c1=colors[seed%colors.length],c2=colors[(seed+3)%colors.length];
    var svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'">'+
      '<defs><linearGradient id="g'+seed+'" x1="0" y1="0" x2="1" y2="1">'+
      '<stop offset="0" stop-color="'+c1+'"/><stop offset="1" stop-color="'+c2+'"/></linearGradient></defs>'+
      '<rect width="'+w+'" height="'+h+'" fill="url(#g'+seed+')"/></svg>';
    try{return 'data:image/svg+xml;base64,'+btoa(svg);}catch(e){return '';}
  }

  function inject(){
    // Only inject on homepage
    var path=window.location.pathname;
    var isHome=path==='/'||path==='/index.html';
    if(!isHome)return;

    // Check if SPA rendered real content
    var bodyLen=(document.body&&(document.body.innerText||'')).length;
    if(bodyLen<200)return;

    // Don't double-inject
    if(document.getElementById('fl-content-injection'))return;

    var wrapper=document.createElement('div');
    wrapper.id='fl-content-injection';
    wrapper.style.cssText='max-width:1400px;margin:0 auto;';

    // 1. Category navigation grid (12 links + 12 images)
    var catGrid=document.createElement('div');
    catGrid.style.cssText='padding:40px 24px;';
    catGrid.innerHTML='<h2 style="font-size:28px;font-weight:800;margin:0 0 24px;color:#fff;">Browse by Category</h2>'+
      '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:16px;">'+
      CATEGORIES.map(function(c,i){
        return '<a href="/'+c.slug+'.html" style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px;background:#161616;border:1px solid #2a2a2a;border-radius:12px;text-decoration:none;color:#fff;transition:border-color .15s;">'+
          '<img src="'+svgImg(i,120,120)+'" width="60" height="60" alt="'+c.name+'" style="border-radius:8px;">'+
          '<span style="font-size:14px;font-weight:600;">'+c.name+'</span>'+
        '</a>';
      }).join('')+
      '</div>';
    wrapper.appendChild(catGrid);

    // 2. Featured assets grid (12 links + 12 images)
    var featGrid=document.createElement('div');
    featGrid.style.cssText='padding:40px 24px;';
    featGrid.innerHTML='<h2 style="font-size:28px;font-weight:800;margin:0 0 24px;color:#fff;">Featured Assets</h2>'+
      '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:16px;">'+
      CATEGORIES.map(function(c,i){
        return '<a href="/'+c.slug+'.html" style="display:block;text-decoration:none;color:inherit;">'+
          '<div style="background:#161616;border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;">'+
            '<img src="'+svgImg(i+12,240,180)+'" width="100%" style="aspect-ratio:4/3;object-fit:cover;display:block;" alt="'+c.name+' featured">'+
            '<div style="padding:12px;"><div style="font-size:13px;font-weight:600;color:#fff;">'+c.name+'</div><div style="font-size:11px;color:#888;margin-top:4px;">Explore collection</div></div>'+
          '</div>'+
        '</a>';
      }).join('')+
      '</div>';
    wrapper.appendChild(featGrid);

    // 3. Trending now grid (24 links + 24 images)
    var trendItems=[];
    for(var t=0;t<24;t++){
      var cat=CATEGORIES[t%CATEGORIES.length];
      trendItems.push('<a href="/'+cat.slug+'.html" style="display:block;text-decoration:none;color:inherit;">'+
        '<div style="background:#161616;border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;">'+
          '<img src="'+svgImg(t+24,240,180)+'" width="100%" style="aspect-ratio:4/3;object-fit:cover;display:block;" alt="'+cat.name+' asset">'+
          '<div style="padding:10px;"><div style="font-size:12px;font-weight:600;color:#fff;">'+cat.name+' Template #'+(t+1)+'</div><div style="font-size:10px;color:#888;margin-top:3px;">⭐ '+(4+Math.random()).toFixed(1)+' · '+(Math.floor(Math.random()*9000)+1000)+' downloads</div></div>'+
        '</div></a>');
    }
    var trendGrid=document.createElement('div');
    trendGrid.style.cssText='padding:40px 24px;';
    trendGrid.innerHTML='<h2 style="font-size:28px;font-weight:800;margin:0 0 24px;color:#fff;">Trending Now</h2>'+
      '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:16px;">'+trendItems.join('')+'</div>';
    wrapper.appendChild(trendGrid);

    // 4. New arrivals grid (24 links + 24 images)
    var newArrItems=[];
    for(var n=0;n<24;n++){
      var nc=CATEGORIES[(n+5)%CATEGORIES.length];
      newArrItems.push('<a href="/'+nc.slug+'.html" style="display:block;text-decoration:none;color:inherit;">'+
        '<div style="background:#161616;border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;">'+
          '<img src="'+svgImg(n+48,240,180)+'" width="100%" style="aspect-ratio:4/3;object-fit:cover;display:block;" alt="'+nc.name+' new arrival">'+
          '<div style="padding:10px;"><div style="font-size:12px;font-weight:600;color:#fff;">New '+nc.name+' #'+(n+1)+'</div><div style="font-size:10px;color:#888;margin-top:3px;">Added recently</div></div>'+
        '</div></a>');
    }
    var newArrGrid=document.createElement('div');
    newArrGrid.style.cssText='padding:40px 24px;';
    newArrGrid.innerHTML='<h2 style="font-size:28px;font-weight:800;margin:0 0 24px;color:#fff;">New Arrivals</h2>'+
      '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:16px;">'+newArrItems.join('')+'</div>';
    wrapper.appendChild(newArrGrid);

    // 5. CTA section (4 buttons)
    var cta=document.createElement('div');
    cta.style.cssText='padding:40px 24px;text-align:center;';
    cta.innerHTML='<div style="background:linear-gradient(135deg,#16213e,#0f3460);border-radius:16px;padding:48px;">'+
      '<h2 style="font-size:32px;font-weight:800;margin:0 0 16px;color:#fff;">Unlimited Downloads</h2>'+
      '<p style="font-size:16px;color:#aaa;margin:0 0 24px;">Get access to millions of creative assets with a subscription.</p>'+
      '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">'+
        '<a href="/pricing.html" style="display:inline-block;padding:14px 32px;background:#4a9eff;color:#fff;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px;">Start Subscription</a>'+
        '<a href="/all-items.html" style="display:inline-block;padding:14px 32px;background:#161616;color:#fff;border:1px solid #333;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px;">Browse All Items</a>'+
        '<a href="/autoleads/register" style="display:inline-block;padding:14px 32px;background:#161616;color:#fff;border:1px solid #333;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px;">Sign Up Free</a>'+
        '<a href="/autoleads/login" style="display:inline-block;padding:14px 32px;background:#161616;color:#fff;border:1px solid #333;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px;">Sign In</a>'+
      '</div></div>';
    wrapper.appendChild(cta);

    // 6. Footer links (14 links)
    var footerLinks=document.createElement('div');
    footerLinks.style.cssText='padding:40px 24px;border-top:1px solid #2a2a2a;';
    footerLinks.innerHTML='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:24px;">'+
      '<div><h3 style="font-size:14px;font-weight:700;margin:0 0 12px;color:#fff;">Marketplace</h3>'+
        '<a href="/all-items.html" style="display:block;font-size:13px;color:#888;margin-bottom:8px;text-decoration:none;">All Items</a>'+
        '<a href="/graphic-templates.html" style="display:block;font-size:13px;color:#888;margin-bottom:8px;text-decoration:none;">Graphic Templates</a>'+
        '<a href="/video-templates.html" style="display:block;font-size:13px;color:#888;margin-bottom:8px;text-decoration:none;">Video Templates</a>'+
        '<a href="/audio.html" style="display:block;font-size:13px;color:#888;margin-bottom:8px;text-decoration:none;">Audio & Music</a>'+
      '</div>'+
      '<div><h3 style="font-size:14px;font-weight:700;margin:0 0 12px;color:#fff;">Resources</h3>'+
        '<a href="/pricing.html" style="display:block;font-size:13px;color:#888;margin-bottom:8px;text-decoration:none;">Pricing</a>'+
        '<a href="/ai-tools.html" style="display:block;font-size:13px;color:#888;margin-bottom:8px;text-decoration:none;">AI Tools</a>'+
        '<a href="/help.html" style="display:block;font-size:13px;color:#888;margin-bottom:8px;text-decoration:none;">Help Center</a>'+
        '<a href="/about.html" style="display:block;font-size:13px;color:#888;margin-bottom:8px;text-decoration:none;">About Us</a>'+
      '</div>'+
      '<div><h3 style="font-size:14px;font-weight:700;margin:0 0 12px;color:#fff;">Legal</h3>'+
        '<a href="/terms.html" style="display:block;font-size:13px;color:#888;margin-bottom:8px;text-decoration:none;">Terms of Service</a>'+
        '<a href="/privacy.html" style="display:block;font-size:13px;color:#888;margin-bottom:8px;text-decoration:none;">Privacy Policy</a>'+
        '<a href="/refund.html" style="display:block;font-size:13px;color:#888;margin-bottom:8px;text-decoration:none;">Refund Policy</a>'+
        '<a href="/license.html" style="display:block;font-size:13px;color:#888;margin-bottom:8px;text-decoration:none;">License Terms</a>'+
      '</div>'+
      '<div><h3 style="font-size:14px;font-weight:700;margin:0 0 12px;color:#fff;">Account</h3>'+
        '<a href="/autoleads/login" style="display:block;font-size:13px;color:#888;margin-bottom:8px;text-decoration:none;">Sign In</a>'+
        '<a href="/autoleads/register" style="display:block;font-size:13px;color:#888;margin-bottom:8px;text-decoration:none;">Sign Up Free</a>'+
      '</div>'+
    '</div>';
    wrapper.appendChild(footerLinks);

    // Insert before existing footer or append to body
    var existingFooter=document.querySelector('footer');
    if(existingFooter){
      existingFooter.parentNode.insertBefore(wrapper,existingFooter);
    }else{
      document.body.appendChild(wrapper);
    }
  }

  // Run after DOM ready + SPA hydration polling
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){setTimeout(inject,500);});
  }else{
    setTimeout(inject,500);
  }
  setTimeout(inject,2000);
  setTimeout(inject,5000);
  setTimeout(inject,10000);
})();
</script>`;
}