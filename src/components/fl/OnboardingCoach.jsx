import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const SYSTEM_PROMPT = `You are the FaultLine AI onboarding coach. You guide users through 5 steps to get their first business diagnostic:
1. Discover companies (needs industry + location)
2. Scan a company website
3. Review findings
4. Generate an executive report
5. Set up continuous monitoring

Rules:
- Be warm, concise, and specific. Max 3 short sentences per reply.
- Ask ONE focused question at a time. Never overwhelm.
- When the user gives an industry or location, recommend running discovery and end your message with [ACTION:discover].
- When companies exist but none scanned, recommend scanning and end with [ACTION:scan].
- When audits are completed but no report, recommend generating a report and end with [ACTION:report].
- When all steps done, congratulate and suggest exploring the overview.
- Never invent data. Use only the state provided.
- If the user asks something off-topic, gently steer back to onboarding.`;

function buildContext(state) {
  return `User onboarding state:
- Companies discovered: ${state.companies.length}
- Companies scanned: ${state.companies.filter(c => c.status === 'scanned').length}
- Pending scan: ${state.companies.filter(c => c.status === 'discovered').length}
- Audits completed: ${state.audits.length}
- Reports generated: ${state.audits.filter(a => a.status === 'reported').length}
- Pipeline runs: ${state.receipts.length}
- Completed steps: ${state.completed.join(', ') || 'none'}
- Current step: ${state.currentStep}`;
}

export default function OnboardingCoach({ companies, audits, receipts, busy, onDiscover, onScanNext, onGenerateReport, onGoOverview, industry, location }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const scrollRef = useRef(null);

  const completion = {
    discover: companies.length > 0,
    scan: companies.some(c => c.status === 'scanned'),
    review: audits.some(a => a.status === 'completed' || a.status === 'reported'),
    report: audits.some(a => a.status === 'reported'),
    monitor: receipts.some(r => r.system === 'monitoring_orchestrator')
  };
  const completedKeys = Object.keys(completion).filter(k => completion[k]);
  const stepKeys = ['discover', 'scan', 'review', 'report', 'monitor'];
  const currentStep = stepKeys.find(k => !completion[k]) || 'monitor';
  const completedCount = completedKeys.length;

  const state = { companies, audits, receipts, completed: completedKeys, currentStep };

  // Seed greeting on first load
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'coach',
        text: completion.discover
          ? `Welcome back. You've discovered ${companies.length} companies so far. Let's keep moving — next we should scan a website to surface faults. Ready?`
          : `Welcome to FaultLine AI. I'll guide you to your first diagnostic in a few minutes. To start — what industry and area should we look at? (e.g. "manufacturing in Pompano Beach, FL")`
      }]);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const extractAction = (text) => {
    const m = text.match(/\[ACTION:(discover|scan|report|overview)\]/);
    if (m) return m[1];
    return null;
  };

  const send = async (text) => {
    if (!text.trim() || thinking) return;
    const next = [...messages, { role: 'user', text }];
    setMessages(next);
    setInput('');
    setThinking(true);
    try {
      const conversation = next.map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.text}`).join('\n');
      const prompt = `${SYSTEM_PROMPT}\n\n${buildContext(state)}\n\nConversation so far:\n${conversation}\n\nCoach:`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      const clean = res.replace(/\[ACTION:[^\]]+\]/g, '').trim();
      const action = extractAction(res);
      setMessages(prev => [...prev, { role: 'coach', text: clean, action }]);
      setPendingAction(action);
    } catch {
      setMessages(prev => [...prev, { role: 'coach', text: 'Sorry, I had trouble there. Try again?' }]);
    } finally {
      setThinking(false);
    }
  };

  const runAction = (action) => {
    setPendingAction(null);
    if (action === 'discover') onDiscover();
    else if (action === 'scan') onScanNext();
    else if (action === 'report') onGenerateReport();
    else if (action === 'overview') onGoOverview();
  };

  return (
    <section style={{
      background: 'radial-gradient(circle at 85% 20%, rgba(200,155,60,.16), transparent 40%), #0a0a0a',
      color: '#fff', borderRadius: 14, padding: 0, marginBottom: 20, border: '1px solid #2b2b2b', overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid #2b2b2b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--gold2)', margin: 0 }}>AI-guided onboarding</p>
          <h2 style={{ font: '400 30px Libre Caslon Display, serif', margin: '4px 0 0', letterSpacing: '-.02em' }}>
            Your diagnostic coach
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {stepKeys.map((k, i) => (
            <div key={k} style={{
              width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center',
              fontSize: 12, fontWeight: 700,
              background: completion[k] ? '#3a9d6e' : k === currentStep ? 'var(--gold)' : '#1b1b1b',
              color: completion[k] || k === currentStep ? '#111' : '#666',
              border: completion[k] || k === currentStep ? 'none' : '1px solid #333'
            }}>
              {completion[k] ? '✓' : i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div ref={scrollRef} style={{ padding: '20px 28px', maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '78%', padding: '12px 16px', borderRadius: 12, fontSize: 14, lineHeight: 1.55,
              background: m.role === 'user' ? 'var(--gold)' : 'rgba(255,255,255,.06)',
              color: m.role === 'user' ? '#111' : '#eee',
              border: m.role === 'user' ? 'none' : '1px solid #2b2b2b'
            }}>
              {m.text}
              {m.action && (
                <button onClick={() => runAction(m.action)} disabled={!!busy} style={{
                  display: 'block', marginTop: 10, padding: '8px 14px', borderRadius: 6,
                  background: 'var(--gold)', color: '#111', border: 'none', fontWeight: 700, fontSize: 13,
                  cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: busy ? .6 : 1
                }}>
                  {busy ? 'Working…' : m.action === 'discover' ? 'Discover now →' : m.action === 'scan' ? 'Scan now →' : m.action === 'report' ? 'Generate report →' : 'Go to overview →'}
                </button>
              )}
            </div>
          </div>
        ))}
        {thinking && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,.06)', border: '1px solid #2b2b2b', color: '#888', fontSize: 14 }}>
              <span className="dot-anim">●●●</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick suggestions */}
      {messages.length <= 2 && !completion.discover && (
        <div style={{ padding: '0 28px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Manufacturing in Pompano Beach, FL', 'Logistics in Florida', 'Construction in Miami, FL'].map(s => (
            <button key={s} onClick={() => send(s)} style={{
              padding: '7px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              background: 'rgba(200,155,60,.1)', border: '1px solid #59411e', color: 'var(--gold2)', cursor: 'pointer'
            }}>{s}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={e => { e.preventDefault(); send(input); }} style={{
        display: 'flex', borderTop: '1px solid #2b2b2b', padding: '14px 28px'
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={completion.discover ? 'Ask your coach anything…' : 'Describe your target market…'}
          style={{
            flex: 1, padding: '12px 15px', borderRadius: 8, border: '1px solid #333',
            background: '#1b1b1b', color: '#fff', fontSize: 14, fontFamily: 'inherit'
          }}
        />
        <button type="submit" disabled={thinking || !input.trim()} style={{
          marginLeft: 10, padding: '0 20px', borderRadius: 8, border: 'none',
          background: thinking || !input.trim() ? '#333' : 'var(--gold)', color: '#111',
          fontWeight: 700, fontSize: 14, cursor: thinking ? 'wait' : 'pointer', fontFamily: 'inherit'
        }}>Send →</button>
      </form>

      {/* Pending action banner */}
      {pendingAction && (
        <div style={{ padding: '0 28px 16px' }}>
          <div style={{ background: 'rgba(58,157,110,.12)', border: '1px solid #2a5a44', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#9ad8b6' }}>Coach recommends an action. Run it when ready.</span>
            <button onClick={() => runAction(pendingAction)} disabled={!!busy} style={{
              padding: '8px 16px', borderRadius: 6, background: '#3a9d6e', color: '#111', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', opacity: busy ? .6 : 1
            }}>{busy ? 'Working…' : 'Run now →'}</button>
          </div>
        </div>
      )}
    </section>
  );
}