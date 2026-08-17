// Shared rebrand utilities used by rebrandCloneSite and deepRebrandSite.
// Extracted to avoid duplication between the two rebrand functions.

// Build a runtime wordmark-swap script that replaces every header/nav logo
// (<svg> wordmark or <img> logo) with a styled TEXT element showing the new
// brand name — NOT a logo image. The old brand's wordmark becomes the new
// brand's name in text. Runs on DOMContentLoaded + two delayed passes to
// catch late-rendered logos (SPA hydration, lazy nav, etc.).
export function buildLogoSwapScript(logoUrl: string, brandName: string): string {
  return `
<script>
(function(){
  var BRAND='${brandName}';
  function makeWordmark(){
    var s=document.createElement('span');
    s.textContent=BRAND;
    s.style.font='700 22px -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,system-ui,sans-serif';
    s.style.letterSpacing='-0.02em';
    s.style.color='#111';
    s.style.whiteSpace='nowrap';
    s.style.display='inline-block';
    return s;
  }
  function swapLogos(){
    document.querySelectorAll('header svg, nav svg, [class*="logo" i] svg, [class*="brand" i] svg').forEach(function(svg){
      var ctx=svg.closest('header,nav,[class*="logo" i],[class*="brand" i],a[href="/"],a[href=""]');
      if(!ctx) return;
      if(svg.dataset && svg.dataset.flReplaced) return;
      svg.replaceWith(makeWordmark());
    });
    document.querySelectorAll('img').forEach(function(img){
      var ctx=img.closest('header,nav,[class*="logo" i],[class*="brand" i],a[href="/"],a[href=""]');
      if(!ctx) return;
      if(img.width>300||img.height>200) return;
      if(img.dataset && img.dataset.flReplaced) return;
      img.replaceWith(makeWordmark());
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