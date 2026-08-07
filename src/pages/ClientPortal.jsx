import { useState, useEffect, useCallback } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, AlertCircle, Send, Eye, ShoppingBag, ExternalLink } from 'lucide-react';

const GATE_FLOW = [
  { slug: 'discovery', title: 'Discovery', icon: '📋' },
  { slug: 'logo_brand', title: 'Logo & Brand', icon: '🎨' },
  { slug: 'website', title: 'Website Build', icon: '🌐' },
  { slug: 'review', title: 'Final Review', icon: '✅' },
  { slug: 'launch', title: 'Launch', icon: '🚀' }
];

const STATUS_META = {
  discovery: { label: 'Discovery', color: '#8A641C', bg: '#C89B3C20' },
  in_review: { label: 'In Review', color: '#B88214', bg: '#f8e5ce' },
  in_progress: { label: 'In Progress', color: '#8A641C', bg: '#C89B3C20' },
  approved: { label: 'Approved', color: '#237A4B', bg: '#e6f4ec' },
  completed: { label: 'Completed', color: '#237A4B', bg: '#e6f4ec' },
  paused: { label: 'Paused', color: '#888', bg: '#eee' }
};

export default function ClientPortal() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [tab, setTab] = useState('overview');

  const load = useCallback(async () => {
    try {
      const data = await base44.entities.ClientProject.list('-created_date', 50);
      setProjects(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const unsub = base44.entities.ClientProject.subscribe(() => load());
    return unsub;
  }, [load]);

  const stats = {
    total: projects.length,
    inDiscovery: projects.filter(p => p.status === 'discovery').length,
    inReview: projects.filter(p => p.status === 'in_review').length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    approved: projects.filter(p => p.status === 'approved').length,
    completed: projects.filter(p => p.status === 'completed').length
  };

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Client Delivery</p>
          <h1>Customer Portal & Approval Gates</h1>
          <p>The complete client experience — discovery, gate-by-gate approvals, deliverable reviews, and upsell checkout. This is exactly what your clients see. Open any project to preview the live portal.</p>
        </div>
        <Link to="/app/client-projects" className="btn outline" style={{ padding: '12px 20px', fontSize: 13 }}>Manage Projects →</Link>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e5e1da', marginBottom: 20 }}>
        {[
          ['overview', 'Pipeline Overview'],
          ['gates', 'Approval Gate System'],
          ['preview', 'Live Client Preview']
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '12px 18px', border: 0, background: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13, fontWeight: 600, color: tab === key ? '#0a0a0a' : '#888',
            borderBottom: `2px solid ${tab === key ? 'var(--gold)' : 'transparent'}`, marginBottom: -2
          }}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              ['Total Projects', stats.total, '#0a0a0a'],
              ['In Discovery', stats.inDiscovery, '#8A641C'],
              ['Awaiting Client Review', stats.inReview, '#B88214'],
              ['In Progress', stats.inProgress, '#8A641C'],
              ['Approved', stats.approved, '#237A4B'],
              ['Completed', stats.completed, '#237A4B']
            ].map(([label, count, color]) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 10, padding: 20 }}>
                <b style={{ font: '400 32px Libre Caslon Display, serif', display: 'block', color }}>{count}</b>
                <small style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</small>
              </div>
            ))}
          </div>

          {/* Project list with gate progress */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>Loading projects…</div>
          ) : projects.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No client projects yet</p>
              <p style={{ fontSize: 13, color: '#888' }}>Create a project from the Client Projects page or the Client Setup Wizard to see the approval gate system in action.</p>
              <Link to="/app/client-setup" className="btn dark" style={{ marginTop: 16, padding: '12px 20px', fontSize: 13 }}>Start Client Setup →</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {projects.map(p => {
                const sm = STATUS_META[p.status] || STATUS_META.discovery;
                const isOpen = expanded === p.id;
                const gates = p.gates && p.gates.length > 0 ? p.gates : GATE_FLOW.map(g => g.slug);
                const gateIndex = p.gate_index || 0;
                return (
                  <div key={p.id} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : p.id)}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <b style={{ fontSize: 15 }}>{p.project_name}</b>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, color: sm.color, background: sm.bg, textTransform: 'uppercase', letterSpacing: '.08em' }}>{sm.label}</span>
                        </div>
                        <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>{p.client_name} · {p.service_type}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {gates.map((g, i) => {
                          const isPast = i < gateIndex || p.status === 'completed';
                          const isCurrent = i === gateIndex && p.status !== 'completed';
                          return (
                            <div key={i} title={GATE_FLOW[i]?.title || g} style={{
                              width: 28, height: 6, borderRadius: 3,
                              background: isPast ? '#237A4B' : isCurrent ? 'var(--gold)' : '#e5e1da'
                            }} />
                          );
                        })}
                        <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{gateIndex}/{gates.length}</span>
                        <span style={{ fontSize: 18, color: '#aaa', marginLeft: 8 }}>{isOpen ? '−' : '+'}</span>
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ borderTop: '1px solid #eee', padding: '20px 22px' }}>
                        {/* Gate flow visualization */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 18, overflowX: 'auto', paddingBottom: 6 }}>
                          {gates.map((g, i) => {
                            const meta = GATE_FLOW.find(f => f.slug === g) || { title: g, icon: '◦' };
                            const isPast = i < gateIndex || p.status === 'completed';
                            const isCurrent = i === gateIndex && p.status !== 'completed';
                            return (
                              <div key={i} style={{
                                flex: '0 0 auto', minWidth: 120, padding: '12px 14px', borderRadius: 8, textAlign: 'center',
                                border: `1px solid ${isPast ? '#237A4B' : isCurrent ? 'var(--gold)' : '#e5e1da'}`,
                                background: isPast ? '#e6f4ec' : isCurrent ? '#C89B3C15' : '#fff'
                              }}>
                                <div style={{ fontSize: 18 }}>{meta.icon}</div>
                                <b style={{ fontSize: 11, display: 'block', marginTop: 4, color: isPast ? '#237A4B' : isCurrent ? 'var(--gold-dark)' : '#888' }}>{meta.title}</b>
                                <small style={{ fontSize: 9, color: isPast ? '#237A4B' : isCurrent ? 'var(--gold-dark)' : '#aaa', textTransform: 'uppercase' }}>
                                  {isPast ? '✓ Done' : isCurrent ? 'Active' : 'Pending'}
                                </small>
                              </div>
                            );
                          })}
                        </div>

                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12 }}>
                          {p.client_email && <span style={{ color: '#666' }}>✉ {p.client_email}</span>}
                          {p.client_phone && <span style={{ color: '#666' }}>☎ {p.client_phone}</span>}
                          <a href={`/funnel?project=${p.id}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Eye size={13} /> Open live client portal
                          </a>
                          {p.current_deliverable_id && <Link to={`/app/deliverable-studio?d=${p.current_deliverable_id}`} style={{ color: 'var(--gold)' }}>Current deliverable →</Link>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'gates' && <GateSystemView />}
      {tab === 'preview' && <LivePreview />}
    </PortalShell>
  );
}

function GateSystemView() {
  return (
    <div>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>Every client project flows through these approval gates. At each gate, the client reviews the deliverable and either approves (advances) or requests changes (triggers a revision round). The operator sees the status update in real time.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {GATE_FLOW.map((g, i) => (
          <div key={g.slug} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: 22, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 14, right: 16, font: '400 28px Libre Caslon Display, serif', color: '#e5e1da' }}>{i + 1}</div>
            <div style={{ fontSize: 28 }}>{g.icon}</div>
            <b style={{ fontSize: 16, display: 'block', margin: '10px 0 6px' }}>{g.title}</b>
            <p style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
              {g.slug === 'discovery' && 'Client answers a service-specific questionnaire. Shapes every downstream deliverable.'}
              {g.slug === 'logo_brand' && 'Logo + brand pack presented. Client approves or requests changes. Optional reference pack upload.'}
              {g.slug === 'website' && 'Full website build shown in the deliverable preview. Client approves or submits fix feedback.'}
              {g.slug === 'review' && 'Final review of all deliverables. Client confirms everything is production-ready.'}
              {g.slug === 'launch' && 'Project marked complete. Client receives final assets. Operator can deploy.'}
            </p>
            <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: '#e6f4ec', color: '#237A4B', fontWeight: 600 }}>✓ Approve</span>
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: '#f5d8d5', color: '#a52d23', fontWeight: 600 }}>✎ Request Changes</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28, background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 12, padding: 24 }}>
        <b style={{ fontSize: 15, display: 'block', marginBottom: 10 }}>How the approval loop works</b>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 13, color: '#666' }}>
          <span style={{ padding: '6px 12px', background: '#fff', border: '1px solid #e5e1da', borderRadius: 6 }}>Deliverable prepared</span>
          <span>→</span>
          <span style={{ padding: '6px 12px', background: '#fff', border: '1px solid #e5e1da', borderRadius: 6 }}>Client notified (SMS + email)</span>
          <span>→</span>
          <span style={{ padding: '6px 12px', background: '#fff', border: '1px solid #e5e1da', borderRadius: 6 }}>Client reviews</span>
          <span>→</span>
          <span style={{ padding: '6px 12px', background: '#e6f4ec', border: '1px solid #bcd9c5', borderRadius: 6, color: '#237A4B' }}>Approve</span>
          <span style={{ color: '#888' }}>or</span>
          <span style={{ padding: '6px 12px', background: '#f5d8d5', border: '1px solid #e3b8b3', borderRadius: 6, color: '#a52d23' }}>Request changes</span>
          <span>→</span>
          <span style={{ padding: '6px 12px', background: '#fff', border: '1px solid #e5e1da', borderRadius: 6 }}>Revision round</span>
          <span>→</span>
          <span style={{ padding: '6px 12px', background: '#fff', border: '1px solid #e5e1da', borderRadius: 6 }}>Re-review</span>
        </div>
      </div>
    </div>
  );
}

function LivePreview() {
  return (
    <div>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>This is a live mockup of what your client sees when they open their portal link. Create a real project and click "Open live client portal" to see it with real data.</p>
      <div style={{ background: '#0a0a0a', borderRadius: 12, overflow: 'hidden', border: '1px solid #333', maxWidth: 900, margin: '0 auto' }}>
        {/* Mock header */}
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14, color: '#fff' }}>
          <span style={{ fontSize: 22 }}>🌐</span>
          <div style={{ flex: 1 }}>
            <b style={{ font: '400 22px Libre Caslon Display, serif' }}>Your Website Project</b>
            <small style={{ display: 'block', color: 'var(--gold2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em' }}>Website · Client Portal</small>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1a1a1a', padding: '8px 14px', borderRadius: 8 }}>
            <ShoppingBag size={16} style={{ color: 'var(--gold2)' }} />
            <b style={{ fontSize: 13 }}>2</b>
            <span style={{ fontSize: 12, color: '#999' }}>$899</span>
          </div>
        </div>
        {/* Mock progress */}
        <div style={{ background: '#fff', margin: 16, borderRadius: 10, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <b style={{ fontSize: 14 }}>Project Progress</b>
            <span style={{ fontSize: 12, color: '#888' }}>2 of 5 gates</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{ flex: 1, height: 8, borderRadius: 4, background: i < 2 ? '#237A4B' : i === 2 ? 'var(--gold)' : '#e5e1da' }} />
            ))}
          </div>
        </div>
        {/* Mock gate review */}
        <div style={{ background: '#fff', margin: 16, borderRadius: 10, padding: 28 }}>
          <p style={{ color: 'var(--gold)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: '0 0 8px' }}>Gate 3 of 5</p>
          <h2 style={{ font: '400 30px Libre Caslon Display, serif', margin: '0 0 6px' }}>Website Build</h2>
          <p style={{ color: '#666', fontSize: 14, margin: '0 0 24px' }}>Review your website and approve or request changes.</p>
          <div style={{ background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 10, padding: 24, marginBottom: 20, textAlign: 'center' }}>
            <CheckCircle2 size={36} style={{ color: '#237A4B', margin: '0 auto 10px' }} />
            <b style={{ fontSize: 16 }}>Your deliverable is ready for review</b>
            <p style={{ color: '#888', fontSize: 13, margin: '8px 0 0' }}>Review the work below, then approve or request changes.</p>
            <a className="btn outline" style={{ marginTop: 16, fontSize: 13, padding: '10px 20px', display: 'inline-block' }}>View deliverable →</a>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn dark" style={{ flex: 1, padding: 16, fontSize: 15, background: '#237A4B', border: 0, borderRadius: 6, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
              <CheckCircle2 size={16} style={{ marginRight: 6, display: 'inline' }} /> Approve & Continue
            </button>
            <button className="btn outline" style={{ flex: 1, padding: 16, fontSize: 15, border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
              Request Fixes
            </button>
          </div>
        </div>
        {/* Mock upsells */}
        <div style={{ background: '#fff', margin: 16, borderRadius: 10, padding: 24 }}>
          <p style={{ color: 'var(--gold)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: '0 0 8px' }}>✨ Enhancements</p>
          <h2 style={{ font: '400 24px Libre Caslon Display, serif', margin: '0 0 6px' }}>Add upgrades to your project</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            {[
              ['SEO Foundation', '$499', 'Technical SEO setup, schema, sitemap, and speed optimization.'],
              ['Analytics Dashboard', '$399', 'Custom dashboard with traffic, conversions, and goal tracking.']
            ].map(([title, price, desc]) => (
              <div key={title} style={{ border: '1px solid #e5e1da', borderRadius: 10, padding: 18 }}>
                <b style={{ fontSize: 14, display: 'block' }}>{title}</b>
                <p style={{ color: '#888', fontSize: 12, margin: '6px 0 12px', minHeight: 50 }}>{desc}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ font: '400 20px Libre Caslon Display, serif', color: 'var(--gold-dark)' }}>{price}</b>
                  <button style={{ background: '#0a0a0a', color: '#fff', border: 0, borderRadius: 6, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Add +</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}