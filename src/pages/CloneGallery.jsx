import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ChevronLeft, Loader2, Zap, Package, Plus, FolderOpen, ChevronRight, Home } from 'lucide-react';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import CategoryCard from '@/components/clone-gallery/CategoryCard';
import SubIndustryCard from '@/components/clone-gallery/SubIndustryCard';
import CloneDetailCard from '@/components/clone-gallery/CloneDetailCard';
import GallerySearch from '@/components/clone-gallery/GallerySearch';
import SiteSpecsModal from '@/components/clone-studio/SiteSpecsModal';
import { CLONE_INDUSTRIES, getIndustryGroups } from '@/lib/cloneIndustries';
import { CATEGORY_IMAGES } from '@/lib/industryImages';

export default function CloneGallery() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [healingAll, setHealingAll] = useState(false);
  const [specsClone, setSpecsClone] = useState(null);

  const [view, setView] = useState('categories');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedIndustry, setSelectedIndustry] = useState(null);

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

  const clonesByIndustry = {};
  for (const group of (data?.groups || [])) {
    clonesByIndustry[group.industry] = group.clones;
  }

  const taxonomyGroups = getIndustryGroups();

  const cloneCountByGroup = {};
  for (const g of taxonomyGroups) {
    let count = 0;
    for (const ind of g.industries) {
      count += (clonesByIndustry[ind.label] || []).length;
    }
    cloneCountByGroup[g.group] = count;
  }

  function openCategory(group) {
    setSelectedGroup(group);
    setSelectedIndustry(null);
    setView('sub-industries');
  }

  function openSubIndustry(industry) {
    setSelectedIndustry(industry);
    setView('clones');
  }

  function backToCategories() {
    setView('categories');
    setSelectedGroup(null);
    setSelectedIndustry(null);
  }

  function backToSubIndustries() {
    setView('sub-industries');
    setSelectedIndustry(null);
  }

  const currentClones = selectedIndustry ? (clonesByIndustry[selectedIndustry.label] || []) : [];

  return (
    <div>
      <XtremeOSSidebar />
      <div className="portal-page xtremeos-content" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240 }}>
        <div style={{
          background: 'radial-gradient(circle at 82% 40%, #C89B3C45, transparent 25%), #0a0a0a',
          color: '#fff', padding: '36px 28px', margin: '-28px -28px 24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#E7C86E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>Clone Gallery</p>
              <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 38, margin: '8px 0 4px', letterSpacing: '-.03em' }}>
                My <span style={{ color: '#E7C86E' }}>Clones</span>
              </h1>
              <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>Browse by industry, then sub-industry, then clone. Buy URLs and file businesses.</p>
            </div>
            <Link to="/app" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#aaa', fontSize: 13 }}>
              <ChevronLeft size={16} /> Back to XtremeOS
            </Link>
          </div>

          {/* Autocomplete search bar — always visible at top of gallery */}
          <div style={{ marginBottom: 20 }}>
            <GallerySearch onPickClone={(clone) => setSpecsClone(clone)} />
          </div>

          {view !== 'categories' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 13 }}>
              <button onClick={backToCategories} style={{ background: 'none', border: 0, color: '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                <Home size={14} /> Categories
              </button>
              {selectedGroup && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChevronRight size={14} style={{ color: '#666' }} />
                  <button onClick={backToSubIndustries} style={{ background: 'none', border: 0, color: view === 'clones' ? '#aaa' : '#E7C86E', cursor: 'pointer', fontSize: 13 }}>
                    {selectedGroup.group}
                  </button>
                </span>
              )}
              {selectedIndustry && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChevronRight size={14} style={{ color: '#666' }} />
                  <span style={{ color: '#E7C86E', fontWeight: 600 }}>{selectedIndustry.label}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {data && view === 'categories' && (
          <div style={{ display: 'flex', gap: 13, marginBottom: 20, flexWrap: 'wrap' }}>
            <StatCard label="Total Clones" value={data.total} />
            <StatCard label="At 100/100" value={data.at100} color="#237A4B" />
            <StatCard label="Below 100" value={data.below100} color="#B88214" />
            <StatCard label="Categories" value={taxonomyGroups.length} />
            <StatCard label="Industries" value={CLONE_INDUSTRIES.length} color="#8A641C" />
            <button onClick={handleHealAll} disabled={healingAll} style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
              background: healingAll ? '#333' : 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111',
              border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: healingAll ? 'wait' : 'pointer',
            }}>
              {healingAll ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              {healingAll ? 'Healing All...' : 'Heal All to 100'}
            </button>
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
            Loading your clones...
          </div>
        )}

        {!loading && view === 'categories' && data && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {taxonomyGroups.map(taxGroup => (
              <CategoryCard
                key={taxGroup.group}
                group={taxGroup.group}
                industryCount={taxGroup.industries.length}
                cloneCount={cloneCountByGroup[taxGroup.group] || 0}
                image={CATEGORY_IMAGES[taxGroup.group]}
                onClick={() => openCategory(taxGroup)}
              />
            ))}
          </div>
        )}

        {!loading && view === 'sub-industries' && selectedGroup && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <FolderOpen size={22} style={{ color: '#C89B3C' }} />
              <h2 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 26, margin: 0 }}>{selectedGroup.group}</h2>
              <span style={{ fontSize: 12, color: '#999' }}>
                {cloneCountByGroup[selectedGroup.group] || 0} clones across {selectedGroup.industries.length} industries
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {selectedGroup.industries.map(ind => (
                <SubIndustryCard
                  key={ind.id}
                  industry={ind}
                  cloneCount={(clonesByIndustry[ind.label] || []).length}
                  onClick={() => openSubIndustry(ind)}
                />
              ))}
            </div>
          </div>
        )}

        {!loading && view === 'clones' && selectedIndustry && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 26, margin: 0 }}>{selectedIndustry.label}</h2>
              <span style={{ fontSize: 12, color: '#999' }}>{currentClones.length} clones</span>
            </div>
            {currentClones.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                <Package size={40} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontSize: 15, margin: '0 0 8px' }}>No clones in this sub-industry yet.</p>
                <Link to="/app/clone-queue" style={{ color: '#C89B3C', fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Plus size={14} /> Add a site to the clone queue
                </Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {currentClones.map(clone => (
                  <CloneDetailCard key={clone.id} clone={clone} onShowSpecs={setSpecsClone} />
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && data && data.total === 0 && view === 'categories' && (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            <Package size={48} style={{ opacity: 0.3, margin: '0 auto 16px', display: 'block' }} />
            <p style={{ fontSize: 15, margin: '0 0 8px' }}>No clones yet.</p>
            <Link to="/app/clone-queue" style={{ color: '#C89B3C', fontWeight: 700, fontSize: 14 }}>Add a site to the clone queue</Link>
          </div>
        )}
      </div>
      {specsClone && <SiteSpecsModal clone={specsClone} onClose={() => setSpecsClone(null)} />}
    </div>
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