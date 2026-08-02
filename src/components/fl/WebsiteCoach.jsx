import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const SYSTEM_PROMPT = `You are the FaultLine AI Website Coach. You help the operator create an amazing website by guiding them through the configuration.

Current website configuration:
{CONTEXT}

You can suggest improvements using special tags that the user can apply with one click:
- [APPLY:description=Your improved business description here] — suggest a better description
- [APPLY:target_audience=Improved target audience] — suggest target audience
- [APPLY:tone=professional] — suggest a tone (professional, friendly, luxury, playful, technical, persuasive)
- [APPLY:primary_color=#hexcode] — suggest a primary color
- [APPLY:secondary_color=#hexcode] — suggest a secondary color
- [APPLY:pages=home,about,services,contact] — suggest pages (comma-separated from: home, about, services, products, portfolio, blog, contact, pricing, team, faq)
- [APPLY:features=hero,services,testimonials,contact_form,footer] — suggest features (comma-separated from: hero, services, stats, about, testimonials, portfolio, pricing, team, contact_form, map, newsletter, footer)

Rules:
- Be concise (max 3 sentences per response)
- When the description is weak or empty, proactively suggest a compelling one using [APPLY:description=...]
- Recommend features and pages based on their industry
- Suggest colors that match their brand/industry
- If they have an industry set, suggest pages and features that are standard for that industry
- End with [CHOICES]option1|option2|option3[/CHOICES] when offering next steps
- Always provide actionable, specific advice`;

function extractApplies(text) {
  const matches = [...text.matchAll(/\[APPLY:(\w+)=([^\]]+)\]/g)];
  return matches.map(m => ({ field: m[1], value: m[2] }));
}

function extractChoices(text) {
  const m = text.match(/\[CHOICES\]([^\]]+)\[\/CHOICES\]/);
  if (!m) return null;
  return m[1].split('|').map(s => s.trim()).filter(Boolean);
}

function cleanText(text) {
  return text.replace(/\[APPLY:\w+=[^\]]+\]/g, '').replace(/\[CHOICES\][^\]]*\[\/CHOICES\]/g, '').trim();
}

export default function WebsiteCoach({ form, onApply, pages, features }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);
  const greetedRef = useRef(false);
  const formRef = useRef(form);
  const pagesRef = useRef(pages);
  const featuresRef = useRef(features);

  formRef.current = form;
  pagesRef.current = pages;
  featuresRef.current = features;

  const buildContext = () => {
    const f = formRef.current;
    return `Business: ${f.business_name || '(not set)'}
Industry: ${f.industry || '(not set)'}
Description: ${f.description || '(not set)'}
Target audience: ${f.target_audience || '(not set)'}
Primary color: ${f.primary_color}
Secondary color: ${f.secondary_color}
Font style: ${f.font_style}
Tone: ${f.tone}
Pages: ${pagesRef.current.join(', ')}
Features: ${featuresRef.current.join(', ')}`;
  };

  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    setThinking(true);
    (async () => {
      try {
        const prompt = `${SYSTEM_PROMPT.replace('{CONTEXT}', buildContext())}

Greet the user, tell them you can help craft their website, and offer choices. Keep it to 2-3 sentences. If their business name or description is empty, suggest they start there or proactively suggest a description if they have a business name.`;
        const res = await base44.integrations.Core.InvokeLLM({ prompt });
        const choices = extractChoices(res);
        const applies = extractApplies(res);
        setMessages([{ role: 'coach', text: cleanText(res), choices, applies }]);
      } catch {
        setMessages([{ role: 'coach', text: "I'm here to help you build an amazing website. What would you like to work on?" }]);
      } finally {
        setThinking(false);
      }
    })();
  }, []);

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
      const prompt = `${SYSTEM_PROMPT.replace('{CONTEXT}', buildContext())}

Conversation:
${conversation}

Coach:`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      const choices = extractChoices(res);
      const applies = extractApplies(res);
      setMessages(prev => [...prev, { role: 'coach', text: cleanText(res), choices, applies }]);
    } catch {
      setMessages(prev => [...prev, { role: 'coach', text: 'Sorry, could you repeat that?' }]);
    } finally {
      setThinking(false);
    }
  };

  const applySuggestion = (apply) => {
    if (apply.field === 'pages') {
      onApply('pages', apply.value.split(',').map(s => s.trim()).filter(Boolean));
    } else if (apply.field === 'features') {
      onApply('features', apply.value.split(',').map(s => s.trim()).filter(Boolean));
    } else {
      onApply(apply.field, apply.value);
    }
  };

  return (
    <aside className="ai-panel">
      <div style={{ padding: '0 0 10px', borderBottom: '1px solid #eee', marginBottom: 10 }}>
        <p style={{ margin: 0, color: 'var(--gold)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em' }}>✦ AI Guided</p>
        <h3 style={{ margin: '4px 0 0', font: '400 18px Libre Caslon Display, serif', letterSpacing: '-.02em' }}>Website Coach</h3>
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
        {messages.map((m, i) => (
          <div key={i} className={`chat ${m.role === 'user' ? 'user' : 'bot'}`}>
            <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
            {m.applies && m.applies.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {m.applies.map((a, j) => (
                  <div key={j} style={{ background: '#f8f4ea', border: '1px solid #d5c4a7', borderRadius: 6, padding: 8 }}>
                    <small style={{ color: '#8A641C', fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>{a.field}</small>
                    <p style={{ margin: '4px 0', fontSize: 12, color: '#333', maxHeight: 80, overflow: 'hidden' }}>{a.value}</p>
                    <button onClick={() => applySuggestion(a)} disabled={thinking} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, background: '#C89B3C', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}>Apply</button>
                  </div>
                ))}
              </div>
            )}
            {m.choices && m.choices.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                {m.choices.map(opt => (
                  <button key={opt} onClick={() => send(opt)} disabled={thinking} style={{ padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', textAlign: 'left', background: '#fff', border: '1px solid #d5c4a7', color: '#8A641C', cursor: thinking ? 'wait' : 'pointer' }}>{opt}</button>
                ))}
              </div>
            )}
          </div>
        ))}
        {thinking && <div className="chat bot" style={{ color: '#999' }}><span className="dot-anim">●●●</span></div>}
      </div>
      <form onSubmit={e => { e.preventDefault(); send(input); }} style={{ display: 'flex', gap: 6 }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask for help…" disabled={thinking} />
        <button type="submit" disabled={thinking || !input.trim()}>→</button>
      </form>
    </aside>
  );
}