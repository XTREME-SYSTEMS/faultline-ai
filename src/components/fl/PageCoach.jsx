import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// Context-aware AI coach that can be dropped into any portal page.
// Pass a pageKey and optional context data; it builds a tailored system prompt.

const PAGE_PROMPTS = {
  trends: `You are the FaultLine AI intelligence analyst. You help the operator understand org-wide trends: health score progression, finding velocity, and industry benchmarks.
Reference the four pillars: AI cybersecurity (security posture trends), company discovery (pipeline growth), leak discovery (revenue leak patterns), and system clone for AI enhancement (readiness improvements).
Be concise (max 3 sentences). Offer actionable interpretation. End with [CHOICES] when suggesting next steps.`,
  'company-detail': `You are the FaultLine AI company analyst. You help the operator understand a specific company's audit results, findings, evidence, competitor benchmarks, and score progression.
Reference the four pillars: AI cybersecurity (security findings), company discovery (how this company was found), leak discovery (revenue leaks identified), and system clone for AI enhancement (system map readiness).
Be concise (max 3 sentences). Offer actionable interpretation. End with [CHOICES] when suggesting next steps.`,
  module: `You are the FaultLine AI module guide. You help the operator understand the data shown on this module page and what actions they can take.
Reference the four pillars: AI cybersecurity, company discovery, leak discovery, and system clone for AI enhancement — whichever is most relevant to this module.
Be concise (max 3 sentences). Offer actionable interpretation. End with [CHOICES] when suggesting next steps.`,
  'drive-sync': `You are the FaultLine AI integrations coach. You help the operator with Google Drive sync — exporting backups and importing evidence.
Be concise (max 3 sentences). Explain what each action does and when to use it. End with [CHOICES] when suggesting next steps.`,
  admin: `You are the FaultLine AI operations advisor. You help the operator understand system health, release gates, queues, and governance.
Reference the four pillars: AI cybersecurity (control plane health), company discovery (pipeline status), leak discovery (evidence QA), and system clone for AI enhancement (model gateway readiness).
Be concise (max 3 sentences). Offer actionable interpretation. End with [CHOICES] when suggesting next steps.`,
  default: `You are the FaultLine AI assistant. You help the operator understand their data and take action.
Reference the four pillars: AI cybersecurity, company discovery, leak discovery, and system clone for AI enhancement.
Be concise (max 3 sentences). End with [CHOICES] when suggesting next steps.`
};

function extractChoices(text) {
  const m = text.match(/\[CHOICES\]([^\]]+)\[\/CHOICES\]/);
  if (!m) return null;
  return m[1].split('|').map(s => s.trim()).filter(Boolean);
}

function cleanText(text) {
  return text.replace(/\[CHOICES\][^\]]*\[\/CHOICES\]/g, '').trim();
}

function buildContext(context) {
  if (!context) return '(no data loaded yet)';
  const parts = [];
  for (const [key, value] of Object.entries(context)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      parts.push(`${key}: ${value.length} items`);
      if (value.length > 0 && typeof value[0] === 'object') {
        const sample = value.slice(0, 3).map(v => JSON.stringify(v).substring(0, 200)).join('; ');
        parts.push(`  sample: ${sample}`);
      }
    } else if (typeof value === 'object') {
      parts.push(`${key}: ${JSON.stringify(value).substring(0, 300)}`);
    } else {
      parts.push(`${key}: ${value}`);
    }
  }
  return parts.join('\n') || '(no data loaded yet)';
}

export default function PageCoach({ pageKey = 'default', context, title = 'AI Coach' }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);
  const greetedRef = useRef(false);
  const contextRef = useRef(context);

  contextRef.current = context;

  const systemPrompt = PAGE_PROMPTS[pageKey] || PAGE_PROMPTS.default;

  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    setThinking(true);
    (async () => {
      try {
        const prompt = `${systemPrompt}

Current page data:
${buildContext(contextRef.current)}

Greet the user briefly, give a one-line insight about this page's data, and offer choices for what to explore. Keep it to 2-3 sentences.`;
        const res = await base44.integrations.Core.InvokeLLM({ prompt });
        const choices = extractChoices(res);
        setMessages([{ role: 'coach', text: cleanText(res), choices }]);
      } catch {
        setMessages([{ role: 'coach', text: "I'm here to help you understand this page. What would you like to explore?" }]);
      } finally {
        setThinking(false);
      }
    })();
  }, [pageKey]);

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
      const prompt = `${systemPrompt}

Current page data:
${buildContext(contextRef.current)}

Conversation so far:
${conversation}

Coach:`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      const choices = extractChoices(res);
      setMessages(prev => [...prev, { role: 'coach', text: cleanText(res), choices }]);
    } catch {
      setMessages(prev => [...prev, { role: 'coach', text: 'Sorry, I hit a snag. Could you repeat that?' }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <aside className="ai-panel">
      <div style={{ padding: '0 0 10px', borderBottom: '1px solid #eee', marginBottom: 10 }}>
        <p style={{ margin: 0, color: 'var(--gold)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em' }}>✦ AI Guided</p>
        <h3 style={{ margin: '4px 0 0', font: '400 18px Libre Caslon Display, serif', letterSpacing: '-.02em' }}>{title}</h3>
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
        {messages.map((m, i) => (
          <div key={i} className={`chat ${m.role === 'user' ? 'user' : 'bot'}`}>
            <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
            {m.choices && m.choices.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {m.choices.map(opt => (
                  <button
                    key={opt}
                    onClick={() => send(opt)}
                    disabled={thinking}
                    style={{
                      padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
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
        ))}
        {thinking && (
          <div className="chat bot" style={{ color: '#999' }}>
            <span className="dot-anim">●●●</span>
          </div>
        )}
      </div>
      <form onSubmit={e => { e.preventDefault(); send(input); }} style={{ display: 'flex', gap: 6 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about this page…"
          disabled={thinking}
        />
        <button type="submit" disabled={thinking || !input.trim()}>→</button>
      </form>
    </aside>
  );
}