import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import { Loader2, ShieldCheck, Sparkles, Rocket, Check, X, AlertTriangle, Image as ImageIcon, Globe, ArrowRight } from 'lucide-react';

export default function RebrandStudio() {
  const { user } = useAuth();
  const [clones, setClones] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [auditing, setAuditing] = useState(null);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);
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

  async function runAudit(clone) {
    setAuditing(clone.id);
    setError('');
    try {
      const res = await base44.functions.invoke('detectMandatoryChanges', { clone_id: clone.id });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      await load();
      setActive(d.project);
    } catch (e) { setError(e.message); }
    finally { setAuditing(null); }
  }

  async function applyMinimal() {
    setApplying(true); setError(''); setApplyResult(null);
    try {
      const res = await base44.functions.invoke('applyMinimalRebrand', { rebrand_project_id: active.id });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setApplyResult(d);
      setActive(d.project);
      await load();
    } catch (e) { setError(e.message); }
    finally { setApplying(false); }
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}><Loader2 className="animate-spin" /></div>;

  return (
    <>
      <XtremeOSSidebar />
      <div className="portal-page xtremeos-content" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240 }}>
        <div style={{ background: 'radial-gradient(circle at 82% 40%, #C89B3C45, transparent 25%), #0a0a0a', color: '#fff', padding: '36px 28px', margin: '-28px -28px 24px' }}>
          <p style={{ color: '#E7C86E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>Minimal-Change Rebrand Engine</p>
          <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 42, margin: '8px 0 4px', letterSpacing: '-.03em' }}>Rebrand <span style={{ color: '#E7C86E' }}>Studio</span></h1>
          <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>Keep the clone faithful to the original. Detect only what legally must change. Apply the bare minimum of swaps. Deploy.</p>
        </div>

        {error && <div style={{ marginBottom: 13, padding: 14, borderRadius: 8, background: '#f5d8d5', border: '1px solid #C63D34', color: '#a52d23', fontSize: 13 }}>{error}</div>}

        {!active ? (
          <>
            <Section title="1 · Select a clone to audit" sub="Only deployed clones with a Vercel URL can be scanned.">
              {clones.length === 0 ? <Empty text="No deployed clones found." /> : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {clones.map(c => (
                    <div key={c.id} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <b style={{ fontSize: 14 }}>{c.project_name}</b>
                        <div style={{ fontSize: 12, color: '#888', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.vercel_deployment_url || c.metadata?.vercel_deployment_url}</div>
                      </div>
                      <button onClick={() => runAudit(c)} disabled={auditing === c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0a0a0a', color: '#E7C86E', border: 0, borderRadius: 6, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {auditing === c.id ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                        {auditing === c.id ? 'Detecting…' : 'Detect Mandatory Changes'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {projects.length > 0 && (
              <Section title="Existing rebrand projects" sub="Resume or review a previous detection.">
                <div style={{ display: 'grid', gap: 8 }}>
                  {projects.map(p => (
                    <div key={p.id} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div>
                        <b style={{ fontSize: 14 }}>{p.target_brand || p.recommended_business_name || p.source_clone_name || 'Untitled'}</b>
                        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{p.source_url} · <StatusBadge status={p.status} /></div>
                      </div>
                      <button onClick={() => { setActive(p); setApplyResult(null); }} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>Open</button>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        ) : (
          <ProjectView
            project={active}
            applying={applying}
            applyResult={applyResult}
            onApply={applyMinimal}
            onBack={() => { setActive(null); setApplyResult(null); }}
          />
        )}
      </div>
    </>
  );
}

function ProjectView({ project, applying, applyResult, onApply, onBack }) {
  const p = project;
  const swaps = p.mandatory_swaps || [];
  const imgSwaps = (p.images_to_replace || []).filter(i => !i.is_logo);
  const logoSwap = (p.images_to_replace || []).find(i => i.is_logo);
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>← Back</button>
        <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22 }}>{p.source_clone_name || 'Clone'}</b>
        <StatusBadge status={p.status} />
        <span style={{ fontSize: 12, color: '#888' }}>→ <b style={{ color: '#237A4B' }}>{p.target_brand || 'Lead Gen Near You'}</b></span>
      </div>

      {/* Summary */}
      <Section title="Detection Summary" sub="Only legally-must-change items — everything else stays faithful to the original">
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 18 }}>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: '#333', margin: 0 }}>{p.audit_summary}</p>
        </div>
      </Section>

      {/* Mandatory swaps diff */}
      {swaps.length > 0 && (
        <Section title={`Mandatory Text Swaps (${swaps.length})`} sub="Exact find → replace. Applied verbatim to the clone HTML.">
          <div style={{ display: 'grid', gap: 8 }}>
            {swaps.map((s, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <code style={{ background: '#f5d8d5', color: '#a52d23', padding: '5px 10px', borderRadius: 6, fontSize: 12, flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{s.find}</code>
                  <ArrowRight size={16} style={{ color: '#C89B3C', flexShrink: 0 }} />
                  <code style={{ background: '#e8f5ec', color: '#237A4B', padding: '5px 10px', borderRadius: 6, fontSize: 12, flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{s.replace}</code>
                </div>
                <p style={{ fontSize: 11, color: '#999', margin: '6px 0 0' }}>{s.reason}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Image swaps */}
      {p.images_to_replace?.length > 0 && (
        <Section title={`Image Swaps (${p.images_to_replace.length})`} sub="Only branded/copyrighted images — generic stock photos are left alone">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {logoSwap && (
              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ height: 120, display: 'grid', placeItems: 'center', background: '#0B1120' }}>
                  <svg width="40" height="48" viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg"><path d="M20 0C9 0 0 9 0 20c0 14 20 28 20 28s20-14 20-28C40 9 31 0 20 0z" fill="#0B1120"/><g transform="translate(20 20)"><path d="M0 0 L0 -10 A10 10 0 0 1 10 0 Z" fill="#E7C86E"/><path d="M0 0 L10 0 A10 10 0 0 1 0 10 Z" fill="#059669"/><path d="M0 0 L0 10 A10 10 0 0 1 -10 0 Z" fill="#2563EB"/><path d="M0 0 L-10 0 A10 10 0 0 1 0 -10 Z" fill="#DC2626"/><circle cx="0" cy="0" r="2.2" fill="#fff"/></g></svg>
                </div>
                <div style={{ padding: 10 }}>
                  <b style={{ fontSize: 12, color: '#237A4B' }}>Logo → LGNY pinwheel</b>
                  <p style={{ fontSize: 11, color: '#999', margin: '4px 0 0' }}>{logoSwap.reason}</p>
                </div>
              </div>
            )}
            {imgSwaps.map((img, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
                {img.url && <img src={img.url} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', background: '#f0f0f0' }} onError={e => e.target.style.display = 'none'} />}
                <div style={{ padding: 10 }}>
                  <p style={{ fontSize: 12, color: '#555', margin: '0 0 4px' }}>{img.reason}</p>
                  <p style={{ fontSize: 11, color: '#999', margin: 0 }}>{img.replacement_prompt}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Apply & Deploy */}
      {p.status === 'audited' && (
        <Section title="2 · Apply Minimal Changes & Deploy" sub="Applies only the swaps above to the original clone HTML, then deploys to Vercel">
          <button onClick={onApply} disabled={applying} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', border: 0, borderRadius: 8, padding: '13px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {applying ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
            {applying ? 'Applying minimal changes & deploying…' : 'Apply Bare-Minimum Swaps & Deploy'}
          </button>
        </Section>
      )}

      {/* Result */}
      {applyResult && (
        <Section title="3 · Deployed" sub="Faithful to the original — only mandatory swaps applied">
          <div style={{ background: '#e8f5ec', border: '1px solid #237A4B', borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Check size={18} style={{ color: '#237A4B' }} />
              <b style={{ fontSize: 14, color: '#237A4B' }}>{applyResult.applied_swaps} text swaps applied · {applyResult.image_swaps} image swaps</b>
            </div>
            {applyResult.missed_swaps?.length > 0 && (
              <p style={{ fontSize: 11, color: '#B88214', margin: '0 0 6px' }}>{applyResult.missed_swaps.length} swaps skipped (exact string not found in HTML): {applyResult.missed_swaps.join(' · ')}</p>
            )}
            {applyResult.deploy_url && (
              <a href={applyResult.deploy_url} target="_blank" rel="noopener" style={{ display: 'inline-block', marginTop: 4, padding: '10px 20px', background: '#0a0a0a', color: '#E7C86E', borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                <Globe size={14} style={{ display: 'inline', marginRight: 6 }} />View Live Rebranded Site ↗
              </a>
            )}
          </div>
          {applyResult.deploy_url && (
            <div style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', height: 500, background: '#fff' }}>
              <iframe src={applyResult.deploy_url} title="Rebranded clone preview" style={{ width: '100%', height: '100%', border: 0 }} />
            </div>
          )}
        </Section>
      )}
    </>
  );
}

function Section({ title, sub, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 10 }}>
        <b style={{ fontSize: 15, fontFamily: "'Libre Caslon Display', serif" }}>{title}</b>
        {sub && <span style={{ fontSize: 12, color: '#999', marginLeft: 10 }}>{sub}</span>}
      </div>
      {children}
    </div>
  );
}
function StatusBadge({ status }) {
  const colors = { audited: '#2563eb', generating_assets: '#B88214', ready: '#7c3aed', approved: '#059669', provisioning: '#B88214', completed: '#237A4B', failed: '#C63D34', draft: '#999' };
  return <span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: colors[status] || '#999', background: (colors[status] || '#999') + '22', padding: '2px 8px', borderRadius: 12 }}>{status}</span>;
}
function Empty({ text }) { return <div style={{ padding: 30, textAlign: 'center', color: '#999', fontSize: 13 }}>{text}</div>; }