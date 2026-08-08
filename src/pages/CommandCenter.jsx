import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';
import { TOOL_CATEGORIES, AGENTS } from '@/components/fl/toolRegistry';
import ToolCard from '@/components/fl/ToolCard';
import CommandChat from '@/components/fl/CommandChat';
import GenerationPipeline from '@/components/fl/GenerationPipeline';
import ClonedSystems from '@/components/fl/ClonedSystems';
import { Cloud, Github, Database, Globe, Play, CheckCircle2, XCircle, Loader2, Copy } from 'lucide-react';

const PROVISION_SERVICES = [
  { key: 'drive', label: 'Google Drive', icon: Cloud, color: '#4285F4' },
  { key: 'github', label: 'GitHub', icon: Github, color: '#181717' },
  { key: 'vercel', label: 'Vercel', icon: Globe, color: '#000' },
  { key: 'supabase', label: 'Supabase', icon: Database, color: '#3ECF8E' }
];

export default function CommandCenter() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [audits, setAudits] = useState([]);
  const [healthScore, setHealthScore] = useState(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sweepRunning, setSweepRunning] = useState(false);
  const [sweepLog, setSweepLog] = useState([]);
  const [provRunning, setProvRunning] = useState(false);
  const [provResult, setProvResult] = useState(null);

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
      { name: 'Sentinel Self-Reflection', fn: (prev) => base44.functions.invoke('sentinelReflect', { flow_goal: 'Full autonomous sweep — all portal pages', test_result: prev }) },
      { name: 'Security Pen Test', fn: () => base44.functions.invoke('securityPenTest', {}) },
      { name: 'Compliance Check', fn: () => base44.functions.invoke('securityComplianceCheck', {}) },
      { name: 'Compute System Score', fn: () => base44.functions.invoke('computeSystemScore', {}) },
    ];
    let prevResult = null;
    for (const step of steps) {
      setSweepLog(prev => [...prev, { name: step.name, status: 'running' }]);
      try {
        const res = await step.fn(prevResult);
        const data = res.data || res;
        prevResult = data;
        setSweepLog(prev => [...prev.slice(0, -1), { name: step.name, status: 'done', result: data }]);
      } catch (e) {
        setSweepLog(prev => [...prev.slice(0, -1), { name: step.name, status: 'error', error: e.message }]);
        prevResult = null;
      }
    }
    setSweepRunning(false);
    // Refresh health score
    try {
      const scores = await base44.entities.SystemHealthScore.list('-created_date', 1);
      if (scores.length > 0) setHealthScore(scores[0]);
    } catch (e) { /* ignore */ }
  };

  const runProvisioningTest = async () => {
    setProvRunning(true);
    setProvResult(null);
    try {
      const res = await base44.functions.invoke('testProvisioning', {});
      setProvResult(res.data || res);
    } catch (e) {
      setProvResult({ status: 'error', error: e.message });
    } finally {
      setProvRunning(false);
    }
  };

  const totalTools = TOOL_CATEGORIES.reduce((sum, c) => sum + c.tools.length, 0);

  return (
    <PortalShell assistant={
      <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #eee' }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)' }}>
            <span style={{ fontSize: 16 }}>✦</span>
          </span>
          <div>
            <b style={{ fontSize: 13, display: 'block' }}>Command AI</b>
            <small style={{ fontSize: 10, color: '#888' }}>Claude Opus 4.8 · best model</small>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <CommandChat />
        </div>
      </div>
    }>
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

      {/* AI-Guided Generation Pipeline — step-by-step timeline */}
      <GenerationPipeline />

      {/* Cloned & Launched Systems */}
      <section className="finding" style={{ marginTop: 13, background: '#fff', border: '1px solid #e5e1da' }}>
        <h2 style={{ fontSize: 18, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}><Copy size={18} style={{ color: 'var(--gold)' }} /> Cloned & Launched Systems</h2>
        <p style={{ fontSize: 13, color: '#666', margin: '0 0 14px' }}>Every system the autonomous orchestrator has cloned and every project launched through the pipeline.</p>
        <ClonedSystems />
      </section>

      {/* Autonomous provisioning test — Drive, GitHub, Vercel, Supabase */}
      <section className="finding" style={{ marginTop: 13, background: '#fff', border: '1px solid #e5e1da' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h2 style={{ fontSize: 18, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}><Play size={18} style={{ color: 'var(--gold)' }} /> Autonomous Provisioning Test</h2>
            <p style={{ fontSize: 13, color: '#666', margin: 0 }}>End-to-end validation of all launch-pipeline infrastructure — creates a real test resource in Google Drive, GitHub, Vercel, and Supabase to verify tokens and scopes are healthy.</p>
          </div>
          <button
            onClick={runProvisioningTest}
            disabled={provRunning}
            style={{ padding: '12px 24px', borderRadius: 6, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: provRunning ? 'wait' : 'pointer', background: provRunning ? '#ccc' : 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', border: 0, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {provRunning ? <><Loader2 size={16} className="animate-spin" /> Provisioning…</> : <><Play size={16} /> Run End-to-End Test</>}
          </button>
        </div>

        {/* Service status grid */}
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {PROVISION_SERVICES.map(svc => {
            const r = provResult?.results?.[svc.key];
            const Icon = svc.icon;
            return (
              <div key={svc.key} style={{ border: '1px solid #e5e1da', borderRadius: 8, padding: 14, background: r?.status === 'pass' ? '#e6f4ec' : r?.status === 'fail' ? '#f5d8d5' : '#f8f7f4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Icon size={18} style={{ color: svc.color }} />
                  <b style={{ fontSize: 12 }}>{svc.label}</b>
                </div>
                {!r && !provRunning && <small style={{ fontSize: 11, color: '#888' }}>Not tested</small>}
                {provRunning && !r && <small style={{ fontSize: 11, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}><Loader2 size={11} className="animate-spin" /> Testing…</small>}
                {r?.status === 'pass' && (
                  <div>
                    <small style={{ fontSize: 11, color: '#237A4B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12} /> Passed</small>
                    {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'var(--gold)', display: 'block', marginTop: 4, wordBreak: 'break-all' }}>Open →</a>}
                  </div>
                )}
                {r?.status === 'fail' && (
                  <small style={{ fontSize: 10, color: '#a52d23', display: 'block', lineHeight: 1.4 }} title={r.error}><XCircle size={11} style={{ display: 'inline', marginRight: 3 }} />{r.error?.slice(0, 60)}</small>
                )}
              </div>
            );
          })}
        </div>

        {provResult && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: provResult.status === 'pass' ? '#e6f4ec' : '#f8e5ce', fontSize: 13, fontWeight: 600, color: provResult.status === 'pass' ? '#237A4B' : '#8A641C' }}>
            {provResult.status === 'pass' ? `✓ All ${provResult.total} provisioning services healthy` : `${provResult.passed}/${provResult.total} services passed — check failures above`}
          </div>
        )}
      </section>

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