import { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, ExternalLink, Loader2, X, Globe } from 'lucide-react';

// Autocomplete search bar for the Clone Gallery.
// Fetches all clones once, then filters as the user types.
// Shows a dropdown of matches; clicking a result opens the clone's specs modal.
export default function GallerySearch({ onPickClone }) {
  const [clones, setClones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke('getCloneGallery', {});
        const d = res.data || res;
        if (d.error) throw new Error(d.error);
        const all = (d.groups || []).flatMap(g => g.clones);
        setClones(all);
      } catch (e) {
        // silent — gallery will show its own error
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return clones
      .filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.business_name || '').toLowerCase().includes(q) ||
        (c.industry || '').toLowerCase().includes(q) ||
        (c.target_url || '').toLowerCase().includes(q) ||
        (c.url || '').toLowerCase().includes(q) ||
        (c.summary || '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [clones, query]);

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIdx >= 0 && matches[activeIdx]) {
      e.preventDefault();
      onPickClone(matches[activeIdx]);
      setFocused(false);
      setQuery('');
    } else if (e.key === 'Escape') {
      setFocused(false);
    }
  }

  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

  return (
    <div ref={containerRef} style={{ position: 'relative', marginBottom: 20 }}>
      <div style={{ position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setActiveIdx(-1); }}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={loading ? 'Loading gallery…' : 'Search clones by name, industry, or URL — autocomplete as you type…'}
          disabled={loading}
          style={{
            width: '100%', padding: '14px 42px 14px 44px', border: '2px solid #ddd',
            borderRadius: 10, fontSize: 15, fontFamily: 'inherit', background: '#fff',
            color: '#111', outline: 'none', transition: 'border-color .15s',
          }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setFocused(false); }} style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 0, cursor: 'pointer', color: '#999', padding: 4,
          }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {focused && query.trim() && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid #ddd', borderRadius: '0 0 10 10',
          boxShadow: '0 12px 32px rgba(0,0,0,.12)', maxHeight: 420, overflowY: 'auto',
        }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
              <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block', color: '#C89B3C' }} />
              Loading clones…
            </div>
          ) : matches.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>
              <Globe size={24} style={{ margin: '0 auto 8px', display: 'block', color: '#ddd' }} />
              No clones match "{query}"
            </div>
          ) : (
            matches.map((c, i) => {
              const scoreColor = (c.score || 0) >= 100 ? '#237A4B' : (c.score || 0) >= 70 ? '#B88214' : '#C63D34';
              return (
                <button
                  key={c.id}
                  onClick={() => { onPickClone(c); setFocused(false); setQuery(''); }}
                  onMouseEnter={() => setActiveIdx(i)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', border: 0, borderBottom: '1px solid #f6f3ec',
                    background: activeIdx === i ? '#f8f7f4' : '#fff', cursor: 'pointer',
                    fontFamily: 'inherit', textAlign: 'left',
                  }}
                >
                  {c.thumbnail && (
                    <img src={c.thumbnail} alt="" style={{ width: 48, height: 36, borderRadius: 4, objectFit: 'cover', flexShrink: 0, border: '1px solid #eee' }}
                      onError={e => { e.target.style.opacity = 0.15; }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: 13, color: '#111', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</b>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#8A641C', background: '#C89B3C20', padding: '2px 6px', borderRadius: 8 }}>{c.industry || 'Uncategorized'}</span>
                      <span style={{ fontSize: 10, color: '#aaa' }}>{host(c.target_url || c.url || '')}</span>
                    </div>
                  </div>
                  <span style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 14, color: scoreColor, flexShrink: 0 }}>
                    {c.score || 0}<small style={{ fontSize: 8, color: '#bbb' }}>/100</small>
                  </span>
                  <ExternalLink size={14} style={{ color: '#ccc', flexShrink: 0 }} />
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}