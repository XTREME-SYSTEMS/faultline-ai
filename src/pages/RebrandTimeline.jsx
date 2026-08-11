import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import { Loader2, Rocket, Check, X, AlertTriangle, Globe, Palette, Sparkles, Clock, ArrowRight } from 'lucide-react';

const ACCENT_PRESETS = [
  { name: 'Gold', value: '#C89B3C' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Violet', value: '#7C3AED' },
  { name: 'Rose', value: '#E11D48' },
  { name: 'Amber', value: '#D97706' },
  { name: 'Teal', value: '#0D9488' },
  { name: 'Indigo', value: '#4F46E5' },
];

const STATUS_META = {
  pending: { color: '#999', label: 'Pending' },
  in_progress: { color: '#B88214', label: 'In Progress' },
  done: { color: '#237A4B', label: 'Done' },
  skipped: { color: '#666', label: 'Skipped' },
  failed: { color: '#C63D34', label: 'Failed' },
};

export default function RebrandTimeline() {
  const { user } = useAuth();
  const [clones, setClones] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceUrl, setSourceUrl] = useState('');
  const [targetBrand, setTargetBrand] = useState('Lead Gen Near You');
  const [accent, setAccent] = useState('#C89B3C');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [active, setActive] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try {
      const [projs, launches] = await Promise.all([
        base44.entities.RebrandProject.list('-created_date', 100).catch(() => []),
        base44.entities.LaunchProject.list('-created_date', 200).catch(() => []),
      ]);
      setProjects(projs || []);
      setClones((launches || []).filter(p => p.vercel_deployment_url || p.metadata?.vercel_deployment_url));
    } finally { setLoading(false); }
  }

  async function runAutonomous() {
    setRunning(true); setError(''); setResult(null);
    try {
      const res = await base44.functions.invoke('autonomousRebrand', {
        source_url: sourceUrl || undefined,
        clone_id: undefined,
        target_brand: targetBrand,
        accent_color: accent,
      });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setResult(d);
      setActive(d.project);
      await load();
    } catch (e) { setError(e.message); }
    finally { setRunning(false); }
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}><Loader2 className="animate-spin" /></div>;

  return (
    <>
      <XtremeOSSidebar />
      <div className="portal-page xtremeos-content" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240 }}>
        <div style={{ background: 'radial-gradient(circle at 82% 40%, #C89B3C45, transparent 25%), #0a0a0a', color: '#fff', padding: '36px 28px', margin: '-28px -28px 24px' }}>
          <p style={{ color: accent, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>Autonomous Rebrand Timeline</p>
          <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 42, margin: '8px 0 4px', letterSpacing: '-.03em' }}>Mandatory Changes <span style={{ color: accent }}>Studio</span></h1>
          <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>The 12 legally-must-change elements, logged in your system. Pick a clone, set your accent color, and run the fully autonomous rebrand — generators + AI handle every element systematically.</p>
        </div>

        {error && <div style={{ marginBottom: 13, padding: 14, borderRadius: 8, background: '#f5d8d5', border: '1px solid #C63D34', color: '#a52d23', fontSize: 13 }}>{error}</div>}

        {/* Control panel */}
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 20, marginBottom: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 6 }}>Source clone URL</label>
              <input className="fl-input" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://your-clone.vercel.app" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 6 }}>Target brand name</label>
              <input className="fl-input" value={targetBrand} onChange={e => setTargetBrand(e.target.value)} />
            </div>
          </div>

          {/* Quick-pick deployed clones */}
          {clones.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 6 }}>Or pick a deployed clone</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {clones.slice(0, 8).map(c => (
                  <button key={c.id} onClick={() => setSourceUrl(c.vercel_deployment_url || c.metadata?.vercel_deployment_url)}
                    style={{ padding: '7px 12px', fontSize: 12, background: sourceUrl === (c.vercel_deployment_url || c.metadata?.vercel_deployment_url) ? accent : '#f3f0ea', color: sourceUrl === (c.vercel_deployment_url || c.metadata?.vercel_deployment_url) ? '#fff' : '#333', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>
                    {c.project_name?.slice(0, 24)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Accent color picker */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#555', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><Palette size={13} /> Accent color <span style={{ color: '#999', fontWeight: 400 }}>(updates logo, buttons, links, brand colors across all assets)</span></label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {ACCENT_PRESETS.map(p => (
                <button key={p.value} onClick={() => setAccent(p.value)} title={p.name}
                  style={{ width: 34, height: 34, borderRadius: '50%', background: p.value, border: accent === p.value ? '3px solid #111' : '2px solid #ddd', cursor: 'pointer', position: 'relative' }}>
                  {accent === p.value && <Check size={14} style={{ color: '#fff', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />}
                </button>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
                <input type="color" value={accent} onChange={e => setAccent(e.target.value)} style={{ width: 38, height: 34, border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                <code style={{ fontSize: 12, background: '#f3f0ea', padding: '6px 10px', borderRadius: 6 }}>{accent}</code>
              </div>
            </div>
          </div>

          <button onClick={runAutonomous} disabled={running || !sourceUrl}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: accent, color: '#fff', border: 0, borderRadius: 8, padding: '13px 24px', fontSize: 14, fontWeight: 700, cursor: running || !sourceUrl ? 'not-allowed' : 'pointer', opacity: running || !sourceUrl ? 0.6 : 1 }}>
            {running ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
            {running ? 'Running autonomous rebrand…' : 'Run Fully Autonomous Rebrand'}
          </button>
        </div>

        {/* The 12-element timeline */}
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 20, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Clock size={16} style={{ color: accent }} />
            <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 18 }}>The 12 Mandatory Change Elements</b>
            <span style={{ fontSize: 12, color: '#999' }}>— logged in your system as the canonical rebrand checklist</span>
          </div>
          <div style={{ display: 'grid', gap: 0 }}>
            {(active?.mandatory_elements || MANDATORY_ELEMENTS_FALLBACK).map((el, i) => {
              const status = el.status || 'pending';
              const meta = STATUS_META[status] || STATUS_META.pending;
              return (
                <div key={el.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 14, alignItems: 'flex-start', padding: '14px 0', borderBottom: i < 11 ? '1px solid #f0ede5' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: status === 'done' ? meta.color : '#fff', border: `2px solid ${status === 'done' ? meta.color : '#ddd'}`, color: status === 'done' ? '#fff' : meta.color, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    {status === 'done' ? <Check size={15} /> : status === 'failed' ? <X size={15} /> : i + 1}
                  </div>
                  <div>
                    <b style={{ fontSize: 14, display: 'block', marginBottom: 2 }}>{el.label}</b>
                    <p style={{ fontSize: 12, color: '#888', margin: 0, lineHeight: 1.5 }}>{el.action}</p>
                    {el.detail && <p style={{ fontSize: 11, color: meta.color, margin: '4px 0 0', fontWeight: 600 }}>{el.detail}</p>}
                  </div>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: meta.color, background: meta.color + '18', padding: '3px 10px', borderRadius: 12, whiteSpace: 'nowrap' }}>{meta.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Result */}
        {result?.deploy_url && (
          <div style={{ background: '#e8f5ec', border: '1px solid #237A4B', borderRadius: 10, padding: 16, marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Check size={18} style={{ color: '#237A4B' }} />
              <b style={{ fontSize: 14, color: '#237A4B' }}>Autonomous rebrand complete — all mandatory elements processed</b>
            </div>
            <a href={result.deploy_url} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4, padding: '10px 20px', background: '#0a0a0a', color: accent, borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              <Globe size={14} /> View Live Rebranded Site <ArrowRight size={14} />
            </a>
          </div>
        )}
        {result?.deploy_url && (
          <div style={{ border: '1px solid #ddd', borderRadius: 10, overflow: 'hidden', height: 520, background: '#fff' }}>
            <iframe src={result.deploy_url} title="Rebranded preview" style={{ width: '100%', height: '100%', border: 0 }} />
          </div>
        )}

        {/* Past runs */}
        {projects.length > 0 && !running && (
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 20, marginTop: 18 }}>
            <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 16 }}>Past rebrand projects</b>
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              {projects.slice(0, 10).map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
                  <div>
                    <b style={{ fontSize: 13 }}>{p.target_brand || 'Lead Gen Near You'}</b>
                    <div style={{ fontSize: 11, color: '#999' }}>{p.source_url}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {p.accent_color && <span style={{ width: 18, height: 18, borderRadius: '50%', background: p.accent_color, border: '1px solid #ddd' }} />}
                    <span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: p.status === 'completed' ? '#237A4B' : '#999' }}>{p.status}</span>
                    <button onClick={() => { setActive(p); setResult(p.provisioned?.vercel_deployment_url ? { deploy_url: p.provisioned.vercel_deployment_url } : null); }} style={{ padding: '6px 12px', fontSize: 12, background: '#fff', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>Open</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const MANDATORY_ELEMENTS_FALLBACK = [
  { id: 'business_name', label: 'Business Name', action: 'Replace with a name cleared for confusingly similar trademarks', status: 'pending' },
  { id: 'domain', label: 'Domain', action: 'Replace with the new brand domain', status: 'pending' },
  { id: 'logo', label: 'Logo / Trademark / Branded Icons', action: 'Replace', status: 'pending' },
  { id: 'tagline', label: 'Tagline / Distinctive Branding', action: 'Replace', status: 'pending' },
  { id: 'written_copy', label: 'Written Copy', action: 'Replace copied original text with independently written content', status: 'pending' },
  { id: 'photos', label: 'Photos / Artwork / Graphics / Video', action: 'Replace unless ownership/license is verified', status: 'pending' },
  { id: 'source_code', label: 'Exact Proprietary Source Code', action: 'Independently reimplement or verify license', status: 'pending' },
  { id: 'testimonials', label: 'Testimonials / Reviews / Case Studies', action: 'Replace with your own real ones', status: 'pending' },
  { id: 'customer_facts', label: 'Customer/Company-Specific Facts & Claims', action: 'Replace with verified facts for the new business', status: 'pending' },
  { id: 'contact_info', label: 'Contact Info / Emails / Addresses / Tracking IDs', action: 'Replace', status: 'pending' },
  { id: 'legal_pages', label: 'Privacy / Terms / Cookie Disclosures', action: 'Generate for what the new site actually does, then review', status: 'pending' },
  { id: 'overall_branding', label: 'Overall Branding', action: 'Transform further if the finished property could reasonably look like it comes from the original company', status: 'pending' },
];