import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';

export default function ImplementationMarketplace() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.ImplementationService.list('-created_date', 100);
        setServices(list);
      } catch (e) { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const checkout = async (serviceId) => {
    // Check if running in iframe
    if (window.self !== window.top) {
      alert('Checkout works only from a published app. Please open this page in a new tab.');
      return;
    }
    setCheckingOut(serviceId);
    setError(null);
    try {
      const res = await base44.functions.invoke('createImplementationCheckout', { service_id: serviceId });
      const data = res.data || res;
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setError(data.error || 'Checkout failed');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setCheckingOut(null);
    }
  };

  const categoryColors = {
    security: '#C63D34', analytics: '#2563eb', seo: '#16a34a', performance: '#ea580c',
    automation: '#7c3aed', branding: '#db2777', compliance: '#0891b2', custom: '#666'
  };

  if (loading) return <PortalShell><p style={{ padding: 28, color: '#888' }}>Loading marketplace…</p></PortalShell>;

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Implementation Marketplace</p>
          <h1>Done-For-You Services</h1>
          <p>Browse implementation services that fix the findings from your audits. One-click checkout, done by FaultLine AI experts.</p>
        </div>
      </div>

      {error && <p style={{ color: '#a52d23', marginBottom: 13 }}>{error}</p>}

      {services.length === 0 ? (
        <section className="finding">
          <p style={{ color: '#888' }}>No implementation services available yet. Admins can add services from the Command Center.</p>
        </section>
      ) : (
        <div className="module-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {services.map(s => (
            <article key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ position: 'absolute', right: 15, top: 15, color: categoryColors[s.category] || '#666', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                {s.category}
              </span>
              <h3 style={{ fontSize: 16, margin: 0 }}>{s.title}</h3>
              <p style={{ fontSize: 12, color: '#777', flex: 1 }}>{s.description}</p>
              {s.deliverables && s.deliverables.length > 0 && (
                <ul style={{ fontSize: 11, color: '#666', paddingLeft: 16, margin: 0 }}>
                  {s.deliverables.slice(0, 3).map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 10, borderTop: '1px solid #eee' }}>
                <b style={{ font: '400 24px Libre Caslon Display, serif' }}>${s.price?.toLocaleString()}</b>
                <button
                  className="btn dark"
                  onClick={() => checkout(s.id)}
                  disabled={checkingOut === s.id}
                  style={{ fontSize: 12, padding: '10px 16px' }}
                >
                  {checkingOut === s.id ? '⏳ Redirecting…' : 'Buy Now →'}
                </button>
              </div>
              {s.purchases > 0 && <small style={{ color: '#888', fontSize: 10 }}>{s.purchases} purchased</small>}
            </article>
          ))}
        </div>
      )}
    </PortalShell>
  );
}