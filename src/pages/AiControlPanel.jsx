import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import PageCoach from '@/components/fl/PageCoach';
import { base44 } from '@/api/base44Client';

export default function AiControlPanel() {
  const [data, setData] = useState({ receipts: [], workflows: [], monitoringRules: [], proposals: [], outreach: [], companies: [], audits: [], findings: [] });
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState(null);
  const [actionResult, setActionResult] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [receipts, monitoringRules, proposals, outreach, companies, audits, findings] = await Promise.all([
        base44.entities.Receipt.list('-created_date', 30),
        base44.entities.MonitoringRule.list('-created_date', 50),
        base44.entities.SecurityProposal.list('-created_date', 20),
        base44.entities.OutreachDraft.list('-created_date', 20),
        base44.entities.Company.list('-created_date', 50),
        base44.entities.Audit.list('-created_date', 20),
        base44.entities.Finding.list('-created_date', 50)
      ]);
      setData({ receipts, monitoringRules, proposals, outreach, companies, audits, findings });
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pendingOutreach = data.outreach.filter(o => o.approval_status === 'pending');
  const pendingProposals = data.proposals.filter(p => p.status === 'draft');
  const activeMonitoring = data.monitoringRules.filter(r => r.active);
  const recentActivity = data.receipts.slice(0, 15);
  const pipelineRuns = data.receipts.filter(r => r.system === 'security_pipeline');
  const scanRuns = data.receipts.filter(r => r.system === 'security_scanner');
  const oppRuns = data.receipts.filter(r => r.system === 'opportunity_finder');
  const bpRuns = data.receipts.filter(r => r.system === 'enhancement_generator');

  const approveOutreach = async (id) => {
    setAction(`approving-${id}`);
    try {
      await base44.entities.OutreachDraft.update(id, { approval_status: 'approved', send_status: 'approved_for_send' });
      await load();
    } catch (e) { setActionResult({ error: e.message }); }
    setAction(null);
  };

  const toggleMonitoring = async (rule) => {
    setAction(`toggle-${rule.id}`);
    try {
      await base44.entities.MonitoringRule.update(rule.id, { active: !rule.active });
      await load();
    } catch (e) { /* ignore */ }
    setAction(null);
  };

  const runRescan = async (companyId) => {
    setAction(`rescan-${companyId}`);
    try {
      await base44.functions.invoke('deepSecurityScan', { company_id: companyId });
      await load();
      setActionResult({ success: 'Rescan triggered successfully' });
    } catch (e) { setActionResult({ error: e.message }); }
    setAction(null);
  };

  const coachContext = {
    totalCompanies: data.companies.length,
    totalAudits: data.audits.length,
    totalFindings: data.findings.length,
    pendingOutreach: pendingOutreach.length,
    pendingProposals: pendingProposals.length,
    activeMonitoring: activeMonitoring.length,
    pipelineRuns: pipelineRuns.length,
    recentActivity: recentActivity.length
  };

  return (
    <PortalShell assistant={<PageCoach pageKey="admin" context={coachContext} title="AI Control Panel" />}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Operator Control Center</p>
          <h1>AI Control Panel</h1>
          <p>Command center for the entire FaultLine AI system. Monitor all automated pipelines, approve pending actions, control monitoring rules, trigger rescans, and track every AI activity in real time.</p>
        </div>
        <button className="btn dark" onClick={load} disabled={loading} style={{ fontSize: 13 }}>
          {loading ? '⏳ Syncing…' : '↻ Refresh Status'}
        </button>
      </div>

      {actionResult?.error && <p style={{ color: '#a52d23', padding: '8px 14px', background: '#fdf0f0', borderRadius: 6, fontSize: 13, marginBottom: 13 }}>{actionResult.error}</p>}
      {actionResult?.success && <p style={{ color: '#237A4B', padding: '8px 14px', background: '#f0f9f3', borderRadius: 6, fontSize: 13, marginBottom: 13 }}>{actionResult.success}</p>}

      {/* System overview metrics */}
      <div className="metrics" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        <article><small>Companies Tracked</small><b>{data.companies.length}</b><span>in pipeline</span></article>
        <article><small>Active Audits</small><b>{data.audits.length}</b><span>total runs</span></article>
        <article><small>Findings</small><b>{data.findings.length}</b><span>discovered</span></article>
        <article><small>Pipeline Runs</small><b>{pipelineRuns.length}</b><span>full 20-step</span></article>
        <article><small>Monitoring Rules</small><b>{activeMonitoring.length}</b><span>active</span></article>
        <article><small>Pending Approvals</small><b style={{ color: pendingOutreach.length + pendingProposals.length > 0 ? '#B88214' : '#111' }}>{pendingOutreach.length + pendingProposals.length}</b><span>awaiting review</span></article>
      </div>

      {/* Pending approvals */}
      <section className="finding" style={{ marginTop: 13 }}>
        <h2 style={{ fontSize: 18, marginBottom: 15 }}>⏳ Pending approvals ({pendingOutreach.length + pendingProposals.length})</h2>
        {pendingOutreach.length === 0 && pendingProposals.length === 0 ? (
          <p style={{ color: '#888' }}>No pending approvals. All actions are clear.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {pendingOutreach.map(o => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, background: '#fffbeb', border: '1px solid #f5e6c8', borderRadius: 6 }}>
                <div>
                  <b style={{ fontSize: 13 }}>{o.subject}</b><br/>
                  <small style={{ color: '#888', fontSize: 11 }}>Outreach draft · {o.body?.substring(0, 100)}…</small>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn dark" onClick={() => approveOutreach(o.id)} disabled={action === `approving-${o.id}`} style={{ fontSize: 12, padding: '8px 14px' }}>
                    {action === `approving-${o.id}` ? '⏳' : '✓ Approve'}
                  </button>
                </div>
              </div>
            ))}
            {pendingProposals.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, background: '#fffbeb', border: '1px solid #f5e6c8', borderRadius: 6 }}>
                <div>
                  <b style={{ fontSize: 13 }}>Proposal · ${p.total_price?.toLocaleString()} ({p.recommended_plan})</b><br/>
                  <small style={{ color: '#888', fontSize: 11 }}>Health: {p.original_health_score} → {p.enhanced_health_score} · {p.resolved_findings_count} findings resolved</small>
                </div>
                <span className="pill medium" style={{ fontWeight: 700 }}>Draft — review in pipeline</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick actions */}
      <section className="finding" style={{ marginTop: 13 }}>
        <h2 style={{ fontSize: 18, marginBottom: 15 }}>⚡ Quick actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {data.companies.slice(0, 6).map(c => (
            <div key={c.id} style={{ padding: 14, background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 6 }}>
              <b style={{ fontSize: 13 }}>{c.name}</b><br/>
              <small style={{ color: '#888', fontSize: 11 }}>{c.industry || 'General'}</small>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button className="btn outline" onClick={() => runRescan(c.id)} disabled={action === `rescan-${c.id}`} style={{ fontSize: 11, padding: '6px 10px' }}>
                  {action === `rescan-${c.id}` ? '⏳' : '🔍 Rescan'}
                </button>
                <a href={`/app/security-pipeline/${c.id}`} className="btn dark" style={{ fontSize: 11, padding: '6px 10px' }}>⚡ Pipeline</a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Monitoring rules control */}
      <section className="finding" style={{ marginTop: 13 }}>
        <h2 style={{ fontSize: 18, marginBottom: 15 }}>🎛️ Monitoring rules ({data.monitoringRules.length})</h2>
        {data.monitoringRules.length === 0 ? (
          <p style={{ color: '#888' }}>No monitoring rules configured. Run a security pipeline to auto-create monitoring rules.</p>
        ) : (
          <div className="table">
            <table>
              <thead><tr><th>Rule Name</th><th>Type</th><th>Status</th><th>Toggle</th></tr></thead>
              <tbody>
                {data.monitoringRules.map(r => (
                  <tr key={r.id}>
                    <td><b>{r.name}</b></td>
                    <td>{r.rule_type}</td>
                    <td><span className={`pill ${r.active ? 'medium' : 'high'}`}>{r.active ? 'Active' : 'Paused'}</span></td>
                    <td>
                      <button
                        onClick={() => toggleMonitoring(r)}
                        disabled={action === `toggle-${r.id}`}
                        style={{ padding: '4px 12px', borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${r.active ? '#C63D34' : '#237A4B'}`, background: r.active ? '#fff' : '#237A4B', color: r.active ? '#C63D34' : '#fff' }}
                      >
                        {action === `toggle-${r.id}` ? '⏳' : r.active ? 'Pause' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* AI activity log */}
      <section className="finding" style={{ marginTop: 13 }}>
        <h2 style={{ fontSize: 18, marginBottom: 15 }}>📊 AI activity log (last 15 actions)</h2>
        {recentActivity.length === 0 ? (
          <p style={{ color: '#888' }}>No AI activity yet. Run a pipeline or scan to see activity here.</p>
        ) : (
          <div className="table">
            <table>
              <thead><tr><th>System</th><th>Action</th><th>Status</th><th>Summary</th><th>Time</th></tr></thead>
              <tbody>
                {recentActivity.map(r => (
                  <tr key={r.id}>
                    <td><b>{r.system}</b></td>
                    <td>{r.action}</td>
                    <td><span className={`pill ${r.status === 'success' ? 'medium' : 'high'}`}>{r.status}</span></td>
                    <td style={{ maxWidth: 400 }}>{r.summary}</td>
                    <td>{new Date(r.created_date).toLocaleString()}</td>
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