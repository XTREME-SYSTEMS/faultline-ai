import { useState, useEffect, useCallback } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, AlertCircle, Send, Eye, ExternalLink, ChevronDown, ChevronRight, FileText, MessageSquare, SkipForward, Upload } from 'lucide-react';

const STATUS_META = {
  discovery: { label: 'Discovery', color: '#8A641C', bg: '#C89B3C20' },
  in_review: { label: 'Awaiting Client', color: '#B88214', bg: '#f8e5ce' },
  in_progress: { label: 'In Progress', color: '#8A641C', bg: '#C89B3C20' },
  approved: { label: 'Approved', color: '#237A4B', bg: '#e6f4ec' },
  completed: { label: 'Completed', color: '#237A4B', bg: '#e6f4ec' },
  paused: { label: 'Paused', color: '#888', bg: '#eee' }
};

const SERVICE_ICONS = { website: '🌐', app: '📱', ai_tool: '🤖', ai_company: '🏢' };

export default function ClientPortal() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pipeline');
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('clientWorkflowEngine', { action: 'listProjects' });
      if (res.data?.error) throw new Error(res.data.error);
      setProjects(res.data?.projects || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const unsub = base44.entities.ClientProject.subscribe(() => load());
    return unsub;
  }, [load]);

  const loadDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await base44.functions.invoke('clientWorkflowEngine', { action: 'getProjectDetail', project_id: id });
      if (res.data?.error) throw new Error(res.data.error);
      setDetail(res.data);
    } catch (e) { console.error(e); }
    setDetailLoading(false);
  };

  const toggle = (id) => {
    const isOpen = expanded === id;
    setExpanded(isOpen ? null : id);
    if (!isOpen) loadDetail(id);
  };

  const assignDeliverable = async (projectId, deliverableId) => {
    try {
      await base44.functions.invoke('clientWorkflowEngine', { action: 'assignDeliverable', project_id: projectId, deliverable_id: deliverableId || null });
      loadDetail(projectId);
      load();
    } catch (e) { alert(e.message); }
  };

  const advanceGate = async (projectId) => {
    if (!confirm('Advance this gate without client review? This is an operator override.')) return;
    try {
      await base44.functions.invoke('clientWorkflowEngine', { action: 'advanceGate', project_id: projectId });
      loadDetail(projectId);
      load();
    } catch (e) { alert(e.message); }
  };

  // Approval queue: projects where operator action is needed
  const approvalQueue = projects.filter(p => {
    // Needs operator action if: in_progress (need to prepare deliverable) or has fix_requested reviews
    if (p.status === 'completed') return false;
    return p.status === 'in_progress' || p.status === 'discovery';
  });

  const stats = {
    total: projects.length,
    discovery: projects.filter(p => p.status === 'discovery').length,
    awaitingClient: projects.filter(p => p.status === 'in_review').length,
    needsOperator: approvalQueue.length,
    completed: projects.filter(p => p.status === 'completed').length
  };

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Client Delivery</p>
          <h1>Customer Portal & Approval Gates</h1>
          <p>The full client experience — discovery, gate-by-gate approvals, deliverable reviews, and upsell checkout. Manage every project, assign deliverables, advance gates, and test the flow end-to-end.</p>
        </div>
        <Link to="/app/client-projects" className="btn outline" style={{ padding: '12px 20px', fontSize: 13 }}>+ New Project</Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          ['Total', stats.total, '#0a0a0a'],
          ['In Discovery', stats.discovery, '#8A641C'],
          ['Needs Operator', stats.needsOperator, '#C63D34'],
          ['Awaiting Client', stats.awaitingClient, '#B88214'],
          ['Completed', stats.completed, '#237A4B']
        ].map(([label, count, color]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 10, padding: 18 }}>
            <b style={{ font: '400 28px Libre Caslon Display, serif', display: 'block', color }}>{count}</b>
            <small style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</small>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e5e1da', marginBottom: 20 }}>
        {[
          ['pipeline', 'Pipeline'],
          ['queue', `Approval Queue${stats.needsOperator ? ` (${stats.needsOperator})` : ''}`],
          ['gates', 'Gate System'],
          ['test', 'Test Center']
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '12px 18px', border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13, fontWeight: 600, color: tab === key ? '#0a0a0a' : '#888',
            borderBottom: `2px solid ${tab === key ? 'var(--gold)' : 'transparent'}`, marginBottom: -2
          }}>{label}</button>
        ))}
      </div>

      {tab === 'pipeline' && (
        <PipelineView projects={projects} loading={loading} expanded={expanded} toggle={toggle}
          detail={detail} detailLoading={detailLoading} assignDeliverable={assignDeliverable} advanceGate={advanceGate} />
      )}

      {tab === 'queue' && (
        <QueueView queue={approvalQueue} loading={loading} expanded={expanded} toggle={toggle}
          detail={detail} detailLoading={detailLoading} assignDeliverable={assignDeliverable} advanceGate={advanceGate} />
      )}

      {tab === 'gates' && <GateSystemView />}
      {tab === 'test' && <TestCenter />}
    </PortalShell>
  );
}

function PipelineView({ projects, loading, expanded, toggle, detail, detailLoading, assignDeliverable, advanceGate }) {
  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#888' }}>Loading projects…</div>;
  if (projects.length === 0) return <EmptyState />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {projects.map(p => (
        <ProjectRow key={p.id} project={p} expanded={expanded === p.id} toggle={() => toggle(p.id)}
          detail={detail} detailLoading={detailLoading} assignDeliverable={assignDeliverable} advanceGate={advanceGate} />
      ))}
    </div>
  );
}

function QueueView({ queue, loading, expanded, toggle, detail, detailLoading, assignDeliverable, advanceGate }) {
  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#888' }}>Loading…</div>;
  if (queue.length === 0) return (
    <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: 40, textAlign: 'center' }}>
      <CheckCircle2 size={32} style={{ color: '#237A4B', margin: '0 auto 12px' }} />
      <b style={{ fontSize: 16 }}>No items waiting for operator action</b>
      <p style={{ color: '#888', fontSize: 13, marginTop: 6 }}>All projects are either awaiting client review or completed.</p>
    </div>
  );
  return (
    <div>
      <div style={{ background: '#f5d8d5', border: '1px solid #e3b8b3', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13, color: '#a52d23' }}>
        <b>⚠ {queue.length} project{queue.length > 1 ? 's' : ''} need your action.</b> Prepare a deliverable and mark it ready for client review, or advance the gate manually.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {queue.map(p => (
          <ProjectRow key={p.id} project={p} expanded={expanded === p.id} toggle={() => toggle(p.id)}
            detail={detail} detailLoading={detailLoading} assignDeliverable={assignDeliverable} advanceGate={advanceGate} />
        ))}
      </div>
    </div>
  );
}

function ProjectRow({ project, expanded, toggle, detail, detailLoading, assignDeliverable, advanceGate }) {
  const sm = STATUS_META[project.status] || STATUS_META.discovery;
  const gates = project.gates || [];
  const gateIndex = project.gate_index || 0;
  const currentGate = gates[gateIndex];
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', cursor: 'pointer' }} onClick={toggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
          <span style={{ fontSize: 24 }}>{SERVICE_ICONS[project.service_type] || '📁'}</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <b style={{ fontSize: 14 }}>{project.project_name}</b>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, color: sm.color, background: sm.bg, textTransform: 'uppercase', letterSpacing: '.06em' }}>{sm.label}</span>
            </div>
            <p style={{ fontSize: 11, color: '#888', margin: '3px 0 0' }}>{project.client_name || 'No client name'} · Gate {gateIndex + 1}/{gates.length || 8}{currentGate ? ` · ${currentGate.replace(/_/g, ' ')}` : ''}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {gates.slice(0, 8).map((g, i) => (
            <div key={i} title={g.replace(/_/g, ' ')} style={{ width: 24, height: 5, borderRadius: 3, background: i < gateIndex || project.status === 'completed' ? '#237A4B' : i === gateIndex ? 'var(--gold)' : '#e5e1da' }} />
          ))}
          {expanded ? <ChevronDown size={16} style={{ color: '#aaa', marginLeft: 6 }} /> : <ChevronRight size={16} style={{ color: '#aaa', marginLeft: 6 }} />}
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #eee', padding: '20px' }}>
          {detailLoading ? (
            <p style={{ color: '#888', fontSize: 13, textAlign: 'center', padding: 20 }}>Loading details…</p>
          ) : detail && detail.project?.id === project.id ? (
            <ProjectDetail data={detail} assignDeliverable={assignDeliverable} advanceGate={advanceGate} />
          ) : (
            <p style={{ color: '#888', fontSize: 13 }}>No detail loaded.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ProjectDetail({ data, assignDeliverable, advanceGate }) {
  const { project, gates = [], reviews = [], cart } = data;
  const gateIndex = project.gate_index || 0;
  const currentGate = gates[gateIndex];
  const currentReviews = reviews.filter(r => r.gate_slug === project.current_gate).sort((a, b) => b.iteration - a.iteration);
  const latestReview = currentReviews[0];
  const [deliverableId, setDeliverableId] = useState('');

  const needsOperator = project.status === 'in_progress' || project.status === 'discovery';
  const fixRequested = latestReview?.state === 'fix_requested';

  return (
    <div>
      {/* Current gate card */}
      <div style={{ background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 10, padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: 'var(--gold)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', margin: 0 }}>Current Gate {gateIndex + 1} of {gates.length}</p>
            <b style={{ fontSize: 17, display: 'block', marginTop: 4 }}>{currentGate?.title || 'Complete'}</b>
            <p style={{ color: '#666', fontSize: 12, margin: '4px 0 0' }}>{currentGate?.description || ''}</p>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.06em',
            color: STATUS_META[project.status]?.color, background: STATUS_META[project.status]?.bg }}>
            {STATUS_META[project.status]?.label || project.status}
          </span>
        </div>

        {/* Operator approval actions */}
        {project.status !== 'completed' && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e5e1da' }}>
            {fixRequested && (
              <div style={{ background: '#f5d8d5', border: '1px solid #e3b8b3', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 12, color: '#a52d23' }}>
                <b>✎ Client requested fixes (iteration {latestReview.iteration})</b>
                <p style={{ margin: '6px 0 0' }}>Review their feedback below, revise the deliverable, then re-assign it for client review.</p>
              </div>
            )}

            {needsOperator && (
              <>
                <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 8px' }}>Operator Actions — Approval Gate</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input value={deliverableId} onChange={e => setDeliverableId(e.target.value)} placeholder="Deliverable ID (optional)" style={{ flex: 1, minWidth: 180, padding: '9px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }} />
                  <button onClick={() => assignDeliverable(project.id, deliverableId)} style={{ background: '#237A4B', color: '#fff', border: 0, borderRadius: 6, padding: '9px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Send size={13} /> Mark Ready for Client
                  </button>
                  <button onClick={() => advanceGate(project.id)} style={{ background: '#0a0a0a', color: '#fff', border: 0, borderRadius: 6, padding: '9px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <SkipForward size={13} /> Override & Advance
                  </button>
                </div>
                <p style={{ fontSize: 11, color: '#888', margin: '8px 0 0' }}>“Mark Ready” notifies the client (SMS + email) that their deliverable is ready for review. “Override” advances the gate without client review.</p>
              </>
            )}

            {project.status === 'in_review' && (
              <div style={{ background: '#f8e5ce', border: '1px solid #e5cfa8', borderRadius: 8, padding: 12, fontSize: 12, color: '#8A641C' }}>
                <Clock size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
                <b>Waiting for client review.</b> The client has been notified. They will approve or request fixes from their portal.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gate flow */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {gates.map((g, i) => {
          const gateReviews = reviews.filter(r => r.gate_slug === g.slug);
          const approved = gateReviews.some(r => r.state === 'approved');
          const fixReq = gateReviews.some(r => r.state === 'fix_requested');
          const isPast = i < gateIndex || project.status === 'completed';
          const isCurrent = i === gateIndex && project.status !== 'completed';
          return (
            <div key={i} style={{ flex: '0 0 auto', minWidth: 100, padding: '10px 12px', borderRadius: 8, textAlign: 'center',
              border: `1px solid ${isPast ? '#237A4B' : isCurrent ? 'var(--gold)' : '#e5e1da'}`,
              background: isPast ? '#e6f4ec' : isCurrent ? '#C89B3C15' : '#fff' }}>
              <div style={{ fontSize: 14 }}>{isPast ? '✓' : isCurrent ? '▶' : '◦'}</div>
              <b style={{ fontSize: 10, display: 'block', marginTop: 3, color: isPast ? '#237A4B' : isCurrent ? 'var(--gold-dark)' : '#888' }}>{g.title.split(' ')[0]}</b>
              {fixReq && !approved && <small style={{ fontSize: 8, color: '#C63D34' }}>fix</small>}
            </div>
          );
        })}
      </div>

      {/* Two columns: discovery + reviews */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Discovery responses */}
        <div style={{ border: '1px solid #e5e1da', borderRadius: 10, padding: 16 }}>
          <b style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}><FileText size={14} style={{ color: 'var(--gold)' }} /> Discovery Responses</b>
          {project.discovery_responses && Object.keys(project.discovery_responses).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(project.discovery_responses).map(([k, v]) => (
                <div key={k} style={{ fontSize: 12 }}>
                  <small style={{ color: 'var(--gold)', textTransform: 'uppercase', fontSize: 9, fontWeight: 700, letterSpacing: '.08em' }}>{k.replace(/_/g, ' ')}</small>
                  <p style={{ margin: '2px 0 0', color: '#444' }}>{Array.isArray(v) ? v.join(', ') : String(v)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#888', fontSize: 12 }}>Client hasn't completed discovery yet.</p>
          )}
        </div>

        {/* Gate reviews / feedback */}
        <div style={{ border: '1px solid #e5e1da', borderRadius: 10, padding: 16 }}>
          <b style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}><MessageSquare size={14} style={{ color: 'var(--gold)' }} /> Gate Reviews & Feedback</b>
          {reviews.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflow: 'auto' }}>
              {reviews.sort((a, b) => new Date(b.reviewed_at) - new Date(a.reviewed_at)).map(r => (
                <div key={r.id} style={{ padding: 10, borderRadius: 8, background: r.state === 'approved' ? '#e6f4ec' : '#f5d8d5', border: `1px solid ${r.state === 'approved' ? '#bcd9c5' : '#e3b8b3'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ fontSize: 12 }}>{r.gate_title}</b>
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: r.state === 'approved' ? '#237A4B' : '#a52d23' }}>{r.state === 'approved' ? '✓ Approved' : '✎ Fix Requested'}</span>
                  </div>
                  <small style={{ fontSize: 10, color: '#888' }}>Iteration {r.iteration} · {new Date(r.reviewed_at).toLocaleDateString()}</small>
                  {r.decision_note && <p style={{ fontSize: 11, color: '#555', margin: '6px 0 0' }}>"{r.decision_note}"</p>}
                  {r.fix_responses && Object.keys(r.fix_responses).length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 11 }}>
                      {Object.entries(r.fix_responses).filter(([, v]) => v && (Array.isArray(v) ? v.length : true)).slice(0, 3).map(([k, v]) => (
                        <div key={k} style={{ color: '#666' }}><b style={{ color: 'var(--gold-dark)' }}>{k.replace(/_/g, ' ')}:</b> {Array.isArray(v) ? v.join(', ') : String(v)}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#888', fontSize: 12 }}>No gate reviews yet.</p>
          )}
        </div>
      </div>

      {/* Client info + links */}
      <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12 }}>
        {project.client_email && <span style={{ color: '#666' }}>✉ {project.client_email}</span>}
        {project.client_phone && <span style={{ color: '#666' }}>☎ {project.client_phone}</span>}
        <a href={`/funnel?project=${project.id}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ExternalLink size={13} /> Open client portal
        </a>
        {cart && cart.item_count > 0 && <span style={{ color: '#237A4B' }}>🛒 Cart: {cart.item_count} items · ${(cart.total || 0).toLocaleString()}</span>}
      </div>
    </div>
  );
}

function GateSystemView() {
  const GATES = [
    { n: 1, icon: '📋', title: 'Discovery', desc: 'Client answers a service-specific questionnaire. Shapes every downstream deliverable.' },
    { n: 2, icon: '🎨', title: 'Logo & Brand', desc: 'Logo + brand pack presented. Client approves or requests changes. Optional reference pack upload.' },
    { n: 3, icon: '📝', title: 'Messaging & Wireframe', desc: 'Headlines, copy, sitemap, and layout blueprint reviewed.' },
    { n: 4, icon: '🌐', title: 'Website Build', desc: 'Full website build shown in the deliverable preview. Client approves or submits fix feedback.' },
    { n: 5, icon: '🧪', title: 'QA & Testing', desc: 'Tested across devices and browsers. Client confirms readiness.' },
    { n: 6, icon: '🚀', title: 'Launch', desc: 'Project marked complete. Client receives final assets. Operator can deploy.' }
  ];
  return (
    <div>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>Every project flows through these approval gates. At each gate, the operator prepares a deliverable, the client reviews it, and either approves (advances) or requests changes (triggers a revision). The operator sees all feedback in real time and can override/advance if needed.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {GATES.map(g => (
          <div key={g.n} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: 20, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 12, right: 14, font: '400 24px Libre Caslon Display, serif', color: '#e5e1da' }}>{g.n}</div>
            <div style={{ fontSize: 24 }}>{g.icon}</div>
            <b style={{ fontSize: 14, display: 'block', margin: '8px 0 4px' }}>{g.title}</b>
            <p style={{ fontSize: 11, color: '#888', lineHeight: 1.5 }}>{g.desc}</p>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24, background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 12, padding: 20 }}>
        <b style={{ fontSize: 14, display: 'block', marginBottom: 10 }}>Approval Flow</b>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12, color: '#666' }}>
          <span style={{ padding: '6px 12px', background: '#fff', border: '1px solid #e5e1da', borderRadius: 6 }}>Operator prepares deliverable</span>
          <span>→</span>
          <span style={{ padding: '6px 12px', background: '#fff', border: '1px solid #e5e1da', borderRadius: 6 }}>Client notified (SMS + email)</span>
          <span>→</span>
          <span style={{ padding: '6px 12px', background: '#fff', border: '1px solid #e5e1da', borderRadius: 6 }}>Client reviews</span>
          <span>→</span>
          <span style={{ padding: '6px 12px', background: '#e6f4ec', border: '1px solid #bcd9c5', borderRadius: 6, color: '#237A4B' }}>Approve</span>
          <span style={{ color: '#888' }}>or</span>
          <span style={{ padding: '6px 12px', background: '#f5d8d5', border: '1px solid #e3b8b3', borderRadius: 6, color: '#a52d23' }}>Request changes</span>
          <span>→</span>
          <span style={{ padding: '6px 12px', background: '#fff', border: '1px solid #e5e1da', borderRadius: 6 }}>Operator revises</span>
          <span>→</span>
          <span style={{ padding: '6px 12px', background: '#fff', border: '1px solid #e5e1da', borderRadius: 6 }}>Re-review</span>
        </div>
      </div>
    </div>
  );
}

function TestCenter() {
  return (
    <div>
      <div style={{ background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <b style={{ fontSize: 16, display: 'block', marginBottom: 6 }}>Test the Full Workflow</b>
        <p style={{ color: '#666', fontSize: 13, marginBottom: 18 }}>Follow these steps to test the complete client portal flow end-to-end — from project creation to client approval to launch.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { n: 1, title: 'Create a test project', desc: 'Go to Client Projects and click "+ New Client Project". Fill in test client details.', link: '/app/client-projects', linkLabel: 'Go to Client Projects →' },
            { n: 2, title: 'Open the client portal', desc: 'Copy the portal link from the project row and open it in a new tab. This is what your client sees.', link: null },
            { n: 3, title: 'Complete discovery (as client)', desc: 'Answer the discovery questionnaire from the client portal. The operator gets notified.', link: null },
            { n: 4, title: 'Prepare & assign deliverable (as operator)', desc: 'Come back here, expand the project, and click "Mark Ready for Client". The client gets notified.', link: null },
            { n: 5, title: 'Client approves or requests fixes', desc: 'From the client portal, approve to advance or request fixes. Watch the operator dashboard update in real time.', link: null },
            { n: 6, title: 'Operator override (optional)', desc: 'Use "Override & Advance" to skip a gate without client review — useful for testing or internal projects.', link: null }
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ display: 'grid', placeItems: 'center', flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: 'var(--gold)', color: '#111', fontSize: 13, fontWeight: 700 }}>{s.n}</span>
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 13, display: 'block' }}>{s.title}</b>
                <p style={{ color: '#666', fontSize: 12, margin: '3px 0 0' }}>{s.desc}</p>
                {s.link && <Link to={s.link} style={{ fontSize: 12, color: 'var(--gold)', display: 'inline-block', marginTop: 4 }}>{s.linkLabel}</Link>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: 20 }}>
        <b style={{ fontSize: 14, display: 'block', marginBottom: 6 }}>Quick Test Links</b>
        <p style={{ color: '#888', fontSize: 12, marginBottom: 14 }}>Open these in separate tabs to simulate operator + client simultaneously.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/app/client-projects" className="btn dark" style={{ fontSize: 12, padding: '10px 16px' }}>Create Project</Link>
          <Link to="/app/client-portal" className="btn outline" style={{ fontSize: 12, padding: '10px 16px' }}>This Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: 40, textAlign: 'center' }}>
      <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No client projects yet</p>
      <p style={{ fontSize: 13, color: '#888' }}>Create a project to start testing the approval gate system.</p>
      <Link to="/app/client-projects" className="btn dark" style={{ marginTop: 16, padding: '12px 20px', fontSize: 13 }}>+ New Client Project</Link>
    </div>
  );
}