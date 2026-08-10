import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Loader2, Check, ExternalLink } from 'lucide-react';

export default function CloneTemplatePicker({ onSelect }) {
  const [clones, setClones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke('getCloneGallery', {});
        const d = res.data || res;
        const all = (d.groups || []).flatMap(g => g.clones);
        setClones(all);
      } catch (e) {
        console.error('CloneTemplatePicker error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = clones.filter(c => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.business_name || '').toLowerCase().includes(q) ||
      (c.industry || '').toLowerCase().includes(q)
    );
  });

  const pick = (clone) => {
    setSelected(clone.id);
    let domain = '';
    try { if (clone.url) domain = new URL(clone.url).hostname.replace(/^www\./, ''); } catch (e) {}
    onSelect({
      business_name: clone.name || clone.business_name || '',
      domain,
      industry: clone.industry || '',
      description: clone.summary || '',
      benchmark_url: clone.target_url || clone.url || '',
    });
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block', color: '#C89B3C' }} />
        <p style={{ fontSize: 13, color: '#999', margin: 0 }}>Loading clone gallery…</p>
      </div>
    );
  }

  if (clones.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 14 }}>
        No clones in the gallery yet. Build from scratch instead.
      </div>
    );
  }

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search clones by name or industry…"
          style={{
            width: '100%', padding: '10px 12px 10px 38px', border: '1px solid #ddd',
            borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fff', color: '#111', outline: 'none',
          }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, maxHeight: 500, overflowY: 'auto' }}>
        {filtered.map(c => {
          const isSelected = selected === c.id;
          return (
            <button key={c.id} onClick={() => pick(c)} style={{
              border: `2px solid ${isSelected ? '#C89B3C' : '#ddd'}`, borderRadius: 10,
              background: isSelected ? '#C89B3C10' : '#fff', cursor: 'pointer', fontFamily: 'inherit',
              textAlign: 'left', overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column',
            }}>
              {c.thumbnail && (
                <div style={{ height: 120, background: '#f8f7f4', overflow: 'hidden' }}>
                  <img src={c.thumbnail} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.opacity = 0.15; }} />
                </div>
              )}
              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ fontSize: 13 }}>{c.name}</b>
                  {isSelected && <Check size={16} style={{ color: '#C89B3C' }} />}
                </div>
                {c.industry && <span style={{ fontSize: 10, fontWeight: 600, color: '#8A641C', background: '#C89B3C20', padding: '2px 8px', borderRadius: 10, display: 'inline-block', marginTop: 4 }}>{c.industry}</span>}
                {c.summary && <p style={{ fontSize: 11, color: '#888', margin: '6px 0 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.summary}</p>}
                {c.url && <p style={{ fontSize: 10, color: '#C89B3C', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}><ExternalLink size={10} /> {c.url.replace(/^https?:\/\//, '').substring(0, 40)}</p>}
              </div>
            </button>
          );
        })}
      </div>
      {selected && (
        <div style={{ marginTop: 14, padding: 14, background: '#f0f9f3', border: '1px solid #c8e6d0', borderRadius: 8, fontSize: 13, color: '#237A4B' }}>
          ✓ Clone template selected — click Continue to pre-fill the form and start building.
        </div>
      )}
    </div>
  );
}