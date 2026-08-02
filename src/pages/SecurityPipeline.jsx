import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PortalShell from '@/components/fl/PortalShell';
import PageCoach from '@/components/fl/PageCoach';
import { base44 } from '@/api/base44Client';

export default function SecurityPipeline() {
  const { id } = useParams();
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(id || '');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Company.list();
        setCompanies(list);
        if (id) setSelectedCompany(id);
        setLoading(false);
      } catch (e) {
        setError(e.message);
        setLoading(false);
      }
    })();
  }, [id]);

  const runPipeline = async () => {
    if (!selectedCompany) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke('runSecurityPipeline', { company_id: selectedCompany });
      setResult(res.data || res);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setRunning(false);
    }
  };

  const stepLabels = {
    deep_security_scan: 'Deep Security Scan',
    extended_diagnostics: 'Extended Diagnostics (Compliance, Email, SEO, Subdomains)',
    revenue_quantification: 'Revenue Leak Quantification',
    competitor_benchmark: 'Competitor Benchmark',
    generate_report: 'Executive Report',
    map_systems: 'System Clone',
    enhanced_system: 'Enhanced System + Revised Report',
    risk_register: 'Risk Register',
    ai_readiness: 'AI Readiness Score',
    repair_plan: '30/60/90 Repair Plan',
    generate_proposal: 'Pricing + Proposal',
    branded_proposal: 'Branded PDF Proposal',
    draft_outreach: 'Outreach Email Draft',
    follow_up_sequence: 'Follow-up Email Sequence',
    hubspot_sync: 'HubSpot Deal Sync',
    stripe_payment_link: 'Stripe Payment Link',
    monitoring_setup: 'Monitoring Rules',
    client_portal_config: 'Client Portal Auto-Config',
    rag_indexing: 'RAG Indexing (Supabase)',
    team_notification: 'Team Notification'
  };

  const coachContext = result ? {
    company: result.company_name,
    findings: result.scan_findings,
    systemNodes: result.system_nodes,
    leakPoints: result.leak_points,
    originalScore: result.original_health_score,
    enhancedScore: result.enhanced_health_score,
    resolvedFindings: result.resolved_findings,
    revenueImpact: result.revenue_impact_max,
    aiReadiness: result.ai_readiness_score,
    totalPrice: result.total_price,
    recommendedPlan: result.recommended_plan
  } : { companies: companies.length };

  if (loading) return <PortalShell><p style={{ padding: 28, color: '#888' }}>Loading…</p></PortalShell>;

  return (
    <PortalShell assistant={<PageCoach pageKey="system-clone" context={coachContext} title="Security Pipeline" />}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Automated Pipeline</p>
          <h1>Full Security Audit Pipeline</h1>
          <p>20-step automated flow: deep scan → extended diagnostics → revenue quantification → competitor benchmark → report → system clone → enhanced system → risk register → AI readiness → repair plan → pricing → branded PDF → outreach → follow-up sequence → HubSpot → Stripe → monitoring → client portal → RAG indexing → team notification.</p>
        </div>
      </div>

      {/* Company selector + run button */}
      <section className="finding" style={{ marginTop: 13 }}>
        <h2 style={{ fontSize: 18, marginBottom: 15 }}>Select a company to audit</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            style={{ padding: '12px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, minWidth: 280, background: '#fff' }}
          >
            <option value="">— Choose a company —</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.industry || 'general'})</option>)}
          </select>
          <button
            className="btn dark"
            onClick={runPipeline}
            disabled={!selectedCompany || running}
            style={{ opacity: (!selectedCompany || running) ? 0.5 : 1 }}
          >
            {running ? '⏳ Running 20-step pipeline…' : '▶ Run Full Pipeline'}
          </button>
        </div>
        {error && <p style={{ color: '#a52d23', marginTop: 12, fontSize: 14 }}>{error}</p>}
      </section>

      {/* Pipeline steps visualization */}
      {running && (
        <section className="finding" style={{ marginTop: 13 }}>
          <h2 style={{ fontSize: 18, marginBottom: 15 }}>Pipeline progress (20 steps)</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {Object.entries(stepLabels).map(([key, label]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 6 }}>
                <span className="dot-anim" style={{ fontSize: 18 }}>●</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
                <span style={{ color: '#888', fontSize: 11, marginLeft: 'auto' }}>processing…</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Step results */}
          <section className="finding" style={{ marginTop: 13 }}>
            <h2 style={{ fontSize: 18, marginBottom: 15 }}>Pipeline results ({result.steps?.filter(s => s.status === 'success').length}/{result.steps?.length} steps succeeded)</h2>
            <div style={{ display: 'grid', gap: 6 }}>
              {result.steps?.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: s.status === 'success' ? '#f0f9f3' : '#fdf0f0', border: `1px solid ${s.status === 'success' ? '#c8e6d0' : '#f5d8d5'}`, borderRadius: 6 }}>
                  <span style={{ fontSize: 16 }}>{s.status === 'success' ? '✓' : '✗'}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{stepLabels[s.step] || s.step}</span>
                  <span style={{ color: '#666', fontSize: 11, marginLeft: 'auto' }}>
                    {s.status === 'success' ? 'Completed' : s.error}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Before/After scores */}
          <div className="metrics" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 13 }}>
            <article>
              <small>Original Health Score</small>
              <b style={{ color: '#a52d23' }}>{result.original_health_score}</b>
              <span>/100 — before FaultLine AI</span>
            </article>
            <article>
              <small>Enhanced Health Score</small>
              <b style={{ color: '#237A4B' }}>{result.enhanced_health_score}</b>
              <span>/100 — after enhancements</span>
            </article>
            <article>
              <small>Revenue Impact</small>
              <b style={{ fontSize: 22 }}>${result.revenue_impact_max?.toLocaleString()}</b>
              <span>/yr — quantified leaks</span>
            </article>
            <article>
              <small>AI Readiness</small>
              <b>{result.ai_readiness_score}</b>
              <span>/100 — automation readiness</span>
            </article>
          </div>

          <div className="metrics" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 13 }}>
            <article>
              <small>Findings Resolved</small>
              <b>{result.resolved_findings}</b>
              <span>of {result.scan_findings} total</span>
            </article>
            <article>
              <small>Total Investment</small>
              <b style={{ fontSize: 24 }}>${result.total_price?.toLocaleString()}</b>
              <span>{result.recommended_plan}</span>
            </article>
            <article>
              <small>Systems Mapped</small>
              <b>{result.system_nodes}</b>
              <span>operational nodes</span>
            </article>
            <article>
              <small>Leak Points</small>
              <b>{result.leak_points}</b>
              <span>revenue/efficiency leaks</span>
            </article>
          </div>

          {/* Automation outputs */}
          <div className="metrics" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 13 }}>
            {result.stripe_checkout_url && (
              <article>
                <small>Stripe Payment Link</small>
                <b style={{ fontSize: 14, color: '#237A4B' }}>✓ Created</b>
                <span>checkout session ready</span>
              </article>
            )}
            {result.client_portal_url && (
              <article>
                <small>Client Portal</small>
                <b style={{ fontSize: 14, color: '#237A4B' }}>✓ Configured</b>
                <span>{result.client_portal_url}</span>
              </article>
            )}
            {result.branded_proposal_url && (
              <article>
                <small>Branded Proposal</small>
                <b style={{ fontSize: 14, color: '#237A4B' }}>✓ Generated</b>
                <span>client-ready HTML</span>
              </article>
            )}
          </div>

          {/* System clone summary */}
          <section className="finding" style={{ marginTop: 13 }}>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Deliverables & links</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link to={`/app/companies/${selectedCompany}/clone`} className="btn outline" style={{ fontSize: 13 }}>View System Clone →</Link>
              <Link to={`/app/companies/${selectedCompany}`} className="btn outline" style={{ fontSize: 13 }}>Company Detail →</Link>
              {result.client_portal_url && (
                <a href={result.client_portal_url} target="_blank" rel="noopener noreferrer" className="btn gold" style={{ fontSize: 13 }}>Open Client Portal →</a>
              )}
              {result.branded_proposal_url && (
                <a href={result.branded_proposal_url} target="_blank" rel="noopener noreferrer" className="btn outline" style={{ fontSize: 13 }}>View Branded Proposal →</a>
              )}
              {result.stripe_checkout_url && (
                <a href={result.stripe_checkout_url} target="_blank" rel="noopener noreferrer" className="btn dark" style={{ fontSize: 13 }}>Stripe Checkout →</a>
              )}
            </div>
          </section>

          {/* Outreach email */}
          {result.outreach_subject && (
            <section className="finding" style={{ marginTop: 13 }}>
              <h2 style={{ fontSize: 18, marginBottom: 12 }}>Automated outreach + follow-up sequence</h2>
              <div style={{ background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 6, padding: 18 }}>
                <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Touch 1: {result.outreach_subject}</p>
                <p style={{ fontSize: 12, color: '#888' }}>Initial email + 3-touch follow-up sequence created and saved to the outreach queue — pending your approval before sending.</p>
                <Link to="/app/ai-control" className="btn outline" style={{ fontSize: 13, marginTop: 12, display: 'inline-block' }}>Review & Approve Emails →</Link>
              </div>
            </section>
          )}
        </>
      )}

      {!result && !running && (
        <section className="finding" style={{ marginTop: 13 }}>
          <h2 style={{ fontSize: 18, marginBottom: 15 }}>How the 20-step pipeline works</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              ['1', 'Deep Security Scan', 'Crawls the website, checks security headers, SSL, exposed files, admin panels, broken links, CMS vulnerabilities.'],
              ['2', 'Extended Diagnostics', 'Compliance check (GDPR/CCPA/HIPAA), email deliverability (SPF/DKIM/DMARC), SEO audit, subdomain discovery, credential exposure scan.'],
              ['3', 'Revenue Leak Quantification', 'AI quantifies dollar impact of each finding with annual impact ranges.'],
              ['4', 'Competitor Benchmark', 'Discovers and scans 3 real competitors, scores them, and stores comparison data.'],
              ['5', 'Executive Report', 'Board-ready markdown report with findings, impact, and repair recommendations.'],
              ['6', 'System Clone', 'AI infers the full operational system map with leak points and enhancement opportunities.'],
              ['7', 'Enhanced System', 'Generates the "after" picture showing improved health score with all enhancements applied.'],
              ['8', 'Risk Register', 'Formal risk register with likelihood, impact, and mitigation controls for each finding.'],
              ['9', 'AI Readiness Score', 'Scores readiness for AI automation across data, process, technology, governance, security, and team.'],
              ['10', '30/60/90 Repair Plan', 'Prioritized repair roadmap with owners, effort estimates, and validation criteria.'],
              ['11', 'Pricing + Proposal', 'Automated pricing calculation and full client-ready proposal document.'],
              ['12', 'Branded PDF Proposal', 'Polished, FaultLine-branded HTML proposal with score visualization and pricing table.'],
              ['13', 'Outreach Email', 'Value-first email referencing specific findings, saved to approval queue.'],
              ['14', 'Follow-up Sequence', '3-touch email sequence (intro, case study, final offer) with staggered send delays.'],
              ['15', 'HubSpot Deal Sync', 'Auto-creates company and deal in HubSpot CRM with proposal value.'],
              ['16', 'Stripe Payment Link', 'Generates Stripe checkout session for the proposal amount.'],
              ['17', 'Monitoring Rules', 'Sets up uptime, security header, SSL expiry, and finding alert monitoring rules.'],
              ['18', 'Client Portal Auto-Config', 'Automatically configures the client-facing portal with audit results.'],
              ['19', 'RAG Indexing', 'Indexes all findings into Supabase vector database for future AI-powered search.'],
              ['20', 'Team Notification', 'Sends email summary to the operator when the pipeline completes.']
            ].map(([num, title, desc]) => (
              <div key={num} style={{ display: 'flex', gap: 14, padding: '12px 16px', background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 6 }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: '50%', background: '#111', color: 'var(--gold)', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{num}</span>
                <div>
                  <b style={{ fontSize: 13 }}>{title}</b>
                  <p style={{ fontSize: 12, color: '#666', marginTop: 3 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </PortalShell>
  );
}