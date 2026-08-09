const LIME = '#7AB800';
const CHARCOAL = '#1a1a1a';

const STATS = [
  { value: '1,362', label: 'Floor Installed' },
  { value: '4.5★', label: 'Average Rating' },
  { value: '12', label: 'Color Options', sub: 'Custom Avail' },
  { value: '8', label: 'States Served' }
];

/**
 * Stats banner — social proof through big numbers.
 * Reinforces scale, quality, and geographic reach.
 * Thin dark shading behind each stat for depth and readability.
 */
export default function StatsBanner() {
  return (
    <section style={{ background: LIME, padding: '36px 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
        {STATS.map((s, i) => (
          <div key={i} style={{ padding: '12px 8px', background: 'rgba(0,0,0,0.12)', borderRadius: 8, boxShadow: '0 2px 0 rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#fff', lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.95)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
            {s.sub && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 500, marginTop: 2 }}>{s.sub}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}