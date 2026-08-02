import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import PageCoach from '@/components/fl/PageCoach';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function Trends() {
  const [data, setData] = useState({ snapshots: [], findings: [], companies: [], opportunities: [], blueprints: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [snapshots, findings, companies, opportunities, blueprints] = await Promise.all([
          base44.entities.ScanSnapshot.list('-scanned_at', 200),
          base44.entities.Finding.list('-created_date', 200),
          base44.entities.Company.list('-created_date', 100),
          base44.entities.IndustryOpportunity.list('-created_date', 100),
          base44.entities.AutomationBlueprint.list('-created_date', 100)
        ]);
        if (!cancelled) { setData({ snapshots, findings, companies, opportunities, blueprints }); setLoading(false); }
      } catch (e) {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Score trend over time (average across all companies per scan date)
  const scoreTrend = [...data.snapshots].reverse().map(s => ({
    date: new Date(s.scanned_at).toLocaleDateString(),
    score: s.health_score,
    findings: s.finding_count
  }));

  // Finding velocity: findings per day over last 30 days
  const dayMap = {};
  for (const f of data.findings) {
    const day = new Date(f.created_date).toLocaleDateString();
    dayMap[day] = (dayMap[day] || 0) + 1;
  }
  const velocityData = Object.entries(dayMap).slice(-15).map(([date, count]) => ({ date, count }));

  // Industry benchmarks: average health score by industry
  const industryMap = {};
  for (const s of data.snapshots) {
    const company = data.companies.find(c => c.id === s.company_id);
    if (!company) continue;
    const ind = company.industry || 'Unknown';
    if (!industryMap[ind]) industryMap[ind] = [];
    industryMap[ind].push(s.health_score);
  }
  const benchmarkData = Object.entries(industryMap).map(([industry, scores]) => ({
    industry: industry.substring(0, 15),
    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    count: scores.length
  }));

  // Industry opportunity map: group opportunities by industry with totals
  const oppIndustryMap = {};
  for (const o of data.opportunities) {
    const ind = o.industry || 'Unknown';
    if (!oppIndustryMap[ind]) oppIndustryMap[ind] = { industry: ind, count: 0, totalRevenue: 0, avgPotential: [], types: new Set() };
    oppIndustryMap[ind].count++;
    oppIndustryMap[ind].totalRevenue += o.revenue_impact_estimate || 0;
    oppIndustryMap[ind].avgPotential.push(o.automation_potential || 0);
    (o.automation_types || []).forEach(t => oppIndustryMap[ind].types.add(t));
  }
  const opportunityMapData = Object.values(oppIndustryMap).map(v => ({
    industry: v.industry.substring(0, 15),
    opportunities: v.count,
    revenueImpact: Math.round(v.totalRevenue / 1000),
    avgPotential: v.avgPotential.length > 0 ? Math.round(v.avgPotential.reduce((a, b) => a + b, 0) / v.avgPotential.length) : 0,
    automationTypes: v.types.size
  })).sort((a, b) => b.revenueImpact - a.revenueImpact);

  // Security gap analysis: findings by category across target companies
  const categoryMap = {};
  for (const f of data.findings) {
    const cat = f.category || 'other';
    if (!categoryMap[cat]) categoryMap[cat] = { category: cat, count: 0, critical: 0, high: 0, medium: 0, low: 0, companies: new Set() };
    categoryMap[cat].count++;
    if (categoryMap[cat][f.severity] !== undefined) categoryMap[cat][f.severity]++;
    if (f.audit_id) {
      const audit = data.snapshots.find(s => s.audit_id === f.audit_id);
      if (audit) categoryMap[cat].companies.add(audit.company_id);
    }
  }
  const securityGapData = Object.values(categoryMap).map(v => ({
    category: v.category,
    count: v.count,
    critical: v.critical,
    high: v.high,
    medium: v.medium,
    low: v.low,
    companiesAffected: v.companies.size
  })).sort((a, b) => b.count - a.count);

  // Per-company security gap summary
  const companyGapMap = {};
  for (const f of data.findings) {
    const snap = data.snapshots.find(s => s.audit_id === f.audit_id);
    if (!snap) continue;
    const cid = snap.company_id;
    if (!companyGapMap[cid]) companyGapMap[cid] = { company: data.companies.find(c => c.id === cid)?.name || 'Unknown', critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    companyGapMap[cid].total++;
    if (companyGapMap[cid][f.severity] !== undefined) companyGapMap[cid][f.severity]++;
  }
  const companyGapData = Object.values(companyGapMap).sort((a, b) => b.critical - a.critical || b.total - a.total).slice(0, 10);

  const coachContext = {
    avgScore: data.snapshots.length > 0 ? Math.round(data.snapshots.reduce((a, s) => a + s.health_score, 0) / data.snapshots.length) : null,
    totalFindings: data.findings.length,
    companiesTracked: data.companies.length,
    scansCompleted: data.snapshots.length,
    topIndustries: benchmarkData.slice(0, 5),
    industryOpportunities: data.opportunities.length,
    totalRevenueImpact: opportunityMapData.reduce((s, o) => s + o.revenueImpact, 0),
    automationBlueprints: data.blueprints.length,
    topSecurityGaps: securityGapData.slice(0, 3),
    criticalFindings: data.findings.filter(f => f.severity === 'critical').length
  };

  return (
    <PortalShell assistant={<PageCoach pageKey="trends" context={coachContext} title="Trends" />}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Intelligence</p>
          <h1>Trends</h1>
          <p>Org-wide score trends, finding velocity, industry benchmarks, industry-wide opportunity maps, and security gap analysis across target companies.</p>
        </div>
      </div>

      <div className="metrics" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <article><small>Avg Health Score</small><b>{data.snapshots.length > 0 ? Math.round(data.snapshots.reduce((a, s) => a + s.health_score, 0) / data.snapshots.length) : '—'}</b><span>across all scans</span></article>
        <article><small>Total Findings</small><b>{data.findings.length}</b><span>all time</span></article>
        <article><small>Companies Tracked</small><b>{data.companies.length}</b><span>in pipeline</span></article>
        <article><small>Scans Completed</small><b>{data.snapshots.length}</b><span>total snapshots</span></article>
      </div>

      <div className="metrics" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 13 }}>
        <article><small>Industry Opportunities</small><b>{data.opportunities.length}</b><span>discovered</span></article>
        <article><small>Revenue Impact Mapped</small><b>${(opportunityMapData.reduce((s, o) => s + o.revenueImpact, 0) * 1000).toLocaleString()}</b><span>total annual</span></article>
        <article><small>Automation Blueprints</small><b>{data.blueprints.length}</b><span>ready to deploy</span></article>
        <article><small>Critical Security Gaps</small><b style={{ color: data.findings.filter(f => f.severity === 'critical').length > 0 ? '#C63D34' : '#111' }}>{data.findings.filter(f => f.severity === 'critical').length}</b><span>across target companies</span></article>
      </div>

      {loading ? (
        <p style={{ padding: 28, color: '#888' }}>Loading trends…</p>
      ) : (
        <>
          <section className="finding" style={{ marginTop: 13 }}>
            <h2>Score trend over time</h2>
            {scoreTrend.length === 0 ? <p style={{ color: '#888' }}>No scan data yet.</p> : (
              <div style={{ height: 280, padding: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke="#C89B3C" strokeWidth={2} name="Health Score" />
                    <Line type="monotone" dataKey="findings" stroke="#888" strokeWidth={1} name="Findings" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="finding" style={{ marginTop: 13 }}>
            <h2>Finding velocity (per day)</h2>
            {velocityData.length === 0 ? <p style={{ color: '#888' }}>No findings yet.</p> : (
              <div style={{ height: 280, padding: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={velocityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#C89B3C" name="Findings" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="finding" style={{ marginTop: 13 }}>
            <h2>Industry benchmarks</h2>
            {benchmarkData.length === 0 ? <p style={{ color: '#888' }}>No benchmark data yet.</p> : (
              <div style={{ height: 280, padding: 12 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={benchmarkData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="industry" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="avgScore" fill="#C89B3C" name="Avg Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* Industry-wide opportunity map */}
          <section className="finding" style={{ marginTop: 13 }}>
            <h2>Industry-wide opportunity map</h2>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 15 }}>Automation opportunities discovered across industries, sized by revenue impact and automation potential.</p>
            {opportunityMapData.length === 0 ? <p style={{ color: '#888' }}>No industry opportunities discovered yet. Run the Industry Opportunity Finder to populate this map.</p> : (
              <>
                <div style={{ height: 320, padding: 12 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={opportunityMapData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="industry" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="opportunities" fill="#C89B3C" name="Opportunities" />
                      <Bar dataKey="automationTypes" fill="#237A4B" name="Automation Types" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="table" style={{ marginTop: 14 }}>
                  <table>
                    <thead><tr><th>Industry</th><th>Opportunities</th><th>Revenue Impact ($K/yr)</th><th>Avg Automation Potential</th><th>Automation Types</th></tr></thead>
                    <tbody>
                      {opportunityMapData.map(o => (
                        <tr key={o.industry}>
                          <td><b>{o.industry}</b></td>
                          <td>{o.opportunities}</td>
                          <td><b style={{ color: '#237A4B' }}>${o.revenueImpact}K</b></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 60, height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${o.avgPotential}%`, height: '100%', background: o.avgPotential > 75 ? '#237A4B' : o.avgPotential > 50 ? '#B88214' : '#C63D34' }} />
              </div>
              <span style={{ fontSize: 12 }}>{o.avgPotential}/100</span>
            </div>
                          </td>
                          <td>{o.automationTypes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          {/* Security gap analysis across target companies */}
          <section className="finding" style={{ marginTop: 13 }}>
            <h2>Security gap analysis — target companies</h2>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 15 }}>Vulnerability categories found across your target companies, broken down by severity.</p>
            {securityGapData.length === 0 ? <p style={{ color: '#888' }}>No security findings yet. Run scans to populate this analysis.</p> : (
              <>
                <div style={{ height: 320, padding: 12 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={securityGapData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="critical" stackId="a" fill="#C63D34" name="Critical" />
                      <Bar dataKey="high" stackId="a" fill="#B88214" name="High" />
                      <Bar dataKey="medium" stackId="a" fill="#E7C86E" name="Medium" />
                      <Bar dataKey="low" stackId="a" fill="#237A4B" name="Low" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="table" style={{ marginTop: 14 }}>
                  <table>
                    <thead><tr><th>Category</th><th>Total</th><th>Critical</th><th>High</th><th>Medium</th><th>Low</th><th>Companies Affected</th></tr></thead>
                    <tbody>
                      {securityGapData.map(g => (
                        <tr key={g.category}>
                          <td><b>{g.category}</b></td>
                          <td><b>{g.count}</b></td>
                          <td><span className="pill critical" style={{ fontWeight: 700 }}>{g.critical}</span></td>
                          <td><span className="pill high" style={{ fontWeight: 700 }}>{g.high}</span></td>
                          <td><span className="pill medium" style={{ fontWeight: 700 }}>{g.medium}</span></td>
                          <td><span className="pill" style={{ background: '#f0f9f3', color: '#237A4B', fontWeight: 700 }}>{g.low}</span></td>
                          <td>{g.companiesAffected}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          {/* Per-company security gap ranking */}
          <section className="finding" style={{ marginTop: 13 }}>
            <h2>Top target companies by security exposure</h2>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 15 }}>Companies ranked by critical finding count — your highest-priority targets for outreach.</p>
            {companyGapData.length === 0 ? <p style={{ color: '#888' }}>No company-level gap data yet.</p> : (
              <div className="table">
                <table>
                  <thead><tr><th>Company</th><th>Critical</th><th>High</th><th>Medium</th><th>Low</th><th>Total Findings</th><th>Exposure Score</th></tr></thead>
                  <tbody>
                    {companyGapData.map((c, i) => {
                      const exposureScore = c.critical * 10 + c.high * 5 + c.medium * 2 + c.low;
                      return (
                        <tr key={i}>
                          <td><b>{c.company}</b></td>
                          <td><span className="pill critical" style={{ fontWeight: 700 }}>{c.critical}</span></td>
                          <td><span className="pill high" style={{ fontWeight: 700 }}>{c.high}</span></td>
                          <td><span className="pill medium" style={{ fontWeight: 700 }}>{c.medium}</span></td>
                          <td><span className="pill" style={{ background: '#f0f9f3', color: '#237A4B', fontWeight: 700 }}>{c.low}</span></td>
                          <td>{c.total}</td>
                          <td><b style={{ color: exposureScore > 30 ? '#C63D34' : exposureScore > 15 ? '#B88214' : '#237A4B' }}>{exposureScore}</b></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </PortalShell>
  );
}