import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import XtremeOSRightPanel from '@/components/fl/XtremeOSRightPanel';
import {
  Activity, Package, Globe, Shield, Zap, Cpu, Loader2, X, Copy, ListChecks, Images, Building2, PenTool, Search, Layers
} from 'lucide-react';
import PwaInstallButton from '@/components/PwaInstallButton';
import CloneList from '@/components/fl/CloneList';
import FailedClonesCard from '@/components/fl/FailedClonesCard';
import CloneHealthCard from '@/components/fl/CloneHealthCard';
import XtremeAIChat from '@/components/fl/XtremeAIChat';

export default function XtremeOS() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [hardening, setHardening] = useState(false);
  const [hardenResult, setHardenResult] = useState(null);
  const [hardenError, setHardenError] = useState('');
  const [forcing, setForcing] = useState(false);
  const [forceResult, setForceResult] = useState(null);
  const [forceError, setForceError] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [finishResult, setFinishResult] = useState(null);
  const [finishError, setFinishError] = useState('');
  const [chatExpanded, setChatExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [products, projects, receipts, performers] = await Promise.all([
          base44.entities.ToolProduct.list('-created_date', 500).catch(() => []),
          base44.entities.LaunchProject.list('-created_date', 100).catch(() => []),
          base44.entities.Receipt.list('-created_date', 20).catch(() => []),
          base44.entities.TopPerformer.list('-created_date', 20).catch(() => []),
        ]);

        // Only count actually-deployed clones (have a Vercel URL) in the health
        // percentage — ghost/empty tracker projects and in-progress builds
        // shouldn't drag down the health score.
        const gallery = projects.filter(p => p.vercel_deployment_url || p.metadata?.vercel_deployment_url);
        const at100 = gallery.filter(p => (p.parity_score || 0) >= 100).length;
        const below100 = gallery.filter(p => (p.parity_score || 0) > 0 && (p.parity_score || 0) < 100).length;
        const validating = projects.filter(p => p.status === 'validating' || p.status === 'generating').length;

        const byCategory = {};
        products.forEach(p => { byCategory[p.category] = (byCategory[p.category] || 0) + 1; });

        const autonomousReceipts = receipts.filter(r =>
          ['forensic_audit', 'marketplace_stocker', 'autonomous_clone', 'billing', 'onboarding'].includes(r.system)
        );

        setMetrics({
          totalProducts: products.length,
          byCategory,
          totalClones: gallery.length,
          at100, below100, validating,
          healthPct: gallery.length ? Math.round((at100 / gallery.length) * 100) : 0,
          discoveredPerformers: performers.length,
          recentActions: autonomousReceipts.length,
        });
      } catch (e) {
        console.error('XtremeOS load failed:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function runAutoHarden() {
    setHardening(true);
    setHardenError('');
    setHardenResult(null);
    try {
      const res = await base44.functions.invoke('forensicAuditAndHarden', { max_iterations: 1, heal_limit: 1 });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setHardenResult(d);
      // Reload metrics in-place (no full page reload)
      setTimeout(() => {
        (async () => {
          const projects = await base44.entities.LaunchProject.list('-created_date', 100).catch(() => []);
          const gallery = projects.filter(p => p.vercel_deployment_url || p.metadata?.vercel_deployment_url);
          const at100 = gallery.filter(p => (p.parity_score || 0) >= 100).length;
          setMetrics(m => ({ ...m, totalClones: gallery.length, at100, healthPct: gallery.length ? Math.round((at100 / gallery.length) * 100) : 0 }));
        })();
      }, 2000);
    } catch (e) {
      setHardenError(e.message || 'Auto-harden failed');
    } finally {
      setHardening(false);
    }
  }

  async function runFinishStalled() {
    setFinishing(true);
    setFinishError('');
    setFinishResult(null);
    try {
      const res = await base44.functions.invoke('finishStalledClones', { heal_batch: 3, max_iterations: 3 });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setFinishResult(d);
      setTimeout(() => {
        (async () => {
          const projects = await base44.entities.LaunchProject.list('-created_date', 200).catch(() => []);
          const gallery = projects.filter(p => p.vercel_deployment_url || p.metadata?.vercel_deployment_url);
          const at100 = gallery.filter(p => (p.parity_score || 0) >= 100).length;
          setMetrics(m => ({ ...m, totalClones: gallery.length, at100, healthPct: gallery.length ? Math.round((at100 / gallery.length) * 100) : 0 }));
        })();
      }, 2000);
    } catch (e) {
      setFinishError(e.message || 'Finish-stalled failed');
    } finally {
      setFinishing(false);
    }
  }

  async function runForceTo100() {
    setForcing(true);
    setForceError('');
    setForceResult(null);
    try {
      const res = await base44.functions.invoke('forceClonesTo100', { rebuild_limit: 2, heal_limit: 5, quarantine_limit: 20 });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setForceResult(d);
      setTimeout(() => {
        (async () => {
          const projects = await base44.entities.LaunchProject.list('-created_date', 100).catch(() => []);
          const gallery = projects.filter(p => p.vercel_deployment_url || p.metadata?.vercel_deployment_url);
          const at100 = gallery.filter(p => (p.parity_score || 0) >= 100).length;
          setMetrics(m => ({ ...m, totalClones: gallery.length, at100, healthPct: gallery.length ? Math.round((at100 / gallery.length) * 100) : 0 }));
        })();
      }, 2000);
    } catch (e) {
      setForceError(e.message || 'Force-to-100 failed');
    } finally {
      setForcing(false);
    }
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>Loading Xtreme Clone System…</div>;

  const metricCards = [
    { label: 'Clone Health', value: `${metrics.healthPct}%`, icon: Shield, color: '#237A4B', sub: `${metrics.at100} at 100/100 of ${metrics.totalClones}` },
    { label: 'Active Builds', value: metrics.validating, icon: Cpu, color: '#B88214', sub: 'Currently generating/validating' },
    { label: 'Discovered Sites', value: metrics.discoveredPerformers, icon: Globe, color: '#2563eb', sub: 'Waiting to be cloned' },
    { label: 'Autonomous Actions', value: metrics.recentActions, icon: Zap, color: '#7c3aed', sub: 'Recent system operations' },
    { label: 'System Status', value: 'ONLINE', icon: Activity, color: '#237A4B', sub: 'All workflows running' },
  ];

  return (
    <>
      <XtremeOSSidebar />
      <XtremeOSRightPanel />
      <XtremeAIChat expanded={chatExpanded} onToggle={setChatExpanded} />
      <div className="portal-page xtremeos-content" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240, marginRight: chatExpanded ? 420 : 0, transition: 'margin .3s' }}>
      {/* XtremeOS Header */}
      <div style={{
        background: 'radial-gradient(circle at 82% 40%, #C89B3C45, transparent 25%), #0a0a0a',
        color: '#fff', padding: '36px 28px', margin: '-28px -28px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <p style={{ color: '#E7C86E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>xtremeclonesystems.com</p>
          <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 42, margin: '8px 0 4px', letterSpacing: '-.03em' }}>Xtreme<span style={{ color: '#E7C86E' }}>Clone</span> System</h1>
          <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>Autonomous site cloning, forensic auditing, and one-click business formation</p>
          <div style={{ marginTop: 14 }}>
            <PwaInstallButton />
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 110, height: 110, borderRadius: '50%', border: '8px solid #C89B3C', display: 'grid', placeItems: 'center', margin: '0 auto' }}>
            <span style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 36 }}>{metrics.healthPct}</span>
          </div>
          <small style={{ color: '#E7C86E', textTransform: 'uppercase', letterSpacing: '.12em', fontSize: 10 }}>System Health</small>
          <button
            onClick={runAutoHarden}
            disabled={hardening}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '12px 22px',
              background: hardening ? '#333' : 'linear-gradient(135deg, #E7C86E, #C89B3C)',
              color: '#111', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13,
              cursor: hardening ? 'wait' : 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {hardening ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            {hardening ? 'Auditing & Hardening...' : 'Auto Audit · Analyze · Fix · Heal · Harden'}
          </button>
          <button
            onClick={runForceTo100}
            disabled={forcing}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '10px 18px',
              background: forcing ? '#333' : '#0a0a0a',
              color: forcing ? '#888' : '#E7C86E', border: '1px solid #C89B3C', borderRadius: 8,
              fontWeight: 700, fontSize: 12, cursor: forcing ? 'wait' : 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {forcing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {forcing ? 'Forcing to 100...' : 'Force All to 100'}
          </button>
          <button
            onClick={runFinishStalled}
            disabled={finishing}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '10px 18px',
              background: finishing ? '#333' : '#0a0a0a',
              color: finishing ? '#888' : '#237A4B', border: '1px solid #237A4B', borderRadius: 8,
              fontWeight: 700, fontSize: 12, cursor: finishing ? 'wait' : 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {finishing ? <Loader2 size={14} className="animate-spin" /> : <ListChecks size={14} />}
            {finishing ? 'Finishing stalled...' : 'Finish Stalled'}
          </button>
        </div>
      </div>

      {/* Finish-Stalled Results */}
      {(finishResult || finishError) && (
        <div style={{
          marginBottom: 13, padding: 20, borderRadius: 8,
          background: finishError ? '#f5d8d5' : '#e8f5ec',
          border: `1px solid ${finishError ? '#C63D34' : '#237A4B'}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <b style={{ fontSize: 15, color: finishError ? '#a52d23' : '#237A4B' }}>
              {finishError ? 'Finish-Stalled Failed' : `Finish-Stalled: ${finishResult.health_pct}% Health`}
            </b>
            <button onClick={() => { setFinishResult(null); setFinishError(''); }} style={{ background: 'none', border: 0, cursor: 'pointer', color: '#999' }}>
              <X size={16} />
            </button>
          </div>
          {finishError ? (
            <p style={{ fontSize: 13, color: '#a52d23', margin: 0 }}>{finishError}</p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13 }}>
                <span style={{ color: '#C63D34' }}><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22 }}>{finishResult.duplicates_removed}</b> duplicates removed</span>
                <span><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22 }}>{finishResult.stalled_found}</b> stalled found</span>
                <span style={{ color: '#237A4B' }}><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22 }}>{finishResult.healed}</b> finished</span>
                {finishResult.still_failing > 0 && <span style={{ color: '#B88214' }}><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22 }}>{finishResult.still_failing}</b> still failing</span>}
                {finishResult.still_running > 0 && <span style={{ color: '#2563eb' }}><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22 }}>{finishResult.still_running}</b> running</span>}
              </div>
              {finishResult.duplicates_removed > 0 && (
                <p style={{ fontSize: 11, color: '#237A4B', marginTop: 10, marginBottom: 0 }}>
                  {finishResult.duplicates_removed} duplicate clones removed — kept the best-scoring clone per target URL.
                </p>
              )}
              {finishResult.stalled_found > finishResult.resumed && (
                <p style={{ fontSize: 11, color: '#B88214', marginTop: 6, marginBottom: 0 }}>
                  {finishResult.stalled_found - finishResult.resumed} clones waiting for the next batch — click again to resume more.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Force-to-100 Results */}
      {(forceResult || forceError) && (
        <div style={{
          marginBottom: 13, padding: 20, borderRadius: 8,
          background: forceError ? '#f5d8d5' : '#1a0d00',
          border: `1px solid ${forceError ? '#C63D34' : '#C89B3C'}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <b style={{ fontSize: 15, color: forceError ? '#a52d23' : '#E7C86E' }}>
              {forceError ? 'Force-to-100 Failed' : `Force-to-100: ${forceResult.health_pct}% Health`}
            </b>
            <button onClick={() => { setForceResult(null); setForceError(''); }} style={{ background: 'none', border: 0, cursor: 'pointer', color: '#999' }}>
              <X size={16} />
            </button>
          </div>
          {forceError ? (
            <p style={{ fontSize: 13, color: '#a52d23', margin: 0 }}>{forceError}</p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13, color: '#ddd' }}>
                <span><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22, color: '#fff' }}>{forceResult.at_100}</b> at 100/100</span>
                <span style={{ color: '#237A4B' }}><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22 }}>{forceResult.healed}</b> healed</span>
                <span style={{ color: '#E7C86E' }}><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22 }}>{forceResult.rebuilt}</b> rebuilt</span>
                <span style={{ color: '#B88214' }}><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22 }}>{forceResult.quarantined}</b> quarantined</span>
                <span style={{ color: '#888' }}><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22 }}>{forceResult.ghosts_removed}</b> ghosts removed</span>
                {forceResult.still_failing > 0 && <span style={{ color: '#C63D34' }}><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22 }}>{forceResult.still_failing}</b> still failing</span>}
                {forceResult.still_running > 0 && <span style={{ color: '#2563eb' }}><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22 }}>{forceResult.still_running}</b> running</span>}
              </div>
              {forceResult.quarantined > 0 && (
                <p style={{ fontSize: 11, color: '#B88214', marginTop: 10, marginBottom: 0 }}>
                  {forceResult.quarantined} clones quarantined — their target sites are dead/parked and can't be matched.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Auto-Harden Results */}
      {(hardenResult || hardenError) && (
        <div style={{
          marginBottom: 13, padding: 20, borderRadius: 8,
          background: hardenError ? '#f5d8d5' : '#e8f5ec',
          border: `1px solid ${hardenError ? '#C63D34' : '#237A4B'}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <b style={{ fontSize: 15, color: hardenError ? '#a52d23' : '#237A4B' }}>
              {hardenError ? 'Auto-Harden Failed' : 'Auto-Harden Complete'}
            </b>
            <button onClick={() => { setHardenResult(null); setHardenError(''); }} style={{ background: 'none', border: 0, cursor: 'pointer', color: '#999' }}>
              <X size={16} />
            </button>
          </div>
          {hardenError ? (
            <p style={{ fontSize: 13, color: '#a52d23', margin: 0 }}>{hardenError}</p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
                <span><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22 }}>{hardenResult.total_audited}</b> audited</span>
                <span style={{ color: '#237A4B' }}><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22 }}>{hardenResult.all_clear}</b> all clear</span>
                <span style={{ color: '#237A4B' }}><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22 }}>{hardenResult.hardened}</b> hardened</span>
                <span style={{ color: '#B88214' }}><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22 }}>{hardenResult.still_failing}</b> still failing</span>
              </div>
              {hardenResult.still_failing > 0 ? (
                <p style={{ fontSize: 12, color: '#B88214', marginTop: 10, marginBottom: 0 }}>
                  {hardenResult.still_failing} sites still need healing. Click the button again to heal the next batch.
                </p>
              ) : (
                <p style={{ fontSize: 11, color: '#237A4B', marginTop: 10, marginBottom: 0 }}>All audited sites are at 100/100.</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Getting Started — step-by-step workflow */}
      <div style={{ marginBottom: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: '#C89B3C' }}>Getting Started</span>
          <span style={{ fontSize: 12, color: '#999' }}>— Follow these steps in order</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { step: 1, label: 'Niche Search', path: '/app/niche-websites', icon: Search, desc: 'Find top-ranking sites in your industry and add them to the clone queue', bg: '#C89B3C' },
            { step: 2, label: 'Clone Queue', path: '/app/clone-queue', icon: ListChecks, desc: 'Monitor your queued sites as they move through the cloning pipeline', bg: '#2563eb' },
            { step: 3, label: 'Clone Studio', path: '/app/clone-studio', icon: Copy, desc: 'Customize and refine your cloned sites with branding and content', bg: '#0B0B0D' },
            { step: 4, label: 'Clone Gallery', path: '/app/clone-gallery', icon: Images, desc: 'Browse all finished clones with live links and summaries', bg: '#7c3aed' },
            { step: 5, label: 'Business Hub', path: '/app/business', icon: Building2, desc: 'Form a DBA or LLC to legitimize your new cloned business', bg: '#0B0B0D' },
            { step: 6, label: 'Build Studio', path: '/app/build-studio', icon: Layers, desc: 'Build custom apps, websites, and tools to round out your operation', bg: '#059669' },
          ].map(l => (
            <Link key={l.path} to={l.path} style={{
              background: l.bg, border: 0, borderRadius: 10, padding: '16px 14px',
              display: 'flex', alignItems: 'flex-start', gap: 12, textDecoration: 'none', color: '#fff',
              transition: 'transform .15s, box-shadow .15s', position: 'relative',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,.25)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'grid', placeItems: 'center', flexShrink: 0, fontWeight: 700, fontSize: 13, color: '#fff' }}>
                {l.step}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <l.icon size={14} style={{ color: 'rgba(255,255,255,.7)', flexShrink: 0 }} />
                  <b style={{ fontSize: 13, color: '#fff' }}>{l.label}</b>
                </div>
                <small style={{ fontSize: 11, color: 'rgba(255,255,255,.68)', lineHeight: 1.45, display: 'block' }}>{l.desc}</small>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="metrics" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {metricCards.map((m, i) => (
          <article key={i} style={{ minHeight: 128, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <span style={{ position: 'absolute', right: 14, top: 14, color: m.color }}>
              <m.icon size={22} />
            </span>
            <small style={{ fontSize: 11, color: '#777', textTransform: 'uppercase', letterSpacing: '.08em' }}>{m.label}</small>
            <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 30, margin: '10px 0' }}>{m.value}</b>
            <span style={{ fontSize: 11, color: '#999' }}>{m.sub}</span>
          </article>
        ))}
      </div>

      {/* Clone Health Guardian — 100/100 vs. errors with self-reflection heal */}
      <div style={{ marginTop: 13 }}>
        <CloneHealthCard />
      </div>

      {/* Failed clones — auto-retried 5× then moved here */}
      <div style={{ marginTop: 13 }}>
        <FailedClonesCard />
      </div>

      {/* Categorized clone list with search */}
      <div style={{ marginTop: 13 }}>
        <CloneList />
      </div>

      </div>
    </>
  );
}