import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import PageCoach from '@/components/fl/PageCoach';
import { base44 } from '@/api/base44Client';

const CHECK_TYPES = [
  { key: 'qa_validation', label: 'QA Validation', icon: '🔍', desc: 'Double-check any generated output for problems, gaps, weaknesses, and faults.' },
  { key: 'headless_test', label: 'Headless User Test', icon: '🧪', desc: 'Simulate a user walking through a generated frontend/backend to find broken flows and UX issues.' },
  { key: 'security_compliance', label: 'Security & Compliance', icon: '🛡️', desc: 'Autonomous audit across SOC 2, GDPR, HIPAA, PCI-DSS, CCPA to stay in compliance.' }
];

function StatusPill({ status }) {
  const map = { passed: '#237A4B', warnings: '#B88214', failed: '#C63D34' };
  const bg = { passed: '#e8f5ec', warnings: '#fdf5e0', failed: '#fbe8e6' };
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: map[status], background: bg[status] }}>{status}</span>;
}

function IssueRow({ issue }) {
  const sevColor = { critical: '#C63D34', high: '#B88214', medium: '#7e6b00', low: '#666' };
  return (
    <div style={{ padding: '12px 14px', border: '1px solid #e5e1da', borderRadius: 8, marginBottom: 8, background: '#fff' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#fff', background: sevColor[issue.severity] || '#666' }}>{issue.severity}</span>
        <b style={{ fontSize: 13 }}>{issue.category}</b>
      </div>
      <p style={{ fontSize: 13, color: '#555', margin: '0 0 6px', lineHeight: 1.5 }}>{issue.description}</p>
      <p style={{ fontSize: 12, color: 'var(--gold)', margin: 0, lineHeight: 1.5 }}><b>Fix:</b> {issue.recommendation}</p>
    </div>
  );
}

export default function QADashboard() {
  const [deliverables, setDeliverables] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [activeReport, setActiveReport] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [ds, rs] = await Promise.all([
          base44.entities.Deliverable.list('-created_date', 50),
          base44.entities.QAReport.list('-created_date', 50)
        ]);
        setDeliverables(ds);
        setReports(rs);
      } catch (e) { setError(e.message); }
      setLoading(false);
    })();
  }, []);

  const runCheck = async (checkType) => {
    setRunning(checkType); setError(null); setActiveReport(null);
    try {
      let res;
      if (checkType === 'security_compliance') {
        res = await base44.functions.invoke('securityComplianceCheck', {});
      } else {
        const fn = checkType === 'qa_validation' ? 'qaValidateStep' : 'runHeadlessTest';
        res = await base44.functions.invoke(fn, selectedTarget ? { target_id: selectedTarget } : {});
      }
      const data = res.data || res;
      if (data.error) { setError(data.error); }
      else {
        setActiveReport({ ...data, check_type: checkType });
        const rs = await base44.entities.QAReport.list('-created_date', 50);
        setReports(rs);
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
    setRunning(null);
  };

  const coachContext = { deliverableCount: deliverables.length, reportCount: reports.length, avgScore: reports.length ? Math.round(reports.reduce((a, r) => a + (r.score || 0), 0) / reports.length) : 0 };

  const stats = {
    total: reports.length,
    passed: reports.filter(r => r.status === 'passed').length,
    warnings: reports.filter(r => r.status === 'warnings').length,
    failed: reports.filter(r => r.status === 'failed').length,
    avgScore: reports.length ? Math.round(reports.reduce((a, r) => a + (r.score || 0), 0) / reports.length) : 0
  };

  return (
    <PortalShell assistant={<PageCoach pageKey="module" context={coachContext} title="QA & Compliance" />}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Autonomous Quality & Compliance</p>
          <h1>QA & Validation Center</h1>
          <p>Every step of the process gets double-checked. Run QA validation on any generated output, simulate a user testing the frontend/backend, and audit security & compliance — all autonomously maintained.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="metrics" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <article><small>Total Checks</small><b>{stats.total}</b></article>
        <article><small>Passed</small><b style={{ color: '#237A4B' }}>{stats.passed}</b></article>
        <article><small>Warnings</small><b style={{ color: '#B88214' }}>{stats.warnings}</b></article>
        <article><small>Failed</small><b style={{ color: '#C63D34' }}>{stats.failed}</b></article>
        <article><small>Avg Score</small><b>{stats.avgScore}</b><span>/100</span></article>
      </div>

      {/* Three check cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14, marginTop: 13 }}>
        {CHECK_TYPES.map(c => (
          <div key={c.key} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 10, padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 30 }}>{c.icon}</span>
              <div>
                <b style={{ fontSize: 16 }}>{c.label}</b>
                <p style={{ fontSize: 12, color: '#888', marginTop: 4, lineHeight: 1.5 }}>{c.desc}</p>
              </div>
            </div>
            {c.key !== 'security_compliance' && (
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit' }}
              >
                <option value="">Pick a deliverable to check…</option>
                {deliverables.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            )}
            <button
              className="btn dark"
              onClick={() => runCheck(c.key)}
              disabled={running !== null}
              style={{ opacity: running !== null && running !== c.key ? 0.4 : 1, fontSize: 13, marginTop: 'auto' }}
            >
              {running === c.key ? '⏳ Running check…' : `▶ Run ${c.label}`}
            </button>
          </div>
        ))}
      </div>

      {error && <p style={{ color: '#C63D34', marginTop: 13, fontSize: 14, background: '#fbe8e6', padding: 12, borderRadius: 8 }}>{error}</p>}

      {/* Active result */}
      {activeReport && (
        <section className="finding" style={{ marginTop: 13, background: 'linear-gradient(135deg, #f8f7f4, #fff)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div>
              <p className="eyebrow">{CHECK_TYPES.find(c => c.key === activeReport.check_type)?.label || 'Result'}</p>
              <h2 style={{ font: '400 22px Libre Caslon Display, serif', margin: '4px 0 0' }}>
                Score: {activeReport.score || activeReport.compliance_score || 0}/100
              </h2>
            </div>
            <StatusPill status={activeReport.validation_status || activeReport.test_status || activeReport.compliance_status} />
          </div>
          {activeReport.summary && <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7, marginBottom: 14 }}>{activeReport.summary}</p>}
          {activeReport.framework_status?.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {activeReport.framework_status.map(f => (
                <span key={f.framework} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: f.compliant ? '#e8f5ec' : '#fbe8e6', color: f.compliant ? '#237A4B' : '#C63D34' }}>
                  {f.framework}: {f.compliant ? 'Compliant' : `${f.gaps} gaps`}
                </span>
              ))}
            </div>
          )}
          {activeReport.issues?.length > 0 && (
            <>
              <h3 style={{ fontSize: 15, marginBottom: 10 }}>Issues Found ({activeReport.issues.length})</h3>
              {activeReport.issues.map((issue, i) => <IssueRow key={i} issue={issue} />)}
            </>
          )}
          {activeReport.recommendations?.length > 0 && (
            <>
              <h3 style={{ fontSize: 15, margin: '14px 0 10px' }}>Top Recommendations</h3>
              <ul style={{ fontSize: 13, color: '#555', paddingLeft: 18, lineHeight: 1.8 }}>
                {activeReport.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
              </ul>
            </>
          )}
        </section>
      )}

      {/* Recent reports */}
      <section className="finding" style={{ marginTop: 13 }}>
        <h2 style={{ fontSize: 18, marginBottom: 14 }}>Recent Checks</h2>
        {loading ? <p style={{ color: '#888' }}>Loading…</p> : reports.length === 0 ? <p style={{ color: '#888' }}>No checks run yet. Use the cards above to run your first check.</p> : (
          <div className="table">
            <table>
              <thead><tr><th>Check</th><th>Target</th><th>Score</th><th>Status</th><th>Issues</th><th>Date</th></tr></thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id} onClick={() => setActiveReport({ ...r, validation_status: r.status, test_status: r.status, compliance_status: r.status, check_type: r.check_type, score: r.score, summary: r.summary, issues: r.issues, recommendations: r.recommendations, framework_status: [] })} style={{ cursor: 'pointer' }}>
                    <td><b>{CHECK_TYPES.find(c => c.key === r.check_type)?.label || r.check_type}</b></td>
                    <td>{r.target_title || r.target_type || '—'}</td>
                    <td><b>{r.score ?? '—'}</b></td>
                    <td><StatusPill status={r.status} /></td>
                    <td>{r.issues?.length || 0}</td>
                    <td>{new Date(r.created_date).toLocaleDateString()}</td>
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