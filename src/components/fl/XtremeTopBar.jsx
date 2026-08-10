import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronLeft, Home, Copy, ListChecks, Images, Building2, Globe, Cpu, PenTool, Layers, Terminal, MessageSquare, Package, Zap, Database, Settings as SettingsIcon } from 'lucide-react';

const NAV_LINKS = [
  { to: '/app', label: 'Dashboard', icon: Home, end: true },
  { to: '/app/clone-studio', label: 'Clone Studio', icon: Copy },
  { to: '/app/clone-queue', label: 'Clone Queue', icon: ListChecks },
  { to: '/app/clone-gallery', label: 'Clone Gallery', icon: Images },
  { to: '/app/business', label: 'Business Hub', icon: Building2 },
  { to: '/app/website-generator', label: 'Website Generator', icon: Globe },
  { to: '/app/app-generator', label: 'App Generator', icon: Cpu },
  { to: '/app/brand-generator', label: 'Brand Generator', icon: PenTool },
  { to: '/app/niche-websites', label: 'Niche Websites', icon: Globe },
  { to: '/app/universal-builder', label: 'Universal Builder', icon: Layers },
  { to: '/app/command-center', label: 'Command Center', icon: Terminal },
  { to: '/app/chat', label: 'Chat', icon: MessageSquare },
  { to: '/store', label: 'Store', icon: Package },
  { to: '/app/tool-advisor', label: 'Tool Advisor', icon: Zap },
  { to: '/app/database', label: 'Database', icon: Database },
  { to: '/app/settings', label: 'Settings', icon: SettingsIcon },
];

export default function XtremeTopBar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname === '/app';

  return (
    <>
      <header style={{
        position: 'sticky', top: 0, zIndex: 70,
        height: 60, background: '#fff', borderBottom: '1px solid #e5e1da',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', boxShadow: '0 1px 3px rgba(0,0,0,.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Back button — hidden on dashboard */}
          {!isDashboard && (
            <button onClick={() => navigate(-1)} aria-label="Go back" style={{
              display: 'flex', alignItems: 'center', gap: 4, background: '#fff',
              border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px',
              cursor: 'pointer', color: '#111', fontSize: 13, fontWeight: 700,
              fontFamily: 'inherit',
            }}>
              <ChevronLeft size={18} />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}
          {/* Logo = home button */}
          <Link to="/app" aria-label="Go to dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)',
              display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700, color: '#111',
              flexShrink: 0,
            }}>X</div>
            <div style={{ minWidth: 0 }}>
              <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 16, color: '#111', display: 'block', lineHeight: 1.1 }}>
                Xtreme<span style={{ color: '#C89B3C' }}>Clone</span> System
              </b>
              <small style={{ color: '#999', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em' }}>Home</small>
            </div>
          </Link>
        </div>

        {/* Hamburger menu */}
        <button onClick={() => setOpen(o => !o)} aria-label="Toggle navigation" aria-expanded={open} style={{
          background: open ? '#0b0b0b' : '#fff', border: '1px solid #ddd', borderRadius: 8,
          padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          color: open ? '#fff' : '#111', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
        }}>
          {open ? <X size={18} /> : <Menu size={18} />}
          <span style={{ fontSize: 13 }}>Menu</span>
        </button>
      </header>

      {/* Dropdown nav */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 75 }} />
          <div style={{
            position: 'fixed', top: 60, right: 0, left: 0, zIndex: 80,
            background: '#fff', borderBottom: '1px solid #e5e1da', boxShadow: '0 20px 50px rgba(0,0,0,.15)',
            maxHeight: 'calc(100vh - 60px)', overflowY: 'auto',
            padding: '14px 20px 20px',
          }}>
            <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 4 }}>
              {NAV_LINKS.map(link => {
                const active = link.end ? location.pathname === link.to : location.pathname.startsWith(link.to);
                return (
                  <Link key={link.to} to={link.to} onClick={() => setOpen(false)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px',
                    borderRadius: 8, color: active ? '#fff' : '#333', fontSize: 14, fontWeight: 600,
                    textDecoration: 'none', background: active ? '#0b0b0b' : 'none',
                  }}>
                    <link.icon size={16} style={{ color: active ? '#E7C86E' : '#C89B3C', flexShrink: 0 }} />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}