import { useState } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { products, packages, fulfillment, approvals, automations, modules, personas, decisions, risks, neededEntities, systemMeta } from '@/components/pcu/registryData';
import FulfillmentFlow from '@/components/pcu/FulfillmentFlow';
import ApprovalChain from '@/components/pcu/ApprovalChain';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'products', label: 'Products' },
  { id: 'packages', label: 'Packages' },
  { id: 'fulfillment', label: 'Fulfillment' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'automations', label: 'Automations' },
  { id: 'personas', label: 'Personas' },
  { id: 'decisions', label: 'Decisions & Risks' }
];

const CAT_COLORS = {
  'Brand & Website': '#D4AF37',
  'Lead Generation': '#237A4B',
  'Communications': '#3B82F6',
  'CRM': '#8B5CF6',
  'Estimating': '#EC4899',
  'Operations': '#F59E0B',
  'Content': '#06B6D4',
  'Reviews': '#10B981',
  'Analytics': '#6366F1',
  'Commercial': '#EF4444'
};

const PRIORITY_DOT = {
  'Critical': '#C63D34',
  'High': '#B88214',
  'Medium': '#73777F',
  'Low': '#73777F'
};

export default function PCUControlCenter() {
  const [tab, setTab] = useState('overview');

  const mvpProducts = products.filter(p => p.release === 'MVP');
  const growthProducts = products.filter(p => p.release === 'Growth');

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Xtreme AI Systems · Master Control</p>
          <h1>PCU / XPS Control Center</h1>
          <p>Source-truth control plane for the PCU/Xtreme Polishing System customer commerce and operating platform. Phase: {systemMeta.phase} · {systemMeta.step}.</p>
        </div>
      </div>

      {/* Metrics row */}
      <div className="metrics" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        <article><b>{products.length}</b><span>AI Tools</span><em>{mvpProducts.length} MVP · {growthProducts.length} Growth</em></article>
        <article><b>{packages.length}</b><span>Packages</span><em>Outcome-led</em></article>
        <article><b>{fulfillment.length}</b><span>Fulfillment Steps</span><em>Managed flow</em></article>
        <article><b>{approvals.length}</b><span>Approval Gates</span><em>Human-gated</em></article>
        <article><b>{automations.length}</b><span>Automations</span><em>Event + scheduled</em></article>
        <article><b>{modules.length}</b><span>System Modules</span><em>Full decomposition</em></article>
        <article><b>{neededEntities.length}</b><span>Needed Entities</span><em>Schema design</em></article>
        <article><b>{decisions.filter(d => d.status === 'OPEN').length}</b><span>Open Decisions</span><em style={{ color: '#C63D34' }}>Requires operator</em></article>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #e5e1da', overflowX: 'auto', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '12px 18px', background: 'none', border: 0,
            borderBottom: tab === t.id ? '2px solid #D4AF37' : '2px solid transparent',
            fontSize: 13, fontWeight: 700, color: tab === t.id ? '#0F0F10' : '#73777F',
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap'
          }}>{t.label}</button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 24 }}>
            <h3 style={{ fontSize: 16, margin: '0 0 12px' }}>System Modules</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {modules.slice(0, 12).map(m => (
                <div key={m.module_id} style={{ padding: 14, background: '#f8f7f4', borderRadius: 6, border: '1px solid #e5e1da' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 4 }}>
                    <b style={{ fontSize: 13 }}>{m.name}</b>
                    <span style={{ fontSize: 9, fontWeight: 700, color: PRIORITY_DOT[m.priority] || '#73777F', textTransform: 'uppercase' }}>{m.priority}</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#666', margin: 0, lineHeight: 1.4 }}>{m.purpose}</p>
                  <div style={{ marginTop: 6, fontSize: 10, color: '#999' }}>{m.domain} · {m.surface} · {m.release}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 24 }}>
            <h3 style={{ fontSize: 16, margin: '0 0 12px' }}>Needed Entities (Schema Design Required)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
              {neededEntities.map((e, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#f8f7f4', borderRadius: 6, border: '1px solid #e5e1da' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: PRIORITY_DOT[e.priority] || '#73777F', flexShrink: 0 }} />
                  <div>
                    <b style={{ fontSize: 12 }}>{e.name}</b>
                    <p style={{ fontSize: 10, color: '#999', margin: 0 }}>{e.purpose?.substring(0, 60)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Products tab */}
      {tab === 'products' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {products.map(p => (
            <div key={p.tool_id} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                <b style={{ fontSize: 14 }}>{p.name}</b>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#fff', background: CAT_COLORS[p.category] || '#73777F', padding: '3px 8px', borderRadius: 4 }}>{p.release}</span>
              </div>
              <p style={{ fontSize: 12, color: '#666', margin: '0 0 10px', lineHeight: 1.5 }}>{p.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #f0ede5' }}>
                <div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>${p.setup_price.toLocaleString()}</span>
                  <span style={{ fontSize: 11, color: '#999' }}> setup</span>
                </div>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#666' }}>${p.monthly_price}/mo</span>
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: '#999' }}>{p.category} · {p.revenue_model}</div>
            </div>
          ))}
        </div>
      )}

      {/* Packages tab */}
      {tab === 'packages' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {packages.map(pkg => (
            <div key={pkg.package_id} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 22, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                <b style={{ fontSize: 16 }}>{pkg.name}</b>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#D4AF37', background: '#D4AF3715', padding: '3px 8px', borderRadius: 4 }}>{pkg.tool_ids.length} tools</span>
              </div>
              <p style={{ fontSize: 12, color: '#666', margin: '0 0 4px' }}><b>For:</b> {pkg.audience}</p>
              <p style={{ fontSize: 12, color: '#666', margin: '0 0 12px' }}><b>Outcome:</b> {pkg.outcome}</p>
              <p style={{ fontSize: 12, color: '#666', margin: '0 0 12px', lineHeight: 1.5 }}>{pkg.deliverables}</p>
              <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #f0ede5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div><span style={{ fontSize: 20, fontWeight: 700 }}>${pkg.setup_price.toLocaleString()}</span><span style={{ fontSize: 11, color: '#999' }}> setup</span></div>
                  <div><span style={{ fontSize: 16, fontWeight: 600, color: '#666' }}>${pkg.monthly_price}/mo</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fulfillment tab */}
      {tab === 'fulfillment' && <FulfillmentFlow />}

      {/* Approvals tab */}
      {tab === 'approvals' && <ApprovalChain />}

      {/* Automations tab */}
      {tab === 'automations' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, margin: '0 0 4px' }}>Automation & Workflow Registry</h3>
            <p style={{ fontSize: 13, color: '#666', margin: 0 }}>25 event and scheduled workflows. Protected actions remain approval-gated.</p>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {automations.map(a => (
              <div key={a.automation_id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
                background: '#fff', border: '1px solid #e5e1da', borderRadius: 8
              }}>
                <div style={{ flexShrink: 0, width: 10, height: 10, borderRadius: '50%', background: a.protected_action === 'No' ? '#237A4B' : '#C63D34', marginTop: 4 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{a.workflow}</b>
                    <span style={{ fontSize: 10, color: '#999' }}>{a.automation_id}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#666', margin: '3px 0 0' }}>{a.action}</p>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap', fontSize: 11, color: '#999' }}>
                    <span>Trigger: {a.trigger}</span>
                    <span>Mode: {a.mode}</span>
                    <span>SLA: {a.target_sla}</span>
                    {a.protected_action !== 'No' && <span style={{ color: '#C63D34' }}>Protected: {a.protected_action}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personas tab */}
      {tab === 'personas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {personas.map(p => (
            <div key={p.persona_id} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 18 }}>
              <b style={{ fontSize: 14 }}>{p.name}</b>
              <span style={{ fontSize: 10, color: '#999', marginLeft: 8 }}>{p.business_stage}</span>
              <p style={{ fontSize: 12, color: '#666', margin: '8px 0', lineHeight: 1.5 }}>{p.situation}</p>
              <div style={{ fontSize: 11, color: '#666', display: 'grid', gap: 4 }}>
                <p style={{ margin: 0 }}><b>Goal:</b> {p.desired_outcome}</p>
                <p style={{ margin: 0 }}><b>Pain:</b> {p.pain_points}</p>
                <p style={{ margin: 0 }}><b>First buy:</b> {p.likely_first_purchase}</p>
                <p style={{ margin: 0 }}><b>Upgrades:</b> {p.likely_upgrades}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decisions & Risks tab */}
      {tab === 'decisions' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, margin: '0 0 12px' }}>Open Decisions</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {decisions.map(d => (
                <div key={d.decision_id} style={{ padding: 14, background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, borderLeft: `3px solid ${d.priority === 'Critical' ? '#C63D34' : '#B88214'}` }}>
                  <b style={{ fontSize: 13 }}>{d.decision}</b>
                  <p style={{ fontSize: 11, color: '#999', margin: '4px 0 0' }}>{d.domain} · Required by: {d.required_by}</p>
                  <p style={{ fontSize: 11, color: '#666', margin: '4px 0 0' }}><b>Options:</b> {d.options}</p>
                  <p style={{ fontSize: 11, color: '#D4AF37', margin: '4px 0 0' }}><b>State:</b> {d.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: 16, margin: '0 0 12px' }}>Risk Register</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {risks.map(r => (
                <div key={r.risk_id} style={{ padding: 14, background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, borderLeft: `3px solid ${r.severity === 'Critical' ? '#C63D34' : r.severity === 'High' ? '#B88214' : '#73777F'}` }}>
                  <b style={{ fontSize: 13 }}>{r.risk}</b>
                  <p style={{ fontSize: 11, color: '#999', margin: '4px 0 0' }}>{r.category} · {r.likelihood} likelihood · {r.impact} impact</p>
                  <p style={{ fontSize: 11, color: '#666', margin: '4px 0 0' }}><b>Consequence:</b> {r.consequence}</p>
                  <p style={{ fontSize: 11, color: '#237A4B', margin: '4px 0 0' }}><b>Mitigation:</b> {r.mitigation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}