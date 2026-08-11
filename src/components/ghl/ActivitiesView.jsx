import { useState, useEffect } from 'react';
import { Plus, Check, Phone, Mail, Calendar, FileText, MessageSquare, Flag } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const TYPE_ICON = { call: Phone, email: Mail, sms: MessageSquare, note: FileText, meeting: Calendar, task: Plus, deadline: Flag };
const TYPE_COLOR = { call: '#2563eb', email: '#7c3aed', sms: '#059669', note: '#888', meeting: '#C89B3C', task: '#dc2626', deadline: '#C63D34' };

export default function ActivitiesView({ orgId }) {
  const [activities, setActivities] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: 'task', title: '', contact_id: '', due_date: '' });

  async function load() {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([
        base44.entities.GhlActivity.list('-created_date', 300),
        base44.entities.GhlContact.list('-updated_date', 500),
      ]);
      setActivities(a);
      setContacts(c);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function toggle(a) {
    await base44.entities.GhlActivity.update(a.id, { completed: !a.completed, completed_at: !a.completed ? new Date().toISOString() : null });
    load();
  }

  async function add() {
    if (!form.title.trim()) return;
    try {
      await base44.entities.GhlActivity.create({
        organization_id: orgId,
        type: form.type,
        title: form.title.trim(),
        contact_id: form.contact_id || null,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      });
      setForm({ type: 'task', title: '', contact_id: '', due_date: '' });
      setShowAdd(false);
      load();
    } catch (e) { console.error(e); }
  }

  const contactName = (id) => {
    const c = contacts.find(x => x.id === id);
    return c ? `${c.first_name} ${c.last_name}`.trim() : '';
  };

  const shown = activities.filter(a => filter === 'all' ? true : filter === 'open' ? !a.completed : filter === 'done' ? a.completed : filter === 'overdue' ? !a.completed && a.due_date && new Date(a.due_date) < new Date() : true);

  const stats = {
    open: activities.filter(a => !a.completed).length,
    overdue: activities.filter(a => !a.completed && a.due_date && new Date(a.due_date) < new Date()).length,
    done: activities.filter(a => a.completed).length,
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { k: 'open', label: 'Open', n: stats.open, color: '#2563eb' },
          { k: 'overdue', label: 'Overdue', n: stats.overdue, color: '#C63D34' },
          { k: 'done', label: 'Done', n: stats.done, color: '#059669' },
          { k: 'all', label: 'All', n: activities.length, color: '#888' },
        ].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} style={{
            padding: '8px 14px', borderRadius: 6, border: `1px solid ${filter === f.k ? f.color : '#ddd'}`,
            background: filter === f.k ? f.color : '#fff', color: filter === f.k ? '#fff' : '#666',
            cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
          }}>{f.label} <span style={{ opacity: .7 }}>{f.n}</span></button>
        ))}
        <button onClick={() => setShowAdd(true)} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: 0, borderRadius: 6, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}><Plus size={14} /> New Task</button>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#999' }}>Loading activities…</div>
      ) : shown.length === 0 ? (
        <div style={{ padding: 50, textAlign: 'center', background: '#fff', border: '1px solid #ddd', borderRadius: 10, color: '#999' }}>No activities in this view.</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {shown.map(a => {
            const Icon = TYPE_ICON[a.type] || Plus;
            const overdue = !a.completed && a.due_date && new Date(a.due_date) < new Date();
            return (
              <div key={a.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 14 }}>
                <button onClick={() => toggle(a)} style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${TYPE_COLOR[a.type] || '#888'}`, background: a.completed ? (TYPE_COLOR[a.type] || '#888') : '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  {a.completed && <Check size={13} color="#fff" />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Icon size={13} style={{ color: TYPE_COLOR[a.type] || '#888' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, textDecoration: a.completed ? 'line-through' : 'none', color: a.completed ? '#999' : '#111' }}>{a.title}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: '#999' }}>
                    <span style={{ textTransform: 'uppercase' }}>{a.type}</span>
                    {contactName(a.contact_id) && <span>· {contactName(a.contact_id)}</span>}
                    {a.due_date && <span style={{ color: overdue ? '#C63D34' : '#B88214' }}>· due {new Date(a.due_date).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'grid', placeItems: 'center' }} onClick={() => setShowAdd(false)}>
          <div style={{ width: 'min(480px, 92vw)', background: '#fff', borderRadius: 12, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 22px', borderBottom: '1px solid #eee', fontFamily: "'Libre Caslon Display', serif", fontSize: 18 }}>New Task / Activity</div>
            <div style={{ display: 'grid', gap: 14, padding: 22 }}>
              <label style={fl}>Type
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inp}>
                  {Object.keys(TYPE_ICON).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label style={fl}>Title
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={inp} autoFocus onKeyDown={e => e.key === 'Enter' && add()} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={fl}>Contact
                  <select value={form.contact_id} onChange={e => setForm({ ...form, contact_id: e.target.value })} style={inp}>
                    <option value="">— None —</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                  </select>
                </label>
                <label style={fl}>Due Date
                  <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} style={inp} />
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, padding: '0 22px 22px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAdd(false)} style={btnO}>Cancel</button>
              <button onClick={add} disabled={!form.title} style={btnG}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const fl = { display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 };
const inp = { padding: '10px 12px', border: '1px solid #d7d7d7', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', background: '#fff', color: '#111' };
const btnO = { padding: '10px 18px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' };
const btnG = { padding: '10px 18px', border: 0, borderRadius: 6, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' };