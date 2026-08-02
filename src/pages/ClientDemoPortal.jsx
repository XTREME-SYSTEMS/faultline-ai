import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';

export default function ClientDemoPortal() {
  const { companyId } = useParams();
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(companyId || '');
  const [data, setData] = useState(null);
  const [blueprints, setBlueprints] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatThinking, setChatThinking] = useState(false);
  const [demoRunning, setDemoRunning] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Company.list();
        setCompanies(list);
        if (companyId) setSelectedCompany(companyId);
      } catch (e) { /* ignore */ }
      setLoading(false);
    })();
  }, [companyId]);

  const loadCompanyData = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const company = await base44.entities.Company.get(id);
      const audits = await base44.entities.Audit.filter({ company_id: id }, '-created_date', 10);
      const snapshots = await base44.entities.ScanSnapshot.filter({ company_id: id }, '-scanned_at', 10);
      const nodes = await base44.entities.SystemNode.filter({ company_id: id });
      const proposals = await base44.entities.SecurityProposal.filter({ company_id: id }, '-created_date', 5);
      const bps = await base44.entities.AutomationBlueprint.filter({ company_id: id }, '-created_date', 20);
      const opps = await base44.entities.IndustryOpportunity.filter({ industry: company.industry }, '-created_date', 20);
      setData({ company, audits, snapshots, nodes, proposals });
      setBlueprints(bps);
      setOpportunities(opps);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedCompany) loadCompanyData(selectedCompany);
  }, [selectedCompany]);

  const sendChat = async (text) => {
    if (!text.trim() || chatThinking) return;
    const next = [...chatMessages, { role: 'user', text }];
    setChatMessages(next);
    setChatInput('');
    setChatThinking(true);
    try {
      const company = data?.company;
      const prompt = `You are the FaultLine AI demo assistant for ${company?.name || 'this company'} (${company?.industry || 'Unknown industry'}). The client is exploring the demo portal. Be enthusiastic, specific, and reference real data: health score ${data?.snapshots?.[0]?.health_score || 'N/A'}, ${data?.nodes?.length || 0} systems mapped, ${blueprints.length} automation blueprints available. Keep responses to 2-3 sentences. End with [CHOICES]option1|option2|option3[/CHOICES] when suggesting next steps.

Conversation: ${next.map(m => `${m.role}: ${m.text}`).join('\n')}`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      const choicesMatch = res.match(/\[CHOICES\]([^\]]+)\[\/CHOICES\]/);
      const choices = choicesMatch ? choicesMatch[1].split('|').map(s => s.trim()) : null;
      const cleanText = res.replace(/\[CHOICES\][^\]]*\[\/CHOICES\]/g, '').trim();
      setChatMessages(prev => [...prev, { role: 'bot', text: cleanText, choices }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I hit a snag. Try again?' }]);
    }
    setChatThinking(false);
  };

  const runDemo = async (bp) => {
    setDemoRunning(bp.id);
    // Simulate the automation running
    await new Promise(r => setTimeout(r, 2000));
    setDemoRunning(null);
  };

  if (loading && !data) return <PortalShell><p style={{ padding: 28, color: '#888' }}>Loading demo portal…</p></PortalShell>;

  const latestSnapshot = data?.snapshots?.[0];
  const latestProposal = data?.proposals?.[0];

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Interactive Client Experience</p>
          <h1>Client Demo Portal</h1>
          <p>Show clients the full power of FaultLine AI. Let them explore system enhancements, try AI features interactively, see before/after comparisons, and experience automation blueprints in action.</p>
        </div>
      </div>

      {/* Company selector */}
      <section className="finding" style={{ marginTop: 13 }}>
        <h2 style={{ fontSize: 18, marginBottom: 15 }}>Select a company to demo</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={selectedCompany}
            onChange={(e) => { setSelectedCompany(e.target.value); setData(null); }}
            style={{ padding: '12px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, minWidth: 320, background: '#fff' }}
          >
            <option value="">— Choose a company —</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.industry || 'general'})</option>)}
          </select>
          {selectedCompany && <a href={`/portal/${selectedCompany}`} target="_blank" rel="noopener noreferrer" className="btn gold" style={{ fontSize: 13 }}>Open client portal →</a>}
        </div>
      </section>

      {!selectedCompany ? (
        <section className="finding" style={{ marginTop: 13, textAlign: 'center', padding: 60 }}>
          <p style={{ fontSize: 18, color: '#666' }}>Select a company above to launch the interactive demo experience.</p>
          <p style={{ fontSize: 14, color: '#888', marginTop: 8 }}>Clients can explore system maps, try AI chat, view before/after scores, and watch automation blueprints run in real time.</p>
        </section>
      ) : loading ? (
        <p style={{ padding: 28, color: '#888' }}>Loading demo data…</p>
      ) : data && (
        <>
          {/* Tab navigation */}
          <div style={{ display: 'flex', gap: 4, marginTop: 13, borderBottom: '2px solid #111', flexWrap: 'wrap' }}>
            {[
              ['overview', '📊 Overview'],
              ['system-map', '🗺️ System Map'],
              ['enhancements', '⚡ Enhancements'],
              ['try-ai', '🤖 Try AI'],
              ['proposals', '📋 Proposals']
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: '12px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 0, borderBottom: activeTab === key ? '3px solid var(--gold)' : '3px solid transparent',
                  background: activeTab === key ? '#f8f7f4' : 'transparent', color: activeTab === key ? '#111' : '#888'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {activeTab === 'overview' && (
            <>
              <div className="metrics" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 13 }}>
                <article>
                  <small>Current Health Score</small>
                  <b style={{ color: '#a52d23' }}>{latestSnapshot?.health_score || '—'}</b>
                  <span>/100 — before FaultLine AI</span>
                </article>
                <article>
                  <small>Enhanced Score</small>
                  <b style={{ color: '#237A4B' }}>{latestProposal?.enhanced_health_score || '—'}</b>
                  <span>/100 — after enhancements</span>
                </article>
                <article>
                  <small>Systems Mapped</small>
                  <b>{data.nodes.length}</b>
                  <span>operational nodes</span>
                </article>
                <article>
                  <small>Automation Blueprints</small>
                  <b>{blueprints.length}</b>
                  <span>ready to deploy</span>
                </article>
              </div>

              <section className="finding" style={{ marginTop: 13 }}>
                <h2 style={{ fontSize: 18, marginBottom: 15 }}>Before & After Comparison</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div style={{ padding: 24, background: '#fdf0f0', border: '1px solid #f5d8d5', borderRadius: 8 }}>
                    <h3 style={{ color: '#a52d23', marginBottom: 12 }}>🔴 Before FaultLine AI</h3>
                    <ul style={{ fontSize: 13, color: '#666', lineHeight: 1.8, paddingLeft: 18 }}>
                      <li>Health score: {latestSnapshot?.health_score || '—'}/100</li>
                      <li>{data.audits.length} audits completed</li>
                      <li>Manual processes creating bottlenecks</li>
                      <li>Fragmented systems with data silos</li>
                      <li>No automated monitoring or alerts</li>
                      <li>Revenue leaks undetected</li>
                    </ul>
                  </div>
                  <div style={{ padding: 24, background: '#f0f9f3', border: '1px solid #c8e6d0', borderRadius: 8 }}>
                    <h3 style={{ color: '#237A4B', marginBottom: 12 }}>🟢 After FaultLine AI</h3>
                    <ul style={{ fontSize: 13, color: '#666', lineHeight: 1.8, paddingLeft: 18 }}>
                      <li>Health score: {latestProposal?.enhanced_health_score || '—'}/100</li>
                      <li>{latestProposal?.resolved_findings_count || 0} findings resolved</li>
                      <li>Automated workflows across all systems</li>
                      <li>Unified data pipeline with real-time sync</li>
                      <li>24/7 monitoring with instant alerts</li>
                      <li>Revenue leaks identified and quantified</li>
                    </ul>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* System Map tab */}
          {activeTab === 'system-map' && (
            <section className="finding" style={{ marginTop: 13 }}>
              <h2 style={{ fontSize: 18, marginBottom: 15 }}>System Map — {data.company.name}</h2>
              {data.nodes.length === 0 ? (
                <p style={{ color: '#888' }}>No systems mapped yet. Run the security pipeline to generate a system map.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                  {data.nodes.map(n => (
                    <div key={n.id} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase' }}>{n.node_type}</span>
                          <h3 style={{ margin: '4px 0 0', fontSize: 15 }}>{n.name}</h3>
                        </div>
                        <span className={`pill ${n.health_status === 'healthy' ? 'medium' : n.health_status === 'at_risk' ? 'high' : 'critical'}`}>{n.health_status}</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>{n.description}</p>
                      {(n.leak_points || []).length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <small style={{ color: '#C63D34', fontWeight: 700, fontSize: 10 }}>⚠ LEAK POINTS:</small>
                          <ul style={{ fontSize: 11, color: '#888', paddingLeft: 16, marginTop: 4 }}>
                            {n.leak_points.map((l, i) => <li key={i}>{l}</li>)}
                          </ul>
                        </div>
                      )}
                      {n.ai_enhancement && (
                        <div style={{ marginTop: 10, padding: 10, background: '#f0f9f3', borderRadius: 6, border: '1px solid #c8e6d0' }}>
                          <small style={{ color: '#237A4B', fontWeight: 700, fontSize: 10 }}>✦ AI ENHANCEMENT:</small>
                          <p style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{n.ai_enhancement}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Enhancements tab */}
          {activeTab === 'enhancements' && (
            <section className="finding" style={{ marginTop: 13 }}>
              <h2 style={{ fontSize: 18, marginBottom: 15 }}>Automation Enhancements — Try Them Live</h2>
              {blueprints.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <p style={{ color: '#888', fontSize: 14 }}>No automation blueprints generated for this company yet.</p>
                  <Link to="/app/industry-opportunities" className="btn dark" style={{ fontSize: 13, marginTop: 12, display: 'inline-block' }}>Generate Blueprints →</Link>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 14 }}>
                  {blueprints.map(bp => (
                    <div key={bp.id} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ padding: '3px 10px', background: '#111', color: 'var(--gold)', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{bp.blueprint_type}</span>
                          <h3 style={{ margin: '8px 0 4px', fontSize: 16 }}>{bp.blueprint_name}</h3>
                          <p style={{ fontSize: 13, color: '#666' }}>{bp.description}</p>
                        </div>
                        <div style={{ textAlign: 'right', marginLeft: 20 }}>
                          <b style={{ fontSize: 20, color: '#237A4B' }}>{bp.estimated_roi}%</b><br/>
                          <small style={{ fontSize: 10, color: '#888' }}>annual ROI</small>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                        <div style={{ background: '#fdf0f0', padding: 12, borderRadius: 6 }}>
                          <small style={{ color: '#a52d23', fontWeight: 700, fontSize: 10 }}>BEFORE</small>
                          <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{bp.before_state}</p>
                        </div>
                        <div style={{ background: '#f0f9f3', padding: 12, borderRadius: 6 }}>
                          <small style={{ color: '#237A4B', fontWeight: 700, fontSize: 10 }}>AFTER</small>
                          <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{bp.after_state}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
                        <button
                          className="btn dark"
                          onClick={() => runDemo(bp)}
                          disabled={demoRunning === bp.id}
                          style={{ fontSize: 12, padding: '8px 16px', opacity: demoRunning === bp.id ? 0.5 : 1 }}
                        >
                          {demoRunning === bp.id ? '⏳ Running automation…' : '▶ Try This Automation'}
                        </button>
                        {demoRunning === bp.id && <span style={{ fontSize: 12, color: 'var(--gold)' }}>Simulating workflow execution…</span>}
                      </div>
                      {demoRunning === bp.id && (
                        <div style={{ marginTop: 10, padding: 12, background: '#f8f7f4', borderRadius: 6, border: '1px solid #e5e1da' }}>
                          <p style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>{bp.demo_script}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Try AI tab */}
          {activeTab === 'try-ai' && (
            <section className="finding" style={{ marginTop: 13 }}>
              <h2 style={{ fontSize: 18, marginBottom: 15 }}>🤖 Try the AI Assistant</h2>
              <p style={{ fontSize: 13, color: '#666', marginBottom: 15 }}>Let your client chat with the FaultLine AI assistant. It knows about their company, systems, and enhancements.</p>
              <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 20, minHeight: 400, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14, maxHeight: 350 }}>
                  {chatMessages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                      <p style={{ fontSize: 14 }}>Start chatting with the AI assistant about {data.company.name}.</p>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
                        {['What systems did you find?', 'How can AI help my business?', 'What are my biggest revenue leaks?'].map(q => (
                          <button key={q} onClick={() => sendChat(q)} className="btn outline" style={{ fontSize: 12, padding: '8px 14px' }}>{q}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`chat ${m.role === 'user' ? 'user' : 'bot'}`}>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                      {m.choices && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {m.choices.map(opt => (
                            <button key={opt} onClick={() => sendChat(opt)} disabled={chatThinking} style={{ padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, textAlign: 'left', background: '#fff', border: '1px solid #d5c4a7', color: '#8A641C', cursor: 'pointer' }}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {chatThinking && <div className="chat bot" style={{ color: '#999' }}><span className="dot-anim">●●●</span></div>}
                </div>
                <form onSubmit={e => { e.preventDefault(); sendChat(chatInput); }} style={{ display: 'flex', gap: 6 }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask about systems, leaks, enhancements…" disabled={chatThinking} style={{ flex: 1, padding: 11, border: '1px solid #ddd', borderRadius: 6 }} />
                  <button type="submit" disabled={chatThinking || !chatInput.trim()} className="btn dark" style={{ fontSize: 14 }}>Send →</button>
                </form>
              </div>
            </section>
          )}

          {/* Proposals tab */}
          {activeTab === 'proposals' && (
            <section className="finding" style={{ marginTop: 13 }}>
              <h2 style={{ fontSize: 18, marginBottom: 15 }}>Proposals & Investment</h2>
              {data.proposals.length === 0 ? (
                <p style={{ color: '#888' }}>No proposals generated yet. Run the security pipeline to create a proposal.</p>
              ) : (
                <div style={{ display: 'grid', gap: 14 }}>
                  {data.proposals.map(p => (
                    <div key={p.id} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h3 style={{ fontSize: 16, margin: 0 }}>{p.recommended_plan}</h3>
                          <small style={{ color: '#888' }}>Health: {p.original_health_score} → {p.enhanced_health_score} · {p.resolved_findings_count} findings resolved</small>
                        </div>
                        <b style={{ fontSize: 28, color: 'var(--gold)' }}>${p.total_price?.toLocaleString()}</b>
                      </div>
                      {p.proposal_text && (
                        <div style={{ marginTop: 14, padding: 14, background: '#f8f7f4', borderRadius: 6, maxHeight: 200, overflowY: 'auto' }}>
                          <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.proposal_text.substring(0, 500)}…</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </PortalShell>
  );
}