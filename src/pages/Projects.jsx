import { useState, useEffect, useCallback } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import DesignPackUploader from '@/components/fl/DesignPackUploader';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';

const STATUS_META = {
  queued: { label: 'Queued', color: '#888', bg: '#eee' },
  provisioning: { label: 'Provisioning', color: '#8A641C', bg: '#C89B3C20' },
  generating: { label: 'Generating', color: '#8A641C', bg: '#C89B3C20' },
  validating: { label: 'Validating', color: '#8A641C', bg: '#C89B3C20' },
  testing: { label: 'Testing', color: '#8A641C', bg: '#C89B3C20' },
  retrying: { label: 'Retrying', color: '#B88214', bg: '#f8e5ce' },
  passed: { label: 'Passed 100/100', color: '#237A4B', bg: '#e6f4ec' },
  failed: { label: 'Failed', color: '#C63D34', bg: '#f5d8d5' }
};

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [designPackId, setDesignPackId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState({
    project_name: '', project_type: 'website',
    client_name: '', client_email: '', client_phone: '',
    business_name: '', industry: '', description: '', target_audience: '', tone: 'professional'
  });

  const loadProjects = useCallback(async () => {
    try {
      const data = await base44.entities.LaunchProject.list('-created_date', 50);
      setProjects(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProjects();
    const unsub = base44.entities.LaunchProject.subscribe(() => loadProjects());
    return unsub;
  }, [loadProjects]);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const createProject = async () => {
    setError('');
    if (!form.project_name || !form.business_name || !form.description) { setError('Project name, business name, and description are required'); return; }
    if (!designPackId) { setError('Upload a design pack first — the pipeline reproduces it exactly'); return; }
    setCreating(true);
    try {
      await base44.entities.LaunchProject.create({
        ...form,
        design_pack_id: designPackId,
        status: 'queued',
        organization_id: user?.data?.organization_id || ''
      });
      setForm({ project_name: '', project_type: 'website', client_name: '', client_email: '', client_phone: '', business_name: '', industry: '', description: '', target_audience: '', tone: 'professional' });
      setDesignPackId(null);
      setShowForm(false);
      loadProjects();
    } catch (e) {
      setError(e.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const scoreBadge = (score) => {
    if (score == null) return <span style={{ color: '#aaa', fontSize: 12 }}>—</span>;
    const pass = score >= 100;
    return <b style={{ color: pass ? '#237A4B' : '#C63D34', fontSize: 13 }}>{score}/100</b>;
  };

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Autonomous Launch Pipeline</p>
          <h1>Projects</h1>
          <p>Every website, app, and system the pipeline builds — from design pack ingestion through Drive/GitHub/Supabase/Vercel provisioning, Browserbase parity & operational validation, and mandatory 100/100 scoring. Customer info syncs to the CRM automatically.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn dark" style={{ padding: '12px 20px' }}>{showForm ? 'Cancel' : '+ New Project'}</button>
      </div>

      {error && <div style={{ background: '#f5d8d5', color: '#a52d23', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>Start an Autonomous Launch</h3>
          <p style={{ fontSize: 13, color: '#666', margin: '0 0 18px' }}>Upload a web/brand design pack and enter the client's business info. The pipeline ingests the pack, generates a pixel-faithful site, provisions Drive + GitHub + Supabase + Vercel, validates 100% parity & operational via Browserbase, and scores 100/100 mandatory — retrying up to 3 times. The client is added to your CRM automatically.</p>

          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px' }}>1. Upload Design Pack (vision-extracted — reproduced exactly)</p>
            <DesignPackUploader packType="web_pack" onIngested={(packId) => setDesignPackId(packId)} />
            {designPackId && <p style={{ fontSize: 12, color: '#237A4B', marginTop: 10 }}>✓ Design pack bound — generation will reproduce it exactly.</p>}
          </div>

          <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 10px' }}>2. Project & Client Info</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Project Name *
              <input value={form.project_name} onChange={e => update('project_name', e.target.value)} placeholder="Xtreme AI Systems Launch" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Project Type
              <select value={form.project_type} onChange={e => update('project_type', e.target.value)} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}>
                <option value="website">Website</option>
                <option value="app">App</option>
                <option value="system">System</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Business Name *
              <input value={form.business_name} onChange={e => update('business_name', e.target.value)} placeholder="Xtreme AI Systems" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Industry
              <input value={form.industry} onChange={e => update('industry', e.target.value)} placeholder="AI Automation" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            </label>
          </div>

          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
            Business Description *
            <textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="What the business does, problems solved, what makes it unique…" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, minHeight: 70 }} />
          </label>

          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
            Target Audience
            <input value={form.target_audience} onChange={e => update('target_audience', e.target.value)} placeholder="Contractors, service businesses…" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
          </label>

          <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 10px' }}>Client Contact (syncs to CRM)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Name
              <input value={form.client_name} onChange={e => update('client_name', e.target.value)} placeholder="John Doe" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Email
              <input value={form.client_email} onChange={e => update('client_email', e.target.value)} placeholder="john@business.com" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Phone
              <input value={form.client_phone} onChange={e => update('client_phone', e.target.value)} placeholder="+1 555 0100" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            </label>
          </div>

          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 18 }}>
            Tone
            <select value={form.tone} onChange={e => update('tone', e.target.value)} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, maxWidth: 220 }}>
              {['professional', 'friendly', 'luxury', 'playful', 'technical', 'persuasive'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <button onClick={createProject} disabled={creating} className="btn dark" style={{ padding: '14px 24px', fontSize: 14, opacity: creating ? 0.6 : 1 }}>
            {creating ? 'Starting pipeline…' : '🚀 Launch Autonomous Pipeline'}
          </button>
          <p style={{ fontSize: 11, color: '#999', marginTop: 10 }}>The workflow triggers automatically once the project is created. Watch the status update in real time below.</p>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>Loading projects…</div>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888', background: '#fff', border: '1px solid #ddd', borderRadius: 8 }}>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No projects yet</p>
          <p style={{ fontSize: 13 }}>Click <b>+ New Project</b> to upload a design pack and kick off the autonomous launch pipeline.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {projects.map(p => {
            const sm = STATUS_META[p.status] || STATUS_META.queued;
            const isOpen = expanded === p.id;
            return (
              <div key={p.id} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : p.id)}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 15 }}>{p.project_name}</b>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, color: sm.color, background: sm.bg, textTransform: 'uppercase', letterSpacing: '.08em' }}>{sm.label}</span>
                      {p.iteration > 0 && <span style={{ fontSize: 10, color: '#888' }}>iter {p.iteration}</span>}
                    </div>
                    <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>{p.business_name} · {p.industry || 'General'} · {p.project_type}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}><small style={{ display: 'block', fontSize: 10, color: '#888' }}>PARITY</small>{scoreBadge(p.parity_score)}</div>
                    <div style={{ textAlign: 'center' }}><small style={{ display: 'block', fontSize: 10, color: '#888' }}>OPERATIONAL</small>{scoreBadge(p.operational_score)}</div>
                    <div style={{ textAlign: 'center' }}><small style={{ display: 'block', fontSize: 10, color: '#888' }}>TEST</small>{scoreBadge(p.test_score)}</div>
                    <span style={{ fontSize: 18, color: '#aaa' }}>{isOpen ? '−' : '+'}</span>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ borderTop: '1px solid #eee', padding: '18px 20px' }}>
                    {p.last_validation_summary && <p style={{ fontSize: 12, color: '#666', margin: '0 0 14px', background: '#f8f7f4', padding: 10, borderRadius: 6 }}>{p.last_validation_summary}</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 14 }}>
                      {[
                        ['Live Site', p.vercel_deployment_url], ['GitHub', p.github_repo_url],
                        ['Drive Folder', p.drive_folder_url], ['Supabase', p.supabase_project_url]
                      ].map(([label, url]) => url ? (
                        <a key={label} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 12, color: 'var(--gold)' }}>
                          <small style={{ display: 'block', color: '#888', fontSize: 10, textTransform: 'uppercase' }}>{label}</small>
                          <span style={{ wordBreak: 'break-all' }}>{url.replace(/^https?:\/\//, '').slice(0, 38)} ↗</span>
                        </a>
                      ) : (
                        <div key={label} style={{ padding: 10, border: '1px solid #eee', borderRadius: 6, fontSize: 12, color: '#bbb' }}>
                          <small style={{ display: 'block', fontSize: 10, textTransform: 'uppercase' }}>{label}</small>pending
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12 }}>
                      {p.client_name && <span style={{ color: '#666' }}>👤 {p.client_name}</span>}
                      {p.client_email && <span style={{ color: '#666' }}>✉ {p.client_email}</span>}
                      {p.client_phone && <span style={{ color: '#666' }}>☎ {p.client_phone}</span>}
                      {p.customer_account_id && <Link to={`/app/companies/${p.company_id || ''}`} style={{ color: 'var(--gold)' }}>CRM record →</Link>}
                      {p.deliverable_id && <Link to="/app/deliverable-studio" style={{ color: 'var(--gold)' }}>Deliverable →</Link>}
                      {p.qa_report_id && <Link to="/app/qa-center" style={{ color: 'var(--gold)' }}>QA report →</Link>}
                    </div>
                    {p.errors && Object.keys(p.errors).length > 0 && (
                      <div style={{ marginTop: 12, padding: 10, background: '#f5d8d5', borderRadius: 6, fontSize: 11, color: '#a52d23' }}>
                        {Object.entries(p.errors).map(([k, v]) => <div key={k}><b>{k}:</b> {String(v).slice(0, 120)}</div>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PortalShell>
  );
}