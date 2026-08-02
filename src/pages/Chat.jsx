import { useState, useEffect, useRef } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';

const AGENTS = [
  { name: 'faultline_assistant', label: 'FaultLine Assistant', desc: 'Ask about your findings, scores, revenue leaks, and recommended actions.' },
  { name: 'faultline_qa', label: 'QA & Validation Agent', desc: 'Double-checks every generated step for gaps, faults, and compliance. Runs deep discovery, headless tests, and security audits.' },
  { name: 'faultline_builder', label: 'Guided Build Agent', desc: 'Walks you through building every missing opportunity for a company using the generator — step by step, with QA gating.' }
];

export default function Chat() {
  const [agentName, setAgentName] = useState('faultline_assistant');
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const activeAgent = AGENTS.find(a => a.name === agentName);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setConversation(null); setMessages([]);
    (async () => {
      try {
        const convos = await base44.agents.listConversations({ agent_name: agentName });
        let convo = convos && convos.length > 0
          ? convos[0]
          : await base44.agents.createConversation({ agent_name: agentName, metadata: { name: activeAgent.label } });
        if (!cancelled) {
          setConversation(convo);
          setMessages(convo.messages || []);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) { setError(e.message || 'Failed to load conversation'); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [agentName]);

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

  const handleSend = async () => {
    if (!input.trim() || !conversation || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      const updated = await base44.agents.addMessage(conversation, { role: 'user', content });
      setConversation(updated);
      setMessages(updated.messages || []);
    } catch (e) {
      setError(e.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Intelligence</p>
          <h1>{activeAgent.label}</h1>
          <p>{activeAgent.desc}</p>
        </div>
        <select
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit', background: '#fff', cursor: 'pointer' }}
        >
          {AGENTS.map(a => <option key={a.name} value={a.name}>{a.label}</option>)}
        </select>
      </div>

      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, height: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {loading ? (
            <p style={{ color: '#888', textAlign: 'center' }}>Loading conversation…</p>
          ) : error ? (
            <div style={{ textAlign: 'center', color: '#a52d23', paddingTop: 40 }}>
              <p style={{ fontWeight: 700 }}>Couldn't start the chat</p>
              <p style={{ fontSize: 13 }}>{error}</p>
              <button onClick={() => setAgentName(agentName)} className="btn dark" style={{ marginTop: 12, fontSize: 13 }}>Retry</button>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', paddingTop: 40 }}>
              <p>Ask me anything about your business diagnostics.</p>
              <p style={{ fontSize: 13 }}>Try: "What are my top critical findings?" or "Show me the score for Acme Manufacturing"</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 16, display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div className={`chat ${msg.role}`} style={{ maxWidth: '75%' }}>
                  {msg.role === 'user'
                    ? <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                    : <div style={{ fontSize: 13, lineHeight: 1.6 }}><ReactMarkdown>{msg.content || ''}</ReactMarkdown></div>}
                  {msg.tool_calls?.map((tc, j) => (
                    <div key={j} style={{ fontSize: 11, color: '#896930', marginTop: 8, padding: '4px 8px', background: '#f3f0ea', borderRadius: 4 }}>
                      ⚙ {tc.name || 'tool'} — {tc.status}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <div style={{ borderTop: '1px solid #ddd', padding: 14, display: 'flex', gap: 10 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about findings, scores, repair plans…"
            style={{ flex: 1, padding: 12, border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
          />
          <button onClick={handleSend} disabled={sending || !input.trim()} className="btn dark" style={{ padding: '12px 24px' }}>
            {sending ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </PortalShell>
  );
}