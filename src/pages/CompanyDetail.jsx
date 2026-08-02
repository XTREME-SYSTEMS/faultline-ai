import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PortalShell from '@/components/fl/PortalShell';
import PageCoach from '@/components/fl/PageCoach';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function CompanyDetail() {
  const { id } = useParams();
  const [data, setData] = useState({ company: null, audits: [], findings: [], snapshots: [], evidence: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deepScanning, setDeepScanning] = useState(false);
  const [deepScanResult, setDeepScanResult] = useState(null);
  const [findingOpps, setFindingOpps] = useState(false);
  const [missingOpps, setMissingOpps] = useState([]);
  const [building, setBuilding] = useState(null);
  const [buildResults, setBuildResults] = useState({});

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

  // Load existing missing opportunities for this company
  useEffect(() => {
    if (!id) return;
    base44.entities.IndustryOpportunity.filter({ company_id: id }, '-created_date', 50)
      .then(setMissingOpps)
      .catch(() => {});
  }, [id]);

  const runDeepScan = async () => {
    setDeepScanning(true); setDeepScanResult(null);
    try {
      const res = await base44.functions.invoke('deepDiscoveryScan', { company_id: id });
      setDeepScanResult(res);
      // Reload findings/snapshots so the rest of the page reflects the new scan
      window.location.reload();
    } catch (e) {
      setDeepScanResult({ error: e.message });
    } finally {
      setDeepScanning(false);
    }
  };

  const findMissingOpps = async () => {
    setFindingOpps(true);
    try {
      await base44.functions.invoke('discoverMissingOpportunities', { company_id: id });
      const opps = await base44.entities.IndustryOpportunity.filter({ company_id: id }, '-created_date', 50);
      setMissingOpps(opps);
    } catch (e) {
      alert('Error finding opportunities: ' + e.message);
    } finally {
      setFindingOpps(false);
    }
  };

  const buildOpportunity = async (opp) => {
    const typeMap = {
      automation: 'ai_operating_system', revenue: 'cost_roi', system_integration: 'ai_operating_system',
      competitive_gap: 'client_proposal', ai_enhancement: 'ai_operating_system',
      marketing_growth: 'website', customer_experience: 'website', operational_efficiency: 'ai_operating_system'
    };
    const deliverableType = typeMap[opp.opportunity_type] || 'client_proposal';
    setBuilding(opp.id);
    try {
      const res = await base44.functions.invoke('generateDeliverable', { company_id: id, deliverable_type: deliverableType });
      setBuildResults(prev => ({ ...prev, [opp.id]: res }));
    } catch (e) {
      setBuildResults(prev => ({ ...prev, [opp.id]: { error: e.message } }));
    } finally {
      setBuilding(null);
    }
  };

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

  const coachContext = {
    company: company?.name, industry: company?.industry, domain: company?.domain,
    healthScore: latestSnapshot?.health_score, auditCount: audits.length,
    findingCount: findings.length, criticalCount: findings.filter(f => f.severity === 'critical').length,
    topFindings: findings.slice(0, 5).map(f => ({ title: f.title, severity: f.severity, category: f.category }))
  };

  return (
    <PortalShell assistant={<PageCoach pageKey="company-detail" context={coachContext} title={company?.name || 'Company'} />}>
      <div className="page-head">
        <div>
          <p className="eyebrow"><Link to="/app/company-discovery" style={{ color: 'var(--gold)' }}>Company Discovery</Link> › Detail</p>
          <h1>{company.name}</h1>
          <p>{company.domain} · {company.industry} · Status: {company.status}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to={`/app/companies/${company.id}/repair-board`} className="btn dark" style={{ fontSize: 13 }}>📋 Repair Board</Link>
          <Link to={`/app/companies/${company.id}/clone`} className="btn dark" style={{ fontSize: 13 }}>🧬 Clone System</Link>
          <Link to={`/app/security-pipeline/${company.id}`} className="btn dark" style={{ fontSize: 13, background: 'linear-gradient(135deg, var(--gold2), var(--gold))', color: '#111' }}>⚡ Full Security Pipeline</Link>
          <button onClick={runDeepScan} disabled={deepScanning} className="btn dark" style={{ fontSize: 13 }}>{deepScanning ? <span className="dot-anim">●●●</span> : '🔬 Deep Discovery'}</button>
          <Link to="/app/client-setup" className="btn outline" style={{ fontSize: 13 }}>Set up client portal →</Link>
          <a href={`/portal/${company.id}`} target="_blank" rel="noopener noreferrer" className="btn gold" style={{ fontSize: 13 }}>
            Open client portal →
          </a>
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

      {/* ===== DEEP DISCOVERY SCAN ===== */}
      <section className="finding" style={{ marginTop: 13, borderColor: 'var(--gold)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>🔬 Deep Discovery Scan</h2>
            <p style={{ color: '#666', fontSize: 13, margin: '4px 0 0' }}>The deepest level of discovery: scrapes every page, fetches JS bundles, detects exposed API keys & secrets, and enumerates all faults.</p>
          </div>
          <button onClick={runDeepScan} disabled={deepScanning} className="btn dark" style={{ fontSize: 13, minWidth: 200 }}>
            {deepScanning ? <span className="dot-anim">●●●</span> : '⚡ Run Deep Discovery'}
          </button>
        </div>
        {deepScanResult?.error && <p style={{ color: '#a52d23', marginTop: 10 }}>{deepScanResult.error}</p>}
        {deepScanResult && !deepScanResult.error && (
          <div style={{ marginTop: 14, padding: 16, background: '#f8f4ea', border: '1px solid var(--gold)', borderRadius: 8 }}>
            <p style={{ margin: 0, fontWeight: 700 }}>Scan complete — page reloading with new findings…</p>
          </div>
        )}
        {deepScanResult === null && !deepScanning && (
          <p style={{ color: '#888', fontSize: 13, marginTop: 10 }}>No deep scan run yet. Click above to discover exposed keys, all page-level faults, and the full leak map.</p>
        )}
      </section>

      {/* ===== EXPOSED KEYS & SECRETS ===== */}
      {findings.filter(f => f.category === 'exposed_secret').length > 0 && (
        <section className="finding" style={{ marginTop: 13, borderColor: '#C63D34' }}>
          <h2 style={{ color: '#C63D34' }}>🔑 Exposed Keys & Secrets ({findings.filter(f => f.category === 'exposed_secret').length})</h2>
          <p style={{ color: '#666', fontSize: 13 }}>These credentials were found publicly visible in the website's source code or JavaScript bundles.</p>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {findings.filter(f => f.category === 'exposed_secret').map((f, i) => {
              const keyMatch = f.description.match(/VISIBLE KEY VALUE: (.+)/);
              const keyValue = keyMatch ? keyMatch[1] : '';
              return (
                <div key={f.id || i} style={{ border: '1px solid #e5c4c0', borderRadius: 8, padding: 14, background: '#fdf6f5' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <b style={{ fontSize: 14 }}>{f.title}</b>
                    <span className={`pill ${f.severity}`}>{f.severity}</span>
                  </div>
                  <div style={{ marginTop: 8, padding: 10, background: '#1a1a1a', color: '#e7c86e', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all', overflowX: 'auto' }}>
                    {keyValue}
                  </div>
                  <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>{f.recommended_repair}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== MISSING OPPORTUNITIES ===== */}
      <section className="finding" style={{ marginTop: 13, borderColor: 'var(--gold)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>🎯 Missing Opportunities ({missingOpps.length})</h2>
            <p style={{ color: '#666', fontSize: 13, margin: '4px 0 0' }}>Every revenue leak, manual process, competitive gap, and AI enhancement this company is missing right now.</p>
          </div>
          <button onClick={findMissingOpps} disabled={findingOpps} className="btn gold" style={{ fontSize: 13, minWidth: 200 }}>
            {findingOpps ? <span className="dot-anim">●●●</span> : '🔍 Find Missing Opportunities'}
          </button>
        </div>
        {missingOpps.length === 0 ? (
          <p style={{ color: '#888', fontSize: 13, marginTop: 12 }}>No opportunities logged yet. Click above to analyze the company and enumerate every missed opportunity.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12, marginTop: 16 }}>
            {missingOpps.map(opp => {
              const result = buildResults[opp.id];
              const isBuilding = building === opp.id;
              return (
                <div key={opp.id} style={{ border: '1px solid #e5e1da', borderRadius: 10, padding: 16, background: '#fff', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <b style={{ fontSize: 14, lineHeight: 1.3 }}>{opp.opportunity_title}</b>
                    <span style={{ background: '#f8f4ea', color: '#8A641C', padding: '3px 8px', borderRadius: 20, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{(opp.opportunity_type || '').replace(/_/g, ' ')}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#666', lineHeight: 1.5, margin: 0 }}>{opp.opportunity_description}</p>
                  <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#888' }}>
                    {opp.revenue_impact_estimate > 0 && <span>💰 ${opp.revenue_impact_estimate.toLocaleString()}/yr</span>}
                    {opp.automation_potential > 0 && <span>🤖 {opp.automation_potential}% automatable</span>}
                  </div>
                  {(opp.pain_points || []).length > 0 && (
                    <div style={{ fontSize: 11, color: '#888' }}>
                      <b>Pain points:</b> {opp.pain_points.join(' · ')}
                    </div>
                  )}
                  {result?.error ? (
                    <p style={{ color: '#a52d23', fontSize: 12, margin: 0 }}>Build error: {result.error}</p>
                  ) : result ? (
                    <div style={{ padding: 10, background: result.qa?.status === 'failed' ? '#fdf6f5' : '#f0f8f0', border: `1px solid ${result.qa?.status === 'failed' ? '#e5c4c0' : '#c4e5c4'}`, borderRadius: 6, fontSize: 12 }}>
                      <b>✅ Built: {result.title}</b><br/>
                      <span style={{ color: '#666' }}>QA: {result.qa ? `${result.qa.status} (${result.qa.score}/100)` : 'skipped'}</span><br/>
                      {result.file_url && <a href={result.file_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', fontWeight: 700 }}>View deliverable →</a>}
                      {result.qa?.status === 'failed' && <span style={{ color: '#C63D34', display: 'block', marginTop: 4 }}>⚠ Needs revision before client delivery</span>}
                    </div>
                  ) : (
                    <button
                      onClick={() => buildOpportunity(opp)}
                      disabled={isBuilding}
                      className="btn dark"
                      style={{ fontSize: 12, marginTop: 'auto' }}
                    >
                      {isBuilding ? <span className="dot-anim">●●●</span> : '🏗️ Build with AI'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p style={{ fontSize: 11, color: '#888', marginTop: 12 }}>💡 For a fully guided, step-by-step build of every opportunity, open the <Link to="/app/chat" style={{ color: 'var(--gold)', fontWeight: 700 }}>AI Chat</Link> and talk to the Guided Build agent.</p>
      </section>
    </PortalShell>
  );
}