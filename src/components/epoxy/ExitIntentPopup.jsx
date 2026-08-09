import { useState, useEffect } from 'react';
import { X, ArrowRight, ShieldCheck } from 'lucide-react';

const LIME = '#7AB800';
const CHARCOAL = '#1a1a1a';

/**
 * Exit-intent popup — captures visitors before they leave.
 * Desktop: triggers on mouseleave (cursor exits top of page).
 * Mobile: triggers after 30 seconds.
 * Shows once per session (sessionStorage guard).
 */
export default function ExitIntentPopup({ onStart }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('exitPopupShown')) return;

    const trigger = () => {
      setShow(true);
      sessionStorage.setItem('exitPopupShown', 'true');
    };

    const handleMouseLeave = (e) => {
      if (e.clientY <= 0) {
        trigger();
        document.removeEventListener('mouseleave', handleMouseLeave);
      }
    };

    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      const timer = setTimeout(() => {
        if (!sessionStorage.getItem('exitPopupShown')) trigger();
      }, 30000);
      return () => clearTimeout(timer);
    }

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
    }} onClick={() => setShow(false)}>
      <div style={{
        background: '#fff', borderRadius: 12, maxWidth: 440, width: '100%', padding: 32,
        textAlign: 'center', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }} onClick={e => e.stopPropagation()}>
        <button onClick={() => setShow(false)} style={{
          position: 'absolute', top: 12, right: 12, background: 'none', border: 'none',
          cursor: 'pointer', color: '#999', padding: 4
        }}>
          <X size={20} />
        </button>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', background: LIME,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16
        }}>
          <ShieldCheck size={28} color="#fff" />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: CHARCOAL, margin: '0 0 8px' }}>Wait! Don't Leave Yet</h2>
        <p style={{ fontSize: 15, color: '#666', lineHeight: 1.6, margin: '0 0 24px' }}>
          Get your <strong>free instant epoxy garage floor estimate</strong> in under 60 seconds. No obligation, no credit card required.
        </p>
        <button onClick={() => { setShow(false); onStart(); }} style={{
          background: LIME, color: '#fff', border: 'none', padding: '16px 32px', borderRadius: 6,
          fontWeight: 800, fontSize: 16, cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center'
        }}>
          Get My Free Estimate <ArrowRight size={18} />
        </button>
        <p style={{ fontSize: 12, color: '#999', marginTop: 16 }}>
          Join 2,847+ homeowners who got their estimate today
        </p>
      </div>
    </div>
  );
}