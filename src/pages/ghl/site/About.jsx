import { Link } from 'react-router-dom';
import { ArrowRight, Target, Heart, Zap, Users } from 'lucide-react';
import MarketingShell from '@/components/ghl/site/MarketingShell';

const VALUES = [
  { icon: Target, t: 'Outcomes over features', d: 'We measure success by the jobs you book and the dollars you bank — not the buttons we ship.' },
  { icon: Heart, t: 'Local-first', d: 'Every product decision starts with the local service business owner in mind.' },
  { icon: Zap, t: 'Move fast', d: 'We ship weekly so the platform keeps earning its place in your workflow.' },
  { icon: Users, t: 'Customer-obsessed', d: 'Real humans, fast support, and a community that builds the roadmap with us.' },
];

export default function About() {
  return (
    <MarketingShell>
      <section className="bg-[#000000] text-white py-20">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <span className="text-[#FFE566] text-xs font-bold uppercase tracking-widest">About Us</span>
          <h1 className="mt-3 text-4xl md:text-6xl font-bold tracking-tight" style={{ fontFamily: "'Libre Caslon Display', serif" }}>We help local businesses win</h1>
          <p className="mt-5 text-lg text-slate-300">FaultLine AI was built to give every local service business the same growth engine the big franchises use — at a price that makes sense.</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-5 grid lg:grid-cols-2 gap-14 items-center">
          <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80" alt="Our team" className="rounded-2xl w-full" />
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Libre Caslon Display', serif" }}>Our story</h2>
            <p className="mt-4 text-slate-600 text-lg">We watched local businesses duct-tape a dozen tools together just to keep up. So we built one platform — CRM, funnels, marketing, bookings, and automations — that replaces all of them and actually gets the phone to ring.</p>
            <p className="mt-3 text-slate-600 text-lg">FaultLine AI is built for local service businesses that want to capture more leads, book more jobs, and turn one-time customers into repeat referrals — without juggling a dozen separate subscriptions.</p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VALUES.map(v => (
            <div key={v.t} className="p-6 rounded-2xl bg-white border border-slate-200">
              <div className="w-11 h-11 rounded-xl bg-[#FFD700]/10 text-[#FFD700] flex items-center justify-center"><v.icon size={22} /></div>
              <h3 className="mt-4 font-bold">{v.t}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{v.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 bg-[#000000] text-white">
        <div className="max-w-5xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[['1','Platform, not a dozen'],['24/7','AI follow-up'],['14-day','Free trial'],['Local','Built for service pros']].map(([n,l]) => (
            <div key={l}><div className="text-3xl md:text-4xl font-bold text-[#FFE566]" style={{ fontFamily: "'Libre Caslon Display', serif" }}>{n}</div><div className="mt-1 text-xs uppercase tracking-wider text-slate-400">{l}</div></div>
          ))}
        </div>
      </section>

      <section className="py-16 bg-[#FFD700] text-center text-[#000000]">
        <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Libre Caslon Display', serif" }}>Come grow with us</h2>
        <Link to="/register" className="mt-6 inline-flex items-center gap-2 px-7 py-4 rounded-lg bg-[#000000] text-white font-bold hover:bg-black transition">Start Free Trial <ArrowRight size={18} /></Link>
      </section>
    </MarketingShell>
  );
}