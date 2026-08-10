import { useState, useRef } from 'react';

function hslToHex(h, s, l) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

export default function SpectrumPicker({ value, onChange }) {
  const barRef = useRef(null);
  const initial = hexToHsl(value || '#C89B3C');
  const [hue, setHue] = useState(initial[0]);
  const [lightness, setLightness] = useState(initial[2] || 50);
  const [expanded, setExpanded] = useState(false);

  const pickFromBar = (e) => {
    const rect = barRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const h = Math.round((x / rect.width) * 360);
    setHue(h);
    onChange(hslToHex(h, 80, lightness));
  };

  const handleBarDrag = (e) => {
    if (e.buttons !== 1) return;
    pickFromBar(e);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          fontSize: 11, color: '#C89B3C', background: 'none', border: '1px dashed #C89B3C',
          borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit',
          fontWeight: 600,
        }}
      >
        {expanded ? '− Hide full spectrum' : '+ Full spectrum picker'}
      </button>

      {expanded && (
        <div style={{ marginTop: 10, padding: 12, background: '#f8f7f4', borderRadius: 8, border: '1px solid #e5e1da' }}>
          {/* Rainbow hue bar */}
          <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Hue — click or drag</div>
          <div
            ref={barRef}
            onClick={pickFromBar}
            onMouseMove={handleBarDrag}
            style={{
              height: 34, borderRadius: 6, cursor: 'crosshair', position: 'relative',
              background: 'linear-gradient(to right, hsl(0,80%,50%), hsl(60,80%,50%), hsl(120,80%,50%), hsl(180,80%,50%), hsl(240,80%,50%), hsl(300,80%,50%), hsl(360,80%,50%))',
            }}
          >
            {/* Hue marker */}
            <div style={{
              position: 'absolute', top: -3, bottom: -3, width: 4, borderRadius: 2,
              background: '#fff', boxShadow: '0 0 0 2px #111',
              left: `${(hue / 360) * 100}%`, transition: 'left .1s',
            }} />
          </div>

          {/* Lightness slider */}
          <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.06em', margin: '12px 0 6px' }}>Lightness</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="range"
              min={10}
              max={90}
              value={lightness}
              onChange={(e) => {
                const l = Number(e.target.value);
                setLightness(l);
                onChange(hslToHex(hue, 80, l));
              }}
              style={{ flex: 1, accentColor: hslToHex(hue, 80, lightness) }}
            />
            <div style={{
              width: 36, height: 36, borderRadius: 6, border: '2px solid #111',
              background: value || hslToHex(hue, 80, lightness), flexShrink: 0,
            }} />
          </div>

          {/* Hex value */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#888' }}>HEX</span>
            <input
              type="text"
              value={(value || '').toUpperCase()}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                  onChange(v);
                  const [h, , l] = hexToHsl(v);
                  setHue(h);
                  setLightness(l);
                } else if (v.startsWith('#')) {
                  onChange(v);
                }
              }}
              style={{
                flex: 1, padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4,
                fontSize: 13, fontFamily: 'monospace', background: '#fff', color: '#111', outline: 'none',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}