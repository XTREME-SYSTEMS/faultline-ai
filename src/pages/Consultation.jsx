import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layout, Globe, Smartphone, Activity, ShieldCheck, Sparkles,
  Check, ArrowRight, ArrowLeft, Calendar, Loader2
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import '@/components/fl/consultation.css';

const LOGO_LIGHT = 'https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633/ed45981bc_logo-light.png';

const SERVICES = [
  { slug: 'ai_tools', label: 'AI Tools Store', desc: 'Browse & buy downloadable AI tools for your floor business.', icon: Layout },
  { slug: 'website', label: 'Custom Website', desc: 'A high-converting, AI-built website for your business.', icon: Globe },
  { slug: 'app', label: 'Custom App', desc: 'AI app creation tailored to your operations.', icon: Smartphone },
  { slug: 'audit', label: 'AI Audit', desc: 'Full diagnostic audit of your systems & site.', icon: Activity },
  { slug: 'security', label: 'AI Security', desc: 'Security assessment & hardening plan.', icon: ShieldCheck },
  { slug: 'consulting', label: 'AI Consulting', desc: 'Strategy & growth consultation call.', icon: Sparkles },
];

const INDUSTRIES = [
  { slug: 'epoxy', label: 'Epoxy Flooring' },
  { slug: 'polished_concrete', label: 'Polished Concrete' },
  { slug: 'decorative_concrete', label: 'Decorative Concrete' },
  { slug: 'other', label: 'Other Contractor' },
];

const SLOTS = ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM'];
const STEP_LABELS = ['Service', 'Details', 'Schedule'];

const todayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

export default function Consultation() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [service, setService] = useState('');
  const [industry, setIndustry] = useState('epoxy');
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '' });
  const [date, setDate] = useState(todayStr());
  const [slot, setSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const canNext1 = !!service;
  const canNext2 = form.name.trim() && /\S+@\S+\.\S+/.test(form.email) && form.company.trim();
  const canSubmit = canNext1 && canNext2 && date && slot;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await base44.entities.StrategyCallRequest.create({
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
        phone: form.phone.trim(),
        service,
        industry,
        preferred_date: date,
        preferred_time: slot,
        notes: notes.trim() || undefined,
        status: 'new',
        source: 'consultation',
      });
      setDone(true);
    } catch (e) {
      setError('Something went wrong submitting your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const serviceLabel = SERVICES.find(s => s.slug === service)?.label || '';
  const industryLabel = INDUSTRIES.find(i => i.slug === industry)?.label || '';

  return (
    <div className="xa-consult">
      <header className="xa-top">
        <div className="xa-wrap">
          <Link to="/"><img src={LOGO_LIGHT} alt="Xtreme AI Systems" /></Link>
          <Link to="/" className="xa-back"><ArrowLeft size={16} /> Back to site</Link>
        </div>
      </header>

      <section className="xa-hero">
        <div className="xa-wrap">
          <p className="xa-eyebrow">AI Consultation</p>
          <h1>Book Your <span>AI Consultation.</span></h1>
          <p>Tell us what you need and pick a time. We'll build the right AI tools, website, or app for your floor business — built by Xtreme AI Systems.</p>
        </div>
      </section>

      <main className="xa-wrap">
        <div className="xa-card">
          {done ? (
            <div className="xa-success">
              <div className="xa-check"><Check size={36} /></div>
              <h2>You're booked.</h2>
              <p>Thanks, {form.name.split(' ')[0]}. We've received your request and will confirm your consultation by email shortly.</p>
              <div className="xa-summary">
                <div><span>Service</span><b>{serviceLabel}</b></div>
                <div><span>Industry</span><b>{industryLabel}</b></div>
                <div><span>Date</span><b>{date}</b></div>
                <div><span>Time (ET)</span><b>{slot}</b></div>
                <div><span>Email</span><b>{form.email}</b></div>
              </div>
              <Link to="/" className="xa-btn xa-btn--gold">Back to Home <ArrowRight size={16} /></Link>
            </div>
          ) : (
            <>
              <div className="xa-steps-bar">
                {STEP_LABELS.map((label, i) => {
                  const n = i + 1;
                  const active = step === n;
                  const doneStep = step > n;
                  return (
                    <div key={label} style={{ display: 'contents' }}>
                      <div className={`xa-step-dot ${active ? 'active' : ''} ${doneStep ? 'done' : ''}`}>
                        <span>{doneStep ? <Check size={16} /> : n}</span>
                        <small>{label}</small>
                      </div>
                      {i < STEP_LABELS.length - 1 && <div className={`xa-step-line ${step > n ? 'on' : ''}`} />}
                    </div>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                    <h2>What do you need?</h2>
                    <p className="lead">Choose a service for your consultation.</p>
                    <div className="xa-service-grid">
                      {SERVICES.map(s => {
                        const I = s.icon;
                        return (
                          <button key={s.slug} type="button" className={`xa-service ${service === s.slug ? 'selected' : ''}`} onClick={() => setService(s.slug)}>
                            <div className="xa-ico"><I size={22} /></div>
                            <h3>{s.label}</h3>
                            <p>{s.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                    <div className="xa-field" style={{ marginTop: 22 }}>
                      <label>Your industry</label>
                      <select value={industry} onChange={e => setIndustry(e.target.value)}>
                        {INDUSTRIES.map(i => <option key={i.slug} value={i.slug}>{i.label}</option>)}
                      </select>
                    </div>
                    <div className="xa-actions">
                      <button type="button" className="xa-btn xa-btn--gold" disabled={!canNext1} onClick={() => setStep(2)}>Continue <ArrowRight size={16} /></button>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                    <h2>Your details</h2>
                    <p className="lead">So we can reach you to confirm the call.</p>
                    <div className="xa-row">
                      <div className="xa-field"><label>Full name *</label><input value={form.name} onChange={set('name')} autoComplete="name" /></div>
                      <div className="xa-field"><label>Work email *</label><input type="email" value={form.email} onChange={set('email')} autoComplete="email" /></div>
                    </div>
                    <div className="xa-row">
                      <div className="xa-field"><label>Company *</label><input value={form.company} onChange={set('company')} autoComplete="organization" /></div>
                      <div className="xa-field"><label>Phone</label><input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" /></div>
                    </div>
                    <div className="xa-field"><label>Anything else? (optional)</label><textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Tell us about your goals…" /></div>
                    <div className="xa-actions">
                      <button type="button" className="xa-btn xa-btn--ghost" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button>
                      <button type="button" className="xa-btn xa-btn--gold" disabled={!canNext2} onClick={() => setStep(3)}>Continue <ArrowRight size={16} /></button>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                    <h2>Pick a time</h2>
                    <p className="lead">Choose a date and a time slot (Eastern Time).</p>
                    <div className="xa-field">
                      <label><Calendar size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Preferred date</label>
                      <input type="date" value={date} min={todayStr()} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div className="xa-field">
                      <label>Time slot</label>
                      <div className="xa-slots">
                        {SLOTS.map(t => (
                          <button key={t} type="button" className={`xa-slot ${slot === t ? 'selected' : ''}`} onClick={() => setSlot(t)}>{t}</button>
                        ))}
                      </div>
                      <p className="xa-tz">All times are US Eastern. We'll confirm the exact time by email.</p>
                    </div>
                    <div className="xa-actions">
                      <button type="button" className="xa-btn xa-btn--ghost" onClick={() => setStep(2)}><ArrowLeft size={16} /> Back</button>
                      <button type="button" className="xa-btn xa-btn--gold" disabled={!canSubmit || submitting} onClick={submit}>
                        {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : <>Confirm Booking <ArrowRight size={16} /></>}
                      </button>
                    </div>
                    {error && <div className="xa-err">{error}</div>}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </main>
    </div>
  );
}