import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, AlertCircle, ShoppingBag, X, Sparkles, ArrowRight, Send } from 'lucide-react';

export default function ClientFunnel() {
  const projectId = new URLSearchParams(window.location.search).get('project') || '';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [discovery, setDiscovery] = useState({});
  const [fixMode, setFixMode] = useState(false);
  const [fixResponses, setFixResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [cartFlash, setCartFlash] = useState(null);

  const load = async () => {
    if (!projectId) { setError('No project specified. Ask your FaultLine operator for your portal link.'); setLoading(false); return; }
    try {
      const res = await base44.functions.invoke('clientWorkflowEngine', { action: 'getProject', project_id: projectId });
      if (res.data?.error) throw new Error(res.data.error);
      const d = res.data || res;
      setData(d);
      if (d.project?.discovery_responses && Object.keys(d.project.discovery_responses).length > 0) {
        setDiscovery(d.project.discovery_responses);
      }
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const { project, gates = [], reviews = [], cart, upsells = [], service_types = {} } = data || {};
  const currentGate = gates.find(g => g.slug === project?.current_gate);
  const currentReview = reviews.filter(r => r.gate_slug === project?.current_gate).sort((a,b) => b.iteration - a.iteration)[0];
  const inCart = (sid) => (cart?.items || []).some(i => i.tool_id === sid);

  const submitDiscovery = async () => {
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('clientWorkflowEngine', { action: 'submitDiscovery', project_id: projectId, responses: discovery });
      if (res.data?.error) throw new Error(res.data.error);
      await load();
    } catch (e) { setError(e.message); } finally { setSubmitting(false); }
  };

  const submitReview = async (decision) => {
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('clientWorkflowEngine', {
        action: 'submitGateReview', project_id: projectId, gate_slug: project.current_gate,
        decision, fix_responses: decision === 'fix' ? fixResponses : {}, decision_note: fixResponses.open_feedback || ''
      });
      if (res.data?.error) throw new Error(res.data.error);
      setFixMode(false); setFixResponses({});
      await load();
    } catch (e) { setError(e.message); } finally { setSubmitting(false); }
  };

  const addUpsell = async (sid) => {
    try {
      const res = await base44.functions.invoke('clientWorkflowEngine', { action: 'addUpsell', project_id: projectId, service_id: sid });
      setCartFlash(sid); setTimeout(() => setCartFlash(null), 1500);
      await load();
    } catch (e) { setError(e.message); }
  };
  const removeUpsell = async (sid) => { await base44.functions.invoke('clientWorkflowEngine', { action: 'removeUpsell', project_id: projectId, service_id: sid }); await load(); };
  const checkout = async () => {
    try {
      const res = await base44.functions.invoke('clientWorkflowEngine', { action: 'checkoutCart', project_id: projectId });
      if (res.data?.checkout_url) window.location.href = res.data.checkout_url;
      else if (res.data?.error) setError(res.data.error);
    } catch (e) { setError(e.message); }
  };

  const isDiscoveryDone = project && Object.keys(project.discovery_responses || {}).length > 0;

  if (loading) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#faf9f7' }}><div style={{ textAlign: 'center' }}><div className="dot-anim" style={{ fontSize: 30, color: 'var(--gold)' }}>●●●</div><p style={{ color: '#999', marginTop: 12 }}>Loading your project portal…</p></div></div>;

  if (error && !data) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#faf9f7', padding: 20 }}><div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: 32, maxWidth: 420, textAlign: 'center' }}><AlertCircle size={32} style={{ color: '#C63D34', margin: '0 auto 12px' }} /><b style={{ fontSize: 18 }}>{error}</b><p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>Please contact your FaultLine operator.</p></div></div>;

  const st = service_types[project.service_type] || {};

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7' }}>
      {/* Header */}
      <header style={{ background: '#0a0a0a', color: '#fff', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 22 }}>{st.icon}</span>
        <div style={{ flex: 1 }}>
          <b style={{ font: '400 22px Libre Caslon Display, serif' }}>{project.project_name}</b>
          <small style={{ display: 'block', color: 'var(--gold2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em' }}>{st.label} · Client Portal</small>
        </div>
        {cart && cart.item_count > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1a1a1a', padding: '8px 14px', borderRadius: 8 }}>
            <ShoppingBag size={16} style={{ color: 'var(--gold2)' }} />
            <b style={{ fontSize: 13 }}>{cart.item_count}</b>
            <span style={{ fontSize: 12, color: '#999' }}>${(cart.total || 0).toLocaleString()}</span>
          </div>
        )}
      </header>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 20px 80px' }}>
        {/* Progress bar */}
        {isDiscoveryDone && (
          <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <b style={{ fontSize: 14 }}>Project Progress</b>
              <span style={{ fontSize: 12, color: '#888' }}>{project.gate_index} of {project.total_gates} gates</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {gates.map((g, i) => {
                const gateReviews = reviews.filter(r => r.gate_slug === g.slug);
                const approved = gateReviews.some(r => r.state === 'approved');
                const isCurrent = g.slug === project.current_gate && project.status !== 'completed';
                const isPast = i < project.gate_index || (project.status === 'completed');
                return (
                  <div key={g.slug} title={g.title} style={{
                    flex: 1, height: 8, borderRadius: 4,
                    background: approved || isPast ? '#237A4B' : isCurrent ? 'var(--gold)' : '#e5e1da'
                  }} />
                );
              })}
            </div>
            {project.status === 'completed' && (
              <div style={{ marginTop: 14, padding: 14, background: '#dcefe2', borderRadius: 8, color: '#1e6b3a', fontWeight: 600, fontSize: 14, textAlign: 'center' }}>
                🎉 Your project is complete! Thank you for building with FaultLine.
              </div>
            )}
          </div>
        )}

        {/* DISCOVERY (if not done) */}
        {!isDiscoveryDone && (
          <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: '28px 32px' }}>
            <p style={{ color: 'var(--gold)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: '0 0 8px' }}>Step 1 · Discovery</p>
            <h1 style={{ font: '400 32px Libre Caslon Display, serif', margin: '0 0 8px', letterSpacing: '-.02em' }}>Let's get to know your project</h1>
            <p style={{ color: '#666', fontSize: 15, margin: '0 0 28px' }}>Answer a few questions so we can build exactly what you need. Your answers shape every step.</p>
            <DiscoveryForm serviceType={project.service_type} responses={discovery} setResponses={setDiscovery} />
            <button onClick={submitDiscovery} disabled={submitting} className="btn dark" style={{ marginTop: 24, width: '100%', padding: '16px', fontSize: 15 }}>
              {submitting ? 'Submitting…' : 'Submit Discovery →'}
            </button>
          </div>
        )}

        {/* CURRENT GATE REVIEW */}
        {isDiscoveryDone && project.status !== 'completed' && currentGate && (
          <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: '28px 32px', marginBottom: 20 }}>
            <p style={{ color: 'var(--gold)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: '0 0 8px' }}>
              Gate {project.gate_index + 1} of {project.total_gates}
            </p>
            <h1 style={{ font: '400 30px Libre Caslon Display, serif', margin: '0 0 6px', letterSpacing: '-.02em' }}>{currentGate.title}</h1>
            <p style={{ color: '#666', fontSize: 14, margin: '0 0 24px' }}>{currentGate.description}</p>

            {project.status === 'in_review' ? (
              <>
                {/* Deliverable preview */}
                <div style={{ background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 10, padding: 24, marginBottom: 20, textAlign: 'center' }}>
                  <CheckCircle2 size={36} style={{ color: '#237A4B', margin: '0 auto 10px' }} />
                  <b style={{ fontSize: 16 }}>Your deliverable is ready for review</b>
                  <p style={{ color: '#888', fontSize: 13, margin: '8px 0 0' }}>Review the work below, then approve or request changes.</p>
                  {project.current_deliverable_id && (
                    <a href={`/app/deliverable-studio?d=${project.current_deliverable_id}`} target="_blank" className="btn outline" style={{ marginTop: 16, fontSize: 13, padding: '10px 20px' }}>View deliverable →</a>
                  )}
                </div>

                {!fixMode ? (
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => submitReview('approve')} disabled={submitting} className="btn dark" style={{ flex: 1, padding: '16px', fontSize: 15, background: '#237A4B' }}>
                      <CheckCircle2 size={16} style={{ marginRight: 6, display: 'inline' }} /> Approve & Continue
                    </button>
                    <button onClick={() => setFixMode(true)} disabled={submitting} className="btn outline" style={{ flex: 1, padding: '16px', fontSize: 15 }}>
                      Request Fixes
                    </button>
                  </div>
                ) : (
                  <FixForm gateSlug={currentGate.slug} responses={fixResponses} setResponses={setFixResponses} />
                )}
                {fixMode && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    <button onClick={() => submitReview('fix')} disabled={submitting} className="btn gold" style={{ flex: 1, padding: '14px', fontSize: 14 }}>
                      <Send size={14} style={{ marginRight: 6, display: 'inline' }} /> Submit Feedback
                    </button>
                    <button onClick={() => { setFixMode(false); setFixResponses({}); }} className="btn outline" style={{ padding: '14px 20px', fontSize: 14 }}>Cancel</button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 10, padding: 28, textAlign: 'center' }}>
                <div className="dot-anim" style={{ fontSize: 24, color: 'var(--gold)', marginBottom: 10 }}>●●●</div>
                <b style={{ fontSize: 15 }}>We're preparing this deliverable</b>
                <p style={{ color: '#888', fontSize: 13, margin: '8px 0 0' }}>
                  {currentReview?.state === 'fix_requested'
                    ? `We're revising based on your feedback (round ${currentReview.iteration}). You'll get an SMS/email when it's ready.`
                    : 'You\'ll receive an SMS and email as soon as it\'s ready for your review.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* UPSELLS */}
        {isDiscoveryDone && upsells.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: '28px 32px', marginBottom: 20 }}>
            <p style={{ color: 'var(--gold)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: '0 0 8px' }}><Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} /> Enhancements</p>
            <h2 style={{ font: '400 24px Libre Caslon Display, serif', margin: '0 0 6px' }}>Add upgrades to your project</h2>
            <p style={{ color: '#666', fontSize: 13, margin: '0 0 20px' }}>One-time add-ons we can implement alongside your build.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {upsells.map(u => {
                const added = inCart(u.id);
                return (
                  <div key={u.id} style={{ border: '1px solid #e5e1da', borderRadius: 10, padding: 18, position: 'relative', background: added ? '#f8f7f4' : '#fff' }}>
                    <b style={{ fontSize: 14, display: 'block' }}>{u.title}</b>
                    <p style={{ color: '#888', fontSize: 12, margin: '6px 0 12px', minHeight: 50, lineHeight: 1.5 }}>{u.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <b style={{ font: '400 20px Libre Caslon Display, serif', color: 'var(--gold-dark)' }}>${u.price.toLocaleString()}</b>
                      {added
                        ? <button onClick={() => removeUpsell(u.id)} style={{ background: '#237A4B', color: '#fff', border: 0, borderRadius: 6, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}><CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} /> Added</button>
                        : <button onClick={() => addUpsell(u.id)} style={{ background: cartFlash === u.id ? '#237A4B' : '#0a0a0a', color: '#fff', border: 0, borderRadius: 6, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Add +</button>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
            {cart && cart.item_count > 0 && (
              <div style={{ marginTop: 20, padding: 18, background: '#0a0a0a', color: '#fff', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <b style={{ fontSize: 14 }}>{cart.item_count} upgrade{cart.item_count > 1 ? 's' : ''} in cart</b>
                  <span style={{ fontSize: 13, color: 'var(--gold2)', marginLeft: 10 }}>${(cart.total || 0).toLocaleString()}</span>
                </div>
                <button onClick={checkout} className="btn gold" style={{ fontSize: 13, padding: '10px 20px' }}>Checkout <ArrowRight size={14} style={{ display: 'inline', marginLeft: 4 }} /></button>
              </div>
            )}
          </div>
        )}

        {error && <div style={{ background: '#f5d8d5', color: '#a52d23', padding: 14, borderRadius: 8, fontSize: 13 }}>{error}</div>}
      </div>
    </div>
  );
}

function DiscoveryForm({ serviceType, responses, setResponses }) {
  // Inline import of questionnaires to avoid a second shared module on the frontend
  const [questions, setQuestions] = useState(null);
  useEffect(() => {
    import('@/lib/clientWorkflowFE').then(m => setQuestions(m.DISCOVERY_QUESTIONNAIRES[serviceType] || [])).catch(() => setQuestions([]));
  }, [serviceType]);
  if (!questions) return <p style={{ color: '#999' }}>Loading questions…</p>;
  const set = (id, val) => setResponses({ ...responses, [id]: val });
  const toggle = (id, opt) => {
    const cur = responses[id] || [];
    set(id, cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt]);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {questions.map(q => (
        <div key={q.id}>
          <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 8 }}>{q.question}{q.required && <span style={{ color: '#C63D34' }}> *</span>}</label>
          {q.type === 'text' ? (
            <input value={responses[q.id] || ''} onChange={e => set(q.id, e.target.value)} style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }} />
          ) : q.type === 'single' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {q.options.map(opt => (
                <button key={opt} onClick={() => set(q.id, opt)} style={{
                  padding: '9px 16px', borderRadius: 20, border: '1px solid #ddd', background: responses[q.id] === opt ? '#0a0a0a' : '#fff',
                  color: responses[q.id] === opt ? '#fff' : '#333', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
                }}>{opt}</button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {q.options.map(opt => {
                const sel = (responses[q.id] || []).includes(opt);
                return (
                  <button key={opt} onClick={() => toggle(q.id, opt)} style={{
                    padding: '9px 16px', borderRadius: 20, border: '1px solid #ddd', background: sel ? 'var(--gold)' : '#fff',
                    color: sel ? '#fff' : '#333', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit'
                  }}>{sel ? '✓ ' : ''}{opt}</button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FixForm({ gateSlug, responses, setResponses }) {
  const [questions, setQuestions] = useState(null);
  useEffect(() => {
    import('@/lib/clientWorkflowFE').then(m => setQuestions(m.getGateFixQuestions(gateSlug))).catch(() => setQuestions([]));
  }, [gateSlug]);
  if (!questions) return <p style={{ color: '#999' }}>Loading…</p>;
  const set = (id, val) => setResponses({ ...responses, [id]: val });
  const toggle = (id, opt) => {
    const cur = responses[id] || [];
    set(id, cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt]);
  };
  return (
    <div style={{ borderTop: '1px solid #eee', paddingTop: 20 }}>
      <b style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>Tell us what to fix</b>
      <p style={{ color: '#888', fontSize: 13, margin: '0 0 18px' }}>Select all that apply, then describe in your own words.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {questions.map(q => (
          <div key={q.id}>
            <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 8 }}>{q.question}{q.required && <span style={{ color: '#C63D34' }}> *</span>}</label>
            {q.type === 'text' ? (
              <textarea value={responses[q.id] || ''} onChange={e => set(q.id, e.target.value)} rows={4} placeholder="Be as specific as possible…" style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }} />
            ) : q.type === 'single' ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {q.options.map(opt => (
                  <button key={opt} onClick={() => set(q.id, opt)} style={{ padding: '8px 14px', borderRadius: 20, border: '1px solid #ddd', background: responses[q.id] === opt ? '#C63D34' : '#fff', color: responses[q.id] === opt ? '#fff' : '#333', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{opt}</button>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {q.options.map(opt => {
                  const sel = (responses[q.id] || []).includes(opt);
                  return <button key={opt} onClick={() => toggle(q.id, opt)} style={{ padding: '8px 14px', borderRadius: 20, border: '1px solid #ddd', background: sel ? '#C63D34' : '#fff', color: sel ? '#fff' : '#333', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>{sel ? '✓ ' : ''}{opt}</button>;
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}