// Generates standalone HTML for the LGNY marketing site with configurable branding.
// Single-page site with JS-based page switching (Home, Features, Pricing, Solutions, About).
// Uses Tailwind Play CDN + Google Fonts. All branding (brand name, domain, accent color,
// logo) is injected via the config parameter.

export interface LgnySiteConfig {
  brandName: string;
  domain: string;
  accentColor: string;     // e.g. "#CCFF00"
  logoUrl: string;
  tagline?: string;
}

function lighten(hex: string, amount = 12): string {
  // Simple hex lighten — shift each channel up by `amount` (0-255), clamp.
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = Math.min(255, parseInt(h.slice(0, 2), 16) + amount * 3);
  const g = Math.min(255, parseInt(h.slice(2, 4), 16) + amount * 3);
  const b = Math.min(255, parseInt(h.slice(4, 6), 16) + amount * 3);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function darken(hex: string, amount = 40): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = Math.max(0, parseInt(h.slice(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(h.slice(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(h.slice(4, 6), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function generateLgnySiteHtml(cfg: LgnySiteConfig): string {
  const brand = cfg.brandName || 'AUTO LEADS';
  const domain = cfg.domain || 'autoleads.ai';
  const accent = cfg.accentColor || '#FFD700';
  const accentLight = lighten(accent, 10);
  const accentDark = darken(accent, 30);
  const logo = cfg.logoUrl || 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/9a0697861_autoleads-logo-dark-master.png';
  const tagline = cfg.tagline || 'CONSTRUCTION INTELLIGENCE — All the tools you need to capture, nurture and close new leads into bookings, sales, reviews and repeat customers!';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${brand} — Construction Intelligence Platform</title>
<meta name="description" content="${brand} is the AI-powered construction intelligence platform. Capture, nurture, and close leads — all in one platform.">
<link rel="icon" href="${logo}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Libre+Caslon+Display&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<script>
tailwind.config = {
  theme: { extend: {
    colors: { accent: '${accent}', 'accent-light': '${accentLight}', 'accent-dark': '${accentDark}' },
    fontFamily: { display: ["'Libre Caslon Display'", 'serif'], body: ["'DM Sans'", 'system-ui', 'sans-serif'] }
  }}
}
</script>
<style>
body { font-family: 'DM Sans', system-ui, sans-serif; }
.font-display { font-family: 'Libre Caslon Display', serif; }
.page { display: none; }
.page.active { display: block; }
html { scroll-behavior: smooth; }
</style>
</head>
<body class="bg-white text-slate-900">

<!-- NAV -->
<header class="sticky top-0 z-50 bg-black text-white border-b border-white/10">
  <div class="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
    <a href="#" onclick="showPage('home');return false;" class="flex items-center gap-2.5">
      <img src="${logo}" alt="${brand}" class="shrink-0 rounded" style="width:32px;height:38px">
      <div class="flex flex-col leading-none">
        <b class="font-display text-[15px] tracking-tight text-white">${brand}</b>
        <small class="text-[8px] uppercase tracking-[.14em] text-slate-400">${domain}</small>
      </div>
    </a>
    <nav class="hidden md:flex items-center gap-8">
      <a href="#" onclick="showPage('features');return false;" class="text-sm font-medium text-slate-300 hover:text-white transition">Features</a>
      <a href="#" onclick="showPage('pricing');return false;" class="text-sm font-medium text-slate-300 hover:text-white transition">Pricing</a>
      <a href="#" onclick="showPage('solutions');return false;" class="text-sm font-medium text-slate-300 hover:text-white transition">Solutions</a>
      <a href="#" onclick="showPage('about');return false;" class="text-sm font-medium text-slate-300 hover:text-white transition">About</a>
    </nav>
    <div class="hidden md:flex items-center gap-3">
      <a href="#" onclick="showPage('pricing');return false;" class="text-sm font-medium text-slate-300 hover:text-white">Login</a>
      <a href="#" onclick="showPage('pricing');return false;" class="px-4 py-2 rounded-lg text-sm font-bold bg-accent text-black hover:bg-accent-light transition">Start 14-day trial</a>
    </div>
    <button class="md:hidden text-white" onclick="toggleMobile()">&#9776;</button>
  </div>
  <div id="mobileNav" class="hidden md:hidden border-t border-white/10 px-5 py-4 flex-col gap-3">
    <a href="#" onclick="showPage('features');toggleMobile();return false;" class="text-sm font-medium text-slate-300">Features</a>
    <a href="#" onclick="showPage('pricing');toggleMobile();return false;" class="text-sm font-medium text-slate-300">Pricing</a>
    <a href="#" onclick="showPage('solutions');toggleMobile();return false;" class="text-sm font-medium text-slate-300">Solutions</a>
    <a href="#" onclick="showPage('about');toggleMobile();return false;" class="text-sm font-medium text-slate-300">About</a>
    <a href="#" onclick="showPage('pricing');toggleMobile();return false;" class="mt-2 px-4 py-2 rounded-lg text-sm font-bold bg-accent text-black text-center">Start 14-day trial</a>
  </div>
</header>

<!-- ===== HOME PAGE ===== -->
<div id="page-home" class="page active">
  <!-- Hero -->
  <section class="relative overflow-hidden bg-black text-white">
    <div class="absolute inset-0" style="background: radial-gradient(circle at 75% 25%, rgba(16,185,129,.18), transparent 45%), radial-gradient(circle at 15% 80%, rgba(37,99,235,.15), transparent 40%)"></div>
    <div class="relative max-w-7xl mx-auto px-5 pt-20 pb-24 grid lg:grid-cols-2 gap-12 items-center">
      <div>
        <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/15 text-accent text-xs font-bold uppercase tracking-wider">⚡ Power up your business with AI</span>
        <h1 class="mt-5 text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight font-display">The AI-powered business <span style="color:${accentLight}">operating system</span></h1>
        <p class="mt-5 text-lg text-slate-300 max-w-xl">${tagline}</p>
        <a href="#" onclick="showPage('pricing');return false;" class="mt-7 inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-accent text-black font-bold hover:bg-accent-light transition">Start 14 Day Free Trial →</a>
      </div>
      <div class="rounded-2xl border border-white/10 bg-white/5 p-2 shadow-2xl">
        <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80" alt="Dashboard" class="rounded-xl w-full">
      </div>
    </div>
  </section>

  <!-- Stats -->
  <section class="bg-black border-y border-white/10 text-white">
    <div class="max-w-7xl mx-auto px-5 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
      <div><div class="text-3xl md:text-4xl font-bold font-display" style="color:${accentLight}">All-in-one</div><div class="mt-1 text-xs uppercase tracking-wider text-slate-400">CRM · Funnels · Bookings</div></div>
      <div><div class="text-3xl md:text-4xl font-bold font-display" style="color:${accentLight}">AI-first</div><div class="mt-1 text-xs uppercase tracking-wider text-slate-400">Voice · Chat · Workflows</div></div>
      <div><div class="text-3xl md:text-4xl font-bold font-display" style="color:${accentLight}">14-day</div><div class="mt-1 text-xs uppercase tracking-wider text-slate-400">Free trial · No card</div></div>
      <div><div class="text-3xl md:text-4xl font-bold font-display" style="color:${accentLight}">Unlimited</div><div class="mt-1 text-xs uppercase tracking-wider text-slate-400">Contacts & users</div></div>
    </div>
  </section>

  <!-- Business -->
  <section class="py-20 bg-white">
    <div class="max-w-4xl mx-auto px-5 text-center">
      <h2 class="text-3xl md:text-4xl font-bold tracking-tight font-display">We're in the business of helping you grow your business</h2>
      <p class="mt-4 text-slate-600 text-lg">${brand} is the AI-powered operating system powering the growth of businesses around the world.</p>
    </div>
  </section>

  <!-- All-in-one -->
  <section class="py-20 bg-slate-50">
    <div class="max-w-7xl mx-auto px-5">
      <div class="text-center max-w-2xl mx-auto">
        <h2 class="text-3xl md:text-4xl font-bold tracking-tight font-display">Your all-in-one solution for business growth</h2>
        <p class="mt-3 text-slate-600">All the tools you need in one AI-powered platform</p>
      </div>
      <div class="mt-10 grid md:grid-cols-3 gap-8">
        <div class="p-8 rounded-2xl bg-white border border-slate-200"><b class="block text-lg">Capture</b><p class="mt-2 text-sm text-slate-600">Attract the right people, turn interest into leads and keep your pipeline full with CRM, Forms, Funnels, Chat Widget, Call Tracking, and Social Planner.</p></div>
        <div class="p-8 rounded-2xl bg-white border border-slate-200"><b class="block text-lg">Nurture</b><p class="mt-2 text-sm text-slate-600">Build relationships that convert with Conversation AI, Pipelines, Workflows, Calendars, Automated Reminders, and Ringless Voicemail.</p></div>
        <div class="p-8 rounded-2xl bg-white border border-slate-200"><b class="block text-lg">Close</b><p class="mt-2 text-sm text-slate-600">Close deals with less back-and-forth using Lead Scoring, Estimates, Invoicing, Payments, Order Forms, and Text-2-Pay.</p></div>
      </div>
      <div class="mt-8 grid md:grid-cols-2 gap-8">
        <div class="p-8 rounded-2xl bg-white border border-slate-200"><b class="block text-lg">Evangelize</b><p class="mt-2 text-sm text-slate-600">Create fans, not just customers with Reputation Management, Automated Review Requests, Affiliate Manager, and AI Review Reply.</p></div>
        <div class="p-8 rounded-2xl bg-white border border-slate-200"><b class="block text-lg">Reactivate</b><p class="mt-2 text-sm text-slate-600">Get back on their radar with Broadcast Campaigns, Smart Lists, Birthday & Seasonal Campaigns, and Database Reactivation Templates.</p></div>
      </div>
    </div>
  </section>

  <!-- Pillars -->
  <section class="py-20 bg-white">
    <div class="max-w-5xl mx-auto px-5 text-center">
      <h2 class="text-2xl md:text-3xl font-bold tracking-tight max-w-3xl mx-auto font-display">We exist to remove friction from growth and give business owners the systems they need to operate, scale and win</h2>
      <div class="mt-12 grid md:grid-cols-3 gap-8">
        <div class="text-center"><b class="block text-lg">All-in-one</b><p class="mt-2 text-sm text-slate-600">A truly all-in-one platform built for operators, not just marketers</p></div>
        <div class="text-center"><b class="block text-lg">AI as the foundation</b><p class="mt-2 text-sm text-slate-600">Deep AI integration across the full business lifecycle</p></div>
        <div class="text-center"><b class="block text-lg">Community-driven</b><p class="mt-2 text-sm text-slate-600">A community-led ecosystem focused on execution and outcomes</p></div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="py-20 bg-black text-white text-center">
    <div class="max-w-4xl mx-auto px-5">
      <h2 class="text-3xl md:text-4xl font-bold tracking-tight font-display">Everything you need to grow your business; even on the go!</h2>
      <a href="#" onclick="showPage('pricing');return false;" class="mt-7 inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-accent text-black font-bold hover:bg-accent-light transition">Start 14 Day Free Trial →</a>
    </div>
  </section>
</div>

<!-- ===== FEATURES PAGE ===== -->
<div id="page-features" class="page">
  <section class="bg-black text-white py-20">
    <div class="max-w-4xl mx-auto px-5 text-center">
      <span style="color:${accentLight}" class="text-xs font-bold uppercase tracking-widest">Platform Features</span>
      <h1 class="mt-3 text-4xl md:text-6xl font-bold tracking-tight font-display">One platform. Every tool you need.</h1>
      <p class="mt-5 text-lg text-slate-300">${brand} brings CRM, funnels, marketing, bookings, and automations together — so you can run your whole business from a single login.</p>
      <a href="#" onclick="showPage('pricing');return false;" class="mt-7 inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-accent text-black font-bold hover:bg-accent-light transition">Start 14 Day Free Trial →</a>
    </div>
  </section>
  <div class="bg-white">
    <section class="py-16 bg-white"><div class="max-w-7xl mx-auto px-5 grid lg:grid-cols-2 gap-12 items-center"><div><span style="color:${accentDark}" class="text-xs font-bold uppercase tracking-widest">CRM</span><h2 class="mt-2 text-3xl font-bold tracking-tight font-display">Capture & manage every lead</h2><p class="mt-3 text-slate-600 text-lg">A full contact record for every prospect — with tags, custom fields, pipelines, and a complete activity timeline so nothing slips through.</p></div><img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1000&q=80" alt="CRM" class="rounded-2xl w-full"></div></section>
    <section class="py-16 bg-slate-50"><div class="max-w-7xl mx-auto px-5 grid lg:grid-cols-2 gap-12 items-center"><div class="lg:order-2"><span style="color:${accentDark}" class="text-xs font-bold uppercase tracking-widest">Funnels</span><h2 class="mt-2 text-3xl font-bold tracking-tight font-display">Funnels & websites that convert</h2><p class="mt-3 text-slate-600 text-lg">Drag-and-drop landing pages, full websites, and opt-in forms — built and published in minutes, no code required.</p></div><img src="https://images.unsplash.com/photo-1467232007581-a68b07c332a6?auto=format&fit=crop&w=1000&q=80" alt="Funnels" class="rounded-2xl w-full lg:order-1"></div></section>
    <section class="py-16 bg-white"><div class="max-w-7xl mx-auto px-5 grid lg:grid-cols-2 gap-12 items-center"><div><span style="color:${accentDark}" class="text-xs font-bold uppercase tracking-widest">Marketing</span><h2 class="mt-2 text-3xl font-bold tracking-tight font-display">Email & SMS that nurture</h2><p class="mt-3 text-slate-600 text-lg">Automated campaigns and broadcasts across email and text, with smart segmentation and a shared unified inbox.</p></div><img src="https://images.unsplash.com/photo-1596526131083-e8c633c948d2?auto=format&fit=crop&w=1000&q=80" alt="Marketing" class="rounded-2xl w-full"></div></section>
    <section class="py-16 bg-slate-50"><div class="max-w-7xl mx-auto px-5 grid lg:grid-cols-2 gap-12 items-center"><div class="lg:order-2"><span style="color:${accentDark}" class="text-xs font-bold uppercase tracking-widest">Bookings</span><h2 class="mt-2 text-3xl font-bold tracking-tight font-display">Calendar & scheduling</h2><p class="mt-3 text-slate-600 text-lg">Round-robin and class-based booking with automated reminders, rescheduling, and payments at the time of booking.</p></div><img src="https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=1000&q=80" alt="Bookings" class="rounded-2xl w-full lg:order-1"></div></section>
    <section class="py-16 bg-white"><div class="max-w-7xl mx-auto px-5 grid lg:grid-cols-2 gap-12 items-center"><div><span style="color:${accentDark}" class="text-xs font-bold uppercase tracking-widest">Automation</span><h2 class="mt-2 text-3xl font-bold tracking-tight font-display">AI-powered workflows</h2><p class="mt-3 text-slate-600 text-lg">Trigger-based automations that follow up instantly, route leads, and even handle inbound calls with AI Voice.</p></div><img src="https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&w=1000&q=80" alt="Automation" class="rounded-2xl w-full"></div></section>
    <section class="py-16 bg-slate-50"><div class="max-w-7xl mx-auto px-5 grid lg:grid-cols-2 gap-12 items-center"><div class="lg:order-2"><span style="color:${accentDark}" class="text-xs font-bold uppercase tracking-widest">Reputation</span><h2 class="mt-2 text-3xl font-bold tracking-tight font-display">Reviews & reputation</h2><p class="mt-3 text-slate-600 text-lg">Automatically request reviews from happy customers and manage your listings across Google and Facebook.</p></div><img src="https://images.unsplash.com/photo-1554224155-6726b0148b8c?auto=format&fit=crop&w=1000&q=80" alt="Reputation" class="rounded-2xl w-full lg:order-1"></div></section>
  </div>
  <section class="py-16 bg-accent text-center text-black"><h2 class="text-3xl md:text-4xl font-bold font-display">Ready to see it in action?</h2><a href="#" onclick="showPage('pricing');return false;" class="mt-6 inline-flex items-center gap-2 px-7 py-4 rounded-lg bg-black text-white font-bold hover:opacity-80 transition">Start Free Trial →</a></section>
</div>

<!-- ===== PRICING PAGE ===== -->
<div id="page-pricing" class="page">
  <section class="bg-black text-white py-20">
    <div class="max-w-4xl mx-auto px-5 text-center">
      <span style="color:${accentLight}" class="text-xs font-bold uppercase tracking-widest">Pricing</span>
      <h1 class="mt-3 text-4xl md:text-6xl font-bold tracking-tight font-display">Start with a FREE 14-day trial</h1>
      <p class="mt-4 text-lg text-slate-300">Unlimited contacts, unlimited users. Scale your business without a tax on growth.</p>
    </div>
  </section>
  <section class="py-16 bg-white">
    <div class="max-w-7xl mx-auto px-5 grid md:grid-cols-3 gap-6 items-stretch">
      <div class="rounded-2xl p-7 flex flex-col border border-slate-200"><h3 class="text-xl font-bold">Starter</h3><div class="mt-3 flex items-end gap-1"><span class="text-4xl font-bold font-display">$97</span><span class="text-slate-500 mb-1">/mo</span></div><p class="mt-3 text-sm text-slate-600">Everything you need to start capturing and following up with leads.</p><ul class="mt-5 space-y-2.5 flex-1"><li class="flex items-start gap-2 text-sm text-slate-700">✓ Unlimited contacts</li><li class="flex items-start gap-2 text-sm text-slate-700">✓ Unlimited users</li><li class="flex items-start gap-2 text-sm text-slate-700">✓ 2-way SMS & email</li><li class="flex items-start gap-2 text-sm text-slate-700">✓ Funnel & website builder</li><li class="flex items-start gap-2 text-sm text-slate-700">✓ Calendar & bookings</li><li class="flex items-start gap-2 text-sm text-slate-700">✓ Reputation management</li></ul><a href="#" onclick="showPage('about');return false;" class="mt-6 px-5 py-3 rounded-lg font-bold text-center bg-black text-white hover:opacity-80 transition">Start Starter</a></div>
      <div class="rounded-2xl p-7 flex flex-col border-2 border-accent shadow-xl relative"><span class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-black text-xs font-bold uppercase tracking-wider">Most Popular</span><h3 class="text-xl font-bold">Pro</h3><div class="mt-3 flex items-end gap-1"><span class="text-4xl font-bold font-display">$297</span><span class="text-slate-500 mb-1">/mo</span></div><p class="mt-3 text-sm text-slate-600">For growing businesses that need automations and AI at scale.</p><ul class="mt-5 space-y-2.5 flex-1"><li class="flex items-start gap-2 text-sm text-slate-700">✓ Everything in Starter</li><li class="flex items-start gap-2 text-sm text-slate-700">✓ AI Voice & inbound calls</li><li class="flex items-start gap-2 text-sm text-slate-700">✓ Advanced automations</li><li class="flex items-start gap-2 text-sm text-slate-700">✓ Workflow builder</li><li class="flex items-start gap-2 text-sm text-slate-700">✓ A/B testing</li><li class="flex items-start gap-2 text-sm text-slate-700">✓ Custom user roles</li><li class="flex items-start gap-2 text-sm text-slate-700">✓ White-label branding</li></ul><a href="#" onclick="showPage('about');return false;" class="mt-6 px-5 py-3 rounded-lg font-bold text-center bg-accent text-black hover:bg-accent-light transition">Start Pro</a></div>
      <div class="rounded-2xl p-7 flex flex-col border border-slate-200"><h3 class="text-xl font-bold">Enterprise</h3><div class="mt-3 flex items-end gap-1"><span class="text-4xl font-bold font-display">Custom</span></div><p class="mt-3 text-sm text-slate-600">For multi-location operators and agencies managing many accounts.</p><ul class="mt-5 space-y-2.5 flex-1"><li class="flex items-start gap-2 text-sm text-slate-700">✓ Everything in Pro</li><li class="flex items-start gap-2 text-sm text-slate-700">✓ Dedicated success manager</li><li class="flex items-start gap-2 text-sm text-slate-700">✓ Custom integrations</li><li class="flex items-start gap-2 text-sm text-slate-700">✓ SAML SSO</li><li class="flex items-start gap-2 text-sm text-slate-700">✓ Priority support</li><li class="flex items-start gap-2 text-sm text-slate-700">✓ Volume pricing</li><li class="flex items-start gap-2 text-sm text-slate-700">✓ Onboarding & migration</li></ul><a href="#" onclick="showPage('about');return false;" class="mt-6 px-5 py-3 rounded-lg font-bold text-center bg-black text-white hover:opacity-80 transition">Contact Sales</a></div>
    </div>
  </section>
  <section class="py-16 bg-slate-50">
    <div class="max-w-3xl mx-auto px-5">
      <h2 class="text-3xl font-bold text-center tracking-tight font-display">Frequently asked questions</h2>
      <div class="mt-8 space-y-4">
        <div class="p-5 rounded-xl bg-white border border-slate-200"><b class="block text-sm">Is there a free trial?</b><p class="mt-1.5 text-sm text-slate-600">Yes — every plan starts with a 14-day free trial. No credit card required.</p></div>
        <div class="p-5 rounded-xl bg-white border border-slate-200"><b class="block text-sm">Are contacts and users really unlimited?</b><p class="mt-1.5 text-sm text-slate-600">Correct. We never tax you for growth — unlimited contacts and unlimited users on every plan.</p></div>
        <div class="p-5 rounded-xl bg-white border border-slate-200"><b class="block text-sm">Can I change plans later?</b><p class="mt-1.5 text-sm text-slate-600">Absolutely. Upgrade or downgrade anytime; changes apply at the next billing cycle.</p></div>
        <div class="p-5 rounded-xl bg-white border border-slate-200"><b class="block text-sm">What about usage-based charges?</b><p class="mt-1.5 text-sm text-slate-600">SMS, email, and AI Voice are usage-based. You only pay for what you send, at industry-leading rates.</p></div>
      </div>
    </div>
  </section>
</div>

<!-- ===== SOLUTIONS PAGE ===== -->
<div id="page-solutions" class="page">
  <section class="bg-black text-white py-20">
    <div class="max-w-4xl mx-auto px-5 text-center">
      <span style="color:${accentLight}" class="text-xs font-bold uppercase tracking-widest">Solutions</span>
      <h1 class="mt-3 text-4xl md:text-6xl font-bold tracking-tight font-display">Built for local service businesses</h1>
      <p class="mt-5 text-lg text-slate-300">From the first click to the fifth repeat sale, ${brand} is tuned to the way local service businesses win work.</p>
    </div>
  </section>
  <section class="py-16 bg-white">
    <div class="max-w-7xl mx-auto px-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <div class="p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition"><h3 class="mt-4 font-bold text-lg">Home Services</h3><p class="mt-1.5 text-sm text-slate-600">Contractors, roofers, HVAC, and remodelers capture local demand and book the job on the first call.</p></div>
      <div class="p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition"><h3 class="mt-4 font-bold text-lg">Flooring & Epoxy</h3><p class="mt-1.5 text-sm text-slate-600">Garage floor and epoxy specialists turn visual quotes into booked jobs and repeat referrals.</p></div>
      <div class="p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition"><h3 class="mt-4 font-bold text-lg">Auto Services</h3><p class="mt-1.5 text-sm text-slate-600">Detailers, auto repair, and tint shops fill the schedule and follow up automatically.</p></div>
      <div class="p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition"><h3 class="mt-4 font-bold text-lg">Electricians & Plumbers</h3><p class="mt-1.5 text-sm text-slate-600">Emergency and booked jobs routed to the right tech with reminders that cut no-shows.</p></div>
      <div class="p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition"><h3 class="mt-4 font-bold text-lg">Salons & Spas</h3><p class="mt-1.5 text-sm text-slate-600">Class and individual bookings with automated reminders and review requests.</p></div>
      <div class="p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition"><h3 class="mt-4 font-bold text-lg">Health & Wellness</h3><p class="mt-1.5 text-sm text-slate-600">Clinics and med-spas manage appointments, intake forms, and rebooking in one place.</p></div>
      <div class="p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition"><h3 class="mt-4 font-bold text-lg">Real Estate</h3><p class="mt-1.5 text-sm text-slate-600">Agents and brokerages nurture listings, capture leads, and close with automated follow-up.</p></div>
      <div class="p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition"><h3 class="mt-4 font-bold text-lg">Agencies</h3><p class="mt-1.5 text-sm text-slate-600">White-label the whole platform and resell it to your clients as your own branded system.</p></div>
    </div>
  </section>
  <section class="py-16 bg-slate-50">
    <div class="max-w-5xl mx-auto px-5 grid md:grid-cols-3 gap-6 text-center">
      <div class="p-8 rounded-2xl bg-white border border-slate-200"><div class="text-4xl font-bold font-display" style="color:${accent}">Capture</div><div class="mt-2 text-sm text-slate-600">Every lead logged, tagged, and followed up instantly</div></div>
      <div class="p-8 rounded-2xl bg-white border border-slate-200"><div class="text-4xl font-bold font-display" style="color:${accent}">Nurture</div><div class="mt-2 text-sm text-slate-600">Automated texts and emails that keep the pipeline warm</div></div>
      <div class="p-8 rounded-2xl bg-white border border-slate-200"><div class="text-4xl font-bold font-display" style="color:${accent}">Close</div><div class="mt-2 text-sm text-slate-600">Bookings, invoices, and payments in one place</div></div>
    </div>
  </section>
  <section class="py-16 bg-accent text-center text-black"><h2 class="text-3xl md:text-4xl font-bold font-display">See how it fits your business</h2><a href="#" onclick="showPage('pricing');return false;" class="mt-6 inline-flex items-center gap-2 px-7 py-4 rounded-lg bg-black text-white font-bold hover:opacity-80 transition">Start Free Trial →</a></section>
</div>

<!-- ===== ABOUT PAGE ===== -->
<div id="page-about" class="page">
  <section class="bg-black text-white py-20">
    <div class="max-w-4xl mx-auto px-5 text-center">
      <span style="color:${accentLight}" class="text-xs font-bold uppercase tracking-widest">About Us</span>
      <h1 class="mt-3 text-4xl md:text-6xl font-bold tracking-tight font-display">We help local businesses win</h1>
      <p class="mt-5 text-lg text-slate-300">${brand} was built to give every local service business the same growth engine the big franchises use — at a price that makes sense.</p>
    </div>
  </section>
  <section class="py-20 bg-white">
    <div class="max-w-7xl mx-auto px-5 grid lg:grid-cols-2 gap-14 items-center">
      <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80" alt="Our team" class="rounded-2xl w-full">
      <div>
        <h2 class="text-3xl md:text-4xl font-bold tracking-tight font-display">Our story</h2>
        <p class="mt-4 text-slate-600 text-lg">We watched local businesses duct-tape a dozen tools together just to keep up. So we built one platform — CRM, funnels, marketing, bookings, and automations — that replaces all of them and actually gets the phone to ring.</p>
        <p class="mt-3 text-slate-600 text-lg">${brand} is built for local service businesses that want to capture more leads, book more jobs, and turn one-time customers into repeat referrals — without juggling a dozen separate subscriptions.</p>
      </div>
    </div>
  </section>
  <section class="py-16 bg-slate-50">
    <div class="max-w-5xl mx-auto px-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <div class="p-6 rounded-2xl bg-white border border-slate-200"><h3 class="mt-4 font-bold">Outcomes over features</h3><p class="mt-1.5 text-sm text-slate-600">We measure success by the jobs you book and the dollars you bank — not the buttons we ship.</p></div>
      <div class="p-6 rounded-2xl bg-white border border-slate-200"><h3 class="mt-4 font-bold">Local-first</h3><p class="mt-1.5 text-sm text-slate-600">Every product decision starts with the local service business owner in mind.</p></div>
      <div class="p-6 rounded-2xl bg-white border border-slate-200"><h3 class="mt-4 font-bold">Move fast</h3><p class="mt-1.5 text-sm text-slate-600">We ship weekly so the platform keeps earning its place in your workflow.</p></div>
      <div class="p-6 rounded-2xl bg-white border border-slate-200"><h3 class="mt-4 font-bold">Customer-obsessed</h3><p class="mt-1.5 text-sm text-slate-600">Real humans, fast support, and a community that builds the roadmap with us.</p></div>
    </div>
  </section>
  <section class="py-16 bg-black text-white">
    <div class="max-w-5xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
      <div><div class="text-3xl md:text-4xl font-bold font-display" style="color:${accentLight}">1</div><div class="mt-1 text-xs uppercase tracking-wider text-slate-400">Platform, not a dozen</div></div>
      <div><div class="text-3xl md:text-4xl font-bold font-display" style="color:${accentLight}">24/7</div><div class="mt-1 text-xs uppercase tracking-wider text-slate-400">AI follow-up</div></div>
      <div><div class="text-3xl md:text-4xl font-bold font-display" style="color:${accentLight}">14-day</div><div class="mt-1 text-xs uppercase tracking-wider text-slate-400">Free trial</div></div>
      <div><div class="text-3xl md:text-4xl font-bold font-display" style="color:${accentLight}">Local</div><div class="mt-1 text-xs uppercase tracking-wider text-slate-400">Built for service pros</div></div>
    </div>
  </section>
  <section class="py-16 bg-accent text-center text-black"><h2 class="text-3xl md:text-4xl font-bold font-display">Come grow with us</h2><a href="#" onclick="showPage('pricing');return false;" class="mt-6 inline-flex items-center gap-2 px-7 py-4 rounded-lg bg-black text-white font-bold hover:opacity-80 transition">Start Free Trial →</a></section>
</div>

<!-- FOOTER -->
<footer class="bg-black text-slate-300 pt-16 pb-8">
  <div class="max-w-7xl mx-auto px-5 grid grid-cols-2 md:grid-cols-5 gap-10">
    <div class="col-span-2">
      <div class="flex items-center gap-2.5">
        <img src="${logo}" alt="${brand}" class="shrink-0 rounded" style="width:34px;height:40px">
        <div class="flex flex-col leading-none">
          <b class="font-display text-[15px] tracking-tight text-white">${brand}</b>
          <small class="text-[8px] uppercase tracking-[.14em] text-slate-400">${domain}</small>
        </div>
      </div>
      <p class="mt-4 text-sm text-slate-400 max-w-xs">The AI-powered business operating system for local service businesses. Capture, nurture, and close leads — all in one platform.</p>
    </div>
    <div><b class="text-white text-sm block mb-3">Product</b><ul class="space-y-2"><li><a href="#" onclick="showPage('features');return false;" class="text-sm text-slate-400 hover:text-white">Features</a></li><li><a href="#" onclick="showPage('pricing');return false;" class="text-sm text-slate-400 hover:text-white">Pricing</a></li><li><a href="#" class="text-sm text-slate-400 hover:text-white">Integrations</a></li><li><a href="#" class="text-sm text-slate-400 hover:text-white">Mobile App</a></li></ul></div>
    <div><b class="text-white text-sm block mb-3">Company</b><ul class="space-y-2"><li><a href="#" onclick="showPage('about');return false;" class="text-sm text-slate-400 hover:text-white">About</a></li><li><a href="#" class="text-sm text-slate-400 hover:text-white">Careers</a></li><li><a href="#" class="text-sm text-slate-400 hover:text-white">Blog</a></li><li><a href="#" class="text-sm text-slate-400 hover:text-white">Contact</a></li></ul></div>
    <div><b class="text-white text-sm block mb-3">Resources</b><ul class="space-y-2"><li><a href="#" class="text-sm text-slate-400 hover:text-white">Help Center</a></li><li><a href="#" class="text-sm text-slate-400 hover:text-white">Community</a></li><li><a href="#" class="text-sm text-slate-400 hover:text-white">API Docs</a></li><li><a href="#" class="text-sm text-slate-400 hover:text-white">Status</a></li></ul></div>
  </div>
  <div class="max-w-7xl mx-auto px-5 mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between gap-3 text-xs text-slate-500">
    <span>© ${new Date().getFullYear()} ${brand} · ${domain}</span>
    <span>Privacy · Terms · Security</span>
  </div>
</footer>

<script>
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + id);
  if (el) el.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function toggleMobile() {
  const m = document.getElementById('mobileNav');
  m.classList.toggle('hidden');
  m.classList.toggle('flex');
}
</script>
</body>
</html>`;
}