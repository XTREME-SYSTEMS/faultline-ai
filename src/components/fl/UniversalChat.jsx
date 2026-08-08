import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Loader2, Sparkles, Zap, Power, ChevronRight } from 'lucide-react';

const TAXONOMY = [
  { category: 'epoxy_metallic', item_type: 'contractor_website', niche: 'metallic epoxy flooring contractors' },
  { category: 'epoxy_flake', item_type: 'contractor_website', niche: 'flake epoxy flooring contractors' },
  { category: 'epoxy_quartz', item_type: 'contractor_website', niche: 'quartz epoxy flooring contractors' },
  { category: 'epoxy_solid_color', item_type: 'contractor_website', niche: 'solid color epoxy flooring contractors' },
  { category: 'concrete_polished', item_type: 'contractor_website', niche: 'polished concrete contractors' },
  { category: 'concrete_stained', item_type: 'contractor_website', niche: 'stained concrete contractors' },
  { category: 'concrete_decorative', item_type: 'contractor_website', niche: 'decorative concrete contractors' },
  { category: 'concrete_overlayment', item_type: 'contractor_website', niche: 'concrete overlayment contractors' },
  { category: 'concrete_coating', item_type: 'contractor_website', niche: 'concrete coating contractors' },
  { category: 'commercial_flooring', item_type: 'contractor_website', niche: 'commercial flooring contractors' },
  { category: 'residential_flooring', item_type: 'contractor_website', niche: 'residential flooring contractors' },
  { category: 'government_flooring', item_type: 'contractor_website', niche: 'government flooring contractors' },
  { category: 'construction_data_platforms', item_type: 'data_platform', niche: 'construction project databases (ConstructConnect, PlanHub)' },
  { category: 'construction_lead_gen', item_type: 'lead_gen_system', niche: 'construction lead generation platforms' },
  { category: 'construction_crm', item_type: 'crm', niche: 'construction CRM systems' },
  { category: 'construction_estimating', item_type: 'estimating_tool', niche: 'construction estimating & bidding tools' },
  { category: 'construction_pm', item_type: 'project_management', niche: 'construction project management platforms' },
  { category: 'hubspot_class_crm', item_type: 'crm', niche: 'HubSpot-class CRM / marketing platforms' },
  { category: 'top_lead_gen_systems', item_type: 'lead_gen_system', niche: 'top lead generation systems' },
  { category: 'top_ai_website_generators', item_type: 'website_generator', niche: 'AI website generators / builders' },
  { category: 'top_app_generators', item_type: 'app_generator', niche: 'AI app generators / builders' },
  { category: 'top_ai_tools', item_type: 'ai_tool', niche: 'top AI tools across categories' },
  { category: 'top_ai_agents', item_type: 'agent', niche: 'AI agent systems / autonomous agents' },
  { category: 'top_orchestrators', item_type: 'orchestrator', niche: 'orchestrator / workflow orchestration platforms' },
  { category: 'top_scraping_systems', item_type: 'scraper', niche: 'web scraping systems / data extraction' },
  { category: 'top_epoxy_contractor_websites', item_type: 'contractor_website', niche: 'top epoxy contractor websites by traffic' },
  { category: 'seo_aeo_platforms', item_type: 'seo_platform', niche: 'SEO / AEO platforms' },
  { category: 'online_store_platforms', item_type: 'online_store', niche: 'top online store / e-commerce platforms' },
  { category: 'all_industries_saas', item_type: 'platform', niche: 'top SaaS platforms across all industries' },
  { category: 'all_industries_fintech', item_type: 'platform', niche: 'top fintech platforms' },
  { category: 'all_industries_healthtech', item_type: 'platform', niche: 'top healthtech platforms' },
  { category: 'all_industries_edtech', item_type: 'platform', niche: 'top edtech platforms' },
  { category: 'all_industries_realestate', item_type: 'platform', niche: 'top real estate tech platforms' },
  { category: 'all_industries_marketing', item_type: 'platform', niche: 'top marketing technology platforms' },
  { category: 'all_industries_logistics', item_type: 'platform', niche: 'top logistics tech platforms' },
  { category: 'all_industries_cybersecurity', item_type: 'platform', niche: 'top cybersecurity platforms' }
];

export default function UniversalChat({ items, onRefresh, onRetract }) {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'I\'m your autonomous database assistant. I can answer questions about the catalog AND take action — try "discover top AI tools", "run a clone cycle", "find epoxy contractors with high profit potential", or toggle Autopilot below to let me run non-stop.' }
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [autopilot, setAutopilot] = useState(false);
  const [apCount, setApCount] = useState(0);
  const apRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => { busyRef.current = busy; }, [busy]);

  async function runCycle(silent) {
    if (!silent) setBusy(true);
    try {
      const res = await base44.functions.invoke('universalOrchestrator', {});
      const d = res.data || res;
      setMessages(m => [...m, { role: 'bot', text: `✓ Cycle: discovered ${d.discovery?.discovered || 0} in ${d.category || '—'}${d.clone?.cloned ? `, cloned ${d.clone.cloned} → ${d.clone.packs} packs` : ''}.`, action: true }]);
      if (onRefresh) onRefresh();
      return d;
    } catch (e) {
      setMessages(m => [...m, { role: 'bot', text: `Cycle error: ${e.message}` }]);
      return null;
    } finally {
      if (!silent) setBusy(false);
    }
  }

  async function discoverCategory(category, itemType, niche) {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('universalDiscovery', { category, item_type: itemType || 'contractor_website', niche: niche || category, limit: 5 });
      const d = res.data || res;
      setMessages(m => [...m, { role: 'bot', text: `✓ Discovered ${d.discovered || 0} items in ${category}.`, action: true }]);
      if (onRefresh) onRefresh();
      return d;
    } catch (e) {
      setMessages(m => [...m, { role: 'bot', text: `Discover error: ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  }

  async function send(e) {
    e?.preventDefault();
    if (!input.trim() || busy) return;
    const q = input.trim();
    setMessages(m => [...m, { role: 'user', text: q }]);
    setInput('');
    setBusy(true);
    try {
      const context = items.slice(0, 50).map(i => ({ name: i.name, category: i.category, type: i.item_type, url: i.url, niche: i.niche, value: i.value_proposition, profit: i.profit_potential, validation: i.validation_status, clone: i.clone_status }));
      const res = await base44.integrations.Core.InvokeLLM({
        model: 'gemini_3_flash',
        prompt: `You are the FaultLine AI autonomous database assistant. You can EITHER answer questions about the catalog OR trigger autonomous actions.

AVAILABLE ACTIONS:
- run_cycle: run a full discovery + clone cycle (no args)
- discover: discover items in a category. Args: {category, item_type, niche}. Pick from this taxonomy: ${JSON.stringify(TAXONOMY)}

CATALOG (${context.length} items):
${JSON.stringify(context)}

USER REQUEST: ${q}

If the user wants to discover/clone/run/build/grow the database, return an action. If they're asking a question, answer it using the catalog only.
Return JSON: { "type": "answer" | "action", "text": "answer (if answer)", "action": "run_cycle" | "discover" (if action), "args": {category, item_type, niche} (if discover) }`
      });
      const r = res || {};
      if (r.type === 'action') {
        setMessages(m => [...m, { role: 'bot', text: `⚡ Running: ${r.action}${r.args ? ` (${r.args.category})` : ''}…` }]);
        if (r.action === 'run_cycle') await runCycle();
        else if (r.action === 'discover') await discoverCategory(r.args?.category, r.args?.item_type, r.args?.niche);
      } else {
        setMessages(m => [...m, { role: 'bot', text: typeof r.text === 'string' ? r.text : JSON.stringify(r.text || r) }]);
      }
    } catch (e) {
      setMessages(m => [...m, { role: 'bot', text: `Error: ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (autopilot) {
      setMessages(m => [...m, { role: 'bot', text: '🚀 Autopilot engaged — running discovery + clone cycles every 90s. I\'ll keep building the database autonomously.' }]);
      runCycle(true);
      apRef.current = setInterval(() => { if (!busyRef.current) runCycle(true).then(() => setApCount(c => c + 1)); }, 90000);
    } else if (apRef.current) {
      clearInterval(apRef.current);
      apRef.current = null;
      setMessages(m => [...m, { role: 'bot', text: '⏸ Autopilot stopped.' }]);
    }
    return () => { if (apRef.current) clearInterval(apRef.current); };
    // eslint-disable-next-line
  }, [autopilot]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--db-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 16px', borderBottom: '1px solid var(--db-border)' }}>
        <Sparkles size={15} color="var(--db-accent)" />
        <b style={{ fontSize: 13, flex: 1, color: 'var(--db-text)' }}>Autonomous Assistant</b>
        {autopilot && <span style={{ fontSize: 10, color: 'var(--db-accent)', fontWeight: 700 }}>{apCount} cycles</span>}
        <button type="button" onClick={onRetract} title="Retract chat" style={{ background: 'transparent', border: 0, color: 'var(--db-muted)', cursor: 'pointer', padding: 4 }}><ChevronRight size={16} /></button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 11 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            background: m.role === 'user' ? 'var(--db-accent)' : (m.action ? 'var(--db-accent-soft)' : 'var(--db-surface-2)'),
            color: m.role === 'user' ? 'var(--db-accent-fg)' : 'var(--db-text)',
            padding: '10px 13px', borderRadius: 10, fontSize: 13, lineHeight: 1.5,
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%'
          }}>{m.text}</div>
        ))}
        {busy && <div style={{ color: 'var(--db-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Loader2 size={13} className="animate-spin" /> Working…</div>}
      </div>
      <div style={{ display: 'flex', gap: 7, padding: '10px 12px', borderTop: '1px solid var(--db-border)' }}>
        <button type="button" onClick={() => runCycle()} disabled={busy} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', background: 'var(--db-surface-2)', color: 'var(--db-text)', border: '1px solid var(--db-border)', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}><Zap size={12} /> Run Cycle</button>
        <button type="button" onClick={() => setAutopilot(a => !a)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', background: autopilot ? 'var(--db-accent)' : 'var(--db-surface-2)', color: autopilot ? 'var(--db-accent-fg)' : 'var(--db-text)', border: autopilot ? 'none' : '1px solid var(--db-border)', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}><Power size={12} /> {autopilot ? 'Autopilot On' : 'Autopilot'}</button>
      </div>
      <form onSubmit={send} style={{ display: 'flex', borderTop: '1px solid var(--db-border)' }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask or command the system…" style={{ flex: 1, background: 'var(--db-bg)', border: 0, color: 'var(--db-text)', padding: '12px 14px', fontSize: 13, outline: 'none' }} />
        <button type="submit" disabled={busy} style={{ width: 46, background: 'var(--db-accent)', color: 'var(--db-accent-fg)', border: 0, cursor: 'pointer' }}><Send size={15} /></button>
      </form>
    </div>
  );
}