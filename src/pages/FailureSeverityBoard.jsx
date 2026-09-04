import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import XtremeOSRightPanel from '@/components/fl/XtremeOSRightPanel';
import {
  AlertOctagon, AlertTriangle, AlertCircle, Eye, Ban, Loader2,
  RefreshCw, Play, Wrench, ChevronRight, Shield, Cpu, Gauge,
} from 'lucide-react';

// Severity tiers — determines display order and visual treatment
const SEVERITY_TIERS = [
  {
    id: 'critical',
    label: 'Critical',
    color: '#C63D34',
    bg: '#f5d8d5',
    icon: AlertOctagon,
    description: 'Critical categories that are failing or blocked — fix immediately',
  },
  {
    id: 'high',
    label: 'High',
    color: '#B88214',
    bg: '#f8e5ce',
    icon: AlertTriangle,
    description: 'Failing categories below 50% — major gaps needing attention soon',
  },
  {
    id: 'medium',
    label: 'Medium',
    color: '#7e6b00',
    bg: '#f4edca',
    icon: AlertCircle,
    description: 'Partial categories (50–90%) — close the remaining gap',
  },
  {
    id: 'unverified',
    label: 'Unverified',
    color: '#2563eb',
    bg: '#dce8ff',
    icon: Eye,
    description: 'No evidence established yet — run validators to set denominators',
  },
  {
    id: 'blocked',
    label: 'Blocked',
    color: '#666',
    bg: '#eee',
    icon: Ban,
    description: 'Blocked by external dependencies or superseded categories',
  },
];

export default function FailureSeverityBoard() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [board, setBoard] = useState([]);
  const [caps, setCaps] = useState([]);
  const [repairTasks, setRepairTasks] = useState([]);
  const [coverageFails, setCoverageFails] = useState([]);
  const [runLog, setRunLog] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      const orgId = me?.data?.organization_id || 'default';
      const [b, c, rt, cov] = await Promise.all([
        base44.entities.ClosureBoard.filter({ organization_id: orgId }, '-score', 50).catch(() => []),
        base44.entities.BackendCapabilityLedger.filter({ organization_id: orgId }, 'score', 200).catch(() => []),
        base44.entities.RepairTask.filter({ organization_id: orgId, status: { $in: ['identified', 'in_progress'] } }, '-created_date', 50).catch(() => []),
        base44.entities.CoverageLedger.filter({ organization_id: orgId, status: 'fail' }, '-run_at', 50).catch(() => []),
      ]);
      setBoard(b);
      setCaps(c);
      setRepairTasks(rt);
      setCoverageFails(cov);
    } catch (e) {
      console.error('FailureSeverityBoard load error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group board items by severity
  function classifyBoard(b) {
    if (b.status === 'blocked') return 'blocked';
    if (b.status === 'unverified') return 'unverified';
    if (b.status === 'failing') {
      if (b.is_critical) return 'critical';
      if ((b.score ?? 0) < 50) return 'high';
      return 'medium';
    }
    if (b.status === 'partial') return 'medium';
    return null; // passing / certified — not shown
  }

  const grouped = {};
  SEVERITY_TIERS.forEach(t => { grouped[t.id] = []; });

  board.forEach(b => {
    const tier = classifyBoard(b);
    if (tier) grouped[tier].push({ type: 'board', ...b });
  });

  // Add failing capabilities to critical if they're in critical categories
  const criticalCapCats = ['identity', 'authentication', 'sessions', 'subscriptions', 'entitlements', 'downloads'];
  caps.forEach(c => {
    if (c.status !== 'validated' && c.status !== 'not_applicable_with_proof') {
      const tier = criticalCapCats.includes(c.capability_category) ? 'critical' : 'high';
      grouped[tier].push({ type: 'capability', ...c });
    }
  });

  // Add repair tasks to high
  repairTasks.forEach(rt => {
    grouped.high.push({ type: 'repair_task', ...rt });
  });

  // Add coverage failures to medium
  coverageFails.forEach(cf => {
    grouped.medium.push({ type: 'coverage', ...cf });
  });

  // Count totals
  const totalFailures = SEVERITY_TIERS.reduce((sum, t) => sum + grouped[t.id].length, 0);
  const criticalCount = grouped.critical.length;
  const highCount = grouped.high.length;

  // Run convergence engine to fix all
  async function handleRunConvergence() {
    setRunning(true);
    setRunLog([]);
    const log = (msg) => {
      setRunLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg }]);
    };
    try {
      log('Starting convergence engine — targeting all failures...');
      const res = await base44.functions.invoke('continuousConvergenceEngine', {
        max_iterations: 10,
      });
      const d = res.data || res;
      log(`Engine complete: ${d.categories_passing}/${d.categories_total} categories passing`);
      log(`Capabilities validated: ${d.capabilities_validated}/${d.capabilities_total}`);
      log(`Proof log entries: ${d.proof_entries_persisted}`);
      if (d.lowest_category) log(`Lowest remaining: ${d.lowest_category} at ${d.lowest_score}%`);
      await load();
    } catch (e) {
      log(`Error: ${e.message || e}`);
    }
    setRunning(false);
  }

  if (loading) {
    return (
      <>
        <XtremeOSSidebar />
        <div style={{ minHeight: '100vh', background: '#f7f7f5', marginLeft: 240, display: 'grid', placeItems: 'center' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: '#C89B3C' }} />
        </div>
      </>
    );
  }

  return (
    <>
      <XtremeOSSidebar />
      <XtremeOSRightPanel />
      <div className="portal-page xtremeos-content" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240, marginRight: 0 }}>
        {/* Header */}
        <div style={{
          background: 'radial-gradient(circle at 82% 40%, #C63D3445, transparent 25%), #0a0a0a',
          color: '#fff', padding: '36px 28px', margin: '-28px -28px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20,
        }}>
          <div>
            <p style={{ color: '#f5d8d5', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>
              Diagnostic Failure Board
            </p>
            <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 38, margin: '8px 0 4px', letterSpacing: '-.03em' }}>
              Failures by <span style={{ color: '#f5d8d5' }}>Severity</span>
            </h1>
            <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>
              {totalFailures} active failures grouped by severity — {criticalCount} critical, {highCount} high
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={handleRunConvergence}
              disabled={running}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
                background: running ? '#333' : 'linear-gradient(135deg, #f5d8d5, #C63D34)',
                color: running ? '#888' : '#fff', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13,
                cursor: running ? 'wait' : 'pointer',
              }}
            >
              {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {running ? 'Running Engine...' : 'Run Convergence Engine'}
            </button>
            <button
              onClick={load}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
                background: '#0a0a0a', color: '#aaa', border: '1px solid #333', borderRadius: 8,
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        {/* Run log */}
        {runLog.length > 0 && (
          <div style={{
            background: '#0a0a0a', color: '#E7C86E', border: '1px solid #333', borderRadius: 8,
            padding: 16, marginBottom: 20, fontFamily: 'ui-monospace, monospace', fontSize: 12, maxHeight: 200, overflowY: 'auto',
          }}>
            {runLog.map((entry, i) => (
              <div key={i} style={{ padding: '2px 0' }}>
                <span style={{ color: '#666' }}>[{entry.time}]</span> {entry.msg}
              </div>
            ))}
          </div>
        )}

        {/* Severity tiers */}
        {totalFailures === 0 && (
          <div style={{ padding: 60, textAlign: 'center', background: '#fff', borderRadius: 8, border: '1px solid #e5e1da' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#237A4B', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <Shield size={28} color="#fff" />
            </div>
            <h2 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 28, margin: '0 0 8px' }}>All Clear</h2>
            <p style={{ color: '#666', fontSize: 14 }}>No active failures detected. All categories are passing or certified.</p>
          </div>
        )}

        <div style={{ display: 'grid', gap: 20 }}>
          {SEVERITY_TIERS.map(tier => {
            const items = grouped[tier.id];
            if (items.length === 0) return null;
            const Icon = tier.icon;
            return (
              <div key={tier.id} style={{
                background: '#fff', border: '1px solid #e5e1da', borderRadius: 10, overflow: 'hidden',
              }}>
                {/* Tier header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
                  background: tier.bg, borderBottom: `2px solid ${tier.color}`,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, background: tier.color,
                    display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0,
                  }}>
                    <Icon size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <b style={{ fontSize: 16, color: tier.color }}>{tier.label}</b>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                        background: tier.color, color: '#fff',
                      }}>{items.length}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#666', margin: '2px 0 0' }}>{tier.description}</p>
                  </div>
                </div>

                {/* Items */}
                <div>
                  {items.map((item, i) => (
                    <FailureRow key={item.id || item.capability_id || item.test_id || i} item={item} tierColor={tier.color} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function FailureRow({ item, tierColor }) {
  const [expanded, setExpanded] = useState(false);

  let title, subtitle, score, action;
  if (item.type === 'board') {
    title = item.category;
    subtitle = item.lowest_failure || item.blocker || item.next_work_packet || 'No details';
    score = item.score;
    action = item.next_work_packet || 'Run convergence engine';
  } else if (item.type === 'capability') {
    title = item.capability_name || item.capability_id;
    subtitle = `Capability: ${item.capability_category} — ${item.status}`;
    score = item.score;
    action = item.defects?.length > 0 ? `${item.defects.length} defects` : 'Test & repair';
  } else if (item.type === 'repair_task') {
    title = item.description || item.title || 'Repair task';
    subtitle = `Area: ${item.area || 'unknown'} — ${item.fix_strategy || 'No strategy'}`;
    score = null;
    action = 'Apply fix';
  } else if (item.type === 'coverage') {
    title = item.requirement || item.test_id;
    subtitle = `Test: ${item.test_id} — ${item.actual_result || 'No result'}`;
    score = null;
    action = 'Re-run test';
  }

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
        borderBottom: '1px solid #f0ede5', cursor: 'pointer', transition: 'background .15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#fafaf8'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Score badge */}
      {score !== null && score !== undefined && (
        <div style={{
          width: 52, textAlign: 'center', flexShrink: 0,
          font: "400 20px 'Libre Caslon Display', serif",
          color: score < 50 ? '#C63D34' : score < 90 ? '#B88214' : '#7e6b00',
        }}>
          {score}%
        </div>
      )}
      {score === null && (
        <div style={{ width: 52, flexShrink: 0, textAlign: 'center' }}>
          <ChevronRight size={16} style={{ color: '#999' }} />
        </div>
      )}

      {/* Title + subtitle */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <b style={{ fontSize: 13, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </b>
        <small style={{ fontSize: 11, color: '#888', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {subtitle}
        </small>
      </div>

      {/* Action hint */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: tierColor, fontWeight: 600 }}>{action}</span>
        <ChevronRight size={14} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: '.2s', color: '#999' }} />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{
          width: '100%', marginTop: 8, padding: 12, background: '#f9f8f5', borderRadius: 6,
          fontSize: 12, color: '#555', lineHeight: 1.5,
        }}>
          {item.type === 'board' && (
            <>
              {item.lowest_failure && <div><b>Lowest failure:</b> {item.lowest_failure}</div>}
              {item.blocker && <div><b>Blocker:</b> {item.blocker}</div>}
              {item.next_work_packet && <div><b>Next action:</b> {item.next_work_packet}</div>}
              <div><b>Denominator:</b> {item.denominator} | <b>Numerator:</b> {item.numerator} | <b>Target:</b> {item.target_score}%</div>
            </>
          )}
          {item.type === 'capability' && (
            <>
              <div><b>ID:</b> {item.capability_id} | <b>Category:</b> {item.capability_category}</div>
              <div><b>Status:</b> {item.status} | <b>Score:</b> {item.score}</div>
              {item.defects?.length > 0 && <div><b>Defects:</b> {item.defects.join('; ')}</div>}
              {item.source_observable_behavior && <div><b>Source behavior:</b> {item.source_observable_behavior}</div>}
            </>
          )}
          {item.type === 'repair_task' && (
            <>
              <div><b>Status:</b> {item.status} | <b>Area:</b> {item.area}</div>
              {item.fix_strategy && <div><b>Fix strategy:</b> {item.fix_strategy}</div>}
              {item.root_cause && <div><b>Root cause:</b> {item.root_cause}</div>}
            </>
          )}
          {item.type === 'coverage' && (
            <>
              <div><b>Test ID:</b> {item.test_id} | <b>Category:</b> {item.category}</div>
              <div><b>Expected:</b> {item.expected_result}</div>
              <div><b>Actual:</b> {item.actual_result}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}