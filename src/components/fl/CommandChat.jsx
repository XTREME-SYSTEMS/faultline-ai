import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Sparkles, Loader2 } from 'lucide-react';

// Inline AI chat for the Command Center. Uses the best available LLM model
// (claude_opus_4_8) with web context enabled for real-time answers about the
// system, provisioning status, and recommended next actions.
const MODEL = 'claude_opus_4_8';

const SUGGESTIONS = [
  'Run a full system sweep and summarize the results',
  'Test provisioning for Drive, GitHub, Vercel, and Supabase',
  'What should I fix first based on current findings?',
  'Generate a launch plan for my next client project'
];

export default function CommandChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'I\'m your Command Center AI. I can run sweeps, test provisioning, analyze findings, and guide launches. What would you like to do?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async (text) => {
    const prompt = text || input;
    if (!prompt || loading) return;
    const next = [...messages, { role: 'user', content: prompt }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are the FaultLine AI Command Center assistant. You help the operator run autonomous workflows, test infrastructure provisioning, analyze system health, and plan client launches. Be concise, actionable, and specific. When the user asks to run something, tell them which button to click on the page.\n\nOperator request: ${prompt}`,
        model: MODEL,
        add_context_from_internet: false,
        response_json_schema: null
      });
      const reply = typeof res === 'string' ? res : (res?.content || res?.text || JSON.stringify(res));
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: `⚠ Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: 13,
            lineHeight: 1.5,
            background: m.role === 'user' ? '#0a0a0a' : '#f8f7f4',
            color: m.role === 'user' ? '#fff' : '#222',
            border: m.role === 'user' ? 'none' : '1px solid #e5e1da',
            whiteSpace: 'pre-wrap'
          }}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', padding: '10px 14px', background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 10, fontSize: 13, color: '#888', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader2 size={14} className="animate-spin" /> Thinking…
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)} style={{
              padding: '6px 12px', borderRadius: 16, border: '1px solid #e5e1da', background: '#fff',
              fontSize: 11, color: '#666', cursor: 'pointer', fontFamily: 'inherit'
            }}>{s}</button>
          ))}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask the Command AI anything…"
          style={{ flex: 1, padding: '11px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}
        />
        <button type="submit" disabled={loading || !input} style={{
          background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', border: 0, borderRadius: 8,
          padding: '0 16px', fontSize: 13, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          <Send size={14} /> Send
        </button>
      </form>
    </div>
  );
}