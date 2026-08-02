import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';

export default function CompetitiveIntel() {
  const [data, setData] = useState({ companies: [], snapshots: [], benchmarks: null });
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [companies, snapshots] = await Promise.all([
          base44.entities.Company.list('-created_date', 200),
          base44.entities.ScanSnapshot.list('-created_date', 200)
        ]);
        setData({ companies, snapshots, benchmarks: null });
      } catch (e) { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  // Group snapshots by company and get latest score
  const companyScores = {};
  for (const s of data.snapshots) {
    if (!companyScores[s.company_id] || new Date(s.created_date) > new Date(companyScores[s.company_id].date)) {
      companyScores[s.company_id] = { score: s.health_score || 0, date: s.created_date, findings: s.finding_count || 0, critical: s.critical_count || 0 };
    }
  }

  // Merge with competitor_scores from Company entity
  const ranked = data.companies.map(c => {
    const snap = companyScores[c.id] || {};
    const compScores = c.competitor_scores || {};
    return {
      id: c.id,
      name: c.name,
      industry: c.industry || '—',
      domain: c.domain || '—',
      score: snap.score || compScores.health_score || 0,
      findings: snap.findings || 0,
      critical: snap.critical || 0,
      lastScan: snap.date || c.created_date
    };
  }).sort((a, b) => b.score - a.score);

  const runBenchmark = async () => {
    setScanning(true);
    try {
      const res = await base44.functions.invoke('computeIndustryBenchmarks', {});
      setResult(res.data || res);
    } catch (e) { /* ignore */ }
    setScanning(false);
  };

  if (loading) return <PortalShell><p style={{ padding: 28, color: '#888' }}>Loading competitive intelligence…</p></PortalShell>;

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Competitive Intelligence</p>
          <h1>Industry Benchmark Dashboard</h1>
          <p>See how every company in your pipeline scores against the industry average. Spot who's falling behind and who's leading.</p>
        </div>
        <button className="btn dark" onClick={runBenchmark} disabled={scanning}>
          {scanning ? '⏳ Computing…' : '▶ Recompute Benchmarks'}
        </button>
      </div>

      {/* Benchmark summary */}
      {result?.benchmark && (
        <div className="metrics" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <article>
            <small>Industry Average</small>
            <b>{result.benchmark.average}</b>
            <span>across {result.scored_companies} companies</span>
          </article>
          <article>
            <small>Median Score</small>
            <b>{result.benchmark.median}</b>
            <span>middle of the pack</span>
          </article>
          <article style={{ borderTop: '3px solid #237A4B' }}>
            <small>Top Quartile</small>
            <b style={{ color: '#237A4B' }}>{result.benchmark.top_quartile}</b>
            <span>best performers</span>
          </article>
          <article style={{ borderTop: '3px solid #C63D34' }}>
            <small>Bottom Quartile</small>
            <b style={{ color: '#C63D34' }}>{result.benchmark.bottom_quartile}</b>
            <span>needs the most help</span>
          </article>
        </div>
      )}

      {/* Ranked company list */}
      <section className="finding" style={{ marginTop: 13 }}>
        <h2 style={{ fontSize: 18, marginBottom: 15 }}>🏆 Company Rankings</h2>
        <div className="table">
          <table>
            <thead>
              <tr><th>Rank</th><th>Company</th><th>Industry</th><th>Health Score</th><th>Findings</th><th>Critical</th><th>Status</th></tr>
            </thead>
            <tbody>
              {ranked.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: '#888' }}>No companies yet. Run discovery to add companies.</td></tr>
              ) : (
                ranked.map((c, i) => (
                  <tr key={c.id}>
                    <td><b>#{i + 1}</b></td>
                    <td><b>{c.name}</b><small>{c.domain}</small></td>
                    <td>{c.industry}</td>
                    <td>
                      <b style={{ color: c.score >= 80 ? '#237A4B' : c.score >= 60 ? '#d9b46f' : '#C63D34' }}>{c.score}</b>
                    </td>
                    <td>{c.findings}</td>
                    <td>{c.critical > 0 ? <span className="pill critical">{c.critical} critical</span> : '—'}</td>
                    <td>
                      {c.score >= 80 ? <span className="pill medium">Leading</span> :
                       c.score >= 60 ? <span className="pill high">Average</span> :
                       <span className="pill critical">Falling behind</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Distribution chart */}
      {result?.benchmark?.distribution && (
        <section className="finding" style={{ marginTop: 13 }}>
          <h2 style={{ fontSize: 18, marginBottom: 15 }}>📊 Score Distribution</h2>
          <div style={{ display: 'flex', alignItems: 'end', gap: 4, height: 160, padding: '10px 0' }}>
            {result.benchmark.distribution.map((score, i) => (
              <div key={i} style={{
                flex: 1, minWidth: 8,
                height: `${Math.max(5, score)}%`,
                background: score >= 80 ? '#237A4B' : score >= 60 ? '#d9b46f' : '#C63D34',
                borderRadius: '3px 3px 0 0',
                opacity: 0.7
              }} title={`Score: ${score}`} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#888', marginTop: 4 }}>
            <span>0</span><span>50</span><span>100</span>
          </div>
        </section>
      )}
    </PortalShell>
  );
}