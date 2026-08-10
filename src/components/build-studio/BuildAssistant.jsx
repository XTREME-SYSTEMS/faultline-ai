import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Send, Undo, Bot, User, Sparkles } from 'lucide-react';

export default function BuildAssistant({ html, onHtmlChange }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const sendEdit = async () => {
    if (!input.trim() || !html) return;
    const instruction = input.trim();
    setMessages(m => [...m, { role: 'user', text: instruction }]);
    setInput('');
    setLoading(true);
    try {
      const res = await base44.functions.invoke('editGeneratedContent', { html, instruction });
      const data = res.data || res;
      if (data.error) {
        setMessages(m => [...m, { role: 'bot', text: `❌ ${data.error}` }]);
      } else {
        const operations = data.operations || [];
        if (operations.length === 0) {
          setMessages(m => [...m, { role: 'bot', text: 'No matching content found. Try being more specific about what to change.' }]);
        } else {
          setHistory(h => [...h, html]);
          let newHtml = html;
          let applied = 0;
          operations.forEach(op => {
            if (op.find && newHtml.includes(op.find)) {
              newHtml = newHtml.replace(op.find, op.replace);
              applied++;
            }
          });
          if (applied > 0) {
            onHtmlChange(newHtml);
            setMessages(m => [...m, { role: 'bot', text: `✅ ${data.summary || `Applied ${applied} edit(s)`}`, ops: operations }]);
          } else {
            setMessages(m => [...m, { role: 'bot', text: 'Could not apply — target text not found exactly. Try rephrasing.' }]);
          }
        }
      }
    } catch (e) {
      setMessages(m => [...m, { role: 'bot', text: `❌ ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    onHtmlChange(prev);
    setMessages(m => [...m, { role: 'bot', text: '↩️ Undid last edit' }]);
  };

  const examples = [
    'Change the hero headline to "Build Better"',
    'Make the CTA button blue',
    'Change the phone number to (555) 123-4567',
    'Replace the footer text with "© 2025 Acme"',
  ];

  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} style={{ color: '#C89B3C' }} />
          <b style={{ fontSize: 14 }}>AI Edit Assistant</b>
          <span style={{ fontSize: 11, color: '#999' }}>· Surgical edits only — changes exactly what you ask</span>
        </div>
        {history.length > 0 && (
          <button onClick={undo} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#666', background: 'none', border: '1px solid #ddd', borderRadius: 5, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Undo size={13} /> Undo ({history.length})
          </button>
        )}
      </div>

      <div ref={scrollRef} style={{ maxHeight: 280, overflowY: 'auto', padding: '14px 18px', background: '#fafafa' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: 13, color: '#999', margin: '0 0 12px' }}>Tell the AI exactly what to edit. It will only change the specific text or element you mention — nothing else.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {examples.map(ex => (
                <button key={ex} onClick={() => setInput(ex)} style={{ fontSize: 11, padding: '6px 12px', border: '1px solid #ddd', borderRadius: 16, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', color: '#666' }}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'bot' && <Bot size={16} style={{ color: '#C89B3C', flexShrink: 0, marginTop: 2 }} />}
            <div style={{
              maxWidth: '80%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
              background: m.role === 'user' ? '#0a0a0a' : '#fff', color: m.role === 'user' ? '#fff' : '#111',
              border: m.role === 'user' ? 'none' : '1px solid #eee',
            }}>
              {m.text}
              {m.ops && m.ops.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#888', borderTop: '1px solid #eee', paddingTop: 6 }}>
                  {m.ops.map((op, j) => (
                    <div key={j} style={{ marginBottom: 3 }}>
                      <code style={{ fontSize: 10 }}>{op.find.substring(0, 40)}...</code>
                      <span style={{ color: '#C89B3C' }}> → </span>
                      <code style={{ fontSize: 10 }}>{op.replace.substring(0, 40)}...</code>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {m.role === 'user' && <User size={16} style={{ color: '#666', flexShrink: 0, marginTop: 2 }} />}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <Bot size={16} style={{ color: '#C89B3C', flexShrink: 0, marginTop: 2 }} />
            <div style={{ padding: '8px 12px', borderRadius: 8, background: '#fff', border: '1px solid #eee', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={14} className="animate-spin" style={{ color: '#C89B3C' }} /> Finding exact text to edit...
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 14px', borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !loading) sendEdit(); }}
          placeholder="Describe exactly what to edit..."
          disabled={loading || !html}
          style={{ flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
        />
        <button onClick={sendEdit} disabled={loading || !input.trim() || !html} style={{
          background: '#0a0a0a', color: '#fff', border: 0, borderRadius: 6,
          padding: '0 16px', cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit',
          opacity: loading || !input.trim() || !html ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>
    </div>
  );
}