import { Phone, ArrowRight } from 'lucide-react';

const LIME = '#7AB800';

/**
 * Sticky mobile CTA — fixed bottom bar visible only on mobile.
 * Combines click-to-call and estimate button for maximum conversion.
 * Includes a spacer div so content isn't hidden behind the fixed bar.
 */
export default function StickyMobileCta({ onStart }) {
  return (
    <>
      <style>{`
        @media (min-width: 769px) { .sticky-mobile-cta { display: none !important; } .sticky-mobile-spacer { display: none !important; } }
      `}</style>
      <div className="sticky-mobile-spacer" style={{ height: 76 }} />
      <div className="sticky-mobile-cta" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: '#fff', borderTop: `3px solid ${LIME}`, padding: '12px 16px',
        display: 'flex', gap: 10, alignItems: 'center',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))'
      }}>
        <a href="tel:9545550199" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 52, height: 52, borderRadius: '50%', background: LIME, color: '#fff', flexShrink: 0
        }}>
          <Phone size={22} />
        </a>
        <button onClick={onStart} style={{
          flex: 1, padding: '14px', borderRadius: 6, border: 'none',
          background: LIME, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
          textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}>
          Free Estimate <ArrowRight size={18} />
        </button>
      </div>
    </>
  );
}