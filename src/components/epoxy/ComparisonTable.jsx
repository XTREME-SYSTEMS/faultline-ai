import { Check, X } from 'lucide-react';

const LIME = '#7AB800';
const CHARCOAL = '#1a1a1a';

const ROWS = [
  { feature: 'Durability', epoxy: '20+ Years', concrete: 'Cracks & Stains', tiles: '5-10 Years', paint: '1-2 Years' },
  { feature: 'Installation Time', epoxy: '1 Day', concrete: '—', tiles: '3-5 Days', paint: '1 Day' },
  { feature: 'Stain Resistance', epoxy: true, concrete: false, tiles: 'Grout Stains', paint: false },
  { feature: 'Crack Resistance', epoxy: true, concrete: false, tiles: false, paint: false },
  { feature: 'UV Resistance', epoxy: true, concrete: 'N/A', tiles: true, paint: false },
  { feature: 'Lifetime Warranty', epoxy: true, concrete: false, tiles: false, paint: false }
];

function Cell({ value }) {
  if (value === true) return <Check size={18} color={LIME} style={{ margin: '0 auto' }} />;
  if (value === false) return <X size={18} color="#ccc" style={{ margin: '0 auto' }} />;
  return <span style={{ fontSize: 13, color: '#555' }}>{value}</span>;
}

/**
 * Comparison table — positions epoxy coating against alternatives.
 * Highlights competitive advantages with visual check/cross indicators.
 */
export default function ComparisonTable() {
  return (
    <section style={{ padding: '80px 24px', background: '#fff' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: CHARCOAL, margin: 0 }}>Why Epoxy Beats the Rest</h2>
        <p style={{ fontSize: 15, color: '#666', marginTop: 12 }}>See how our coating system compares to other garage floor options.</p>
      </div>
      <div style={{ maxWidth: 900, margin: '0 auto', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 600 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '16px', textAlign: 'left', color: CHARCOAL }}>Feature</th>
              <th style={{ padding: '16px', textAlign: 'center', color: LIME, fontWeight: 800 }}>Epoxy Coating</th>
              <th style={{ padding: '16px', textAlign: 'center', color: '#888' }}>Bare Concrete</th>
              <th style={{ padding: '16px', textAlign: 'center', color: '#888' }}>Tiles</th>
              <th style={{ padding: '16px', textAlign: 'center', color: '#888' }}>Paint</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '14px 16px', fontWeight: 600, color: CHARCOAL }}>{r.feature}</td>
                <td style={{ padding: '14px 16px', textAlign: 'center', background: '#f9ffe8' }}><Cell value={r.epoxy} /></td>
                <td style={{ padding: '14px 16px', textAlign: 'center' }}><Cell value={r.concrete} /></td>
                <td style={{ padding: '14px 16px', textAlign: 'center' }}><Cell value={r.tiles} /></td>
                <td style={{ padding: '14px 16px', textAlign: 'center' }}><Cell value={r.paint} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}