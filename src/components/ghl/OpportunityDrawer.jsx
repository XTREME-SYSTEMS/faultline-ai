import { useState, useEffect } from 'react';
import { X, Plus, Check, Phone, Mail, Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const TYPE_ICON = { call: Phone, email: Mail, sms: Mail, note: Plus, meeting: Calendar, task: Plus, deadline: Calendar };
const TYPE_COLOR = { call: '#2563eb', email: '#7c3aed', sms: '#059669', note: '#888', meeting: '#C89B3C', task: '#dc2626', deadline: '#C63D34' };

export default function OpportunityDrawer({ orgId, opportunity, pipeline, onClose, onChanged }) {
  const [opp, setOpp] = useState(opportunity);
  const [activities, setActivities] = useState([]);
  const [newAct, setNewAct] = useState({ type: 'note', title: '', due_date: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { setOpp(opportunity); }, [opportunity]);

  async function loadActivities() {
    if (!opportunity?.id) return;
    try {
      const list = await base44.entities.GhlActivity.filter({ opportunity_id: opportunity.id }, '-created_date', 50);
      setActivities(list);
    } catch (e) { console.error(e); }
  }
  useEffect(() => { loadActivities(); }, [opportunity?.id]);

  async function updateField(key, value) {
    const next = { ...opp, [key]: value };
    setOpp(next);
    setSaving(true);
    try {
      await base44.entities.GhlOpportunity.update(opportunity.id, { [key]: value });
      onChanged();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }

  async function addActivity() {
    if (!newAct.title.trim()) return;
    try {
      await base44.entities.GhlActivity.create({
        organization_id: orgId,
        opportunity_id: opportunity.id,
        contact_id: opportunity.contact_id,
        type: newAct.type,
        title: newAct.title.trim(),
        due_date: newAct.due_date ? new Date(newAct.due_date).toISOString() : null,
      });
      setNewAct({ type: 'note', title: '', due_date: '' });
      loadActivities();
    } catch (e) { console.error(e); }
  }

  async function toggleActivity(a) {
    await base44.entities.GhlActivity.update(a.id, { completed: !a.completed, completed_at: !a.completed ? new Date().toISOString() : null });
    loadActivities();
  }

  const stages = pipeline?.stages || [];

  return (
    <div style={overlay}>
      <div style={drawer}>
        <div style={drawerHead}>
          <div>
            <small style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em' }}>Opportunity</small>
            <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22, display: 'block' }}>{opp?.title}</b>
          </div>
          <button onClick={onClose} style={iconBtn}><X size={20} /></button>
        </div>

        <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
          {/* Contact */}
          {opp?.contact_name && (
            <div style={{ marginBottom: 18, padding: 14, background: '#f8f7f4', borderRadius: 8 }}>
              <small style={{ color: '#999', fontSize: 11 }}>Contact</small>
              <b style={{ display: 'block', fontSize: 14 }}>{opp.contact_name}</b>
            </div>
          )}

          {/* Value */}
          <label style={fieldLabel}>Deal Value ($)
            <input type="number" value={opp?.value || 0} onChange={e => setOpp({ ...opp, value: Number(e.target.value) })} onBlur={e => updateField('value', Number(e.target.value))} style={input} />
          </label>

          {/* Stage */}
          <label style={fieldLabel}>Stage
            <select value={opp?.stage || ''} onChange={e => updateField('stage', e.target.value)} style={input}>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>

          {/* Status */}
          <label style={fieldLabel}>Status
            <select value={opp?.status || 'open'} onChange={e => updateField('status', e.target.value)} style={input}>
              <option value="open">Open</option><option value="won">Won</option><option value="lost">Lost</option>
            </select>
          </label>

          {/* Expected close */}
          <label style={fieldLabel}>Expected Close
            <input type="date" value={opp?.expected_close ? opp.expected_close.slice(0, 10) : ''} onChange={e => updateField('expected_close', e.target.value)} style={input} />
          </label>

          {/* Probability */}
          <label style={fieldLabel}>Probability (%)
            <input type="number" min="0" max="100" value={opp?.probability || 0} onChange={e => setOpp({ ...opp, probability: Number(e.target.value) })} onBlur={e => updateField('probability', Number(e.target.value))} style={input} />
          </label>

          {/* Notes */}
          <label style={fieldLabel}>Notes
            <textarea value={opp?.notes || ''} onChange={e => setOpp({ ...opp, notes: e.target.value })} onBlur={e => updateField('notes', e.target.value)} rows={3} style={{ ...input, resize: 'vertical' }} />
          </label>

          {/* Activity timeline */}
          <div style={{ marginTop: 26, borderTop: '1px solid #eee', paddingTop: 18 }}>
            <b style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>Activity Timeline</b>
            <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
              {activities.length === 0 && <p style={{ color: '#999', fontSize: 12 }}>No activity logged yet.</p>}
              {activities.map(a => {
                const Icon = TYPE_ICON[a.type] || Plus;
                return (
                  <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <button onClick={() => toggleActivity(a)} style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${TYPE_COLOR[a.type] || '#888'}`, background: a.completed ? (TYPE_COLOR[a.type] || '#888') : '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      {a.completed && <Check size={14} color="#fff" />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, textDecoration: a.completed ? 'line-through' : 'none', color: a.completed ? '#999' : '#111' }}>{a.title}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Icon size={11} style={{ color: TYPE_COLOR[a.type] || '#888' }} />
                        <small style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>{a.type}</small>
                        {a.due_date && <small style={{ fontSize: 10, color: '#B88214' }}>due {new Date(a.due_date).toLocaleDateString()}</small>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={newAct.type} onChange={e => setNewAct({ ...newAct, type: e.target.value })} style={{ ...input, width: 'auto' }}>
                {Object.keys(TYPE_ICON).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input value={newAct.title} onChange={e => setNewAct({ ...newAct, title: e.target.value })} placeholder="Log activity…" style={{ ...input, flex: 1, minWidth: 140 }} onKeyDown={e => e.key === 'Enter' && addActivity()} />
              <input type="date" value={newAct.due_date} onChange={e => setNewAct({ ...newAct, due_date: e.target.value })} style={{ ...input, width: 'auto' }} />
              <button onClick={addActivity} style={btnGold}><Plus size={14} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' };
const drawer = { width: 'min(460px, 92vw)', background: '#fff', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 40px rgba(0,0,0,.2)' };
const drawerHead = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 22px', borderBottom: '1px solid #eee' };
const fieldLabel = { display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 14 };
const input = { padding: '10px 12px', border: '1px solid #d7d7d7', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', background: '#fff', color: '#111' };
const iconBtn = { background: 'none', border: 0, cursor: 'pointer', color: '#999' };
const btnGold = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 14px', border: 0, borderRadius: 6, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', cursor: 'pointer', fontFamily: 'inherit' };