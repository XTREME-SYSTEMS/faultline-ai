import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, ExternalLink, Loader2, Globe, X, ChevronDown, Images } from 'lucide-react';

// Dropdown gallery — click to expand and see every clone.
// Each entry shows: thumbnail, original link, vercel link, and a summary.
export default function CloneList() {
  const [clones, setClones] = useState([]);
  const [total, setTotal] = useState(0);
  const [at100, setAt100] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
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
        setAt100(d.at100 || 0);
      } catch (e) {
        setError(e.message || 'Failed to load clones');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clones;
    return clones.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.business_name || '').toLowerCase().includes(q) ||
      (c.industry || '').toLowerCase().includes(q) ||
      (c.target_url || '').toLowerCase().includes(q) ||
      (c.url || '').toLowerCase().includes(q) ||
      (c.summary || '').toLowerCase().includes(q)
    );
  }, [clones, query]);

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
      {/* Dropdown header — click to toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px', background: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Images size={20} style={{ color: '#C89B3C' }} />
          <span style={{ textAlign: 'left' }}>
            <b style={{ fontSize: 16, color: '#111', display: 'block' }}>Clone Gallery</b>
            <small style={{ fontSize: 12, color: '#999' }}>{total} clones · {at100} at 100/100</small>
          </span>
        </span>
        <ChevronDown size={20} style={{ color: '#999', transform: open ? 'rotate(180deg)' : 'none', transition: '.2s' }} />
      </button>

      {/* Expanded panel */}
      {open && (
        <div style={{ borderTop: '1px solid #f0ede5' }}>
          {/* Search bar */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f6f3ec' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Filter by name, category, or URL…"
                style={{
                  width: '100%', padding: '10px 36px 10px 38px', border: '1px solid #ddd',
                  borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fff', color: '#111', outline: 'none',
                }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 0, cursor: 'pointer', color: '#aaa', padding: 4,
                }}>
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {results.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
                <Globe size={28} style={{ margin: '0 auto 10px', display: 'block', color: '#ddd' }} />
                <p style={{ fontSize: 14, margin: 0 }}>
                  {query ? `No clones match "${query}".` : 'No clones in the gallery yet.'}
                </p>
              </div>
            ) : (
              <>
                {query && (
                  <p style={{ fontSize: 12, color: '#999', padding: '12px 20px 0', margin: 0 }}>
                    {results.length} of {total} clones
                  </p>
                )}
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
        </div>
      )}
    </div>
  );
}