import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ChevronLeft, Loader2, Zap, Package } from 'lucide-react';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import CloneCard from '@/components/clone-studio/CloneCard';

export default function CloneGallery() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [healingAll, setHealingAll] = useState(false);
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');

  async function loadGallery() {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('getCloneGallery', {});
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setData(d);
    } catch (e) {
      setError(e.message || 'Failed to load gallery');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadGallery(); }, []);

  async function handleHealAll() {
    setHealingAll(true);
    try {
      await base44.functions.invoke('healAllClonesTo100', { max_iterations: 3 });
      setTimeout(loadGallery, 5000);
    } catch (e) {
      setError(e.message);
    } finally {
      setHealingAll(false);
    }
  }

  // Apply filters to the gallery data
  const filteredGroups = (data?.groups || [])
    .filter(g => industryFilter === 'all' || g.industry === industryFilter)
    .map(g => ({
      ...g,
      clones: g.clones.filter(c => {
        if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false;
        if (scoreFilter === 'at100' && c.score < 100) return false;
        if (scoreFilter === 'below100' && c.score >= 100) return false;
        return true;
      }),
    }))
    .filter(g => g.clones.length > 0);

  const allIndustries = (data?.groups || []).map(g => g.industry).sort();

  return (
    <>
      <XtremeOSSidebar />
      <div className="portal-page xtremeos-content" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240 }}>
        {/* Header */}
        <div style={{
          background: 'radial-gradient(circle at 82% 40%, #C89B3C45, transparent 25%), #0a0a0a',
          color: '#fff', padding: '36px 28px', margin: '-28px -28px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ color: '#E7C86E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>Clone Gallery</p>
            <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 38, margin: '8px 0 4px', letterSpacing: '-.03em' }}>
              My <span style={{ color: '#E7C86E' }}>Clones</span>
            </h1>
            <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>All cloned sites, organized by industry. Every clone has a live Vercel URL.</p>
          </div>
          <Link to="/app" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#aaa', fontSize: 13 }}>
            <ChevronLeft size={16} /> Back to XtremeOS
          </Link>
        </div>

        {/* Stats bar */}
        {data && (
          <div style={{ display: 'flex', gap: 13, marginBottom: 20 }}>
            <StatCard label="Total Clones" value={data.total} />
            <StatCard label="At 100/100" value={data.at100} color="#237A4B" />
            <StatCard label="Below 100" value={data.below100} color="#B88214" />
            <StatCard label="Industries" value={data.groups?.length || 0} />
            <button onClick={handleHealAll} disabled={healingAll} style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
              background: healingAll ? '#333' : 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111',
              border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: healingAll ? 'wait' : 'pointer',
            }}>
              {healingAll ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              {healingAll ? 'Healing All…' : 'Heal All to 100'}
            </button>
          </div>
        )}

        {/* Filter bar */}
        {data && data.total > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clones by name…"
              style={{ flex: 1, minWidth: 200, padding: '11px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fff' }}
            />
            <select
              value={industryFilter}
              onChange={e => setIndustryFilter(e.target.value)}
              style={{ padding: '11px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fff', cursor: 'pointer' }}
            >
              <option value="all">All Industries</option>
              {allIndustries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
            </select>
            <select
              value={scoreFilter}
              onChange={e => setScoreFilter(e.target.value)}
              style={{ padding: '11px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#fff', cursor: 'pointer' }}
            >
              <option value="all">All Scores</option>
              <option value="at100">At 100/100</option>
              <option value="below100">Below 100/100</option>
            </select>
          </div>
        )}

        {error && (
          <div style={{ padding: 14, background: '#f5d8d5', borderRadius: 8, color: '#a52d23', fontSize: 13, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block', color: '#C89B3C' }} />
            Loading your clones…
          </div>
        )}

        {!loading && data && data.total === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            <Package size={48} style={{ opacity: 0.3, margin: '0 auto 16px', display: 'block' }} />
            <p style={{ fontSize: 15, margin: '0 0 8px' }}>No clones yet.</p>
            <Link to="/app/clone-studio" style={{ color: '#C89B3C', fontWeight: 700, fontSize: 14 }}>Clone your first site →</Link>
          </div>
        )}

        {!loading && data && filteredGroups.map(group => (
          <div key={group.industry} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <h2 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 24, margin: 0, textTransform: 'capitalize' }}>
                {group.industry}
              </h2>
              <span style={{
                padding: '3px 10px', background: '#f8f7f4', border: '1px solid #eee',
                borderRadius: 20, fontSize: 11, color: '#888', fontWeight: 600,
              }}>{group.clones.length} {group.clones.length === 1 ? 'clone' : 'clones'}</span>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14,
            }}>
              {group.clones.map(clone => <CloneCard key={clone.id} clone={clone} />)}
            </div>
          </div>
        ))}

        {!loading && data && data.total > 0 && filteredGroups.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            <p style={{ fontSize: 15, margin: 0 }}>No clones match your filters.</p>
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '14px 18px', minWidth: 110 }}>
      <small style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</small>
      <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 26, display: 'block', color: color || '#111', marginTop: 4 }}>{value}</b>
    </div>
  );
}