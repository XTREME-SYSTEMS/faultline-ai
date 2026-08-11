import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import MarketingShell from '@/components/ghl/site/MarketingShell';

const STATS = [
  { v: '7,000,000+', l: 'AI VOICE CALLS' },
  { v: '7,300,000,000', l: 'LEADS GENERATED' },
  { v: '179,000,000', l: 'APPOINTMENTS BOOKED' },
  { v: '$5,200,000,000+', l: 'SALES FACILITATED IN 2025' },
];

const AWARDS = [
  'https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633/1bfce2c1b_clone-img-msnzvexg-rjn6ux.webp',
  'https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633/a295c9c23_clone-img-msnzvexg-nhau9p.webp',
  'https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633/21d8fe8c6_clone-img-msnzvexg-mzgqxv.webp',
  'https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633/673920949_clone-img-msnzvexf-xrttd3.webp',
  'https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633/1657223aa_clone-img-msnzvexg-wjp41q.webp',
  'https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633/1875786f1_clone-img-msnzvexg-rw3fs3.webp',
  'https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633/6402920c0_clone-img-msnzvexh-mkqdb6.webp',
  'https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633/89fe1c24d_clone-img-msnzvexh-xfiq2n.webp',
  'https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633/25dbf8ccd_clone-img-msnzvexh-liqi5b.webp',
];

const TABS = [
  {
    id: 'tab-1', label: 'Capture', icon: 'https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/knES3eSWYIsc5YSZ3YLl/media/698b87481fe16693aa64d616.svg',
    h: 'Get more leads in the door', p: 'Attract the right people, turn interest into leads and keep your pipeline full.',
    items: ['CRM','Voice AI','Forms, Surveys & Quizzes','Websites, Funnels & Landing Pages','Webinar Funnels','Chat Widget / Conversation AI','Call Tracking','Inbound SMS & Social DMs','Social Planner','Missed Call Text-Back','AI Biz Card Scanner','QR Codes','Prospecting Tool','Ad Manager (Google/FB/Insta Ads)'],
  },
  {
    id: 'tab-2', label: 'Nurture', icon: 'https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/knES3eSWYIsc5YSZ3YLl/media/698e48a83f860bd7cfae5ee6.svg',
    h: 'Build relationships that convert', p: 'The tools you need to follow up, stay relevant and build trust.',
    items: ['Conversation AI','Consolidated conversation stream (SMS, Messenger, Instagram DM, Whatsapp, Livechat)','Sales Pipelines','Workflows & Automations','Calendars','Text Snippets','Appointment Reminders','Ringless Voicemail','Mobile App (with video messages)','Automated Outbound Call Connect'],
  },
  {
    id: 'tab-3', label: 'Close', icon: 'https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/knES3eSWYIsc5YSZ3YLl/media/698e48fa00076175e9eaa151.svg',
    h: 'Close deals with less back-and-forth', p: 'Remove friction and turn conversations into paying customers.',
    items: ['Lead Scoring','Estimate & Proposals','Invoicing','Payment Integrations','Paid Calendars','Order Forms / Upsells / Downsells','Membership Offers / Courses (paid content access)','One-click Upsell Funnels','Text-2-Pay','Tap-2-Pay','Gift Cards','Loyalty programs'],
  },
  {
    id: 'tab-4', label: 'Evangelize', icon: 'https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/knES3eSWYIsc5YSZ3YLl/media/698e49ab008498ae0ea9ba20.svg',
    h: 'Create fans, not just customers', p: 'Everything you need to turn happy customers into reviews, referrals and buzz.',
    items: ['Reputation Management','Automated Review Requests','Affiliate Manager (for referral tracking)','Website Review Widgets','Video Review Capture','Video Review Widgets','Workflow Automations for Recommendation Requests','AI Review Reply','Social Planner Auto-Review Posts','Communities','Loyalty Programs'],
  },
  {
    id: 'tab-5', label: 'Reactivate', icon: 'https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/knES3eSWYIsc5YSZ3YLl/media/698e4a0724813c5074ae5f66.svg',
    h: 'Get back on their radar', p: 'Re-engage past leads and customers with timely messages that drive repeat sales.',
    items: ['Broadcast Campaigns -  Email/SMS/Whatsapp/Messenger','Smart Lists / Segmentation','Automated Birthday Campaigns','Automated Seasonal Campaigns','Database Reactivation Templates','Newsletter Automation','Content AI','Loyalty Programs'],
  },
];

const PILLARS = [
  { t: 'All-in-one', d: 'A truly all-in-one platform built for operators, not just marketers' },
  { t: 'AI as the foundation', d: 'Deep AI integration across the full business lifecycle' },
  { t: 'Community-driven', d: 'A community-led ecosystem focused on execution and outcomes' },
];

const MOVEMENT = [
  { h: 'By Marketers, For Marketers', p: 'Lead Generation Near You was built and powered by marketers focused on the traditional issues marketing professionals face day to day. Once success was found, it was introduced to the market to help marketers face common challenges.' },
  { h: 'Community Driven Development', p: 'We are committed to helping the Marketing world. We\'ve built a community-driven Ideas Board where you can share and vote on ideas to help lead the direction of development.' },
  { h: 'Network With Other Successful Marketers', p: 'Connect with other ambitious agency owners, entrepreneurs and marketing professionals who are scaling successful businesses with our platform.' },
];

function TabBlock({ tab }) {
  const mid = Math.ceil(tab.items.length / 2);
  const left = tab.items.slice(0, mid);
  const right = tab.items.slice(mid);
  return (
    <div className="grid md:grid-cols-[auto_1fr] gap-8 items-center max-w-5xl mx-auto">
      <img src={tab.icon} alt={tab.label} className="w-28 h-28 mx-auto" />
      <div>
        <h3 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: "'Libre Caslon Display', serif" }}>{tab.h}</h3>
        <p className="mt-2 text-slate-600">{tab.p}</p>
        <div className="mt-5 grid sm:grid-cols-2 gap-x-8 gap-y-2">
          <ul>{left.map(x => <li key={x} className="flex items-start gap-2 text-sm text-slate-700 py-1"><Check className="text-emerald-500 mt-0.5 shrink-0" size={16} /> {x}</li>)}</ul>
          <ul>{right.map(x => <li key={x} className="flex items-start gap-2 text-sm text-slate-700 py-1"><Check className="text-emerald-500 mt-0.5 shrink-0" size={16} /> {x}</li>)}</ul>
        </div>
        <Link to="/register" className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-emerald-500 text-[#0B1120] font-bold text-sm hover:bg-emerald-400 transition">Start 14 Day Free Trial <ArrowRight size={16} /></Link>
      </div>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState(0);
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0B1120] text-white">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 75% 25%, rgba(16,185,129,.18), transparent 45%), radial-gradient(circle at 15% 80%, rgba(37,99,235,.15), transparent 40%)' }} />
        <div className="relative max-w-7xl mx-auto px-5 pt-20 pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-bold uppercase tracking-wider">⚡ Power up your business with AI</span>
            <h1 className="mt-5 text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight" style={{ fontFamily: "'Libre Caslon Display', serif" }}>The AI-powered business <span className="text-emerald-400">operating system</span></h1>
            <p className="mt-5 text-lg text-slate-300 max-w-xl">All the tools you need to capture, nurture and close new leads into bookings, sales, reviews and repeat customers!</p>
            <Link to="/register" className="mt-7 inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-emerald-500 text-[#0B1120] font-bold hover:bg-emerald-400 transition">Start 14 Day Free Trial <ArrowRight size={18} /></Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-2 shadow-2xl">
            <img src="https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633/0f2268e74_clone-img-msnzvexg-36ogmj.webp" alt="The AI-powered business operating system" className="rounded-xl w-full" />
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

      {/* Business + awards */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Libre Caslon Display', serif" }}>We're in the business of helping you grow your business</h2>
          <p className="mt-4 text-slate-600 text-lg">Lead Generation Near You is the AI-powered operating system powering the growth of businesses around the world.</p>
          <div className="mt-8 flex flex-wrap justify-center items-center gap-6">
            {AWARDS.map((src, i) => <img key={i} src={src} alt="Award" className="h-12 w-auto opacity-80" />)}
          </div>
        </div>
      </section>

      {/* All-in-one tabs */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Libre Caslon Display', serif" }}>Your all-in-one solution for business growth</h2>
            <p className="mt-3 text-slate-600">All the tools you need in one AI-powered platform</p>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2 border-b border-slate-200">
            {TABS.map((t, i) => (
              <button key={t.id} onClick={() => setTab(i)} className={`px-5 py-3 text-sm font-bold transition ${tab === i ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-800'}`}>{t.label}</button>
            ))}
          </div>
          <div className="mt-10"><TabBlock tab={TABS[tab]} /></div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-5 text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight max-w-3xl mx-auto" style={{ fontFamily: "'Libre Caslon Display', serif" }}>We exist to remove friction from growth and give business owners the systems they need to operate, scale and win</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {PILLARS.map(p => (
              <div key={p.t} className="text-center">
                <b className="block text-lg">{p.t}</b>
                <p className="mt-2 text-sm text-slate-600">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 bg-[#0B1120] text-white">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <img src="https://images.leadconnectorhq.com/image/f_webp/q_80/r_1200/u_https://assets.cdn.filesafe.space/knES3eSWYIsc5YSZ3YLl/media/698c9c4c2b3ea6f583d00189.svg" alt="Highly" className="h-8 mx-auto mb-5" />
          <img src="https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633/5e338ba45_clone-img-msnzvgcp-w1tgvn.webp" alt="Debbie DuBois" className="w-16 h-16 rounded-full mx-auto mb-3" />
          <b className="block">Debbie DuBois</b>
          <span className="text-xs text-slate-400">Compass Marketing Creative</span>
          <p className="mt-5 text-lg text-slate-200 max-w-2xl mx-auto">I felt completely supported as soon as I join the platform...These guys care about my business and have taken my business to the next level. The technology is continuing to shift and change while getting better and better. They are providing new services and things that I love.</p>
        </div>
      </section>

      {/* Join the movement */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Libre Caslon Display', serif" }}>Join the movement</h2>
            <p className="mt-3 text-slate-600">Our thriving community of the most successful and visionary digital marketers on the planet. Get all the training and resources you need to start or grow your business.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {MOVEMENT.map(m => (
              <div key={m.h} className="text-center">
                <b className="block text-lg">{m.h}</b>
                <p className="mt-2 text-sm text-slate-600">{m.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-5 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Libre Caslon Display', serif" }}>What's included with Lead Generation Near You</h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-6">
            <img src="https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633/5fb9e359e_clone-img-msnzvgcp-5yrpln.webp" alt="Pricing Plan" className="rounded-xl w-full" />
            <img src="https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633/c8dcca339_clone-img-msnzvgcq-dwdf87.webp" alt="Pricing Plan" className="rounded-xl w-full" />
          </div>
          <Link to="/register" className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-emerald-500 text-[#0B1120] font-bold hover:bg-emerald-400 transition">Start 14 Day Free Trial <ArrowRight size={18} /></Link>
        </div>
      </section>

      {/* On the go */}
      <section className="py-20 bg-[#0B1120] text-white">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Libre Caslon Display', serif" }}>Everything you need to grow your business; even on the go!</h2>
          <Link to="/register" className="mt-7 inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-emerald-500 text-[#0B1120] font-bold hover:bg-emerald-400 transition">Start 14 Day Free Trial <ArrowRight size={18} /></Link>
        </div>
      </section>
    </MarketingShell>
  );
}