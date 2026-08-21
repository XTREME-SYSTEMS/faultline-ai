import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Sparkles } from 'lucide-react';

const STEP_CONTEXT = {
  1: { title: 'Business Profile', focus: 'Collecting business name, service area, phone, and email to customize the website.' },
  2: { title: 'Choose Template', focus: 'Selecting a proven epoxy contractor website design from the clone gallery.' },
  3: { title: 'Brand Setup', focus: 'Choosing brand color, uploading a logo, and writing a tagline.' },
  4: { title: 'Content Review', focus: 'Reviewing and editing AI-generated website copy (headlines, about, services, CTA).' },
  5: { title: 'Domain Setup', focus: 'Entering a custom domain name or using a provided subdomain.' },
  6: { title: 'Launch', focus: 'Reviewing all choices and launching the website.' },
};

export function AIStepCoach({ step, onboarding, onSuggest }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const scrollRef = useRef(null);

  // Greet when step changes
  useEffect(() => {
    if (!greeted || messages.length === 0) {
      generateGreeting();
      setGreeted(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const generateGreeting = async () => {
    const ctx = STEP_CONTEXT[step];
    const prompt = `You are an AI onboarding coach helping a client build their epoxy contractor website.
Current step: ${step} of 6 — ${ctx.title}.
What this step does: ${ctx.focus}
Client data so far: ${JSON.stringify(onboarding || {})}

Write a SHORT (2-3 sentences max) friendly greeting that:
1. Tells them what this step is about
2. Gives one helpful tip
3. Encourages them to start

Be warm, concise, and specific. No markdown.`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({ prompt, model: 'gemini_3_flash' });
      setMessages([{ role: 'coach', text: res }]);
    } catch {
      setMessages([{ role: 'coach', text: `Welcome to Step ${step}: ${ctx.title}. ${ctx.focus} Take your time — I'm here if you have questions.` }]);
    }
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const ctx = STEP_CONTEXT[step];
    const prompt = `You are an AI onboarding coach helping a client build their epoxy contractor website.
Current step: ${step} of 6 — ${ctx.title}.
Step goal: ${ctx.focus}
Client data so far: ${JSON.stringify(onboarding || {})}

The client asked: "${userMsg}"

Answer helpfully and concisely (2-4 sentences). If they ask for a tagline or headline suggestion, provide 2-3 options. If they ask something unrelated to the onboarding, gently steer them back. No markdown.`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({ prompt, model: 'gemini_3_flash' });
      setMessages(prev => [...prev, { role: 'coach', text: res }]);
    } catch {
      setMessages(prev => [...prev, { role: 'coach', text: "I'm having trouble right now, but you can continue with the step — I'll catch up shortly." }]);
    }
    setLoading(false);
  };

  const suggestTagline = async () => {
    setLoading(true);
    const prompt = `Generate 3 short, punchy taglines for an epoxy contractor website.
Business name: ${onboarding?.business_name || 'this business'}
Service area: ${onboarding?.service_area || 'local area'}
Primary service: ${onboarding?.primary_service || 'epoxy flooring'}

Return ONLY the 3 taglines, one per line. No numbering, no markdown.`;
    try {
      const res = await base44.integrations.Core.InvokeLLM({ prompt, model: 'gemini_3_flash' });
      const lines = res.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 3);
      setMessages(prev => [...prev, { role: 'coach', text: `Here are 3 tagline options:\n\n${lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}\n\nClick one to use it.` }]);
      if (onSuggest) onSuggest('taglines', lines);
    } catch {
      setMessages(prev => [...prev, { role: 'coach', text: 'Could not generate taglines right now. Try writing your own — keep it short and action-oriented.' }]);
    }
    setLoading(false);
  };

  const suggestCopy = async () => {
    setLoading(true);
    const prompt = `Generate website copy for an epoxy contractor.
Business name: ${onboarding?.business_name || 'this business'}
Service area: ${onboarding?.service_area || 'local area'}
Primary service: ${onboarding?.primary_service || 'epoxy flooring'}
Template: ${onboarding?.selected_template_name || 'epoxy contractor template'}

Return as JSON with these fields:
{
  "hero_headline": "A bold 5-8 word headline for the hero section",
  "about_text": "2-3 sentence about section",
  "services_list": "Comma-separated list of 5-6 services",
  "cta_text": "3-4 word call-to-action button text"
}`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            hero_headline: { type: 'string' },
            about_text: { type: 'string' },
            services_list: { type: 'string' },
            cta_text: { type: 'string' },
          },
        },
      });
      if (onSuggest) onSuggest('copy', res);
      setMessages(prev => [...prev, { role: 'coach', text: 'I\'ve drafted your website copy and filled it into the form. Review and edit anything you\'d like, then approve to continue.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'coach', text: 'Could not generate copy right now. You can write your own in the form fields.' }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      {/* Header */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #e5e1da', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #C89B3C, #8A641C)', display: 'grid', placeItems: 'center' }}>
          <Sparkles size={16} color="#fff" />
        </div>
        <div>
          <b style={{ fontSize: 13 }}>AI Onboarding Coach</b>
          <p style={{ fontSize: 10, color: '#888', margin: 0 }}>Step {step} · {STEP_CONTEXT[step]?.title}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            padding: '10px 14px',
            borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            background: m.role === 'user' ? '#0a0a0a' : '#f8f7f4',
            color: m.role === 'user' ? '#fff' : '#222',
            fontSize: 13,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
          }}>{m.text}</div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '14px', background: '#f8f7f4', fontSize: 13, color: '#888' }}>
            <span className="dot-anim">Thinking...</span>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ padding: '8px 14px', display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid #f0ede7' }}>
        {step === 3 && (
          <button onClick={suggestTagline} disabled={loading} style={quickBtnStyle}>✍️ Suggest taglines</button>
        )}
        {step === 4 && (
          <button onClick={suggestCopy} disabled={loading} style={quickBtnStyle}>✨ Generate copy</button>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid #e5e1da', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask me anything..."
          style={{ flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
        />
        <button onClick={send} disabled={loading || !input.trim()} style={{
          width: 40, border: 0, borderRadius: 8, background: '#0a0a0a', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center',
        }}>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

const quickBtnStyle = {
  fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 6, border: '1px solid #C89B3C',
  background: '#C89B3C15', color: '#8A641C', cursor: 'pointer', fontFamily: 'inherit',
};