import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { Loader2, RefreshCw } from 'lucide-react';

export default function StepBrand({ form, update, next, back }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [options, setOptions] = useState([]);

  const generate = async () => {
    setGenerating(true);
    setError('');
    setOptions([]);
    try {
      const res = await base44.functions.invoke('generateBrandAssets', {
        type: 'brand',
        business_name: form.business_name || undefined,
        industry: form.industry || undefined,
      });
      const data = res.data || res;
      if (data.error) { setError(data.error); setGenerating(false); return; }
      setOptions(data.options || []);
    } catch (e) {
      setError(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const pick = (opt) => {
    update('logo_url', opt.logo_url || '');
    update('primary_color', opt.primary_color || form.primary_color);
    update('secondary_color', opt.secondary_color || form.secondary_color);
    update('accent_color', opt.accent_color || '');
    update('font_heading', opt.font_heading || '');
    update('font_body', opt.font_body || '');
    update('tone', opt.voice ? opt.voice.toLowerCase().split(/[\s,]+/)[0] : form.tone);
    update('tagline', opt.tagline || '');
  };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Brand & Logo Generator</h3>
            <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
              Building for <b>{form.business_name}</b> · {form.industry || 'General'}
            </p>
          </div>
          <button onClick={generate} disabled={generating} style={{
            background: '#0a0a0a', color: '#fff', border: 0, borderRadius: 6,
            padding: '11px 20px', fontSize: 13, fontWeight: 700, cursor: generating ? 'wait' : 'pointer',
            fontFamily: 'inherit', opacity: generating ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {generating ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {generating ? 'Generating 6 brands…' : options.length > 0 ? 'Regenerate' : 'Generate 6 Brands'}
          </button>
        </div>
        {error && <p style={{ color: '#a52d23', fontSize: 13, marginTop: 10 }}>{error}</p>}
      </div>

      {options.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14, marginBottom: 16 }}>
          {options.map((opt, i) => {
            const selected = form.logo_url === opt.logo_url;
            return (
              <button key={i} onClick={() => pick(opt)} style={{
                border: `2px solid ${selected ? '#C89B3C' : '#ddd'}`, borderRadius: 10,
                background: selected ? '#C89B3C10' : '#fff', overflow: 'hidden',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: 0,
              }}>
                {opt.logo_url && (
                  <div style={{ height: 140, background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <Image src={opt.logo_url} alt={opt.name} fittingType="fit" className="w-full h-full" />
                  </div>
                )}
                <div style={{ padding: 14 }}>
                  <b style={{ fontSize: 14, fontFamily: "'Libre Caslon Display', serif" }}>{opt.name}</b>
                  <p style={{ fontSize: 12, color: '#C89B3C', fontWeight: 600, margin: '2px 0 6px' }}>"{opt.tagline}"</p>
                  <p style={{ fontSize: 12, color: '#666', margin: '0 0 8px', lineHeight: 1.4 }}>{opt.positioning}</p>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    {[opt.primary_color, opt.secondary_color, opt.accent_color].map((c, j) => (
                      <div key={j} title={c} style={{ width: 24, height: 24, borderRadius: 5, background: c, border: '1px solid #ddd' }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 10, color: '#888', margin: 0 }}>{opt.font_heading} + {opt.font_body}</p>
                  {selected && <p style={{ fontSize: 11, color: '#C89B3C', fontWeight: 700, margin: '6px 0 0' }}>✓ Selected</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {form.logo_url && (
        <div style={{ background: '#f0f9f3', border: '1px solid #c8e6d0', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={form.logo_url} alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4, background: '#fff' }} />
          <div>
            <b>Brand selected</b>
            {form.tagline && <p style={{ fontSize: 11, color: '#888', margin: '2px 0 0' }}>"{form.tagline}"</p>}
          </div>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <div style={{ width: 24, height: 24, borderRadius: 5, background: form.primary_color, border: '1px solid #ddd' }} />
            <div style={{ width: 24, height: 24, borderRadius: 5, background: form.secondary_color, border: '1px solid #ddd' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={back} style={{
          background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '14px 28px',
          fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#666',
        }}>← Back</button>
        <button onClick={next} style={{
          background: '#0a0a0a', color: '#fff', border: 0, borderRadius: 8, padding: '14px 40px',
          fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>Continue →</button>
      </div>
    </div>
  );
}