import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import WebsiteCoach from '@/components/fl/WebsiteCoach';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';

export default function WebsiteGenerator() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({
    business_name: '', industry: '', description: '', target_audience: '',
    primary_color: '#C89B3C', secondary_color: '#0a0a0a', font_style: 'modern',
    tone: 'professional', company_id: ''
  });
  const [pages, setPages] = useState(['home', 'about', 'services', 'contact']);
  const [features, setFeatures] = useState(['hero', 'services', 'testimonials', 'contact_form', 'footer', 'stats', 'about']);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [savedWebsites, setSavedWebsites] = useState([]);

  // Competitor cloning state
  const [cloneCategory, setCloneCategory] = useState('');
  const [cloning, setCloning] = useState(false);
  const [cloneResult, setCloneResult] = useState(null);
  const [cloneError, setCloneError] = useState('');
  const [showCloneSection, setShowCloneSection] = useState(false);

  useEffect(() => {
    base44.entities.Company.list().then(setCompanies).catch(() => {});
    loadSavedWebsites();
  }, []);

  const loadSavedWebsites = async () => {
    try {
      const data = await base44.entities.Deliverable.filter({ deliverable_type: 'website' }, '-created_date', 10);
      setSavedWebsites(data);
    } catch (e) { console.error(e); }
  };

  const updateForm = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleCoachApply = (field, value) => {
    if (field === 'pages') setPages(value);
    else if (field === 'features') setFeatures(value);
    else updateForm(field, value);
  };

  const togglePage = (page) => {
    setPages(pages.includes(page) ? pages.filter(p => p !== page) : [...pages, page]);
  };

  const toggleFeature = (feature) => {
    setFeatures(features.includes(feature) ? features.filter(f => f !== feature) : [...features, feature]);
  };

  const cloneCompetitors = async () => {
    if (!cloneCategory) { setCloneError('Enter a category first'); return; }
    setCloning(true);
    setCloneError('');
    setCloneResult(null);
    try {
      const res = await fetch('/api/base44/functions/cloneTopWebsites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: cloneCategory, industry: form.industry })
      });
      const text = await res.text();
      if (!text) { setCloneError('Server returned an empty response — the function may have timed out. Try again.'); setCloning(false); return; }
      const data = JSON.parse(text);
      if (data.error) { setCloneError(data.error); setCloning(false); return; }
      setCloneResult(data);
      // Auto-apply recommended tone if form tone is still default
      if (data.analysis?.superiority_strategy?.recommended_tone) {
        const recommended = data.analysis.superiority_strategy.recommended_tone.toLowerCase().split(/[\s,]+/)[0];
        const validTones = ['professional', 'friendly', 'luxury', 'playful', 'technical', 'persuasive'];
        if (validTones.includes(recommended)) updateForm('tone', recommended);
      }
    } catch (e) {
      setCloneError(e.message);
    } finally {
      setCloning(false);
    }
  };

  const generate = async () => {
    setError('');
    if (!form.business_name || !form.description) { setError('Business name and description are required'); return; }
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch('/api/base44/functions/generateWebsite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, pages, include_features: features, competitor_analysis: cloneResult || null })
      });
      const text = await res.text();
      if (!text) { setError('Server returned an empty response — the function may have timed out. Try again.'); setGenerating(false); return; }
      const data = JSON.parse(text);
      if (data.error) { setError(data.error); setGenerating(false); return; }
      setResult(data);
      loadSavedWebsites();
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const downloadHtml = () => {
    if (!result?.website_html) return;
    const blob = new Blob([result.website_html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.business_name.replace(/\s+/g, '-').toLowerCase()}-website.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openInNewTab = () => {
    if (!result?.website_html) return;
    const blob = new Blob([result.website_html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const fontOptions = [
    { value: 'modern', label: 'Modern', desc: 'Inter + Poppins' },
    { value: 'classic', label: 'Classic', desc: 'Playfair + Lato' },
    { value: 'bold', label: 'Bold', desc: 'Oswald + Open Sans' }
  ];

  const toneOptions = ['professional', 'friendly', 'luxury', 'playful', 'technical', 'persuasive'];
  const pageOptions = ['home', 'about', 'services', 'products', 'portfolio', 'blog', 'contact', 'pricing', 'team', 'faq'];
  const featureOptions = [
    { id: 'hero', label: 'Hero Section' }, { id: 'services', label: 'Services Grid' },
    { id: 'stats', label: 'Animated Stats' }, { id: 'about', label: 'About Section' },
    { id: 'testimonials', label: 'Testimonials Carousel' }, { id: 'portfolio', label: 'Portfolio Gallery' },
    { id: 'pricing', label: 'Pricing Table' }, { id: 'team', label: 'Team Section' },
    { id: 'contact_form', label: 'Contact Form' }, { id: 'map', label: 'Location Map' },
    { id: 'newsletter', label: 'Newsletter Signup' }, { id: 'footer', label: 'Footer' }
  ];

  return (
    <PortalShell assistant={<WebsiteCoach form={form} onApply={handleCoachApply} pages={pages} features={features} />}>
      <div className="page-head">
        <div>
          <p className="eyebrow">AI Guided Generator</p>
          <h1>Website Generator</h1>
          <p>AI-guided website creation. Clone top competitors, get coached through your config, and generate production-ready websites that beat the competition.</p>
        </div>
      </div>

      {error && <div style={{ background: '#f5d8d5', color: '#a52d23', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* Competitor Cloning Section */}
      <section style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, marginBottom: 16, overflow: 'hidden' }}>
        <button onClick={() => setShowCloneSection(!showCloneSection)} style={{ width: '100%', padding: '16px 20px', background: 'none', border: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 700 }}>
          <span>🏆 Clone Top 3 Competitors {cloneResult && <span style={{ color: '#237A4B', fontSize: 12, fontWeight: 600 }}>✓ {cloneResult.competitors.length} analyzed</span>}</span>
          <span style={{ fontSize: 18 }}>{showCloneSection ? '−' : '+'}</span>
        </button>

        {showCloneSection && (
          <div style={{ padding: '0 20px 20px', borderTop: '1px solid #eee' }}>
            <p style={{ fontSize: 13, color: '#666', margin: '14px 0' }}>Enter your category or industry. The AI will find the top 3 rated websites, scrape them, analyze their design and content, then build a superiority strategy to generate something better.</p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, flex: 1, minWidth: 250 }}>
                Category / Niche
                <input value={cloneCategory} onChange={e => setCloneCategory(e.target.value)} placeholder="e.g. HVAC companies, dental practices, SaaS landing pages" style={{ padding: 11, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
              </label>
              <button onClick={cloneCompetitors} disabled={cloning} className="btn dark" style={{ padding: '11px 20px', fontSize: 13, opacity: cloning ? 0.6 : 1 }}>
                {cloning ? '🔍 Scraping top 3…' : '🔍 Clone Top 3'}
              </button>
            </div>

            {cloneError && <p style={{ color: '#a52d23', fontSize: 13, marginTop: 10 }}>{cloneError}</p>}

            {cloning && (
              <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 6 }}>
                    <span className="dot-anim" style={{ fontSize: 16 }}>●</span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>Searching & scraping competitor {i}…</span>
                  </div>
                ))}
              </div>
            )}

            {cloneResult && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ fontSize: 14, margin: '0 0 12px' }}>Top 3 Competitors Analyzed</h4>
                <div style={{ display: 'grid', gap: 10 }}>
                  {cloneResult.competitors.map((c, i) => (
                    <div key={i} style={{ background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 6, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10 }}>
                        <div>
                          <b style={{ fontSize: 13 }}>{i + 1}. {c.name}</b>
                          {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 11, color: 'var(--gold)', marginTop: 2 }}>{c.url} ↗</a>}
                        </div>
                        {c.rating && <span style={{ fontSize: 11, color: '#8A641C', fontWeight: 600, background: '#C89B3C20', padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>{c.rating}</span>}
                      </div>
                      {c.strengths && c.strengths.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                          {c.strengths.map((s, j) => <span key={j} style={{ fontSize: 10, background: '#fff', border: '1px solid #ddd', padding: '3px 8px', borderRadius: 4, color: '#666' }}>{s}</span>)}
                        </div>
                      )}
                      {c.scraped?.error && <p style={{ fontSize: 11, color: '#a52d23', marginTop: 6 }}>Scrape failed: {c.scraped.error} (analysis based on search data)</p>}
                    </div>
                  ))}
                </div>

                {cloneResult.analysis?.superiority_strategy && (
                  <div style={{ background: '#0a0a0a', color: '#fff', borderRadius: 6, padding: 16, marginTop: 14 }}>
                    <p style={{ color: 'var(--gold)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>Superiority Strategy</p>
                    <p style={{ fontSize: 13, margin: '8px 0 12px', color: '#ccc' }}>{cloneResult.analysis.superiority_strategy.design_direction}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {cloneResult.analysis.superiority_strategy.content_advantages?.length > 0 && (
                        <div>
                          <small style={{ color: 'var(--gold)', fontSize: 10, textTransform: 'uppercase' }}>Content Advantages</small>
                          <ul style={{ margin: '4px 0 0', paddingLeft: 16, fontSize: 12, color: '#aaa' }}>
                            {cloneResult.analysis.superiority_strategy.content_advantages.map((a, i) => <li key={i}>{a}</li>)}
                          </ul>
                        </div>
                      )}
                      {cloneResult.analysis.superiority_strategy.feature_advantages?.length > 0 && (
                        <div>
                          <small style={{ color: 'var(--gold)', fontSize: 10, textTransform: 'uppercase' }}>Feature Advantages</small>
                          <ul style={{ margin: '4px 0 0', paddingLeft: 16, fontSize: 12, color: '#aaa' }}>
                            {cloneResult.analysis.superiority_strategy.feature_advantages.map((a, i) => <li key={i}>{a}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                    {cloneResult.analysis.superiority_strategy.recommended_colors && (
                      <p style={{ fontSize: 12, color: '#888', marginTop: 10 }}><b style={{ color: 'var(--gold)' }}>Recommended colors:</b> {cloneResult.analysis.superiority_strategy.recommended_colors}</p>
                    )}
                  </div>
                )}

                <div style={{ background: '#f0f9f3', border: '1px solid #c8e6d0', borderRadius: 6, padding: 12, marginTop: 12, fontSize: 13 }}>
                  ✓ Competitor analysis ready! Now fill in your business details below and click <b>Generate Website</b> — the AI will use this analysis to build something <b>equivalent or better</b>.
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Config Form */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24 }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 16 }}>Configuration {cloneResult && <span style={{ fontSize: 12, color: '#237A4B', fontWeight: 600 }}>· with competitor analysis</span>}</h3>

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
          Business Name *
          <input value={form.business_name} onChange={e => updateForm('business_name', e.target.value)} placeholder="Acme Corp" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
        </label>

        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
          Industry
          <input value={form.industry} onChange={e => updateForm('industry', e.target.value)} placeholder="e.g. Construction, SaaS, Healthcare" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
        </label>

        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
          Business Description * <span style={{ fontWeight: 400, color: '#999' }}>— ask the coach for help →</span>
          <textarea value={form.description} onChange={e => updateForm('description', e.target.value)} placeholder="What does the business do? What problems does it solve? What makes it unique?" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, minHeight: 80 }} />
        </label>

        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
          Target Audience
          <input value={form.target_audience} onChange={e => updateForm('target_audience', e.target.value)} placeholder="e.g. Small business owners, enterprise CTOs" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
        </label>

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

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px' }}>Pages</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {pageOptions.map(p => (
              <button key={p} onClick={() => togglePage(p)} style={{
                padding: '6px 12px', borderRadius: 6, border: `1px solid ${pages.includes(p) ? '#C89B3C' : '#ddd'}`,
                background: pages.includes(p) ? '#C89B3C20' : '#fff', color: pages.includes(p) ? '#8A641C' : '#666',
                cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', textTransform: 'capitalize'
              }}>{p}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px' }}>Features</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {featureOptions.map(f => (
              <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={features.includes(f.id)} onChange={() => toggleFeature(f.id)} style={{ cursor: 'pointer' }} />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        <button onClick={generate} disabled={generating} className="btn dark" style={{ width: '100%', padding: '16px', fontSize: 15, opacity: generating ? 0.6 : 1 }}>
          {generating ? '⚡ Generating Amazing Website…' : cloneResult ? '🚀 Generate Superior Website' : '🚀 Generate Website'}
        </button>
        {generating && <p style={{ textAlign: 'center', color: '#999', fontSize: 12, marginTop: 10 }}>{cloneResult ? 'Building a website that beats the competition…' : 'This takes 30-60 seconds.'}</p>}
      </div>

      {/* Preview */}
      {result && (
        <div style={{ marginTop: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>✓ Website Generated!{cloneResult && <span style={{ fontSize: 12, color: '#237A4B' }}> · Superior to {cloneResult.competitors.length} competitors</span>}</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowPreview(!showPreview)} className="btn outline" style={{ fontSize: 12, padding: '8px 14px' }}>{showPreview ? 'View Code' : 'View Preview'}</button>
                <button onClick={openInNewTab} className="btn outline" style={{ fontSize: 12, padding: '8px 14px' }}>Open ↗</button>
                <button onClick={downloadHtml} className="btn gold" style={{ fontSize: 12, padding: '8px 14px' }}>⬇ Download HTML</button>
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Saved to Deliverable Studio. <Link to="/app/deliverable-studio" style={{ color: 'var(--gold)' }}>View in studio →</Link></p>
          </div>

          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
            {showPreview ? (
              <iframe srcDoc={result.website_html} style={{ width: '100%', height: 'calc(100vh - 320px)', minHeight: 500, border: '0' }} title="Website Preview" sandbox="allow-scripts allow-same-origin" />
            ) : (
              <pre style={{ padding: 16, fontSize: 11, overflow: 'auto', maxHeight: 'calc(100vh - 320px)', minHeight: 500, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{result.website_html}</pre>
            )}
          </div>
        </div>
      )}

      {savedWebsites.length > 0 && !result && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Previously Generated Websites</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {savedWebsites.map(w => (
              <div key={w.id} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
                <b style={{ fontSize: 14 }}>{w.title}</b>
                <p style={{ fontSize: 12, color: '#666', margin: '4px 0 8px' }}>{w.metadata?.industry || 'General'} · {new Date(w.created_date).toLocaleDateString()}</p>
                <button onClick={() => { setResult({ website_html: w.content, deliverable_id: w.id, business_name: w.metadata?.business_name }); }} style={{ padding: '6px 12px', border: '1px solid #C89B3C', borderRadius: 6, background: '#C89B3C20', color: '#8A641C', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>View →</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </PortalShell>
  );
}