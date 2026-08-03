import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';

const CATEGORIES = ['All Tools', 'Get Leads', 'Sell & Quote', 'Plan Jobs', 'Build Your Brand', 'Run Operations', 'Learn & Train'];

export default function PCUMarketplace() {
  const [tab, setTab] = useState('tools');
  const [tools, setTools] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('All Tools');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [t, b] = await Promise.all([
        base44.entities.AiTool.list('-created_date', 50),
        base44.entities.ToolBundle.list('-created_date', 50)
      ]);
      setTools(t);
      setBundles(b);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredTools = category === 'All Tools' ? tools : tools.filter(t => t.category === category);

  const fmtPrice = (t) => {
    if (t.price === 0) return 'Free';
    if (t.price_mode === 'subscription') return `$${t.price}/mo`;
    if (t.price_mode === 'one_time') return `$${t.price}`;
    return t.price_mode === 'quote' ? 'Quote' : `$${t.price}`;
  };

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Polished Concrete University · AI Tool Marketplace</p>
          <h1>PCU Tool Marketplace</h1>
          <p>Browse AI tools built for concrete and flooring contractors. From lead generation to estimating, scheduling, and operations.</p>
        </div>
      </div>

      {error && <div style={{ background: '#fde8e8', color: '#C63D34', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #C7CCD4' }}>
        {[['tools', `Individual Tools (${tools.length})`], ['bundles', `Bundles (${bundles.length})`]].map(([key, label]) => (
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
        <>
          {/* Category filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{
                padding: '6px 14px', border: category === c ? '2px solid #D4AF37' : '1px solid #C7CCD4', borderRadius: 20,
                background: category === c ? '#D4AF3715' : '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                color: category === c ? '#8A641C' : '#73777F'
              }}>{c}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {filteredTools.map(t => (
              <div key={t.id} style={{ background: '#fff', border: '1px solid #C7CCD4', borderRadius: 12, padding: 22, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#D4AF37', background: '#D4AF3715', padding: '3px 8px', borderRadius: 4 }}>{t.category}</span>
                    <b style={{ display: 'block', fontSize: 15, margin: '8px 0 4px' }}>{t.name}</b>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#0F0F10', whiteSpace: 'nowrap' }}>{fmtPrice(t)}</span>
                </div>
                <p style={{ fontSize: 13, color: '#73777F', lineHeight: 1.5, margin: '0 0 14px' }}>{t.description}</p>
                <div style={{ marginTop: 'auto' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#73777F', margin: '0 0 6px' }}>Features</p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px', display: 'grid', gap: 4 }}>
                    {t.features?.map((f, i) => (
                      <li key={i} style={{ fontSize: 12, color: '#555', paddingLeft: 14, position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 0, color: '#D4AF37' }}>✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  {t.audience && <p style={{ fontSize: 11, color: '#999', margin: '0 0 10px' }}><b>Best for:</b> {t.audience}</p>}
                  <button style={{
                    width: '100%', padding: 10, background: t.price === 0 ? '#237A4B' : '#0F0F10', color: '#fff', border: 0, borderRadius: 6,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                  }}>{t.price === 0 ? 'Get Started' : 'Purchase'}</button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
          {bundles.map(b => (
            <div key={b.id} style={{ background: '#fff', border: '2px solid #D4AF37', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <span style={{ position: 'absolute', top: -12, left: 20, background: '#D4AF37', color: '#0F0F10', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 4, letterSpacing: '.1em' }}>Bundle</span>
              <b style={{ fontSize: 18, fontFamily: "'Libre Caslon Display', serif", margin: '4px 0 6px' }}>{b.name}</b>
              <p style={{ fontSize: 12, color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 10px' }}>{b.audience}</p>
              <p style={{ fontSize: 13, color: '#73777F', lineHeight: 1.5, margin: '0 0 14px' }}>{b.description}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: '#0F0F10' }}>${b.price}</span>
                <span style={{ fontSize: 12, color: '#999' }}>one-time</span>
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#73777F', margin: '0 0 6px' }}>Includes</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px', display: 'grid', gap: 5 }}>
                {b.features?.map((f, i) => (
                  <li key={i} style={{ fontSize: 12, color: '#555', paddingLeft: 16, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#D4AF37' }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 'auto' }}>
                <p style={{ fontSize: 11, color: '#999', margin: '0 0 8px' }}><b>Tools in bundle:</b> {b.tool_ids?.length || 0}</p>
                <button style={{
                  width: '100%', padding: 12, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#0F0F10', border: 0, borderRadius: 6,
                  fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                }}>Get Bundle</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}