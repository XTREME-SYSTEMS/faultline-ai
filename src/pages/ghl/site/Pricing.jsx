import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import MarketingShell from '@/components/ghl/site/MarketingShell';

const PLANS = [
  { name: 'Starter', monthly: 97, annual: 97, blurb: 'Everything you need to start capturing and following up with leads.', features: ['Unlimited contacts','Unlimited users','2-way SMS & email','Funnel & website builder','Calendar & bookings','Reputation management'], cta: 'Start Starter' },
  { name: 'Pro', monthly: 297, annual: 247, blurb: 'For growing businesses that need automations and AI at scale.', features: ['Everything in Starter','AI Voice & inbound calls','Advanced automations','Workflow builder','A/B testing','Custom user roles','White-label branding'], cta: 'Start Pro', featured: true },
  { name: 'Enterprise', monthly: null, blurb: 'For multi-location operators and agencies managing many accounts.', features: ['Everything in Pro','Dedicated success manager','Custom integrations','SAML SSO','Priority support','Volume pricing','Onboarding & migration'], cta: 'Contact Sales' },
];

const FAQ = [
  { q: 'Is there a free trial?', a: 'Yes — every plan starts with a 14-day free trial. No credit card required.' },
  { q: 'Are contacts and users really unlimited?', a: 'Correct. We never tax you for growth — unlimited contacts and unlimited users on every plan.' },
  { q: 'Can I change plans later?', a: 'Absolutely. Upgrade or downgrade anytime; changes apply at the next billing cycle.' },
  { q: 'Do you offer annual billing?', a: 'Yes — switch to annual on the Pro plan to save on every month.' },
  { q: 'What about usage-based charges?', a: 'SMS, email, and AI Voice are usage-based. You only pay for what you send, at industry-leading rates.' },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  return (
    <MarketingShell>
      <section className="bg-[#0B1120] text-white py-20">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Pricing</span>
          <h1 className="mt-3 text-4xl md:text-6xl font-bold tracking-tight" style={{ fontFamily: "'Libre Caslon Display', serif" }}>Start with a FREE 14-day trial</h1>
          <p className="mt-4 text-lg text-slate-300">Unlimited contacts, unlimited users. Scale your business without a tax on growth.</p>
          <div className="mt-7 inline-flex items-center gap-1 p-1 rounded-lg bg-white/10">
            <button onClick={() => setAnnual(false)} className={`px-5 py-2 rounded-md text-sm font-bold transition ${!annual ? 'bg-emerald-500 text-[#0B1120]' : 'text-slate-300'}`}>Monthly</button>
            <button onClick={() => setAnnual(true)} className={`px-5 py-2 rounded-md text-sm font-bold transition ${annual ? 'bg-emerald-500 text-[#0B1120]' : 'text-slate-300'}`}>Save with annual</button>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-5 grid md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map(p => (
            <div key={p.name} className={`rounded-2xl p-7 flex flex-col border ${p.featured ? 'border-emerald-500 shadow-xl relative' : 'border-slate-200'}`}>
              {p.featured && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500 text-[#0B1120] text-xs font-bold uppercase tracking-wider">Most Popular</span>}
              <h3 className="text-xl font-bold">{p.name}</h3>
              <div className="mt-3 flex items-end gap-1">
                {p.monthly === null ? <span className="text-4xl font-bold" style={{ fontFamily: "'Libre Caslon Display', serif" }}>Custom</span> : <><span className="text-4xl font-bold" style={{ fontFamily: "'Libre Caslon Display', serif" }}>${annual ? p.annual : p.monthly}</span><span className="text-slate-500 mb-1">/mo</span></>}
              </div>
              <p className="mt-3 text-sm text-slate-600">{p.blurb}</p>
              <ul className="mt-5 space-y-2.5 flex-1">
                {p.features.map(f => <li key={f} className="flex items-start gap-2 text-sm text-slate-700"><Check className="text-emerald-500 mt-0.5 shrink-0" size={17} /> {f}</li>)}
              </ul>
              <Link to={p.monthly === null ? '/lgny/about' : '/register'} className={`mt-6 px-5 py-3 rounded-lg font-bold text-center transition ${p.featured ? 'bg-emerald-500 text-[#0B1120] hover:bg-emerald-400' : 'bg-[#0B1120] text-white hover:bg-black'}`}>{p.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-5">
          <h2 className="text-3xl font-bold text-center tracking-tight" style={{ fontFamily: "'Libre Caslon Display', serif" }}>Frequently asked questions</h2>
          <div className="mt-8 space-y-4">
            {FAQ.map(f => (
              <div key={f.q} className="p-5 rounded-xl bg-white border border-slate-200">
                <b className="block text-sm">{f.q}</b>
                <p className="mt-1.5 text-sm text-slate-600">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}