import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Loader2, Search, ChevronRight, Home, FolderOpen, TrendingUp,
  DollarSign, Globe, Zap, AlertCircle,
} from 'lucide-react';
import { getIndustryGroups } from '@/lib/cloneIndustries';
import { CATEGORY_IMAGES } from '@/lib/industryImages';
import CategoryCard from '@/components/clone-gallery/CategoryCard';
import SubIndustryCard from '@/components/clone-gallery/SubIndustryCard';
import SiteAnalysisCard from '@/components/clone-queue/SiteAnalysisCard';

// DiscoveryView — the industry → sub-industry → scan → results flow.
// Mirrors Clone Gallery's 3-tier hierarchy: pick a category, pick a sub-industry,
// then the scanner discovers + analyzes the top 50 sites in that niche.
export default function DiscoveryView() {
  const [view, setView] = useState('categories'); // categories | sub-industries | results
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanResults, setScanResults] = useState(null);
  const [addedSites, setAddedSites] = useState(new Set());

  const taxonomyGroups = getIndustryGroups();

  function openCategory(group) {
    setSelectedGroup(group);
    setSelectedIndustry(null);
    setView('sub-industries');
  }

  function openSubIndustry(industry) {
    setSelectedIndustry(industry);
    runScan(selectedGroup.group, industry.label);
  }

  async function runScan(groupLabel, subIndustryLabel) {
    setView('results');
    setScanning(true);
    setScanError('');
    setScanResults(null);
    setAddedSites(new Set());
    try {
      const res = await base44.functions.invoke('scanTopSitesInCategory', {
        industry_group: groupLabel,
        sub_industry: subIndustryLabel,
        max_sites: 50,
      });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setScanResults(d);
    } catch (e) {
      setScanError(e.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  function backToCategories() {
    setView('categories');
    setSelectedGroup(null);
    setSelectedIndustry(null);
    setScanResults(null);
  }

  function backToSubIndustries() {
    setView('sub-industries');
    setSelectedIndustry(null);
    setScanResults(null);
  }

  function handleSiteAdded(site) {
    setAddedSites(prev => new Set([...prev, site.url]));
  }

  return (
    <div>
      {/* Breadcrumb */}
      {view !== 'categories' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13 }}>
          <button onClick={backToCategories} style={{ background: 'none', border: 0, color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
            <Home size={14} /> Categories
          </button>
          {selectedGroup && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ChevronRight size={14} style={{ color: '#999' }} />
              <button onClick={backToSubIndustries} style={{ background: 'none', border: 0, color: view === 'results' ? '#666' : '#C89B3C', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {selectedGroup.group}
              </button>
            </span>
          )}
          {selectedIndustry && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ChevronRight size={14} style={{ color: '#999' }} />
              <span style={{ color: '#C89B3C', fontWeight: 600 }}>{selectedIndustry.label}</span>
            </span>
          )}
        </div>
      )}

      {/* Categories view */}
      {view === 'categories' && (
        <div>
          <div style={{ padding: 24, background: 'radial-gradient(circle at 82% 40%, #C89B3C20, transparent 25%), #0a0a0a', borderRadius: 12, marginBottom: 20, color: '#fff' }}>
            <p style={{ color: '#E7C86E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>Discovery Scanner</p>
            <h2 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 28, margin: '8px 0 6px' }}>
              Pick an <span style={{ color: '#E7C86E' }}>Industry</span> to Scan
            </h2>
            <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>
              Choose a category, then a sub-industry. The scanner discovers the top 50 websites, analyzes each one's
              market share, revenue, customer base, competition, and provides a full audit with recommendations.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {taxonomyGroups.map(taxGroup => (
              <CategoryCard
                key={taxGroup.group}
                group={taxGroup.group}
                industryCount={taxGroup.industries.length}
                cloneCount={0}
                image={CATEGORY_IMAGES[taxGroup.group]}
                onClick={() => openCategory(taxGroup)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sub-industries view */}
      {view === 'sub-industries' && selectedGroup && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <FolderOpen size={22} style={{ color: '#C89B3C' }} />
            <h2 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 26, margin: 0 }}>{selectedGroup.group}</h2>
            <span style={{ fontSize: 12, color: '#999' }}>{selectedGroup.industries.length} sub-industries</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {selectedGroup.industries.map(ind => (
              <SubIndustryCard
                key={ind.id}
                industry={ind}
                cloneCount={0}
                onClick={() => openSubIndustry(ind)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Results view */}
      {view === 'results' && selectedIndustry && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Search size={22} style={{ color: '#C89B3C' }} />
            <h2 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 26, margin: 0 }}>
              Top Sites in {selectedIndustry.label}
            </h2>
            {scanResults && (
              <span style={{ fontSize: 12, color: '#999' }}>{scanResults.total_sites} sites discovered</span>
            )}
          </div>

          {/* Scanning state */}
          {scanning && (
            <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
              <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 16px', display: 'block', color: '#C89B3C' }} />
              <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 6px' }}>Scanning top 50 sites in {selectedIndustry.label}…</p>
              <p style={{ fontSize: 13, color: '#aaa' }}>Discovering websites, analyzing market data, revenue, competition, and running full audits.</p>
            </div>
          )}

          {/* Error state */}
          {scanError && !scanning && (
            <div style={{ padding: 20, background: '#f5d8d5', borderRadius: 10, color: '#a52d23', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircle size={20} />
              <span style={{ fontSize: 14 }}>{scanError}</span>
              <button onClick={() => runScan(selectedGroup.group, selectedIndustry.label)} style={{
                marginLeft: 'auto', padding: '8px 16px', background: '#C63D34', color: '#fff',
                border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 12,
              }}>Retry</button>
            </div>
          )}

          {/* Industry overview */}
          {scanResults && !scanning && (
            <>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 13, marginBottom: 20,
              }}>
                <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DollarSign size={18} style={{ color: '#237A4B' }} />
                    <small style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '.06em' }}>Industry Market Cap</small>
                  </div>
                  <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 28, display: 'block', color: '#237A4B', marginTop: 6 }}>
                    {scanResults.industry_market_cap || 'N/A'}
                  </b>
                </div>
                <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={18} style={{ color: '#2563eb' }} />
                    <small style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '.06em' }}>Growth Rate</small>
                  </div>
                  <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 28, display: 'block', color: '#2563eb', marginTop: 6 }}>
                    {scanResults.industry_growth_rate || 'N/A'}
                  </b>
                </div>
                <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Globe size={18} style={{ color: '#C89B3C' }} />
                    <small style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '.06em' }}>Sites Discovered</small>
                  </div>
                  <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 28, display: 'block', color: '#C89B3C', marginTop: 6 }}>
                    {scanResults.total_sites}
                  </b>
                </div>
              </div>

              {scanResults.industry_summary && (
                <div style={{ padding: 16, background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 8, marginBottom: 20, fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                  {scanResults.industry_summary}
                </div>
              )}

              {/* Site cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                {scanResults.sites.map(site => (
                  <SiteAnalysisCard
                    key={site.url || site.rank}
                    site={site}
                    onAddToQueue={handleSiteAdded}
                    adding={addedSites.has(site.url)}
                  />
                ))}
              </div>

              {/* Rescan button */}
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button onClick={() => runScan(selectedGroup.group, selectedIndustry.label)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                  background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111',
                  border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}>
                  <Zap size={16} /> Rescan This Category
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}