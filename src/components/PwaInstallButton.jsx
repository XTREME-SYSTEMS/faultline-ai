import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

// PWA install button — rectangular "Download" button for mobile.
// Shows a black square icon with a white X and metallic gold gradient accent.
// Renders only when the browser supports installation (beforeinstallprompt).
export default function PwaInstallButton({ style, variant = 'light' }) {
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

  const isDark = variant === 'dark';

  return (
    <button
      onClick={handleInstall}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 22px 12px 12px',
        borderRadius: 10,
        background: isDark ? '#0B0B0D' : '#fff',
        color: isDark ? '#fff' : '#0B0B0D',
        border: isDark ? '1px solid #C89B3C' : '1px solid #d7d7d7',
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: 14,
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 14px rgba(0,0,0,.15)',
        transition: 'transform .15s, box-shadow .15s',
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,.2)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,.15)'; }}
    >
      {/* Black square icon with white X + metallic gold gradient accent */}
      <span style={{
        width: 36, height: 36, borderRadius: 8, background: '#0B0B0D',
        display: 'grid', placeItems: 'center', flexShrink: 0,
        border: '1px solid rgba(200,155,60,.35)',
        boxShadow: 'inset 0 1px 2px rgba(231,200,110,.15)',
      }}>
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
          <defs>
            <linearGradient id="pwa-x-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#F5E6B8" />
              <stop offset="100%" stopColor="#C89B3C" />
            </linearGradient>
          </defs>
          <path d="M5 5 L15 15 M15 5 L5 15" stroke="url(#pwa-x-grad)" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      </span>
      <Download size={16} style={{ opacity: 0.8 }} />
      Download App
    </button>
  );
}