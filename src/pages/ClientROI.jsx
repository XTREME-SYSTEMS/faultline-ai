import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';

export default function ClientROI() {
  const [data, setData] = useState({ findings: [], repairActions: [], revenueLeaks: [], snapshots: [], companies: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [findings, repairActions, revenueLeaks, snapshots, companies] = await Promise.all([
          base44.entities.Finding.list('-created_date', 200),
          base44.entities.RepairAction.list('-created_date', 200),
          base44.entities.RevenueLeak.list('-created_date', 200),
          base44.entities.ScanSnapshot.list('-created_date', 200),
          base44.entities.Company.list('-created_date', 200)
        ]);
        setData({ findings, repairActions, revenueLeaks, snapshots, companies });
      } catch (e) { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  // Calculate ROI metrics
  const totalFindings = data.findings.length;
  const resolvedActions = data.repairActions.filter(ra => ra.status === 'resolved').length;
  const totalActions = data.repairActions.length;
  const resolutionRate = totalActions > 0 ? Math.round((resolvedActions / totalActions) * 100) : 0;

  // Revenue leak impact
  const totalLeakMin = data.revenueLeaks.reduce((sum, l) => sum + (l.annual_impact_min || 0), 0);
  const totalLeakMax = data.revenueLeaks.reduce((sum, l) => sum + (l.annual_impact_max || 0), 0);
  const resolvedLeakMin = data.revenueLeaks
    .filter(l => data.repairActions.some(ra => ra.finding_id === l.finding_id && ra.status === 'resolved'))
    .reduce((sum, l) => sum + (l.annual_impact_min || 0), 0);
  const resolvedLeakMax = data.revenueLeaks
    .filter(l => data.repairActions.some(ra => ra.finding_id === l.finding_id && ra.status === 'resolved'))
    .reduce((sum, l) => sum + (l.annual_impact_max || 0), 0);

  // Score progression
  const scoreProgress = data.snapshots
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    .slice(-10)
    .map(s => ({ date: new Date(s.created_date).toLocaleDateString(), score: s.health_score || 0 }));

  const firstScore = scoreProgress[0]?.score || 0;
  const latestScore = scoreProgress[scoreProgress.length - 1]?.score || 0;
  const scoreImprovement = latestScore - firstScore;

  if (loading) return <PortalShell><p style={{ padding: 28, color: '#888' }}>Loading ROI dashboard…</p></PortalShell>;

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Client ROI & Retention</p>
          <h1>ROI Dashboard</h1>
          <p>Proof that the platform saves money. Findings identified → repairs completed → revenue leak recovered → dollar impact delivered.</p>
        </div>
      </div>

      {/* Top metrics */}
      <div className="metrics" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <article>
          <small>Findings Identified</small>
          <b>{totalFindings}</b>
          <span>across all audits</span>
        </article>
        <article>
          <small>Repairs Completed</small>
          <b>{resolvedActions}</b>
          <span>of {totalActions} actions ({resolutionRate}%)</span>
        </article>
        <article>
          <small>Revenue Leak Identified</small>
          <b>${(totalLeakMin / 1000).toFixed(0)}K–${(totalLeakMax / 1000).toFixed(0)}K</b>
          <span>annual exposure</span>
        </article>
        <article style={{ borderTop: '3px solid #237A4B' }}>
          <small>Revenue Recovered</small>
          <b style={{ color: '#237A4B' }}>${(resolvedLeakMin / 1000).toFixed(0)}K–${(resolvedLeakMax / 1000).toFixed(0)}K</b>
          <span>from resolved repairs</span>
        </article>
        <article>
          <small>Health Score Change</small>
          <b style={{ color: scoreImprovement >= 0 ? '#237A4B' : '#C63D34' }}>{scoreImprovement >= 0 ? '+' : ''}{scoreImprovement}</b>
          <span>{firstScore} → {latestScore}</span>
        </article>
      </div>

      {/* Score progression chart */}
      <section className="finding" style={{ marginTop: 13 }}>
        <h2 style={{ fontSize: 18, marginBottom: 15 }}>📈 Health Score Progression</h2>
        {scoreProgress.length === 0 ? (
          <p style={{ color: '#888' }}>No scan data yet. Run a security pipeline to start tracking score progression.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'end', gap: 8, height: 180, padding: '10px 0' }}>
            {scoreProgress.map((s, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <b style={{ fontSize: 11 }}>{s.score}</b>
                <div style={{
                  width: '100%', maxWidth: 40,
                  height: `${Math.max(5, s.score)}%`,
                  background: `linear-gradient(${s.score >= 80 ? '#237A4B' : s.score >= 60 ? '#d9b46f' : '#C63D34'}, #eee2d0)`,
                  borderRadius: '4px 4px 0 0'
                }} />
                <small style={{ fontSize: 9, color: '#888' }}>{s.date}</small>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ROI breakdown */}
      <section className="finding" style={{ marginTop: 13 }}>
        <h2 style={{ fontSize: 18, marginBottom: 15 }}>💰 Revenue Impact Breakdown</h2>
        <div className="table">
          <table>
            <thead>
              <tr><th>Leak Category</th><th>Annual Impact (Min)</th><th>Annual Impact (Max)</th><th>Status</th><th>Recovered?</th></tr>
            </thead>
            <tbody>
              {data.revenueLeaks.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888' }}>No revenue leaks quantified yet. Run quantifyFindings on an audit.</td></tr>
              ) : (
                data.revenueLeaks.map(l => {
                  const action = data.repairActions.find(ra => ra.finding_id === l.finding_id);
                  const isResolved = action?.status === 'resolved';
                  return (
                    <tr key={l.id}>
                      <td><b>{l.category || 'Unknown'}</b></td>
                      <td>${(l.annual_impact_min || 0).toLocaleString()}</td>
                      <td>${(l.annual_impact_max || 0).toLocaleString()}</td>
                      <td><span className={`pill ${isResolved ? 'medium' : 'high'}`}>{action?.status || 'identified'}</span></td>
                      <td>{isResolved ? <span style={{ color: '#237A4B', fontWeight: 700 }}>✓ Yes</span> : <span style={{ color: '#888' }}>—</span>}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Before/After comparison */}
      <section className="finding" style={{ marginTop: 13 }}>
        <h2 style={{ fontSize: 18, marginBottom: 15 }}>🔄 Before / After Comparison</h2>
        {scoreProgress.length < 2 ? (
          <p style={{ color: '#888' }}>Need at least 2 scans to show comparison. Run a re-scan to see improvement over time.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ padding: 20, background: '#f7f7f5', borderRadius: 8, border: '1px solid #e5e1da' }}>
              <h3 style={{ fontSize: 14, color: '#888', marginBottom: 10 }}>BEFORE (First Scan)</h3>
              <b style={{ font: '400 36px Libre Caslon Display, serif' }}>{firstScore}</b>
              <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>{scoreProgress[0].date}</p>
            </div>
            <div style={{ padding: 20, background: '#f0f9f3', borderRadius: 8, border: '1px solid #c3e6cb' }}>
              <h3 style={{ fontSize: 14, color: '#237A4B', marginBottom: 10 }}>AFTER (Latest Scan)</h3>
              <b style={{ font: '400 36px Libre Caslon Display, serif', color: '#237A4B' }}>{latestScore}</b>
              <p style={{ fontSize: 12, color: '#237A4B', marginTop: 8 }}>{scoreProgress[scoreProgress.length - 1].date} ({scoreImprovement >= 0 ? '+' : ''}{scoreImprovement} points)</p>
            </div>
          </div>
        )}
      </section>
    </PortalShell>
  );
}