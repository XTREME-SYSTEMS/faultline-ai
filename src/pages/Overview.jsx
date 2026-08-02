import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalShell from '@/components/fl/PortalShell';
import PageHead from '@/components/fl/PageHead';
import { base44 } from '@/api/base44Client';

export default function Overview() {
  const navigate = useNavigate();
  const [data, setData] = useState({ companies: [], audits: [], findings: [], receipts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [setupNeeded, setSetupNeeded] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('getPortalData', {});
      const { companies = [], audits = [], findings = [], receipts = [] } = res.data || {};
      setData({ companies, audits, findings, receipts });
      // Check if setup wizard has been completed
      try {
        const configs = await base44.entities.SystemConfig.filter({ organization_id: res.data?.orgId });
        const cfg = configs[0];
        if (!cfg || !cfg.setup_complete) setSetupNeeded(true);
      } catch {}
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const criticalCount = data.findings.filter(f => f.severity === 'critical').length;
  const highCount = data.findings.filter(f => f.severity === 'high').length;
  const reportedCount = data.audits.filter(a => a.status === 'reported').length;
  const pendingScanCount = data.companies.filter(c => c.status === 'discovered').length;
  const scannedCount = data.companies.filter(c => c.status === 'scanned').length;

  // Health score: start at 100, subtract for critical/high findings
  const healthScore = Math.max(0, 100 - (criticalCount * 8) - (highCount * 4));

  const metrics = [
    ['Companies discovered', data.companies.length, `${scannedCount} scanned`, pendingScanCount > 0 ? `+${pendingScanCount} pending` : 'All scanned'],
    ['Audits completed', data.audits.filter(a => a.status === 'completed' || a.status === 'reported').length, `${data.audits.length} total audits`, `+${data.audits.length}`],
    ['Critical findings', criticalCount, `${highCount} high severity`, criticalCount > 0 ? `-${criticalCount}` : 'None'],
    ['Reports generated', reportedCount, 'Executive reports ready', `+${reportedCount}`],
    ['Total findings', data.findings.length, 'Across all audits', `+${data.findings.length}`],
    ['Pipeline runs', data.receipts.length, 'Recent activity', `+${data.receipts.length}`]
  ];

  const recentFindings = data.findings.slice(0, 6);
  const recentReceipts = data.receipts.slice(0, 8);

  return (
    <PortalShell assistant>
      <PageHead eyebrow="Business operating system" title="Welcome back." text="Live pipeline status — discovered companies, scanned websites, findings, and generated reports." onAction={() => navigate('/app/discovery-engine')} actionLabel="Start workflow →" />

      {error && (
        <div style={{ background: '#f5d8d5', color: '#a52d23', padding: '14px 18px', borderRadius: 6, marginBottom: 13, border: '1px solid #e3b8b3' }}>
          {error}
        </div>
      )}

      {setupNeeded && (
        <div style={{
          background: 'radial-gradient(circle at 90% 20%, rgba(200,155,60,.2), transparent 50%), #0a0a0a',
          color: '#fff', borderRadius: 12, padding: '24px 28px', marginBottom: 20,
          border: '1px solid #59411e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap'
        }}>
          <div>
            <p className="eyebrow" style={{ color: 'var(--gold2)', margin: '0 0 6px' }}>First time here?</p>
            <h2 style={{ font: '400 26px Libre Caslon Display, serif', margin: '0 0 4px', letterSpacing: '-.02em' }}>
              Let's build your system with AI
            </h2>
            <p style={{ color: '#aaa', fontSize: 14, margin: 0, maxWidth: 560 }}>
              Our AI coach will guide you step-by-step — company profile, target market, discovery engine, automation, email drafts, and diagnostics.
            </p>
          </div>
          <button onClick={() => navigate('/app/setup')} className="btn gold" style={{ fontSize: 15, padding: '15px 26px' }}>
            Start guided setup →
          </button>
        </div>
      )}

      <div className="metrics">
        {metrics.map(([l, v, d, t]) => (
          <article key={l}>
            <small>{l}</small>
            <b>{loading ? '—' : v}</b>
            <span>{d}</span>
            <em>{t}</em>
          </article>
        ))}
      </div>

      <div className="dashboard">
        <article className="wide">
          <h3>Business health score</h3>
          <div className="health">
            <div className="ring" style={{ borderColor: healthScore > 70 ? '#d9b46f' : healthScore > 40 ? '#e7c46e' : '#e0846e' }}>
              <b>{loading ? '—' : healthScore}</b>
              <small>/100</small>
            </div>
            <ul>
              <li>Critical findings <b>{criticalCount}</b></li>
              <li>High findings <b>{highCount}</b></li>
              <li>Companies scanned <b>{scannedCount}</b></li>
              <li>Reports ready <b>{reportedCount}</b></li>
            </ul>
          </div>
        </article>
        <article>
          <h3>Findings by severity</h3>
          <b className="big">{data.findings.length}</b>
          <p>Total findings identified</p>
          <div className="bars">
            {[
              { h: criticalCount * 15, c: '#e0846e' },
              { h: highCount * 15, c: '#e7c46e' },
              { h: data.findings.filter(f => f.severity === 'medium').length * 15, c: '#d9d46e' },
              { h: data.findings.filter(f => f.severity === 'low').length * 15, c: '#a8d9b8' }
            ].map((bar, i) => (
              <i key={i} style={{ height: `${Math.min(bar.h, 100)}%`, background: bar.c }} />
            ))}
          </div>
        </article>
        <article className="wide">
          <h3>Recent pipeline activity</h3>
          {recentReceipts.length === 0 ? (
            <p style={{ color: '#888' }}>No activity yet. The discovery engine runs daily at 9am.</p>
          ) : (
            <ul className="repair">
              {recentReceipts.map(r => (
                <li key={r.id}>
                  <span>{r.system}: {r.summary}</span>
                  <b>{new Date(r.created_date).toLocaleDateString()}</b>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article>
          <h3>Scan status</h3>
          <ul className="repair">
            <li>Discovered <b>{data.companies.length}</b></li>
            <li>Scanned <b>{scannedCount}</b></li>
            <li>Pending <b>{pendingScanCount}</b></li>
            <li>Reports <b>{reportedCount}</b></li>
          </ul>
        </article>
      </div>

      <section className="finding">
        <h2>Highest-impact findings</h2>
        {loading ? (
          <p style={{ color: '#888' }}>Loading findings…</p>
        ) : recentFindings.length === 0 ? (
          <p style={{ color: '#888' }}>No findings yet. Run the discovery engine to start scanning companies.</p>
        ) : (
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>Finding</th>
                  <th>Severity</th>
                  <th>Evidence</th>
                  <th>Confidence</th>
                  <th>Category</th>
                  <th>Impact</th>
                </tr>
              </thead>
              <tbody>
                {recentFindings.map(f => (
                  <tr key={f.id}>
                    <td><b>{f.title}</b><small>{f.id}</small></td>
                    <td><span className={`pill ${f.severity}`}>{f.severity}</span></td>
                    <td>{f.evidence_state}</td>
                    <td>{f.confidence}%</td>
                    <td>{f.category}</td>
                    <td>{f.business_impact}</td>
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