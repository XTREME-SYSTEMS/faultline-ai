import { Link } from 'react-router-dom';
import { ArrowRight, Check, Star, Users, Calendar, Mail, MessageSquare, Globe, BarChart3, Bot, Star as StarIcon } from 'lucide-react';
import MarketingShell from '@/components/ghl/site/MarketingShell';

const STATS = [
  { v: '7,000,000+', l: 'AI Voice Calls' },
  { v: '7,300,000,000', l: 'Leads Generated' },
  { v: '179,000,000', l: 'Appointments Booked' },
  { v: '$5.2B+', l: 'Sales Facilitated in 2025' },
];

const FEATURES = [
  { icon: Users, t: 'CRM & Pipelines', d: 'Capture every lead and track deals from first contact to closed-won with drag-and-drop pipelines.' },
  { icon: Globe, t: 'Funnels & Websites', d: 'Build high-converting landing pages and full websites in minutes — no code required.' },
  { icon: Mail, t: 'Email & SMS Marketing', d: 'Nurture leads with automated campaigns across email and text, all from one inbox.' },
  { icon: Calendar, t: 'Calendar & Bookings', d: 'Let prospects book themselves with round-robin scheduling and automated reminders.' },
  { icon: Bot, t: 'AI Automations', d: 'Trigger workflows that follow up instantly, so no lead ever goes cold.' },
  { icon: StarIcon, t: 'Reputation & Reviews', d: 'Automatically request reviews and manage your online reputation across every listing.' },
  { icon: MessageSquare, t: 'Unified Conversations', d: 'Text, email, social, and Google Business messaging — all in a single unified inbox.' },
  { icon: BarChart3, t: 'Reporting & Analytics', d: 'See every call, booking, and dollar attributed back to the campaign that drove it.' },
];

export default function Home() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0B1120] text-white">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 75% 25%, rgba(16,185,129,.18), transparent 45%), radial-gradient(circle at 15% 80%, rgba(37,99,235,.15), transparent 40%)' }} />
        <div className="relative max-w-7xl mx-auto px-5 pt-20 pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-bold uppercase tracking-wider">⚡ Power up your business with AI</span>
            <h1 className="mt-5 text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight" style={{ fontFamily: "'Libre Caslon Display', serif" }}>
              The AI-powered business <span className="text-emerald-400">operating system</span>
            </h1>
            <p className="mt-5 text-lg text-slate-300 max-w-xl">All the tools you need to capture, nurture and close new leads into bookings, sales, reviews and repeat customers!</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-emerald-500 text-[#0B1120] font-bold hover:bg-emerald-400 transition">Start 14 Day Free Trial <ArrowRight size={18} /></Link>
              <Link to="/lgny/pricing" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg border border-white/20 text-white font-bold hover:bg-white/10 transition">View Pricing</Link>
            </div>
            <p className="mt-4 text-xs text-slate-400">No credit card required · Cancel anytime</p>
          </div>
          <div className="relative">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2 shadow-2xl">
              <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80" alt="Lead Gen Near You dashboard" className="rounded-xl w-full" />
            </div>
            <div className="absolute -bottom-5 -left-5 hidden md:flex items-center gap-2 px-4 py-3 rounded-xl bg-white text-[#0B1120] shadow-xl">
              <Star className="text-emerald-500 fill-emerald-500" size={18} /><b className="text-sm">4.9/5 · 12,000+ reviews</b>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#0B1120] border-y border-white/10 text-white">
        <div className="max-w-7xl mx-auto px-5 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map(s => (
            <div key={s.l}>
              <div className="text-3xl md:text-4xl font-bold text-emerald-400" style={{ fontFamily: "'Libre Caslon Display', serif" }}>{s.v}</div>
              <div className="mt-1 text-xs uppercase tracking-wider text-slate-400">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Business section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-5 grid lg:grid-cols-2 gap-14 items-center">
          <img src="https://images.unsplash.com/photo-1556761175-5973dc0f32af?auto=format&fit=crop&w=1000&q=80" alt="Business growth" className="rounded-2xl w-full" />
          <div>
            <span className="text-emerald-600 text-xs font-bold uppercase tracking-widest">Our Mission</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Libre Caslon Display', serif" }}>We're in the business of helping you grow your business</h2>
            <p className="mt-4 text-slate-600 text-lg">Lead Gen Near You is the AI-powered operating system powering the growth of businesses around the world. From the first click to the fifth repeat sale, every step lives in one place.</p>
            <ul className="mt-6 space-y-3">
              {['One platform — no duct-taping tools together','Built for local service businesses','Unlimited contacts, unlimited users','White-label ready for agencies'].map(x => (
                <li key={x} className="flex items-start gap-3 text-slate-700"><Check className="text-emerald-500 mt-0.5 shrink-0" size={20} /> {x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Libre Caslon Display', serif" }}>Everything you need to grow, in one place</h2>
            <p className="mt-3 text-slate-600">Replace a dozen subscriptions with a single platform built to capture and convert local demand.</p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(f => (
              <div key={f.t} className="p-6 rounded-2xl bg-white border border-slate-200 hover:shadow-lg transition">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><f.icon size={22} /></div>
                <h3 className="mt-4 font-bold text-lg">{f.t}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations strip */}
      <section className="py-14 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-5 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Integrates with the tools you already use</p>
          <div className="mt-6 flex flex-wrap justify-center gap-x-10 gap-y-4 text-slate-500 font-bold text-lg">
            {['Google', 'Facebook', 'Stripe', 'Twilio', 'Mailchimp', 'Zapier', 'Slack', 'WhatsApp'].map(n => <span key={n}>{n}</span>)}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 bg-[#0B1120] text-white">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <div className="flex justify-center gap-1 mb-4">{[...Array(5)].map((_,i)=><Star key={i} className="text-emerald-400 fill-emerald-400" size={22}/>)}</div>
          <p className="text-2xl md:text-3xl font-medium leading-relaxed" style={{ fontFamily: "'Libre Caslon Display', serif" }}>
            "We went from 8 leads a month to 140. Lead Gen Near You replaced our website, CRM, and follow-up — and booked the jobs for us."
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-[#0B1120] grid place-items-center font-bold">MD</div>
            <div className="text-left"><b className="block text-sm">Marcus Diaz</b><span className="text-xs text-slate-400">Owner, Apex Epoxy Floors</span></div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-emerald-500">
        <div className="max-w-4xl mx-auto px-5 text-center text-[#0B1120]">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: "'Libre Caslon Display', serif" }}>Start growing with Lead Gen Near You today</h2>
          <p className="mt-4 text-lg font-medium">Join thousands of local businesses capturing more leads and booking more jobs.</p>
          <Link to="/register" className="mt-7 inline-flex items-center gap-2 px-7 py-4 rounded-lg bg-[#0B1120] text-white font-bold hover:bg-black transition">Start 14 Day Free Trial <ArrowRight size={18} /></Link>
        </div>
      </section>
    </MarketingShell>
  );
}