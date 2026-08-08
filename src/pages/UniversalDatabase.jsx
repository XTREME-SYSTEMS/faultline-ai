import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from 'next-themes';
import { Link, useNavigate } from 'react-router-dom';
import { portalNavCategories } from '@/components/fl/data';
import { TOOL_CATEGORIES } from '@/components/fl/toolRegistry';
import UniversalChat from '@/components/fl/UniversalChat';
import { Database, Search, Play, Loader2, ExternalLink, CheckCircle2, AlertCircle, Clock, Sun, Moon, MessageSquare, ChevronRight, ChevronLeft, Sparkles, LogOut } from 'lucide-react';

const LOGO_LIGHT = 'https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633/ed45981bc_logo-light.png';

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
    validated: { c: '#3FB46B', bg: 'rgba(63,180,107,.16)', icon: CheckCircle2 },
    needs_work: { c: '#FFD60A', bg: 'rgba(255,214,10,.14)', icon: AlertCircle },
    pending: { c: 'var(--db-muted)', bg: 'var(--db-surface-2)', icon: Clock },
    failed: { c: '#FF5C4D', bg: 'rgba(255,92,77,.16)', icon: AlertCircle }
  };
  const m = map[status] || map.pending;
  const I = m.icon;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: m.c, background: m.bg }}><I size={11} />{status}</span>;
}

export default function UniversalDatabase() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [vFilter, setVFilter] = useState('');
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState('');
  const [chatOpen, setChatOpen] = useState(true);
  const [openGroups, setOpenGroups] = useState({});
  const [menuTab, setMenuTab] = useState('pages');
  const [stats, setStats] = useState({ total: 0, validated: 0, cloned: 0, pending: 0 });

  useEffect(() => { setTheme('dark'); /* dark dashboard by default */ }, [setTheme]);

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

  const gridCols = chatOpen ? '248px 1fr 360px' : '248px 1fr';
  const initials = (user?.full_name || user?.email || 'U').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="universal-db" style={{ minHeight: '100vh', background: 'var(--db-bg)', color: 'var(--db-text)' }}>
      <style>{`
        .universal-db { --db-bg:#0d0d0d; --db-surface:#161616; --db-surface-2:#1c1c1c; --db-border:#262626; --db-text:#ffffff; --db-muted:#808080; --db-accent:#FFD60A; --db-accent-fg:#0d0d0d; --db-accent-soft:#2a2410; }
        html:not(.dark) .universal-db { --db-bg:#f6f6f4; --db-surface:#ffffff; --db-surface-2:#f1efea; --db-border:#e3e0d9; --db-text:#111111; --db-muted:#6b6b6b; --db-accent:#C89B3C; --db-accent-fg:#ffffff; --db-accent-soft:#faf3e0; }
      `}</style>

      <div style={{ display: 'grid', gridTemplateColumns: gridCols, minHeight: '100vh', transition: 'grid-template-columns .25s' }}>
        {/* LEFT — tool menu */}
        <aside style={{ borderRight: '1px solid var(--db-border)', background: 'var(--db-surface)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
          <div style={{ padding: '18px 18px 16px', borderBottom: '1px solid var(--db-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={LOGO_LIGHT} alt="Xtreme AI Systems" style={{ height: 30, width: 'auto' }} />
          </div>
          <nav style={{ flex: 1, overflow: 'auto', padding: '8px 8px' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--db-muted)', textTransform: 'uppercase', letterSpacing: '.14em', padding: '8px 10px 4px' }}>Pages</div>
            {portalNavCategories.map((grp, gi) => {
              const open = openGroups['p' + grp.step] !== false;
              return (
                <div key={grp.step} style={{ marginBottom: 4 }}>
                  <button type="button" onClick={() => setOpenGroups(s => ({ ...s, ['p' + grp.step]: !open }))} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'transparent', border: 0, color: 'var(--db-text)', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--db-accent)' }}>{gi + 1}</span>
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>{grp.label}</span>
                    <ChevronRight size={13} style={{ color: 'var(--db-muted)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                  </button>
                  {open && grp.items.map(([label, path]) => {
                    const active = path === '/app/database';
                    return <Link key={path} to={path} style={{ display: 'block', padding: '7px 10px 7px 30px', fontSize: 12.5, color: active ? 'var(--db-accent)' : 'var(--db-text)', textDecoration: 'none', borderRadius: 6, lineHeight: 1.3, borderLeft: active ? '2px solid var(--db-accent)' : '2px solid transparent', background: active ? 'var(--db-surface-2)' : 'transparent' }}>{label}</Link>;
                  })}
                </div>
              );
            })}
            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--db-muted)', textTransform: 'uppercase', letterSpacing: '.14em', padding: '14px 10px 4px', marginTop: 6, borderTop: '1px solid var(--db-border)' }}>Tools</div>
            {TOOL_CATEGORIES.map(tc => {
              const open = openGroups['t' + tc.id] === true;
              return (
                <div key={tc.id} style={{ marginBottom: 4 }}>
                  <button type="button" onClick={() => setOpenGroups(s => ({ ...s, ['t' + tc.id]: !open }))} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'transparent', border: 0, color: 'var(--db-text)', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: 13 }}>{tc.icon}</span>
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' }}>{tc.name}</span>
                    <span style={{ fontSize: 9, color: 'var(--db-muted)', fontWeight: 700 }}>{tc.tools.length}</span>
                    <ChevronRight size={13} style={{ color: 'var(--db-muted)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                  </button>
                  {open && tc.tools.map(tool => (
                    <Link key={tool.id} to="/app/command-center" title={tool.desc} style={{ display: 'block', padding: '6px 10px 6px 34px', fontSize: 12, color: 'var(--db-text)', textDecoration: 'none', borderRadius: 6, lineHeight: 1.3 }}>{tool.label}</Link>
                  ))}
                </div>
              );
            })}
          </nav>
          <div style={{ padding: 12, borderTop: '1px solid var(--db-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button type="button" onClick={() => setChatOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px', background: 'transparent', color: 'var(--db-accent)', border: '1px solid var(--db-accent)', borderRadius: 7, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
              <Sparkles size={14} /> Ask AI
            </button>
            <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px', background: 'var(--db-surface-2)', color: 'var(--db-muted)', border: '1px solid var(--db-border)', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />} {theme === 'dark' ? 'Light' : 'Dark'} Mode
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 4px 2px' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--db-accent)', color: 'var(--db-accent-fg)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800 }}>{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.full_name || 'Operator'}</div>
                <div style={{ fontSize: 10, color: 'var(--db-muted)' }}>{user?.role || 'user'}</div>
              </div>
              <button type="button" onClick={() => base44.auth.logout()} title="Sign out" style={{ background: 'transparent', border: 0, color: 'var(--db-muted)', cursor: 'pointer', padding: 4 }}><LogOut size={15} /></button>
            </div>
          </div>
        </aside>

        {/* CENTER — dashboard + data */}
        <main style={{ minWidth: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* HIDE AI retract button */}
          {chatOpen && (
            <button type="button" onClick={() => setChatOpen(false)} title="Hide AI chat" style={{ position: 'absolute', right: 16, top: 16, zIndex: 20, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'var(--db-surface)', color: 'var(--db-text)', border: '1px solid var(--db-border)', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              <ChevronRight size={13} /> HIDE AI
            </button>
          )}

          <div style={{ padding: '26px 28px 0' }}>
            <p style={{ color: 'var(--db-muted)', fontSize: 10, fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase', margin: '0 0 8px' }}>Universal Catalog</p>
            <h1 style={{ font: "700 clamp(22px,2.4vw,32px)/1 'DM Sans', sans-serif", letterSpacing: '-.02em', margin: 0, textTransform: 'uppercase' }}>A-Z Database</h1>
            <p style={{ color: 'var(--db-muted)', fontSize: 13.5, margin: '8px 0 18px', maxWidth: 620 }}>Autonomous 24/7 discovery across epoxy, concrete, construction data, AI tools, agents, orchestrators, scrapers & every industry — validated and cloned into production-ready packs.</p>
          </div>

          {runMsg && <div style={{ margin: '0 28px 14px', padding: '10px 15px', background: 'var(--db-accent-soft)', border: '1px solid var(--db-border)', borderRadius: 8, fontSize: 13 }}>{runMsg}</div>}

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, padding: '0 28px' }}>
            {[
              { l: 'Total Items', v: stats.total, c: 'var(--db-text)', icon: Database },
              { l: 'Validated', v: stats.validated, c: '#3FB46B', icon: CheckCircle2 },
              { l: 'Cloned', v: stats.cloned, c: 'var(--db-accent)', icon: Sparkles },
              { l: 'Needs Work', v: stats.pending, c: '#FFD60A', icon: AlertCircle }
            ].map(s => {
              const I = s.icon;
              return (
                <div key={s.l} style={{ background: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 10, color: 'var(--db-muted)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }}>{s.l}</div>
                    <I size={15} style={{ color: s.c }} />
                  </div>
                  <div style={{ font: "700 28px 'DM Sans', sans-serif", color: s.c }}>{s.v}</div>
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 11, padding: '16px 28px 14px', flexWrap: 'wrap' }}>
            <select value={cat} onChange={e => setCat(e.target.value)} style={{ padding: '10px 12px', background: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: 7, color: 'var(--db-text)', fontSize: 13, outline: 'none', minWidth: 170 }}>
              {CATEGORIES.map(c => <option key={c.key || 'all'} value={c.key}>{c.label}</option>)}
            </select>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--db-muted)' }} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, URL, niche…" style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: 7, color: 'var(--db-text)', fontSize: 13, outline: 'none' }} />
            </div>
            <select value={vFilter} onChange={e => setVFilter(e.target.value)} style={{ padding: '10px 12px', background: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: 7, color: 'var(--db-text)', fontSize: 13, outline: 'none' }}>
              {V_FILTERS.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
            </select>
            {isAdmin && (
              <button type="button" onClick={() => runOrchestrator(cat || undefined)} disabled={running} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', background: 'var(--db-accent)', color: 'var(--db-accent-fg)', border: 0, borderRadius: 7, fontSize: 12, fontWeight: 800, cursor: running ? 'wait' : 'pointer', opacity: running ? .7 : 1 }}>
                {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Run Cycle
              </button>
            )}
          </div>

          {/* Table module */}
          <div style={{ margin: '0 28px 24px', background: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: 10, overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--db-border)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--db-muted)' }}>Discovered & Cloned</div>
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
                    <tr style={{ textAlign: 'left' }}>
                      {['Name', 'Category', 'Type', 'Niche', 'Validation', 'Clone', '', ''].map((h, i) => (
                        <th key={i} style={{ padding: '10px 14px', color: 'var(--db-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, borderBottom: '1px solid var(--db-border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(it => (
                      <tr key={it.id} style={{ borderBottom: '1px solid var(--db-border)' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <b style={{ fontSize: 13, color: 'var(--db-text)' }}>{it.name}</b>
                          {it.value_proposition && <div style={{ fontSize: 11, color: 'var(--db-muted)', marginTop: 3, maxWidth: 300, lineHeight: 1.4 }}>{it.value_proposition}</div>}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--db-text)' }}>{CATEGORIES.find(c => c.key === it.category)?.label || it.category}</td>
                        <td style={{ padding: '12px 14px', fontSize: 11, color: 'var(--db-muted)' }}>{it.item_type?.replace(/_/g, ' ')}</td>
                        <td style={{ padding: '12px 14px', fontSize: 11, color: 'var(--db-muted)', maxWidth: 160 }}>{it.niche}</td>
                        <td style={{ padding: '12px 14px' }}><VBadge status={it.validation_status} /></td>
                        <td style={{ padding: '12px 14px', fontSize: 11 }}>
                          {it.clone_status === 'cloned' ? <span style={{ color: 'var(--db-accent)', fontWeight: 700 }}>✓ Cloned</span> : <span style={{ color: 'var(--db-muted)' }}>{it.clone_status}</span>}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {it.url && <a href={it.url} target="_blank" rel="noreferrer" style={{ color: 'var(--db-muted)', display: 'inline-flex' }}><ExternalLink size={14} /></a>}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 10, color: 'var(--db-accent)', fontWeight: 700 }}>{it.profit_potential?.replace(/_/g, ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {!loading && filtered.length > 0 && <div style={{ color: 'var(--db-muted)', fontSize: 12, padding: '0 28px 20px' }}>Showing {filtered.length} of {items.length} items.</div>}
        </main>

        {/* RIGHT — AI chat (retractable) */}
        {chatOpen ? (
          <aside style={{ borderLeft: '1px solid var(--db-border)', height: '100vh', position: 'sticky', top: 0, overflow: 'hidden', background: 'var(--db-surface)' }}>
            <UniversalChat items={items} onRefresh={load} onRetract={() => setChatOpen(false)} />
          </aside>
        ) : (
          <button type="button" onClick={() => setChatOpen(true)} title="Open AI chat" style={{ position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px', background: 'var(--db-accent)', color: 'var(--db-accent-fg)', border: 0, borderRadius: '8px 0 0 8px', cursor: 'pointer', boxShadow: '-4px 0 20px rgba(0,0,0,.4)' }}>
            <MessageSquare size={18} />
            <span style={{ fontSize: 9, fontWeight: 800, writingMode: 'vertical-rl', letterSpacing: '.1em' }}>AI CHAT</span>
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      <style>{`@media (max-width: 760px){ .universal-db > div { grid-template-columns: 1fr !important; } .universal-db aside { position: static !important; height: auto !important; max-height: 280px; border-right: 0 !important; border-bottom: 1px solid var(--db-border) !important; } .universal-db aside:last-of-type { max-height: 420px; } }`}</style>
    </div>
  );
}