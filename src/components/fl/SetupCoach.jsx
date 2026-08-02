import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// Extract [CONFIG]{...}[/CONFIG] from AI response
function extractConfig(text) {
  const m = text.match(/\[CONFIG\](\{[\s\S]*?\})\[\/CONFIG\]/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

export default function SetupCoach({ phase, phaseIndex, config, onComplete, existingConfig }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);
  const greetedRef = useRef(false);

  // Build context about what's already known
  const knownContext = Object.entries(existingConfig || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join('\n');

  // Greet when phase starts
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    setMessages([]);
    setThinking(true);
    (async () => {
      try {
        const prompt = `${phase.prompt}

Already known from earlier phases (use this, don't re-ask):
${knownContext || '(nothing yet)'}

Start by greeting the user for this phase and asking your first question. Do NOT output [CONFIG] yet — you need to collect answers first.`;
        const res = await base44.integrations.Core.InvokeLLM({ prompt });
        setMessages([{ role: 'coach', text: res.replace(/\[CONFIG\][\s\S]*?\[\/CONFIG\]/g, '').trim() }]);
      } catch {
        setMessages([{ role: 'coach', text: `Let's set up your ${phase.title.toLowerCase()}. ${phase.desc}. Tell me — what's your company name?` }]);
      } finally {
        setThinking(false);
      }
    })();
  }, [phaseIndex]);

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
      const conversation = next.map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.text}`).join('\n');
      const prompt = `${phase.prompt}

Already known from earlier phases:
${knownContext || '(nothing yet)'}

Conversation so far:
${conversation}

Coach:`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      const cfg = extractConfig(res);
      const clean = res.replace(/\[CONFIG\][\s\S]*?\[\/CONFIG\]/g, '').trim();
      setMessages(prev => [...prev, { role: 'coach', text: clean, config: cfg }]);
      if (cfg) {
        // small delay so user can read the confirmation
        setTimeout(() => onComplete(cfg), 800);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'coach', text: 'Sorry, I hit a snag. Could you repeat that?' }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', padding: '14px 18px', borderRadius: 14, fontSize: 14, lineHeight: 1.6,
              background: m.role === 'user' ? 'var(--gold)' : 'rgba(255,255,255,.06)',
              color: m.role === 'user' ? '#111' : '#eee',
              border: m.role === 'user' ? 'none' : '1px solid #2b2b2b',
              whiteSpace: 'pre-wrap'
            }}>
              {m.text}
              {m.config && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#9ad8b6', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>✓ Saved — moving to next step…</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {thinking && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '14px 18px', borderRadius: 14, background: 'rgba(255,255,255,.06)', border: '1px solid #2b2b2b', color: '#888', fontSize: 14 }}>
              <span className="dot-anim">●●●</span>
            </div>
          </div>
        )}
      </div>
      <form onSubmit={e => { e.preventDefault(); send(input); }} style={{ borderTop: '1px solid #2b2b2b', padding: '16px 28px', display: 'flex', gap: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your answer…"
          disabled={thinking}
          style={{
            flex: 1, padding: '13px 16px', borderRadius: 10, border: '1px solid #333',
            background: '#1b1b1b', color: '#fff', fontSize: 14, fontFamily: 'inherit'
          }}
        />
        <button type="submit" disabled={thinking || !input.trim()} style={{
          padding: '0 22px', borderRadius: 10, border: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
          background: thinking || !input.trim() ? '#333' : 'var(--gold)', color: '#111', cursor: thinking ? 'wait' : 'pointer'
        }}>Send →</button>
      </form>
    </div>
  );
}