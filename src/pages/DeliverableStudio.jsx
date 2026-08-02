import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import PageCoach from '@/components/fl/PageCoach';
import { base44 } from '@/api/base44Client';

const GENERATORS = [
  {
    type: 'client_proposal',
    label: 'Client Proposal',
    icon: '📄',
    description: 'Compiles security scan results and cloning analysis into a professional, ready-to-send proposal document.',
    accent: '#1a1a1a'
  },
  {
    type: 'website',
    label: 'Website Generator',
    icon: '🌐',
    description: 'Generates a complete, production-ready website tailored to the client\'s industry and security profile.',
    accent: '#2563eb'
  },
  {
    type: 'brand',
    label: 'Rebranding System',
    icon: '🎨',
    description: 'Generates a full brand identity system — name, tagline, colors, typography, voice, and positioning.',
    accent: '#5b7a9e'
  },
  {
    type: 'cost_roi',
    label: 'Cost & ROI Generator',
    icon: '📊',
    description: 'Automated cost breakdown and ROI projection with payback period and revenue recovery estimates.',
    accent: '#B88214'
  },
  {
    type: 'ai_operating_system',
    label: 'AI Operating System',
    icon: '⚡',
    description: 'Transforms the client\'s current systems into a complete AI-enhanced operating model with workflows and roadmaps.',
    accent: '#C63D34'
  }
];

export default function DeliverableStudio() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [deliverables, setDeliverables] = useState([]);
  const [generating, setGenerating] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDeliverable, setActiveDeliverable] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [comps, dels] = await Promise.all([
          base44.entities.Company.list('-created_date', 100),
          base44.entities.Deliverable.list('-created_date', 50)
        ]);
        setCompanies(comps);
        setDeliverables(dels);
      } catch (e) { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const generate = async (type) => {
    if (!selectedCompany) { setError('Select a client company first.'); return; }
    setGenerating(type);
    setError(null);
    try {
      const res = await base44.functions.invoke('generateDeliverable', {
        company_id: selectedCompany,
        deliverable_type: type
      });
      const data = res.data || res;
      const updated = await base44.entities.Deliverable.list('-created_date', 50);
      setDeliverables(updated);
      setActiveDeliverable(data.deliverable_id);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
    setGenerating(null);
  };

  const company = companies.find(c => c.id === selectedCompany);
  const recentByType = (type) => deliverables.filter(d => d.deliverable_type === type && d.company_id === selectedCompany);

  const coachContext = {
    selectedCompany: company?.name, companyCount: companies.length,
    deliverablesGenerated: deliverables.length,
    generatorsAvailable: GENERATORS.length
  };

  return (
    <PortalShell assistant={<PageCoach pageKey="module" context={coachContext} title="Deliverable Studio" />}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Automated Deliverables</p>
          <h1>Deliverable Studio</h1>
          <p>Generate professional, client-ready documents from scan results and cloning analysis — proposals, websites, brand systems, cost/ROI reports, and AI operating systems.</p>
        </div>
      </div>

      {/* Company selector */}
      <section className="finding" style={{ marginTop: 13 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 280 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#888' }}>Select client company</label>
            <select
              value={selectedCompany}
              onChange={(e) => { setSelectedCompany(e.target.value); setActiveDeliverable(null); }}
              style={{ padding: '12px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, background: '#fff' }}
            >
              <option value="">Choose a company…</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.industry || 'unknown'}</option>
              ))}
            </select>
          </div>
          {company && (
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666' }}>
              <span>Industry: <b>{company.industry || '—'}</b></span>
              <span>Domain: <b>{company.domain || '—'}</b></span>
            </div>
          )}
        </div>
        {error && <p style={{ color: '#a52d23', marginTop: 12, fontSize: 14 }}>{error}</p>}
      </section>

      {/* Generator cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14, marginTop: 13 }}>
        {GENERATORS.map(gen => (
          <div key={gen.type} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 22, display: 'flex', flexDirection: 'column', borderTop: `3px solid ${gen.accent}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 28 }}>{gen.icon}</span>
              <h3 style={{ margin: 0, fontSize: 17 }}>{gen.label}</h3>
            </div>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, flex: 1 }}>{gen.description}</p>
            <button
              className="btn dark"
              onClick={() => generate(gen.type)}
              disabled={generating === gen.type}
              style={{ marginTop: 14, opacity: generating === gen.type ? 0.6 : 1, background: gen.accent, color: '#fff' }}
            >
              {generating === gen.type ? '⏳ Generating…' : `Generate ${gen.label}`}
            </button>
            {/* Recent deliverables of this type for selected company */}
            {selectedCompany && recentByType(gen.type).length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee' }}>
                <small style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>Recent</small>
                {recentByType(gen.type).slice(0, 2).map(d => (
                  <a key={d.id} href={d.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 12, color: 'var(--gold)', fontWeight: 600, marginTop: 4 }}>
                    ↗ {new Date(d.created_date).toLocaleDateString()} — View document
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* All deliverables for selected company */}
      {selectedCompany && (
        <section className="finding" style={{ marginTop: 13 }}>
          <h2 style={{ fontSize: 18, marginBottom: 15 }}>All deliverables for {company?.name} ({deliverables.filter(d => d.company_id === selectedCompany).length})</h2>
          {deliverables.filter(d => d.company_id === selectedCompany).length === 0 ? (
            <p style={{ color: '#888' }}>No deliverables generated yet for this client. Use the generators above.</p>
          ) : (
            <div className="table">
              <table>
                <thead><tr><th>Type</th><th>Title</th><th>Generated</th><th>Document</th></tr></thead>
                <tbody>
                  {deliverables.filter(d => d.company_id === selectedCompany).map(d => {
                    const gen = GENERATORS.find(g => g.type === d.deliverable_type);
                    return (
                      <tr key={d.id} style={{ background: activeDeliverable === d.id ? '#fdf8ec' : 'transparent' }}>
                        <td><span style={{ fontSize: 16 }}>{gen?.icon}</span> {gen?.label || d.deliverable_type}</td>
                        <td><b>{d.title}</b></td>
                        <td>{new Date(d.created_date).toLocaleString()}</td>
                        <td><a href={d.file_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', fontWeight: 700 }}>View / Download →</a></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {loading && <p style={{ color: '#888', textAlign: 'center', padding: 20 }}>Loading…</p>}
    </PortalShell>
  );
}