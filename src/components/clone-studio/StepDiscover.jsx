import { useState } from 'react';
import { Search, Link2, Lightbulb, Building2, Loader2 } from 'lucide-react';

const MODES = [
  { id: 'url', label: 'Clone a URL', icon: Link2, placeholder: 'https://example.com', field: 'url' },
  { id: 'idea', label: 'Find by Idea', icon: Lightbulb, placeholder: 'e.g. AI-powered project management tool', field: 'idea' },
  { id: 'industry', label: 'Find by Industry', icon: Building2, placeholder: 'e.g. concrete & epoxy flooring', field: 'industry' },
];

export default function StepDiscover({ onDiscover, loading }) {
  const [mode, setMode] = useState('url');
  const [value, setValue] = useState('');
  const active = MODES.find(m => m.id === mode);

  function submit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    onDiscover({ [active.field]: value.trim() }, mode);
  }

  return (
    <div>
      <p style={{ color: '#666', fontSize: 15, margin: '0 0 24px', lineHeight: 1.6 }}>
        Start by telling us what to clone. Enter a specific URL, describe an idea, or name an industry —
        we'll find the best websites to clone.
      </p>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setValue(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px',
              border: `1px solid ${mode === m.id ? '#C89B3C' : '#ddd'}`,
              background: mode === m.id ? '#faf8f2' : '#fff',
              borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              color: mode === m.id ? '#8A641C' : '#666',
            }}>
            <m.icon size={16} /> {m.label}
          </button>
        ))}
      </div>

      {/* Input form */}
      <form onSubmit={submit} style={{ display: 'flex', gap: 10 }}>
        <input
          type={mode === 'url' ? 'url' : 'text'}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={active.placeholder}
          autoFocus
          style={{
            flex: 1, padding: '14px 16px', border: '1px solid #ddd', borderRadius: 8,
            fontSize: 15, outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button type="submit" disabled={loading || !value.trim()}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '14px 24px',
            background: loading ? '#ccc' : 'linear-gradient(135deg, #E7C86E, #C89B3C)',
            color: '#111', border: 0, borderRadius: 8, cursor: loading ? 'wait' : 'pointer',
            fontWeight: 700, fontSize: 14,
          }}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          {loading ? 'Searching…' : 'Find Sites'}
        </button>
      </form>
    </div>
  );
}