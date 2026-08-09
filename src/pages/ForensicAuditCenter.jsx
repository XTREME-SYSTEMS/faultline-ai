import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export default function ForensicAuditCenter() {
  const [sites, setSites] = useState([]);
  const [reports, setReports] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const [healEnabled, setHealEnabled] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allProjects, qaReports, batchReceipts] = await Promise.all([
        base44.entities.LaunchProject.list('-created_date', 200),
        base44.entities.QAReport.filter({ target_type: 'website' }, '-created_date', 100),
        base44.entities.Receipt.filter({ system: 'batch_forensic_audit' }, '-created_date', 10)
      ]);

      // Deduplicate projects by vercel_deployment_url (keep newest)
      const urlMap = {};
      for (const p of allProjects) {
        if (!p.vercel_deployment_url || p.project_type !== 'website') continue;
        const url = p.vercel_deployment_url;
        if (!urlMap[url] || new Date(p.created_date) > new Date(urlMap[url].created_date)) {
          urlMap[url] = p;
        }
      }
      const uniqueSites = Object.values(urlMap).sort((a, b) => (b.parity_score || 0) - (a.parity_score || 0));

      // Map latest QA report per site
      const reportMap = {};
      for (const r of qaReports) {
        if (!r.target_id) continue;
        if (!reportMap[r.target_id] || new Date(r.created_date) > new Date(reportMap[r.target_id].created_date)) {
          reportMap[r.target_id] = r;
        }
      }

      setSites(uniqueSites.map(s => ({ ...s, latestReport: reportMap[s.id] || null })));
      setReports(qaReports);
      setReceipts(batchReceipts);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const runBatch = async (heal) => {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await base44.functions.invoke('batchForensicAudit', {
        heal,
        max_sites: 30,
        max_heal_sites: 10,
        parallel_batch_size: 3
      });
      const data = res?.data || res;
      setRunResult(data);
      await loadData();
    } catch (e) {
      setRunResult({ error: e.message });
    }
    setRunning(false);
  };

  const passed = sites.filter(s => (s.parity_score || 0) >= 100).length;
  const failing = sites.filter(s => (s.parity_score || 0) < 100).length;
  const avgScore = sites.length > 0
    ? Math.round(sites.reduce((sum, s) => sum + (s.parity_score || 0), 0) / sites.length)
    : 0;

  return (
    <div className="portal-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Forensic Audit</p>
          <h1>Forensic Audit Center</h1>
          <p style={{ color: '#666', fontSize: 16, maxWidth: 700 }}>
            Deep forensic audit of all cloned websites — identify gaps, heal to 100/100, write proof scores.
          </p>
        </div>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#666' }}>
          <input
            type="checkbox"
            checked={healEnabled}
            onChange={(e) => setHealEnabled(e.target.checked)}
            disabled={running}
          />
          Auto-heal sites below 100
        </label>
        <button
          className="btn dark"
          onClick={() => runBatch(healEnabled)}
          disabled={running}
          style={{ opacity: running ? 0.6 : 1 }}
        >
          {running ? 'Running…' : (healEnabled ? 'Run Full Audit + Heal' : 'Run Audit Only')}
        </button>
        <button
          className="btn outline"
          onClick={loadData}
          disabled={loading || running}
          style={{ opacity: loading || running ? 0.6 : 1 }}
        >
          Refresh
        </button>
      </div>

      {/* Run result */}
      {runResult && (
        <div style={{
          background: runResult.error ? '#f5d8d5' : '#e8f5e9',
          border: `1px solid ${runResult.error ? '#a52d23' : '#237A4B'}`,
          borderRadius: 8, padding: 16, marginBottom: 20, fontSize: 13
        }}>
          {runResult.error ? (
            <span style={{ color: '#a52d23' }}>Error: {runResult.error}</span>
          ) : (
            <span style={{ color: '#237A4B' }}>
              ✓ Audit complete — {runResult.total_audited} sites audited, {runResult.passed_initial} passed initial, {runResult.healed_to_100} healed to 100, {runResult.still_failing} still failing
            </span>
          )}
        </div>
      )}

      {/* Summary metrics */}
      <div className="metrics" style={{ marginBottom: 24 }}>
        <article>
          <span>Total Cloned Sites</span>
          <b>{sites.length}</b>
          <em>deployed & live</em>
        </article>
        <article>
          <span>Passed (100/100)</span>
          <b style={{ color: '#237A4B' }}>{passed}</b>
          <em style={{ color: '#237A4B' }}>visual + operational</em>
        </article>
        <article>
          <span>Below 100</span>
          <b style={{ color: '#C63D34' }}>{failing}</b>
          <em style={{ color: '#C63D34' }}>gaps identified</em>
        </article>
        <article>
          <span>Average Score</span>
          <b>{avgScore}</b>
          <em>across all sites</em>
        </article>
        <article>
          <span>QA Reports</span>
          <b>{reports.length}</b>
          <em>proof records</em>
        </article>
        <article>
          <span>Batch Runs</span>
          <b>{receipts.length}</b>
          <em>audit history</em>
        </article>
      </div>

      {/* Sites table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>Loading cloned sites…</div>
      ) : sites.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
          No cloned websites found. Deploy some sites first via the Website Generator or Autonomous Clone pipeline.
        </div>
      ) : (
        <div className="table" style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr style={{ background: '#f7f7f5' }}>
                <th>Site</th>
                <th>Score</th>
                <th>Status</th>
                <th>Gaps</th>
                <th>Last Audit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sites.map(site => {
                const score = site.parity_score || 0;
                const report = site.latestReport;
                const gaps = report?.issues || [];
                const isOpen = expanded === site.id;
                return (
                  <>
                    <tr key={site.id} style={{ cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : site.id)}>
                      <td>
                        <b>{site.project_name}</b>
                        <small>
                          <a href={site.vercel_deployment_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: '#C89B3C' }}>
                            {site.vercel_deployment_url?.replace('https://', '')}
                          </a>
                        </small>
                      </td>
                      <td>
                        <b style={{
                          color: score >= 100 ? '#237A4B' : score >= 70 ? '#B88214' : '#C63D34',
                          fontSize: 18
                        }}>
                          {score}/100
                        </b>
                        {report && (
                          <small>v={report.summary?.match(/visual=(\d+)/)?.[1] || '?'} o={report.summary?.match(/operational=(\d+)/)?.[1] || '?'}</small>
                        )}
                      </td>
                      <td>
                        <span className={`pill ${score >= 100 ? '' : score >= 70 ? 'medium' : 'critical'}`}
                          style={{
                            background: score >= 100 ? '#e8f5e9' : score >= 70 ? '#f4edca' : '#f5d8d5',
                            color: score >= 100 ? '#237A4B' : score >= 70 ? '#7e6b00' : '#a52d23'
                          }}>
                          {score >= 100 ? 'PASSED' : score >= 70 ? 'NEEDS WORK' : 'FAILING'}
                        </span>
                      </td>
                      <td>{gaps.length} gap{gaps.length !== 1 ? 's' : ''}</td>
                      <td><small>{report ? new Date(report.created_date).toLocaleString() : 'Never'}</small></td>
                      <td><small style={{ color: '#999' }}>{isOpen ? '▲' : '▼'}</small></td>
                    </tr>
                    {isOpen && (
                      <tr key={site.id + '-detail'}>
                        <td colSpan={6} style={{ background: '#faf9f7', padding: 20 }}>
                          {gaps.length === 0 ? (
                            <div style={{ color: '#237A4B', fontSize: 13 }}>
                              ✓ No gaps identified — site is at 100/100 visual + operational parity.
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: '#C63D34' }}>
                                Identified Gaps ({gaps.length}):
                              </div>
                              <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
                                {gaps.map((gap, i) => (
                                  <li key={i} style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>
                                    <b style={{ color: '#111' }}>{gap.category || 'Parity'}:</b> {gap.description}
                                    {gap.recommendation && (
                                      <span style={{ color: '#888' }}> → {gap.recommendation}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {site.metadata?.target_url && (
                            <div style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
                              <b>Target:</b> {site.metadata.target_url}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Batch history */}
      {receipts.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h3 style={{ font: '400 24px Libre Caslon Display, serif', marginBottom: 16 }}>Batch Run History</h3>
          <div className="table" style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr style={{ background: '#f7f7f5' }}>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map(r => (
                  <tr key={r.id}>
                    <td><small>{new Date(r.created_date).toLocaleString()}</small></td>
                    <td>
                      <span className="pill" style={{
                        background: r.status === 'success' ? '#e8f5e9' : '#f4edca',
                        color: r.status === 'success' ? '#237A4B' : '#7e6b00'
                      }}>
                        {r.status?.toUpperCase()}
                      </span>
                    </td>
                    <td><small>{r.summary}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}