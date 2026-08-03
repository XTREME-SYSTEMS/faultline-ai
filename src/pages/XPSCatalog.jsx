import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';

export default function XPSCatalog() {
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [p, c, s] = await Promise.all([
        base44.entities.ProductCatalogItem.list('-checked_at', 50),
        base44.entities.Course.list('-checked_at', 50),
        base44.entities.ContractorService.list('-checked_at', 50)
      ]);
      setProducts(p);
      setCourses(c);
      setServices(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshCatalog = async () => {
    setRefreshing(true);
    try {
      await base44.functions.invoke('refreshXpsCatalog', {});
      setError('Catalog refresh requested. Prices should be verified before quoting.');
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fmtPrice = (p) => p != null ? `$${p.toLocaleString()}` : '—';

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Xtreme Polishing Systems · Product Catalog</p>
          <h1>XPS Catalog</h1>
          <p>Browse product snapshots, training courses, and contractor service definitions. Prices are snapshots — always verify before quoting.</p>
        </div>
        <button onClick={refreshCatalog} disabled={refreshing} className="btn outline" style={{ fontSize: 13 }}>
          {refreshing ? '⏳ Requesting…' : '↻ Request Refresh'}
        </button>
      </div>

      {error && <div style={{ background: '#fde8e8', color: '#C63D34', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #C7CCD4' }}>
        {[['products', `Products (${products.length})`], ['courses', `Courses (${courses.length})`], ['services', `Services (${services.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '12px 18px', background: 'none', border: 0, borderBottom: tab === key ? '2px solid #D4AF37' : '2px solid transparent',
            fontSize: 13, fontWeight: 700, color: tab === key ? '#0F0F10' : '#73777F', cursor: 'pointer', fontFamily: 'inherit'
          }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#73777F' }}>
          <span className="dot-anim" style={{ fontSize: 24 }}>●</span>
          <p style={{ marginTop: 12 }}>Loading catalog…</p>
        </div>
      ) : tab === 'products' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {products.map(p => (
            <div key={p.id} style={{ background: '#fff', border: '1px solid #C7CCD4', borderRadius: 10, padding: 18 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#D4AF37', background: '#D4AF3715', padding: '3px 8px', borderRadius: 4 }}>{p.category}</span>
              <b style={{ display: 'block', fontSize: 14, margin: '10px 0 8px', lineHeight: 1.4 }}>{p.name}</b>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#0F0F10' }}>{fmtPrice(p.price)}</span>
                {p.compare_at && <span style={{ fontSize: 13, color: '#999', textDecoration: 'line-through' }}>{fmtPrice(p.compare_at)}</span>}
                {p.unit && <span style={{ fontSize: 11, color: '#73777F' }}>/ {p.unit}</span>}
              </div>
              <p style={{ fontSize: 11, color: '#73777F', margin: '8px 0 0', lineHeight: 1.5 }}>{p.notes}</p>
              <p style={{ fontSize: 10, color: '#999', margin: '6px 0 0' }}>Snapshot: {p.checked_at}</p>
            </div>
          ))}
        </div>
      ) : tab === 'courses' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {courses.map(c => (
            <div key={c.id} style={{ background: '#fff', border: '1px solid #C7CCD4', borderRadius: 10, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                <b style={{ fontSize: 15, flex: 1 }}>{c.name}</b>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#D4AF37' }}>{fmtPrice(c.price)}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#73777F', marginBottom: 10 }}>
                <span>⏱ {c.duration}</span>
                <span>📍 {c.location}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {c.topics?.map((t, i) => (
                  <span key={i} style={{ fontSize: 10, background: '#F8F9FB', border: '1px solid #C7CCD4', padding: '2px 8px', borderRadius: 4, color: '#73777F' }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {services.map(s => (
            <div key={s.id} style={{ background: '#fff', border: '1px solid #C7CCD4', borderRadius: 10, padding: 20 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#D4AF37', background: '#D4AF3715', padding: '3px 8px', borderRadius: 4 }}>{s.segment}</span>
              <b style={{ display: 'block', fontSize: 15, margin: '10px 0 8px' }}>{s.name}</b>
              <p style={{ fontSize: 13, color: '#73777F', lineHeight: 1.5, margin: 0 }}>{s.description}</p>
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}