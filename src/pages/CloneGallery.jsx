import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ChevronLeft, Loader2, Zap, Package, Plus, FolderOpen } from 'lucide-react';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import CloneCard from '@/components/clone-studio/CloneCard';
import SiteSpecsModal from '@/components/clone-studio/SiteSpecsModal';
import { CLONE_INDUSTRIES, getIndustryGroups, getIndustryGroupNames } from '@/lib/cloneIndustries';

export default function CloneGallery() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [healingAll, setHealingAll] = useState(false);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [specsClone, setSpecsClone] = useState(null);

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

  // Build a map of industry label -> clones from the data
  const clonesByIndustry = {};
  for (const group of (data?.groups || [])) {
    clonesByIndustry[group.industry] = group.clones;
  }

  // All taxonomy industry labels for quick lookup
  const taxonomyLabels = new Set(CLONE_INDUSTRIES.map(i => i.label));

  // Collect clones that don't match any taxonomy industry (e.g., "Uncategorized")
  const uncategorizedClones = [];
  for (const [industry, clones] of Object.entries(clonesByIndustry)) {
    if (!taxonomyLabels.has(industry)) {
      for (const c of clones) uncategorizedClones.push(c);
    }
  }

  // All industry groups from the taxonomy
  const taxonomyGroups = getIndustryGroups();
  const groupNames = getIndustryGroupNames();

  // Determine which groups to show based on filters
  // industryFilter takes precedence over groupFilter
  const visibleGroups = industryFilter !== 'all'
    ? taxonomyGroups.map(g => ({
        ...g,
        industries: g.industries.filter(ind => ind.label === industryFilter),
      })).filter(g => g.industries.length > 0)
    : groupFilter !== 'all'
      ? taxonomyGroups.filter(g => g.group === groupFilter)
      : taxonomyGroups;

  // Apply search + score filters to a list of clones
  const filterClones = (clones) => clones.filter(c => {
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (scoreFilter === 'at100' && c.score < 100) return false;
    if (scoreFilter === 'below100' && c.score >= 100) return false;
    return true;
  });

  // Count total visible clones (for empty-state detection)
  let totalVisible = 0;
  for (const g of visibleGroups) {
    for (const ind of g.industries) {
      totalVisible += filterClones(clonesByIndustry[ind.label] || []).length;
    }
  }
  if (groupFilter === 'all' && industryFilter === 'all') {
    totalVisible += filterClones(uncategorizedClones).length;
  }

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
          <div style={{ display: 'flex', gap: 13, marginBottom: 20, flexWrap: 'wrap' }}>
            <StatCard label="Total Clones" value={data.total} />
            <StatCard label="At 100/100" value={data.at100} color="#237A4B" />
            <StatCard label="Below 100" value={data.below100} color="#B88214" />
            <StatCard label="Industries" value={Object.keys(clonesByIndustry).filter(k => taxonomyLabels.has(k)).length} />
            <StatCard label="Taxonomy" value={CLONE_INDUSTRIES.length} color="#8A641C" />
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
              value={groupFilter}
              onChange={e => { setGroupFilter(e.target.value); setIndustryFilter('all'); }}
              style={selectStyle}
            >
              <option value="all">All Groups</option>
              {groupNames.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <select
              value={industryFilter}
              onChange={e => setIndustryFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Industries</option>
              {(groupFilter === 'all' ? taxonomyGroups : taxonomyGroups.filter(g => g.group === groupFilter))
                .flatMap(g => g.industries)
                .map(ind => <option key={ind.id} value={ind.label}>{ind.label}</option>)}
            </select>
            <select
              value={scoreFilter}
              onChange={e => setScoreFilter(e.target.value)}
              style={selectStyle}
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
            <Link to="/app/clone-queue" style={{ color: '#C89B3C', fontWeight: 700, fontSize: 14 }}>Add a site to the clone queue →</Link>
          </div>
        )}

        {/* Content — all industries from taxonomy, grouped by group */}
        {!loading && data && data.total > 0 && (
          <>
            {totalVisible === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                <p style={{ fontSize: 15, margin: 0 }}>No clones match your filters.</p>
              </div>
            )}

            {totalVisible > 0 && visibleGroups.map(taxGroup => {
              const industriesWithClones = taxGroup.industries.filter(ind => {
                const clones = filterClones(clonesByIndustry[ind.label] || []);
                return clones.length > 0;
              });
              const industriesEmpty = taxGroup.industries.filter(ind => {
                const clones = filterClones(clonesByIndustry[ind.label] || []);
                return clones.length === 0;
              });
              if (industriesWithClones.length === 0 && industriesEmpty.length === 0) return null;

              return (
                <div key={taxGroup.group} style={{ marginBottom: 36 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #C89B3C' }}>
                    <FolderOpen size={18} style={{ color: '#C89B3C' }} />
                    <h2 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22, margin: 0 }}>{taxGroup.group}</h2>
                    <span style={{ fontSize: 11, color: '#999' }}>
                      {industriesWithClones.length}/{taxGroup.industries.length} industries populated
                    </span>
                  </div>

                  {/* Industries with clones */}
                  {industriesWithClones.map(ind => {
                    const clones = filterClones(clonesByIndustry[ind.label] || []);
                    return (
                      <div key={ind.id} style={{ marginBottom: 20, paddingLeft: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#111' }}>{ind.label}</h3>
                          <span style={{ fontSize: 11, color: '#999', padding: '2px 8px', background: '#f8f7f4', borderRadius: 20 }}>
                            {clones.length}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                          {clones.map(clone => <CloneCard key={clone.id} clone={clone} onShowSpecs={setSpecsClone} />)}
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty industries — collapsed list with "add" links */}
                  {industriesEmpty.length > 0 && (
                    <div style={{ paddingLeft: 8, marginTop: 8 }}>
                      <details style={{ fontSize: 12 }}>
                        <summary style={{ cursor: 'pointer', color: '#999', fontWeight: 600, padding: '4px 0' }}>
                          {industriesEmpty.length} empty {industriesEmpty.length === 1 ? 'industry' : 'industries'} — click to expand
                        </summary>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                          {industriesEmpty.map(ind => (
                            <Link key={ind.id} to="/app/clone-queue" style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              fontSize: 12, color: '#C89B3C', padding: '5px 10px',
                              border: '1px dashed #ddd', borderRadius: 6, textDecoration: 'none',
                            }}>
                              <Plus size={11} /> {ind.label}
                            </Link>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Uncategorized clones (don't match any taxonomy industry) */}
            {groupFilter === 'all' && industryFilter === 'all' && filterClones(uncategorizedClones).length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #999' }}>
                  <h2 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22, margin: 0, color: '#666' }}>Other / Uncategorized</h2>
                  <span style={{ fontSize: 11, color: '#999' }}>{filterClones(uncategorizedClones).length} clones</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                  {filterClones(uncategorizedClones).map(clone => <CloneCard key={clone.id} clone={clone} onShowSpecs={setSpecsClone} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {specsClone && <SiteSpecsModal clone={specsClone} onClose={() => setSpecsClone(null)} />}
    </>
  );
}

const selectStyle = {
  padding: '11px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14,
  fontFamily: 'inherit', background: '#fff', cursor: 'pointer',
};

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '14px 18px', minWidth: 110 }}>
      <small style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</small>
      <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 26, display: 'block', color: color || '#111', marginTop: 4 }}>{value}</b>
    </div>
  );
}