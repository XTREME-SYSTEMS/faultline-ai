import { useState } from 'react';
import { StepShell, Field, StepNav } from './StepShell';

// ─── STEP 5: CONTENT REVIEW ─────────────────────────────────────────
export function StepContentReview({ onboarding, saving, onComplete, onBack }) {
  const [content, setContent] = useState({
    hero_headline: onboarding?.hero_headline || '',
    about_text: onboarding?.about_text || '',
    services_list: onboarding?.services_list || '',
    cta_text: onboarding?.cta_text || 'Get a Free Quote',
  });

  const set = (k, v) => setContent(prev => ({ ...prev, [k]: v }));
  const brandColor = onboarding?.selected_brand_pack?.colors?.primary || onboarding?.brand_color || '#C89B3C';
  const headingFont = onboarding?.selected_brand_pack?.fonts?.heading || 'serif';
  const bodyFont = onboarding?.selected_brand_pack?.fonts?.body || 'sans-serif';

  return (
    <StepShell title="Review Your Website Content" subtitle="We drafted copy from your questionnaire answers. Edit anything you'd like — this is what goes on your website.">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, maxWidth: 900 }}>
        {/* Left: editable fields */}
        <div style={{ display: 'grid', gap: 18 }}>
          <Field label="Hero Headline">
            <input className="fl-input" value={content.hero_headline} onChange={e => set('hero_headline', e.target.value)} placeholder="Transform Your Garage with Premium Epoxy" />
          </Field>
          <Field label="About Section">
            <textarea className="fl-input" value={content.about_text} onChange={e => set('about_text', e.target.value)} placeholder="2-3 sentences about your business..." rows={4} />
          </Field>
          <Field label="Services (comma-separated)">
            <textarea className="fl-input" value={content.services_list} onChange={e => set('services_list', e.target.value)} placeholder="Garage Floor Epoxy, Metallic Epoxy..." rows={3} />
          </Field>
          <Field label="Call-to-Action Button Text">
            <input className="fl-input" value={content.cta_text} onChange={e => set('cta_text', e.target.value)} placeholder="Get a Free Quote" />
          </Field>
        </div>

        {/* Right: live preview with brand fonts + colors */}
        <div>
          <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e1da', position: 'sticky', top: 20 }}>
            <div style={{ padding: '6px 12px', background: '#f0ede7', fontSize: 10, color: '#888', fontWeight: 600 }}>LIVE PREVIEW</div>
            <div style={{ padding: 28, background: '#fff', textAlign: 'center' }}>
              <h2 style={{ fontFamily: `'${headingFont}', serif`, fontSize: 26, margin: '0 0 10px', color: brandColor }}>
                {content.hero_headline || 'Your headline here'}
              </h2>
              <p style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: 13, color: '#666', lineHeight: 1.6, margin: '0 0 16px' }}>
                {content.about_text || 'Your about text here...'}
              </p>
              {content.services_list && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
                  {content.services_list.split(',').map((s, i) => (
                    <span key={i} style={{ fontSize: 11, padding: '4px 10px', background: '#f8f7f4', borderRadius: 4, border: '1px solid #e5e1da', color: '#555' }}>{s.trim()}</span>
                  ))}
                </div>
              )}
              <button style={{ padding: '10px 24px', borderRadius: 6, border: 0, background: brandColor, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'default', fontFamily: `'${bodyFont}', sans-serif` }}>
                {content.cta_text || 'Get a Free Quote'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={() => onComplete(content)} disabled={!content.hero_headline} saving={saving} nextLabel="Continue to Domain" />
    </StepShell>
  );
}