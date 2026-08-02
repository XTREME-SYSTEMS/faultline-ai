import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';
import { TOOL_CATEGORIES, AGENTS } from '@/components/fl/toolRegistry';
import ToolCard from '@/components/fl/ToolCard';

export default function CommandCenter() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [audits, setAudits] = useState([]);
  const [healthScore, setHealthScore] = useState(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sweepRunning, setSweepRunning] = useState(false);
  const [sweepLog, setSweepLog] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [cs, as, scores] = await Promise.all([
          base44.entities.Company.list('-created_date', 200),
          base44.entities.Audit.list('-created_date', 100),
          base44.entities.SystemHealthScore.list('-created_date', 1)
        ]);
        setCompanies(cs);
        setAudits(as);
        if (scores.length > 0) setHealthScore(scores[0]);
      } catch (e) { /* ignore */ }
    })();
  }, []);

  const filteredCategories = TOOL_CATEGORIES.map(cat => ({
    ...cat,
    tools: cat.tools.filter(t =>
      t.label.toLowerCase().includes(search.toLowerCase()) ||
      t.desc.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => (activeCategory === 'all' || cat.id === activeCategory) && cat.tools.length > 0);

  const runFullSweep = async () => {
    setSweepRunning(true);
    setSweepLog([]);
    const steps = [
      { name: 'Autonomous Headless Scan', fn: () => base44.functions.invoke('autonomousHeadlessScan', {}) },
      { name: 'Sentinel Self-Reflection', fn: () => base44.functions.invoke('sentinelReflect', { flow_goal: 'Full autonomous sweep — all portal pages' }) },
      { name: 'Security Pen Test', fn: () => base44.functions.invoke('securityPenTest', {}) },
      { name: 'Compliance Check', fn: () => base44.functions.invoke('securityComplianceCheck', {}) },
      { name: 'Compute System Score', fn: () => base44.functions.invoke('computeSystemScore', {}) },
    ];
    for (const step of steps) {
      setSweepLog(prev => [...prev, { name: step.name, status: 'running' }]);
      try {
        const res = await step.fn();
        const data = res.data || res;
        setSweepLog(prev => [...prev.slice(0, -1), { name: step.name, status: 'done', result: data }]);
      } catch (e) {
        setSweepLog(prev => [...prev.slice(0, -1), { name: step.name, status: 'error', error: e.message }]);
      }
    }
    setSweepRunning(false);
    // Refresh health score
    try {
      const scores = await base44.entities.SystemHealthScore.list('-created_date', 1);
      if (scores.length > 0) setHealthScore(scores[0]);
    } catch (e) { /* ignore */ }
  };

  const totalTools = TOOL_CATEGORIES.reduce((sum, c) => sum + c.tools.length, 0);

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">System Command Center</p>
          <h1>Command Center</h1>
          <p>Every tool, AI agent, and automated capability in the system — {totalTools} tools across {TOOL_CATEGORIES.length} categories. Run any function with one click, launch any agent, or trigger a full autonomous sweep.</p>
        </div>
        {healthScore && (
          <div style={{ textAlign: 'right' }}>
            <div style={{
              width: 110, height: 110, borderRadius: '50%',
              border: `10px solid ${healthScore.overall_score >= 90 ? '#237A4B' : healthScore.overall_score >= 75 ? '#d9b46f' : '#C63D34'}`,
              display: 'grid', placeItems: 'center', margin: '0 0 6px auto'
            }}>
              <b style={{ font: '400 30px Libre Caslon Display, serif' }}>{healthScore.overall_score}</b>
            </div>
            <small style={{ color: '#888' }}>System Health · {healthScore.trend || 'stable'}</small>
          </div>
        )}
      </div>

      {/* Full autonomous sweep */}
      <section className="finding" style={{ marginTop: 13, background: 'linear-gradient(135deg, #0b0b0b, #1a1a1a)', color: '#fff', border: '1px solid #333' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>⚡ Full Autonomous Sweep</h2>
            <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>Runs the entire self-healing loop: headless scan → sentinel reflection → pen test → compliance check → score computation</p>
          </div>
          <button
            onClick={runFullSweep}
            disabled={sweepRunning}
            style={{ padding: '12px 24px', borderRadius: 6, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: sweepRunning ? 'wait' : 'pointer', background: sweepRunning ? '#444' : 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', border: 0 }}
          >
            {sweepRunning ? '⏳ Sweeping…' : '▶ Run Full Sweep'}
          </button>
        </div>
        {sweepLog.length > 0 && (
          <div style={{ marginTop: 14, display: 'grid', gap: 6 }}>
            {sweepLog.map((entry, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, padding: '6px 10px', background: '#1a1a1a', borderRadius: 4 }}>
                {entry.status === 'running' && <span style={{ color: '#E7C86E' }}>⏳ {entry.name}…</span>}
                {entry.status === 'done' && <span style={{ color: '#237A4B' }}>✓ {entry.name} — {entry.result?.status || 'done'} {entry.result?.score ? `(${entry.result.score}/100)` : ''}</span>}
                {entry.status === 'error' && <span style={{ color: '#C63D34' }}>✗ {entry.name} — {entry.error}</span>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Search + category filter */}
      <div style={{ display: 'flex', gap: 10, marginTop: 13, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search 40+ tools…"
          style={{ flex: 1, minWidth: 200, padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
        />
        <select
          value={activeCategory}
          onChange={e => setActiveCategory(e.target.value)}
          style={{ padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: '#fff' }}
        >
          <option value="all">All Categories</option>
          {TOOL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {/* Tool categories */}
      {filteredCategories.map(cat => (
        <section key={cat.id} style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${cat.color}` }}>
            <span style={{ fontSize: 22 }}>{cat.icon}</span>
            <h2 style={{ fontSize: 17, margin: 0, fontWeight: 700 }}>{cat.name}</h2>
            <span style={{ background: cat.color, color: '#fff', borderRadius: 10, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{cat.tools.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {cat.tools.map(tool => (
              <ToolCard key={tool.id} tool={tool} companies={companies} audits={audits} />
            ))}
          </div>
        </section>
      ))}

      {/* Agent launcher */}
      <section style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #8A641C' }}>
          <span style={{ fontSize: 22 }}>🧠</span>
          <h2 style={{ fontSize: 17, margin: 0, fontWeight: 700 }}>AI Agents</h2>
          <span style={{ background: '#8A641C', color: '#fff', borderRadius: 10, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{AGENTS.length}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {AGENTS.map(agent => (
            <div key={agent.id} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>{agent.icon}</span>
                <div>
                  <b style={{ fontSize: 13 }}>{agent.name}</b>
                  <p style={{ fontSize: 11, color: '#888', margin: '2px 0 0', lineHeight: 1.4 }}>{agent.desc}</p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/app/chat?agent=${agent.id}`)}
                style={{ padding: '8px 14px', borderRadius: 5, fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', background: '#0b0b0b', color: '#fff', border: 0 }}
              >
                💬 Launch Conversation
              </button>
            </div>
          ))}
        </div>
      </section>
    </PortalShell>
  );
}