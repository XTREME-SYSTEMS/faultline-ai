import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, ExternalLink, CheckSquare, Square, ListChecks } from 'lucide-react';
import { getIndustryGroups } from '@/lib/cloneIndustries';

export default function NicheWebsiteStudio() {
  const [industry, setIndustry] = useState('general');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [orgId, setOrgId] = useState(null);
  const [queuing, setQueuing] = useState(false);
  const [queueMsg, setQueueMsg] = useState(null);
  const navigate = useNavigate();
  const industryGroups = useMemo(() => getIndustryGroups(), []);
  const maxResults = 10;

  useEffect(() => {
    base44.auth.me().then(u => setOrgId(u?.data?.organization_id)).catch(() => {});
  }, []);

  const search = async () => {
    setLoading(true); setError(null); setResults([]); setSelected(new Set()); setQueueMsg(null);
    try {
      const res = await base44.functions.invoke('searchTopWebsitesByIndustry', {
        max_results: maxResults,
        industry
      });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setResults(d.websites || []);
    } catch (e) {
      setError(e.message || 'Search failed');
    } finally { setLoading(false); }
  };

  const toggleSelect = (url) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url); else next.add(url);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === results.length) setSelected(new Set());
    else setSelected(new Set(results.map(r => r.url)));
  };

  const addToQueue = async () => {
    if (!orgId || selected.size === 0) return;
    setQueuing(true); setQueueMsg(null);
    try {
      const selectedSites = results.filter(r => selected.has(r.url));
      const records = selectedSites.map(s => ({
        organization_id: orgId,
        target_url: s.url,
        site_name: s.name,
        industry: industry !== 'general' ? industry : (s.industry || 'Uncategorized'),
        priority: 'medium',
        status: 'queued',
        source: 'discovery',
        notes: s.description ? s.description.slice(0, 200) : ''
      }));
      await base44.entities.CloneQueue.bulkCreate(records);
      setQueueMsg({ type: 'success', text: `${records.length} website${records.length > 1 ? 's' : ''} added to the Clone Queue!` });
      setSelected(new Set());
    } catch (e) {
      setQueueMsg({ type: 'error', text: e.message || 'Failed to add to queue' });
    } finally { setQueuing(false); }
  };

  const thumb = (url) => `https://image.thum.io/get/width/400/crop/800/${url}`;

  return (
    <div className="portal-page" style={{ maxWidth: 1200, margin: '0 auto', background: '#fff', minHeight: 'calc(100vh - 60px)' }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Niche Website Search</p>
          <h1 style={{ fontSize: 36, fontFamily: 'Libre Caslon Display, serif' }}>Search Top Websites by Industry</h1>
          <p style={{ color: '#666', fontSize: 15, marginTop: 6 }}>Pick an industry and we'll find the top 10 highest-ranking websites. Select the ones you want and add them to your Clone Queue.</p>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 12, alignItems: 'end' }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
            Industry
            <select value={industry} onChange={e => setIndustry(e.target.value)} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, background: '#fff', color: '#111', outline: 'none', cursor: 'pointer' }}>
              <option value="general">General (Auto-discover trending)</option>
              {industryGroups.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.industries.map(ind => (
                    <option key={ind.id} value={ind.label}>{ind.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <button onClick={search} disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 24px', borderRadius: 8, background: loading ? '#ccc' : '#0b0b0b', color: '#fff', fontSize: 15, fontWeight: 700, border: 0, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit', height: 44 }}>
            {loading ? <><Loader2 size={18} className="animate-spin" /> Searching...</> : <><Search size={18} /> Search Top 10</>}
          </button>
        </div>
        <p style={{ fontSize: 12, color: '#999', margin: 0 }}>Finds the 10 highest-ranking real websites in the selected industry with full business intelligence.</p>
      </div>

      {/* Queue message */}
      {queueMsg && (
        <div style={{ marginBottom: 16, padding: 14, borderRadius: 8, background: queueMsg.type === 'success' ? '#e8f5ec' : '#f5d8d5', border: `1px solid ${queueMsg.type === 'success' ? '#237A4B' : '#C63D34'}`, fontSize: 13, color: queueMsg.type === 'success' ? '#237A4B' : '#a52d23', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{queueMsg.text}</span>
          {queueMsg.type === 'success' && <button onClick={() => navigate('/app/clone-queue')} style={{ background: '#0b0b0b', color: '#fff', border: 0, borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>View Queue →</button>}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block', color: '#C89B3C' }} />
          <p style={{ fontSize: 14 }}>Searching for top {maxResults} websites{industry !== 'general' ? ` in ${industry}` : ''}…</p>
        </div>
      )}

      {/* Error */}
      {error && <div style={{ background: '#f5d8d5', border: '1px solid #e5c5c0', borderRadius: 8, padding: 14, color: '#a52d23', fontSize: 13, marginBottom: 20 }}>{error}</div>}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div>
          {/* Action bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <button onClick={selectAll} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#fff', border: '1px solid #ddd', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#333', fontFamily: 'inherit' }}>
              {selected.size === results.length && results.length > 0 ? <CheckSquare size={16} style={{ color: '#C89B3C' }} /> : <Square size={16} />}
              {selected.size === results.length && results.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
            <span style={{ fontSize: 13, color: '#888' }}>{selected.size} of {results.length} selected</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Top {results.length} Websites{industry !== 'general' && ` in ${industry}`}</h2>
            <button onClick={addToQueue} disabled={queuing || selected.size === 0} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', borderRadius: 8, background: queuing || selected.size === 0 ? '#ccc' : '#0b0b0b', color: '#fff', fontSize: 13, fontWeight: 700, border: 0, cursor: queuing || selected.size === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {queuing ? <Loader2 size={15} className="animate-spin" /> : <ListChecks size={15} />}
              Add to Clone Queue{selected.size > 0 && ` (${selected.size})`}
            </button>
          </div>

          {/* Results list */}
          <div style={{ display: 'grid', gap: 12 }}>
            {results.map((w, i) => {
              const isSelected = selected.has(w.url);
              return (
                <div key={i} style={{ background: '#fff', border: `1px solid ${isSelected ? '#C89B3C' : '#e5e1da'}`, borderRadius: 12, padding: 16, display: 'grid', gridTemplateColumns: 'auto auto 1fr', gap: 16, alignItems: 'start', boxShadow: isSelected ? '0 0 0 1px #C89B3C' : 'none' }}>
                  {/* Checkbox */}
                  <button onClick={() => toggleSelect(w.url)} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, marginTop: 4 }} aria-label={isSelected ? 'Deselect' : 'Select'}>
                    {isSelected ? <CheckSquare size={24} style={{ color: '#C89B3C' }} /> : <Square size={24} style={{ color: '#ccc' }} />}
                  </button>
                  {/* Thumbnail + Link */}
                  <div style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ width: '100%', height: 120, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e1da', background: '#f8f7f4' }}>
                      <img src={thumb(w.url)} alt={w.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} onError={(e) => { e.target.style.opacity = 0.15; }} />
                    </div>
                    <a href={w.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 10px', borderRadius: 6, background: '#0b0b0b', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                      <ExternalLink size={12} /> Visit Site
                    </a>
                  </div>
                  {/* Summary */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#C89B3C', background: '#f8f7f4', padding: '2px 8px', borderRadius: 4 }}>#{i + 1}</span>
                      <b style={{ fontSize: 15 }}>{w.name}</b>
                    </div>
                    <p style={{ fontSize: 13, color: '#555', lineHeight: 1.5, margin: '0 0 8px' }}>{w.description}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11 }}>
                      {w.estimated_revenue && <span style={{ background: '#f4f1ea', color: '#8A641C', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>💰 {w.estimated_revenue}</span>}
                      {w.monthly_traffic && <span style={{ background: '#f4f1ea', color: '#8A641C', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>📈 {w.monthly_traffic}</span>}
                      {w.target_market && <span style={{ background: '#f4f1ea', color: '#8A641C', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>🎯 {w.target_market}</span>}
                      {w.monetization && <span style={{ background: '#f4f1ea', color: '#8A641C', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>💳 {w.monetization}</span>}
                    </div>
                    {w.key_strengths && <p style={{ fontSize: 12, color: '#666', margin: '8px 0 0', lineHeight: 1.4 }}><b style={{ color: '#C89B3C' }}>Strengths:</b> {w.key_strengths}</p>}
                    {w.ranking_reason && <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0', lineHeight: 1.4 }}><b>Why it ranks:</b> {w.ranking_reason}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && !error && (
        <div style={{ padding: 40, border: '1px dashed #ddd', borderRadius: 12, textAlign: 'center', color: '#888' }}>
          <Search size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>Pick an industry above and click "Search Top 10" to find the highest-ranking websites.</p>
        </div>
      )}
    </div>
  );
}