import { useState, useEffect } from 'react';
import { Users, KanbanSquare, ListChecks, LayoutDashboard } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import ContactsView from '@/components/ghl/ContactsView';
import PipelineBoard from '@/components/ghl/PipelineBoard';
import ActivitiesView from '@/components/ghl/ActivitiesView';

const DEFAULT_STAGES = [
  { id: 'new', name: 'New Lead', color: '#888' },
  { id: 'contacted', name: 'Contacted', color: '#2563eb' },
  { id: 'qualified', name: 'Qualified', color: '#7c3aed' },
  { id: 'proposal', name: 'Proposal Sent', color: '#C89B3C' },
  { id: 'won', name: 'Won', color: '#059669' },
  { id: 'lost', name: 'Lost', color: '#C63D34' },
];

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'pipeline', label: 'Pipeline', icon: KanbanSquare },
  { id: 'activities', label: 'Tasks', icon: ListChecks },
];

export default function GhlCRM() {
  const { user } = useAuth();
  const orgId = user?.data?.organization_id;
  const [tab, setTab] = useState('dashboard');
  const [pipeline, setPipeline] = useState(null);
  const [stats, setStats] = useState({ contacts: 0, opps: 0, openValue: 0, wonValue: 0, tasks: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        let pipes = await base44.entities.GhlPipeline.list('-created_date', 20);
        if (pipes.length === 0) {
          const created = await base44.entities.GhlPipeline.create({
            organization_id: orgId,
            name: 'Sales Pipeline',
            stages: DEFAULT_STAGES,
            is_default: true,
          });
          setPipeline(created);
        } else {
          setPipeline(pipes.find(p => p.is_default) || pipes[0]);
        }
        const [c, o, a] = await Promise.all([
          base44.entities.GhlContact.list('-updated_date', 500),
          base44.entities.GhlOpportunity.list('-updated_date', 500),
          base44.entities.GhlActivity.list('-created_date', 200),
        ]);
        setStats({
          contacts: c.length,
          opps: o.length,
          openValue: o.filter(x => x.status === 'open').reduce((s, x) => s + (x.value || 0), 0),
          wonValue: o.filter(x => x.status === 'won').reduce((s, x) => s + (x.value || 0), 0),
          tasks: a.filter(x => !x.completed).length,
        });
      } catch (e) { console.error('GhlCRM init:', e); } finally { setReady(true); }
    })();
  }, [orgId]);

  if (!orgId) return <div style={{ padding: 60, textAlign: 'center' }}>Loading…</div>;

  return (
    <>
      <XtremeOSSidebar />
      <div className="xtremeos-content" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240, padding: 28 }}>
        {/* Header */}
        <div style={{ background: 'radial-gradient(circle at 82% 40%, #C89B3C45, transparent 25%), #0a0a0a', color: '#fff', padding: '32px 28px', margin: '-28px -28px 22px', borderRadius: 0 }}>
          <p style={{ color: '#E7C86E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>GoHighLevel Clone</p>
          <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 38, margin: '6px 0 4px', letterSpacing: '-.03em' }}>CRM <span style={{ color: '#E7C86E' }}>+</span> Pipelines</h1>
          <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>Contacts, drag-and-drop deal board, opportunities, and activity timeline.</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid #ddd', flexWrap: 'wrap' }}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 16px', border: 0, borderBottom: `2px solid ${active ? '#C89B3C' : 'transparent'}`,
                background: 'transparent', color: active ? '#111' : '#888', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
              }}>
                <t.icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        {!ready ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#999' }}>Loading CRM…</div>
        ) : tab === 'dashboard' ? (
          <Dashboard stats={stats} pipeline={pipeline} onGo={setTab} />
        ) : tab === 'contacts' ? (
          <ContactsView orgId={orgId} />
        ) : tab === 'pipeline' ? (
          <PipelineBoard orgId={orgId} pipeline={pipeline} />
        ) : (
          <ActivitiesView orgId={orgId} />
        )}
      </div>
    </>
  );
}

function Dashboard({ stats, pipeline, onGo }) {
  const cards = [
    { label: 'Contacts', value: stats.contacts, color: '#2563eb', tab: 'contacts' },
    { label: 'Open Pipeline', value: `$${stats.openValue.toLocaleString()}`, color: '#C89B3C', tab: 'pipeline' },
    { label: 'Won (closed)', value: `$${stats.wonValue.toLocaleString()}`, color: '#059669', tab: 'pipeline' },
    { label: 'Open Tasks', value: stats.tasks, color: '#dc2626', tab: 'activities' },
  ];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {cards.map(c => (
          <button key={c.label} onClick={() => onGo(c.tab)} style={{ textAlign: 'left', background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 20, cursor: 'pointer', fontFamily: 'inherit' }}>
            <small style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '.06em' }}>{c.label}</small>
            <b style={{ display: 'block', fontFamily: "'Libre Caslon Display', serif", fontSize: 32, color: c.color, marginTop: 8 }}>{c.value}</b>
          </button>
        ))}
      </div>
      {pipeline && (
        <div style={{ marginTop: 18, background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 20 }}>
          <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 18 }}>Pipeline Stages</b>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {(pipeline.stages || []).map(s => (
              <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', background: '#f8f7f4', borderRadius: 6, fontSize: 13 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} /> {s.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}