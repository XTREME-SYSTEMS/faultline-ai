import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import PageCoach from '@/components/fl/PageCoach';
import { base44 } from '@/api/base44Client';

const PACK_LABELS = {
  logo_pack: 'Logo Pack', brand_pack: 'Brand Pack', web_pack: 'Web Pack',
  lead_gen_pack: 'Lead Gen Pack', social_media_pack: 'Social Media Pack',
  security_pack: 'Security Pack', financial_pack: 'Financial Pack', automation_pack: 'Automation Pack'
};

const INDUSTRY_OPTIONS = [
  'All Industries', 'Healthcare & Medical', 'Real Estate', 'Legal Services', 'Construction & Contracting',
  'Manufacturing', 'Logistics & Supply Chain', 'Hospitality & Travel', 'Retail',
  'Financial Services', 'Insurance', 'Education & EdTech', 'Automotive',
  'Agriculture & AgTech', 'Energy & Utilities', 'Media & Entertainment',
  'E-commerce', 'Fitness & Wellness', 'Food & Beverage', 'Transportation & Fleet',
  'Professional Services & Consulting', 'Property Management', 'Home Services',
  'Dental & Orthodontics', 'Veterinary', 'Accounting & Bookkeeping',
  'HR & Recruiting', 'Telecom & IT Services', 'Nonprofit & Associations'
];

function ScoreBar({ label, value, color }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 600, color: '#666', marginBottom: 3 }}>
        <span>{label}</span><span>{value}</span>
      </div>
      <div style={{ height: 6, background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}

export default function UniversalBuilder() {
  const [mode, setMode] = useState('scan'); // 'scan' | 'idea'
  const [idea, setIdea] = useState('');
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [result, setResult] = useState(null);
  const [deliverables, setDeliverables] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [opportunities, setOpportunities] = useState([]);
  const [scanSummary, setScanSummary] = useState('');
  const [focusIndustry, setFocusIndustry] = useState('All Industries');
  const [scanError, setScanError] = useState(null);
  const [buildingIdx, setBuildingIdx] = useState(null);

  useEffect(() => {
    (async () => {
      try { setCompanies(await base44.entities.Company.list('-created_date', 100)); } catch (e) {}
    })();
  }, []);

  const runScan = async () => {
    setScanning(true); setScanError(null); setOpportunities([]); setScanSummary('');
    try {
      const res = await base44.functions.invoke('scanIndustriesForNiches', {
        focus_industry: focusIndustry === 'All Industries' ? null : focusIndustry
      });
      const data = res.data || res;
      setOpportunities(data.opportunities || []);
      setScanSummary(data.scan_summary || '');
    } catch (e) {
      setScanError(e.response?.data?.error || e.message);
    }
    setScanning(false);
  };

  const buildOpportunity = async (opp) => {
    setIdea(opp.recommended_idea);
    setMode('idea');
    await generate(opp.recommended_idea);
  };

  const generate = async (ideaOverride) => {
    const theIdea = (ideaOverride !== undefined ? ideaOverride : idea).trim();
    if (!theIdea) { setError('Enter your idea first.'); return; }
    setGenerating(true); setError(null); setResult(null);
    try {
      const res = await base44.functions.invoke('generateUniversalPlan', {
        idea: theIdea, company_id: selectedCompany || undefined
      });
      const data = res.data || res;
      setResult(data);
      const recent = await base44.entities.Deliverable.list('-created_date', 30);
      setDeliverables(recent.filter(d => d.metadata?.source === 'universal_builder'));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
    setGenerating(false);
    setBuildingIdx(null);
  };

  const r = result?.research || {};
  const coachContext = { idea, companyCount: companies.length, hasResult: !!result, mode, opportunityCount: opportunities.length };

  return (
    <PortalShell assistant={<PageCoach pageKey="module" context={coachContext} title="Universal Builder" />}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Step 1 · Start Here</p>
          <h1>Universal Builder</h1>
          <p>Don't know what to ask AI? Let the system scan every industry and find the best niches for you — ranked by automation potential, ROI, problem severity, and need-creation. Then build a full branded system that's mandatorily 20% better than any benchmark. Or enter your own idea.</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 13, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e1da' }}>
        <button
          onClick={() => { setMode('scan'); setError(null); }}
          style={{ flex: 1, padding: '14px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            background: mode === 'scan' ? 'linear-gradient(135deg, var(--gold2), var(--gold))' : '#fff',
            color: mode === 'scan' ? '#111' : '#666', border: 0, borderRight: '1px solid #e5e1da' }}
        >
          🔍 Scan All Industries (AI finds the ideas)
        </button>
        <button
          onClick={() => { setMode('idea'); setError(null); }}
          style={{ flex: 1, padding: '14px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            background: mode === 'idea' ? 'linear-gradient(135deg, var(--gold2), var(--gold))' : '#fff',
            color: mode === 'idea' ? '#111' : '#666', border: 0 }}
        >
          💡 I Have an Idea
        </button>
      </div>

      {/* SCAN MODE */}
      {mode === 'scan' && (
        <>
          <section className="finding" style={{ marginTop: 0, background: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)', color: '#fff', border: '1px solid #333' }}>
            <p className="eyebrow" style={{ color: 'var(--gold)' }}>Autonomous Industry Scanner</p>
            <h2 style={{ font: '400 26px Libre Caslon Display, serif', margin: '0 0 6px' }}>Let AI find your next opportunity</h2>
            <p style={{ color: '#aaa', fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>The scanner researches every industry, finds painful problems, scores them on automation potential, ROI, problem severity, and need-creation, then ranks the best niches. Every result is designed to beat benchmarks by at least 20%.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#999' }}>Industry focus</label>
                <select
                  value={focusIndustry}
                  onChange={(e) => setFocusIndustry(e.target.value)}
                  style={{ padding: '12px 14px', borderRadius: 6, border: '1px solid #444', background: '#111', color: '#fff', fontSize: 14, minWidth: 280 }}
                >
                  {INDUSTRY_OPTIONS.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </div>
              <button
                className="btn gold"
                onClick={runScan}
                disabled={scanning}
                style={{ opacity: scanning ? 0.6 : 1, fontSize: 15, padding: '14px 28px' }}
              >
                {scanning ? '⏳ Scanning industries…' : '🔍 Scan for Niches'}
              </button>
            </div>
            {scanError && <p style={{ color: '#ff6b6b', marginTop: 12, fontSize: 14 }}>{scanError}</p>}
          </section>

          {scanning && (
            <section className="finding" style={{ marginTop: 13, textAlign: 'center', padding: 40 }}>
              <div style={{ font: '400 22px Libre Caslon Display, serif', marginBottom: 18 }}>Scanning every industry for the best niches…</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480, margin: '0 auto', textAlign: 'left' }}>
                {['Researching pain points across industries', 'Scoring automation potential & ROI', 'Identifying problems that create new demand', 'Benchmarking against existing systems', 'Ranking by opportunity score (20%+ better rule)'].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#666' }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--gold)', color: 'var(--gold)', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                    {step}
                  </div>
                ))}
              </div>
            </section>
          )}

          {scanSummary && !scanning && (
            <section className="finding" style={{ marginTop: 13, background: 'linear-gradient(135deg, #fdf8ec, #fff)', border: '1px solid #e5d9b8' }}>
              <p className="eyebrow">Scan Summary</p>
              <p style={{ fontSize: 14, color: '#5a4a2a', lineHeight: 1.7 }}>{scanSummary}</p>
            </section>
          )}

          {opportunities.length > 0 && !scanning && (
            <section className="finding" style={{ marginTop: 13 }}>
              <h2 style={{ fontSize: 18, marginBottom: 4 }}>🏆 Top Niche Opportunities ({opportunities.length})</h2>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>Ranked by opportunity score. Click "Build This" to generate a full branded system + 8 asset packs for any niche.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 14 }}>
                {opportunities.map((opp, i) => (
                  <div key={i} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: '50%', background: i === 0 ? 'var(--gold)' : '#f4f1eb', color: i === 0 ? '#111' : '#8A641C', fontWeight: 700, fontSize: 14 }}>{i + 1}</span>
                          <b style={{ fontSize: 15 }}>{opp.niche}</b>
                        </div>
                        <small style={{ color: 'var(--gold)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em' }}>{opp.industry}</small>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ font: '400 28px Libre Caslon Display, serif', color: 'var(--gold)', lineHeight: 1 }}>{opp.opportunity_score}</div>
                        <small style={{ fontSize: 9, color: '#999', textTransform: 'uppercase' }}>Opp. Score</small>
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}><b>Problem:</b> {opp.problem_solved}</p>
                    <p style={{ fontSize: 13, color: '#5a4a2a', lineHeight: 1.5, background: '#fdf8ec', padding: 10, borderRadius: 6, border: '1px solid #e5d9b8' }}><b>💡 Idea:</b> {opp.recommended_idea}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                      <ScoreBar label="Automation" value={opp.automation_potential} color="var(--gold)" />
                      <ScoreBar label="ROI" value={opp.roi_score} color="#237A4B" />
                      <ScoreBar label="Problem Severity" value={opp.problem_severity} color="#C63D34" />
                      <ScoreBar label="Need Creation" value={opp.need_creation} color="#6C5CE7" />
                    </div>
                    <div style={{ fontSize: 11, color: '#888', lineHeight: 1.5 }}>
                      <div><b>Why:</b> {opp.why}</div>
                      <div style={{ marginTop: 4 }}><b>Target:</b> {opp.target_customer} · <b>Market:</b> {opp.estimated_market_size}</div>
                      {opp.benchmark_systems?.length > 0 && <div style={{ marginTop: 4 }}><b>Benchmarks:</b> {opp.benchmark_systems.join(', ')}</div>}
                    </div>
                    <button
                      className="btn dark"
                      onClick={() => { setBuildingIdx(i); buildOpportunity(opp); }}
                      disabled={buildingIdx !== null}
                      style={{ marginTop: 'auto', fontSize: 13, opacity: buildingIdx !== null && buildingIdx !== i ? 0.4 : 1 }}
                    >
                      {buildingIdx === i ? '⏳ Building system…' : '⚡ Build This System'}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* IDEA MODE */}
      {mode === 'idea' && (
        <section className="finding" style={{ marginTop: 0, background: 'linear-gradient(135deg, #0a0a0a, #1a1a1a)', color: '#fff', border: '1px solid #333' }}>
          <p className="eyebrow" style={{ color: 'var(--gold)' }}>Plan Generator</p>
          <h2 style={{ font: '400 26px Libre Caslon Display, serif', margin: '0 0 14px' }}>What's the idea?</h2>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="e.g. An AI-powered platform that automates insurance claims for small clinics…"
            rows={4}
            style={{ width: '100%', padding: '16px', borderRadius: 8, border: '1px solid #444', background: '#111', color: '#fff', fontSize: 15, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#999' }}>Link to existing client (optional)</label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                style={{ padding: '12px 14px', borderRadius: 6, border: '1px solid #444', background: '#111', color: '#fff', fontSize: 14, minWidth: 280 }}
              >
                <option value="">Standalone idea</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name} — {c.industry || 'unknown'}</option>)}
              </select>
            </div>
            <button
              className="btn gold"
              onClick={() => generate()}
              disabled={generating}
              style={{ opacity: generating ? 0.6 : 1, fontSize: 15, padding: '14px 28px' }}
            >
              {generating ? '⏳ Building your system…' : '⚡ Generate Universal Plan'}
            </button>
          </div>
          {error && <p style={{ color: '#ff6b6b', marginTop: 12, fontSize: 14 }}>{error}</p>}
        </section>
      )}

      {/* Progress while generating */}
      {generating && (
        <section className="finding" style={{ marginTop: 13, textAlign: 'center', padding: 40 }}>
          <div style={{ font: '400 22px Libre Caslon Display, serif', marginBottom: 18 }}>Building your system…</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480, margin: '0 auto', textAlign: 'left' }}>
            {['Researching idea & benchmarking top 3 systems', 'Analyzing social media, reviews & customer needs', 'Identifying niche, trends & industry issues', 'Cloning & combining top 3 systems (20%+ better)', 'Generating cost, ROI & AI enhancements', 'Creating comparison: their system vs ours', 'Generating logo, brand & 8 asset packs', 'Compiling branded master plan'].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#666' }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: '50%', border: '1px solid var(--gold)', color: 'var(--gold)', fontSize: 11, fontWeight: 700 }}>{i + 1}</span>
                {step}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Master plan + logo */}
          <section className="finding" style={{ marginTop: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
              <div>
                <p className="eyebrow">Master Plan Generated</p>
                <h2 style={{ font: '400 28px Libre Caslon Display, serif', margin: '4px 0 0' }}>{result.idea?.substring(0, 60)}</h2>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {result.deliverables?.slice(0, 2).map(d => (
                  <a key={d.id} href={d.file_url} target="_blank" rel="noopener noreferrer" className="btn dark" style={{ fontSize: 13 }}>↗ {d.title.split('—')[0].trim()}</a>
                ))}
              </div>
            </div>
            {result.logo_url && (
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', background: '#f8f7f4', padding: 20, borderRadius: 8, border: '1px solid #e5e1da' }}>
                <img src={result.logo_url} alt="Generated logo" style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: 8, background: '#fff', border: '1px solid #ddd' }} />
                <div>
                  <small style={{ color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>Generated Logo</small>
                  <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Part of the brand pack. Download the full brand system below.</p>
                </div>
              </div>
            )}
          </section>

          {/* 20% Better badge */}
          {r.comparison?.improvement_percentages && (
            <section className="finding" style={{ marginTop: 13, background: 'linear-gradient(135deg, #f0f9f3, #fff)', border: '1px solid #c8e6d0' }}>
              <h2 style={{ fontSize: 18, marginBottom: 10 }}>📈 20%+ Better Than Benchmarks</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {Object.entries(r.comparison.improvement_percentages).map(([metric, pct]) => (
                  <div key={metric} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 14, textAlign: 'center' }}>
                    <div style={{ font: '400 28px Libre Caslon Display, serif', color: Number(pct) >= 20 ? '#237A4B' : '#B88214' }}>+{pct}%</div>
                    <small style={{ fontSize: 11, color: '#666', textTransform: 'capitalize' }}>{metric.replace(/_/g, ' ')}</small>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Research summary grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14, marginTop: 13 }}>
            <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 20 }}>
              <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>💡 Idea Summary</h3>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>{r.idea_summary || '—'}</p>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 20 }}>
              <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>📊 Cost & ROI</h3>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
                Startup: <b>${(r.cost_roi?.estimated_startup_cost || 0).toLocaleString()}</b><br/>
                Monthly: <b>${(r.cost_roi?.estimated_monthly_cost || 0).toLocaleString()}</b><br/>
                Projected annual revenue: <b style={{ color: '#237A4B' }}>${(r.cost_roi?.projected_annual_revenue || 0).toLocaleString()}</b><br/>
                ROI: <b style={{ color: 'var(--gold)' }}>{r.cost_roi?.roi_percentage || 0}%</b> · Payback: <b>{r.cost_roi?.payback_months || 0} mo</b>
              </p>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 20 }}>
              <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>🎯 Niche Identifier</h3>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>{r.social_media_insights?.niche_identifier || '—'}</p>
              <small style={{ color: '#888' }}>Customer needs: {r.social_media_insights?.customer_needs || '—'}</small>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 20 }}>
              <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>🛡️ Best Security Measures</h3>
              <ul style={{ fontSize: 12, color: '#666', margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                {(r.best_security_measures || []).slice(0, 5).map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>

          {/* Top 3 benchmark systems */}
          <section className="finding" style={{ marginTop: 13 }}>
            <h2 style={{ fontSize: 18, marginBottom: 14 }}>🏆 Top 3 Benchmark Systems</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {(r.top_3_benchmark_systems || []).map((s, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: '50%', background: 'var(--gold)', color: '#111', fontWeight: 700, fontSize: 13 }}>{i + 1}</span>
                    <b style={{ fontSize: 15 }}>{s.name || '—'}</b>
                  </div>
                  <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{s.url || ''}</p>
                  <p style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}><b>Strengths:</b> {Array.isArray(s.strengths) ? s.strengths.join(', ') : s.strengths || '—'}</p>
                  <p style={{ fontSize: 12, color: '#666', lineHeight: 1.5, marginTop: 6 }}><b>Weaknesses:</b> {Array.isArray(s.weaknesses) ? s.weaknesses.join(', ') : s.weaknesses || '—'}</p>
                  <p style={{ fontSize: 12, color: 'var(--gold)', lineHeight: 1.5, marginTop: 6 }}><b>Learn:</b> {s.what_we_can_learn || '—'}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Clone & combine strategy */}
          <section className="finding" style={{ marginTop: 13, background: 'linear-gradient(135deg, #fdf8ec, #fff)', border: '1px solid #e5d9b8' }}>
            <h2 style={{ fontSize: 18, marginBottom: 10 }}>🧬 Clone & Combine Strategy</h2>
            <p style={{ fontSize: 14, color: '#5a4a2a', lineHeight: 1.7 }}>{r.clone_combine_strategy || '—'}</p>
          </section>

          {/* Comparison */}
          <section className="finding" style={{ marginTop: 13 }}>
            <h2 style={{ fontSize: 18, marginBottom: 14 }}>⚔️ Their System vs Our Enhanced System</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ background: '#fdf0f0', padding: 18, borderRadius: 8, border: '1px solid #f5d8d5' }}>
                <small style={{ color: '#a52d23', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>Their System</small>
                <p style={{ fontSize: 13, color: '#666', marginTop: 6, lineHeight: 1.5 }}>{r.comparison?.their_system_summary || '—'}</p>
              </div>
              <div style={{ background: '#f0f9f3', padding: 18, borderRadius: 8, border: '1px solid #c8e6d0' }}>
                <small style={{ color: '#237A4B', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>Our Enhanced System</small>
                <p style={{ fontSize: 13, color: '#666', marginTop: 6, lineHeight: 1.5 }}>{r.comparison?.our_enhanced_system_summary || '—'}</p>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <small style={{ color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>Key Improvements</small>
              <ul style={{ fontSize: 13, color: '#666', marginTop: 6, paddingLeft: 18, lineHeight: 1.7 }}>
                {(r.comparison?.key_improvements || []).map((imp, i) => <li key={i}>{imp}</li>)}
              </ul>
            </div>
          </section>

          {/* 8 Asset Packs */}
          <section className="finding" style={{ marginTop: 13 }}>
            <h2 style={{ fontSize: 18, marginBottom: 14 }}>📦 Asset Packs ({result.deliverables?.length - 2 || 0} documents)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {result.deliverables?.slice(2).map((d, i) => {
                const packKey = d.metadata?.pack || Object.keys(PACK_LABELS)[i];
                return (
                  <a key={d.id} href={d.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 16, textDecoration: 'none' }}>
                    <span style={{ fontSize: 22 }}>{['🏷️','🎨','🌐','🎯','📱','🛡️','💰','⚙️'][i] || '📄'}</span>
                    <b style={{ fontSize: 13, color: '#111' }}>{PACK_LABELS[packKey] || d.title}</b>
                    <small style={{ color: 'var(--gold)', fontWeight: 600 }}>Download →</small>
                  </a>
                );
              })}
            </div>
          </section>
        </>
      )}
    </PortalShell>
  );
}