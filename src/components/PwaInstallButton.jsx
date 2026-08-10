import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

// PWA install button — shows a rectangular branded "Install App" button when
// the browser fires beforeinstallprompt. Also renders the black X home-screen
// icon (gradient white → gold X) as the brand mark.
export default function PwaInstallButton({ style }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already installed (running as standalone PWA)?
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setInstalled(true);
      return;
    }

    function handleBeforeInstall(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    function handleInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  }

  if (installed || !deferredPrompt) return null;

  return (
    <button
      onClick={handleInstall}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 20px', borderRadius: 8,
        background: 'linear-gradient(135deg, #E7C86E, #C89B3C)',
        color: '#0B0B0D', border: 0, cursor: 'pointer',
        fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {/* Black X home-screen icon with gradient white→gold X */}
      <span style={{
        width: 28, height: 28, borderRadius: 6, background: '#0B0B0D',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <defs>
            <linearGradient id="pwa-x-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#E7C86E" />
            </linearGradient>
          </defs>
          <path d="M5 5 L15 15 M15 5 L5 15" stroke="url(#pwa-x-grad)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </span>
      <Download size={16} />
      Install App
    </button>
  );
}