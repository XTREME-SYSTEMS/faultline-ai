import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import PageCoach from '@/components/fl/PageCoach';
import { base44 } from '@/api/base44Client';

export default function IndustryOpportunities() {
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [opportunities, setOpportunities] = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [opps, bps, comps] = await Promise.all([
          base44.entities.IndustryOpportunity.list('-created_date', 50),
          base44.entities.AutomationBlueprint.list('-created_date', 50),
          base44.entities.Company.list('-created_date', 100)
        ]);
        setOpportunities(opps);
        setBlueprints(bps);
        setCompanies(comps);
      } catch (e) { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const discover = async () => {
    if (!industry) return;
    setDiscovering(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('discoverIndustryOpportunities', { industry, location });
      const data = res.data || res;
      setSummary({ industry: data.industry, summary: data.industry_summary, market: data.total_market_opportunity, count: data.opportunities_found });
      const updated = await base44.entities.IndustryOpportunity.list('-created_date', 50);
      setOpportunities(updated);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    setDiscovering(false);
  };

  const generateBlueprints = async (opp) => {
    setSelectedOpp(opp.id);
    setGenerating(true);
    setError(null);
    try {
      await base44.functions.invoke('generateAutomationEnhancements', {
        industry: opp.industry,
        opportunity_id: opp.id,
        company_id: selectedCompany || undefined
      });
      const updated = await base44.entities.AutomationBlueprint.list('-created_date', 50);
      setBlueprints(updated);
    } catch (e) { setError(e.response?.data?.error || e.message); }
    setGenerating(false);
    setSelectedOpp(null);
  };

  const coachContext = {
    industry, location,
    opportunitiesFound: opportunities.length,
    blueprintsGenerated: blueprints.length,
    topOpportunity: opportunities[0]?.opportunity_title,
    avgAutomationPotential: opportunities.length > 0 ? Math.round(opportunities.reduce((s, o) => s + (o.automation_potential || 0), 0) / opportunities.length) : 0
  };

  return (
    <PortalShell assistant={<PageCoach pageKey="module" context={coachContext} title="Opportunity Finder" />}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Industry Intelligence</p>
          <h1>Industry Opportunity Finder</h1>
          <p>Discover every automation and AI enhancement opportunity in your client's industry. AI scans the market, identifies pain points, quantifies revenue impact, and generates deployable automation blueprints.</p>
        </div>
      </div>

      {/* Discovery input */}
      <section className="finding" style={{ marginTop: 13 }}>
        <h2 style={{ fontSize: 18, marginBottom: 15 }}>Discover opportunities in an industry</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#888' }}>Industry</label>
            <input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Construction, Healthcare, Real Estate…"
              style={{ padding: '12px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, minWidth: 280, background: '#fff' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#888' }}>Location (optional)</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. New York, nationwide…"
              style={{ padding: '12px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, minWidth: 220, background: '#fff' }}
            />
          </div>
          <button
            className="btn dark"
            onClick={discover}
            disabled={!industry || discovering}
            style={{ opacity: (!industry || discovering) ? 0.5 : 1 }}
          >
            {discovering ? '⏳ Scanning industry…' : '🔍 Find Opportunities'}
          </button>
        </div>
        {error && <p style={{ color: '#a52d23', marginTop: 12, fontSize: 14 }}>{error}</p>}
      </section>

      {/* Industry summary */}
      {summary && (
        <section className="finding" style={{ marginTop: 13, background: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)', color: '#fff', border: '1px solid #333' }}>
          <p className="eyebrow" style={{ color: 'var(--gold)' }}>{summary.industry} Industry Analysis</p>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: '#ccc' }}>{summary.summary}</p>
          <div style={{ display: 'flex', gap: 30, marginTop: 18 }}>
            <div><b style={{ font: '400 32px Libre Caslon Display, serif', color: 'var(--gold)' }}>{summary.count}</b><br/><small style={{ color: '#888' }}>opportunities found</small></div>
            <div><b style={{ font: '400 32px Libre Caslon Display, serif', color: 'var(--gold)' }}>{summary.market}</b><br/><small style={{ color: '#888' }}>total market opportunity</small></div>
          </div>
        </section>
      )}

      {/* Opportunities grid */}
      <section className="finding" style={{ marginTop: 13 }}>
        <h2 style={{ fontSize: 18, marginBottom: 15 }}>Discovered opportunities ({opportunities.length})</h2>
        {loading ? <p style={{ color: '#888' }}>Loading…</p> : opportunities.length === 0 ? (
          <p style={{ color: '#888' }}>No opportunities discovered yet. Run a scan above to find automation opportunities in any industry.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 14 }}>
            {opportunities.map(opp => (
              <div key={opp.id} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em' }}>{opp.industry}{opp.location ? ` · ${opp.location}` : ''}</span>
                    <h3 style={{ margin: '4px 0 0', fontSize: 16 }}>{opp.opportunity_title}</h3>
                  </div>
                  <div style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: '50%', border: `4px solid ${opp.automation_potential > 75 ? '#237A4B' : opp.automation_potential > 50 ? '#B88214' : '#C63D34'}` }}>
                    <b style={{ fontSize: 16 }}>{opp.automation_potential}</b>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>{opp.opportunity_description}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(opp.automation_types || []).slice(0, 3).map(t => (
                    <span key={t} style={{ padding: '3px 8px', background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 4, fontSize: 10, color: '#8A641C', fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #eee', marginTop: 'auto' }}>
                  <div>
                    <small style={{ color: '#888', fontSize: 11 }}>Revenue impact</small><br/>
                    <b style={{ fontSize: 14, color: '#237A4B' }}>${(opp.revenue_impact_estimate || 0).toLocaleString()}/yr</b>
                  </div>
                  <button
                    className="btn dark"
                    onClick={() => generateBlueprints(opp)}
                    disabled={generating && selectedOpp === opp.id}
                    style={{ fontSize: 12, padding: '8px 14px', opacity: (generating && selectedOpp === opp.id) ? 0.5 : 1 }}
                  >
                    {generating && selectedOpp === opp.id ? '⏳ Generating…' : '⚡ Generate Blueprints'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Automation Blueprints */}
      <section className="finding" style={{ marginTop: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 15 }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>Automation enhancement blueprints ({blueprints.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#888' }}>Tailor to client (optional)</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              style={{ padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, minWidth: 260, background: '#fff' }}
            >
              <option value="">Generic industry blueprints</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.industry || 'unknown industry'}</option>
              ))}
            </select>
            {selectedCompany && <small style={{ color: 'var(--gold)', fontSize: 11 }}>Blueprints will use this client's mapped systems as context.</small>}
          </div>
        </div>
        {blueprints.length === 0 ? (
          <p style={{ color: '#888' }}>No blueprints generated yet. Click "Generate Blueprints" on any opportunity above to create deployable automation plans.</p>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {blueprints.map(bp => (
              <div key={bp.id} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <span style={{ padding: '3px 10px', background: '#111', color: 'var(--gold)', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{bp.blueprint_type}</span>
                    <h3 style={{ margin: '8px 0 4px', fontSize: 17 }}>{bp.blueprint_name}</h3>
                    <small style={{ color: '#888' }}>{bp.industry}</small>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <b style={{ fontSize: 22, color: '#237A4B' }}>{bp.estimated_roi}%</b><br/>
                    <small style={{ color: '#888', fontSize: 11 }}>est. annual ROI</small>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, marginBottom: 12 }}>{bp.description}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
                  <div style={{ background: '#fdf0f0', padding: 12, borderRadius: 6, border: '1px solid #f5d8d5' }}>
                    <small style={{ color: '#a52d23', fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>Before</small>
                    <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{bp.before_state}</p>
                  </div>
                  <div style={{ background: '#f0f9f3', padding: 12, borderRadius: 6, border: '1px solid #c8e6d0' }}>
                    <small style={{ color: '#237A4B', fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>After</small>
                    <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{bp.after_state}</p>
                  </div>
                </div>
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 12, color: 'var(--gold)' }}>Implementation steps & demo script</summary>
                  <ol style={{ marginTop: 10, paddingLeft: 20, fontSize: 12, color: '#666' }}>
                    {(bp.implementation_steps || []).map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
                  </ol>
                  <div style={{ background: '#f8f7f4', padding: 12, borderRadius: 6, marginTop: 10, border: '1px solid #e5e1da' }}>
                    <small style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>Demo script for client</small>
                    <p style={{ fontSize: 12, color: '#666', marginTop: 4, fontStyle: 'italic' }}>{bp.demo_script}</p>
                  </div>
                </details>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  {(bp.tech_stack || []).map(t => (
                    <span key={t} style={{ padding: '3px 8px', background: '#f0f0f0', borderRadius: 4, fontSize: 10, color: '#555' }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </PortalShell>
  );
}