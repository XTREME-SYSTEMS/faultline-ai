import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import PageCoach from '@/components/fl/PageCoach';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function Trends() {
  const [data, setData] = useState({ snapshots: [], findings: [], companies: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [snapshots, findings, companies] = await Promise.all([
          base44.entities.ScanSnapshot.list('-scanned_at', 200),
          base44.entities.Finding.list('-created_date', 200),
          base44.entities.Company.list('-created_date', 100)
        ]);
        if (!cancelled) { setData({ snapshots, findings, companies }); setLoading(false); }
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

  const coachContext = {
    avgScore: data.snapshots.length > 0 ? Math.round(data.snapshots.reduce((a, s) => a + s.health_score, 0) / data.snapshots.length) : null,
    totalFindings: data.findings.length,
    companiesTracked: data.companies.length,
    scansCompleted: data.snapshots.length,
    topIndustries: benchmarkData.slice(0, 5)
  };

  return (
    <PortalShell assistant={<PageCoach pageKey="trends" context={coachContext} title="Trends" />}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Intelligence</p>
          <h1>Trends</h1>
          <p>Org-wide score trends, finding velocity, and industry benchmarks.</p>
        </div>
      </div>

      <div className="metrics" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <article><small>Avg Health Score</small><b>{data.snapshots.length > 0 ? Math.round(data.snapshots.reduce((a, s) => a + s.health_score, 0) / data.snapshots.length) : '—'}</b><span>across all scans</span></article>
        <article><small>Total Findings</small><b>{data.findings.length}</b><span>all time</span></article>
        <article><small>Companies Tracked</small><b>{data.companies.length}</b><span>in pipeline</span></article>
        <article><small>Scans Completed</small><b>{data.snapshots.length}</b><span>total snapshots</span></article>
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
        </>
      )}
    </PortalShell>
  );
}