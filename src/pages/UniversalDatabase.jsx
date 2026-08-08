import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import UniversalChat from '@/components/fl/UniversalChat';
import { Database, Search, Play, Loader2, ExternalLink, CheckCircle2, AlertCircle, Clock, Copy } from 'lucide-react';

const CATEGORIES = [
  { key: '', label: 'All' },
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
    validated: { c: '#237A4B', bg: '#1c3a2a', icon: CheckCircle2 },
    needs_work: { c: '#B88214', bg: '#3a2e14', icon: AlertCircle },
    pending: { c: '#9a9a9e', bg: '#1a1a1d', icon: Clock },
    failed: { c: '#C63D34', bg: '#3a1a18', icon: AlertCircle }
  };
  const m = map[status] || map.pending;
  const I = m.icon;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: m.c, background: m.bg }}><I size={11} />{status}</span>;
}

export default function UniversalDatabase() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [vFilter, setVFilter] = useState('');
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState('');
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

  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0D', color: '#fff' }}>
      <div style={{ maxWidth: 1480, margin: '0 auto', padding: '28px 24px 80px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        {/* Main column */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, marginBottom: 22 }}>
            <div>
              <p style={{ color: '#FFD60A', fontSize: 12, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}><Database size={14} /> Universal A-Z Database</p>
              <h1 style={{ font: "400 clamp(28px,3vw,42px)/1 'Libre Caslon Display', serif", letterSpacing: '-.035em', margin: 0 }}>Everything We've Discovered & Cloned</h1>
              <p style={{ color: '#9a9a9e', fontSize: 15, margin: '10px 0 0', maxWidth: 560 }}>Persistent non-stop discovery across epoxy, concrete, construction, AI tools, agents, orchestrators, scrapers, and every industry.</p>
            </div>
            {isAdmin && (
              <button type="button" onClick={() => runOrchestrator()} disabled={running} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 22px', background: 'linear-gradient(135deg,#FFD60A,#FFB800)', color: '#0B0B0D', border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: running ? 'wait' : 'pointer', opacity: running ? .7 : 1 }}>
                {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Run Cycle
              </button>
            )}
          </div>

          {runMsg && <div style={{ padding: '11px 16px', background: '#1a1a1d', border: '1px solid #2b2b2b', borderRadius: 8, fontSize: 13, color: '#FFD60A', marginBottom: 18 }}>{runMsg}</div>}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 22 }}>
            {[{ l: 'Total Items', v: stats.total, c: '#fff' }, { l: 'Validated', v: stats.validated, c: '#237A4B' }, { l: 'Cloned', v: stats.cloned, c: '#FFD60A' }, { l: 'Needs Work', v: stats.pending, c: '#B88214' }].map(s => (
              <div key={s.l} style={{ background: '#111114', border: '1px solid #2b2b2b', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: '#9a9a9e', textTransform: 'uppercase', letterSpacing: '.1em' }}>{s.l}</div>
                <div style={{ font: "400 30px 'Libre Caslon Display', serif", color: s.c, marginTop: 6 }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Category chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
            {CATEGORIES.map(c => (
              <button key={c.key || 'all'} type="button" onClick={() => setCat(c.key)} style={{ padding: '7px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: cat === c.key ? '1px solid #FFD60A' : '1px solid #2b2b2b', background: cat === c.key ? '#FFD60A' : '#111114', color: cat === c.key ? '#0B0B0D' : '#bbb' }}>{c.label}</button>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, URL, niche…" style={{ width: '100%', padding: '11px 13px 11px 38px', background: '#111114', border: '1px solid #2b2b2b', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }} />
            </div>
            <select value={vFilter} onChange={e => setVFilter(e.target.value)} style={{ padding: '11px 13px', background: '#111114', border: '1px solid #2b2b2b', borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none' }}>
              {V_FILTERS.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
            </select>
            {cat && isAdmin && (
              <button type="button" onClick={() => runOrchestrator(cat)} disabled={running} style={{ padding: '11px 16px', background: '#1a1a1d', color: '#FFD60A', border: '1px solid #FFD60A', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: running ? 'wait' : 'pointer' }}>Discover this category</button>
            )}
          </div>

          {/* Catalog table */}
          <div style={{ background: '#111114', border: '1px solid #2b2b2b', borderRadius: 10, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#9a9a9e' }}><Loader2 size={26} className="animate-spin" style={{ margin: '0 auto 12px' }} /><div>Loading catalog…</div></div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#9a9a9e' }}>
                <Database size={32} style={{ margin: '0 auto 14px', opacity: .4 }} />
                <div style={{ fontSize: 15, marginBottom: 6 }}>No items yet{cat ? ' in this category' : ''}.</div>
                {isAdmin && <div style={{ fontSize: 13 }}>Hit <b style={{ color: '#FFD60A' }}>Run Cycle</b> to start discovering.</div>}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#0B0B0D', textAlign: 'left' }}>
                      {['Name', 'Category', 'Type', 'Niche', 'Validation', 'Clone', '', ''].map((h, i) => (
                        <th key={i} style={{ padding: '11px 14px', color: '#9a9a9e', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, borderBottom: '1px solid #2b2b2b' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(it => (
                      <tr key={it.id} style={{ borderBottom: '1px solid #1a1a1d' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <b style={{ fontSize: 13 }}>{it.name}</b>
                          {it.value_proposition && <div style={{ fontSize: 11, color: '#777', marginTop: 3, maxWidth: 280, lineHeight: 1.4 }}>{it.value_proposition}</div>}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#bbb' }}>{CATEGORIES.find(c => c.key === it.category)?.label || it.category}</td>
                        <td style={{ padding: '12px 14px', fontSize: 11, color: '#9a9a9e' }}>{it.item_type?.replace(/_/g, ' ')}</td>
                        <td style={{ padding: '12px 14px', fontSize: 11, color: '#777', maxWidth: 160 }}>{it.niche}</td>
                        <td style={{ padding: '12px 14px' }}><VBadge status={it.validation_status} /></td>
                        <td style={{ padding: '12px 14px', fontSize: 11 }}>
                          {it.clone_status === 'cloned' ? <span style={{ color: '#FFD60A', fontWeight: 700 }}>✓ Cloned</span> : <span style={{ color: '#666' }}>{it.clone_status}</span>}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {it.url && <a href={it.url} target="_blank" rel="noreferrer" style={{ color: '#666', display: 'inline-flex' }}><ExternalLink size={14} /></a>}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 10, color: '#FFD60A', fontWeight: 700 }}>{it.profit_potential?.replace(/_/g, ' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {!loading && filtered.length > 0 && <div style={{ color: '#666', fontSize: 12, marginTop: 12 }}>Showing {filtered.length} of {items.length} items.</div>}
        </div>

        {/* Chat panel */}
        <aside style={{ position: 'sticky', top: 20, height: 'calc(100vh - 40px)', background: '#111114', border: '1px solid #2b2b2b', borderRadius: 10, overflow: 'hidden' }}>
          <UniversalChat items={items} />
        </aside>
      </div>

      <style>{`@media (max-width: 900px){ .portal-page > div { grid-template-columns: 1fr !important; } aside{ position: static !important; height: 480px !important; } }`}</style>
    </div>
  );
}