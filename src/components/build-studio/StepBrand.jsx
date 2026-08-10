import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { Loader2, RefreshCw, Palette, Check } from 'lucide-react';
import ColorControl from './ColorControl';
import { BG_COLOR_PRESETS, FONT_COLOR_PRESETS, ACCENT_COLOR_PRESETS } from './options';

export default function StepBrand({ form, update, next, back }) {
  const [generating, setGenerating] = useState(false);
  const [kitGenerating, setKitGenerating] = useState(false);
  const [error, setError] = useState('');
  const [options, setOptions] = useState([]);
  const [kit, setKit] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [bgOverride, setBgOverride] = useState('');
  const [fontOverride, setFontOverride] = useState('');
  const [accentOverride, setAccentOverride] = useState('');

  const generate = async () => {
    setGenerating(true);
    setError('');
    setOptions([]);
    setKit(null);
    setSelectedIdx(null);
    try {
      const res = await base44.functions.invoke('generateBrandAssets', {
        type: 'brand',
        business_name: form.business_name,
        domain: form.domain,
        industry: form.industry,
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

  const generateKit = async (opt) => {
    setKitGenerating(true);
    setError('');
    setKit(null);
    try {
      const res = await base44.functions.invoke('generateBrandAssets', {
        type: 'full_kit',
        business_name: form.business_name,
        domain: form.domain,
        industry: form.industry,
        brand_concept: opt,
        accent_color: accentOverride || opt.accent_color,
        background_color: bgOverride || opt.bg_color || '#ffffff',
        font_color: fontOverride || opt.font_color || opt.primary_color || '#0a0a0a',
      });
      const data = res.data || res;
      if (data.error) { setError(data.error); setKitGenerating(false); return; }
      setKit(data.kit || []);
      update('logo_url', opt.logo_url || '');
      update('primary_color', opt.primary_color || '');
      update('secondary_color', opt.secondary_color || '');
      update('accent_color', accentOverride || opt.accent_color || '');
      update('bg_color', bgOverride || opt.bg_color || '#ffffff');
      update('font_color', fontOverride || opt.font_color || opt.primary_color || '#0a0a0a');
      update('font_heading', opt.font_heading || '');
      update('font_body', opt.font_body || '');
      update('tagline', opt.tagline || '');
      update('brand_kit', data.kit || []);
    } catch (e) {
      setError(e.message || 'Kit generation failed');
    } finally {
      setKitGenerating(false);
    }
  };

  const selectOption = (i) => setSelectedIdx(i);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Color Controls — Background, Font, Accent */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Palette size={18} style={{ color: '#C89B3C' }} />
          <b style={{ fontSize: 13 }}>Brand Colors</b>
          <span style={{ fontSize: 11, color: '#999' }}>· Override any color — applies to the full kit & generated site (light/dark mode auto-derived)</span>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <ColorControl label="Background Color" presets={BG_COLOR_PRESETS} value={bgOverride} onChange={setBgOverride} />
          <ColorControl label="Font / Text Color" presets={FONT_COLOR_PRESETS} value={fontOverride} onChange={setFontOverride} />
          <ColorControl label="Accent Color" presets={ACCENT_COLOR_PRESETS} value={accentOverride} onChange={setAccentOverride} />
        </div>
      </div>

      {/* Generate button + info */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Full Brand Kit Generator</h3>
            <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
              Building for <b>{form.business_name}</b> · {form.domain} · {form.industry || 'General'}
            </p>
          </div>
          <button onClick={generate} disabled={generating} style={{
            background: '#0a0a0a', color: '#fff', border: 0, borderRadius: 6,
            padding: '11px 20px', fontSize: 13, fontWeight: 700, cursor: generating ? 'wait' : 'pointer',
            fontFamily: 'inherit', opacity: generating ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {generating ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {generating ? 'Generating 10 brand kits…' : options.length > 0 ? 'Regenerate' : 'Generate 10 Brand Kits'}
          </button>
        </div>
        <p style={{ fontSize: 12, color: '#888', margin: '10px 0 0' }}>
          30 production-ready assets across 5 categories: logo system (9), digital incl. dark mode (10), print (6), merchandise (5), and guidelines (2).
        </p>
        {error && <p style={{ color: '#a52d23', fontSize: 13, marginTop: 10 }}>{error}</p>}
      </div>

      {/* 10 Brand Options */}
      {options.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14, marginBottom: 16 }}>
          {options.map((opt, i) => {
            const isSelected = selectedIdx === i;
            const showBg = isSelected && bgOverride;
            const showFont = isSelected && fontOverride;
            const showAccent = isSelected && accentOverride;
            return (
              <div key={i} style={{
                border: `2px solid ${isSelected ? '#C89B3C' : '#ddd'}`, borderRadius: 10,
                background: isSelected ? '#C89B3C08' : '#fff', overflow: 'hidden',
              }}>
                <button onClick={() => selectOption(i)} style={{
                  width: '100%', border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: 0,
                }}>
                  {opt.logo_url && (
                    <div style={{ height: 130, background: showBg ? bgOverride : (opt.bg_color || '#f8f7f4'), display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
                      <Image src={opt.logo_url} alt={opt.name} fittingType="fit" className="w-full h-full" />
                    </div>
                  )}
                  <div style={{ padding: 14 }}>
                    <b style={{ fontSize: 14, fontFamily: "'Libre Caslon Display', serif" }}>{opt.name}</b>
                    <p style={{ fontSize: 12, color: '#C89B3C', fontWeight: 600, margin: '2px 0 6px' }}>"{opt.tagline}"</p>
                    <p style={{ fontSize: 12, color: '#666', margin: '0 0 8px', lineHeight: 1.4 }}>{opt.positioning}</p>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                      <div title="Background" style={{ width: 24, height: 24, borderRadius: 5, background: showBg ? bgOverride : (opt.bg_color || '#ffffff'), border: '1px solid #ddd' }} />
                      <div title="Font" style={{ width: 24, height: 24, borderRadius: 5, background: showFont ? fontOverride : (opt.font_color || opt.primary_color || '#0a0a0a'), border: '1px solid #ddd' }} />
                      <div title="Accent" style={{ width: 24, height: 24, borderRadius: 5, background: showAccent ? accentOverride : opt.accent_color, border: '1px solid #ddd' }} />
                      {(showBg || showFont || showAccent) && <span style={{ fontSize: 10, color: '#C89B3C', fontWeight: 700 }}>colors overridden</span>}
                    </div>
                    <p style={{ fontSize: 10, color: '#888', margin: 0 }}>{opt.font_heading} + {opt.font_body}</p>
                    {isSelected && <p style={{ fontSize: 11, color: '#C89B3C', fontWeight: 700, margin: '6px 0 0' }}>✓ Selected — click "Generate Full Kit" below</p>}
                  </div>
                </button>
                {isSelected && (
                  <div style={{ padding: '0 14px 14px' }}>
                    <button onClick={() => generateKit(opt)} disabled={kitGenerating} style={{
                      width: '100%', background: kitGenerating ? '#666' : 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111',
                      border: 0, borderRadius: 6, padding: '10px', fontSize: 13, fontWeight: 700, cursor: kitGenerating ? 'wait' : 'pointer',
                      fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                      {kitGenerating ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                      {kitGenerating ? 'Generating full kit…' : 'Generate Full Brand Kit'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Full Kit Results — organized by category */}
      {kit && kit.length > 0 && (() => {
        const categories = [...new Set(kit.map(k => k.category || 'Other'))];
        return (
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 16 }}>
            <h4 style={{ fontSize: 15, margin: '0 0 4px' }}>Complete Brand Kit — {form.business_name}</h4>
            <p style={{ fontSize: 12, color: '#888', margin: '0 0 18px' }}>{kit.length} production-ready assets · {categories.length} categories</p>
            {categories.map(cat => (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 4, height: 18, borderRadius: 2, background: '#C89B3C' }} />
                  <b style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.06em', color: '#555' }}>{cat}</b>
                  <span style={{ fontSize: 11, color: '#bbb' }}>· {kit.filter(k => (k.category || 'Other') === cat).length} items</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {kit.filter(k => (k.category || 'Other') === cat).map((item, i) => (
                    <div key={i} style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ height: 150, background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                        {item.image_url ? (
                          <Image src={item.image_url} alt={item.label} fittingType="fit" className="w-full h-full" />
                        ) : (
                          <span style={{ fontSize: 12, color: '#999' }}>Failed</span>
                        )}
                      </div>
                      <div style={{ padding: '8px 10px' }}>
                        <b style={{ fontSize: 11 }}>{item.label}</b>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Selected brand summary */}
      {form.logo_url && (
        <div style={{ background: '#f0f9f3', border: '1px solid #c8e6d0', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={form.logo_url} alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4, background: '#fff' }} />
          <div>
            <b>Brand selected</b>
            {form.tagline && <p style={{ fontSize: 11, color: '#888', margin: '2px 0 0' }}>"{form.tagline}"</p>}
          </div>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <div title="Background" style={{ width: 24, height: 24, borderRadius: 5, background: form.bg_color, border: '1px solid #ddd' }} />
            <div title="Font" style={{ width: 24, height: 24, borderRadius: 5, background: form.font_color, border: '1px solid #ddd' }} />
            <div title="Accent" style={{ width: 24, height: 24, borderRadius: 5, background: form.accent_color, border: '1px solid #ddd' }} />
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