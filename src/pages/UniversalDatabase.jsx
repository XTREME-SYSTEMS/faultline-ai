import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from 'next-themes';
import UniversalChat from '@/components/fl/UniversalChat';
import { Database, Search, Play, Loader2, ExternalLink, CheckCircle2, AlertCircle, Clock, Sun, Moon, ChevronLeft, MessageSquare } from 'lucide-react';

const CATEGORIES = [
  { key: '', label: 'All Categories' },
  { key: 'epoxy_metallic', label: 'Metallic Epoxy' },
  { key: 'epoxy_flake', label: 'Flake Epoxy' },
  { key: 'epoxy_quartz', label: 'Quartz Epoxy' },
  { key: 'epoxy_solid_color', label: 'Solid Epoxy' },
  { key: 'concrete_polished', label: 'Polished Concrete' },
  { key: 'concrete_stained', label: 'Stained Concrete' },
  { key: 'concrete_decorative', label: 'Decorative Concrete' },
  { key: 'concrete_overlayment', label: 'Overlayment' },
  { key: 'concrete_coating', label: 'Coating' },
  { key: 'commercial_flooring', label: 'Commercial' },
  { key: 'residential_flooring', label: 'Residential' },
  { key: 'government_flooring', label: 'Government' },
  { key: 'construction_data_platforms', label: 'Construction Data' },
  { key: 'construction_lead_gen', label: 'Construction Leads' },
  { key: 'construction_crm', label: 'Construction CRM' },
  { key: 'construction_estimating', label: 'Estimating' },
  { key: 'construction_pm', label: 'Construction PM' },
  { key: 'hubspot_class_crm', label: 'HubSpot-Class CRM' },
  { key: 'top_lead_gen_systems', label: 'Lead Gen Systems' },
  { key: 'top_ai_website_generators', label: 'AI Website Gen' },
  { key: 'top_app_generators', label: 'AI App Gen' },
  { key: 'top_ai_tools', label: 'AI Tools' },
  { key: 'top_ai_agents', label: 'AI Agents' },
  { key: 'top_orchestrators', label: 'Orchestrators' },
  { key: 'top_scraping_systems', label: 'Scraping Systems' },
  { key: 'top_epoxy_contractor_websites', label: 'Top Epoxy Sites' },
  { key: 'seo_aeo_platforms', label: 'SEO/AEO' },
  { key: 'online_store_platforms', label: 'Online Stores' },
  { key: 'all_industries_saas', label: 'SaaS (All)' },
  { key: 'all_industries_fintech', label: 'Fintech' },
  { key: 'all_industries_healthtech', label: 'HealthTech' },
  { key: 'all_industries_edtech', label: 'EdTech' },
  { key: 'all_industries_realestate', label: 'Real Estate' },
  { key: 'all_industries_marketing', label: 'Marketing' },
  { key: 'all_industries_logistics', label: 'Logistics' },
  { key: 'all_industries_cybersecurity', label: 'Cybersecurity' }
];

const V_FILTERS = [
  { key: '', label: 'All status' },
  { key: 'validated', label: 'Validated' },
  { key: 'needs_work', label: 'Needs work' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' }
];

function VBadge({ status }) {
  const map = {
    validated: { c: '#237A4B', bg: 'rgba(35,122,75,.14)', icon: CheckCircle2 },
    needs_work: { c: '#B88214', bg: 'rgba(184,130,20,.14)', icon: AlertCircle },
    pending: { c: 'var(--db-muted)', bg: 'var(--db-surface-2)', icon: Clock },
    failed: { c: '#C63D34', bg: 'rgba(198,61,52,.14)', icon: AlertCircle }
  };
  const m = map[status] || map.pending;
  const I = m.icon;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: m.c, background: m.bg }}><I size={11} />{status}</span>;
}

export default function UniversalDatabase() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const isAdmin = user?.role === 'admin';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [vFilter, setVFilter] = useState('');
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState('');
  const [chatOpen, setChatOpen] = useState(true);
  const [stats, setStats] = useState({ total: 0, validated: 0, cloned: 0, pending: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await base44.entities.UniversalCatalog.list('-created_date', 500);
      setItems(all || []);
      setStats({
        total: all.length,
        validated: all.filter(i => i.validation_status === 'validated').length,
        cloned: all.filter(i => i.clone_status === 'cloned').length,
        pending: all.filter(i => i.validation_status === 'pending' || i.validation_status === 'needs_work').length
      });
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(i => {
    if (cat && i.category !== cat) return false;
    if (vFilter && i.validation_status !== vFilter) return false;
    if (q) {
      const s = (i.name + ' ' + (i.url || '') + ' ' + (i.niche || '') + ' ' + (i.description || '')).toLowerCase();
      if (!s.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  async function runOrchestrator(forceCategory) {
    if (!isAdmin) return;
    setRunning(true);
    setRunMsg(forceCategory ? `Discovering ${forceCategory}…` : 'Running orchestrator cycle — discovering + cloning…');
    try {
      const res = await base44.functions.invoke('universalOrchestrator', forceCategory ? { force_category: forceCategory } : {});
      const d = res.data || res;
      setRunMsg(`✓ Discovered ${d.discovery?.discovered || 0} in ${d.category || '—'}${d.clone?.cloned ? `, cloned ${d.clone.cloned}` : ''}.`);
      await load();
    } catch (e) {
      setRunMsg(`Error: ${e.message}`);
    } finally {
      setRunning(false);
    }
  }

  const gridCols = chatOpen ? '230px 1fr 350px' : '230px 1fr';

  return (
    <div className="universal-db" style={{ minHeight: '100vh', background: 'var(--db-bg)', color: 'var(--db-text)' }}>
      <style>{`
        .universal-db { --db-bg:#f7f7f5; --db-surface:#ffffff; --db-surface-2:#f3f0ea; --db-border:#e5e5e5; --db-text:#111111; --db-muted:#666666; --db-accent:#C89B3C; --db-accent-fg:#ffffff; --db-accent-soft:#faf3e0; }
        .dark .universal-db { --db-bg:#0B0B0D; --db-surface:#111114; --db-surface-2:#1a1a1d; --db-border:#2b2b2b; --db-text:#ffffff; --db-muted:#9a9a9e; --db-accent:#FFD60A; --db-accent-fg:#0B0B0D; --db-accent-soft:#2a2410; }
      `}</style>

      <div style={{ display: 'grid', gridTemplateColumns: gridCols, minHeight: '100vh', transition: 'grid-template-columns .25s' }}>
        {/* LEFT — category menu */}
        <aside style={{ borderRight: '1px solid var(--db-border)', background: 'var(--db-surface)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
          <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--db-border)' }}>
            <p style={{ color: 'var(--db-accent)', fontSize: 11, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 7 }}><Database size={13} /> A-Z Database</p>
            <h2 style={{ font: "400 19px 'Libre Caslon Display', serif", margin: 0 }}>Universal Catalog</h2>
          </div>
          <nav style={{ flex: 1, overflow: 'auto', padding: '10px 10px' }}>
            {CATEGORIES.map(c => (
              <button key={c.key || 'all'} type="button" onClick={() => setCat(c.key)} style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', marginBottom: 2, borderRadius: 7, fontSize: 13, fontWeight: cat === c.key ? 700 : 500, cursor: 'pointer',
                border: 0, background: cat === c.key ? 'var(--db-accent)' : 'transparent', color: cat === c.key ? 'var(--db-accent-fg)' : 'var(--db-text)'
              }}>{c.label}</button>
            ))}
          </nav>
          <div style={{ padding: 14, borderTop: '1px solid var(--db-border)', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {isAdmin && (
              <button type="button" onClick={() => runOrchestrator(cat || undefined)} disabled={running} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px', background: 'var(--db-accent)', color: 'var(--db-accent-fg)', border: 0, borderRadius: 7, fontSize: 12, fontWeight: 800, cursor: running ? 'wait' : 'pointer', opacity: running ? .7 : 1 }}>
                {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} {cat ? 'Discover' : 'Run Cycle'}
              </button>
            )}
            <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px', background: 'var(--db-surface-2)', color: 'var(--db-text)', border: '1px solid var(--db-border)', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />} {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </aside>

        {/* CENTER — content */}
        <main style={{ padding: '26px 28px 60px', minWidth: 0, overflow: 'auto' }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ color: 'var(--db-accent)', fontSize: 11, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', margin: '0 0 8px' }}>Persistent 24/7 Discovery & Cloning</p>
            <h1 style={{ font: "400 clamp(26px,3vw,40px)/1 'Libre Caslon Display', serif", letterSpacing: '-.035em', margin: 0 }}>Everything We've Discovered & Cloned</h1>
            <p style={{ color: 'var(--db-muted)', fontSize: 14, margin: '8px 0 0', maxWidth: 580 }}>Non-stop autonomous discovery across epoxy, concrete, construction data, AI tools, agents, orchestrators, scrapers, and every industry — validated and cloned into production-ready packs.</p>
          </div>

          {runMsg && <div style={{ padding: '10px 15px', background: 'var(--db-accent-soft)', border: '1px solid var(--db-border)', borderRadius: 8, fontSize: 13, color: 'var(--db-text)', marginBottom: 16 }}>{runMsg}</div>}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 11, marginBottom: 18 }}>
            {[{ l: 'Total Items', v: stats.total, c: 'var(--db-text)' }, { l: 'Validated', v: stats.validated, c: '#237A4B' }, { l: 'Cloned', v: stats.cloned, c: 'var(--db-accent)' }, { l: 'Needs Work', v: stats.pending, c: '#B88214' }].map(s => (
              <div key={s.l} style={{ background: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: 9, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, color: 'var(--db-muted)', textTransform: 'uppercase', letterSpacing: '.1em' }}>{s.l}</div>
                <div style={{ font: "400 28px 'Libre Caslon Display', serif", color: s.c, marginTop: 5 }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 11, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--db-muted)' }} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, URL, niche…" style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: 7, color: 'var(--db-text)', fontSize: 13, outline: 'none' }} />
            </div>
            <select value={vFilter} onChange={e => setVFilter(e.target.value)} style={{ padding: '10px 12px', background: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: 7, color: 'var(--db-text)', fontSize: 13, outline: 'none' }}>
              {V_FILTERS.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
            </select>
          </div>

          {/* Catalog table */}
          <div style={{ background: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: 9, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 56, textAlign: 'center', color: 'var(--db-muted)' }}><Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} /><div>Loading catalog…</div></div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 56, textAlign: 'center', color: 'var(--db-muted)' }}>
                <Database size={30} style={{ margin: '0 auto 12px', opacity: .4 }} />
                <div style={{ fontSize: 14, marginBottom: 5 }}>No items yet{cat ? ' in this category' : ''}.</div>
                {isAdmin && <div style={{ fontSize: 12 }}>Hit <b style={{ color: 'var(--db-accent)' }}>Run Cycle</b> or ask the assistant to start discovering.</div>}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--db-surface-2)', textAlign: 'left' }}>
                      {['Name', 'Category', 'Type', 'Niche', 'Validation', 'Clone', '', ''].map((h, i) => (
                        <th key={i} style={{ padding: '10px 13px', color: 'var(--db-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, borderBottom: '1px solid var(--db-border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(it => (
                      <tr key={it.id} style={{ borderBottom: '1px solid var(--db-border)' }}>
                        <td style={{ padding: '11px 13px' }}>
                          <b style={{ fontSize: 13, color: 'var(--db-text)' }}>{it.name}</b>
                          {it.value_proposition && <div style={{ fontSize: 11, color: 'var(--db-muted)', marginTop: 3, maxWidth: 280, lineHeight: 1.4 }}>{it.value_proposition}</div>}
                        </td>
                        <td style={{ padding: '11px 13px', fontSize: 12, color: 'var(--db-text)' }}>{CATEGORIES.find(c => c.key === it.category)?.label || it.category}</td>
                        <td style={{ padding: '11px 13px', fontSize: 11, color: 'var(--db-muted)' }}>{it.item_type?.replace(/_/g, ' ')}</td>
                        <td style={{ padding: '11px 13px', fontSize: 11, color: 'var(--db-muted)', maxWidth: 150 }}>{it.niche}</td>
                        <td style={{ padding: '11px 13px' }}><VBadge status={it.validation_status} /></td>
                        <td style={{ padding: '11px 13px', fontSize: 11 }}>
                          {it.clone_status === 'cloned' ? <span style={{ color: 'var(--db-accent)', fontWeight: 700 }}>✓ Cloned</span> : <span style={{ color: 'var(--db-muted)' }}>{it.clone_status}</span>}
                        </td>
                        <td style={{ padding: '11px 8px' }}>
                          {it.url && <a href={it.url} target="_blank" rel="noreferrer" style={{ color: 'var(--db-muted)', display: 'inline-flex' }}><ExternalLink size={14} /></a>}
                        </td>
                        <td style={{ padding: '11px 13px', fontSize: 10, color: 'var(--db-accent)', fontWeight: 700 }}>{it.profit_potential?.replace(/_/g, ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {!loading && filtered.length > 0 && <div style={{ color: 'var(--db-muted)', fontSize: 12, marginTop: 11 }}>Showing {filtered.length} of {items.length} items.</div>}
        </main>

        {/* RIGHT — AI chat (retractable) */}
        {chatOpen ? (
          <aside style={{ borderLeft: '1px solid var(--db-border)', height: '100vh', position: 'sticky', top: 0, overflow: 'hidden' }}>
            <UniversalChat items={items} onRefresh={load} onRetract={() => setChatOpen(false)} />
          </aside>
        ) : (
          <button type="button" onClick={() => setChatOpen(true)} title="Open AI chat" style={{ position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px', background: 'var(--db-accent)', color: 'var(--db-accent-fg)', border: 0, borderRadius: '8px 0 0 8px', cursor: 'pointer', boxShadow: '-4px 0 20px rgba(0,0,0,.18)' }}>
            <MessageSquare size={18} />
            <span style={{ fontSize: 9, fontWeight: 800, writingMode: 'vertical-rl', letterSpacing: '.1em' }}>AI CHAT</span>
          </button>
        )}
      </div>

      <style>{`@media (max-width: 1100px){ .universal-db > div { grid-template-columns: 1fr !important; } aside, .universal-db aside { position: static !important; height: auto !important; max-height: 260px; border-right: 0 !important; border-bottom: 1px solid var(--db-border) !important; } .universal-db aside:last-of-type { max-height: 420px; } }`}</style>
    </div>
  );
}