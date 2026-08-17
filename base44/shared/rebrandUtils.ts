// Shared rebrand utilities used by rebrandCloneSite and deepRebrandSite.
// Extracted to avoid duplication between the two rebrand functions.

// Build a runtime logo-swap script that forces every header/nav logo <img>
// and <svg> to render the new logo URL. Runs on DOMContentLoaded + two delayed
// passes to catch late-rendered logos (SPA hydration, lazy nav, etc.).
export function buildLogoSwapScript(logoUrl: string, brandName: string): string {
  return `
<script>
(function(){
  var LOGO='${logoUrl}';
  var BRAND='${brandName}';
  function swapLogos(){
    var imgs=document.querySelectorAll('img');
    imgs.forEach(function(img){
      var ctx=img.closest('header,nav,[class*="logo" i],[class*="brand" i],a[href="/"],a[href=""]');
      if(!ctx) return;
      if(img.width>300||img.height>200) return;
      img.src=LOGO; img.srcset=''; img.removeAttribute('srcset');
      img.style.maxHeight='40px'; img.style.width='auto'; img.style.height='auto'; img.style.objectFit='contain';
    });
    document.querySelectorAll('header svg, nav svg, [class*="logo" i] svg').forEach(function(svg){
      if(svg.closest('header,nav,[class*="logo" i]')){
        var wrap=document.createElement('div'); wrap.style.display='inline-flex'; wrap.style.alignItems='center';
        var nImg=document.createElement('img'); nImg.src=LOGO; nImg.style.maxHeight='40px'; nImg.style.width='auto'; nImg.style.height='auto'; nImg.style.objectFit='contain';
        wrap.appendChild(nImg); svg.replaceWith(wrap);
      }
    });
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',swapLogos);}else{swapLogos();}
  setTimeout(swapLogos,1500);setTimeout(swapLogos,3000);
})();
</script>`;
}

// Escape a string for use in a RegExp.
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Build the full set of brand string variants to replace. Given an old brand
// like "Envato Elements", returns ["Envato Elements", "envato elements",
// "ENVATO ELEMENTS", "Envato", "envato", "ENVATO", "Envato-Elements",
// "Envato_Elements", "EnvatoElements"] — longest first so longer matches
// are replaced before shorter ones.
export function buildBrandVariants(oldBrand: string): string[] {
  const variants = new Set<string>();
  const clean = oldBrand.trim();
  if (!clean) return [];
  variants.add(clean);
  variants.add(clean.toLowerCase());
  variants.add(clean.toUpperCase());
  const words = clean.split(/\s+/).filter(w => w.length > 2);
  for (const w of words) {
    variants.add(w);
    variants.add(w.toLowerCase());
    variants.add(w.toUpperCase());
  }
  variants.add(clean.replace(/\s+/g, '-'));
  variants.add(clean.replace(/\s+/g, '_'));
  variants.add(clean.replace(/\s+/g, ''));
  return [...variants].sort((a, b) => b.length - a.length);
}

// Case-insensitive brand replacement across a text string. Replaces the full
// brand name, then each word (>3 chars) individually.
export function replaceBrandCI(text: string, oldBrand: string, newBrand: string): string {
  const esc = escapeRegex(oldBrand.trim());
  let out = text.replace(new RegExp(esc, 'gi'), newBrand);
  const words = oldBrand.trim().split(/\s+/).filter(w => w.length > 3);
  for (const w of words) {
    out = out.replace(new RegExp(escapeRegex(w), 'gi'), newBrand);
  }
  return out;
}