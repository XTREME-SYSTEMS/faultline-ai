import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, ExternalLink, Loader2, Globe, Cpu, Layers, ChevronDown } from 'lucide-react';

// Searchable, categorized list of all cloned websites/apps/systems.
// Fetches from getCloneGallery (groups clones by industry with scores + URLs).
export default function CloneList() {
  const [groups, setGroups] = useState([]);
  const [total, setTotal] = useState(0);
  const [at100, setAt100] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke('getCloneGallery', {});
        const d = res.data || res;
        if (d.error) throw new Error(d.error);
        setGroups(d.groups || []);
        setTotal(d.total || 0);
        setAt100(d.at100 || 0);
      } catch (e) {
        setError(e.message || 'Failed to load clones');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map(g => {
        const industryMatch = g.industry.toLowerCase().includes(q);
        if (industryMatch) return g; // whole category matches → show all in it
        const clones = g.clones.filter(c =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.business_name || '').toLowerCase().includes(q) ||
          (c.target_url || '').toLowerCase().includes(q)
        );
        return { ...g, clones };
      })
      .filter(g => g.clones.length > 0);
  }, [groups, query]);

  const filteredCount = useMemo(
    () => filtered.reduce((n, g) => n + g.clones.length, 0),
    [filtered]
  );

  function toggleGroup(industry) {
    setCollapsed(prev => ({ ...prev, [industry]: !prev[industry] }));
  }

  function typeIcon(clone) {
    // Heuristic: apps tend to have "app" in the name; systems have "system";
    // everything else is a website.
    const n = (clone.name || '').toLowerCase();
    if (n.includes('app')) return Cpu;
    if (n.includes('system')) return Layers;
    return Globe;
  }

  if (loading) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: 28, textAlign: 'center' }}>
        <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block', color: '#C89B3C' }} />
        <p style={{ color: '#999', fontSize: 13, margin: 0 }}>Loading cloned systems…</p>
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
      {/* Header + search */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f0ede5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 24, margin: 0 }}>Cloned Systems</h2>
            <p style={{ fontSize: 12, color: '#999', margin: '4px 0 0' }}>
              {total} cloned · {at100} at 100/100
            </p>
          </div>
          {/* Search bar */}
          <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 400 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or category…"
              style={{
                width: '100%', padding: '10px 12px 10px 38px', border: '1px solid #ddd',
                borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fff',
                color: '#111', outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{ maxHeight: 560, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
            <p style={{ fontSize: 14, margin: 0 }}>
              {query ? `No clones match "${query}".` : 'No clones yet. Add a site to the Clone Queue to get started.'}
            </p>
          </div>
        ) : (
          <>
            {query && (
              <p style={{ fontSize: 12, color: '#999', padding: '12px 20px 0', margin: 0 }}>
                Showing {filteredCount} of {total} clones
              </p>
            )}
            {filtered.map(group => {
              const isCollapsed = collapsed[group.industry];
              return (
                <div key={group.industry} style={{ borderBottom: '1px solid #f0ede5' }}>
                  {/* Category header */}
                  <button
                    onClick={() => toggleGroup(group.industry)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 20px', background: '#faf9f5', border: 0, cursor: 'pointer',
                      fontFamily: 'inherit', textAlign: 'left',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ChevronDown size={15} style={{ color: '#C89B3C', transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: '.2s' }} />
                      <b style={{ fontSize: 14, color: '#111' }}>{group.industry}</b>
                    </span>
                    <span style={{ fontSize: 11, color: '#999', fontWeight: 600 }}>{group.clones.length}</span>
                  </button>
                  {/* Clones in this category */}
                  {!isCollapsed && (
                    <div>
                      {group.clones.map(c => {
                        const TIcon = typeIcon(c);
                        const scoreColor = (c.score || 0) >= 100 ? '#237A4B' : (c.score || 0) >= 70 ? '#B88214' : '#C63D34';
                        return (
                          <div key={c.id} style={{
                            display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: 14,
                            alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #f6f3ec',
                          }}>
                            {/* Thumbnail */}
                            <div style={{ width: 48, height: 36, borderRadius: 6, overflow: 'hidden', border: '1px solid #eee', background: '#f8f7f4', flexShrink: 0 }}>
                              <img src={c.thumbnail} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={e => { e.target.style.opacity = 0.2; }} />
                            </div>
                            {/* Name + meta */}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                                <TIcon size={13} style={{ color: '#C89B3C', flexShrink: 0 }} />
                                <b style={{ fontSize: 13, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</b>
                              </div>
                              <small style={{ fontSize: 11, color: '#999', display: 'block', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.target_url || c.url}
                              </small>
                            </div>
                            {/* Score + link */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                              <div style={{ textAlign: 'right' }}>
                                <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 18, color: scoreColor }}>{c.score || 0}</b>
                                <small style={{ display: 'block', color: '#bbb', fontSize: 9 }}>/100</small>
                              </div>
                              {c.url && (
                                <a href={c.url} target="_blank" rel="noreferrer" aria-label="Open clone" style={{
                                  width: 32, height: 32, borderRadius: 6, background: '#0b0b0b', color: '#fff',
                                  display: 'grid', placeItems: 'center', textDecoration: 'none', flexShrink: 0,
                                }}>
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}