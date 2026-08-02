import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const SYSTEM_PROMPT = `You are the FaultLine AI customer portal guide. You help the CLIENT (the business that was audited) understand their diagnostic results.

Your role:
- Explain their audit findings in plain, non-technical language
- Help them understand what each finding means for their business
- Prioritize what they should fix first
- Answer questions about their repair plan, health score, and reports
- Be warm, encouraging, and clear. Never alarmist.
- Max 3 short sentences per reply. Ask one question at a time.
- If they ask about something not in their data, say you don't have that information and suggest what you CAN help with.
- End with [CHOICES] when offering predefined options.

When offering next steps, use choices like:
[CHOICES]Explain my worst finding|What should I fix first?|Show my repair plan|How is my health score calculated?[/CHOICES]`;

function buildContext(data) {
  const { company, audits, findings, repairPlans, healthScore, severityCounts } = data;
  const topFindings = findings.slice(0, 8).map(f =>
    `- ${f.title} (${f.severity}, ${f.category}): ${f.description?.substring(0, 120) || 'no description'}`
  ).join('\n');

  return `Client data:
- Company: ${company?.name || 'Unknown'}
- Industry: ${company?.industry || 'Unknown'}
- Health score: ${healthScore ?? 'Not yet calculated'}
- Total findings: ${findings.length}
- Critical: ${severityCounts.critical}, High: ${severityCounts.high}, Medium: ${severityCounts.medium}, Low: ${severityCounts.low}
- Audits completed: ${audits.length}
- Repair plans: ${repairPlans.length}

Top findings:
${topFindings || '(none yet)'}

Repair plans:
${repairPlans.map(rp => `- ${rp.title} (${rp.status})`).join('\n') || '(none yet)'}`;
}

export default function CustomerCoach({ data }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);
  const greetedRef = useRef(false);

  const extractChoices = (text) => {
    const m = text.match(/\[CHOICES\]([^\]]+)\[\/CHOICES\]/);
    if (!m) return null;
    return m[1].split('|').map(s => s.trim()).filter(Boolean);
  };

  const cleanText = (text) => text.replace(/\[CHOICES\][^\]]*\[\/CHOICES\]/g, '').trim();

  useEffect(() => {
    if (greetedRef.current || !data?.company) return;
    greetedRef.current = true;
    setThinking(true);
    (async () => {
      try {
        const prompt = `${SYSTEM_PROMPT}

${buildContext(data)}

Greet the client by name, give them a one-line summary of their diagnostic status, and offer choices for what to explore first.`;
        const res = await base44.integrations.Core.InvokeLLM({ prompt });
        const choices = extractChoices(res);
        setMessages([{ role: 'coach', text: cleanText(res), choices }]);
      } catch {
        setMessages([{ role: 'coach', text: `Welcome to your FaultLine diagnostic portal. I'm here to help you understand your results. What would you like to explore?` }]);
      } finally {
        setThinking(false);
      }
    })();
  }, [data?.company?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const send = async (text) => {
    if (!text.trim() || thinking) return;
    const next = [...messages, { role: 'user', text }];
    setMessages(next);
    setInput('');
    setThinking(true);
    try {
      const conversation = next.map(m => `${m.role === 'user' ? 'Client' : 'Coach'}: ${m.text}`).join('\n');
      const prompt = `${SYSTEM_PROMPT}

${buildContext(data)}

Conversation so far:
${conversation}

Coach:`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      const choices = extractChoices(res);
      setMessages(prev => [...prev, { role: 'coach', text: cleanText(res), choices }]);
    } catch {
      setMessages(prev => [...prev, { role: 'coach', text: 'Sorry, I had trouble there. Could you ask that again?' }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      {/* Header */}
      <div style={{ padding: '18px 22px', borderBottom: '1px solid #e5e1da', background: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)' }}>
        <p style={{ margin: 0, color: 'var(--gold2)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em' }}>AI Guide</p>
        <h3 style={{ margin: '4px 0 0', color: '#fff', font: '400 20px Libre Caslon Display, serif', letterSpacing: '-.02em' }}>
          Your diagnostic coach
        </h3>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%', padding: '12px 16px', borderRadius: 12, fontSize: 13, lineHeight: 1.55,
              background: m.role === 'user' ? '#0a0a0a' : '#f7f5f0',
              color: m.role === 'user' ? '#fff' : '#222',
              border: m.role === 'user' ? 'none' : '1px solid #e5e1da',
              whiteSpace: 'pre-wrap'
            }}>
              {m.text}
              {m.choices && m.choices.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {m.choices.map(opt => (
                    <button
                      key={opt}
                      onClick={() => send(opt)}
                      disabled={thinking}
                      style={{
                        padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                        textAlign: 'left', background: '#fff', border: '1px solid #d5c4a7', color: '#8A641C',
                        cursor: thinking ? 'wait' : 'pointer', transition: 'all .15s'
                      }}
                      onMouseEnter={e => { if (!thinking) { e.target.style.background = '#f8f4ea'; e.target.style.borderColor = 'var(--gold)'; } }}
                      onMouseLeave={e => { e.target.style.background = '#fff'; e.target.style.borderColor = '#d5c4a7'; }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {thinking && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '12px 16px', borderRadius: 12, background: '#f7f5f0', border: '1px solid #e5e1da', color: '#999', fontSize: 13 }}>
              <span className="dot-anim">●●●</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={e => { e.preventDefault(); send(input); }} style={{ borderTop: '1px solid #e5e1da', padding: '14px 22px', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about your results…"
          disabled={thinking}
          style={{
            flex: 1, padding: '11px 14px', borderRadius: 8, border: '1px solid #ddd',
            background: '#f7f7f5', color: '#111', fontSize: 13, fontFamily: 'inherit'
          }}
        />
        <button type="submit" disabled={thinking || !input.trim()} style={{
          padding: '0 18px', borderRadius: 8, border: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: 13,
          background: thinking || !input.trim() ? '#ccc' : '#0a0a0a', color: '#fff', cursor: thinking ? 'wait' : 'pointer'
        }}>→</button>
      </form>
    </div>
  );
}