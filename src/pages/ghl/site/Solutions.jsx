import { Link } from 'react-router-dom';
import { ArrowRight, Wrench, Home, Zap, Car, Paintbrush, Scissors, Stethoscope, Building2, Briefcase } from 'lucide-react';
import MarketingShell from '@/components/ghl/site/MarketingShell';

const SOLUTIONS = [
  { icon: Home, t: 'Home Services', d: 'Contractors, roofers, HVAC, and remodelers capture local demand and book the job on the first call.' },
  { icon: Paintbrush, t: 'Flooring & Epoxy', d: 'Garage floor and epoxy specialists turn visual quotes into booked jobs and repeat referrals.' },
  { icon: Car, t: 'Auto Services', d: 'Detailers, auto repair, and tint shops fill the schedule and follow up automatically.' },
  { icon: Zap, t: 'Electricians & Plumbers', d: 'Emergency and booked jobs routed to the right tech with reminders that cut no-shows.' },
  { icon: Scissors, t: 'Salons & Spas', d: 'Class and individual bookings with automated reminders and review requests.' },
  { icon: Stethoscope, t: 'Health & Wellness', d: 'Clinics and med-spas manage appointments, intake forms, and rebooking in one place.' },
  { icon: Building2, t: 'Real Estate', d: 'Agents and brokerages nurture listings, capture leads, and close with automated follow-up.' },
  { icon: Briefcase, t: 'Agencies', d: 'White-label the whole platform and resell it to your clients as your own branded system.' },
];

export default function Solutions() {
  return (
    <MarketingShell>
      <section className="bg-[#000000] text-white py-20">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <span className="text-[#DFFF5C] text-xs font-bold uppercase tracking-widest">Solutions</span>
          <h1 className="mt-3 text-4xl md:text-6xl font-bold tracking-tight" style={{ fontFamily: "'Libre Caslon Display', serif" }}>Built for local service businesses</h1>
          <p className="mt-5 text-lg text-slate-300">From the first click to the fifth repeat sale, Lead Generation Near You is tuned to the way local service businesses win work.</p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SOLUTIONS.map(s => (
            <div key={s.t} className="p-6 rounded-2xl border border-slate-200 hover:shadow-lg transition">
              <div className="w-11 h-11 rounded-xl bg-[#CCFF00]/10 text-emerald-600 flex items-center justify-center"><s.icon size={22} /></div>
              <h3 className="mt-4 font-bold text-lg">{s.t}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-5 grid md:grid-cols-3 gap-6 text-center">
          {[
            { n: '3x', l: 'More booked jobs in 90 days' },
            { n: '68%', l: 'Less time spent chasing leads' },
            { n: '4.9★', l: 'Average customer rating' },
          ].map(x => (
            <div key={x.l} className="p-8 rounded-2xl bg-white border border-slate-200">
              <div className="text-4xl font-bold text-[#CCFF00]" style={{ fontFamily: "'Libre Caslon Display', serif" }}>{x.n}</div>
              <div className="mt-2 text-sm text-slate-600">{x.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 bg-[#CCFF00] text-center text-[#000000]">
        <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Libre Caslon Display', serif" }}>See how it fits your business</h2>
        <Link to="/register" className="mt-6 inline-flex items-center gap-2 px-7 py-4 rounded-lg bg-[#000000] text-white font-bold hover:bg-black transition">Start Free Trial <ArrowRight size={18} /></Link>
      </section>
    </MarketingShell>
  );
}