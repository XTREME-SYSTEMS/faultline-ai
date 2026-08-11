import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const STATUSES = ['lead', 'qualified', 'proposal', 'won', 'lost', 'active'];
const COLORS = ['#C89B3C', '#2563eb', '#7c3aed', '#059669', '#dc2626', '#0891b2', '#db2777'];

export default function ContactForm({ orgId, contact, onClose, onSaved }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', company: '',
    status: 'lead', source: '', tags: '', owner_name: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (contact) {
      setForm({
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        company: contact.company || '',
        status: contact.status || 'lead',
        source: contact.source || '',
        tags: (contact.tags || []).join(', '),
        owner_name: contact.owner_name || '',
      });
    }
  }, [contact]);

  async function save() {
    setSaving(true); setErr('');
    try {
      const payload = {
        organization_id: orgId,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        company: form.company.trim(),
        status: form.status,
        source: form.source.trim(),
        owner_name: form.owner_name.trim(),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        avatar_color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
      if (contact?.id) {
        await base44.entities.GhlContact.update(contact.id, payload);
      } else {
        await base44.entities.GhlContact.create(payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      setErr(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const field = (key, label, type = 'text') => (
    <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>
      {label}
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        style={inputStyle}
      />
    </label>
  );

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={modalHead}>
          <b>{contact ? 'Edit Contact' : 'New Contact'}</b>
          <button onClick={onClose} style={iconBtn}><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: 22 }}>
          {field('first_name', 'First Name')}
          {field('last_name', 'Last Name')}
          {field('email', 'Email', 'email')}
          {field('phone', 'Phone')}
          {field('company', 'Company')}
          {field('source', 'Source')}
          {field('owner_name', 'Owner')}
          <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700 }}>
            Status
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inputStyle}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 5, fontSize: 12, fontWeight: 700, gridColumn: '1 / -1' }}>
            Tags (comma separated)
            <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} style={inputStyle} placeholder="vip, hvac, follow-up" />
          </label>
        </div>
        {err && <p style={{ color: '#C63D34', fontSize: 12, padding: '0 22px' }}>{err}</p>}
        <div style={{ display: 'flex', gap: 10, padding: '14px 22px 22px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnOutline}>Cancel</button>
          <button onClick={save} disabled={saving} style={btnGold}>{saving ? 'Saving…' : 'Save Contact'}</button>
        </div>
      </div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'grid', placeItems: 'center' };
const modal = { width: 'min(640px, 92vw)', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,.3)' };
const modalHead = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: '1px solid #eee', fontFamily: "'Libre Caslon Display', serif", fontSize: 20 };
const inputStyle = { padding: '10px 12px', border: '1px solid #d7d7d7', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', background: '#fff', color: '#111' };
const iconBtn = { background: 'none', border: 0, cursor: 'pointer', color: '#999' };
const btnOutline = { padding: '10px 18px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' };
const btnGold = { padding: '10px 18px', border: 0, borderRadius: 6, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' };