import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import XtremeOSRightPanel from '@/components/fl/XtremeOSRightPanel';
import {
  Activity, Package, Globe, Shield, TrendingUp, Zap, CheckCircle2,
  AlertCircle, Clock, Cpu, DollarSign, Layers
} from 'lucide-react';

export default function XtremeOS() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [recentActions, setRecentActions] = useState([]);
  const [clones, setClones] = useState([]);

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
        setRecentActions(autonomousReceipts.slice(0, 12));
        setClones(projects.filter(p => p.parity_score > 0).slice(0, 8));
      } catch (e) {
        console.error('XtremeOS load failed:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>Loading XtremeOS…</div>;

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
          <p style={{ color: '#E7C86E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>Owner Dashboard</p>
          <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 42, margin: '8px 0 4px', letterSpacing: '-.03em' }}>Xtreme<span style={{ color: '#E7C86E' }}>OS</span></h1>
          <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>The operating system for all AI systems — autonomous, self-healing, end-to-end</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 110, height: 110, borderRadius: '50%', border: '8px solid #C89B3C', display: 'grid', placeItems: 'center', margin: '0 auto' }}>
            <span style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 36 }}>{metrics.healthPct}</span>
          </div>
          <small style={{ color: '#E7C86E', textTransform: 'uppercase', letterSpacing: '.12em', fontSize: 10 }}>System Health</small>
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

      {/* Two-column: Clone Health + Recent Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, marginTop: 13 }}>
        {/* Clone Health */}
        <article style={{ background: '#fff', border: '1px solid #ddd', padding: 20 }}>
          <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22, margin: '0 0 16px' }}>Clone Health Monitor</h3>
          {clones.length === 0 ? (
            <p style={{ color: '#999', fontSize: 13 }}>No active clones yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {clones.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <div>
                    <b style={{ fontSize: 13 }}>{c.project_name?.slice(0, 40)}</b>
                    <small style={{ display: 'block', color: '#888', fontSize: 11 }}>{c.status} · {c.business_name || 'N/A'}</small>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <b style={{
                      fontFamily: "'Libre Caslon Display', serif", fontSize: 22,
                      color: (c.parity_score || 0) >= 100 ? '#237A4B' : (c.parity_score || 0) >= 70 ? '#B88214' : '#C63D34'
                    }}>{c.parity_score || 0}</b>
                    <small style={{ display: 'block', color: '#999', fontSize: 10 }}>/100</small>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link to="/app/command-center" style={{ display: 'inline-block', marginTop: 14, fontSize: 12, color: '#C89B3C', fontWeight: 700 }}>View all clones →</Link>
        </article>

        {/* Recent Autonomous Actions */}
        <article style={{ background: '#fff', border: '1px solid #ddd', padding: 20 }}>
          <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22, margin: '0 0 16px' }}>Autonomous Activity Log</h3>
          {recentActions.length === 0 ? (
            <p style={{ color: '#999', fontSize: 13 }}>No recent autonomous actions.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {recentActions.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                  {r.status === 'success' ? <CheckCircle2 size={16} style={{ color: '#237A4B', flexShrink: 0, marginTop: 2 }} /> :
                   r.status === 'partial' ? <AlertCircle size={16} style={{ color: '#B88214', flexShrink: 0, marginTop: 2 }} /> :
                   <Clock size={16} style={{ color: '#999', flexShrink: 0, marginTop: 2 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: 12, display: 'block' }}>{r.summary?.slice(0, 70)}</b>
                    <small style={{ color: '#999', fontSize: 10 }}>{r.system} · {new Date(r.created_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>

      {/* Marketplace Breakdown */}
      <article style={{ background: '#fff', border: '1px solid #ddd', padding: 20, marginTop: 13 }}>
        <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22, margin: '0 0 16px' }}>Marketplace Inventory</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {Object.entries(metrics.byCategory).map(([cat, count]) => (
            <div key={cat} style={{ textAlign: 'center', padding: 16, background: '#f8f7f4', border: '1px solid #eee' }}>
              <Layers size={20} style={{ color: '#C89B3C' }} />
              <b style={{ display: 'block', fontFamily: "'Libre Caslon Display', serif", fontSize: 24, margin: '8px 0 4px' }}>{count}</b>
              <small style={{ color: '#888', fontSize: 10, textTransform: 'capitalize' }}>{cat.replace(/_/g, ' ')}</small>
            </div>
          ))}
        </div>
        <Link to="/store" style={{ display: 'inline-block', marginTop: 14, fontSize: 12, color: '#C89B3C', fontWeight: 700 }}>Visit marketplace →</Link>
      </article>

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 13, marginTop: 13 }}>
        {[
          { label: 'Store', path: '/store', icon: Package },
          { label: 'Command Center', path: '/app/command-center', icon: Activity },
          { label: 'Discovery Engine', path: '/app/discovery-engine', icon: Globe },
          { label: 'QA Dashboard', path: '/app/qa-center', icon: Shield },
        ].map(l => (
          <Link key={l.path} to={l.path} style={{ background: '#fff', border: '1px solid #ddd', padding: 20, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
            <l.icon size={22} style={{ color: '#C89B3C' }} />
            <b style={{ fontSize: 14 }}>{l.label}</b>
          </Link>
        ))}
      </div>
      </div>
    </>
  );
}