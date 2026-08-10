import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, ExternalLink, Loader2, Globe, X } from 'lucide-react';

// Search-only clone lookup. No persistent list — results appear only when searching.
// Each result shows: thumbnail, original link, vercel link, and a summary.
export default function CloneList() {
  const [clones, setClones] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke('getCloneGallery', {});
        const d = res.data || res;
        if (d.error) throw new Error(d.error);
        const all = (d.groups || []).flatMap(g => g.clones);
        setClones(all);
        setTotal(d.total || all.length);
      } catch (e) {
        setError(e.message || 'Failed to load clones');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return clones.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.business_name || '').toLowerCase().includes(q) ||
      (c.industry || '').toLowerCase().includes(q) ||
      (c.target_url || '').toLowerCase().includes(q) ||
      (c.url || '').toLowerCase().includes(q) ||
      (c.summary || '').toLowerCase().includes(q)
    );
  }, [clones, query]);

  useEffect(() => {
    if (query.trim()) setSearching(true);
    const t = setTimeout(() => setSearching(false), 300);
    return () => clearTimeout(t);
  }, [query]);

  const hasQuery = query.trim().length > 0;

  if (loading) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: 28, textAlign: 'center' }}>
        <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block', color: '#C89B3C' }} />
        <p style={{ color: '#999', fontSize: 13, margin: 0 }}>Loading clone gallery…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: '#f5d8d5', border: '1px solid #e5c5c0', borderRadius: 12, padding: 16, color: '#a52d23', fontSize: 13 }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, overflow: 'hidden' }}>
      {/* Search bar */}
      <div style={{ padding: 20, borderBottom: hasQuery ? '1px solid #f0ede5' : 'none' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search ${total} clones by name, category, or URL…`}
            style={{
              width: '100%', padding: '14px 44px 14px 44px', border: '1px solid #ddd',
              borderRadius: 8, fontSize: 15, fontFamily: 'inherit', background: '#fff',
              color: '#111', outline: 'none',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 0, cursor: 'pointer', color: '#aaa', padding: 4,
            }}>
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Results — only shown when searching */}
      {hasQuery && (
        <div style={{ maxHeight: 600, overflowY: 'auto' }}>
          {searching ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Loader2 size={20} className="animate-spin" style={{ color: '#C89B3C', margin: '0 auto 8px', display: 'block' }} />
              <p style={{ color: '#999', fontSize: 13, margin: 0 }}>Searching…</p>
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
              <Globe size={28} style={{ margin: '0 auto 10px', display: 'block', color: '#ddd' }} />
              <p style={{ fontSize: 14, margin: 0 }}>No clones match "{query}".</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 12, color: '#999', padding: '12px 20px 0', margin: 0 }}>
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </p>
              {results.map(c => {
                const scoreColor = (c.score || 0) >= 100 ? '#237A4B' : (c.score || 0) >= 70 ? '#B88214' : '#C63D34';
                return (
                  <div key={c.id} style={{
                    display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16,
                    padding: '16px 20px', borderBottom: '1px solid #f6f3ec',
                  }}>
                    {/* Thumbnail */}
                    <a href={c.url} target="_blank" rel="noreferrer" style={{
                      width: 120, height: 90, borderRadius: 8, overflow: 'hidden',
                      border: '1px solid #eee', background: '#f8f7f4', flexShrink: 0, display: 'block',
                    }}>
                      <img src={c.thumbnail} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { e.target.style.opacity = 0.15; }} />
                    </a>
                    {/* Details */}
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                        <b style={{ fontSize: 15, color: '#111' }}>{c.name}</b>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          {c.industry && c.industry !== 'Uncategorized' && (
                            <span style={{ fontSize: 10, fontWeight: 600, color: '#8A641C', background: '#C89B3C20', padding: '3px 8px', borderRadius: 12 }}>
                              {c.industry}
                            </span>
                          )}
                          <span style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 16, color: scoreColor }}>{c.score || 0}<small style={{ fontSize: 9, color: '#bbb' }}>/100</small></span>
                        </div>
                      </div>
                      {/* Summary */}
                      {c.summary ? (
                        <p style={{ fontSize: 12, color: '#666', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {c.summary}
                        </p>
                      ) : (
                        <p style={{ fontSize: 12, color: '#bbb', fontStyle: 'italic', margin: 0 }}>No summary available.</p>
                      )}
                      {/* Links */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                        {c.target_url && (
                          <a href={c.target_url} target="_blank" rel="noreferrer" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                            background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 6,
                            fontSize: 11, fontWeight: 600, color: '#666', textDecoration: 'none',
                          }}>
                            <ExternalLink size={11} /> Original
                          </a>
                        )}
                        {c.url && (
                          <a href={c.url} target="_blank" rel="noreferrer" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                            background: '#0b0b0b', border: 0, borderRadius: 6,
                            fontSize: 11, fontWeight: 700, color: '#fff', textDecoration: 'none',
                          }}>
                            <ExternalLink size={11} /> Vercel Clone
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}