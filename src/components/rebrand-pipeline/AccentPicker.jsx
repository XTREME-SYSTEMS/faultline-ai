import { Check } from 'lucide-react';

const PRESETS = [
  { name: 'Gold',      hex: '#C89B3C' },
  { name: 'Emerald',   hex: '#059669' },
  { name: 'Blue',      hex: '#2563EB' },
  { name: 'Crimson',   hex: '#DC2626' },
  { name: 'Purple',    hex: '#7C3AED' },
  { name: 'Teal',      hex: '#0D9488' },
  { name: 'Orange',    hex: '#EA580C' },
  { name: 'Slate',     hex: '#475569' },
];

export default function AccentPicker({ value, onChange }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        {PRESETS.map(p => (
          <button key={p.hex} type="button" onClick={() => onChange(p.hex)}
            style={{
              width: 46, height: 46, borderRadius: 10, border: value.toLowerCase() === p.hex.toLowerCase() ? '3px solid #111' : '1px solid #ddd',
              background: p.hex, cursor: 'pointer', position: 'relative', display: 'grid', placeItems: 'center',
            }} title={p.name}>
            {value.toLowerCase() === p.hex.toLowerCase() && <Check size={18} color="#fff" />}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <label style={{ fontSize: 12, color: '#666', fontWeight: 700 }}>Custom:</label>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 42, height: 42, border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', padding: 2, background: '#fff' }} />
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 110, padding: '10px 12px', border: '1px solid #d7d7d7', borderRadius: 8, fontSize: 13, fontFamily: 'monospace', textTransform: 'uppercase' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 10 }}>
          <span style={{ fontSize: 11, color: '#999' }}>Preview:</span>
          <span style={{ padding: '8px 16px', borderRadius: 6, background: value, color: '#fff', fontSize: 12, fontWeight: 700 }}>Accent Button</span>
          <span style={{ color: value, fontSize: 12, fontWeight: 700, textDecoration: 'underline' }}>Accent Link</span>
        </div>
      </div>
    </div>
  );
}