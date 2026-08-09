import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronRight, X, Activity, Zap, Bell } from 'lucide-react';

export default function XtremeOSRightPanel() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const receipts = await base44.entities.Receipt.list('-created_date', 15).catch(() => []);
      const sysAlerts = receipts
        .filter(r => ['forensic_audit', 'marketplace_stocker', 'autonomous_clone', 'onboarding', 'billing'].includes(r.system))
        .map(r => ({
          id: r.id,
          status: r.status,
          summary: r.summary,
          system: r.system,
          time: new Date(r.created_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        }));
      setAlerts(sysAlerts);
    })();
  }, [open]);

  return (
    <>
      {/* Toggle button — always visible, sits at the right edge */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)',
          zIndex: 70, background: '#090909', color: '#E7C86E',
          border: '1px solid #2b2b2b', borderRight: 0,
          borderRadius: '8px 0 0 8px', padding: '14px 8px',
          cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          boxShadow: '-4px 0 20px rgba(0,0,0,.3)',
        }}
        title={open ? 'Retract panel' : 'Expand panel'}
      >
        {open ? <X size={18} /> : <ChevronRight size={18} />}
        <span style={{ fontSize: 8, writingMode: 'vertical-rl', textTransform: 'uppercase', letterSpacing: '.15em', fontWeight: 700 }}>
          {open ? 'Close' : 'System'}
        </span>
      </button>

      {/* Retractable panel — slides in/out */}
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 320,
        background: '#fff', borderLeft: '1px solid #ddd',
        zIndex: 65, overflowY: 'auto',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .3s ease',
        boxShadow: open ? '-10px 0 40px rgba(0,0,0,.1)' : 'none',
        padding: 20,
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #eee' }}>
          <Activity size={20} style={{ color: '#C89B3C' }} />
          <div>
            <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 20 }}>System Activity</b>
            <small style={{ display: 'block', color: '#999', fontSize: 11 }}>Live autonomous operations</small>
          </div>
        </div>

        {/* Status summary */}
        <div style={{ background: '#f8f7f4', border: '1px solid #eee', padding: 14, borderRadius: 8, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#237A4B', display: 'inline-block' }} />
            <b style={{ fontSize: 13 }}>All Systems Online</b>
          </div>
          <p style={{ fontSize: 11, color: '#888', margin: 0 }}>Nightly operations running · Next cycle in ~30 min</p>
        </div>

        {/* Activity feed */}
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: '#888', margin: '0 0 12px' }}>Recent Activity</p>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', fontSize: 13, padding: 30 }}>
              <Zap size={24} style={{ opacity: .3, margin: '0 auto 10px', display: 'block' }} />
              Loading activity…
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {alerts.map(a => (
                <div key={a.id} style={{
                  display: 'flex', gap: 10, padding: 12,
                  background: '#f8f7f4', borderRadius: 8, border: '1px solid #eee',
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                    background: a.status === 'success' ? '#237A4B' : a.status === 'partial' ? '#B88214' : '#C63D34'
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: 12, display: 'block', lineHeight: 1.4 }}>{a.summary?.slice(0, 80)}</b>
                    <small style={{ color: '#999', fontSize: 10 }}>{a.system} · {a.time}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}