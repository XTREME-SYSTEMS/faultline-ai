import { useState } from 'react';
import { Link } from 'react-router-dom';
import { COATING_SYSTEMS, getColorsBySystem } from '@/lib/epoxyVisualizerData';
import ColorSwatch from '@/components/vq/ColorSwatch';
import SeoHead from '@/components/epoxy/SeoHead';
import EpoxyLogo from '@/components/epoxy/EpoxyLogo';
import { ArrowRight, Phone } from 'lucide-react';

const LIME = '#7AB800';
const CHARCOAL = '#1a1a1a';

/**
 * Standalone color charts page — shows all available colors by system.
 * Accessible via /epoxy-colors. CTA links back to the estimate funnel.
 */
export default function EpoxyColorCharts() {
  const [activeSystem, setActiveSystem] = useState('flake');
  const activeSys = COATING_SYSTEMS.find(s => s.id === activeSystem);
  const colors = getColorsBySystem(activeSys?.systemKey || activeSystem);

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <SeoHead />

      {/* HEADER */}
      <header style={{ background: '#fff', borderBottom: `3px solid ${LIME}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
        <Link to="/epoxy-estimate" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 40, height: 40, background: LIME, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 0 rgba(0,0,0,0.2)' }}>
            <EpoxyLogo size={40} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: CHARCOAL, letterSpacing: 0.3 }}>EPOXY GARAGE FLOORS</div>
            <div style={{ fontSize: 10, color: LIME, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Near You</div>
          </div>
        </Link>
        <a href="tel:9545550199" style={{ background: LIME, color: '#fff', padding: '10px 20px', borderRadius: 4, fontWeight: 700, fontSize: 13, textDecoration: 'none', boxShadow: '0 2px 0 rgba(0,0,0,0.2)' }}>GET PRICING</a>
      </header>

      {/* PAGE TITLE */}
      <div style={{ padding: '60px 24px 30px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: LIME, marginBottom: 12, background: LIME, color: '#fff', display: 'inline-block', padding: '6px 18px', borderRadius: 4, boxShadow: '0 2px 0 rgba(0,0,0,0.2)' }}>Color Charts</div>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, color: CHARCOAL, margin: '16px 0 12px' }}>Choose Your Perfect Color</h1>
        <p style={{ fontSize: 16, color: '#666', maxWidth: 600, margin: '0 auto' }}>Browse our 12 standard colors across all coating systems. Custom colors are also available — call us to learn more.</p>
      </div>

      {/* SYSTEM TABS */}
      <div style={{ maxWidth: 1100, margin: '0 auto 30px', padding: '0 24px', display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {COATING_SYSTEMS.map(sys => (
          <button key={sys.id} onClick={() => setActiveSystem(sys.id)} style={{
            padding: '10px 20px', borderRadius: 4, border: `2px solid ${activeSystem === sys.id ? LIME : '#e0e0e0'}`,
            background: activeSystem === sys.id ? '#f5ffe8' : '#fff', color: activeSystem === sys.id ? CHARCOAL : '#666',
            fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: activeSystem === sys.id ? '0 2px 0 rgba(0,0,0,0.1)' : 'none'
          }}>
            {sys.name}
          </button>
        ))}
      </div>

      {/* ACTIVE SYSTEM DESCRIPTION */}
      {activeSys && (
        <div style={{ maxWidth: 800, margin: '0 auto 30px', padding: '0 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#888', lineHeight: 1.7 }}>{activeSys.desc}</p>
        </div>
      )}

      {/* COLOR GRID */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 60px' }}>
        {colors.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
            {colors.map(c => (
              <div key={c.code} style={{
                border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden', background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}>
                <ColorSwatch color={c} system={activeSystem} className="h-28" />
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: CHARCOAL, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.color_name}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{c.code}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
            <p style={{ fontSize: 16, marginBottom: 8 }}>No standard colors listed for this system.</p>
            <p style={{ fontSize: 14 }}>Custom colors are available — call us at (954) 555-0199.</p>
          </div>
        )}
      </div>

      {/* CUSTOM COLORS NOTE */}
      <div style={{ background: '#f5f5f5', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: CHARCOAL, margin: '0 0 10px' }}>Don't See Your Color?</h3>
          <p style={{ fontSize: 15, color: '#666', marginBottom: 24 }}>We offer custom color matching for an additional charge. Contact us to discuss your vision.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/epoxy-estimate" style={{
              background: LIME, color: '#fff', padding: '14px 32px', borderRadius: 4, fontWeight: 800, fontSize: 15,
              textDecoration: 'none', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 3px 0 rgba(0,0,0,0.2)'
            }}>
              Get My Free Estimate <ArrowRight size={18} />
            </Link>
            <a href="tel:9545550199" style={{
              background: '#fff', color: CHARCOAL, border: '2px solid #ddd', padding: '12px 32px', borderRadius: 4,
              fontWeight: 700, fontSize: 15, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8
            }}>
              <Phone size={16} /> (954) 555-0199
            </a>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#f5f5f5', color: CHARCOAL, padding: '30px 24px', textAlign: 'center', borderTop: `1px solid #e0e0e0` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, background: LIME, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 0 rgba(0,0,0,0.2)' }}>
            <EpoxyLogo size={36} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>EPOXY GARAGE FLOORS NEAR YOU</div>
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>© 2026 Epoxy Garage Floors Near You. The Original 2-Day Flooring Solution.</div>
      </footer>
    </div>
  );
}