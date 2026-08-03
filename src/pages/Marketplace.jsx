import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';

export default function Marketplace() {
  const [tab, setTab] = useState('tools');
  const [tools, setTools] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [t, p] = await Promise.all([
        base44.entities.ToolProduct.list('-created_date', 50),
        base44.entities.ProductPackage.list('-created_date', 50)
      ]);
      setTools(t);
      setPackages(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const priceModeColor = { 'A La Carte': '#D4AF37', 'Package': '#237A4B', 'Quote': '#73777F' };
  const statusColor = { 'Ready': '#237A4B', 'Draft': '#B88214' };

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Xtreme AI Builder · Marketplace</p>
          <h1>Marketplace</h1>
          <p>Browse AI tool products and bundled packages for contractor businesses. Each tool includes specialized generators.</p>
        </div>
      </div>

      {error && <div style={{ background: '#fde8e8', color: '#C63D34', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #C7CCD4' }}>
        {[['tools', `Tool Products (${tools.length})`], ['packages', `Packages (${packages.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '12px 18px', background: 'none', border: 0, borderBottom: tab === key ? '2px solid #D4AF37' : '2px solid transparent',
            fontSize: 13, fontWeight: 700, color: tab === key ? '#0F0F10' : '#73777F', cursor: 'pointer', fontFamily: 'inherit'
          }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#73777F' }}>
          <span className="dot-anim" style={{ fontSize: 24 }}>●</span>
          <p style={{ marginTop: 12 }}>Loading marketplace…</p>
        </div>
      ) : tab === 'tools' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {tools.map(t => (
            <div key={t.id} style={{ background: '#fff', border: '1px solid #C7CCD4', borderRadius: 12, padding: 22, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#D4AF37', background: '#D4AF3715', padding: '3px 8px', borderRadius: 4 }}>{t.category}</span>
                  <b style={{ display: 'block', fontSize: 16, margin: '8px 0 4px' }}>{t.name}</b>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'end' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: priceModeColor[t.price_mode], background: `${priceModeColor[t.price_mode]}15`, padding: '3px 8px', borderRadius: 4 }}>{t.price_mode}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: statusColor[t.status] }}>{t.status}</span>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#73777F', lineHeight: 1.5, margin: '0 0 10px' }}>{t.description}</p>
              <p style={{ fontSize: 11, color: '#999', margin: '0 0 12px' }}><b>Problem:</b> {t.business_problem}</p>
              <div style={{ marginTop: 'auto' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#73777F', margin: '0 0 6px' }}>Benefits</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px', display: 'grid', gap: 4 }}>
                  {t.benefits?.map((b, i) => (
                    <li key={i} style={{ fontSize: 12, color: '#555', paddingLeft: 14, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: '#D4AF37' }}>✓</span>{b}
                    </li>
                  ))}
                </ul>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {t.included_generators?.map((g, i) => (
                    <span key={i} style={{ fontSize: 10, background: '#0F0F10', color: '#D4AF37', padding: '3px 8px', borderRadius: 4 }}>{g}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {packages.map(p => (
            <div key={p.id} style={{ background: '#fff', border: p.status === 'Ready' ? '2px solid #D4AF37' : '1px solid #C7CCD4', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {p.status === 'Ready' && <span style={{ position: 'absolute', top: -12, left: 20, background: '#D4AF37', color: '#0F0F10', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 4, letterSpacing: '.1em' }}>Featured</span>}
              <b style={{ fontSize: 18, fontFamily: "'Libre Caslon Display', serif", margin: '4px 0 6px' }}>{p.name}</b>
              <p style={{ fontSize: 12, color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 10px' }}>{p.audience}</p>
              <p style={{ fontSize: 13, color: '#73777F', lineHeight: 1.5, margin: '0 0 14px' }}>{p.description}</p>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#73777F', margin: '0 0 6px' }}>Includes</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px', display: 'grid', gap: 5 }}>
                {p.features?.map((f, i) => (
                  <li key={i} style={{ fontSize: 12, color: '#555', paddingLeft: 16, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#D4AF37' }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #eee' }}>
                <p style={{ fontSize: 11, color: '#999', margin: 0 }}><b>Website:</b> {p.website_tier}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {p.tool_ids?.map((tid, i) => (
                    <span key={i} style={{ fontSize: 10, background: '#F8F9FB', border: '1px solid #C7CCD4', padding: '2px 8px', borderRadius: 4, color: '#73777F' }}>{tid}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}