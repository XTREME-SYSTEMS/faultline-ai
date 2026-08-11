import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import { TEMPLATES } from '@/components/ghl/funnelTemplates';
import { ArrowLeft, Plus, Save, Rocket, ExternalLink, Loader2, X, Copy, FileText, Check } from 'lucide-react';

export default function FunnelEditor({ funnelId }) {
  const { user } = useAuth();
  const orgId = user?.data?.organization_id;
  const [funnel, setFunnel] = useState(null);
  const [pages, setPages] = useState([]);
  const [forms, setForms] = useState([]);
  const [activePageId, setActivePageId] = useState(null);
  const [html, setHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [publishErr, setPublishErr] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [copied, setCopied] = useState('');

  async function loadAll() {
    const [f, p, fr] = await Promise.all([
      base44.entities.GhlFunnel.get(funnelId),
      base44.entities.GhlPage.filter({ funnel_id: funnelId }, '-created_date', 50),
      base44.entities.GhlForm.filter({ funnel_id: funnelId }, '-created_date', 50),
    ]);
    setFunnel(f); setPages(p); setForms(fr);
    if (p.length && !activePageId) {
      setActivePageId(p[0].id);
      setHtml(p[0].html || '');
    }
  }
  useEffect(() => { loadAll(); }, [funnelId]);

  useEffect(() => {
    const p = pages.find(x => x.id === activePageId);
    setHtml(p?.html || '');
  }, [activePageId]);

  async function savePage() {
    setSaving(true);
    try {
      await base44.entities.GhlPage.update(activePageId, { html });
      setPages(prev => prev.map(p => p.id === activePageId ? { ...p, html } : p));
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }

  async function addPage(type = 'landing') {
    const name = prompt('Page name:', type === 'thank_you' ? 'Thank You' : 'Landing Page');
    if (!name) return;
    const p = await base44.entities.GhlPage.create({
      organization_id: orgId, funnel_id: funnelId, name, slug: name.toLowerCase().replace(/\s+/g, '-'),
      page_type: type, html: '', is_published: false,
    });
    await base44.entities.GhlFunnel.update(funnelId, { page_count: (funnel.page_count || 0) + 1 });
    setPages(prev => [p, ...prev]);
    setActivePageId(p.id);
    setHtml('');
    loadAll();
  }

  async function publish() {
    setPublishing(true); setPublishErr(''); setPublishResult(null);
    try {
      await savePage();
      const res = await base44.functions.invoke('ghlPublishFunnel', { funnel_id: funnelId });
      const d = res?.data || res;
      if (d.error) throw new Error(d.error);
      setPublishResult(d);
      loadAll();
    } catch (e) {
      setPublishErr(e.message || 'Publish failed');
    } finally { setPublishing(false); }
  }

  async function createForm(name, redirectUrl) {
    const f = await base44.entities.GhlForm.create({
      organization_id: orgId, funnel_id: funnelId, name,
      fields: [
        { name: 'first_name', label: 'First Name', type: 'text', required: true },
        { name: 'last_name', label: 'Last Name', type: 'text', required: false },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'phone', label: 'Phone', type: 'tel', required: false },
        { name: 'company', label: 'Company', type: 'text', required: false },
      ],
      redirect_url: redirectUrl || '', submissions: 0,
    });
    setForms(prev => [f, ...prev]);
    setShowFormModal(false);
  }

  function embedSnippet(form) {
    const redirect = form.redirect_url ? ` data-ghl-redirect="${form.redirect_url}"` : '';
    return `<form data-ghl-form="${form.id}"${redirect}>
  <input name="first_name" placeholder="First Name" required>
  <input name="last_name" placeholder="Last Name">
  <input name="email" type="email" placeholder="Email" required>
  <input name="phone" type="tel" placeholder="Phone">
  <input name="company" placeholder="Business Name">
  <button type="submit">Get My Free Audit</button>
</form>`;
  }

  function copy(text, key) {
    navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(''), 1500);
  }

  function insertTemplate(tpl) {
    setHtml(tpl.html);
    setShowTemplates(false);
  }

  if (!funnel) return (
    <>
      <XtremeOSSidebar />
      <div className="xtremeos-content" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240, padding: 28 }}>
        <div style={{ padding: 60, textAlign: 'center', color: '#999' }}><Loader2 size={24} className="animate-spin" style={{ display: 'block', margin: '0 auto 8px', color: '#C89B3C' }} /> Loading funnel…</div>
      </div>
    </>
  );

  return (
    <>
      <XtremeOSSidebar />
      <div className="xtremeos-content" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240, padding: 28 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
          <Link to="/app/ghl-funnels" style={iconBtn}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#666', fontSize: 13, fontWeight: 700 }}><ArrowLeft size={16} /> Funnels</span></Link>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 30, margin: 0 }}>{funnel.name}</h1>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: funnel.status === 'published' ? '#e8f5ec' : '#f0ede5', color: funnel.status === 'published' ? '#237A4B' : '#B88214', textTransform: 'uppercase' }}>{funnel.status}</span>
            {funnel.vercel_url && <a href={funnel.vercel_url} target="_blank" rel="noopener" style={{ marginLeft: 10, fontSize: 12, color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: 4 }}><ExternalLink size={11} /> live site</a>}
          </div>
          <button onClick={publish} disabled={publishing} style={btnGold}>
            {publishing ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />} {publishing ? 'Publishing…' : 'Publish to Vercel'}
          </button>
        </div>

        {publishErr && <div style={{ marginBottom: 12, padding: 14, background: '#f5d8d5', border: '1px solid #C63D34', borderRadius: 8, color: '#a52d23', fontSize: 13 }}>{publishErr}</div>}
        {publishResult && (
          <div style={{ marginBottom: 12, padding: 14, background: '#e8f5ec', border: '1px solid #237A4B', borderRadius: 8, fontSize: 13, color: '#237A4B' }}>
            <b>Published!</b> Live at <a href={publishResult.vercel_url} target="_blank" rel="noopener" style={{ color: '#2563eb' }}>{publishResult.vercel_url}</a>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 14, alignItems: 'start' }}>
          {/* Pages sidebar */}
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px 8px' }}>
              <b style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', color: '#777' }}>Pages</b>
              <button onClick={() => addPage('landing')} style={iconBtn} title="Add page"><Plus size={15} /></button>
            </div>
            <div style={{ display: 'grid', gap: 3 }}>
              {pages.map(p => (
                <button key={p.id} onClick={() => setActivePageId(p.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', borderRadius: 6, textAlign: 'left', cursor: 'pointer',
                  background: activePageId === p.id ? '#f0ede5' : 'none', border: 0, fontFamily: 'inherit', fontSize: 13, color: activePageId === p.id ? '#111' : '#666',
                }}>
                  <FileText size={13} style={{ color: p.is_published ? '#237A4B' : '#ccc' }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                </button>
              ))}
              {pages.length === 0 && <p style={{ fontSize: 11, color: '#999', padding: '6px' }}>No pages yet.</p>}
            </div>
            <button onClick={() => addPage('thank_you')} style={{ marginTop: 6, width: '100%', padding: '7px', border: '1px dashed #ccc', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 11, color: '#888', fontFamily: 'inherit' }}>+ Thank You Page</button>
          </div>

          {/* Editor */}
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 8, padding: 10, borderBottom: '1px solid #eee', flexWrap: 'wrap' }}>
              <button onClick={() => setShowTemplates(true)} style={btnSm}><Plus size={13} /> Insert Template</button>
              <button onClick={() => setShowFormModal(true)} style={btnSm}><Plus size={13} /> Create Lead Form</button>
              <button onClick={savePage} disabled={saving || !activePageId} style={{ ...btnSm, background: saving ? '#eee' : '#111', color: saving ? '#999' : '#fff', border: 0 }}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, height: 520 }}>
              <textarea
                value={html}
                onChange={e => setHtml(e.target.value)}
                placeholder="Paste HTML here or insert a template…"
                spellCheck={false}
                style={{ width: '100%', height: '100%', border: 0, borderRight: '1px solid #eee', padding: 14, fontFamily: 'ui-monospace, monospace', fontSize: 12, resize: 'none', outline: 'none', background: '#fafaf8', color: '#111' }}
              />
              <iframe title="preview" srcDoc={html} style={{ width: '100%', height: '100%', border: 0, background: '#fff' }} />
            </div>
          </div>
        </div>

        {/* Forms */}
        <div style={{ marginTop: 18, background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 18 }}>Lead Forms</b>
            <button onClick={() => setShowFormModal(true)} style={btnSm}><Plus size={13} /> New Form</button>
          </div>
          {forms.length === 0 ? (
            <p style={{ color: '#999', fontSize: 13, margin: 0 }}>No forms yet. Create a form, then paste its embed snippet into your page HTML — submissions auto-create CRM contacts and deals.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {forms.map(f => (
                <div key={f.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <b style={{ fontSize: 14 }}>{f.name}</b>
                      <span style={{ marginLeft: 10, fontSize: 11, color: '#C89B3C' }}>{f.submissions || 0} submissions</span>
                    </div>
                    <button onClick={() => copy(embedSnippet(f), f.id)} style={btnSm}>
                      {copied === f.id ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy Embed</>}
                    </button>
                  </div>
                  <pre style={{ background: '#0a0a0a', color: '#E7C86E', padding: 12, borderRadius: 6, fontSize: 11, overflowX: 'auto', margin: 0 }}>{embedSnippet(f)}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showTemplates && (
        <div style={overlay} onClick={() => setShowTemplates(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: '1px solid #eee' }}>
              <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 18 }}>Insert Template</b>
              <button onClick={() => setShowTemplates(false)} style={iconBtn}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: 22 }}>
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => insertTemplate(t)} style={{ textAlign: 'left', border: '1px solid #ddd', borderRadius: 10, padding: 16, cursor: 'pointer', background: '#fff', fontFamily: 'inherit' }}>
                  <b style={{ fontSize: 15, display: 'block' }}>{t.name}</b>
                  <p style={{ fontSize: 12, color: '#777', margin: '4px 0 0' }}>{t.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showFormModal && (
        <div style={overlay} onClick={() => setShowFormModal(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: '1px solid #eee' }}>
              <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 18 }}>New Lead Form</b>
              <button onClick={() => setShowFormModal(false)} style={iconBtn}><X size={18} /></button>
            </div>
            <FormCreate onCreate={createForm} />
          </div>
        </div>
      )}
    </>
  );
}

function FormCreate({ onCreate }) {
  const [name, setName] = useState('');
  const [redirect, setRedirect] = useState('');
  return (
    <>
      <div style={{ display: 'grid', gap: 14, padding: 22 }}>
        <label style={fl}>Form Name
          <input value={name} onChange={e => setName(e.target.value)} style={inp} placeholder="HVAC Free Audit Form" autoFocus />
        </label>
        <label style={fl}>Redirect URL (optional)
          <input value={redirect} onChange={e => setRedirect(e.target.value)} style={inp} placeholder="https://leadgennearyou.com/thanks" />
        </label>
        <p style={{ fontSize: 11, color: '#999', margin: 0 }}>Captures: first name, last name, email, phone, company. Submissions create a CRM contact + a new deal in your default pipeline.</p>
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '0 22px 22px', justifyContent: 'flex-end' }}>
        <button onClick={() => onCreate(name.trim(), redirect.trim())} disabled={!name.trim()} style={btnGold}><Plus size={14} /> Create Form</button>
      </div>
    </>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'grid', placeItems: 'center' };
const modal = { width: 'min(560px, 92vw)', background: '#fff', borderRadius: 12, overflow: 'hidden' };
const fl = { display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 };
const inp = { padding: '10px 12px', border: '1px solid #d7d7d7', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', background: '#fff', color: '#111' };
const iconBtn = { background: 'none', border: 0, cursor: 'pointer', color: '#999' };
const btnSm = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', color: '#333' };
const btnGold = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', border: 0, borderRadius: 6, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' };