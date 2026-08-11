import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import { Loader2, Globe, Rocket, Plus, ExternalLink, CheckCircle2, AlertTriangle, RefreshCw, Zap } from 'lucide-react';

const DEFAULT_LOGO = 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/20de672b0_ChatGPTImageAug9202611_49_11PM.png';
const ACCENT_PRESETS = ['#CCFF00', '#22D3EE', '#A78BFA', '#F472B6', '#FB923C', '#34D399'];

export default function MultiSiteManager() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [connecting, setConnecting] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // form state
  const [brandName, setBrandName] = useState('');
  const [domain, setDomain] = useState('');
  const [accent, setAccent] = useState('#CCFF00');
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);
  const [tagline, setTagline] = useState('');
  const [connectDomain, setConnectDomain] = useState(false);

  useEffect(() => { loadSites(); }, []);

  async function loadSites() {
    setLoading(true);
    try {
      const list = await base44.entities.MultiSite.list('-created_date', 100).catch(() => []);
      setSites(list || []);
    } finally { setLoading(false); }
  }

  async function deploy() {
    if (!brandName.trim()) { setError('Brand name is required'); return; }
    setDeploying(true); setError(''); setSuccess('');
    try {
      const r = await base44.functions.invoke('deployLgnySite', {
        brand_name: brandName.trim(),
        domain: domain.trim() || undefined,
        accent_color: accent,
        logo_url: logoUrl || DEFAULT_LOGO,
        tagline: tagline.trim() || undefined,
        connect_domain: connectDomain && domain.trim(),
      });
      const d = r.data || r;
      if (d.error) throw new Error(d.error);
      setSuccess(`Site deployed! Vercel URL: ${d.vercel_url}`);
      setBrandName(''); setDomain(''); setTagline('');
      setConnectDomain(false);
      loadSites();
    } catch (e) {
      setError(e.message || 'Deploy failed');
    } finally { setDeploying(false); }
  }

  async function handleConnectDomain(site) {
    setConnecting(site.id); setError('');
    try {
      const r = await base44.functions.invoke('assignVercelDomain', {
        launch_project_id: site.launch_project_id,
        domain: site.domain,
      });
      const d = r.data || r;
      if (d.error) throw new Error(d.error);
      await base44.entities.MultiSite.update(site.id, {
        domain_status: 'pending_dns',
        domain_verification: d.verification || null,
      });
      setSuccess(`Domain ${site.domain} connected! Add the DNS records at your registrar.`);
      loadSites();
    } catch (e) {
      setError(e.message || 'Domain connection failed');
    } finally { setConnecting(null); }
  }

  return (
    <>
      <XtremeOSSidebar />
      <div className="portal-page xtremeos-content" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240 }}>
        {/* Hero */}
        <div style={{ background: 'radial-gradient(circle at 82% 40%, #CCFF0030, transparent 25%), #000', color: '#fff', padding: '40px 28px', margin: '-28px -28px 24px' }}>
          <p style={{ color: '#CCFF00', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>Multi-Site Deployment Engine</p>
          <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 42, margin: '10px 0 6px', letterSpacing: '-.03em' }}>Multi-Site <span style={{ color: '#CCFF00' }}>Manager</span></h1>
          <p style={{ color: '#aaa', fontSize: 14, margin: 0, maxWidth: 640 }}>Spin up branded copies of your marketing site across unlimited domains. Each site deploys as a standalone Vercel project with its own branding, accent color, and custom domain.</p>
        </div>

        {error && <div style={{ background: '#f5d8d5', color: '#a52d23', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 0, color: '#a52d23', fontWeight: 700, cursor: 'pointer' }}>✕</button>
        </div>}
        {success && <div style={{ background: '#d4edda', color: '#237A4B', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{success}</span>
          <button onClick={() => setSuccess('')} style={{ background: 'none', border: 0, color: '#237A4B', fontWeight: 700, cursor: 'pointer' }}>✕</button>
        </div>}

        {/* Deploy form */}
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#CCFF00', display: 'grid', placeItems: 'center' }}>
              <Plus size={20} style={{ color: '#000' }} />
            </div>
            <div>
              <b style={{ fontSize: 18, fontFamily: "'Libre Caslon Display', serif" }}>Deploy a New Site</b>
              <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Configure branding and launch a standalone copy to Vercel</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Brand Name *</label>
              <input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Lead Generation Near Me"
                style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Custom Domain</label>
              <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="leadgenerationnearme.com"
                style={inputStyle} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Tagline (hero subtitle)</label>
              <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="All the tools you need to capture, nurture and close leads…"
                style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Accent Color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {ACCENT_PRESETS.map(c => (
                  <button key={c} onClick={() => setAccent(c)} style={{
                    width: 32, height: 32, borderRadius: 8, background: c, border: accent === c ? '3px solid #000' : '1px solid #ddd', cursor: 'pointer',
                  }} />
                ))}
                <input type="color" value={accent} onChange={e => setAccent(e.target.value)} style={{ width: 40, height: 32, border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Logo URL</label>
              <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://…" style={inputStyle} />
            </div>
          </div>

          {domain.trim() && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={connectDomain} onChange={e => setConnectDomain(e.target.checked)} />
              Connect <b>{domain}</b> to this Vercel project now (you'll need to add DNS records at your registrar)
            </label>
          )}

          <button onClick={deploy} disabled={deploying} style={{
            marginTop: 20, display: 'flex', alignItems: 'center', gap: 8, padding: '14px 24px',
            background: deploying ? '#333' : '#000', color: '#CCFF00', border: 0, borderRadius: 8,
            fontWeight: 700, fontSize: 14, cursor: deploying ? 'wait' : 'pointer',
          }}>
            {deploying ? <Loader2 size={18} className="animate-spin" /> : <Rocket size={18} />}
            {deploying ? 'Deploying…' : 'Deploy Site'}
          </button>
        </div>

        {/* Sites list */}
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 18 }}>Your Sites ({sites.length})</b>
          <button onClick={loadSites} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: '#666' }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {loading ? <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="animate-spin" style={{ color: '#CCFF00' }} /></div> :
         sites.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 13, background: '#fff', border: '1px solid #ddd', borderRadius: 10 }}>No sites deployed yet. Configure branding above and click Deploy.</div> :
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
           {sites.map(s => <SiteCard key={s.id} s={s} onConnect={handleConnectDomain} connecting={connecting === s.id} />)}
         </div>}
      </div>
    </>
  );
}

const inputStyle = {
  width: '100%', padding: '12px 14px', border: '1px solid #d7d7d7', borderRadius: 8,
  fontSize: 14, background: '#fff', color: '#111', outline: 'none',
};

function SiteCard({ s, onConnect, connecting }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden' }}>
      {/* Preview bar */}
      <div style={{ height: 8, background: s.accent_color || '#CCFF00' }} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <img src={s.logo_url} alt="" style={{ width: 28, height: 33, borderRadius: 4 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <b style={{ fontSize: 14, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.brand_name}</b>
            {s.domain && <small style={{ fontSize: 11, color: '#888' }}>{s.domain}</small>}
          </div>
          <StatusBadge s={s} />
        </div>

        {s.vercel_url && (
          <a href={s.vercel_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#2563eb', marginBottom: 10, wordBreak: 'break-all' }}>
            <Globe size={13} /> {s.vercel_url} <ExternalLink size={11} />
          </a>
        )}

        {s.error && <div style={{ fontSize: 11, color: '#a52d23', background: '#f5d8d5', padding: 8, borderRadius: 6, marginBottom: 10 }}>{s.error}</div>}

        {s.domain && s.domain_status !== 'connected' && s.launch_project_id && (
          <button onClick={() => onConnect(s)} disabled={connecting} style={{
            display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '10px',
            background: connecting ? '#eee' : '#000', color: connecting ? '#666' : '#CCFF00',
            border: 0, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: connecting ? 'wait' : 'pointer',
          }}>
            {connecting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {connecting ? 'Connecting…' : `Connect ${s.domain}`}
          </button>
        )}

        {s.domain_status === 'pending_dns' && s.domain_verification && (
          <div style={{ marginTop: 10, padding: 10, background: '#f8e5ce', borderRadius: 6, fontSize: 11, color: '#a85c00' }}>
            <b>DNS records needed:</b>
            {s.domain_verification.a_record && <div>A: {s.domain_verification.a_record.value}</div>}
            {s.domain_verification.cname_record && <div>CNAME: {s.domain_verification.cname_record.value}</div>}
            <div style={{ marginTop: 4 }}>Add these at your registrar, then wait for DNS to propagate.</div>
          </div>
        )}

        {s.domain_status === 'connected' && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#237A4B' }}>
            <CheckCircle2 size={14} /> Domain connected
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ s }) {
  const map = {
    live: { bg: '#d4edda', color: '#237A4B', label: 'Live' },
    deploying: { bg: '#f8e5ce', color: '#a85c00', label: 'Deploying' },
    queued: { bg: '#e8e8e8', color: '#666', label: 'Queued' },
    failed: { bg: '#f5d8d5', color: '#a52d23', label: 'Failed' },
  };
  const st = map[s.status] || map.queued;
  return <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: st.bg, color: st.color, padding: '3px 8px', borderRadius: 12, flexShrink: 0 }}>{st.label}</span>;
}