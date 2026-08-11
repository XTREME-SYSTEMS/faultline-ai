import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import TemplateGallery from '@/components/template-library/TemplateGallery';
import LogoGenerator from '@/components/template-library/LogoGenerator';
import ImageGenerator from '@/components/template-library/ImageGenerator';
import AICopywriter from '@/components/template-library/AICopywriter';
import FontPairer from '@/components/template-library/FontPairer';
import { Loader2, Palette, Rocket, Check, X, Eye, ArrowLeft, Type } from 'lucide-react';

const ACCENT_PRESETS = ['#C89B3C', '#2563eb', '#7c3aed', '#059669', '#dc2626', '#ea580c', '#0891b2', '#db2777', '#4f46e5', '#0a0a0a'];

export default function TemplateLibrary() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deriving, setDeriving] = useState(false);
  const [deriveResult, setDeriveResult] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [genError, setGenError] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState(null);
  const [deployError, setDeployError] = useState('');

  // Customization state
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [domain, setDomain] = useState('');
  const [accentColor, setAccentColor] = useState('#C89B3C');
  const [fontPair, setFontPair] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [copyOverrides, setCopyOverrides] = useState(null);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.WebsiteTemplate.list('-created_date', 200);
      setTemplates(list || []);
    } catch (e) {
      console.error('Template load failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const deriveTemplates = async () => {
    setDeriving(true);
    setDeriveResult(null);
    try {
      const res = await base44.functions.invoke('deriveTemplatesFromClones', { limit: 20 });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setDeriveResult(d);
      await loadTemplates();
    } catch (e) {
      setDeriveResult({ error: e.message });
    } finally {
      setDeriving(false);
    }
  };

  const selectTemplate = (tpl) => {
    setSelectedTemplate(tpl);
    setGenResult(null);
    setGenError('');
    setDeployResult(null);
    setDeployError('');
    // Pre-fill from template
    if (tpl.color_palette?.accent) setAccentColor(tpl.color_palette.accent);
    if (tpl.font_pairings?.length > 0) setFontPair(tpl.font_pairings[0]);
    if (tpl.industry) setIndustry(tpl.industry);
    setLogoUrl('');
    setHeroImage('');
    setCopyOverrides(null);
  };

  const goBack = () => {
    setSelectedTemplate(null);
    setGenResult(null);
    setGenError('');
    setDeployResult(null);
    setDeployError('');
  };

  const generate = async () => {
    if (!businessName) { setGenError('Enter a business name first'); return; }
    setGenerating(true);
    setGenError('');
    setGenResult(null);
    try {
      const res = await base44.functions.invoke('generateFromTemplate', {
        template_id: selectedTemplate.id,
        business_name: businessName,
        industry: industry || selectedTemplate.industry,
        domain,
        accent_color: accentColor,
        font_heading: fontPair?.heading,
        font_body: fontPair?.body,
        logo_url: logoUrl || undefined,
        hero_image_url: heroImage || undefined,
        copy_overrides: copyOverrides || undefined,
      });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setGenResult(d);
      setPreviewKey(k => k + 1);
    } catch (e) {
      setGenError(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const deploy = async () => {
    if (!genResult?.website_html) { setDeployError('Generate the site first'); return; }
    setDeploying(true);
    setDeployError('');
    setDeployResult(null);
    try {
      const launchName = `${businessName.replace(/\s+/g, '-').toLowerCase()}-${Date.now().toString(36).slice(-5)}`;
      const res = await base44.functions.invoke('launchProject', {
        project_name: launchName,
        website_html: genResult.website_html,
      });
      const d = res.data || res;
      if (d.status !== 'success') throw new Error(`Launch failed: ${JSON.stringify(d.errors)}`);
      setDeployResult(d);
    } catch (e) {
      setDeployError(e.message || 'Deploy failed');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <>
      <XtremeOSSidebar />
      <div className="portal-page xtremeos-content" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240 }}>
        {/* Header */}
        <div style={{
          background: 'radial-gradient(circle at 82% 40%, #C89B3C45, transparent 25%), #0a0a0a',
          color: '#fff', padding: '36px 28px', margin: '-28px -28px 24px',
        }}>
          <p style={{ color: '#E7C86E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>xtremeclonesystems.com</p>
          <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 42, margin: '8px 0 4px', letterSpacing: '-.03em' }}>
            Template <span style={{ color: '#E7C86E' }}>Library</span>
          </h1>
          <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>
            Auto-derived from your 100/100 clones · Pick a layout, customize colors, fonts, logo & images, then deploy
          </p>
        </div>

        {/* Derive Result */}
        {deriveResult && (
          <div style={{
            marginBottom: 16, padding: 16, borderRadius: 8,
            background: deriveResult.error ? '#f5d8d5' : '#e8f5ec',
            border: `1px solid ${deriveResult.error ? '#C63D34' : '#237A4B'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontSize: 13, color: deriveResult.error ? '#a52d23' : '#237A4B' }}>
                {deriveResult.error ? 'Derive Failed' : `Derived ${deriveResult.created} new templates from ${deriveResult.processed} clones`}
              </b>
              <button onClick={() => setDeriveResult(null)} style={{ background: 'none', border: 0, cursor: 'pointer', color: '#999' }}>
                <X size={14} />
              </button>
            </div>
            {deriveResult.error && <p style={{ fontSize: 12, color: '#a52d23', margin: '4px 0 0' }}>{deriveResult.error}</p>}
            {!deriveResult.error && deriveResult.total_perfect !== undefined && (
              <p style={{ fontSize: 11, color: '#666', margin: '4px 0 0' }}>
                {deriveResult.total_perfect} perfect clones available · {deriveResult.existing_templates || 0} templates already exist
              </p>
            )}
          </div>
        )}

        {!selectedTemplate ? (
          /* Step 1: Template Gallery */
          <TemplateGallery
            templates={templates}
            loading={loading}
            onSelect={selectTemplate}
            selectedId={null}
            onDerive={deriveTemplates}
            deriving={deriving}
          />
        ) : (
          /* Step 2: Customizer */
          <div>
            {/* Back button + template info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <button onClick={goBack} style={{
                display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #ddd',
                borderRadius: 6, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#666',
              }}>
                <ArrowLeft size={14} /> Back to Gallery
              </button>
              <div style={{ flex: 1 }}>
                <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 20 }}>{selectedTemplate.name}</b>
                <span style={{ fontSize: 12, color: '#999', marginLeft: 10 }}>
                  {selectedTemplate.layout_type} · {selectedTemplate.industry || 'General'} · {selectedTemplate.sections?.length || 0} sections
                </span>
              </div>
            </div>

            {/* Business Info */}
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 20, marginBottom: 16 }}>
              <b style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>Business Information</b>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#666', display: 'block', marginBottom: 4 }}>Business Name *</label>
                  <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Apex Epoxy Floors"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d7d7d7', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#111' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#666', display: 'block', marginBottom: 4 }}>Industry</label>
                  <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Construction"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d7d7d7', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#111' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#666', display: 'block', marginBottom: 4 }}>Domain (optional)</label>
                  <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="e.g. apexepoxy.com"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d7d7d7', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#111' }} />
                </div>
              </div>
            </div>

            {/* Accent Color Picker */}
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Palette size={18} style={{ color: '#C89B3C' }} />
                <b style={{ fontSize: 14 }}>Accent Color</b>
                <span style={{ fontSize: 11, color: '#999' }}>· Hue-shifts the entire template to match</span>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {ACCENT_PRESETS.map(c => (
                  <button key={c} onClick={() => setAccentColor(c)} style={{
                    width: 36, height: 36, borderRadius: 8, background: c, border: `2px solid ${accentColor === c ? '#0a0a0a' : '#ddd'}`,
                    cursor: 'pointer', fontFamily: 'inherit', padding: 0, position: 'relative',
                  }}>
                    {accentColor === c && <Check size={16} style={{ color: '#fff', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />}
                  </button>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                  <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ width: 40, height: 36, border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#666' }}>{accentColor}</span>
                </div>
              </div>
              {selectedTemplate.suggested_accents?.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #eee' }}>
                  <span style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>Suggested for this layout:</span>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    {selectedTemplate.suggested_accents.map(c => (
                      <button key={c} onClick={() => setAccentColor(c)} style={{
                        width: 28, height: 28, borderRadius: 6, background: c, border: `2px solid ${accentColor === c ? '#0a0a0a' : '#ddd'}`,
                        cursor: 'pointer', fontFamily: 'inherit', padding: 0,
                      }} title={c} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Font Pairing */}
            <div style={{ marginBottom: 16 }}>
              <FontPairer
                pairings={selectedTemplate.font_pairings}
                selected={fontPair}
                onSelect={setFontPair}
              />
            </div>

            {/* AI Tools — two column */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16, marginBottom: 16 }}>
              <LogoGenerator
                businessName={businessName}
                industry={industry || selectedTemplate.industry}
                accentColor={accentColor}
                onSelect={setLogoUrl}
              />
              <ImageGenerator
                industry={industry || selectedTemplate.industry}
                onSelect={setHeroImage}
              />
            </div>

            {/* AI Copywriter */}
            <div style={{ marginBottom: 16 }}>
              <AICopywriter
                businessName={businessName}
                industry={industry || selectedTemplate.industry}
                onApply={setCopyOverrides}
              />
            </div>

            {/* Generate + Deploy */}
            <div style={{ background: '#fff', border: '2px solid #C89B3C', borderRadius: 10, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <b style={{ fontSize: 15 }}>Generate & Deploy</b>
                  <p style={{ fontSize: 12, color: '#999', margin: '4px 0 0' }}>
                    Applies all customizations to the template and deploys to Vercel
                  </p>
                </div>
              </div>

              {/* Selected customizations summary */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {businessName && <Chip label={`Name: ${businessName}`} />}
                {accentColor && <Chip label={`Accent: ${accentColor}`} color={accentColor} />}
                {fontPair && <Chip label={`Fonts: ${fontPair.heading} + ${fontPair.body}`} />}
                {logoUrl && <Chip label="✓ Logo selected" />}
                {heroImage && <Chip label="✓ Hero image selected" />}
                {copyOverrides && <Chip label="✓ Copy applied" />}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={generate} disabled={generating || !businessName} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: generating ? '#666' : 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111',
                  border: 0, borderRadius: 6, padding: '12px 24px', fontSize: 14, fontWeight: 700,
                  cursor: (generating || !businessName) ? 'wait' : 'pointer', fontFamily: 'inherit',
                  opacity: (!businessName || generating) ? 0.6 : 1,
                }}>
                  {generating ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
                  {generating ? 'Generating…' : 'Generate Preview'}
                </button>
                {genResult && (
                  <button onClick={deploy} disabled={deploying} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: deploying ? '#666' : '#0a0a0a', color: '#fff',
                    border: 0, borderRadius: 6, padding: '12px 24px', fontSize: 14, fontWeight: 700,
                    cursor: deploying ? 'wait' : 'pointer', fontFamily: 'inherit',
                  }}>
                    {deploying ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}
                    {deploying ? 'Deploying…' : 'Deploy to Vercel'}
                  </button>
                )}
              </div>

              {genError && <p style={{ color: '#a52d23', fontSize: 12, marginTop: 10 }}>{genError}</p>}
              {deployError && <p style={{ color: '#a52d23', fontSize: 12, marginTop: 10 }}>{deployError}</p>}
            </div>

            {/* Live Preview */}
            {genResult && (
              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 20, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <b style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Eye size={16} style={{ color: '#C89B3C' }} /> Live Preview
                  </b>
                  {genResult.file_url && (
                    <a href={genResult.file_url} target="_blank" rel="noopener" style={{ fontSize: 12, color: '#C89B3C', fontWeight: 600 }}>
                      Open full page ↗
                    </a>
                  )}
                </div>
                <div style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', height: 500, background: '#fff' }}>
                  <iframe
                    key={previewKey}
                    srcDoc={genResult.website_html}
                    title="Preview"
                    style={{ width: '100%', height: '100%', border: 0 }}
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            )}

            {/* Deploy Result */}
            {deployResult && (
              <div style={{
                padding: 20, borderRadius: 10,
                background: '#e8f5ec', border: '1px solid #237A4B', marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Check size={18} style={{ color: '#237A4B' }} />
                  <b style={{ fontSize: 15, color: '#237A4B' }}>Deployed Successfully!</b>
                </div>
                {deployResult.results?.vercel?.deploy?.url && (
                  <a href={deployResult.results.vercel.deploy.url} target="_blank" rel="noopener" style={{
                    display: 'inline-block', padding: '10px 20px', background: '#0a0a0a', color: '#fff',
                    borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: 'none', fontFamily: 'inherit',
                  }}>
                    Visit Live Site ↗
                  </a>
                )}
                {deployResult.results?.github?.url && (
                  <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                    GitHub: <a href={deployResult.results.github.url} target="_blank" rel="noopener" style={{ color: '#C89B3C' }}>{deployResult.results.github.url}</a>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function Chip({ label, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
      background: '#f0ede5', color: '#555', padding: '4px 10px', borderRadius: 20, border: '1px solid #e5e1da',
    }}>
      {color && <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, border: '1px solid #ddd' }} />}
      {label}
    </span>
  );
}