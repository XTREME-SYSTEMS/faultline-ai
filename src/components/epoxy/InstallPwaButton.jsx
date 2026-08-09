import { useState, useEffect } from 'react';
import EpoxyLogo from '@/components/epoxy/EpoxyLogo';

const LIME = '#7AB800';
const CHARCOAL = '#1a1a1a';

/**
 * PWA install button — rectangular bar fixed at the bottom of the mobile
 * screen, using the brand logo. Triggers the native install prompt on
 * Android/Chrome, and shows iOS instructions on iPhone/Safari.
 * Hidden on desktop and after the app is installed.
 */
export default function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Register service worker for PWA installability
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/epoxy-sw.js').catch(() => {});
    }

    // Already installed — don't show the button
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Detect iOS (no beforeinstallprompt event on iOS)
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    if (ios) {
      setShow(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setShow(false));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShow(false);
  };

  if (!show) return null;

  return (
    <>
      <style>{`
        @media (min-width: 769px) { .pwa-install-bar { display: none !important; } }
      `}</style>
      <div className="pwa-install-bar" style={{
        position: 'fixed', bottom: 76, left: 12, right: 12, zIndex: 95,
        background: '#fff', border: `2px solid ${LIME}`, borderRadius: 10,
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        <EpoxyLogo size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: CHARCOAL }}>Install App</div>
          <div style={{ fontSize: 11, color: '#888' }}>Add to home screen for quick access</div>
        </div>
        <button onClick={handleInstall} style={{
          background: LIME, color: '#fff', border: 'none', padding: '10px 18px',
          borderRadius: 6, fontWeight: 800, fontSize: 13, cursor: 'pointer',
          fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: 0.5,
          flexShrink: 0
        }}>
          Install
        </button>
      </div>

      {showIOSInstructions && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
        }} onClick={() => setShowIOSInstructions(false)}>
          <div style={{
            background: '#fff', borderRadius: 12, maxWidth: 380, width: '100%', padding: 28,
            textAlign: 'center'
          }} onClick={e => e.stopPropagation()}>
            <EpoxyLogo size={56} />
            <div style={{ fontSize: 20, fontWeight: 800, color: CHARCOAL, margin: '16px 0' }}>Install on iPhone</div>
            <div style={{ fontSize: 14, color: '#666', lineHeight: 1.8, marginBottom: 20, textAlign: 'left' }}>
              1. Tap the <strong>Share</strong> button at the bottom of Safari<br />
              2. Scroll down and tap <strong>"Add to Home Screen"</strong><br />
              3. Tap <strong>"Add"</strong> to install the app
            </div>
            <button onClick={() => setShowIOSInstructions(false)} style={{
              background: LIME, color: '#fff', border: 'none', padding: '12px 24px',
              borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              width: '100%'
            }}>
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}