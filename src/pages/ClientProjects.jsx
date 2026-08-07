import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';
import { useState, useEffect } from 'react';
import { Plus, ExternalLink, Copy, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

const SERVICE_TYPES = {
  website: { label: 'Website', icon: '🌐' },
  app: { label: 'Web App', icon: '📱' },
  ai_tool: { label: 'AI Tool', icon: '🤖' },
  ai_company: { label: 'Full AI Company', icon: '🏢' }
};

export default function ClientProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copied, setCopied] = useState(null);
  const [form, setForm] = useState({ service_type: 'website', project_name: '', client_name: '', client_email: '', client_phone: '' });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const res = await base44.functions.invoke('clientWorkflowEngine', { action: 'listProjects' });
      if (res.data?.error) throw new Error(res.data.error);
      setProjects(res.data?.projects || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.project_name) return;
    setCreating(true);
    try {
      const res = await base44.functions.invoke('clientWorkflowEngine', { action: 'createProject', ...form });
      if (res.data?.error) throw new Error(res.data.error);
      setShowCreate(false); setForm({ service_type: 'website', project_name: '', client_name: '', client_email: '', client_phone: '' });
      await load();
    } catch (e) { alert(e.message); } finally { setCreating(false); }
  };

  const copyLink = (id) => {
    const url = `${window.location.origin}/funnel?project=${id}`;
    navigator.clipboard.writeText(url);
    setCopied(id); setTimeout(() => setCopied(null), 2000);
  };

  const statusBadge = (p) => {
    const map = {
      discovery: { label: 'Discovery', color: '#999', bg: '#f0f0f0' },
      in_progress: { label: 'In Progress', color: '#2563eb', bg: '#dbeafe' },
      in_review: { label: 'Awaiting Client', color: '#B88214', bg: '#f8e5ce' },
      completed: { label: 'Complete', color: '#237A4B', bg: '#dcefe2' },
      paused: { label: 'Paused', color: '#666', bg: '#eee' }
    };
    const s = map[p.status] || map.discovery;
    return <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>;
  };

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Client Funnel</p>
          <h1>Client Projects</h1>
          <p>Create a client project, send them their portal link, and track them through the approval-gated build funnel — discovery → logo & brand → launch.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn dark" style={{ fontSize: 13, padding: '12px 20px' }}>
          <Plus size={14} style={{ marginRight: 6 }} /> New Client Project
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#999' }}>Loading projects…</div>
      ) : projects.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 12, padding: 50, textAlign: 'center' }}>
          <p style={{ color: '#888', fontSize: 15, margin: '0 0 18px' }}>No client projects yet. Create your first one to start the funnel.</p>
          <button onClick={() => setShowCreate(true)} className="btn dark" style={{ fontSize: 13, padding: '12px 22px' }}><Plus size={14} style={{ marginRight: 6, display: 'inline' }} /> New Client Project</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {projects.map(p => (
            <div key={p.id} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 28 }}>{SERVICE_TYPES[p.service_type]?.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 15 }}>{p.project_name}</b>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <span>{SERVICE_TYPES[p.service_type]?.label}</span>
                  {p.client_name && <span>· {p.client_name}</span>}
                  {p.client_email && <span>· {p.client_email}</span>}
                  <span>· Gate {p.gate_index + 1}/{p.total_gates || 8}</span>
                </div>
              </div>
              {statusBadge(p)}
              <button onClick={() => copyLink(p.id)} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                {copied === p.id ? <><CheckCircle2 size={13} style={{ color: '#237A4B' }} /> Copied</> : <><Copy size={13} /> Copy link</>}
              </button>
              <a href={`/funnel?project=${p.id}`} target="_blank" style={{ background: '#0a0a0a', color: '#fff', borderRadius: 6, padding: '8px 14px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ExternalLink size={13} /> Open
              </a>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'grid', placeItems: 'center' }} onClick={() => setShowCreate(false)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 'min(520px, 92vw)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ font: '400 26px Libre Caslon Display, serif', margin: '0 0 6px' }}>New Client Project</h2>
            <p style={{ color: '#888', fontSize: 13, margin: '0 0 24px' }}>Choose a service type and enter client details. They'll get a portal link to complete discovery.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 8 }}>Service Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {Object.entries(SERVICE_TYPES).map(([k, v]) => (
                    <button key={k} onClick={() => setForm({ ...form, service_type: k })} style={{
                      padding: 14, border: '1px solid #ddd', borderRadius: 8, background: form.service_type === k ? '#0a0a0a' : '#fff',
                      color: form.service_type === k ? '#fff' : '#333', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', fontSize: 13
                    }}>
                      <span style={{ fontSize: 18, display: 'block', marginBottom: 4 }}>{v.icon}</span>
                      <b>{v.label}</b>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Project Name *</label>
                <input value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} placeholder="e.g. Acme Corp Website" style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Client Name</label>
                  <input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Client Phone (for SMS)</label>
                  <input value={form.client_phone} onChange={e => setForm({ ...form, client_phone: e.target.value })} placeholder="+1 555 010 0000" style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontFamily: 'inherit' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Client Email</label>
                <input value={form.client_email} onChange={e => setForm({ ...form, client_email: e.target.value })} style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontFamily: 'inherit' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={create} disabled={creating || !form.project_name} className="btn dark" style={{ flex: 1, padding: 14, fontSize: 14 }}>{creating ? 'Creating…' : 'Create & Get Link'}</button>
              <button onClick={() => setShowCreate(false)} className="btn outline" style={{ padding: '14px 20px', fontSize: 14 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}