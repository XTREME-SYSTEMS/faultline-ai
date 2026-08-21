import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { AIStepCoach } from '@/components/client-portal/AIStepCoach';
import { CheckCircle2, ChevronRight, ChevronLeft, ExternalLink, Upload, Rocket, Palette, FileText, Globe, Building2, Layout, Loader2 } from 'lucide-react';

const TOTAL_STEPS = 6;
const STEP_META = [
  { icon: Building2, title: 'Business Profile', desc: 'Tell us about your business' },
  { icon: Layout, title: 'Choose Template', desc: 'Pick a proven design' },
  { icon: Palette, title: 'Brand Setup', desc: 'Colors, logo, tagline' },
  { icon: FileText, title: 'Content Review', desc: 'Review your website copy' },
  { icon: Globe, title: 'Domain Setup', desc: 'Connect your domain' },
  { icon: Rocket, title: 'Launch', desc: 'Go live' },
];

const COLOR_PRESETS = ['#C89B3C', '#1a56DB', '#059669', '#DC2626', '#7C3AED', '#EA580C', '#0EA5E9', '#111111'];

// ─── COLOR HELPERS (live template preview) ──────────────────────────
function hexToHue(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  let h;
  if (max === r) h = ((g - b) / (max - min) + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / (max - min) + 2) * 60;
  else h = ((r - g) / (max - min) + 4) * 60;
  return h;
}

function getColorFilter(targetHex) {
  const defaultHue = 41; // #C89B3C ≈ 41deg
  const targetHue = hexToHue(targetHex);
  const rotation = targetHue - defaultHue;
  return `hue-rotate(${rotation}deg) saturate(1.15)`;
}

function TemplateThumbnail({ url, name }) {
  const [imgError, setImgError] = useState(false);
  if (imgError) {
    return (
      <iframe src={url} style={{ width: '1200px', height: '700px', transform: 'scale(0.22)', transformOrigin: 'top left', border: 0, pointerEvents: 'none' }} title={name} />
    );
  }
  return (
    <img
      src={`https://image.thum.io/get/width/600/crop/400/${url}`}
      alt={name}
      onError={() => setImgError(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}

export default function ClientOnboardingPortal() {
  const [user, setUser] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [suggestions, setSuggestions] = useState({});

  // Load user + onboarding record
  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        const orgId = me?.data?.organization_id || 'default';
        const existing = await base44.entities.ClientOnboarding.filter({ organization_id: orgId });
        let record = existing[0];
        if (!record) {
          record = await base44.entities.ClientOnboarding.create({
            organization_id: orgId,
            current_step: 1,
            total_steps: TOTAL_STEPS,
            status: 'in_progress',
          });
        }
        setOnboarding(record);
        // Load epoxy templates
        const projects = await base44.entities.LaunchProject.filter({ organization_id: orgId, status: 'passed' });
        const epoxy = projects.filter(p => {
          const t = `${p.project_name || ''} ${p.business_name || ''} ${p.industry || ''}`.toLowerCase();
          return t.includes('epoxy') || t.includes('garage') || t.includes('concrete') || t.includes('floor') || t.includes('coating');
        }).slice(0, 12);
        setTemplates(epoxy);
      } catch (e) {
        console.error('Onboarding load error:', e);
      }
      setLoading(false);
    })();
  }, []);

  const update = useCallback(async (data) => {
    if (!onboarding) return;
    setSaving(true);
    try {
      const updated = await base44.entities.ClientOnboarding.update(onboarding.id, data);
      setOnboarding(updated);
    } catch (e) {
      console.error('Update error:', e);
    }
    setSaving(false);
  }, [onboarding]);

  const completeStep = async (stepData) => {
    const nextStep = (onboarding.current_step || 1) + 1;
    const isLast = nextStep > TOTAL_STEPS;
    await update({
      ...stepData,
      current_step: isLast ? TOTAL_STEPS : nextStep,
      status: isLast ? 'completed' : 'in_progress',
      completed_at: isLast ? new Date().toISOString() : undefined,
    });
  };

  const goBack = async () => {
    if (!onboarding || onboarding.current_step <= 1) return;
    await update({ current_step: onboarding.current_step - 1 });
  };

  const handleSuggest = (type, data) => {
    setSuggestions(prev => ({ ...prev, [type]: data }));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f7f7f5' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#C89B3C' }} />
      </div>
    );
  }

  const step = onboarding?.current_step || 1;

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f5', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ height: 64, background: '#fff', borderBottom: '1px solid #e5e1da', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#0a0a0a', display: 'grid', placeItems: 'center' }}>
            <Rocket size={18} color="#C89B3C" />
          </div>
          <div>
            <b style={{ fontSize: 14 }}>Client Portal</b>
            <p style={{ fontSize: 10, color: '#888', margin: 0 }}>Guided Website Builder</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#666' }}>
          {user?.email && <span>{user.email}</span>}
          <Link to="/app" style={{ color: '#888', fontSize: 12, textDecoration: 'underline' }}>Exit</Link>
        </div>
      </header>

      {/* Progress bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e1da', padding: '16px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, maxWidth: 900, margin: '0 auto' }}>
          {STEP_META.map((s, i) => {
            const num = i + 1;
            const isDone = num < step;
            const isCurrent = num === step;
            const Icon = s.icon;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEP_META.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center',
                    background: isDone ? '#237A4B' : isCurrent ? '#C89B3C' : '#e5e1da',
                    color: isDone || isCurrent ? '#fff' : '#999',
                    border: isCurrent ? '2px solid #C89B3C' : '2px solid transparent',
                    transition: 'all .2s',
                  }}>
                    {isDone ? <CheckCircle2 size={18} /> : <Icon size={16} />}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 600, color: isCurrent ? '#8A641C' : isDone ? '#237A4B' : '#999', whiteSpace: 'nowrap' }}>{s.title}</span>
                </div>
                {i < STEP_META.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: isDone ? '#237A4B' : '#e5e1da', margin: '0 4px', marginBottom: 18, transition: 'background .2s' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main content + AI coach */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', minHeight: 0 }}>
        {/* Step content */}
        <div style={{ padding: '32px 40px', overflowY: 'auto' }}>
          {onboarding?.status === 'completed' ? (
            <CompletionScreen onboarding={onboarding} onRestart={() => update({ status: 'in_progress', current_step: 1 })} />
          ) : (
            <StepContent
              step={step}
              onboarding={onboarding}
              templates={templates}
              suggestions={suggestions}
              saving={saving}
              onComplete={completeStep}
              onBack={goBack}
              onUpdate={update}
            />
          )}
        </div>

        {/* AI Coach */}
        <aside style={{ borderLeft: '1px solid #e5e1da', position: 'sticky', top: 112, height: 'calc(100vh - 112px)', overflow: 'hidden' }}>
          <AIStepCoach step={step} onboarding={onboarding} onSuggest={handleSuggest} />
        </aside>
      </div>
    </div>
  );
}

// ─── STEP CONTENT ROUTER ─────────────────────────────────────────────
function StepContent({ step, onboarding, templates, suggestions, saving, onComplete, onBack, onUpdate }) {
  switch (step) {
    case 1: return <StepBusinessProfile onboarding={onboarding} saving={saving} onComplete={onComplete} onBack={onBack} />;
    case 2: return <StepChooseTemplate onboarding={onboarding} templates={templates} saving={saving} onComplete={onComplete} onBack={onBack} />;
    case 3: return <StepBrandSetup onboarding={onboarding} suggestions={suggestions} saving={saving} onComplete={onComplete} onBack={onBack} onUpdate={onUpdate} />;
    case 4: return <StepContentReview onboarding={onboarding} suggestions={suggestions} saving={saving} onComplete={onComplete} onBack={onBack} onUpdate={onUpdate} />;
    case 5: return <StepDomain onboarding={onboarding} saving={saving} onComplete={onComplete} onBack={onBack} />;
    case 6: return <StepLaunch onboarding={onboarding} saving={saving} onComplete={onComplete} onBack={onBack} />;
    default: return null;
  }
}

// ─── STEP 1: BUSINESS PROFILE ────────────────────────────────────────
function StepBusinessProfile({ onboarding, saving, onComplete, onBack }) {
  const [form, setForm] = useState({
    business_name: onboarding?.business_name || '',
    service_area: onboarding?.service_area || '',
    primary_service: onboarding?.primary_service || 'Epoxy Flooring',
    phone: onboarding?.phone || '',
    email: onboarding?.email || '',
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const valid = form.business_name && form.service_area && form.phone;

  return (
    <StepShell title="Tell Us About Your Business" subtitle="This information shapes your entire website. Take a moment to fill it in accurately.">
      <div style={{ display: 'grid', gap: 18, maxWidth: 520 }}>
        <Field label="Business Name *">
          <input className="fl-input" value={form.business_name} onChange={e => set('business_name', e.target.value)} placeholder="e.g., Apex Epoxy Floors" />
        </Field>
        <Field label="Service Area *">
          <input className="fl-input" value={form.service_area} onChange={e => set('service_area', e.target.value)} placeholder="e.g., Los Angeles, CA" />
        </Field>
        <Field label="Primary Service">
          <select className="fl-input" value={form.primary_service} onChange={e => set('primary_service', e.target.value)}>
            {['Epoxy Flooring', 'Concrete Coatings', 'Garage Floor Epoxy', 'Metallic Epoxy', 'Commercial Epoxy', 'Polished Concrete'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Phone *">
            <input className="fl-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 123-4567" />
          </Field>
          <Field label="Email">
            <input className="fl-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@yourbusiness.com" />
          </Field>
        </div>
      </div>
      <StepNav onBack={onBack} onNext={() => onComplete(form)} disabled={!valid} saving={saving} nextLabel="Continue to Templates" />
    </StepShell>
  );
}

// ─── STEP 2: CHOOSE TEMPLATE ─────────────────────────────────────────
function StepChooseTemplate({ onboarding, templates, saving, onComplete, onBack }) {
  const [selected, setSelected] = useState(onboarding?.selected_template_url || '');

  return (
    <StepShell title="Choose Your Website Template" subtitle="Each design is a proven, 100%-parity clone of a top-performing epoxy contractor site. Click Preview to see it live.">
      {templates.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
          <p>No epoxy templates found. Contact your account manager to get templates added.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {templates.map(t => {
            const isSelected = selected === t.vercel_deployment_url;
            return (
              <div key={t.id} onClick={() => setSelected(t.vercel_deployment_url)} style={{
                border: `2px solid ${isSelected ? '#C89B3C' : '#e5e1da'}`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                background: '#fff', transition: 'border-color .15s',
              }}>
                <div style={{ height: 140, background: '#f0ede7', position: 'relative', overflow: 'hidden' }}>
                  <TemplateThumbnail url={t.vercel_deployment_url} name={t.business_name} />
                  {isSelected && (
                    <div style={{ position: 'absolute', top: 8, right: 8, background: '#C89B3C', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'grid', placeItems: 'center' }}>
                      <CheckCircle2 size={14} />
                    </div>
                  )}
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <b style={{ fontSize: 13, display: 'block' }}>{t.business_name || t.project_name}</b>
                  <p style={{ fontSize: 11, color: '#888', margin: '4px 0 8px' }}>{t.industry || 'Epoxy Contractor'}</p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <a href={t.vercel_deployment_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: '#C89B3C', display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
                      <ExternalLink size={12} /> Preview
                    </a>
                    {isSelected && <span style={{ fontSize: 11, color: '#237A4B', fontWeight: 600, marginLeft: 'auto' }}>✓ Selected</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <StepNav onBack={onBack} onNext={() => onComplete({
        selected_template_url: selected,
        selected_template_name: templates.find(t => t.vercel_deployment_url === selected)?.business_name || '',
        selected_template_source: templates.find(t => t.vercel_deployment_url === selected)?.benchmark_url || '',
      })} disabled={!selected} saving={saving} nextLabel="Continue to Branding" />
    </StepShell>
  );
}

// ─── STEP 3: BRAND SETUP ─────────────────────────────────────────────
function StepBrandSetup({ onboarding, suggestions, saving, onComplete, onBack, onUpdate }) {
  const [color, setColor] = useState(onboarding?.brand_color || '#C89B3C');
  const [tagline, setTagline] = useState(onboarding?.tagline || '');
  const [logoUrl, setLogoUrl] = useState(onboarding?.logo_url || '');
  const [uploading, setUploading] = useState(false);

  // Apply tagline suggestion
  useEffect(() => {
    if (suggestions.taglines && suggestions.taglines[0] && !tagline) {
      setTagline(suggestions.taglines[0]);
    }
  }, [suggestions.taglines]);

  const uploadLogo = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setLogoUrl(file_url);
    } catch (e) { alert('Upload failed: ' + e.message); }
    setUploading(false);
  };

  const colorFilter = getColorFilter(color);

  return (
    <StepShell title="Make It Yours — Brand Setup" subtitle="Toggle colors below and watch your template change in real-time. Then upload your logo and write a tagline.">
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 28 }}>
        {/* Left: Live template preview + color swatches */}
        <div>
          <Field label="Live Template Preview">
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e1da', height: 320, position: 'relative', background: '#f0ede7' }}>
              {onboarding?.selected_template_url ? (
                <iframe
                  src={onboarding.selected_template_url}
                  style={{ width: '100%', height: '100%', border: 0, filter: colorFilter, transition: 'filter .25s ease' }}
                  title="Template Preview"
                />
              ) : (
                <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#888', fontSize: 13 }}>
                  Select a template in Step 2 first
                </div>
              )}
              {/* Color indicator badge */}
              <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,.95)', borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600 }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: color, border: '1px solid #ddd' }} />
                {color}
              </div>
            </div>
          </Field>

          {/* Color swatches — prominent, toggleable */}
          <div style={{ marginTop: 16 }}>
            <Field label="Toggle Brand Color">
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {COLOR_PRESETS.map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{
                    width: 42, height: 42, borderRadius: 10,
                    border: `3px solid ${color === c ? '#111' : 'transparent'}`,
                    background: c, cursor: 'pointer',
                    boxShadow: color === c ? '0 3px 10px rgba(0,0,0,.2)' : '0 1px 3px rgba(0,0,0,.1)',
                    transition: 'all .15s ease',
                    transform: color === c ? 'scale(1.1)' : 'scale(1)',
                  }} />
                ))}
                <div style={{ width: 1, height: 30, background: '#e5e1da', margin: '0 4px' }} />
                <label style={{ position: 'relative', cursor: 'pointer' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, border: `3px solid ${color !== '#C89B3C' && !COLOR_PRESETS.includes(color) ? '#111' : 'transparent'}`, background: 'conic-gradient(red, orange, yellow, green, blue, indigo, violet, red)', cursor: 'pointer' }} />
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </label>
              </div>
            </Field>
          </div>
        </div>

        {/* Right: Logo + Tagline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Field label="Logo Upload">
            {logoUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={logoUrl} alt="logo" style={{ height: 48, border: '1px solid #e5e1da', borderRadius: 6, padding: 4, background: '#fff' }} />
                <button onClick={() => setLogoUrl('')} style={{ fontSize: 11, color: '#C63D34', border: 0, background: 'none', cursor: 'pointer' }}>Remove</button>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 20, border: '2px dashed #ddd', borderRadius: 8, cursor: 'pointer', color: '#888', fontSize: 12 }}>
                {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                <span>{uploading ? 'Uploading...' : 'Click to upload logo'}</span>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadLogo(e.target.files[0])} />
              </label>
            )}
          </Field>
          <Field label="Tagline / Headline">
            <textarea className="fl-input" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g., Premium Epoxy Floors That Last a Lifetime" rows={2} />
            {suggestions.taglines && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {suggestions.taglines.map((t, i) => (
                  <button key={i} onClick={() => setTagline(t)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e1da', background: '#f8f7f4', cursor: 'pointer', fontFamily: 'inherit' }}>{t}</button>
                ))}
              </div>
            )}
          </Field>
        </div>
      </div>
      <StepNav onBack={onBack} onNext={() => onComplete({ brand_color: color, tagline, logo_url: logoUrl })} disabled={!tagline} saving={saving} nextLabel="Continue to Content" />
    </StepShell>
  );
}

// ─── STEP 4: CONTENT REVIEW ──────────────────────────────────────────
function StepContentReview({ onboarding, suggestions, saving, onComplete, onBack, onUpdate }) {
  const [content, setContent] = useState({
    hero_headline: onboarding?.hero_headline || '',
    about_text: onboarding?.about_text || '',
    services_list: onboarding?.services_list || '',
    cta_text: onboarding?.cta_text || 'Get a Free Quote',
  });

  useEffect(() => {
    if (suggestions.copy) {
      setContent(prev => ({
        hero_headline: suggestions.copy.hero_headline || prev.hero_headline,
        about_text: suggestions.copy.about_text || prev.about_text,
        services_list: suggestions.copy.services_list || prev.services_list,
        cta_text: suggestions.copy.cta_text || prev.cta_text,
      }));
    }
  }, [suggestions.copy]);

  const set = (k, v) => setContent(prev => ({ ...prev, [k]: v }));

  return (
    <StepShell title="Review Your Website Content" subtitle="We've drafted your website copy based on your business info. Edit anything you'd like, then approve to continue. The AI coach can generate fresh copy.">
      <div style={{ display: 'grid', gap: 18, maxWidth: 580 }}>
        <Field label="Hero Headline">
          <input className="fl-input" value={content.hero_headline} onChange={e => set('hero_headline', e.target.value)} placeholder="e.g., Transform Your Garage with Premium Epoxy" />
        </Field>
        <Field label="About Section">
          <textarea className="fl-input" value={content.about_text} onChange={e => set('about_text', e.target.value)} placeholder="2-3 sentences about your business..." rows={3} />
        </Field>
        <Field label="Services (comma-separated)">
          <textarea className="fl-input" value={content.services_list} onChange={e => set('services_list', e.target.value)} placeholder="Garage Floor Epoxy, Metallic Epoxy, Concrete Polishing..." rows={2} />
        </Field>
        <Field label="Call-to-Action Button Text">
          <input className="fl-input" value={content.cta_text} onChange={e => set('cta_text', e.target.value)} placeholder="Get a Free Quote" />
        </Field>
      </div>

      {/* Live preview */}
      <div style={{ marginTop: 24, maxWidth: 580, borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e1da' }}>
        <div style={{ padding: '6px 12px', background: '#f0ede7', fontSize: 10, color: '#888', fontWeight: 600 }}>PREVIEW</div>
        <div style={{ padding: 28, background: '#fff', textAlign: 'center' }}>
          <h2 style={{ font: "400 26px 'Libre Caslon Display', serif", margin: '0 0 10px', color: onboarding?.brand_color || '#111' }}>{content.hero_headline || 'Your headline here'}</h2>
          <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, margin: '0 0 16px' }}>{content.about_text || 'Your about text here...'}</p>
          <button style={{ padding: '10px 24px', borderRadius: 6, border: 0, background: onboarding?.brand_color || '#C89B3C', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{content.cta_text || 'Get a Free Quote'}</button>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={() => onComplete(content)} disabled={!content.hero_headline} saving={saving} nextLabel="Continue to Domain" />
    </StepShell>
  );
}

// ─── STEP 5: DOMAIN SETUP ────────────────────────────────────────────
function StepDomain({ onboarding, saving, onComplete, onBack }) {
  const [domain, setDomain] = useState(onboarding?.domain_name || '');
  const subdomain = (onboarding?.business_name || 'yourbusiness').toLowerCase().replace(/[^a-z0-9]/g, '');

  return (
    <StepShell title="Connect Your Domain" subtitle="Enter your custom domain name, or use our free subdomain to get started. You can upgrade anytime.">
      <div style={{ display: 'grid', gap: 18, maxWidth: 480 }}>
        <Field label="Custom Domain">
          <input className="fl-input" value={domain} onChange={e => setDomain(e.target.value)} placeholder="mybusiness.com" />
        </Field>
        <div style={{ padding: 16, borderRadius: 8, background: '#f8f7f4', border: '1px solid #e5e1da' }}>
          <p style={{ fontSize: 12, color: '#666', margin: '0 0 8px' }}>Don't have a domain yet? Use our free subdomain:</p>
          <button onClick={() => setDomain(`${subdomain}.faultline.app`)} style={{ fontSize: 13, fontWeight: 600, color: '#C89B3C', border: '1px solid #C89B3C', borderRadius: 6, padding: '8px 16px', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
            Use {subdomain}.faultline.app
          </button>
        </div>
        {domain && (
          <div style={{ padding: 16, borderRadius: 8, background: '#e6f4ec', border: '1px solid #bcd9c5', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={16} color="#237A4B" />
            <span style={{ fontSize: 13, color: '#237A4B', fontWeight: 600 }}>{domain}</span>
          </div>
        )}
      </div>
      <StepNav onBack={onBack} onNext={() => onComplete({ domain_name: domain })} disabled={!domain} saving={saving} nextLabel="Continue to Launch" />
    </StepShell>
  );
}

// ─── STEP 6: LAUNCH ──────────────────────────────────────────────────
function StepLaunch({ onboarding, saving, onComplete, onBack }) {
  const [launched, setLaunched] = useState(false);

  const launch = async () => {
    await onComplete({});
    setLaunched(true);
  };

  if (launched) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', maxWidth: 560, margin: '0 auto' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#237A4B', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
          <Rocket size={36} color="#fff" />
        </div>
        <h1 style={{ font: "400 36px 'Libre Caslon Display', serif", margin: '0 0 12px' }}>Your Website Is Live! 🎉</h1>
        <p style={{ fontSize: 15, color: '#666', marginBottom: 24 }}>Congratulations! Your epoxy contractor website has been launched. Here's what happens next:</p>
        <div style={{ display: 'grid', gap: 10, textAlign: 'left', marginBottom: 28 }}>
          {['Your website is now accessible at your domain', 'We\'ll monitor performance and uptime 24/7', 'Your AI coach is available for ongoing support', 'You can request changes anytime from this portal'].map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fff', border: '1px solid #e5e1da', borderRadius: 8 }}>
              <CheckCircle2 size={18} color="#237A4B" />
              <span style={{ fontSize: 13 }}>{t}</span>
            </div>
          ))}
        </div>
        {onboarding?.selected_template_url && (
          <a href={onboarding.selected_template_url} target="_blank" rel="noopener noreferrer" className="btn dark" style={{ fontSize: 14, padding: '14px 28px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <ExternalLink size={16} /> View Your Website
          </a>
        )}
      </div>
    );
  }

  const summary = [
    ['Business', onboarding?.business_name],
    ['Service Area', onboarding?.service_area],
    ['Primary Service', onboarding?.primary_service],
    ['Template', onboarding?.selected_template_name],
    ['Brand Color', onboarding?.brand_color],
    ['Tagline', onboarding?.tagline],
    ['Domain', onboarding?.domain_name],
  ].filter(([, v]) => v);

  return (
    <StepShell title="Ready to Launch" subtitle="Review your setup below. Everything looks good? Click launch to make your website live.">
      <div style={{ maxWidth: 520 }}>
        <div style={{ border: '1px solid #e5e1da', borderRadius: 12, overflow: 'hidden' }}>
          {summary.map(([label, value], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', borderBottom: i < summary.length - 1 ? '1px solid #f0ede7' : 'none', background: '#fff' }}>
              <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
      <StepNav onBack={onBack} onNext={launch} saving={saving} nextLabel="🚀 Launch My Website" />
    </StepShell>
  );
}

// ─── COMPLETION SCREEN ───────────────────────────────────────────────
function CompletionScreen({ onboarding, onRestart }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#237A4B', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
        <CheckCircle2 size={36} color="#fff" />
      </div>
      <h1 style={{ font: "400 34px 'Libre Caslon Display', serif", margin: '0 0 12px' }}>Onboarding Complete!</h1>
      <p style={{ fontSize: 15, color: '#666', marginBottom: 24 }}>Your website is live and ready. You can revisit any step to make changes.</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {onboarding?.selected_template_url && (
          <a href={onboarding.selected_template_url} target="_blank" rel="noopener noreferrer" className="btn dark" style={{ fontSize: 13, padding: '12px 24px', textDecoration: 'none' }}>View Website</a>
        )}
        <button onClick={onRestart} className="btn outline" style={{ fontSize: 13, padding: '12px 24px' }}>Edit Setup</button>
      </div>
    </div>
  );
}

// ─── SHARED UI COMPONENTS ────────────────────────────────────────────
function StepShell({ title, subtitle, children }) {
  return (
    <div>
      <h1 style={{ font: "400 32px 'Libre Caslon Display', serif", margin: '0 0 6px', letterSpacing: '-.02em' }}>{title}</h1>
      <p style={{ fontSize: 14, color: '#666', marginBottom: 28, maxWidth: 600 }}>{subtitle}</p>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function StepNav({ onBack, onNext, disabled, saving, nextLabel }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, paddingTop: 20, borderTop: '1px solid #e5e1da' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '11px 18px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#666' }}>
        <ChevronLeft size={16} /> Back
      </button>
      <button onClick={onNext} disabled={disabled || saving} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '12px 24px', border: 0, borderRadius: 8,
        background: disabled ? '#ccc' : '#0a0a0a', color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
      }}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <>{nextLabel} <ChevronRight size={16} /></>}
      </button>
    </div>
  );
}