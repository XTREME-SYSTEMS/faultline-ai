import { useState } from 'react';
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

export const COLOR_PRESETS = ['#C89B3C', '#1a56DB', '#059669', '#DC2626', '#7C3AED', '#EA580C', '#0EA5E9', '#111111'];

// ─── COLOR HELPERS ──────────────────────────────────────────────────
export function hexToHue(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  let h;
  if (max === r) h = ((g - b) / (max - min) + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / (max - min) + 2) * 60;
  else h = ((r - g) / (max - min) + 4) * 60;
  return h;
}

export function getColorFilter(targetHex) {
  const defaultHue = 41;
  const targetHue = hexToHue(targetHex);
  const rotation = targetHue - defaultHue;
  return `hue-rotate(${rotation}deg) saturate(1.15)`;
}

// ─── TEMPLATE THUMBNAIL ──────────────────────────────────────────────
export function TemplateThumbnail({ url, benchmarkUrl, name, filter }) {
  const [srcIndex, setSrcIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const screenshotTarget = benchmarkUrl || url;
  const sources = [
    `https://s.wordpress.com/mshots/v1/${encodeURIComponent(screenshotTarget)}?w=600&h=400`,
    `https://image.thum.io/get/width/600/crop/400/${screenshotTarget}`,
    `https://api.microlink.io/?url=${encodeURIComponent(screenshotTarget)}&screenshot=true&embed=screenshot.url`,
  ];

  const imgStyle = {
    width: '100%', height: '100%', objectFit: 'cover',
    filter: filter || 'none',
    transition: 'filter .25s ease, opacity .3s ease',
    opacity: loaded ? 1 : 0,
  };

  if (srcIndex >= sources.length) {
    return (
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
        <iframe
          src={url}
          style={{ width: '1200px', height: '700px', transform: 'scale(0.5)', transformOrigin: 'top left', border: 0, pointerEvents: 'none', filter: filter || 'none' }}
          title={name}
        />
      </div>
    );
  }

  return (
    <>
      {!loaded && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: '#f0ede7' }}><Loader2 size={20} className="animate-spin" color="#C89B3C" /></div>}
      <img
        src={sources[srcIndex]}
        alt={name}
        onLoad={() => setLoaded(true)}
        onError={() => { setSrcIndex(prev => prev + 1); setLoaded(false); }}
        style={imgStyle}
      />
    </>
  );
}

// ─── SHARED UI ───────────────────────────────────────────────────────
export function StepShell({ title, subtitle, children }) {
  return (
    <div>
      <h1 style={{ font: "400 32px 'Libre Caslon Display', serif", margin: '0 0 6px', letterSpacing: '-.02em' }}>{title}</h1>
      <p style={{ fontSize: 14, color: '#666', marginBottom: 28, maxWidth: 600 }}>{subtitle}</p>
      {children}
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: '#999', margin: '4px 0 0' }}>{hint}</p>}
    </div>
  );
}

export function StepNav({ onBack, onNext, disabled, saving, nextLabel }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, paddingTop: 20, borderTop: '1px solid #e5e1da' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '11px 18px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#666' }}>
        <ChevronLeft size={16} /> Back
      </button>
      <button onClick={onNext} disabled={disabled || saving} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '12px 24px', border: 0, borderRadius: 8,
        background: disabled ? '#ccc' : '#0a0a0a', color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
      }}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <>{nextLabel} <ChevronRight size={16} /></>}
      </button>
    </div>
  );
}

// ─── GENERATING OVERLAY ─────────────────────────────────────────────
export function GeneratingOverlay({ label, sublabel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <div className="animate-spin" style={{ width: 72, height: 72, borderRadius: '50%', border: '4px solid #f0ede7', borderTopColor: '#C89B3C' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <Loader2 size={28} color="#C89B3C" />
        </div>
      </div>
      <b style={{ fontSize: 18, fontFamily: "'Libre Caslon Display', serif" }}>{label || 'Generating...'}</b>
      <p style={{ fontSize: 13, color: '#888', marginTop: 6 }}>{sublabel || 'This takes 10-20 seconds'}</p>
    </div>
  );
}