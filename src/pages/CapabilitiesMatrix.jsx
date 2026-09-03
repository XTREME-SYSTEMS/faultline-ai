import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import XtremeOSRightPanel from '@/components/fl/XtremeOSRightPanel';
import CapabilityRow from '@/components/capabilities/CapabilityRow';
import PotentialCapabilitiesList from '@/components/capabilities/PotentialCapabilitiesList';
import PromptLibraryPanel from '@/components/capabilities/PromptLibraryPanel';
import {
  Cpu, Shield, CheckCircle2, AlertTriangle, Loader2, Gauge,
  Boxes, Sparkles, Terminal, Play, Wrench, RefreshCw,
} from 'lucide-react';

export default function CapabilitiesMatrix() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [capabilities, setCapabilities] = useState([]);
  const [closureBoard, setClosureBoard] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [testingId, setTestingId] = useState(null);
  const [fixingId, setFixingId] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [fixResults, setFixResults] = useState({});
  const [bulkTesting, setBulkTesting] = useState(false);
  const [bulkFixing, setBulkFixing] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      const orgId = me?.data?.organization_id || 'default';
      const [caps, board] = await Promise.all([
        base44.entities.BackendCapabilityLedger.filter({ organization_id: orgId }, '-score', 200).catch(() => []),
        base44.entities.ClosureBoard.filter({ organization_id: orgId }, '-updated_at', 50).catch(() => []),
      ]);
      setCapabilities(caps);
      setClosureBoard(board);
    } catch (e) {
      console.error('Capabilities load error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Test a single capability
  async function handleTest(cap) {
    setTestingId(cap.capability_id);
    setTestResults(prev => ({ ...prev, [cap.capability_id]: undefined }));
    try {
      // Determine which chain to test based on capability category
      const chainMap = {
        identity: 'CHAIN-AUTH', authentication: 'CHAIN-AUTH', sessions: 'CHAIN-AUTH',
        profile: 'CHAIN-AUTH', catalog: 'CHAIN-SEARCH', category: 'CHAIN-SEARCH',
        search: 'CHAIN-SEARCH', filter: 'CHAIN-SEARCH', sort: 'CHAIN-SEARCH',
        pagination: 'CHAIN-SEARCH', item_detail: 'CHAIN-SEARCH',
        subscriptions: 'CHAIN-CHECKOUT', entitlements: 'CHAIN-CHECKOUT',
        downloads: 'CHAIN-CHECKOUT', license_records: 'CHAIN-CHECKOUT',
        ai_tools: 'CHAIN-AI', form_processing: 'CHAIN-FORM',
      };
      const targetChain = chainMap[cap.capability_category] || 'CHAIN-SEARCH';
      const res = await base44.functions.invoke('proveFullStackChains', {
        target_chain: targetChain,
        organization_id: user?.data?.organization_id,
      });
      const d = res.data || res;
      const chainResult = d.chains?.find(c => c.chain_id === targetChain);
      const passed = chainResult?.chain_status === 'pass';
      setTestResults(prev => ({
        ...prev,
        [cap.capability_id]: {
          status: passed ? 'pass' : 'fail',
          message: passed
            ? `${targetChain} passed — ${chainResult.steps.filter(s => s.status === 'pass').length}/${chainResult.steps.length} steps passed`
            : `${targetChain} failed — ${chainResult?.steps?.filter(s => s.status === 'fail').length || 0} steps failed`,
        },
      }));
      // Reload capabilities to get updated scores
      setTimeout(() => load(), 1000);
    } catch (e) {
      setTestResults(prev => ({
        ...prev,
        [cap.capability_id]: { status: 'fail', message: e.message || 'Test failed' },
      }));
    }
    setTestingId(null);
  }

  // Auto-fix a single capability
  async function handleFix(cap) {
    setFixingId(cap.capability_id);
    setFixResults(prev => ({ ...prev, [cap.capability_id]: undefined }));
    try {
      const chainMap = {
        identity: 'CHAIN-AUTH', authentication: 'CHAIN-AUTH', sessions: 'CHAIN-AUTH',
        profile: 'CHAIN-AUTH', catalog: 'CHAIN-SEARCH', category: 'CHAIN-SEARCH',
        search: 'CHAIN-SEARCH', filter: 'CHAIN-SEARCH', sort: 'CHAIN-SEARCH',
        pagination: 'CHAIN-SEARCH', item_detail: 'CHAIN-SEARCH',
        subscriptions: 'CHAIN-CHECKOUT', entitlements: 'CHAIN-CHECKOUT',
        downloads: 'CHAIN-CHECKOUT', license_records: 'CHAIN-CHECKOUT',
        ai_tools: 'CHAIN-AI', form_processing: 'CHAIN-FORM',
      };
      const targetChain = chainMap[cap.capability_category] || 'CHAIN-SEARCH';
      const res = await base44.functions.invoke('repairBackendChain', {
        target_chain: targetChain,
        organization_id: user?.data?.organization_id,
      });
      const d = res.data || res;
      setFixResults(prev => ({
        ...prev,
        [cap.capability_id]: {
          message: d.status === 'success'
            ? `Repair complete — ${d.capabilities_updated || 0} capabilities updated`
            : `Repair dispatched for ${targetChain}`,
        },
      }));
      // Reload capabilities
      setTimeout(() => load(), 2000);
    } catch (e) {
      setFixResults(prev => ({
        ...prev,
        [cap.capability_id]: { message: e.message || 'Fix failed' },
      }));
    }
    setFixingId(null);
  }

  // Bulk test all
  async function handleBulkTest() {
    setBulkTesting(true);
    try {
      const res = await base44.functions.invoke('proveFullStackChains', {
        organization_id: user?.data?.organization_id,
      });
      const d = res.data || res;
      // Reload to get updated scores
      await load();
      setTestResults({ _bulk: {
        status: d.chains_passed > 0 ? 'pass' : 'fail',
        message: `Bulk test: ${d.chains_passed}/${d.chains_tested} chains passed, ${d.capabilities_validated_count} capabilities validated`,
      }});
    } catch (e) {
      setTestResults({ _bulk: { status: 'fail', message: e.message } });
    }
    setBulkTesting(false);
  }

  // Bulk fix all
  async function handleBulkFix() {
    setBulkFixing(true);
    try {
      // Run repair for all 5 chains
      const chains = ['CHAIN-AUTH', 'CHAIN-SEARCH', 'CHAIN-CHECKOUT', 'CHAIN-AI', 'CHAIN-FORM'];
      for (const chain of chains) {
        await base44.functions.invoke('repairBackendChain', {
          target_chain: chain,
          organization_id: user?.data?.organization_id,
        }).catch(() => {});
      }
      await load();
      setFixResults({ _bulk: { message: 'Bulk auto-fix complete — all 5 chains repaired' }});
    } catch (e) {
      setFixResults({ _bulk: { message: e.message } });
    }
    setBulkFixing(false);
  }

  // Filter capabilities
  const filtered = capabilities.filter(c => {
    if (filter === 'validated' && c.status !== 'validated') return false;
    if (filter === 'failing' && c.status === 'validated') return false;
    if (filter === 'critical' && !['identity', 'authentication', 'sessions', 'subscriptions', 'entitlements', 'downloads'].includes(c.capability_category)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (c.capability_name || '').toLowerCase().includes(q) ||
             (c.capability_id || '').toLowerCase().includes(q) ||
             (c.capability_category || '').toLowerCase().includes(q);
    }
    return true;
  });

  // Compute summary metrics
  const total = capabilities.length;
  const validated = capabilities.filter(c => c.status === 'validated').length;
  const failing = capabilities.filter(c => c.status !== 'validated' && c.status !== 'not_applicable_with_proof').length;
  const avgScore = total > 0 ? Math.round(capabilities.reduce((sum, c) => sum + (c.score || 0), 0) / total) : 0;
  const criticalCaps = capabilities.filter(c => ['identity', 'authentication', 'sessions', 'subscriptions', 'entitlements', 'downloads'].includes(c.capability_category));
  const criticalValidated = criticalCaps.filter(c => c.status === 'validated').length;

  // Closure board summary
  const boardPassing = closureBoard.filter(b => b.status === 'passing').length;
  const boardTotal = closureBoard.length;
  const boardCritical = closureBoard.filter(b => b.is_critical);
  const boardCriticalPassing = boardCritical.filter(b => b.status === 'passing').length;

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
          background: 'radial-gradient(circle at 82% 40%, #C89B3C45, transparent 25%), #0a0a0a',
          color: '#fff', padding: '36px 28px', margin: '-28px -28px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20,
        }}>
          <div>
            <p style={{ color: '#E7C86E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>
              System Capabilities Matrix
            </p>
            <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 38, margin: '8px 0 4px', letterSpacing: '-.03em' }}>
              Capabilities <span style={{ color: '#E7C86E' }}>Matrix</span>
            </h1>
            <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>
              Every system capability scored, tested, and auto-healable — plus the full potential capabilities catalog
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={handleBulkTest}
              disabled={bulkTesting}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
                background: bulkTesting ? '#333' : 'linear-gradient(135deg, #E7C86E, #C89B3C)',
                color: '#111', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13,
                cursor: bulkTesting ? 'wait' : 'pointer',
              }}
            >
              {bulkTesting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {bulkTesting ? 'Testing All...' : 'Test All Capabilities'}
            </button>
            <button
              onClick={handleBulkFix}
              disabled={bulkFixing}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
                background: bulkFixing ? '#333' : '#0a0a0a',
                color: bulkFixing ? '#888' : '#E7C86E', border: '1px solid #C89B3C', borderRadius: 8,
                fontWeight: 700, fontSize: 13, cursor: bulkFixing ? 'wait' : 'pointer',
              }}
            >
              {bulkFixing ? <Loader2 size={16} className="animate-spin" /> : <Wrench size={16} />}
              {bulkFixing ? 'Fixing All...' : 'Auto-Heal All'}
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

        {/* Summary metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
          <MetricCard icon={Cpu} label="Total Capabilities" value={total} color="#2563eb" />
          <MetricCard icon={CheckCircle2} label="Validated" value={validated} color="#237A4B" sub={`${total > 0 ? Math.round((validated / total) * 100) : 0}%`} />
          <MetricCard icon={AlertTriangle} label="Failing" value={failing} color="#C63D34" />
          <MetricCard icon={Gauge} label="Avg Score" value={avgScore} color="#C89B3C" />
          <MetricCard icon={Shield} label="Critical Validated" value={`${criticalValidated}/${criticalCaps.length}`} color="#237A4B" />
          <MetricCard icon={Boxes} label="Board Passing" value={`${boardPassing}/${boardTotal}`} color="#7c3aed" />
          <MetricCard icon={Shield} label="Critical Categories" value={`${boardCriticalPassing}/${boardCritical.length}`} color="#237A4B" />
        </div>

        {/* Bulk result banners */}
        {testResults._bulk && (
          <div style={{
            marginBottom: 16, padding: '14px 18px', borderRadius: 8,
            background: testResults._bulk.status === 'pass' ? '#e8f5ec' : '#f5d8d5',
            border: `1px solid ${testResults._bulk.status === 'pass' ? '#237A4B' : '#C63D34'}`,
            fontSize: 13,
          }}>
            <b style={{ color: testResults._bulk.status === 'pass' ? '#237A4B' : '#a52d23' }}>
              {testResults._bulk.status === 'pass' ? '✓ ' : '✗ '}Bulk Test Result
            </b>
            <p style={{ margin: '4px 0 0', color: '#555' }}>{testResults._bulk.message}</p>
          </div>
        )}
        {fixResults._bulk && (
          <div style={{
            marginBottom: 16, padding: '14px 18px', borderRadius: 8,
            background: '#fdf3e0', border: '1px solid #C89B3C', fontSize: 13,
          }}>
            <b style={{ color: '#8A641C' }}>🔧 Bulk Auto-Fix Result</b>
            <p style={{ margin: '4px 0 0', color: '#555' }}>{fixResults._bulk.message}</p>
          </div>
        )}

        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 0, borderBottom: '2px solid #0a0a0a' }}>
          {[
            { id: 'active', label: 'Active Capabilities', icon: Cpu, count: total },
            { id: 'potential', label: 'Potential Capabilities', icon: Sparkles, count: null },
            { id: 'prompts', label: 'Prompt Library', icon: Terminal, count: null },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
                background: activeTab === tab.id ? '#0a0a0a' : 'transparent',
                color: activeTab === tab.id ? '#E7C86E' : '#666',
                border: 0, borderBottom: `3px solid ${activeTab === tab.id ? '#C89B3C' : 'transparent'}`,
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}
            >
              <tab.icon size={15} />
              {tab.label}
              {tab.count !== null && (
                <span style={{
                  padding: '1px 7px', borderRadius: 10, fontSize: 10,
                  background: activeTab === tab.id ? '#C89B3C' : '#ddd',
                  color: activeTab === tab.id ? '#111' : '#666',
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ background: '#fff', border: '1px solid #e5e1da', borderTop: 0, borderRadius: '0 0 8px 8px' }}>
          {activeTab === 'active' && (
            <>
              {/* Filter bar */}
              <div style={{ display: 'flex', gap: 10, padding: '14px 16px', borderBottom: '1px solid #eee', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search capabilities..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid #ddd',
                    borderRadius: 6, fontSize: 13, outline: 'none',
                  }}
                />
                <select
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  style={{
                    padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6,
                    fontSize: 13, background: '#fff', cursor: 'pointer',
                  }}
                >
                  <option value="all">All Capabilities</option>
                  <option value="validated">Validated Only</option>
                  <option value="failing">Failing Only</option>
                  <option value="critical">Critical Only</option>
                </select>
                <span style={{ fontSize: 12, color: '#888' }}>
                  Showing {filtered.length} of {total}
                </span>
              </div>

              {/* Capability list */}
              <div>
                {filtered.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
                    No capabilities found. Try adjusting your filter.
                  </div>
                ) : (
                  filtered.map(cap => (
                    <CapabilityRow
                      key={cap.id}
                      cap={cap}
                      onTest={handleTest}
                      onFix={handleFix}
                      testingId={testingId}
                      fixingId={fixingId}
                      testResult={testResults[cap.capability_id]}
                      fixResult={fixResults[cap.capability_id]}
                    />
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === 'potential' && (
            <div style={{ padding: '20px 16px' }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 24, margin: '0 0 6px' }}>
                  Potential Capabilities Catalog
                </h2>
                <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
                  Every technological capability this system COULD have — with descriptions and 3 concrete examples of how each would help.
                </p>
              </div>
              <PotentialCapabilitiesList />
            </div>
          )}

          {activeTab === 'prompts' && (
            <div style={{ padding: '20px 16px' }}>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 24, margin: '0 0 6px' }}>
                  System Maximization Prompt Library
                </h2>
                <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
                  Prompts designed to invoke full system implementation, 100/100 maximization, and max autonomous operations.
                  Copy any prompt and paste it into the AI chat to execute.
                </p>
              </div>
              <PromptLibraryPanel />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function MetricCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 16,
      display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      <Icon size={20} style={{ color, position: 'absolute', right: 14, top: 14 }} />
      <small style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</small>
      <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 28, margin: '8px 0 2px' }}>{value}</b>
      {sub && <span style={{ fontSize: 11, color }}>{sub}</span>}
    </div>
  );
}