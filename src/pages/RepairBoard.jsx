import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PortalShell from '@/components/fl/PortalShell';
import PageCoach from '@/components/fl/PageCoach';
import { base44 } from '@/api/base44Client';

const COLUMNS = [
  { key: 'identified', label: 'Identified', color: '#C63D34' },
  { key: 'in_progress', label: 'In Progress', color: '#B88214' },
  { key: 'in_review', label: 'In Review', color: '#5b7a9e' },
  { key: 'resolved', label: 'Resolved', color: '#237A4B' },
  { key: 'deferred', label: 'Deferred', color: '#888' }
];

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

export default function RepairBoard() {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [findings, setFindings] = useState([]);
  const [repairActions, setRepairActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await base44.entities.Company.get(id);
        const audits = await base44.entities.Audit.filter({ company_id: id }, '-created_date', 50);
        let allFindings = [];
        for (const a of audits) {
          const fs = await base44.entities.Finding.filter({ audit_id: a.id }, '-created_date', 100);
          allFindings = allFindings.concat(fs);
        }
        // Repair actions are linked via repair_plan_id -> audit_id; fetch by org then filter
        const allActions = await base44.entities.RepairAction.list('-created_date', 200);
        const auditIds = new Set(audits.map(a => a.id));
        const planIds = new Set();
        // We don't have repair plans here, but repair actions may carry finding_id
        const findingIds = new Set(allFindings.map(f => f.id));
        const linked = allActions.filter(
          ra => (ra.finding_id && findingIds.has(ra.finding_id))
        );
        if (!cancelled) {
          setCompany(c);
          setFindings(allFindings);
          setRepairActions(linked);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) { setError(e.message); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Build a unified card list: each finding becomes a card with a status.
  // Status comes from a linked RepairAction if present, else defaults to 'identified'.
  const cards = findings.map(f => {
    const action = repairActions.find(ra => ra.finding_id === f.id);
    return {
      id: f.id,
      title: f.title,
      severity: f.severity,
      category: f.category,
      confidence: f.confidence,
      business_impact: f.business_impact,
      recommended_repair: f.recommended_repair,
      status: action?.status || 'identified',
      repair_action_id: action?.id
    };
  }).sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9));

  const grouped = {};
  for (const col of COLUMNS) grouped[col.key] = [];
  for (const card of cards) {
    if (grouped[card.status]) grouped[card.status].push(card);
    else grouped['identified'].push({ ...card, status: 'identified' });
  }

  const counts = COLUMNS.reduce((acc, col) => {
    acc[col.key] = grouped[col.key].length;
    return acc;
  }, {});
  const total = cards.length;
  const resolvedPct = total > 0 ? Math.round((counts.resolved / total) * 100) : 0;

  const updateStatus = async (findingId, newStatus) => {
    setSaving(findingId);
    try {
      const existing = repairActions.find(ra => ra.finding_id === findingId);
      if (existing) {
        await base44.entities.RepairAction.update(existing.id, { status: newStatus });
        setRepairActions(prev => prev.map(ra => ra.id === existing.id ? { ...ra, status: newStatus } : ra));
      } else {
        // Need a repair_plan_id (required). Create a lightweight plan tied to the finding's audit.
        const finding = findings.find(f => f.id === findingId);
        const auditId = finding?.audit_id;
        let plan = await base44.entities.RepairPlan.filter({ audit_id: auditId }, '-created_date', 1);
        let planId = plan[0]?.id;
        if (!planId) {
          const newPlan = await base44.entities.RepairPlan.create({
            organization_id: company.organization_id,
            audit_id: auditId,
            title: `Repair plan — ${company.name}`,
            horizon_days: 90,
            status: 'active'
          });
          planId = newPlan.id;
        }
        const created = await base44.entities.RepairAction.create({
          organization_id: company.organization_id,
          repair_plan_id: planId,
          finding_id: findingId,
          title: finding?.title || 'Repair task',
          status: newStatus
        });
        setRepairActions(prev => [...prev, created]);
      }
      // Update local card status
      setFindings(prev => prev.map(f => f.id === findingId ? f : f));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  };

  const onDrop = (status) => {
    if (draggedId) {
      updateStatus(draggedId, status);
      setDraggedId(null);
    }
  };

  if (loading) return <PortalShell><p style={{ padding: 28, color: '#888' }}>Loading repair board…</p></PortalShell>;
  if (error) return <PortalShell><p style={{ padding: 28, color: '#a52d23' }}>{error}</p></PortalShell>;
  if (!company) return <PortalShell><p style={{ padding: 28, color: '#888' }}>Company not found.</p></PortalShell>;

  const coachContext = {
    company: company.name, totalFindings: total, resolved: counts.resolved,
    inProgress: counts.in_progress, critical: cards.filter(c => c.severity === 'critical').length,
    resolvedPct
  };

  return (
    <PortalShell assistant={<PageCoach pageKey="company-detail" context={coachContext} title={`Repair Board — ${company.name}`} />}>
      <div className="page-head">
        <div>
          <p className="eyebrow"><Link to={`/app/companies/${company.id}`} style={{ color: 'var(--gold)' }}>{company.name}</Link> › Repair Board</p>
          <h1>Repair Status Board</h1>
          <p>Visual tracking of every identified security leak and system gap. Drag cards across columns to update repair progress.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ width: 120, height: 120, borderRadius: '50%', border: '12px solid #d9b46f', display: 'grid', placeItems: 'center', margin: '0 0 8px auto' }}>
            <b style={{ font: '400 32px Libre Caslon Display, serif' }}>{resolvedPct}%</b>
          </div>
          <small style={{ color: '#888' }}>{counts.resolved} of {total} resolved</small>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="metrics" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {COLUMNS.map(col => (
          <article key={col.key} style={{ borderTop: `3px solid ${col.color}` }}>
            <small>{col.label}</small>
            <b style={{ font: '400 28px Libre Caslon Display, serif', margin: '6px 0' }}>{counts[col.key]}</b>
            <span>{total > 0 ? Math.round((counts[col.key] / total) * 100) : 0}% of findings</span>
          </article>
        ))}
      </div>

      {/* Kanban board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginTop: 20, alignItems: 'start' }}>
        {COLUMNS.map(col => (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(col.key)}
            style={{
              background: '#f7f7f5', border: '1px solid #e5e1da', borderRadius: 8,
              minHeight: 400, padding: 12, display: 'flex', flexDirection: 'column', gap: 10
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: `2px solid ${col.color}` }}>
              <b style={{ fontSize: 13 }}>{col.label}</b>
              <span style={{ background: col.color, color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{counts[col.key]}</span>
            </div>
            {grouped[col.key].length === 0 ? (
              <p style={{ color: '#bbb', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No items</p>
            ) : (
              grouped[col.key].map(card => (
                <div
                  key={card.id}
              draggable
              onDragStart={() => setDraggedId(card.id)}
                  style={{
                    background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: 12,
                    cursor: 'grab', opacity: draggedId === card.id ? 0.4 : 1,
                    boxShadow: '0 2px 6px #0000000a'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <span className={`pill ${card.severity}`} style={{ fontWeight: 700 }}>{card.severity}</span>
                    {saving === card.id && <small style={{ color: 'var(--gold)' }}>saving…</small>}
                  </div>
                  <b style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>{card.title}</b>
                  {card.category && <small style={{ color: '#888', display: 'block', marginBottom: 4 }}>{card.category}</small>}
                  {card.business_impact && <p style={{ fontSize: 11, color: '#666', lineHeight: 1.4, margin: '4px 0 0' }}>{card.business_impact}</p>}
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      {total === 0 && (
        <p style={{ color: '#888', textAlign: 'center', padding: 30 }}>
          No findings yet for this client. Run a security scan or pipeline to identify security leaks and system gaps.
        </p>
      )}
    </PortalShell>
  );
}