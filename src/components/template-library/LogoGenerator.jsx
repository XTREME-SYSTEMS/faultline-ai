import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { Loader2, Sparkles, Check, RefreshCw } from 'lucide-react';

const LOGO_STYLES = [
  { label: 'Minimalist', style: 'minimalist geometric mark, clean lines, flat vector style, centered on white' },
  { label: 'Monogram', style: 'modern monogram lettermark, bold sans-serif, negative space, premium feel' },
  { label: 'Emblem', style: 'elegant emblem badge, circular seal, refined serif, luxury heritage feel' },
  { label: 'Abstract', style: 'abstract organic shape, flowing gradient, contemporary tech startup aesthetic' },
  { label: 'Wordmark', style: 'bold wordmark typography logo, strong character, high contrast, corporate' },
  { label: 'Icon', style: 'playful mascot-inspired icon, friendly rounded forms, approachable and warm' },
];

export default function LogoGenerator({ businessName, industry, accentColor, onSelect }) {
  const [generating, setGenerating] = useState(false);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  const generate = async () => {
    if (!businessName) { setError('Enter a business name first'); return; }
    setGenerating(true);
    setError('');
    setOptions([]);
    try {
      const res = await base44.functions.invoke('generateBrandAssets', {
        type: 'logo',
        business_name: businessName,
        industry: industry || 'General',
      });
      const data = res.data || res;
      if (data.error) { setError(data.error); return; }
      setOptions(data.options || []);
    } catch (e) {
      setError(e.message || 'Logo generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const selectLogo = (opt) => {
    setSelected(opt.index);
    if (onSelect) onSelect(opt.image_url);
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Sparkles size={18} style={{ color: '#C89B3C' }} />
        <b style={{ fontSize: 14 }}>AI Logo Generator</b>
        <span style={{ fontSize: 11, color: '#999' }}>· 6 style variations</span>
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
        {generating ? 'Generating 6 logos…' : options.length > 0 ? 'Regenerate Logos' : 'Generate 6 Logos'}
      </button>

      {error && <p style={{ color: '#a52d23', fontSize: 12, marginBottom: 10 }}>{error}</p>}

      {options.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => selectLogo(opt)}
              style={{
                border: `2px solid ${selected === opt.index ? '#C89B3C' : '#eee'}`, borderRadius: 8,
                background: '#f8f7f4', padding: 10, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}
            >
              {opt.image_url ? (
                <Image src={opt.image_url} alt={opt.label} fittingType="fit" className="w-full" style={{ height: 80 }} />
              ) : (
                <div style={{ height: 80, display: 'grid', placeItems: 'center', color: '#999', fontSize: 11 }}>Failed</div>
              )}
              <span style={{ fontSize: 11, fontWeight: 600, color: '#555' }}>{opt.label}</span>
              {selected === opt.index && <Check size={14} style={{ color: '#237A4B' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}