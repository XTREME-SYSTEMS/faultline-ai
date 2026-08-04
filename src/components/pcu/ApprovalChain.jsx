import { approvals } from './registryData';

const SEVERITY_COLORS = {
  'Critical': '#C63D34',
  'High': '#B88214',
  'Medium': '#73777F'
};

export default function ApprovalChain() {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, margin: '0 0 4px' }}>Customer & Operator Approval Workflow</h3>
        <p style={{ fontSize: 13, color: '#666', margin: 0 }}>18-step deterministic approval chain from source truth through final release.</p>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {approvals.map((a) => (
          <div key={a.approval_id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
            background: '#fff', border: '1px solid #e5e1da', borderRadius: 8,
            borderLeft: `3px solid ${SEVERITY_COLORS[a.severity] || '#73777F'}`
          }}>
            <div style={{
              flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#999',
              minWidth: 28
            }}>{a.sequence}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <b style={{ fontSize: 13 }}>{a.stage}</b>
                <span style={{
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em',
                  color: SEVERITY_COLORS[a.severity] || '#73777F',
                  background: `${SEVERITY_COLORS[a.severity] || '#73777F'}15`,
                  padding: '2px 6px', borderRadius: 3
                }}>{a.severity}</span>
              </div>
              <p style={{ fontSize: 12, color: '#666', margin: '3px 0 0' }}>{a.acceptance_criteria}</p>
              <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap', fontSize: 11, color: '#999' }}>
                <span>👤 {a.customer_role}</span>
                <span>🔍 {a.internal_reviewer}</span>
                <span>→ {a.unlocks}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}