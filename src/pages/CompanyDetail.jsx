import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function CompanyDetail() {
  const { id } = useParams();
  const [data, setData] = useState({ company: null, audits: [], findings: [], snapshots: [], evidence: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const company = await base44.entities.Company.get(id);
        const audits = await base44.entities.Audit.filter({ company_id: id }, '-created_date', 50);
        const snapshots = await base44.entities.ScanSnapshot.filter({ company_id: id }, '-scanned_at', 50);
        let allFindings = [];
        let allEvidence = [];
        for (const a of audits) {
          const fs = await base44.entities.Finding.filter({ audit_id: a.id }, '-created_date', 50);
          allFindings = allFindings.concat(fs);
          const ev = await base44.entities.Evidence.filter({ audit_id: a.id }, '-created_date', 20);
          allEvidence = allEvidence.concat(ev);
        }
        if (!cancelled) {
          setData({ company, audits, findings: allFindings, snapshots, evidence: allEvidence });
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) { setError(e.message); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <PortalShell><p style={{ padding: 28, color: '#888' }}>Loading company…</p></PortalShell>;
  if (error) return <PortalShell><p style={{ padding: 28, color: '#a52d23' }}>{error}</p></PortalShell>;
  if (!data.company) return <PortalShell><p style={{ padding: 28, color: '#888' }}>Company not found.</p></PortalShell>;

  const { company, audits, findings, snapshots, evidence } = data;
  const chartData = [...snapshots].reverse().map(s => ({
    date: new Date(s.scanned_at).toLocaleDateString(),
    score: s.health_score,
    findings: s.finding_count,
    critical: s.critical_count
  }));
  const latestSnapshot = snapshots[0];
  const competitors = company.competitor_scores || {};
  const competitorEntries = Object.entries(competitors);

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow"><Link to="/app/company-discovery" style={{ color: 'var(--gold)' }}>Company Discovery</Link> › Detail</p>
          <h1>{company.name}</h1>
          <p>{company.domain} · {company.industry} · Status: {company.status}</p>
        </div>
      </div>

      <div className="metrics" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <article><small>Health Score</small><b>{latestSnapshot?.health_score ?? '—'}</b><span>/100</span></article>
        <article><small>Total Findings</small><b>{findings.length}</b><span>across {audits.length} audits</span></article>
        <article><small>Critical Findings</small><b>{findings.filter(f => f.severity === 'critical').length}</b><span>needs attention</span></article>
        <article><small>Scans Run</small><b>{snapshots.length}</b><span>over time</span></article>
      </div>

      {chartData.length > 0 && (
        <section className="finding" style={{ marginTop: 13 }}>
          <h2>Score progression</h2>
          <div style={{ height: 280, padding: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#C89B3C" strokeWidth={2} name="Health Score" />
                <Line type="monotone" dataKey="findings" stroke="#888" strokeWidth={1} name="Findings" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {competitorEntries.length > 0 && (
        <section className="finding" style={{ marginTop: 13 }}>
          <h2>Competitor benchmarks</h2>
          <div className="table">
            <table>
              <thead><tr><th>Competitor</th><th>Score</th><th>Tech Stack</th><th>Notes</th></tr></thead>
              <tbody>
                {competitorEntries.map(([name, data]) => (
                  <tr key={name}>
                    <td><b>{name}</b><small>{data.url}</small></td>
                    <td><b style={{ fontSize: 18 }}>{data.score}</b></td>
                    <td>{(data.tech_stack || []).join(', ') || '—'}</td>
                    <td>{(data.notes || []).join('; ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="finding" style={{ marginTop: 13 }}>
        <h2>Audit history ({audits.length})</h2>
        {audits.length === 0 ? <p style={{ color: '#888' }}>No audits yet.</p> : (
          <div className="table">
            <table>
              <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Report</th><th>Date</th></tr></thead>
              <tbody>
                {audits.map(a => (
                  <tr key={a.id}>
                    <td><b>{a.title}</b></td>
                    <td>{a.audit_type}</td>
                    <td><span className={`pill ${a.status === 'completed' || a.status === 'analyzed' ? 'medium' : 'high'}`}>{a.status}</span></td>
                    <td>{a.report_url ? <a href={a.report_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', fontWeight: 700 }}>View →</a> : '—'}</td>
                    <td>{new Date(a.created_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="finding" style={{ marginTop: 13 }}>
        <h2>Findings ({findings.length})</h2>
        {findings.length === 0 ? <p style={{ color: '#888' }}>No findings yet.</p> : (
          <div className="table">
            <table>
              <thead><tr><th>Finding</th><th>Severity</th><th>Category</th><th>Confidence</th><th>Impact</th></tr></thead>
              <tbody>
                {findings.map(f => (
                  <tr key={f.id}>
                    <td><b>{f.title}</b><small>{f.description?.substring(0, 80)}…</small></td>
                    <td><span className={`pill ${f.severity}`}>{f.severity}</span></td>
                    <td>{f.category}</td>
                    <td>{f.confidence}%</td>
                    <td>{f.business_impact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="finding" style={{ marginTop: 13 }}>
        <h2>Evidence ({evidence.length})</h2>
        {evidence.length === 0 ? <p style={{ color: '#888' }}>No evidence collected yet.</p> : (
          <div className="table">
            <table>
              <thead><tr><th>Source</th><th>Type</th><th>Summary</th><th>Captured</th></tr></thead>
              <tbody>
                {evidence.map(e => (
                  <tr key={e.id}>
                    <td><b>{e.source_uri}</b></td>
                    <td>{e.source_type}</td>
                    <td>{e.content_summary}</td>
                    <td>{new Date(e.captured_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PortalShell>
  );
}