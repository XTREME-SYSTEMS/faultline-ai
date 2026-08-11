import { Check } from 'lucide-react';

const DEFAULT_PAIRINGS = [
  { heading: 'Inter', body: 'Inter', vibe: 'Clean & modern' },
  { heading: 'Playfair Display', body: 'Source Sans Pro', vibe: 'Elegant & editorial' },
  { heading: 'Montserrat', body: 'Open Sans', vibe: 'Bold & friendly' },
  { heading: 'DM Serif Display', body: 'DM Sans', vibe: 'Sophisticated' },
  { heading: 'Space Grotesk', body: 'Inter', vibe: 'Tech & startup' },
  { heading: 'Libre Baskerville', body: 'Libre Franklin', vibe: 'Classic & readable' },
  { heading: 'Archivo Black', body: 'Archivo', vibe: 'Bold & impactful' },
  { heading: 'Cormorant Garamond', body: 'Lato', vibe: 'Luxury & refined' },
];

export default function FontPairer({ pairings, selected, onSelect }) {
  const allPairings = pairings && pairings.length > 0 ? pairings : DEFAULT_PAIRINGS;

  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>🔤</span>
        <b style={{ fontSize: 14 }}>Font Pairing Picker</b>
        <span style={{ fontSize: 11, color: '#999' }}>· Curated heading + body pairs</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
        {allPairings.map((pair, i) => {
          const isSelected = selected && selected.heading === pair.heading && selected.body === pair.body;
          return (
            <button
              key={i}
              onClick={() => onSelect(pair)}
              style={{
                border: `2px solid ${isSelected ? '#C89B3C' : '#eee'}`, borderRadius: 8,
                background: isSelected ? '#C89B3C08' : '#f8f7f4', padding: 14, cursor: 'pointer',
                fontFamily: 'inherit', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: '#C89B3C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{pair.vibe}</span>
                {isSelected && <Check size={14} style={{ color: '#237A4B' }} />}
              </div>
              <div style={{ fontSize: 18, fontFamily: `'${pair.heading}', serif`, fontWeight: 700, color: '#111' }}>
                {pair.heading}
              </div>
              <div style={{ fontSize: 13, fontFamily: `'${pair.body}', sans-serif`, color: '#666' }}>
                {pair.body}
              </div>
              <div style={{ fontSize: 11, fontFamily: `'${pair.heading}', serif`, color: '#888', marginTop: 2 }}>
                The quick brown fox
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}