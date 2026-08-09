const LIME = '#7AB800';

const STATS = [
  { value: '2,847+', label: 'Floors Installed' },
  { value: '4.9★', label: 'Average Rating' },
  { value: '30+', label: 'Color Options' },
  { value: '8', label: 'States Served' }
];

/**
 * Stats banner — social proof through big numbers.
 * Reinforces scale, quality, and geographic reach.
 */
export default function StatsBanner() {
  return (
    <section style={{ background: LIME, padding: '36px 24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
        {STATS.map((s, i) => (
          <div key={i}>
            <div style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}