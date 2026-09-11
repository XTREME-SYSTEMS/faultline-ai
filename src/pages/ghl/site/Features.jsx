import { Link } from 'react-router-dom';
import { ArrowRight, Users, Globe, Mail, Calendar, Bot, Star, MessageSquare, BarChart3, Phone } from 'lucide-react';
import MarketingShell from '@/components/ghl/site/MarketingShell';

const SECTIONS = [
  { icon: Users, tag: 'CRM', t: 'Capture & manage every lead', d: 'A full contact record for every prospect — with tags, custom fields, pipelines, and a complete activity timeline so nothing slips through.', img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1000&q=80' },
  { icon: Globe, tag: 'Funnels', t: 'Funnels & websites that convert', d: 'Drag-and-drop landing pages, full websites, and opt-in forms — built and published in minutes, no code required.', img: 'https://images.unsplash.com/photo-1467232007581-a68b07c332a6?auto=format&fit=crop&w=1000&q=80' },
  { icon: Mail, tag: 'Marketing', t: 'Email & SMS that nurture', d: 'Automated campaigns and broadcasts across email and text, with smart segmentation and a shared unified inbox.', img: 'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?auto=format&fit=crop&w=1000&q=80' },
  { icon: Calendar, tag: 'Bookings', t: 'Calendar & scheduling', d: 'Round-robin and class-based booking with automated reminders, rescheduling, and payments at the time of booking.', img: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=1000&q=80' },
  { icon: Bot, tag: 'Automation', t: 'AI-powered workflows', d: 'Trigger-based automations that follow up instantly, route leads, and even handle inbound calls with AI Voice.', img: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&w=1000&q=80' },
  { icon: Star, tag: 'Reputation', t: 'Reviews & reputation', d: 'Automatically request reviews from happy customers and manage your listings across Google and Facebook.', img: 'https://images.unsplash.com/photo-1554224155-6726b0148b8c?auto=format&fit=crop&w=1000&q=80' },
];

export default function Features() {
  return (
    <MarketingShell>
      <section className="bg-[#000000] text-white py-20">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <span className="text-[#FFE566] text-xs font-bold uppercase tracking-widest">Platform Features</span>
          <h1 className="mt-3 text-4xl md:text-6xl font-bold tracking-tight" style={{ fontFamily: "'Libre Caslon Display', serif" }}>One platform. Every tool you need.</h1>
          <p className="mt-5 text-lg text-slate-300">FaultLine AI brings CRM, funnels, marketing, bookings, and automations together — so you can run your whole business from a single login.</p>
          <Link to="/register" className="mt-7 inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#FFD700] text-[#000000] font-bold hover:bg-[#FFE566] transition">Start 14 Day Free Trial <ArrowRight size={18} /></Link>
        </div>
      </section>

      <div className="bg-white">
        {SECTIONS.map((s, i) => (
          <section key={s.t} className={`py-16 ${i % 2 ? 'bg-slate-50' : 'bg-white'}`}>
            <div className={`max-w-7xl mx-auto px-5 grid lg:grid-cols-2 gap-12 items-center ${i % 2 ? 'lg:flex-row-reverse' : ''}`}>
              <div className={i % 2 ? 'lg:order-2' : ''}>
                <span className="text-[#FFD700] text-xs font-bold uppercase tracking-widest">{s.tag}</span>
                <h2 className="mt-2 text-3xl font-bold tracking-tight" style={{ fontFamily: "'Libre Caslon Display', serif" }}>{s.t}</h2>
                <p className="mt-3 text-slate-600 text-lg">{s.d}</p>
              </div>
              <img src={s.img} alt={s.t} className={`rounded-2xl w-full ${i % 2 ? 'lg:order-1' : ''}`} />
            </div>
          </section>
        ))}
      </div>

      <section className="py-16 bg-[#FFD700] text-center text-[#000000]">
        <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: "'Libre Caslon Display', serif" }}>Ready to see it in action?</h2>
        <Link to="/register" className="mt-6 inline-flex items-center gap-2 px-7 py-4 rounded-lg bg-[#000000] text-white font-bold hover:bg-black transition">Start Free Trial <ArrowRight size={18} /></Link>
      </section>
    </MarketingShell>
  );
}