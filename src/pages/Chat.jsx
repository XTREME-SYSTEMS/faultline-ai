import { useState, useEffect, useRef } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';

const AGENT_NAME = 'faultline_assistant';

export default function Chat() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const convos = await base44.agents.listConversations({ agent_name: AGENT_NAME });
        let convo = convos && convos.length > 0
          ? convos[0]
          : await base44.agents.createConversation({ agent_name: AGENT_NAME, metadata: { name: 'FaultLine Assistant' } });
        if (!cancelled) {
          setConversation(convo);
          setMessages(convo.messages || []);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
    } catch (e) {
      // ignore
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
          <h1>FaultLine Assistant</h1>
          <p>Ask about your findings, scores, revenue leaks, and recommended actions.</p>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, height: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {loading ? (
            <p style={{ color: '#888', textAlign: 'center' }}>Loading conversation…</p>
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
                    : <ReactMarkdown style={{ fontSize: 13 }}>{msg.content || ''}</ReactMarkdown>}
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