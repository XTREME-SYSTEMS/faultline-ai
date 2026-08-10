import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Loader2, X, Check, Globe, Palette, Type, Image as ImageIcon, Zap,
  ExternalLink, Sparkles, ArrowRight, ArrowLeft, Building2, Share2,
} from 'lucide-react';
import SocialAutomationPanel from '@/components/clone-queue/SocialAutomationPanel';

// CustomizationStudio — full rebrand workflow for a discovered site.
// Generates 20 names, 20 domains, 20 color palettes, 20 content packs.
// User picks one from each, generates a logo, then rebuilds + launches.
export default function CustomizationStudio({ site, onClose }) {
  const [step, setStep] = useState(0); // 0=names, 1=palette, 2=content, 3=logo, 4=launch
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const [selectedName, setSelectedName] = useState(null);
  const [selectedPalette, setSelectedPalette] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [selectedLogo, setSelectedLogo] = useState(null);

  const [logos, setLogos] = useState([]);
  const [generatingLogos, setGeneratingLogos] = useState(false);

  const [launching, setLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState(null);
  const [launchError, setLaunchError] = useState('');
  const [showSocial, setShowSocial] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await base44.functions.invoke('generateCustomizationStudio', {
          site_name: site.name,
          site_url: site.url,
          industry: site.niche,
          niche: site.niche,
        });
        const d = res.data || res;
        if (d.error) throw new Error(d.error);
        setData(d);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [site]);

  async function generateLogos() {
    if (!selectedName) return;
    setGeneratingLogos(true);
    setError('');
    try {
      const bizName = selectedName.name;
      const ind = data.industry || 'business';
      const styles = [
        { label: 'Minimalist', prompt: `Modern minimalist logo for "${bizName}", ${ind} industry, clean geometric design, professional, vector style, simple, white background` },
        { label: 'Emblem', prompt: `Bold emblem badge logo for "${bizName}", ${ind} industry, circular crest style, premium, white background` },
        { label: 'Wordmark', prompt: `Sleek modern wordmark typography logo for "${bizName}", ${ind} industry, elegant lettering, monochrome with one accent color, white background` },
      ];
      const results = await Promise.all(styles.map(s =>
        base44.integrations.Core.GenerateImage({ prompt: s.prompt }).catch(() => ({ url: '' }))
      ));
      setLogos(styles.map((s, i) => ({
        id: `logo_${i}`,
        label: s.label,
        image_url: results[i]?.url || '',
      })));
    } catch (e) {
      setError(e.message);
    } finally {
      setGeneratingLogos(false);
    }
  }

  async function handleLaunch() {
    setLaunching(true);
    setLaunchError('');
    setLaunchResult(null);
    try {
      const res = await base44.functions.invoke('rebuildCustomClone', {
        target_url: site.url,
        business_name: selectedName.name,
        palette: selectedPalette,
        content_pack: selectedContent,
        logo_url: selectedLogo?.image_url || null,
        industry: data.industry,
        niche: site.niche,
      });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setLaunchResult(d);
    } catch (e) {
      setLaunchError(e.message);
    } finally {
      setLaunching(false);
    }
  }

  const steps = ['Name', 'Colors', 'Content', 'Logo', 'Launch'];
  const canProceed = [
    !!selectedName,
    !!selectedPalette,
    !!selectedContent,
    !!selectedLogo,
    !!launchResult,
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>
        <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 16px', display: 'block', color: '#C89B3C' }} />
        <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 6px' }}>Generating customization options…</p>
        <p style={{ fontSize: 13, color: '#aaa' }}>20 names, 20 domains, 20 color palettes, 20 content packs</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ padding: 20, background: '#f5d8d5', borderRadius: 10, color: '#a52d23' }}>
        {error}
        <button onClick={onClose} style={{ marginLeft: 16, padding: '6px 12px', background: '#C63D34', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer' }}>Close</button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'radial-gradient(circle at 82% 40%, #C89B3C30, transparent 25%), #0a0a0a',
        color: '#fff', padding: 24, borderRadius: 12, marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <p style={{ color: '#E7C86E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>Customization Studio</p>
          <h2 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 28, margin: '8px 0 4px' }}>
            Rebrand <span style={{ color: '#E7C86E' }}>{site.name}</span>
          </h2>
          <p style={{ color: '#aaa', fontSize: 13, margin: 0 }}>
            Pick a name, colors, content, and logo — then rebuild & launch
          </p>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', border: 0, color: '#fff', cursor: 'pointer', padding: 8, borderRadius: 8 }}>
          <X size={20} />
        </button>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid #ddd' }}>
        {steps.map((label, i) => (
          <button key={i} onClick={() => setStep(i)} style={{
            flex: 1, padding: '12px 8px', background: 'none', border: 0,
            borderBottom: step === i ? '3px solid #C89B3C' : '3px solid transparent',
            color: step === i ? '#111' : '#888', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center',
              fontSize: 11, fontWeight: 700,
              background: canProceed[i] ? '#237A4B' : step === i ? '#C89B3C' : '#eee',
              color: canProceed[i] || step === i ? '#fff' : '#888',
            }}>{canProceed[i] ? <Check size={12} /> : i + 1}</span>
            {label}
          </button>
        ))}
      </div>

      {error && <div style={{ padding: 12, background: '#f5d8d5', borderRadius: 8, color: '#a52d23', fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {/* Step 0: Name picker */}
      {step === 0 && data && (
        <Section title="Pick a Business Name" subtitle="20 AI-generated names with domain suggestions" icon={Building2}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {data.names.map(n => (
              <button key={n.id} onClick={() => setSelectedName(n)} style={{
                ...cardStyle, borderColor: selectedName?.id === n.id ? '#C89B3C' : '#ddd',
                background: selectedName?.id === n.id ? '#fef9ef' : '#fff',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <b style={{ fontSize: 15, display: 'block' }}>{n.name}</b>
                    <span style={{ fontSize: 12, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <Globe size={11} /> {n.domain}
                    </span>
                  </div>
                  <span style={{ padding: '2px 8px', background: '#f4edca', borderRadius: 4, fontSize: 9, color: '#7e6b00', textTransform: 'uppercase' }}>{n.style}</span>
                </div>
                {selectedName?.id === n.id && <Check size={16} style={{ color: '#C89B3C', position: 'absolute', top: 10, right: 10 }} />}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Step 1: Palette picker */}
      {step === 1 && data && (
        <Section title="Pick a Color Palette" subtitle="20 distinct professional color schemes" icon={Palette}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {data.palettes.map(p => (
              <button key={p.id} onClick={() => setSelectedPalette(p)} style={{
                ...cardStyle, borderColor: selectedPalette?.id === p.id ? '#C89B3C' : '#ddd',
                padding: 0, overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', height: 40 }}>
                  <div style={{ flex: 1, background: p.primary }} />
                  <div style={{ flex: 1, background: p.secondary }} />
                  <div style={{ flex: 1, background: p.accent }} />
                  <div style={{ flex: 1, background: p.background, borderLeft: '1px solid #eee' }} />
                </div>
                <div style={{ padding: 10, textAlign: 'left' }}>
                  <b style={{ fontSize: 13 }}>{p.name}</b>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, fontSize: 9, color: '#999' }}>
                    <span>{p.primary}</span> · <span>{p.accent}</span>
                  </div>
                </div>
                {selectedPalette?.id === p.id && <Check size={16} style={{ color: '#C89B3C', position: 'absolute', top: 6, right: 8, background: '#fff', borderRadius: '50%' }} />}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Step 2: Content picker */}
      {step === 2 && data && (
        <Section title="Pick a Content Pack" subtitle="20 tones — each with tagline, hero headline, about text, and contact info" icon={Type}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
            {data.content_packs.map(c => (
              <button key={c.id} onClick={() => setSelectedContent(c)} style={{
                ...cardStyle, borderColor: selectedContent?.id === c.id ? '#C89B3C' : '#ddd',
                background: selectedContent?.id === c.id ? '#fef9ef' : '#fff',
              }}>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ padding: '2px 8px', background: '#e0e7ff', borderRadius: 4, fontSize: 9, color: '#4f46e5', textTransform: 'uppercase', fontWeight: 700 }}>{c.tone}</span>
                  <b style={{ fontSize: 14, display: 'block', marginTop: 8, lineHeight: 1.3 }}>{c.hero_headline}</b>
                  <span style={{ fontSize: 12, color: '#C89B3C', display: 'block', marginTop: 6, fontStyle: 'italic' }}>"{c.tagline}"</span>
                  <p style={{ fontSize: 11, color: '#666', marginTop: 8, lineHeight: 1.4 }}>{c.about_text}</p>
                  <div style={{ marginTop: 8, display: 'grid', gap: 2, fontSize: 10, color: '#999' }}>
                    <span>📞 {c.contact?.phone}</span>
                    <span>✉ {c.contact?.email}</span>
                  </div>
                </div>
                {selectedContent?.id === c.id && <Check size={16} style={{ color: '#C89B3C', position: 'absolute', top: 10, right: 10 }} />}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Step 3: Logo generator */}
      {step === 3 && (
        <Section title="Generate a Logo" subtitle="3 AI-generated logo concepts for your selected name" icon={ImageIcon}>
          {!selectedName && (
            <p style={{ color: '#999', fontSize: 14 }}>Pick a name first.</p>
          )}
          {selectedName && logos.length === 0 && !generatingLogos && (
            <button onClick={generateLogos} style={{
              padding: '16px 32px', background: 'linear-gradient(135deg, #E7C86E, #C89B3C)',
              color: '#111', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Sparkles size={18} /> Generate 3 Logo Concepts for "{selectedName.name}"
            </button>
          )}
          {generatingLogos && (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block', color: '#C89B3C' }} />
              <p style={{ fontSize: 14, fontWeight: 600 }}>Generating logo concepts…</p>
            </div>
          )}
          {logos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {logos.map(logo => (
                <button key={logo.id} onClick={() => setSelectedLogo(logo)} style={{
                  ...cardStyle, borderColor: selectedLogo?.id === logo.id ? '#C89B3C' : '#ddd',
                  padding: 0, overflow: 'hidden',
                }}>
                  <div style={{ height: 160, background: '#fff', display: 'grid', placeItems: 'center' }}>
                    {logo.image_url ? (
                      <img src={logo.image_url} alt={logo.label} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    ) : (
                      <ImageIcon size={32} style={{ color: '#ccc' }} />
                    )}
                  </div>
                  <div style={{ padding: 10, textAlign: 'center' }}>
                    <b style={{ fontSize: 12 }}>{logo.label}</b>
                  </div>
                  {selectedLogo?.id === logo.id && <Check size={16} style={{ color: '#C89B3C', position: 'absolute', top: 8, right: 8, background: '#fff', borderRadius: '50%' }} />}
                </button>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Step 4: Launch */}
      {step === 4 && (
        <Section title="Rebuild & Launch" subtitle="Apply your selections and launch the custom clone" icon={Zap}>
          {/* Summary */}
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 20, margin: '0 0 16px' }}>Selection Summary</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <SummaryRow label="Business Name" value={selectedName?.name} sub={selectedName?.domain} />
              <SummaryRow label="Color Palette" value={selectedPalette?.name} sub={selectedPalette ? `${selectedPalette.primary} · ${selectedPalette.accent}` : null}>
                {selectedPalette && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: selectedPalette.primary }} />
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: selectedPalette.secondary }} />
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: selectedPalette.accent }} />
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: selectedPalette.background, border: '1px solid #ddd' }} />
                  </div>
                )}
              </SummaryRow>
              <SummaryRow label="Content Tone" value={selectedContent?.tone} sub={selectedContent?.tagline} />
              <SummaryRow label="Logo" value={selectedLogo?.label}>
                {selectedLogo?.image_url && (
                  <img src={selectedLogo.image_url} alt="Logo" style={{ width: 60, height: 60, objectFit: 'contain', marginTop: 6, border: '1px solid #eee', borderRadius: 6 }} />
                )}
              </SummaryRow>
              <SummaryRow label="Original Site" value={site.name} sub={site.url} />
            </div>
          </div>

          {/* Launch button */}
          {!launchResult && (
            <button onClick={handleLaunch} disabled={launching} style={{
              width: '100%', padding: '18px', background: launching ? '#666' : 'linear-gradient(135deg, #E7C86E, #C89B3C)',
              color: '#111', border: 0, borderRadius: 10, fontWeight: 700, fontSize: 16, cursor: launching ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              {launching ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} />}
              {launching ? 'Rebuilding & Launching…' : 'Rebuild & Launch Custom Clone'}
            </button>
          )}

          {launchError && (
            <div style={{ marginTop: 14, padding: 14, background: '#f5d8d5', borderRadius: 8, color: '#a52d23', fontSize: 13 }}>{launchError}</div>
          )}

          {/* Launch result */}
          {launchResult && !showSocial && (
            <div style={{ padding: 20, background: '#e8f5ec', border: '1px solid #237A4B', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Check size={24} style={{ color: '#237A4B' }} />
                <b style={{ fontSize: 16, color: '#237A4B' }}>Custom Clone Launched!</b>
              </div>
              <p style={{ fontSize: 14, color: '#333', margin: '0 0 12px' }}>
                <b>{launchResult.business_name}</b> is now live. Audit & hardening are running in the background to reach 100/100.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a href={launchResult.vercel_url} target="_blank" rel="noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px',
                  background: '#0a0a0a', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 13,
                }}>
                  <ExternalLink size={16} /> View Live Site
                </a>
                <button onClick={() => setShowSocial(true)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px',
                  background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111',
                  border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}>
                  <Share2 size={16} /> Promote on Social Media
                </button>
                <button onClick={onClose} style={{
                  padding: '10px 20px', background: '#fff', border: '1px solid #ddd',
                  borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}>Back to Discovery</button>
              </div>
            </div>
          )}

          {/* Social automation panel */}
          {launchResult && showSocial && (
            <SocialAutomationPanel
              clone={{
                business_name: launchResult.business_name,
                industry: data?.industry,
                niche: site.niche,
                vercel_url: launchResult.vercel_url,
                content_pack: selectedContent,
              }}
              onClose={() => setShowSocial(false)}
            />
          )}
        </Section>
      )}

      {/* Navigation */}
      {step < 4 && !launchResult && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid #eee' }}>
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
            background: '#fff', border: '1px solid #ddd', borderRadius: 8,
            fontWeight: 700, fontSize: 13, cursor: step === 0 ? 'not-allowed' : 'pointer', color: step === 0 ? '#ccc' : '#666',
          }}>
            <ArrowLeft size={16} /> Back
          </button>
          <button onClick={() => setStep(step + 1)} disabled={!canProceed[step]} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px',
            background: canProceed[step] ? 'linear-gradient(135deg, #E7C86E, #C89B3C)' : '#eee',
            color: canProceed[step] ? '#111' : '#999', border: 0, borderRadius: 8,
            fontWeight: 700, fontSize: 13, cursor: canProceed[step] ? 'pointer' : 'not-allowed',
          }}>
            Next <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

const cardStyle = {
  border: '1px solid #ddd', borderRadius: 10, padding: 14,
  cursor: 'pointer', textAlign: 'left', position: 'relative',
  transition: 'border-color .15s, background .15s',
};

function Section({ title, subtitle, icon: Icon, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Icon size={20} style={{ color: '#C89B3C' }} />
        <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22, margin: 0 }}>{title}</h3>
      </div>
      <p style={{ color: '#888', fontSize: 13, margin: '0 0 20px' }}>{subtitle}</p>
      {children}
    </div>
  );
}

function SummaryRow({ label, value, sub, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
      <div>
        <small style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</small>
        {value && <b style={{ fontSize: 14, display: 'block', marginTop: 2 }}>{value}</b>}
        {sub && <span style={{ fontSize: 12, color: '#666', display: 'block' }}>{sub}</span>}
      </div>
      {children}
    </div>
  );
}