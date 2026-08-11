import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { Loader2, ImageIcon, Check, RefreshCw } from 'lucide-react';

const IMAGE_STYLES = [
  { label: 'Cinematic', style: 'cinematic lighting, golden hour, shallow depth of field, ultra-realistic, 8k, professional photography' },
  { label: 'Studio', style: 'studio softbox lighting, clean white background, product photography, hyper-detailed, sharp focus' },
  { label: 'Dramatic', style: 'dramatic moody lighting, dark background, rim light, editorial magazine style, photorealistic' },
  { label: 'Lifestyle', style: 'bright airy natural light, outdoor setting, lifestyle photography, vibrant colors, lifelike' },
  { label: 'Architectural', style: 'architectural interior lighting, wide angle, professional real estate photography, ultra-detailed' },
  { label: 'Macro', style: 'macro close-up, intricate detail, texture-rich, scientific precision, photorealistic 8k' },
];

export default function ImageGenerator({ industry, onSelect }) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  const generate = async () => {
    if (!prompt) { setError('Describe the image you want'); return; }
    setGenerating(true);
    setError('');
    setOptions([]);
    try {
      const res = await base44.functions.invoke('generateBrandAssets', {
        type: 'image',
        prompt: `${prompt}. Industry context: ${industry || 'general business'}`,
        industry: industry || 'General',
      });
      const data = res.data || res;
      if (data.error) { setError(data.error); return; }
      setOptions(data.options || []);
    } catch (e) {
      setError(e.message || 'Image generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const selectImage = (opt) => {
    setSelected(opt.index);
    if (onSelect) onSelect(opt.image_url);
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <ImageIcon size={18} style={{ color: '#C89B3C' }} />
        <b style={{ fontSize: 14 }}>Ultra-Lifelike Image Generator</b>
        <span style={{ fontSize: 11, color: '#999' }}>· 6 photorealistic variations</span>
      </div>

      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="Describe the image you need… e.g. 'Modern epoxy garage floor with metallic finish, professional installation'"
        style={{
          width: '100%', minHeight: 60, padding: '10px 12px', border: '1px solid #d7d7d7',
          borderRadius: 6, fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
          background: '#fff', color: '#111', marginBottom: 10,
        }}
      />

      <button
        onClick={generate}
        disabled={generating || !prompt}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: generating ? '#666' : 'linear-gradient(135deg, #E7C86E, #C89B3C)',
          color: '#111', border: 0, borderRadius: 6, padding: '10px 20px',
          fontSize: 13, fontWeight: 700, cursor: (generating || !prompt) ? 'wait' : 'pointer',
          fontFamily: 'inherit', opacity: (!prompt || generating) ? 0.6 : 1, marginBottom: 14,
        }}
      >
        {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {generating ? 'Generating 6 images…' : options.length > 0 ? 'Regenerate' : 'Generate Images'}
      </button>

      {error && <p style={{ color: '#a52d23', fontSize: 12, marginBottom: 10 }}>{error}</p>}

      {options.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => selectImage(opt)}
              style={{
                border: `2px solid ${selected === opt.index ? '#C89B3C' : '#eee'}`, borderRadius: 8,
                overflow: 'hidden', cursor: 'pointer', fontFamily: 'inherit', padding: 0,
                background: '#f8f7f4', position: 'relative',
              }}
            >
              {opt.image_url ? (
                <Image src={opt.image_url} alt={opt.label} fittingType="fill" className="w-full" style={{ height: 120 }} />
              ) : (
                <div style={{ height: 120, display: 'grid', placeItems: 'center', color: '#999', fontSize: 11 }}>Failed</div>
              )}
              <span style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#555', padding: '4px 6px', textAlign: 'center' }}>
                {opt.label}
              </span>
              {selected === opt.index && (
                <span style={{ position: 'absolute', top: 4, right: 4, background: '#237A4B', borderRadius: '50%', padding: 2 }}>
                  <Check size={12} style={{ color: '#fff' }} />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}