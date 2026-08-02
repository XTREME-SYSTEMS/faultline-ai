import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';

export default function AuditTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.AuditTemplate.list('-created_date', 100);
        setTemplates(list);
      } catch (e) { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const filtered = filter === 'all' ? templates : templates.filter(t => t.audit_type === filter);

  const typeColors = {
    security: '#C63D34', performance: '#ea580c', seo: '#16a34a', compliance: '#0891b2',
    revenue_leak: '#7c3aed', full_diagnostic: '#0a0a0a', ai_readiness: '#2563eb'
  };

  if (loading) return <PortalShell><p style={{ padding: 28, color: '#888' }}>Loading templates…</p></PortalShell>;

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Audit Template Marketplace</p>
          <h1>Audit Templates</h1>
          <p>Pre-built audit checklists for specific industries and use cases. Apply a template to any company for instant structured analysis.</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['all', 'security', 'performance', 'seo', 'compliance', 'revenue_leak', 'full_diagnostic', 'ai_readiness'].map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{
              padding: '8px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
              background: filter === t ? '#0a0a0a' : '#fff', color: filter === t ? '#fff' : '#666',
              border: '1px solid #ddd', textTransform: 'capitalize'
            }}
          >
            {t.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <section className="finding">
          <p style={{ color: '#888' }}>No templates yet. Admins can create templates from the Command Center.</p>
        </section>
      ) : (
        <div className="module-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {filtered.map(t => (
            <article key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ position: 'absolute', right: 15, top: 15, color: typeColors[t.audit_type] || '#666', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                {t.audit_type?.replace(/_/g, ' ')}
              </span>
              <h3 style={{ fontSize: 16, margin: 0 }}>{t.name}</h3>
              {t.industry && <small style={{ color: '#888', fontSize: 11 }}>{t.industry}</small>}
              <p style={{ fontSize: 12, color: '#777', flex: 1 }}>{t.description}</p>
              {t.checklist && t.checklist.length > 0 && (
                <div style={{ fontSize: 11, color: '#666' }}>
                  <b>{t.checklist.length} checks:</b> {t.checklist.slice(0, 3).join(', ')}…
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 10, borderTop: '1px solid #eee' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {t.price > 0 ? <b style={{ fontSize: 16 }}>${t.price}</b> : <span style={{ color: '#237A4B', fontWeight: 700, fontSize: 13 }}>Free</span>}
                  {t.uses > 0 && <small style={{ color: '#888', fontSize: 10 }}>{t.uses} uses</small>}
                </div>
                <button className="btn outline" style={{ fontSize: 12, padding: '8px 14px' }}>Use Template →</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </PortalShell>
  );
}