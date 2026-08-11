import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import OpportunityDrawer from './OpportunityDrawer';

export default function PipelineBoard({ orgId, pipeline }) {
  const [opps, setOpps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(null);
  const [showAdd, setShowAdd] = useState(null); // stage id
  const [contacts, setContacts] = useState([]);

  async function load() {
    setLoading(true);
    try {
      const [o, c] = await Promise.all([
        base44.entities.GhlOpportunity.list('-updated_date', 500),
        base44.entities.GhlContact.list('-updated_date', 500),
      ]);
      setOpps(o);
      setContacts(c);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function onDragEnd(result) {
    if (!result.destination) return;
    const oppId = result.draggableId;
    const newStage = result.destination.droppableId;
    const opp = opps.find(o => o.id === oppId);
    if (!opp || opp.stage === newStage) return;
    setOpps(prev => prev.map(o => o.id === oppId ? { ...o, stage: newStage } : o));
    try {
      await base44.entities.GhlOpportunity.update(oppId, { stage: newStage });
      await base44.entities.GhlActivity.create({
        organization_id: orgId, opportunity_id: oppId, contact_id: opp.contact_id,
        type: 'note', title: `Moved to ${pipeline.stages.find(s => s.id === newStage)?.name || newStage}`,
      });
    } catch (e) { console.error(e); load(); }
  }

  async function addOpportunity(stageId, data) {
    try {
      const contact = contacts.find(c => c.id === data.contact_id);
      await base44.entities.GhlOpportunity.create({
        organization_id: orgId,
        title: data.title,
        contact_id: data.contact_id || null,
        contact_name: contact ? `${contact.first_name} ${contact.last_name}`.trim() : '',
        pipeline_id: pipeline.id,
        stage: stageId,
        value: Number(data.value) || 0,
        expected_close: data.expected_close || null,
      });
      setShowAdd(null);
      load();
    } catch (e) { console.error(e); }
  }

  const stages = pipeline?.stages || [];
  const totalValue = opps.reduce((s, o) => s + (o.value || 0), 0);

  if (!pipeline) return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>No pipeline configured.</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22 }}>{pipeline.name}</b>
          <span style={{ color: '#999', fontSize: 13, marginLeft: 12 }}>{opps.length} deals · ${totalValue.toLocaleString()} pipeline</span>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#999' }}>Loading pipeline…</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
            {stages.map(stage => {
              const stageOpps = opps.filter(o => o.stage === stage.id);
              const stageValue = stageOpps.reduce((s, o) => s + (o.value || 0), 0);
              return (
                <Droppable droppableId={stage.id} key={stage.id}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} style={{
                      width: 280, flexShrink: 0, background: snapshot.isDraggingOver ? '#f0ede5' : '#f8f7f4',
                      borderRadius: 10, display: 'flex', flexDirection: 'column', minHeight: 200, border: '1px solid #ece8de',
                    }}>
                      <div style={{ padding: '12px 14px', borderBottom: '1px solid #ece8de', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: stage.color || '#C89B3C' }} />
                          <b style={{ fontSize: 13 }}>{stage.name}</b>
                        </div>
                        <span style={{ fontSize: 11, color: '#999' }}>{stageOpps.length} · ${stageValue.toLocaleString()}</span>
                      </div>
                      <div style={{ padding: 10, display: 'grid', gap: 8, flex: 1 }}>
                        {stageOpps.map(o => (
                          <Draggable draggableId={o.id} key={o.id} index={stageOpps.indexOf(o)}>
                            {(p, snap) => (
                              <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} onClick={() => setDrawer(o)} style={{
                                background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 12, cursor: 'grab',
                                boxShadow: snap.isDragging ? '0 8px 24px rgba(0,0,0,.15)' : '0 1px 3px rgba(0,0,0,.05)',
                              }}>
                                <b style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>{o.title}</b>
                                {o.contact_name && <small style={{ fontSize: 11, color: '#666', display: 'block' }}>{o.contact_name}</small>}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>${(o.value || 0).toLocaleString()}</span>
                                  {o.expected_close && <small style={{ fontSize: 10, color: '#B88214' }}>{new Date(o.expected_close).toLocaleDateString()}</small>}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        <button onClick={() => setShowAdd(stage.id)} style={addBtn}><Plus size={12} /> Add deal</button>
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {drawer && <OpportunityDrawer orgId={orgId} opportunity={drawer} pipeline={pipeline} onClose={() => setDrawer(null)} onChanged={load} />}

      {showAdd && (
        <AddOpportunityModal stage={stages.find(s => s.id === showAdd)} contacts={contacts} onClose={() => setShowAdd(null)} onCreate={d => addOpportunity(showAdd, d)} />
      )}
    </div>
  );
}

function AddOpportunityModal({ stage, contacts, onClose, onCreate }) {
  const [form, setForm] = useState({ title: '', contact_id: '', value: '', expected_close: '' });
  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: '1px solid #eee' }}>
          <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 18 }}>New Deal — {stage?.name}</b>
          <button onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', color: '#999' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gap: 14, padding: 22 }}>
          <label style={fl}>Deal Title
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={inp} placeholder="Roof replacement quote" autoFocus />
          </label>
          <label style={fl}>Contact
            <select value={form.contact_id} onChange={e => setForm({ ...form, contact_id: e.target.value })} style={inp}>
              <option value="">— No contact —</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.company || 'no company'})</option>)}
            </select>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={fl}>Value ($)
              <input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} style={inp} />
            </label>
            <label style={fl}>Expected Close
              <input type="date" value={form.expected_close} onChange={e => setForm({ ...form, expected_close: e.target.value })} style={inp} />
            </label>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '0 22px 22px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnO}>Cancel</button>
          <button onClick={() => form.title && onCreate(form)} disabled={!form.title} style={btnG}>Create Deal</button>
        </div>
      </div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'grid', placeItems: 'center' };
const modal = { width: 'min(520px, 92vw)', background: '#fff', borderRadius: 12, overflow: 'hidden' };
const fl = { display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 };
const inp = { padding: '10px 12px', border: '1px solid #d7d7d7', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', background: '#fff', color: '#111' };
const addBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center', padding: '8px', border: '1px dashed #ccc', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#888', fontFamily: 'inherit' };
const btnO = { padding: '10px 18px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' };
const btnG = { padding: '10px 18px', border: 0, borderRadius: 6, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' };