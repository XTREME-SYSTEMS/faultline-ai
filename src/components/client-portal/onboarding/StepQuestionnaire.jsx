import { useState } from 'react';
import { StepShell, Field, StepNav } from './StepShell';

// ─── STEP 1: DISCOVERY QUESTIONNAIRE ─────────────────────────────────
export function StepQuestionnaire({ onboarding, saving, onComplete, onBack }) {
  const [form, setForm] = useState({
    business_name: onboarding?.business_name || '',
    industry: onboarding?.industry || 'Epoxy Flooring',
    service_area: onboarding?.service_area || '',
    primary_service: onboarding?.primary_service || 'Epoxy Flooring',
    phone: onboarding?.phone || '',
    email: onboarding?.email || '',
    years_in_business: onboarding?.questionnaire_answers?.years_in_business || '',
    target_customer: onboarding?.questionnaire_answers?.target_customer || '',
    style_preference: onboarding?.questionnaire_answers?.style_preference || 'modern',
    color_preference: onboarding?.questionnaire_answers?.color_preference || 'warm',
    differentiator: onboarding?.questionnaire_answers?.differentiator || '',
    competitor_urls: onboarding?.questionnaire_answers?.competitor_urls || '',
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const valid = form.business_name && form.service_area && form.phone && form.style_preference && form.color_preference;

  const styleOptions = [
    { value: 'modern', label: 'Modern', desc: 'Clean lines, minimalist' },
    { value: 'classic', label: 'Classic', desc: 'Timeless, elegant' },
    { value: 'bold', label: 'Bold', desc: 'Strong, high-impact' },
    { value: 'industrial', label: 'Industrial', desc: 'Raw, rugged' },
    { value: 'premium', label: 'Premium', desc: 'Luxury, refined' },
  ];

  const colorOptions = [
    { value: 'warm', label: 'Warm', desc: 'Gold, amber, bronze', swatches: ['#C89B3C', '#B8860B', '#D4A017'] },
    { value: 'cool', label: 'Cool', desc: 'Blue, teal, slate', swatches: ['#1a56DB', '#0EA5E9', '#475569'] },
    { value: 'neutral', label: 'Neutral', desc: 'Black, gray, white', swatches: ['#111111', '#475569', '#9CA3AF'] },
    { value: 'vibrant', label: 'Vibrant', desc: 'Red, orange, green', swatches: ['#DC2626', '#EA580C', '#059669'] },
    { value: 'trust', label: 'Trust', desc: 'Blue, green', swatches: ['#1a56DB', '#059669', '#0D9488'] },
  ];

  return (
    <StepShell title="Discovery Questionnaire" subtitle="Answer these questions and our AI will generate custom logo packs, brand packs, and web pack recommendations tailored to your business.">
      <div style={{ display: 'grid', gap: 18, maxWidth: 560 }}>
        {/* Business basics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Business Name *">
            <input className="fl-input" value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="Apex Epoxy Floors" />
          </Field>
          <Field label="Service Area *">
            <input className="fl-input" value={form.service_area} onChange={e => set('service_area', e.target.value)} placeholder="Los Angeles, CA" />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Primary Service">
            <select className="fl-input" value={form.primary_service} onChange={e => set('primary_service', e.target.value)}>
              {['Epoxy Flooring', 'Concrete Coatings', 'Garage Floor Epoxy', 'Metallic Epoxy', 'Commercial Epoxy', 'Polished Concrete'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Years in Business">
            <select className="fl-input" value={form.years_in_business} onChange={e => set('years_in_business', e.target.value)}>
              {['', 'Just starting', '1-3 years', '3-5 years', '5-10 years', '10+ years'].map(s => <option key={s} value={s}>{s || 'Select...'}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Phone *">
            <input className="fl-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 123-4567" />
          </Field>
          <Field label="Email">
            <input className="fl-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@business.com" />
          </Field>
        </div>

        <Field label="Target Customer">
          <select className="fl-input" value={form.target_customer} onChange={e => set('target_customer', e.target.value)}>
            {['', 'Homeowners (residential)', 'Businesses (commercial)', 'Both residential & commercial', 'Contractors & builders'].map(s => <option key={s} value={s}>{s || 'Select...'}</option>)}
          </select>
        </Field>

        {/* Style preference — visual cards */}
        <Field label="Style Preference *">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {styleOptions.map(s => (
              <button key={s.value} onClick={() => set('style_preference', s.value)} style={{
                padding: '12px 8px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                border: `2px solid ${form.style_preference === s.value ? '#C89B3C' : '#e5e1da'}`,
                background: form.style_preference === s.value ? '#C89B3C10' : '#fff',
                textAlign: 'center', transition: 'all .15s',
              }}>
                <b style={{ fontSize: 12, display: 'block', color: form.style_preference === s.value ? '#8A641C' : '#333' }}>{s.label}</b>
                <span style={{ fontSize: 9, color: '#999' }}>{s.desc}</span>
              </button>
            ))}
          </div>
        </Field>

        {/* Color preference — visual cards with swatches */}
        <Field label="Color Preference *">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {colorOptions.map(c => (
              <button key={c.value} onClick={() => set('color_preference', c.value)} style={{
                padding: '10px 8px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                border: `2px solid ${form.color_preference === c.value ? '#C89B3C' : '#e5e1da'}`,
                background: form.color_preference === c.value ? '#C89B3C10' : '#fff',
                textAlign: 'center', transition: 'all .15s',
              }}>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginBottom: 5 }}>
                  {c.swatches.map(s => <div key={s} style={{ width: 12, height: 12, borderRadius: '50%', background: s }} />)}
                </div>
                <b style={{ fontSize: 11, display: 'block', color: form.color_preference === c.value ? '#8A641C' : '#333' }}>{c.label}</b>
                <span style={{ fontSize: 8, color: '#999' }}>{c.desc}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="What Makes You Different?" hint="Your unique selling point — what sets you apart from competitors?">
          <textarea className="fl-input" value={form.differentiator} onChange={e => set('differentiator', e.target.value)} placeholder="e.g., 15-year warranty, same-day installation, eco-friendly materials..." rows={2} />
        </Field>

        <Field label="Competitor Websites (optional)" hint="Paste URLs of competitors you admire — we'll analyze their style">
          <textarea className="fl-input" value={form.competitor_urls} onChange={e => set('competitor_urls', e.target.value)} placeholder="https://competitor1.com, https://competitor2.com" rows={2} />
        </Field>
      </div>

      <StepNav
        onBack={onBack}
        onNext={() => onComplete({
          business_name: form.business_name,
          industry: form.industry,
          service_area: form.service_area,
          primary_service: form.primary_service,
          phone: form.phone,
          email: form.email,
          questionnaire_answers: {
            years_in_business: form.years_in_business,
            target_customer: form.target_customer,
            style_preference: form.style_preference,
            color_preference: form.color_preference,
            differentiator: form.differentiator,
            competitor_urls: form.competitor_urls,
          },
        })}
        disabled={!valid}
        saving={saving}
        nextLabel="Generate My Packs →"
      />
    </StepShell>
  );
}