import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, RefreshCw, Upload } from 'lucide-react';
import { StepShell, StepNav, GeneratingOverlay } from './StepShell';

// ─── STEP 2: LOGO PACK ───────────────────────────────────────────────
export function StepLogoPack({ onboarding, saving, onComplete, onBack, onUpdate }) {
  const [logos, setLogos] = useState(onboarding?.logo_packs || []);
  const [selectedUrl, setSelectedUrl] = useState(onboarding?.logo_url || '');
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Auto-generate if no logos yet
  useEffect(() => {
    if ((!onboarding?.logo_packs || onboarding.logo_packs.length === 0) && !generating) {
      generate();
    } else {
      setLogos(onboarding.logo_packs || []);
    }
  }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateClientPacks', {
        questionnaire_answers: {
          business_name: onboarding.business_name,
          industry: onboarding.industry,
          service_area: onboarding.service_area,
          primary_service: onboarding.primary_service,
          ...onboarding.questionnaire_answers,
        }
      });
      if (res.data?.logo_packs) {
        setLogos(res.data.logo_packs);
        // Also save brand packs + copy for later steps
        await onUpdate({
          logo_packs: res.data.logo_packs,
          brand_packs: res.data.brand_packs || [],
          hero_headline: res.data.copy?.hero_headline || onboarding.hero_headline || '',
          about_text: res.data.copy?.about_text || onboarding.about_text || '',
          services_list: res.data.copy?.services_list || onboarding.services_list || '',
          cta_text: res.data.copy?.cta_text || onboarding.cta_text || 'Get a Free Quote',
        });
      }
    } catch (e) {
      console.error('Logo generation error:', e);
      alert('Generation failed: ' + e.message);
    }
    setGenerating(false);
  };

  const uploadLogo = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setSelectedUrl(file_url);
    } catch (e) { alert('Upload failed: ' + e.message); }
    setUploading(false);
  };

  if (generating) {
    return <GeneratingOverlay label="Generating Your Logo Packs" sublabel="Creating 3 custom logo concepts from your answers — this takes 15-30 seconds" />;
  }

  return (
    <StepShell title="Choose Your Logo" subtitle="Our AI generated 3 logo concepts based on your questionnaire. Pick your favorite, or upload your own.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 620 }}>
        {logos.map((logo, i) => {
          const isSelected = selectedUrl === logo.url;
          return (
            <div key={i} onClick={() => setSelectedUrl(logo.url)} style={{
              border: `2px solid ${isSelected ? '#C89B3C' : '#e5e1da'}`, borderRadius: 12, overflow: 'hidden',
              cursor: 'pointer', background: '#fff', transition: 'all .2s', position: 'relative',
              boxShadow: isSelected ? '0 6px 20px #C89B3C30' : '0 1px 4px rgba(0,0,0,.06)',
            }}>
              <div style={{ height: 140, background: '#fff', display: 'grid', placeItems: 'center', padding: 16 }}>
                <img src={logo.url} alt={logo.style} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ padding: '10px 12px', borderTop: '1px solid #f0ede7' }}>
                <b style={{ fontSize: 12 }}>{logo.style}</b>
                <p style={{ fontSize: 10, color: '#888', margin: '2px 0 0' }}>{logo.description}</p>
              </div>
              {isSelected && (
                <div style={{ position: 'absolute', top: 8, right: 8, background: '#C89B3C', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'grid', placeItems: 'center' }}>
                  <CheckCircle2 size={14} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Upload own */}
      <div style={{ marginTop: 20, maxWidth: 620, padding: 16, border: '2px dashed #ddd', borderRadius: 10, textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#888', margin: '0 0 10px' }}>Prefer your own logo? Upload it here:</p>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#666' }}>
          {uploading ? 'Uploading...' : <><Upload size={14} /> Upload Logo</>}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadLogo(e.target.files[0])} />
        </label>
        {selectedUrl && !logos.find(l => l.url === selectedUrl) && (
          <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <img src={selectedUrl} alt="uploaded" style={{ height: 40, border: '1px solid #ddd', borderRadius: 4, padding: 2, background: '#fff' }} />
            <span style={{ fontSize: 11, color: '#237A4B' }}>✓ Uploaded logo selected</span>
          </div>
        )}
      </div>

      {/* Regenerate */}
      <div style={{ marginTop: 14, maxWidth: 620, textAlign: 'center' }}>
        <button onClick={generate} disabled={generating} style={{ fontSize: 12, color: '#C89B3C', border: '1px solid #C89B3C', borderRadius: 6, padding: '8px 16px', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={13} /> Regenerate Logos
        </button>
      </div>

      <StepNav
        onBack={onBack}
        onNext={() => onComplete({ logo_url: selectedUrl, logo_packs: logos })}
        disabled={!selectedUrl}
        saving={saving}
        nextLabel="Continue to Brand Pack"
      />
    </StepShell>
  );
}