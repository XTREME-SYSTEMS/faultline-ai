import { Globe, ArrowRight, Star } from 'lucide-react';

export default function StepSelect({ candidates, onSelect, onBack, loading }) {
  if (!candidates || candidates.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
        <Globe size={40} style={{ opacity: 0.3, margin: '0 auto 16px', display: 'block' }} />
        No candidates found. Try a different search.
      </div>
    );
  }

  return (
    <div>
      <p style={{ color: '#666', fontSize: 15, margin: '0 0 20px' }}>
        We found <b>{candidates.length}</b> clone-worthy {candidates.length === 1 ? 'site' : 'sites'}. Pick one to start the full clone pipeline.
      </p>
      <div style={{ display: 'grid', gap: 12 }}>
        {candidates.map((c, i) => (
          <button key={i} onClick={() => onSelect(c)} disabled={loading}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 16, padding: 20,
              border: '1px solid #ddd', borderRadius: 10, background: '#fff',
              cursor: loading ? 'wait' : 'pointer', textAlign: 'left',
              transition: 'border-color .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#C89B3C'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#ddd'}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 8, flexShrink: 0,
              background: `linear-gradient(135deg, ${['#C89B3C', '#2563eb', '#7c3aed', '#237A4B', '#B88214'][i % 5]}, #111)`,
              display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 18,
            }}>
              {i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <b style={{ fontSize: 16 }}>{c.name}</b>
                {i === 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#C89B3C', fontWeight: 700 }}><Star size={11} fill="#C89B3C" /> BEST MATCH</span>}
              </div>
              <a href={c.url} target="_blank" rel="noreferrer"
                style={{ color: '#2563eb', fontSize: 12, display: 'block', marginBottom: 6 }}
                onClick={e => e.stopPropagation()}>
                {c.url}
              </a>
              <p style={{ color: '#666', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{c.description}</p>
              {c.why && <p style={{ color: '#999', fontSize: 12, margin: '6px 0 0' }}><b>Why clone:</b> {c.why}</p>}
            </div>
            <ArrowRight size={20} style={{ color: '#C89B3C', flexShrink: 0, marginTop: 4 }} />
          </button>
        ))}
      </div>
      <button onClick={onBack} style={{ marginTop: 16, background: 'none', border: 0, color: '#666', cursor: 'pointer', fontSize: 13 }}>
        ← Back to search
      </button>
    </div>
  );
}