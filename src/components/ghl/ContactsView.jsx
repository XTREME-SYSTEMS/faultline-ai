import { useState, useEffect } from 'react';
import { Plus, Search, Phone, Mail, Building2, Trash2, Pencil } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ContactForm from './ContactForm';

const STATUS_COLOR = {
  lead: '#888', qualified: '#2563eb', proposal: '#7c3aed',
  won: '#059669', lost: '#C63D34', active: '#C89B3C',
};

export default function ContactsView({ orgId }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const list = await base44.entities.GhlContact.list('-updated_date', 500);
      setContacts(list);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = contacts.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${c.first_name} ${c.last_name} ${c.email} ${c.company} ${(c.tags || []).join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  async function remove(c) {
    if (!confirm(`Delete ${c.first_name} ${c.last_name}?`)) return;
    await base44.entities.GhlContact.delete(c.id);
    load();
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts…" style={{ width: '100%', padding: '10px 12px 10px 34px', border: '1px solid #d7d7d7', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #d7d7d7', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}>
          <option value="all">All Statuses</option>
          {Object.keys(STATUS_COLOR).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => { setEditing(null); setShowForm(true); }} style={btnGold}><Plus size={14} /> Add Contact</button>
      </div>

      <div style={{ fontSize: 12, color: '#999', marginBottom: 10 }}>{filtered.length} contact{filtered.length !== 1 ? 's' : ''}</div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#999' }}>Loading contacts…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 50, textAlign: 'center', background: '#fff', border: '1px solid #ddd', borderRadius: 10, color: '#999' }}>
          No contacts yet. Click <b>Add Contact</b> to create your first lead.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #eee' }}>
                  <th style={th}>Name</th><th style={th}>Company</th><th style={th}>Contact</th>
                  <th style={th}>Status</th><th style={th}>Tags</th><th style={th}>Owner</th><th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: c.avatar_color || '#C89B3C', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {(c.first_name?.[0] || '') + (c.last_name?.[0] || '')}
                        </div>
                        <b>{c.first_name} {c.last_name}</b>
                      </div>
                    </td>
                    <td style={td}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#666' }}><Building2 size={12} />{c.company || '—'}</span></td>
                    <td style={td}>
                      <div style={{ display: 'grid', gap: 3, color: '#666' }}>
                        {c.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Mail size={11} />{c.email}</span>}
                        {c.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Phone size={11} />{c.phone}</span>}
                      </div>
                    </td>
                    <td style={td}><span style={{ padding: '3px 9px', borderRadius: 12, fontSize: 10, fontWeight: 700, color: '#fff', background: STATUS_COLOR[c.status] || '#888' }}>{c.status}</span></td>
                    <td style={td}><div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{(c.tags || []).map(t => <span key={t} style={{ fontSize: 10, background: '#f0ede5', padding: '2px 7px', borderRadius: 4 }}>{t}</span>)}</div></td>
                    <td style={td}>{c.owner_name || '—'}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setEditing(c); setShowForm(true); }} style={iconBtn}><Pencil size={14} /></button>
                        <button onClick={() => remove(c)} style={iconBtn}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && <ContactForm orgId={orgId} contact={editing} onClose={() => setShowForm(false)} onSaved={load} />}
    </div>
  );
}

const th = { textAlign: 'left', padding: '12px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#777' };
const td = { padding: '12px 14px', verticalAlign: 'middle' };
const btnGold = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', border: 0, borderRadius: 6, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' };
const iconBtn = { background: 'none', border: 0, cursor: 'pointer', color: '#999', padding: 4 };