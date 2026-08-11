import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import FunnelEditor from '@/components/ghl/FunnelEditor';
import { Plus, ExternalLink, Layers, Loader2, X } from 'lucide-react';

export default function Funnels() {
  const { id } = useParams();
  if (id) return <FunnelEditor funnelId={id} />;
  return <FunnelList />;
}

function FunnelList() {
  const { user } = useAuth();
  const orgId = user?.data?.organization_id;
  const [funnels, setFunnels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const list = await base44.entities.GhlFunnel.list('-updated_date', 200);
      setFunnels(list);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  return (
    <>
      <XtremeOSSidebar />
      <div className="xtremeos-content" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240, padding: 28 }}>
        <div style={{ background: 'radial-gradient(circle at 82% 40%, #C89B3C45, transparent 25%), #0a0a0a', color: '#fff', padding: '32px 28px', margin: '-28px -28px 22px' }}>
          <p style={{ color: '#E7C86E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>GoHighLevel Clone</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 38, margin: '6px 0 4px', letterSpacing: '-.03em' }}>Funnel & Site Builder</h1>
              <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>Build lead-capture funnels, publish to Vercel, and route submissions straight into your CRM.</p>
            </div>
            <button onClick={() => setShowCreate(true)} style={btnGold}><Plus size={15} /> New Funnel</button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#999' }}><Loader2 size={26} className="animate-spin" style={{ display: 'block', margin: '0 auto 8px', color: '#C89B3C' }} /> Loading funnels…</div>
        ) : funnels.length === 0 ? (
          <div style={{ padding: 50, textAlign: 'center', background: '#fff', border: '1px solid #ddd', borderRadius: 10, color: '#999' }}>
            <Layers size={32} style={{ color: '#C89B3C', margin: '0 auto 10px' }} />
            <p style={{ fontSize: 15, color: '#666', margin: '0 0 4px' }}>No funnels yet</p>
            <p style={{ fontSize: 13, margin: 0 }}>Create your first funnel to start capturing leads.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {funnels.map(f => (
              <Link key={f.id} to={`/app/ghl-funnels/${f.id}`} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 18, textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 18 }}>{f.name}</b>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: f.status === 'published' ? '#e8f5ec' : '#f0ede5', color: f.status === 'published' ? '#237A4B' : '#B88214', textTransform: 'uppercase' }}>{f.status}</span>
                </div>
                {f.description && <p style={{ fontSize: 12, color: '#777', margin: 0, lineHeight: 1.4 }}>{f.description}</p>}
                <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#999', marginTop: 'auto' }}>
                  <span>{f.page_count || 0} page{(f.page_count || 0) !== 1 ? 's' : ''}</span>
                  <span style={{ color: '#C89B3C' }}>{f.leads_captured || 0} leads</span>
                </div>
                {f.vercel_url && (
                  <a href={f.vercel_url} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#2563eb' }}>
                    <ExternalLink size={11} /> {f.vercel_url.replace('https://', '')}
                  </a>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateFunnelModal orgId={orgId} onClose={() => setShowCreate(false)} onCreated={(id) => { setShowCreate(false); window.location.href = `/app/ghl-funnels/${id}`; }} />}
    </>
  );
}

function CreateFunnelModal({ orgId, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function create() {
    if (!form.name.trim()) return;
    setSaving(true); setErr('');
    try {
      const slug = (form.slug || form.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const f = await base44.entities.GhlFunnel.create({
        organization_id: orgId, name: form.name.trim(), slug, description: form.description.trim(), page_count: 0, leads_captured: 0,
      });
      onCreated(f.id);
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: '1px solid #eee' }}>
          <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 18 }}>New Funnel</b>
          <button onClick={onClose} style={iconBtn}><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gap: 14, padding: 22 }}>
          <label style={fl}>Funnel Name
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} autoFocus placeholder="HVAC Lead Gen Funnel" />
          </label>
          <label style={fl}>Slug (optional)
            <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} style={inp} placeholder="hvac-lead-gen" />
          </label>
          <label style={fl}>Description
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} />
          </label>
          {err && <p style={{ color: '#C63D34', fontSize: 12, margin: 0 }}>{err}</p>}
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '0 22px 22px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnO}>Cancel</button>
          <button onClick={create} disabled={saving || !form.name.trim()} style={btnGold}>{saving ? 'Creating…' : 'Create Funnel'}</button>
        </div>
      </div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'grid', placeItems: 'center' };
const modal = { width: 'min(520px, 92vw)', background: '#fff', borderRadius: 12, overflow: 'hidden' };
const fl = { display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 };
const inp = { padding: '10px 12px', border: '1px solid #d7d7d7', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', background: '#fff', color: '#111' };
const iconBtn = { background: 'none', border: 0, cursor: 'pointer', color: '#999' };
const btnO = { padding: '10px 18px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' };
const btnGold = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 18px', border: 0, borderRadius: 6, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' };