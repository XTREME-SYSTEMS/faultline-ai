import { ClipboardList, Wrench, Layers, ShieldCheck } from 'lucide-react';

const LIME = '#7AB800';
const CHARCOAL = '#1a1a1a';

const STEPS = [
  { icon: ClipboardList, num: '01', title: 'Free Estimate', desc: 'Get your instant online estimate with our AI-powered calculator and visualizer.' },
  { icon: Wrench, num: '02', title: 'Surface Prep', desc: 'Professional mechanical grinding, crack repair, and oil stain removal.' },
  { icon: Layers, num: '03', title: 'One-Day Install', desc: 'Primer, base coat, flake broadcast, and top coat — all in a single day.' },
  { icon: ShieldCheck, num: '04', title: 'Lifetime Warranty', desc: 'Enjoy your beautiful new floor backed by our lifetime guarantee.' }
];

/**
 * Process timeline — 4-step visual journey from estimate to warranty.
 * Reduces friction by showing how simple the process is.
 */
export default function ProcessTimeline() {
  return (
    <section style={{ padding: '80px 24px', background: '#f5f5f5' }}>
      <div style={{ textAlign: 'center', marginBottom: 50 }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: CHARCOAL, margin: 0 }}>Our 4-Step Process</h2>
        <p style={{ fontSize: 15, color: '#666', marginTop: 12 }}>From estimate to lifetime warranty — done in days, not weeks.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, maxWidth: 1000, margin: '0 auto' }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: '#fff',
              border: `3px solid ${LIME}`, display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', marginBottom: 16, position: 'relative'
            }}>
              <s.icon size={28} color={LIME} />
              <span style={{
                position: 'absolute', top: -8, right: -8, background: LIME, color: '#fff',
                fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 10
              }}>{s.num}</span>
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: CHARCOAL, margin: '0 0 8px' }}>{s.title}</h3>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}