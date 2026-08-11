import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import { Loader2, ShieldCheck, Sparkles, Rocket, Check, X, AlertTriangle, Image as ImageIcon, FileText, Globe, Database, GitBranch, Cloud, Search } from 'lucide-react';

export default function RebrandStudio() {
  const { user } = useAuth();
  const [clones, setClones] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null); // active RebrandProject
  const [auditing, setAuditing] = useState(null); // clone id being audited
  const [generating, setGenerating] = useState(false);
  const [executing, setExecuting] = useState(false);
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
      const res = await base44.functions.invoke('legalAuditClone', { clone_id: clone.id });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      await load();
      setActive(d.project);
    } catch (e) { setError(e.message); }
    finally { setAuditing(null); }
  }

  async function generateAssets() {
    setGenerating(true); setError('');
    try {
      const res = await base44.functions.invoke('generateRebrandAssets', { rebrand_project_id: active.id });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setActive(d.project);
    } catch (e) { setError(e.message); }
    finally { setGenerating(false); }
  }

  async function approveAndProvision() {
    setExecuting(true); setError('');
    try {
      await base44.entities.RebrandProject.update(active.id, { approval_state: 'approved' });
      const res = await base44.functions.invoke('executeRebrand', { rebrand_project_id: active.id });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setActive(d.project);
      await load();
    } catch (e) { setError(e.message); }
    finally { setExecuting(false); }
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}><Loader2 className="animate-spin" /></div>;

  return (
    <>
      <XtremeOSSidebar />
      <div className="portal-page xtremeos-content" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240 }}>
        <div style={{ background: 'radial-gradient(circle at 82% 40%, #C89B3C45, transparent 25%), #0a0a0a', color: '#fff', padding: '36px 28px', margin: '-28px -28px 24px' }}>
          <p style={{ color: '#E7C86E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>Legal-Safe Rebrand Engine</p>
          <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 42, margin: '8px 0 4px', letterSpacing: '-.03em' }}>Rebrand <span style={{ color: '#E7C86E' }}>Studio</span></h1>
          <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>Scan a clone for legally-must-change items → generate safe replacements → approve → auto-provision Drive, GitHub, Vercel, Supabase, domain & SEO/AEO.</p>
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
                        {auditing === c.id ? 'Auditing…' : 'Run Legal Audit'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {projects.length > 0 && (
              <Section title="Existing rebrand projects" sub="Resume or review a previous audit.">
                <div style={{ display: 'grid', gap: 8 }}>
                  {projects.map(p => (
                    <div key={p.id} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div>
                        <b style={{ fontSize: 14 }}>{p.recommended_business_name || p.source_clone_name || 'Untitled'}</b>
                        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{p.source_url} · <StatusBadge status={p.status} /></div>
                      </div>
                      <button onClick={() => setActive(p)} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>Open</button>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        ) : (
          <ProjectView
            project={active}
            generating={generating}
            executing={executing}
            onGenerate={generateAssets}
            onApprove={approveAndProvision}
            onBack={() => { setActive(null); }}
          />
        )}
      </div>
    </>
  );
}

function ProjectView({ project, generating, executing, onGenerate, onApprove, onBack }) {
  const p = project;
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={onBack} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>← Back</button>
        <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22 }}>{p.recommended_business_name || p.source_clone_name}</b>
        <StatusBadge status={p.status} />
      </div>

      {/* Summary */}
      <Section title="Audit Summary" sub="Single-page legal audit + rebrand recommendation">
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 18 }}>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: '#333', margin: 0 }}>{p.audit_summary}</p>
        </div>
      </Section>

      {/* Legal issues */}
      {p.legal_issues?.length > 0 && (
        <Section title={`Legal Issues (${p.legal_issues.length})`} sub="Only items that absolutely must change">
          <div style={{ display: 'grid', gap: 8 }}>
            {p.legal_issues.map((li, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #ddd', borderLeft: `4px solid ${sevColor(li.severity)}`, borderRadius: 8, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <b style={{ fontSize: 13 }}>{li.type}</b>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: sevColor(li.severity) }}>{li.severity}</span>
                </div>
                <p style={{ fontSize: 13, color: '#555', margin: '0 0 6px' }}>{li.description}</p>
                {li.location && <p style={{ fontSize: 11, color: '#999', margin: '0 0 6px' }}>📍 {li.location}</p>}
                <p style={{ fontSize: 13, color: '#237A4B', margin: 0 }}>→ {li.recommendation}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Recommendations */}
      <Section title="Brand Recommendations" sub="New legally-safe identity">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          <RecCard label="Business Name" value={p.recommended_business_name} />
          <RecCard label="URL Slug" value={p.recommended_url} />
          <RecCard label="Domain" value={p.recommended_domain} />
        </div>
        {p.brand_references?.length > 0 && (
          <div style={{ marginTop: 10, padding: 12, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8 }}>
            <b style={{ fontSize: 12, color: '#9a3412' }}><AlertTriangle size={12} style={{ display: 'inline', marginRight: 4 }} />Brand references that must NOT appear:</b>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>{p.brand_references.map((b, i) => <span key={i} style={{ fontSize: 11, background: '#fff', border: '1px solid #fed7aa', padding: '3px 8px', borderRadius: 12 }}>{b}</span>)}</div>
          </div>
        )}
      </Section>

      {/* Images to replace */}
      {p.images_to_replace?.length > 0 && (
        <Section title={`Images to Replace (${p.images_to_replace.length})`} sub="Copyrighted/branded images flagged for replacement">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {p.images_to_replace.map((img, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
                {img.url && <img src={img.url} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', background: '#f0f0f0' }} onError={e => e.target.style.display = 'none'} />}
                <div style={{ padding: 10 }}>
                  <p style={{ fontSize: 12, color: '#555', margin: '0 0 4px' }}>{img.reason}</p>
                  {img.replacement_url && <p style={{ fontSize: 11, color: '#237A4B', margin: 0 }}>✓ Replacement generated</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Content to replace */}
      {p.content_to_replace?.length > 0 && (
        <Section title={`Content to Replace (${p.content_to_replace.length})`} sub="Proprietary copy that must be rewritten">
          <div style={{ display: 'grid', gap: 8 }}>
            {p.content_to_replace.map((c, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: 12, color: '#a52d23', margin: '0 0 4px' }}><s>{c.text}</s></p>
                <p style={{ fontSize: 11, color: '#999', margin: '0 0 6px' }}>{c.reason}</p>
                <p style={{ fontSize: 13, color: '#237A4B', margin: 0 }}>→ {c.suggested_replacement}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Generate replacements */}
      {p.status === 'audited' && (
        <Section title="2 · Generate Replacements" sub="Logo, images & copy generated by AI">
          <button onClick={onGenerate} disabled={generating} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', border: 0, borderRadius: 8, padding: '13px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {generating ? 'Generating assets…' : 'Generate Logo, Images & Copy'}
          </button>
        </Section>
      )}

      {/* Generated assets */}
      {p.status !== 'audited' && p.generated_logo_url && (
        <Section title="Generated Replacements" sub="AI-generated safe replacements">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 12, textAlign: 'center' }}>
              <small style={{ fontSize: 10, textTransform: 'uppercase', color: '#999' }}>Logo</small>
              <img src={p.generated_logo_url} alt="logo" style={{ width: '100%', maxHeight: 100, objectFit: 'contain', marginTop: 6 }} />
            </div>
            {p.generated_images?.map((u, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <small style={{ fontSize: 10, textTransform: 'uppercase', color: '#999' }}>Image {i + 1}</small>
                <img src={u} alt="" style={{ width: '100%', maxHeight: 100, objectFit: 'cover', marginTop: 6, borderRadius: 4 }} />
              </div>
            ))}
          </div>
          {p.generated_content && (
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 14 }}>
              <b style={{ fontSize: 13 }}>Generated Copy</b>
              {Object.entries(p.generated_content).map(([k, v]) => (
                <div key={k} style={{ marginTop: 8 }}>
                  <small style={{ fontSize: 10, textTransform: 'uppercase', color: '#C89B3C', fontWeight: 700 }}>{k.replace(/_/g, ' ')}</small>
                  <p style={{ fontSize: 13, color: '#333', margin: '2px 0 0' }}>{v}</p>
                </div>
              ))}
            </div>
          )}
          {p.rebrand_html && (
            <div style={{ marginTop: 12, border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', height: 400, background: '#fff' }}>
              <iframe srcDoc={p.rebrand_html} title="Rebrand preview" style={{ width: '100%', height: '100%', border: 0 }} />
            </div>
          )}
        </Section>
      )}

      {/* Approve & provision */}
      {p.status === 'ready' && (
        <Section title="3 · Approve & Provision" sub="Auto-creates Drive, GitHub, Vercel, Supabase, domain & SEO/AEO">
          <button onClick={onApprove} disabled={executing} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0a0a0a', color: '#E7C86E', border: '1px solid #C89B3C', borderRadius: 8, padding: '13px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {executing ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
            {executing ? 'Provisioning… (this takes a minute)' : 'Approve & Auto-Provision Everything'}
          </button>
        </Section>
      )}

      {/* Provisioned resources */}
      {p.status === 'completed' && p.provisioned && (
        <Section title="Provisioned Resources" sub="Everything is live">
          <div style={{ display: 'grid', gap: 8 }}>
            <ProvRow icon={Cloud} label="Drive Folder" url={p.provisioned.drive_folder_url} />
            <ProvRow icon={GitBranch} label="GitHub Repo" url={p.provisioned.github_repo_url} />
            <ProvRow icon={Globe} label="Vercel Deploy" url={p.provisioned.vercel_deployment_url} />
            <ProvRow icon={Database} label="Supabase" url={p.provisioned.supabase_project_url} />
            <ProvRow icon={Globe} label="Domain" url={p.provisioned.domain_purchased ? `https://${p.provisioned.domain_name}` : null} value={p.provisioned.domain_name} note={p.provisioned.domain_purchased ? 'Assigned' : 'Purchase/verify DNS in Vercel dashboard to complete'} />
          </div>
          {p.seo_aeo_report?.generated_tags && (
            <div style={{ marginTop: 12, background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 14 }}>
              <b style={{ fontSize: 13 }}><Search size={14} style={{ display: 'inline', marginRight: 4, color: '#C89B3C' }} />SEO / AEO Optimization</b>
              <p style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{p.seo_aeo_report.aeo_note}</p>
              <pre style={{ fontSize: 10, background: '#f7f7f5', padding: 10, borderRadius: 6, marginTop: 8, overflow: 'auto', maxHeight: 200 }}>{JSON.stringify(p.seo_aeo_report.generated_tags, null, 2)}</pre>
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
function RecCard({ label, value }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
      <small style={{ fontSize: 10, textTransform: 'uppercase', color: '#999', fontWeight: 700 }}>{label}</small>
      <b style={{ fontSize: 14, display: 'block', marginTop: 4 }}>{value || '—'}</b>
    </div>
  );
}
function ProvRow({ icon: Icon, label, url, value, note }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
      <Icon size={18} style={{ color: '#C89B3C' }} />
      <div style={{ flex: 1 }}>
        <b style={{ fontSize: 13 }}>{label}</b>
        {url ? <a href={url} target="_blank" rel="noopener" style={{ fontSize: 12, color: '#C89B3C', display: 'block' }}>{url} ↗</a>
          : value ? <span style={{ fontSize: 12, color: '#666' }}>{value}</span>
          : <span style={{ fontSize: 12, color: '#999' }}>Skipped</span>}
        {note && <small style={{ fontSize: 11, color: '#B88214', display: 'block' }}>{note}</small>}
      </div>
    </div>
  );
}
function StatusBadge({ status }) {
  const colors = { audited: '#2563eb', generating_assets: '#B88214', ready: '#7c3aed', approved: '#059669', provisioning: '#B88214', completed: '#237A4B', failed: '#C63D34', draft: '#999' };
  return <span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: colors[status] || '#999', background: (colors[status] || '#999') + '22', padding: '2px 8px', borderRadius: 12 }}>{status}</span>;
}
function Empty({ text }) { return <div style={{ padding: 30, textAlign: 'center', color: '#999', fontSize: 13 }}>{text}</div>; }
function sevColor(s) { return { critical: '#C63D34', high: '#B88214', medium: '#7e6b00', low: '#237A4B' }[s] || '#999'; }