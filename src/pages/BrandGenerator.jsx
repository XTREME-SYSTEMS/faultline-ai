import { useState } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import AiFieldGenerator from '@/components/fl/AiFieldGenerator';

const TABS = [
  { id: 'logo', label: 'Logo Generator', icon: '🎨', desc: '6 logo variations in different styles' },
  { id: 'brand', label: 'Brand Generator', icon: '✨', desc: '6 complete brand identities with logos' },
  { id: 'image', label: 'Image Generator', icon: '📸', desc: '6 ultra-lifelike photorealistic images' }
];

export default function BrandGenerator() {
  const [tab, setTab] = useState('logo');
  const [form, setForm] = useState({ business_name: '', industry: '', prompt: '' });
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleAiApply = (field, value) => {
    if (field === 'prompt') update('prompt', value);
    else update(field, value);
  };

  const generate = async () => {
    setError('');
    const prompt = form.prompt || form.business_name;
    if (!prompt) { setError('Enter a business name or prompt'); return; }
    setGenerating(true);
    setResults(null);
    try {
      const res = await base44.functions.invoke('generateBrandAssets', {
        type: tab,
        prompt: form.prompt || undefined,
        business_name: form.business_name || undefined,
        industry: form.industry || undefined
      });
      if (res.data?.error) { setError(res.data.error); setGenerating(false); return; }
      setResults(res.data);
      setHistory(prev => [{ ...res.data, timestamp: Date.now() }, ...prev].slice(0, 5));
    } catch (e) {
      setError(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const currentTab = TABS.find(t => t.id === tab);
  const placeholder = tab === 'image'
    ? 'e.g. A luxury modern kitchen with marble countertops and gold fixtures'
    : tab === 'brand'
      ? 'e.g. A premium epoxy flooring company in Tampa'
      : 'e.g. Acme Epoxy Co.';

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">AI Creative Studio</p>
          <h1>Brand & Image Generator</h1>
          <p>Generate logos, complete brand identities, and ultra-lifelike images. Every run produces 6 distinct options to choose from.</p>
        </div>
      </div>

      {error && <div style={{ background: '#fde8e8', color: '#C63D34', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* Tab Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResults(null); }} style={{
            background: tab === t.id ? '#0F0F10' : '#fff', color: tab === t.id ? '#fff' : '#202124',
            border: `1px solid ${tab === t.id ? '#0F0F10' : '#C7CCD4'}`, borderRadius: 10, padding: 18,
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all .2s'
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{t.icon}</div>
            <b style={{ fontSize: 14, display: 'block' }}>{t.label}</b>
            <small style={{ fontSize: 11, opacity: .7, display: 'block', marginTop: 4 }}>{t.desc}</small>
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div style={{ background: '#fff', border: '1px solid #C7CCD4', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        {tab !== 'image' && (
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Business Name <AiFieldGenerator type="business_name" form={form} onApply={handleAiApply} /></span>
            <input value={form.business_name} onChange={e => update('business_name', e.target.value)} placeholder={placeholder} style={inputStyle} />
          </label>
        )}
        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {tab === 'image' ? 'Image Prompt' : 'Description / Prompt (optional)'}
            <AiFieldGenerator type="prompt" fieldLabel={tab === 'image' ? 'an image prompt' : tab === 'brand' ? 'a brand description' : 'a logo description'} form={form} onApply={handleAiApply} />
          </span>
          <textarea value={form.prompt} onChange={e => update('prompt', e.target.value)} placeholder={tab === 'image' ? placeholder : 'Describe the business, vibe, or what you want the logo/brand to convey'} style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} />
        </label>
        {tab !== 'image' && (
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Industry (optional) <AiFieldGenerator type="industry" form={form} onApply={handleAiApply} /></span>
            <input value={form.industry} onChange={e => update('industry', e.target.value)} placeholder="e.g. Construction, SaaS, Healthcare" style={inputStyle} />
          </label>
        )}
        <button onClick={generate} disabled={generating} style={{
          background: '#D4AF37', color: '#0F0F10', border: 0, borderRadius: 8, padding: '14px 32px',
          fontSize: 15, fontWeight: 700, cursor: generating ? 'wait' : 'pointer', fontFamily: 'inherit',
          opacity: generating ? 0.6 : 1, width: '100%'
        }}>
          {generating ? `⚡ Generating 6 ${currentTab.label.toLowerCase()} options…` : `⚡ Generate 6 Options`}
        </button>
        {generating && <p style={{ textAlign: 'center', color: '#73777F', fontSize: 12, marginTop: 10 }}>This takes 15-30 seconds — generating 6 variations in parallel.</p>}
      </div>

      {/* Results */}
      {results?.options && (
        <div style={{ background: '#fff', border: '1px solid #C7CCD4', borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontFamily: "'Libre Caslon Display', serif" }}>✓ 6 {currentTab.label.toLowerCase()} generated</h3>
            <span style={{ fontSize: 11, color: '#73777F' }}>{new Date().toLocaleString()}</span>
          </div>

          {tab === 'brand' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {results.options.map((opt, i) => (
                <div key={i} style={{ border: '1px solid #C7CCD4', borderRadius: 10, overflow: 'hidden' }}>
                  {opt.logo_url && (
                    <div style={{ height: 160, background: '#F8F9FB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                      <Image src={opt.logo_url} alt={opt.name} fittingType="fit" className="w-full h-full" />
                    </div>
                  )}
                  <div style={{ padding: 16 }}>
                    <b style={{ fontSize: 15, fontFamily: "'Libre Caslon Display', serif" }}>{opt.name}</b>
                    <p style={{ fontSize: 12, color: '#D4AF37', fontWeight: 600, margin: '2px 0 8px' }}>"{opt.tagline}"</p>
                    <p style={{ fontSize: 12, color: '#73777F', margin: '0 0 10px', lineHeight: 1.5 }}>{opt.positioning}</p>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      {[opt.primary_color, opt.secondary_color, opt.accent_color].map((c, j) => (
                        <div key={j} title={c} style={{ width: 28, height: 28, borderRadius: 6, background: c, border: '1px solid #ddd' }} />
                      ))}
                    </div>
                    <p style={{ fontSize: 11, color: '#73777F', margin: '0 0 4px' }}><b>Fonts:</b> {opt.font_heading} + {opt.font_body}</p>
                    <p style={{ fontSize: 11, color: '#73777F', margin: '0 0 4px' }}><b>Voice:</b> {opt.voice}</p>
                    <p style={{ fontSize: 11, color: '#73777F', margin: 0 }}><b>Personality:</b> {opt.personality?.join(', ')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {results.options.map((opt, i) => (
                <div key={i} style={{ border: '1px solid #C7CCD4', borderRadius: 10, overflow: 'hidden' }}>
                  {opt.image_url ? (
                    <Image src={opt.image_url} alt={opt.label} fittingType="fill" className="w-full h-48" />
                  ) : (
                    <div style={{ height: 192, background: '#F8F9FB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C63D34', fontSize: 12 }}>Failed to generate</div>
                  )}
                  <div style={{ padding: 12 }}>
                    <b style={{ fontSize: 13 }}>{opt.label}</b>
                    <p style={{ fontSize: 10, color: '#73777F', margin: '4px 0 0' }}>{opt.style}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 1 && !generating && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 14, marginBottom: 10 }}>Recent Generations</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {history.slice(1).map((h, i) => (
              <button key={i} onClick={() => setResults(h)} style={{
                padding: '8px 14px', background: '#fff', border: '1px solid #C7CCD4', borderRadius: 6,
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: '#202124'
              }}>{h.type} · {new Date(h.timestamp).toLocaleTimeString()}</button>
            ))}
          </div>
        </div>
      )}
    </PortalShell>
  );
}

const inputStyle = {
  padding: 12, border: '1px solid #C7CCD4', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', width: '100%'
};