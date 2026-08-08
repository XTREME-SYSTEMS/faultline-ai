import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, Sparkles } from 'lucide-react';

export default function UniversalChat({ items }) {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Ask me about the catalog — e.g. "Which epoxy contractors have the highest profit potential?" or "What AI website generators did we discover?"' }
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  async function send(e) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const q = input.trim();
    setMessages(m => [...m, { role: 'user', text: q }]);
    setInput('');
    setBusy(true);
    try {
      const context = items.slice(0, 60).map(i => ({
        name: i.name, category: i.category, type: i.item_type, url: i.url,
        niche: i.niche, value: i.value_proposition, profit: i.profit_potential,
        validation: i.validation_status, clone: i.clone_status
      }));
      const res = await base44.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        prompt: `You are the FaultLine AI database assistant. Answer the user's question using ONLY the catalog data provided. Be concise and specific. If the data doesn't cover it, say so.\n\nCATALOG (${context.length} items):\n${JSON.stringify(context)}\n\nQUESTION: ${q}`
      });
      setMessages(m => [...m, { role: 'bot', text: typeof res === 'string' ? res : JSON.stringify(res) }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'bot', text: `Error: ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid #2b2b2b' }}>
        <Sparkles size={16} color="#FFD60A" />
        <b style={{ fontSize: 14 }}>Database Assistant</b>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            background: m.role === 'user' ? '#FFD60A' : '#1a1a1d',
            color: m.role === 'user' ? '#0B0B0D' : '#fff',
            padding: '10px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.5,
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%'
          }}>{m.text}</div>
        ))}
        {busy && <div style={{ color: '#9a9a9e', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}><Loader2 size={14} className="animate-spin" /> Researching the database…</div>}
      </div>
      <form onSubmit={send} style={{ display: 'flex', borderTop: '1px solid #2b2b2b' }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about the catalog…" style={{ flex: 1, background: '#0B0B0D', border: 0, color: '#fff', padding: '12px 14px', fontSize: 13, outline: 'none' }} />
        <button type="submit" disabled={busy} style={{ width: 48, background: '#FFD60A', color: '#0B0B0D', border: 0, cursor: 'pointer' }}><Send size={16} /></button>
      </form>
    </div>
  );
}