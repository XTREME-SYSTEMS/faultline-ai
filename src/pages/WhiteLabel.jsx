import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';

export default function WhiteLabel() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.WhiteLabelConfig.list('-created_date', 1);
        setConfig(list[0] || null);
      } catch (e) { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      if (config.id) {
        await base44.entities.WhiteLabelConfig.update(config.id, config);
      } else {
        const created = await base44.entities.WhiteLabelConfig.create(config);
        setConfig(created);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { /* ignore */ }
    setSaving(false);
  };

  const update = (field, value) => setConfig(prev => ({ ...prev, [field]: value }));

  if (loading) return <PortalShell><p style={{ padding: 28, color: '#888' }}>Loading white-label config…</p></PortalShell>;

  const current = config || { agency_name: '', logo_url: '', primary_color: '#C89B3C', secondary_color: '#0a0a0a', portal_name: '', welcome_message: '', hide_faultline_branding: false, custom_domain: '', pricing_markup_percent: 0 };

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">White-Label Agency</p>
          <h1>Agency Branding</h1>
          <p>Rebrand the entire portal with your agency's logo, colors, and domain. Your clients see your brand — not FaultLine AI.</p>
        </div>
      </div>

      <section className="finding" style={{ marginTop: 13 }}>
        <h2 style={{ fontSize: 18, marginBottom: 20 }}>Brand Configuration</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
            Agency Name
            <input value={current.agency_name || ''} onChange={e => update('agency_name', e.target.value)} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 6, fontWeight: 400 }} placeholder="Your Agency LLC" />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
            Portal Name
            <input value={current.portal_name || ''} onChange={e => update('portal_name', e.target.value)} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 6, fontWeight: 400 }} placeholder="Your Agency Portal" />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
            Logo URL
            <input value={current.logo_url || ''} onChange={e => update('logo_url', e.target.value)} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 6, fontWeight: 400 }} placeholder="https://youragency.com/logo.png" />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
            Custom Domain
            <input value={current.custom_domain || ''} onChange={e => update('custom_domain', e.target.value)} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 6, fontWeight: 400 }} placeholder="portal.youragency.com" />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
            Primary Color
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={current.primary_color || '#C89B3C'} onChange={e => update('primary_color', e.target.value)} style={{ width: 50, height: 38, border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }} />
              <input value={current.primary_color || ''} onChange={e => update('primary_color', e.target.value)} style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: 6, fontWeight: 400 }} />
            </div>
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
            Secondary Color
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={current.secondary_color || '#0a0a0a'} onChange={e => update('secondary_color', e.target.value)} style={{ width: 50, height: 38, border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }} />
              <input value={current.secondary_color || ''} onChange={e => update('secondary_color', e.target.value)} style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: 6, fontWeight: 400 }} />
            </div>
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, gridColumn: 'span 2' }}>
            Welcome Message
            <textarea value={current.welcome_message || ''} onChange={e => update('welcome_message', e.target.value)} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 6, fontWeight: 400, minHeight: 60 }} placeholder="Welcome to your diagnostic portal…" />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
            Pricing Markup %
            <input type="number" value={current.pricing_markup_percent || 0} onChange={e => update('pricing_markup_percent', parseFloat(e.target.value) || 0)} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 6, fontWeight: 400 }} placeholder="0" />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 700 }}>
            <input type="checkbox" checked={current.hide_faultline_branding || false} onChange={e => update('hide_faultline_branding', e.target.checked)} style={{ width: 18, height: 18 }} />
            Hide FaultLine AI Branding
          </label>
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn dark" onClick={save} disabled={saving}>{saving ? '⏳ Saving…' : 'Save Configuration'}</button>
          {saved && <span style={{ color: '#237A4B', fontSize: 13, fontWeight: 600 }}>✓ Saved</span>}
        </div>
      </section>

      {/* Live preview */}
      <section className="finding" style={{ marginTop: 13 }}>
        <h2 style={{ fontSize: 18, marginBottom: 15 }}>Live Preview</h2>
        <div style={{
          background: current.secondary_color || '#0a0a0a',
          borderRadius: 8,
          padding: 20,
          color: '#fff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            {current.logo_url && <img src={current.logo_url} alt="Logo" style={{ height: 40 }} onError={e => e.target.style.display = 'none'} />}
            <b style={{ font: '400 20px Libre Caslon Display, serif' }}>{current.portal_name || current.agency_name || 'Your Agency Portal'}</b>
          </div>
          <p style={{ color: '#aaa', fontSize: 13 }}>{current.welcome_message || 'Welcome to your diagnostic portal.'}</p>
          <button style={{
            padding: '10px 18px',
            background: current.primary_color || '#C89B3C',
            color: '#111',
            border: 0,
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            marginTop: 12
          }}>
            Start Free Audit →
          </button>
        </div>
      </section>
    </PortalShell>
  );
}