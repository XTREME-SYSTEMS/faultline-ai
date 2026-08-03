import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import AiFieldGenerator from '@/components/fl/AiFieldGenerator';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';

const APP_TYPES = [
  { id: 'dashboard', label: 'Analytics Dashboard', icon: '📊', desc: 'KPIs, charts, data tables' },
  { id: 'crm', label: 'CRM System', icon: '👥', desc: 'Contacts, deals, pipeline' },
  { id: 'booking', label: 'Booking App', icon: '📅', desc: 'Calendar, appointments, clients' },
  { id: 'inventory', label: 'Inventory Manager', icon: '📦', desc: 'Stock, alerts, suppliers' },
  { id: 'project_management', label: 'Project Board', icon: '📋', desc: 'Kanban, tasks, teams' },
  { id: 'customer_portal', label: 'Customer Portal', icon: '🌐', desc: 'Accounts, tickets, orders' },
  { id: 'pos', label: 'Point of Sale', icon: '🛒', desc: 'Catalog, cart, checkout' },
  { id: 'lms', label: 'Learning Platform', icon: '🎓', desc: 'Courses, progress, quizzes' }
];

const FEATURE_OPTIONS = [
  { id: 'sidebar', label: 'Sidebar Navigation' }, { id: 'dashboard', label: 'Dashboard Overview' },
  { id: 'charts', label: 'Charts & Graphs' }, { id: 'tables', label: 'Data Tables' },
  { id: 'forms', label: 'Forms & Inputs' }, { id: 'kanban', label: 'Kanban Board' },
  { id: 'calendar', label: 'Calendar View' }, { id: 'chat', label: 'Chat/Messaging' },
  { id: 'settings', label: 'Settings Page' }, { id: 'dark_mode', label: 'Dark Mode Toggle' },
  { id: 'notifications', label: 'Notifications' }, { id: 'search', label: 'Global Search' }
];

const PAGE_OPTIONS = ['dashboard', 'analytics', 'contacts', 'calendar', 'projects', 'inventory', 'orders', 'reports', 'settings', 'profile'];

export default function AppGenerator() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({
    app_name: '', app_type: 'dashboard', business_name: '', industry: '',
    description: '', target_audience: '', primary_color: '#C89B3C',
    secondary_color: '#0a0a0a', font_style: 'modern', tone: 'professional',
    company_id: '', logo_url: ''
  });
  const [features, setFeatures] = useState(['sidebar', 'dashboard', 'charts', 'tables', 'forms', 'dark_mode', 'notifications', 'search']);
  const [pages, setPages] = useState(['dashboard', 'analytics', 'contacts', 'settings']);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [savedApps, setSavedApps] = useState([]);

  useEffect(() => {
    base44.entities.Company.list().then(setCompanies).catch(() => {});
    loadSavedApps();
  }, []);

  const loadSavedApps = async () => {
    try {
      const data = await base44.entities.Deliverable.filter({ deliverable_type: 'website' }, '-created_date', 20);
      setSavedApps(data.filter(d => d.metadata?.deliverable_subtype === 'app'));
    } catch (e) { console.error(e); }
  };

  const updateForm = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleApply = (field, value) => {
    if (field === 'branding') {
      updateForm('primary_color', value.primary_color);
      updateForm('secondary_color', value.secondary_color);
      updateForm('font_style', value.font_style);
      updateForm('tone', value.tone);
    } else if (field === 'logo_url') {
      updateForm('logo_url', value);
    } else if (field === 'business_name') {
      updateForm('business_name', value);
      if (!form.app_name) updateForm('app_name', value);
    } else updateForm(field, value);
  };

  const toggleFeature = (f) => setFeatures(features.includes(f) ? features.filter(x => x !== f) : [...features, f]);
  const togglePage = (p) => setPages(pages.includes(p) ? pages.filter(x => x !== p) : [...pages, p]);

  const generate = async () => {
    setError('');
    if (!form.app_name || !form.description) { setError('App name and description are required'); return; }
    setGenerating(true);
    setResult(null);
    try {
      const response = await base44.functions.invoke('generateApp', {
        ...form, features, pages
      });
      const data = response.data;
      if (data.error) { setError(data.error); setGenerating(false); return; }
      setResult(data);
      loadSavedApps();
    } catch (e) {
      setError(e.message || 'Generation failed. The app is complex — try again.');
    } finally {
      setGenerating(false);
    }
  };

  const downloadHtml = () => {
    if (!result?.app_html) return;
    const blob = new Blob([result.app_html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.app_name.replace(/\s+/g, '-').toLowerCase()}-app.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openInNewTab = () => {
    if (!result?.app_html) return;
    const blob = new Blob([result.app_html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const fontOptions = [
    { value: 'modern', label: 'Modern', desc: 'Inter + Poppins' },
    { value: 'classic', label: 'Classic', desc: 'Playfair + Lato' },
    { value: 'bold', label: 'Bold', desc: 'Oswald + Open Sans' }
  ];
  const toneOptions = ['professional', 'friendly', 'luxury', 'playful', 'technical', 'persuasive'];

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">AI Powered</p>
          <h1>App Generator</h1>
          <p>Generate complete, production-ready web applications — dashboards, CRMs, booking systems, inventory managers, and more. AI builds the full app with charts, tables, forms, and interactivity.</p>
        </div>
      </div>

      {error && <div style={{ background: '#f5d8d5', color: '#a52d23', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* App Type Selection */}
      <section style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>1. Choose App Type</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {APP_TYPES.map(t => (
            <button key={t.id} onClick={() => updateForm('app_type', t.id)} style={{
              padding: 16, borderRadius: 8, border: `2px solid ${form.app_type === t.id ? '#C89B3C' : '#e5e1da'}`,
              background: form.app_type === t.id ? '#C89B3C10' : '#fff', cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left', display: 'flex', gap: 12, alignItems: 'start'
            }}>
              <span style={{ fontSize: 24 }}>{t.icon}</span>
              <div>
                <b style={{ fontSize: 13, display: 'block' }}>{t.label}</b>
                <small style={{ fontSize: 11, color: '#888' }}>{t.desc}</small>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Configuration */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 16 }}>2. Configure Your App</h3>

        {companies.length > 0 && (
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
            Link to Company (optional)
            <select value={form.company_id} onChange={e => {
              const id = e.target.value;
              updateForm('company_id', id);
              if (id) {
                const c = companies.find(c => c.id === id);
                if (c) {
                  updateForm('business_name', c.name || form.business_name);
                  updateForm('industry', c.industry || form.industry);
                  updateForm('description', c.description || form.description);
                }
              }
            }} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}>
              <option value="">— No link —</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}

        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>App Name * <AiFieldGenerator type="business_name" form={form} onApply={handleApply} /></span>
          <input value={form.app_name} onChange={e => updateForm('app_name', e.target.value)} placeholder="My SaaS App" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
        </label>

        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Business Name <AiFieldGenerator type="business_name" form={form} onApply={handleApply} /></span>
          <input value={form.business_name} onChange={e => updateForm('business_name', e.target.value)} placeholder="Acme Corp" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
        </label>

        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Industry <AiFieldGenerator type="industry" form={form} onApply={handleApply} /></span>
          <input value={form.industry} onChange={e => updateForm('industry', e.target.value)} placeholder="e.g. Construction, SaaS, Healthcare" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
        </label>

        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>App Description * <AiFieldGenerator type="description" form={form} onApply={handleApply} /></span>
          <textarea value={form.description} onChange={e => updateForm('description', e.target.value)} placeholder="What does the app do? What problems does it solve? What features does it need?" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, minHeight: 80 }} />
        </label>

        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Target Audience <AiFieldGenerator type="target_audience" form={form} onApply={handleApply} /></span>
          <input value={form.target_audience} onChange={e => updateForm('target_audience', e.target.value)} placeholder="e.g. Small business owners, enterprise CTOs" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
        </label>

        {/* Branding & Logo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>Branding & Logo</p>
          <div style={{ display: 'flex', gap: 6 }}>
            <AiFieldGenerator type="branding" form={form} onApply={handleApply} />
            <AiFieldGenerator type="logo" form={form} onApply={handleApply} />
          </div>
        </div>

        {form.logo_url && (
          <div style={{ marginBottom: 14, padding: 12, background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={form.logo_url} alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 4, background: '#fff' }} />
            <b style={{ fontSize: 13 }}>Logo selected</b>
            <button onClick={() => updateForm('logo_url', '')} style={{ marginLeft: 'auto', background: 'none', border: 0, color: '#a52d23', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Remove</button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Primary Color
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={form.primary_color} onChange={e => updateForm('primary_color', e.target.value)} style={{ width: 40, height: 36, border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }} />
              <input value={form.primary_color} onChange={e => updateForm('primary_color', e.target.value)} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 12, flex: 1 }} />
            </div>
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Secondary Color
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={form.secondary_color} onChange={e => updateForm('secondary_color', e.target.value)} style={{ width: 40, height: 36, border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }} />
              <input value={form.secondary_color} onChange={e => updateForm('secondary_color', e.target.value)} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 12, flex: 1 }} />
            </div>
          </label>
        </div>

        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
          Font Style
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {fontOptions.map(f => (
              <button key={f.value} onClick={() => updateForm('font_style', f.value)} style={{
                padding: 10, borderRadius: 6, border: `1px solid ${form.font_style === f.value ? '#0a0a0a' : '#ddd'}`,
                background: form.font_style === f.value ? '#0a0a0a' : '#fff', color: form.font_style === f.value ? '#fff' : '#666',
                cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', textAlign: 'center'
              }}>{f.label}<br /><small style={{ fontSize: 9, opacity: .7 }}>{f.desc}</small></button>
            ))}
          </div>
        </label>

        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
          Tone
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {toneOptions.map(t => (
              <button key={t} onClick={() => updateForm('tone', t)} style={{
                padding: '6px 12px', borderRadius: 20, border: `1px solid ${form.tone === t ? '#0a0a0a' : '#ddd'}`,
                background: form.tone === t ? '#0a0a0a' : '#fff', color: form.tone === t ? '#fff' : '#666',
                cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', textTransform: 'capitalize'
              }}>{t}</button>
            ))}
          </div>
        </label>

        {/* Pages */}
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px' }}>Pages</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PAGE_OPTIONS.map(p => (
              <button key={p} onClick={() => togglePage(p)} style={{
                padding: '6px 12px', borderRadius: 6, border: `1px solid ${pages.includes(p) ? '#C89B3C' : '#ddd'}`,
                background: pages.includes(p) ? '#C89B3C20' : '#fff', color: pages.includes(p) ? '#8A641C' : '#666',
                cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', textTransform: 'capitalize'
              }}>{p}</button>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px' }}>Features</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {FEATURE_OPTIONS.map(f => (
              <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={features.includes(f.id)} onChange={() => toggleFeature(f.id)} style={{ cursor: 'pointer' }} />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        <button onClick={generate} disabled={generating} className="btn dark" style={{ width: '100%', padding: '16px', fontSize: 15, opacity: generating ? 0.6 : 1 }}>
          {generating ? '⚡ Building Your App…' : '🚀 Generate App'}
        </button>
        {generating && <p style={{ textAlign: 'center', color: '#999', fontSize: 12, marginTop: 10 }}>This takes 30-60 seconds. The AI builds a complete interactive app with charts, tables, and forms.</p>}
      </div>

      {/* Preview */}
      {result && (
        <div style={{ marginTop: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>✓ App Generated! <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>({result.app_type})</span></h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowPreview(!showPreview)} className="btn outline" style={{ fontSize: 12, padding: '8px 14px' }}>{showPreview ? 'View Code' : 'View Preview'}</button>
                <button onClick={openInNewTab} className="btn outline" style={{ fontSize: 12, padding: '8px 14px' }}>Open ↗</button>
                <button onClick={downloadHtml} className="btn gold" style={{ fontSize: 12, padding: '8px 14px' }}>⬇ Download</button>
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Saved to Deliverable Studio. <Link to="/app/deliverable-studio" style={{ color: 'var(--gold)' }}>View in studio →</Link></p>
          </div>

          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
            {showPreview ? (
              <iframe srcDoc={result.app_html} style={{ width: '100%', height: 'calc(100vh - 280px)', minHeight: 600, border: '0' }} title="App Preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
            ) : (
              <pre style={{ padding: 16, fontSize: 11, overflow: 'auto', maxHeight: 'calc(100vh - 280px)', minHeight: 600, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{result.app_html}</pre>
            )}
          </div>
        </div>
      )}

      {savedApps.length > 0 && !result && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Previously Generated Apps</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {savedApps.map(w => (
              <div key={w.id} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
                <b style={{ fontSize: 14 }}>{w.title}</b>
                <p style={{ fontSize: 12, color: '#666', margin: '4px 0 8px' }}>{w.metadata?.app_type || 'app'} · {new Date(w.created_date).toLocaleDateString()}</p>
                <button onClick={() => { setResult({ app_html: w.content, app_name: w.metadata?.app_name, app_type: w.metadata?.app_type }); }} style={{ padding: '6px 12px', border: '1px solid #C89B3C', borderRadius: 6, background: '#C89B3C20', color: '#8A641C', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>View →</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </PortalShell>
  );
}