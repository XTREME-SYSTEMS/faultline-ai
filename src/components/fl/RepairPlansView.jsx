import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function RepairPlansView() {
  const [plans, setPlans] = useState([]);
  const [actions, setActions] = useState([]);
  const [leaks, setLeaks] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [plansData, actionsData, leaksData] = await Promise.all([
          base44.entities.RepairPlan.list('-created_date', 50),
          base44.entities.RepairAction.list('-created_date', 200),
          base44.entities.RevenueLeak.list('-created_date', 200)
        ]);
        if (!cancelled) { setPlans(plansData); setActions(actionsData); setLeaks(leaksData); setLoading(false); }
      } catch (e) {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const planActions = (planId) => actions.filter(a => a.repair_plan_id === planId);
  const planImpact = (planId) => {
    const planActions_ = planActions(planId);
    let total = 0;
    for (const a of planActions_) {
      const leak = leaks.find(l => l.finding_id === a.finding_id);
      if (leak) total += leak.annual_impact_max || 0;
    }
    return total;
  };

  if (loading) return <p style={{ color: '#888' }}>Loading repair plans…</p>;
  if (plans.length === 0) return <p style={{ color: '#888' }}>No repair plans yet. They are generated automatically when audits complete.</p>;

  return (
    <div>
      {plans.map(plan => {
        const pa = planActions(plan.id);
        const impact = planImpact(plan.id);
        const isOpen = expanded === plan.id;
        return (
          <article key={plan.id} style={{ background: '#fff', border: '1px solid #ddd', padding: 20, marginBottom: 13, borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : plan.id)}>
              <div>
                <h3 style={{ margin: '0 0 6px' }}>{plan.title}</h3>
                <small style={{ color: '#888' }}>{pa.length} actions · {plan.horizon_days}-day horizon · Status: {plan.status}</small>
              </div>
              <div style={{ textAlign: 'right' }}>
                <b style={{ fontSize: 20, color: 'var(--gold)' }}>${impact.toLocaleString()}</b>
                <small style={{ display: 'block', color: '#888' }}>annual impact</small>
                <span style={{ fontSize: 18 }}>{isOpen ? '−' : '+'}</span>
              </div>
            </div>
            {isOpen && (
              <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 14 }}>
                {pa.length === 0 ? <p style={{ color: '#888' }}>No actions in this plan.</p> : (
                  <table style={{ width: '100%', fontSize: 12 }}>
                    <thead><tr><th style={{ textAlign: 'left', padding: '8px 0' }}>Priority</th><th style={{ textAlign: 'left' }}>Action</th><th style={{ textAlign: 'left' }}>Owner</th><th style={{ textAlign: 'left' }}>Status</th><th style={{ textAlign: 'left' }}>Validation</th></tr></thead>
                    <tbody>
                      {pa.sort((a, b) => (a.priority || 5) - (b.priority || 5)).map(a => (
                        <tr key={a.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '8px 0' }}>P{a.priority}</td>
                          <td><b>{a.title}</b></td>
                          <td>{a.owner_role || '—'}</td>
                          <td><span className={`pill ${a.status === 'completed' ? 'medium' : 'high'}`}>{a.status}</span></td>
                          <td style={{ fontSize: 11, color: '#888' }}>{a.validation_result || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}