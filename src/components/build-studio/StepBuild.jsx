import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Loader2, Download, ExternalLink, Code, Eye } from 'lucide-react';
import AiFieldGenerator from '@/components/fl/AiFieldGenerator';
import BuildAssistant from './BuildAssistant';
import { enhanceSite } from '@/lib/enhanceSite';
import {
  WEBSITE_PAGES, WEBSITE_FEATURES, APP_PAGES, APP_FEATURES,
  FONT_OPTIONS, TONE_OPTIONS,
} from './options';

export default function StepBuild({ form, update, back }) {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(true);

  const isApp = form.buildType === 'app';
  const pageOptions = isApp ? APP_PAGES : WEBSITE_PAGES;
  const featureOptions = isApp ? APP_FEATURES : WEBSITE_FEATURES;

  useEffect(() => {
    if (form.pages.length === 0) {
      update('pages', isApp ? ['dashboard', 'analytics', 'contacts', 'settings'] : ['home', 'about', 'services', 'contact']);
    }
    if (form.features.length === 0) {
      update('features', isApp
        ? ['sidebar', 'dashboard', 'charts', 'tables', 'forms', 'dark_mode', 'notifications', 'search']
        : ['hero', 'services', 'testimonials', 'contact_form', 'footer', 'stats', 'about']);
    }
  }, []);

  const toggle = (key, val) => {
    const arr = form[key];
    update(key, arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const handleAiApply = (field, value) => update(field, value);

  const generate = async () => {
    setError('');
    if (!form.description) { setError('Description is required'); return; }
    setGenerating(true);
    setResult(null);
    try {
      const payload = {
        ...form,
        business_name: form.business_name,
        app_name: form.business_name,
        app_type: form.appType,
        pages: form.pages,
        include_features: form.features,
        features: form.features,
      };
      const fnName = isApp ? 'generateApp' : 'generateWebsite';
      const res = await base44.functions.invoke(fnName, payload);
      const data = res.data || res;
      if (data.error) { setError(data.error); setGenerating(false); return; }
      if (data.status === 'generating' && data.deliverable_id) {
        // Poll deliverable
        for (let i = 0; i < 60; i++) {
          await new Promise(r => setTimeout(r, 4000));
          try {
            const d = await base44.entities.Deliverable.get(data.deliverable_id);
            if (d.status === 'generated') {
              let html = '';
              if (d.file_url) { try { const r2 = await fetch(d.file_url); html = await r2.text(); } catch (e) { html = ''; } }
              const enhanced = enhanceSite(html, { bg_color: form.bg_color, font_color: form.font_color, accent_color: form.accent_color, primary_color: form.primary_color, business_name: form.business_name, logo_url: form.logo_url });
              setResult({ html: enhanced, deliverable_id: d.id });
              setGenerating(false);
              return;
            }
            if (d.status === 'failed') { setError('Generation failed: ' + (d.metadata?.error || 'unknown')); setGenerating(false); return; }
          } catch (e) {}
        }
        setError('Still running — check Deliverable Studio.');
        setGenerating(false);
        return;
      }
      const rawHtml = data.website_html || data.app_html;
      const enhanced = enhanceSite(rawHtml, { bg_color: form.bg_color, font_color: form.font_color, accent_color: form.accent_color, primary_color: form.primary_color, business_name: form.business_name, logo_url: form.logo_url });
      setResult({ html: enhanced, deliverable_id: data.deliverable_id });
    } catch (e) {
      setError(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const downloadHtml = () => {
    if (!result?.html) return;
    const blob = new Blob([result.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.business_name.replace(/\s+/g, '-').toLowerCase()}-${form.buildType}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openInNewTab = () => {
    if (!result?.html) return;
    const blob = new Blob([result.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      {/* Summary */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 18, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Workflow Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, fontSize: 12 }}>
          <SummaryItem label="Type" value={isApp ? `App · ${form.appType}` : 'Website'} />
          <SummaryItem label="Name" value={form.business_name} />
          <SummaryItem label="Domain" value={form.domain} />
          <SummaryItem label="Industry" value={form.industry || '—'} />
          {form.logo_url && <SummaryItem label="Logo" value="✓ Set" />}
          {form.tagline && <SummaryItem label="Tagline" value={`"${form.tagline}"`} />}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: form.primary_color, border: '1px solid #ddd' }} title="Primary" />
          <div style={{ width: 22, height: 22, borderRadius: 5, background: form.secondary_color, border: '1px solid #ddd' }} title="Secondary" />
          {form.accent_color && <div style={{ width: 22, height: 22, borderRadius: 5, background: form.accent_color, border: '1px solid #ddd' }} title="Accent" />}
        </div>
      </div>

      {error && <div style={{ background: '#f5d8d5', color: '#a52d23', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* Config */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24, marginBottom: 16 }}>
        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Description * <AiFieldGenerator type="description" form={form} onApply={handleAiApply} />
          </span>
          <textarea value={form.description} onChange={e => update('description', e.target.value)}
            placeholder="What does the business do? What problems does it solve?"
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, minHeight: 80, resize: 'vertical' }} />
        </label>

        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Target Audience <AiFieldGenerator type="target_audience" form={form} onApply={handleAiApply} />
          </span>
          <input value={form.target_audience} onChange={e => update('target_audience', e.target.value)}
            placeholder="e.g. Small business owners, enterprise CTOs"
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Primary Color
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={form.primary_color} onChange={e => update('primary_color', e.target.value)} style={{ width: 40, height: 36, border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }} />
              <input value={form.primary_color} onChange={e => update('primary_color', e.target.value)} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 12, flex: 1 }} />
            </div>
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Secondary Color
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={form.secondary_color} onChange={e => update('secondary_color', e.target.value)} style={{ width: 40, height: 36, border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }} />
              <input value={form.secondary_color} onChange={e => update('secondary_color', e.target.value)} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 12, flex: 1 }} />
            </div>
          </label>
        </div>

        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>Font Style
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {FONT_OPTIONS.map(f => (
              <button key={f.value} onClick={() => update('font_style', f.value)} style={{
                padding: 10, borderRadius: 6, border: `1px solid ${form.font_style === f.value ? '#0a0a0a' : '#ddd'}`,
                background: form.font_style === f.value ? '#0a0a0a' : '#fff', color: form.font_style === f.value ? '#fff' : '#666',
                cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', textAlign: 'center',
              }}>{f.label}<br /><small style={{ fontSize: 9, opacity: .7 }}>{f.desc}</small></button>
            ))}
          </div>
        </label>

        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>Tone
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TONE_OPTIONS.map(t => (
              <button key={t} onClick={() => update('tone', t)} style={{
                padding: '6px 12px', borderRadius: 20, border: `1px solid ${form.tone === t ? '#0a0a0a' : '#ddd'}`,
                background: form.tone === t ? '#0a0a0a' : '#fff', color: form.tone === t ? '#fff' : '#666',
                cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', textTransform: 'capitalize',
              }}>{t}</button>
            ))}
          </div>
        </label>

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px' }}>Pages</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {pageOptions.map(p => (
              <button key={p} onClick={() => toggle('pages', p)} style={{
                padding: '6px 12px', borderRadius: 6, border: `1px solid ${form.pages.includes(p) ? '#C89B3C' : '#ddd'}`,
                background: form.pages.includes(p) ? '#C89B3C20' : '#fff', color: form.pages.includes(p) ? '#8A641C' : '#666',
                cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', textTransform: 'capitalize',
              }}>{p}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px' }}>Features</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {featureOptions.map(f => (
              <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.features.includes(f.id)} onChange={() => toggle('features', f.id)} style={{ cursor: 'pointer' }} />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        <button onClick={generate} disabled={generating} style={{
          width: '100%', background: '#0a0a0a', color: '#fff', border: 0, borderRadius: 8,
          padding: '16px', fontSize: 15, fontWeight: 700, cursor: generating ? 'wait' : 'pointer',
          fontFamily: 'inherit', opacity: generating ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          {generating ? <Loader2 size={18} className="animate-spin" /> : null}
          {generating ? '⚡ Building…' : `🚀 Generate ${isApp ? 'App' : 'Website'}`}
        </button>
        {generating && <p style={{ textAlign: 'center', color: '#999', fontSize: 12, marginTop: 10 }}>This takes 30-60 seconds.</p>}
      </div>

      {/* Preview */}
      {result && (
        <div style={{ marginTop: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>✓ {isApp ? 'App' : 'Website'} Generated!</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowPreview(!showPreview)} style={btnOutline}>{showPreview ? <Code size={14} /> : <Eye size={14} />} {showPreview ? 'Code' : 'Preview'}</button>
                <button onClick={openInNewTab} style={btnOutline}><ExternalLink size={14} /> Open</button>
                <button onClick={downloadHtml} style={btnGold}><Download size={14} /> Download</button>
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#666', margin: '8px 0 0' }}>Saved to Deliverable Studio. <Link to="/app/deliverable-studio" style={{ color: '#C89B3C' }}>View in studio →</Link></p>
          </div>
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
            {showPreview ? (
              <iframe srcDoc={result.html} style={{ width: '100%', height: 'calc(100vh - 320px)', minHeight: 500, border: 0 }} title="Preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
            ) : (
              <pre style={{ padding: 16, fontSize: 11, overflow: 'auto', maxHeight: 600, minHeight: 500, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{result.html}</pre>
            )}
          </div>
        </div>
      )}

      {/* AI Edit Assistant — surgical edits to the generated site */}
      {result && (
        <div style={{ marginTop: 16 }}>
          <BuildAssistant html={result.html} onHtmlChange={(newHtml) => setResult(r => ({ ...r, html: newHtml }))} />
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <button onClick={back} style={{
          background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '14px 28px',
          fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#666',
        }}>← Back</button>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div style={{ background: '#f8f7f4', borderRadius: 6, padding: 10 }}>
      <small style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 700 }}>{label}</small>
      <p style={{ fontSize: 13, fontWeight: 600, margin: '3px 0 0', wordBreak: 'break-word' }}>{value}</p>
    </div>
  );
}

const btnOutline = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#fff',
  border: '1px solid #ddd', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#202124',
};
const btnGold = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#C89B3C',
  border: 0, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#111',
};