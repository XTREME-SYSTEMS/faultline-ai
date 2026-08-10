import { useState, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Rocket, Globe, ExternalLink, Sparkles, Eye } from 'lucide-react';
import { getIndustryGroups } from '@/lib/cloneIndustries';

export default function NicheWebsiteStudio() {
  const [maxNiches, setMaxNiches] = useState(5);
  const [industry, setIndustry] = useState('general');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [recentSites, setRecentSites] = useState([]);

  const industryGroups = useMemo(() => getIndustryGroups(), []);

  const loadRecent = useCallback(async () => {
    try {
      const sites = await base44.entities.Deliverable.filter(
        { deliverable_type: 'website' }, '-created_date', 12
      );
      setRecentSites((sites || []).filter(s => s.metadata?.generated_by === 'nicheWebsiteEngine'));
    } catch (e) {}
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  const generate = async () => {
    setLoading(true); setError(null); setResults([]);
    try {
      const res = await base44.functions.invoke('nicheWebsiteEngine', {
        max_niches: maxNiches,
        industry
      });
      setResults(res.websites || []);
      loadRecent();
    } catch (e) {
      setError(e.message || 'Generation failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="portal-page" style={{ maxWidth: 1100, margin: '0 auto', background: '#fff', minHeight: 'calc(100vh - 60px)' }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Niche Website Engine</p>
          <h1 style={{ fontSize: 36, fontFamily: 'Libre Caslon Display, serif' }}>Production-Ready Niche Websites</h1>
          <p style={{ color: '#666', fontSize: 15, marginTop: 6 }}>Discover trending niches and generate polished, SEO-optimized websites — automatically.</p>
        </div>
      </div>

      {/* Config card */}
      <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
            Niches to Generate (1-10)
            <input type="number" value={maxNiches} min={1} max={10} onChange={e => setMaxNiches(parseInt(e.target.value) || 5)}
              style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, background: '#fff', color: '#111', outline: 'none' }} />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
            Industry Focus <span style={{ fontWeight: 400, color: '#999' }}>(aligned with Clone System)</span>
            <select value={industry} onChange={e => setIndustry(e.target.value)}
              style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, background: '#fff', color: '#111', outline: 'none', cursor: 'pointer' }}>
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
        </div>
        <button onClick={generate} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 8, background: loading ? '#ccc' : '#0b0b0b', color: '#fff', fontSize: 15, fontWeight: 700, border: 0, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
          {loading ? <><Loader2 size={18} className="animate-spin" /> Discovering niches & building websites...</> : <><Rocket size={18} /> Discover & Generate Websites</>}
        </button>
      </div>

      {error && <div style={{ background: '#f5d8d5', border: '1px solid #e5c5c0', borderRadius: 8, padding: 14, color: '#a52d23', fontSize: 13, marginBottom: 20 }}>{error}</div>}

      {/* Results */}
      {results.length > 0 && (
        <div style={{ marginBottom: 30 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 14 }}>Generated Websites ({results.length})</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {results.map((w, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={16} style={{ color: 'var(--gold)' }} />
                  <b style={{ fontSize: 15 }}>{w.business_name}</b>
                </div>
                <span style={{ fontSize: 11, background: '#f4f1ea', color: '#8A641C', padding: '3px 10px', borderRadius: 10, width: 'fit-content' }}>{w.niche}</span>
                <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>{w.tagline}</p>
                <p style={{ fontSize: 12, color: '#888', lineHeight: 1.4 }}>{w.seo_description?.slice(0, 120)}...</p>
                {w.file_url && (
                  <a href={w.file_url} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, background: '#0b0b0b', color: '#fff', fontSize: 13, fontWeight: 700, marginTop: 'auto' }}>
                    <Eye size={14} /> Preview Website
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent sites */}
      {!loading && recentSites.length > 0 && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 14 }}>Recent Niche Websites</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {recentSites.map(s => (
              <div key={s.id} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Globe size={16} style={{ color: 'var(--gold)' }} />
                  <b style={{ fontSize: 14, flex: 1 }}>{s.title}</b>
                </div>
                {s.metadata?.niche && <span style={{ fontSize: 11, background: '#f4f1ea', color: '#8A641C', padding: '3px 10px', borderRadius: 10, width: 'fit-content' }}>{s.metadata.niche}</span>}
                {s.file_url && (
                  <a href={s.file_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gold)', fontSize: 13, fontWeight: 700 }}>
                    <ExternalLink size={14} /> View Live Site
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && results.length === 0 && recentSites.length === 0 && (
        <div style={{ padding: 40, border: '1px dashed #ddd', borderRadius: 12, textAlign: 'center', color: '#888' }}>
          <Globe size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>Pick an industry above and click "Discover & Generate" to build polished niche websites.</p>
        </div>
      )}
    </div>
  );
}