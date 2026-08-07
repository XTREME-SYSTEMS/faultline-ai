import { useState, useEffect, useRef } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import { Play, ShieldCheck, Activity, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

const PILLAR_LABELS = {
  scraping: 'Scraping', cloning: 'Cloning', generation: 'Generation',
  speed_efficiency: 'Speed & Efficiency', capabilities: 'Capabilities',
  forensic_audit: 'Forensic Audit', system_validation: 'System Validation'
};

const STATUS_COLORS = {
  pending: '#999', in_progress: '#2563eb', implemented: '#8A641C',
  validated: '#B88214', audited: '#237A4B', failed: '#C63D34', deferred: '#a85c00'
};

export default function EnhancementEngine() {
  const [enhancements, setEnhancements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const messagesEndRef = useRef(null);

  const loadEnhancements = async () => {
    try {
      const data = await base44.entities.SystemEnhancement.list('-created_date', 100);
      setEnhancements(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadEnhancements(); }, []);

  // Subscribe to enhancement updates in real time
  useEffect(() => {
    const unsub = base44.entities.SystemEnhancement.subscribe(() => loadEnhancements());
    return unsub;
  }, []);

  // Load or create the agent conversation on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const convos = await base44.agents.listConversations({ agent_name: 'faultline_enhancer' });
        const convo = convos && convos.length > 0
          ? convos[0]
          : await base44.agents.createConversation({ agent_name: 'faultline_enhancer', metadata: { name: 'Enhancement Engine Session' } });
        if (!cancelled) {
          setConversation(convo);
          setMessages(convo.messages || []);
        }
      } catch (e) { console.error('conversation init failed:', e); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Subscribe to the conversation for streaming updates
  useEffect(() => {
    if (!conversation) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return unsubscribe;
  }, [conversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendCommand = async (cmd) => {
    const text = cmd || input;
    if (!text.trim() || sending || !conversation) return;
    setSending(true);
    setInput('');
    try {
      const updated = await base44.agents.addMessage(conversation, { role: 'user', content: text });
      setConversation(updated);
      setMessages(updated.messages || []);
    } catch (e) { console.error('send failed:', e); } finally { setSending(false); }
  };

  const stats = {
    total: enhancements.length,
    pending: enhancements.filter(e => e.status === 'pending').length,
    in_progress: enhancements.filter(e => e.status === 'in_progress').length,
    validated: enhancements.filter(e => e.status === 'validated').length,
    audited: enhancements.filter(e => e.status === 'audited' && e.audit_result === 'pass').length,
    failed: enhancements.filter(e => e.status === 'failed').length,
    deferred: enhancements.filter(e => e.status === 'deferred').length
  };

  const byPillar = {};
  enhancements.forEach(e => {
    if (!byPillar[e.pillar]) byPillar[e.pillar] = [];
    byPillar[e.pillar].push(e);
  });

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">FAANG Enterprise Grade</p>
          <h1>Enhancement Engine</h1>
          <p>Recursive implement → validate → audit loop across 23 enhancements, then a deep forensic audit of the entire platform. Invoke the engine below to start or resume the cycle.</p>
        </div>
        <button onClick={loadEnhancements} className="btn outline" style={{ fontSize: 13, padding: '10px 16px' }}>
          <RefreshCw size={14} style={{ marginRight: 6 }} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="metrics" style={{ gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total', value: stats.total, color: '#111' },
          { label: 'Pending', value: stats.pending, color: STATUS_COLORS.pending },
          { label: 'In Progress', value: stats.in_progress, color: STATUS_COLORS.in_progress },
          { label: 'Validated', value: stats.validated, color: STATUS_COLORS.validated },
          { label: 'Audited ✓', value: stats.audited, color: STATUS_COLORS.audited },
          { label: 'Failed', value: stats.failed, color: STATUS_COLORS.failed },
          { label: 'Deferred', value: stats.deferred, color: STATUS_COLORS.deferred }
        ].map(s => (
          <article key={s.label} style={{ minHeight: 90 }}>
            <span>{s.label}</span>
            <b style={{ color: s.color, fontSize: 26 }}>{s.value}</b>
            {s.label === 'Audited ✓' && stats.total > 0 && (
              <em style={{ color: '#237A4B' }}>{Math.round(stats.audited / stats.total * 100)}%</em>
            )}
          </article>
        ))}
      </div>

      {/* Quick invoke buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => sendCommand('run enhancement loop')} disabled={sending} className="btn dark" style={{ fontSize: 13, padding: '12px 20px' }}>
          <Play size={14} style={{ marginRight: 6 }} /> Run Enhancement Loop
        </button>
        <button onClick={() => sendCommand('forensic audit')} disabled={sending} className="btn gold" style={{ fontSize: 13, padding: '12px 20px' }}>
          <ShieldCheck size={14} style={{ marginRight: 6 }} /> Deep Forensic Audit
        </button>
        <button onClick={() => sendCommand('enhancement status')} disabled={sending} className="btn outline" style={{ fontSize: 13, padding: '12px 20px' }}>
          <Activity size={14} style={{ marginRight: 6 }} /> Status Report
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
        {/* Enhancement grid */}
        <div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading enhancements…</div>
          ) : (
            Object.entries(byPillar).map(([pillar, items]) => (
              <div key={pillar} style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, margin: '0 0 10px', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {PILLAR_LABELS[pillar] || pillar}
                  <span style={{ fontSize: 11, color: '#999', fontWeight: 400 }}>({items.filter(i => i.status === 'audited' && i.audit_result === 'pass').length}/{items.length} audited)</span>
                </h3>
                <div style={{ display: 'grid', gap: 6 }}>
                  {items.map(e => (
                    <div key={e.id} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 6, overflow: 'hidden' }}>
                      <button onClick={() => setExpanded(expanded === e.id ? null : e.id)} style={{ width: '100%', padding: '12px 14px', background: 'none', border: 0, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                        {expanded === e.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#999', minWidth: 70 }}>{e.enhancement_id}</span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{e.title}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: STATUS_COLORS[e.status] + '20', color: STATUS_COLORS[e.status], whiteSpace: 'nowrap' }}>{e.status}</span>
                      </button>
                      {expanded === e.id && (
                        <div style={{ padding: '0 14px 14px 38px', borderTop: '1px solid #eee', fontSize: 12 }}>
                          <p style={{ color: '#666', margin: '10px 0 8px' }}>{e.description}</p>
                          <p style={{ margin: '0 0 8px' }}><b style={{ color: 'var(--gold)' }}>Technology:</b> <span style={{ color: '#666' }}>{e.technology}</span></p>
                          {e.acceptance_criteria?.length > 0 && (
                            <div style={{ margin: '0 0 8px' }}>
                              <b style={{ color: 'var(--gold)' }}>Acceptance Criteria:</b>
                              <ul style={{ margin: '4px 0 0 16px', padding: 0, color: '#666' }}>
                                {e.acceptance_criteria.map((c, i) => <li key={i} style={{ marginBottom: 2 }}>{c}</li>)}
                              </ul>
                            </div>
                          )}
                          {e.depends_on?.length > 0 && <p style={{ margin: '0 0 8px' }}><b style={{ color: 'var(--gold)' }}>Depends on:</b> <span style={{ color: '#666' }}>{e.depends_on.join(', ')}</span></p>}
                          {e.iteration_count > 0 && <p style={{ margin: '0 0 8px' }}><b>Iterations:</b> {e.iteration_count}</p>}
                          {e.validation_notes && <p style={{ margin: '0 0 8px' }}><b style={{ color: 'var(--gold)' }}>Validation:</b> <span style={{ color: '#666' }}>{e.validation_notes}</span></p>}
                          {e.audit_notes && <p style={{ margin: '0 0 8px' }}><b style={{ color: 'var(--gold)' }}>Audit:</b> <span style={{ color: '#666' }}>{e.audit_notes}</span></p>}
                          {e.files_touched?.length > 0 && <p style={{ margin: 0, fontSize: 11, color: '#999' }}>Files: {e.files_touched.join(', ')}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Agent conversation */}
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 340px)', minHeight: 500, position: 'sticky', top: 90 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #eee', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} style={{ color: 'var(--gold)' }} /> Enhancement Engine
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ color: '#999', fontSize: 13, textAlign: 'center', marginTop: 30 }}>
                Invoke the engine with a command above to start the recursive loop.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'chat user' : 'chat bot'}>
                {m.content && <ReactMarkdown>{m.content}</ReactMarkdown>}
                {m.tool_calls?.map((tc, j) => (
                  <div key={j} style={{ fontSize: 11, color: '#896930', marginTop: 6, padding: '4px 8px', background: '#f8f7f4', borderRadius: 4 }}>
                    ⚙ {tc.name} — {tc.status}
                  </div>
                ))}
              </div>
            ))}
            {sending && <div className="chat bot"><span className="dot-anim">●●●</span></div>}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); sendCommand(); }} style={{ display: 'flex', borderTop: '1px solid #eee' }}>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a command…" style={{ flex: 1, padding: 11, border: 0, fontSize: 13 }} />
            <button type="submit" disabled={sending} style={{ width: 44, background: '#111', color: '#fff', border: 0, cursor: 'pointer' }}>→</button>
          </form>
        </div>
      </div>
    </PortalShell>
  );
}