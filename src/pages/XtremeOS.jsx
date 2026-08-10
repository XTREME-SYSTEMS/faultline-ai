import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import XtremeOSRightPanel from '@/components/fl/XtremeOSRightPanel';
import {
  Activity, Package, Globe, Shield, Zap, Cpu, Loader2, X, Copy, ListChecks, Images, Building2, PenTool, Search
} from 'lucide-react';
import PwaInstallButton from '@/components/PwaInstallButton';

export default function XtremeOS() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [hardening, setHardening] = useState(false);
  const [hardenResult, setHardenResult] = useState(null);
  const [hardenError, setHardenError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [products, projects, receipts, performers] = await Promise.all([
          base44.entities.ToolProduct.list('-created_date', 500).catch(() => []),
          base44.entities.LaunchProject.list('-created_date', 100).catch(() => []),
          base44.entities.Receipt.list('-created_date', 20).catch(() => []),
          base44.entities.TopPerformer.list('-created_date', 20).catch(() => []),
        ]);

        const at100 = projects.filter(p => (p.parity_score || 0) >= 100).length;
        const below100 = projects.filter(p => (p.parity_score || 0) > 0 && (p.parity_score || 0) < 100).length;
        const validating = projects.filter(p => p.status === 'validating' || p.status === 'generating').length;

        const byCategory = {};
        products.forEach(p => { byCategory[p.category] = (byCategory[p.category] || 0) + 1; });

        const autonomousReceipts = receipts.filter(r =>
          ['forensic_audit', 'marketplace_stocker', 'autonomous_clone', 'billing', 'onboarding'].includes(r.system)
        );

        setMetrics({
          totalProducts: products.length,
          byCategory,
          totalClones: projects.length,
          at100, below100, validating,
          healthPct: projects.length ? Math.round((at100 / projects.length) * 100) : 0,
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
          const at100 = projects.filter(p => (p.parity_score || 0) >= 100).length;
          setMetrics(m => ({ ...m, totalClones: projects.length, at100, healthPct: projects.length ? Math.round((at100 / projects.length) * 100) : 0 }));
        })();
      }, 2000);
    } catch (e) {
      setHardenError(e.message || 'Auto-harden failed');
    } finally {
      setHardening(false);
    }
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>Loading Xtreme Clone System…</div>;

  const metricCards = [
    { label: 'Marketplace Products', value: metrics.totalProducts, icon: Package, color: '#C89B3C', sub: `${metrics.byCategory.ai_tool || 0} tools · ${metrics.byCategory.web_pack || 0} web · ${metrics.byCategory.app_pack || 0} apps` },
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
      <div className="portal-page xtremeos-content" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240, transition: 'margin .3s' }}>
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
        </div>
      </div>

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

      {/* Quick Links — primary navigation hubs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10, marginBottom: 13 }}>
        {[
          { label: 'Niche Search', path: '/app/niche-websites', icon: Search, desc: 'Search & queue sites', bg: '#C89B3C' },
          { label: 'Clone Queue', path: '/app/clone-queue', icon: ListChecks, desc: 'Clone pipeline', bg: '#2563eb' },
          { label: 'Clone Studio', path: '/app/clone-studio', icon: Copy, desc: 'Build & customize', bg: '#0B0B0D' },
          { label: 'Clone Gallery', path: '/app/clone-gallery', icon: Images, desc: 'Browse clones', bg: '#7c3aed' },
          { label: 'Business Hub', path: '/app/business', icon: Building2, desc: 'Form DBAs & LLCs', bg: '#0B0B0D' },
          { label: 'Website Gen', path: '/app/website-generator', icon: Globe, desc: 'Generate websites', bg: '#059669' },
          { label: 'App Gen', path: '/app/app-generator', icon: Cpu, desc: 'Generate apps', bg: '#dc2626' },
          { label: 'Brand Gen', path: '/app/brand-generator', icon: PenTool, desc: 'Generate brands', bg: '#7c3aed' },
        ].map(l => (
          <Link key={l.path} to={l.path} style={{
            background: l.bg, border: 0, borderRadius: 7, padding: 11,
            display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#fff',
            transition: 'transform .15s, box-shadow .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 5px 12px rgba(0,0,0,.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <span style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,.18)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <l.icon size={17} style={{ color: '#fff' }} />
            </span>
            <div style={{ minWidth: 0 }}>
              <b style={{ fontSize: 12.5, display: 'block', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.label}</b>
              <small style={{ fontSize: 10, color: 'rgba(255,255,255,.72)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{l.desc}</small>
            </div>
          </Link>
        ))}
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

      </div>
    </>
  );
}