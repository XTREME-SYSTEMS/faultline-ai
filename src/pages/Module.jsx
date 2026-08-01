import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PortalShell from '@/components/fl/PortalShell';
import PageHead from '@/components/fl/PageHead';
import { base44 } from '@/api/base44Client';
import { modules } from '@/components/fl/data';
import RepairPlansView from '@/components/fl/RepairPlansView';
import OutreachView from '@/components/fl/OutreachView';

const moduleDataMap = {
  audits: { entity: 'Audit', sort: '-created_date', limit: 50, columns: [['Title', 'title'], ['Type', 'audit_type'], ['Status', 'status'], ['Date', 'created_date']] },
  'website-intelligence': { entity: 'Audit', filter: { audit_type: 'website_intelligence' }, sort: '-created_date', limit: 50, columns: [['Title', 'title'], ['Status', 'status'], ['Report', 'report_url'], ['Date', 'created_date']] },
  'company-discovery': { entity: 'Company', sort: '-created_date', limit: 50, columns: [['Name', 'name'], ['Domain', 'domain'], ['Industry', 'industry'], ['Status', 'status']] },
  'system-map': { entity: 'SystemNode', sort: '-created_date', limit: 50, columns: [['Name', 'name'], ['Type', 'node_type'], ['Owner', 'owner_role'], ['Health', 'health_status']] },
  'revenue-leaks': { entity: 'Finding', sort: '-created_date', limit: 50, columns: [['Title', 'title'], ['Severity', 'severity'], ['Impact', 'business_impact'], ['Confidence', 'confidence']] },
  'risk-register': { entity: 'Risk', sort: '-created_date', limit: 50, columns: [['Title', 'title'], ['Likelihood', 'likelihood'], ['Impact', 'impact'], ['Status', 'status']] },
  'ai-readiness': { entity: 'Audit', filter: { audit_type: 'ai_readiness' }, sort: '-created_date', limit: 50, columns: [['Title', 'title'], ['Status', 'status'], ['Date', 'created_date']] },
  'repair-plans': { entity: 'RepairPlan', sort: '-created_date', limit: 50, columns: [['Title', 'title'], ['Horizon (days)', 'horizon_days'], ['Status', 'status']] },
  'business-builder': { entity: 'RepairPlan', sort: '-created_date', limit: 50, columns: [['Title', 'title'], ['Horizon (days)', 'horizon_days'], ['Status', 'status']] },
  outreach: { entity: 'OutreachDraft', sort: '-created_date', limit: 50, columns: [['Subject', 'subject'], ['Send Status', 'send_status'], ['Approval', 'approval_status']] },
  leads: { entity: 'Company', filter: { status: 'discovered' }, sort: '-created_date', limit: 50, columns: [['Name', 'name'], ['Domain', 'domain'], ['Industry', 'industry'], ['Status', 'status']] },
  tasks: { entity: 'RepairAction', sort: '-created_date', limit: 50, columns: [['Title', 'title'], ['Priority', 'priority'], ['Status', 'status']] },
  projects: { entity: 'RepairPlan', sort: '-created_date', limit: 50, columns: [['Title', 'title'], ['Horizon (days)', 'horizon_days'], ['Status', 'status']] },
  reports: { entity: 'Audit', filter: { status: 'reported' }, sort: '-created_date', limit: 50, columns: [['Title', 'title'], ['Report', 'report_url'], ['Date', 'created_date']] },
  monitoring: { entity: 'MonitoringRule', sort: '-created_date', limit: 50, columns: [['Name', 'name'], ['Type', 'rule_type'], ['Active', 'active']] },
  team: { entity: 'Membership', sort: '-created_date', limit: 50, columns: [['Role', 'role'], ['User', 'user_id']] },
  integrations: { entity: 'SyncState', sort: '-created_date', limit: 50, columns: [['Last Sync', 'last_sync_at'], ['Direction', 'last_direction'], ['Count', 'last_count']] },
  billing: { entity: 'Receipt', sort: '-created_date', limit: 30, columns: [['System', 'system'], ['Action', 'action'], ['Status', 'status'], ['Date', 'created_date']] },
  settings: { entity: 'Organization', sort: '-created_date', limit: 10, columns: [['Name', 'name'], ['Slug', 'slug']] }
};

const fmtVal = (val) => {
  if (val == null) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T/)) return new Date(val).toLocaleDateString();
  if (typeof val === 'string' && val.startsWith('http')) return <a href={val} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', fontWeight: 700 }}>View →</a>;
  return String(val);
};

export default function Module() {
  const { slug } = useParams();
  const m = modules[slug] || { title: 'Module', eyebrow: 'Operate', description: 'Module preview.', outcomes: [] };
  const config = moduleDataMap[slug];
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!config) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const entity = base44.entities[config.entity];
        if (!entity) throw new Error(`Entity ${config.entity} not found`);
        const results = config.filter
          ? await entity.filter(config.filter, config.sort, config.limit)
          : await entity.list(config.sort, config.limit);
        if (!cancelled) setRecords(results);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  return (
    <PortalShell>
      <PageHead eyebrow={m.eyebrow} title={m.title} text={m.description} />

      {error && (
        <div style={{ background: '#f5d8d5', color: '#a52d23', padding: '14px 18px', borderRadius: 6, marginBottom: 13, border: '1px solid #e3b8b3' }}>
          {error}
        </div>
      )}

      <section className="module-hero">
        <div>
          <p className="eyebrow">Live data</p>
          <h2>{loading ? 'Loading…' : `${records.length} record${records.length === 1 ? '' : 's'}`}</h2>
          <p>{config ? `Showing real ${config.entity} records from your organization.` : 'This module is not yet wired to live data.'}</p>
        </div>
        <div className="module-score">
          <b>{loading ? '—' : records.length}</b>
          <small>records</small>
        </div>
      </section>

      {slug === 'repair-plans' ? (
        <section className="finding" style={{ marginTop: 13 }}>
          <h2>Repair plans</h2>
          <RepairPlansView />
        </section>
      ) : slug === 'outreach' ? (
        <section className="finding" style={{ marginTop: 13 }}>
          <h2>Outreach drafts</h2>
          <OutreachView />
        </section>
      ) : config ? (
        <section className="finding" style={{ marginTop: 13 }}>
          <h2>{config.entity} records</h2>
          {loading ? (
            <p style={{ color: '#888' }}>Loading…</p>
          ) : records.length === 0 ? (
            <p style={{ color: '#888' }}>No records yet. {slug === 'company-discovery' || slug === 'leads' ? 'Run the discovery engine to populate this.' : 'Data will appear here as the pipeline runs.'}</p>
          ) : (
            <div className="table">
              <table>
                <thead>
                  <tr>
                    {config.columns.map(([label]) => <th key={label}>{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {records.map(rec => (
                    <tr key={rec.id}>
                      {config.columns.map(([label, field]) => (
                        <td key={field}>{fmtVal(rec[field])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <div className="module-grid">
          {m.outcomes && m.outcomes.map((x, i) => (
            <article key={x}>
              <span>0{i + 1}</span>
              <h3>{x}</h3>
              <p>This module is configured but not yet wired to live data.</p>
            </article>
          ))}
        </div>
      )}

      <section className="governance">
        <b>Approval and evidence controls are active.</b>
        <p>Material findings require review. Outreach remains draft-only. Production, payments, secrets, and destructive actions remain gated.</p>
      </section>
    </PortalShell>
  );
}