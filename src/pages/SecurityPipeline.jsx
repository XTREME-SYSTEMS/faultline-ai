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
    generate_report: 'Executive Report',
    map_systems: 'System Clone',
    enhanced_system: 'Enhanced System + Revised Report',
    generate_proposal: 'Pricing + Proposal',
    draft_outreach: 'Outreach Email Draft'
  };

  const coachContext = result ? {
    company: result.company_name,
    findings: result.scan_findings,
    systemNodes: result.system_nodes,
    leakPoints: result.leak_points,
    originalScore: result.original_health_score,
    enhancedScore: result.enhanced_health_score,
    resolvedFindings: result.resolved_findings,
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
          <p>Run the complete end-to-end automated flow: deep security scan → executive report → system clone → enhanced system with revised report → automated pricing → proposal → outreach email.</p>
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
            {running ? '⏳ Running pipeline…' : '▶ Run Full Pipeline'}
          </button>
        </div>
        {error && <p style={{ color: '#a52d23', marginTop: 12, fontSize: 14 }}>{error}</p>}
      </section>

      {/* Pipeline steps visualization */}
      {running && (
        <section className="finding" style={{ marginTop: 13 }}>
          <h2 style={{ fontSize: 18, marginBottom: 15 }}>Pipeline progress</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {Object.entries(stepLabels).map(([key, label]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 6 }}>
                <span className="dot-anim" style={{ fontSize: 20 }}>●</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
                <span style={{ color: '#888', fontSize: 12, marginLeft: 'auto' }}>processing…</span>
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
            <h2 style={{ fontSize: 18, marginBottom: 15 }}>Pipeline results</h2>
            <div style={{ display: 'grid', gap: 8 }}>
              {result.steps?.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: s.status === 'success' ? '#f0f9f3' : '#fdf0f0', border: `1px solid ${s.status === 'success' ? '#c8e6d0' : '#f5d8d5'}`, borderRadius: 6 }}>
                  <span style={{ fontSize: 18 }}>{s.status === 'success' ? '✓' : '✗'}</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{stepLabels[s.step] || s.step}</span>
                  <span style={{ color: '#666', fontSize: 12, marginLeft: 'auto' }}>
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
              <small>Findings Resolved</small>
              <b>{result.resolved_findings}</b>
              <span>of {result.scan_findings} total</span>
            </article>
            <article>
              <small>Total Investment</small>
              <b style={{ fontSize: 24 }}>${result.total_price?.toLocaleString()}</b>
              <span>{result.recommended_plan}</span>
            </article>
          </div>

          {/* System clone summary */}
          <section className="finding" style={{ marginTop: 13 }}>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>System clone summary</h2>
            <div className="metrics" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <article><small>Systems Mapped</small><b>{result.system_nodes}</b><span>operational nodes</span></article>
              <article><small>Leak Points</small><b>{result.leak_points}</b><span>revenue/efficiency leaks</span></article>
              <article><small>Audit Findings</small><b>{result.scan_findings}</b><span>security issues found</span></article>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link to={`/app/companies/${selectedCompany}/clone`} className="btn outline" style={{ fontSize: 13 }}>View System Clone →</Link>
              <Link to={`/app/companies/${selectedCompany}`} className="btn outline" style={{ fontSize: 13 }}>Company Detail →</Link>
            </div>
          </section>

          {/* Outreach email */}
          {result.outreach_subject && (
            <section className="finding" style={{ marginTop: 13 }}>
              <h2 style={{ fontSize: 18, marginBottom: 12 }}>Automated outreach email</h2>
              <div style={{ background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 6, padding: 18 }}>
                <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Subject: {result.outreach_subject}</p>
                <p style={{ fontSize: 12, color: '#888' }}>Email draft created and saved to the outreach queue — pending your approval before sending.</p>
                <Link to="/app/outreach" className="btn outline" style={{ fontSize: 13, marginTop: 12, display: 'inline-block' }}>Review & Approve Email →</Link>
              </div>
            </section>
          )}

          {/* Proposal link */}
          {result.proposal_id && (
            <section className="finding" style={{ marginTop: 13 }}>
              <h2 style={{ fontSize: 18, marginBottom: 12 }}>Security proposal generated</h2>
              <p style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
                A full client-ready proposal with pricing breakdown, enhanced system projection, and implementation timeline has been generated.
              </p>
              <Link to={`/app/companies/${selectedCompany}`} className="btn gold" style={{ fontSize: 13 }}>View Proposal in Company Detail →</Link>
            </section>
          )}
        </>
      )}

      {!result && !running && (
        <section className="finding" style={{ marginTop: 13 }}>
          <h2 style={{ fontSize: 18, marginBottom: 15 }}>How the pipeline works</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              ['1', 'Deep Security Scan', 'Crawls the company website, checks security headers, SSL, exposed files, admin panels, broken links, and CMS vulnerabilities.'],
              ['2', 'Executive Report', 'Generates a board-ready markdown report with findings, business impact, and repair recommendations.'],
              ['3', 'System Clone', 'AI infers the company\'s full operational system map — CRM, billing, scheduling, marketing, etc. — with leak points and AI enhancement opportunities.'],
              ['4', 'Enhanced System + Revised Report', 'Generates the "after" picture: what their systems look like with FaultLine AI applied, with a revised security score showing the improvement.'],
              ['5', 'Pricing + Proposal', 'Calculates automated pricing based on findings and systems, recommends a plan, and generates a full client-ready proposal document.'],
              ['6', 'Outreach Email', 'Drafts a value-first email referencing the specific findings, saved to the approval queue for your review before sending.']
            ].map(([num, title, desc]) => (
              <div key={num} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 6 }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: '50%', background: '#111', color: 'var(--gold)', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{num}</span>
                <div>
                  <b style={{ fontSize: 14 }}>{title}</b>
                  <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </PortalShell>
  );
}