import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Zap, CheckCircle2, XCircle, Wrench } from 'lucide-react';

// Multi-phase test → heal → retest → log for all pending capabilities.
// Runs sequentially through 5 chains, showing live progress at each step.
const CHAINS = [
  { id: 'CHAIN-AUTH', label: 'Auth', categories: ['identity', 'authentication', 'sessions', 'profile'] },
  { id: 'CHAIN-SEARCH', label: 'Search', categories: ['catalog', 'category', 'search', 'filter', 'sort', 'pagination', 'item_detail'] },
  { id: 'CHAIN-CHECKOUT', label: 'Checkout', categories: ['subscriptions', 'entitlements', 'downloads', 'license_records'] },
  { id: 'CHAIN-AI', label: 'AI', categories: ['ai_tools'] },
  { id: 'CHAIN-FORM', label: 'Form', categories: ['form_processing'] },
];

export function MultiPhaseHealButton({ orgId, onComplete }) {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0); // 0=idle, 1=testing, 2=healing, 3=retesting, 4=done
  const [chainProgress, setChainProgress] = useState({});
  const [results, setResults] = useState(null);

  async function runMultiPhase() {
    setRunning(true);
    setPhase(1);
    setResults(null);
    const progress = {};
    CHAINS.forEach(c => { progress[c.id] = { test: 'pending', heal: 'pending', retest: 'pending', defects: 0 }; });
    setChainProgress({ ...progress });

    const log = [];

    // PHASE 1: Test all chains
    let testRes;
    try {
      testRes = await base44.functions.invoke('proveFullStackChains', { organization_id: orgId });
    } catch (e) {
      testRes = { data: { error: e.message } };
    }
    const td = testRes.data || testRes;
    const chains = td.chains || [];
    const failedChains = [];

    chains.forEach(chain => {
      const isPass = chain.chain_status === 'pass';
      progress[chain.chain_id] = {
        ...progress[chain.chain_id],
        test: isPass ? 'pass' : 'fail',
        defects: chain.steps?.filter(s => s.status === 'fail').length || 0,
      };
      if (!isPass) failedChains.push(chain.chain_id);
    });
    setChainProgress({ ...progress });
    log.push({ phase: 'test', passed: chains.filter(c => c.chain_status === 'pass').length, failed: failedChains.length, failedChains });

    // PHASE 2: Heal failed chains
    setPhase(2);
    for (const chainId of failedChains) {
      progress[chainId].heal = 'running';
      setChainProgress({ ...progress });
      try {
        await base44.functions.invoke('repairBackendChain', {
          target_chain: chainId,
          organization_id: orgId,
        });
        progress[chainId].heal = 'done';
      } catch (e) {
        progress[chainId].heal = 'error';
      }
      setChainProgress({ ...progress });
    }

    // PHASE 3: Re-test all chains
    setPhase(3);
    let retestRes;
    try {
      retestRes = await base44.functions.invoke('proveFullStackChains', { organization_id: orgId });
    } catch (e) {
      retestRes = { data: { error: e.message } };
    }
    const rd = retestRes.data || retestRes;
    const rechains = rd.chains || [];
    let finalPassed = 0;
    rechains.forEach(chain => {
      const isPass = chain.chain_status === 'pass';
      progress[chain.chain_id] = { ...progress[chain.chain_id], retest: isPass ? 'pass' : 'fail' };
      if (isPass) finalPassed++;
    });
    setChainProgress({ ...progress });
    log.push({ phase: 'retest', passed: finalPassed, total: rechains.length });

    // PHASE 4: Log to ConvergenceProofLog
    setPhase(4);
    try {
      await base44.entities.ConvergenceProofLog.create({
        organization_id: orgId,
        run_id: `multi-phase-${Date.now()}`,
        iteration: 1,
        phase: 'validation',
        action_taken: `Multi-phase test & auto-heal: ${chains.length} chains tested, ${failedChains.length} healed, ${finalPassed}/${rechains.length} passing on retest`,
        function_invoked: 'proveFullStackChains + repairBackendChain',
        status: finalPassed === rechains.length ? 'converged' : 'success',
        evidence: `Phase 1: ${log[0].passed} passed, ${log[0].failed} failed. Phase 3: ${finalPassed}/${rechains.length} passing.`,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      // Logging failure is non-fatal
    }

    setResults({
      tested: chains.length,
      failed: failedChains.length,
      healed: failedChains.filter(c => progress[c].heal === 'done').length,
      finalPassing: finalPassed,
      total: rechains.length,
    });
    setPhase(5); // done
    setRunning(false);
    if (onComplete) onComplete();
  }

  const phaseLabels = {
    0: '',
    1: 'Phase 1: Testing all chains...',
    2: 'Phase 2: Auto-healing failed chains...',
    3: 'Phase 3: Re-testing healed chains...',
    4: 'Phase 4: Logging results...',
    5: 'Complete',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        onClick={runMultiPhase}
        disabled={running}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
          background: running ? '#333' : 'linear-gradient(135deg, #E7C86E, #C89B3C)',
          color: running ? '#888' : '#111', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13,
          cursor: running ? 'wait' : 'pointer', whiteSpace: 'nowrap',
        }}
      >
        {running ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
        {running ? phaseLabels[phase] : 'Test & Auto-Heal All'}
      </button>

      {/* Live chain progress */}
      {running && (
        <div style={{
          background: '#0a0a0a', borderRadius: 8, padding: 12, display: 'grid', gap: 6,
        }}>
          {CHAINS.map(chain => {
            const p = chainProgress[chain.id] || {};
            return (
              <div key={chain.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#ddd' }}>
                <span style={{ width: 60, fontWeight: 600 }}>{chain.label}</span>
                <StatusDot status={p.test} label="T" />
                <StatusDot status={p.heal} label="H" />
                <StatusDot status={p.retest} label="R" />
                {p.defects > 0 && <span style={{ color: '#f5d8d5', fontSize: 10 }}>{p.defects} defects</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Final results */}
      {results && (
        <div style={{
          background: results.finalPassing === results.total ? '#e8f5ec' : '#fdf3e0',
          border: `1px solid ${results.finalPassing === results.total ? '#237A4B' : '#C89B3C'}`,
          borderRadius: 8, padding: 12, fontSize: 12,
        }}>
          <b style={{ color: results.finalPassing === results.total ? '#237A4B' : '#8A641C' }}>
            {results.finalPassing === results.total ? '✓ All chains passing' : '⚠ Partial convergence'}
          </b>
          <div style={{ marginTop: 4, color: '#555' }}>
            {results.tested} tested → {results.failed} failed → {results.healed} healed → {results.finalPassing}/{results.total} passing on retest
          </div>
        </div>
      )}
    </div>
  );
}

function StatusDot({ status, label }) {
  const colors = {
    pending: '#444',
    running: '#E7C86E',
    pass: '#237A4B',
    fail: '#C63D34',
    done: '#2563eb',
    error: '#C63D34',
  };
  const icons = {
    pass: <CheckCircle2 size={12} />,
    fail: <XCircle size={12} />,
    running: <Loader2 size={12} className="animate-spin" />,
    done: <Wrench size={12} />,
    error: <XCircle size={12} />,
    pending: <span style={{ fontSize: 9, color: '#666' }}>{label}</span>,
  };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 16, height: 16, color: colors[status] || '#666',
    }}>
      {icons[status] || icons.pending}
    </span>
  );
}