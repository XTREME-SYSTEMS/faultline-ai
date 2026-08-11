import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, PenTool, RefreshCw, Check } from 'lucide-react';

export default function AICopywriter({ businessName, industry, onApply }) {
  const [generating, setGenerating] = useState(false);
  const [copy, setCopy] = useState(null);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);

  const generate = async () => {
    if (!businessName) { setError('Enter a business name first'); return; }
    setGenerating(true);
    setError('');
    setCopy(null);
    setApplied(false);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a senior copywriter for a ${industry || 'general'} business called "${businessName}".
Generate compelling website copy. Return JSON with:
- headline: a powerful hero headline (max 10 words)
- subheadline: a supporting subheadline (1-2 sentences)
- cta_text: a clear call-to-action button label (2-4 words)
- tagline: a memorable tagline for meta description (max 15 words)
- about_blurb: a 2-sentence about section
- feature_1_title, feature_1_desc, feature_2_title, feature_2_desc, feature_3_title, feature_3_desc: 3 key features with title + 1-sentence description

Make the copy professional, benefit-driven, and tailored to the ${industry || 'general'} industry. Avoid clichés.`,
        response_json_schema: {
          type: 'object',
          properties: {
            headline: { type: 'string' },
            subheadline: { type: 'string' },
            cta_text: { type: 'string' },
            tagline: { type: 'string' },
            about_blurb: { type: 'string' },
            feature_1_title: { type: 'string' },
            feature_1_desc: { type: 'string' },
            feature_2_title: { type: 'string' },
            feature_2_desc: { type: 'string' },
            feature_3_title: { type: 'string' },
            feature_3_desc: { type: 'string' },
          },
        },
      });
      setCopy(typeof res === 'object' ? res : JSON.parse(res));
    } catch (e) {
      setError(e.message || 'Copy generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const apply = () => {
    if (onApply) onApply(copy);
    setApplied(true);
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <PenTool size={18} style={{ color: '#C89B3C' }} />
        <b style={{ fontSize: 14 }}>AI Copywriter</b>
        <span style={{ fontSize: 11, color: '#999' }}>· Headlines, CTAs, features</span>
      </div>

      <button
        onClick={generate}
        disabled={generating || !businessName}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: generating ? '#666' : 'linear-gradient(135deg, #E7C86E, #C89B3C)',
          color: '#111', border: 0, borderRadius: 6, padding: '10px 20px',
          fontSize: 13, fontWeight: 700, cursor: (generating || !businessName) ? 'wait' : 'pointer',
          fontFamily: 'inherit', opacity: (!businessName || generating) ? 0.6 : 1, marginBottom: 14,
        }}
      >
        {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {generating ? 'Writing copy…' : copy ? 'Regenerate Copy' : 'Generate Copy'}
      </button>

      {error && <p style={{ color: '#a52d23', fontSize: 12, marginBottom: 10 }}>{error}</p>}

      {copy && (
        <div style={{ display: 'grid', gap: 10 }}>
          <CopyField label="Headline" value={copy.headline} />
          <CopyField label="Subheadline" value={copy.subheadline} />
          <CopyField label="CTA Button" value={copy.cta_text} />
          <CopyField label="Tagline (SEO)" value={copy.tagline} />
          <CopyField label="About Blurb" value={copy.about_blurb} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <CopyField label="Feature 1" value={`${copy.feature_1_title}\n${copy.feature_1_desc}`} />
            <CopyField label="Feature 2" value={`${copy.feature_2_title}\n${copy.feature_2_desc}`} />
            <CopyField label="Feature 3" value={`${copy.feature_3_title}\n${copy.feature_3_desc}`} />
          </div>
          <button
            onClick={apply}
            disabled={applied}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 4,
              background: applied ? '#237A4B' : '#0a0a0a', color: '#fff', border: 0, borderRadius: 6,
              padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: applied ? 'default' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {applied ? <Check size={14} /> : null}
            {applied ? 'Copy Applied to Template' : 'Apply Copy to Template'}
          </button>
        </div>
      )}
    </div>
  );
}

function CopyField({ label, value }) {
  return (
    <div style={{ padding: '10px 12px', background: '#f8f7f4', borderRadius: 6, border: '1px solid #eee' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#C89B3C', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#333', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{value || '—'}</div>
    </div>
  );
}