import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Palette, Image as ImageIcon, Type, Building, Check } from 'lucide-react';
import { Image } from '@/components/ui/image';

export default function StepCustomize({ launchProjectId, onComplete }) {
  const [phase, setPhase] = useState('idle'); // idle | identifying | generating | ready
  const [parts, setParts] = useState(null);
  const [options, setOptions] = useState(null);
  const [error, setError] = useState('');
  const [bizName, setBizName] = useState('');
  const [sel, setSel] = useState({ logo: null, palette: null, image: null, trademark: null });

  async function startIdentify() {
    setPhase('identifying');
    setError('');
    try {
      const idRes = await base44.functions.invoke('identifyChangeableParts', { launch_project_id: launchProjectId });
      const p = idRes.data?.parts || idRes.parts;
      if (!p) throw new Error('No parts identified');
      setParts(p);
      setPhase('generating');
      const optRes = await base44.functions.invoke('generateCustomizationOptions', {
        launch_project_id: launchProjectId, parts: p, new_business_name: bizName || undefined
      });
      const o = optRes.data?.options || optRes.options;
      if (!o) throw new Error('No options generated');
      setOptions(o);
      setPhase('ready');
    } catch (e) {
      setError(e.message || 'Failed to identify parts');
      setPhase('idle');
    }
  }

  function canFinish() {
    return sel.logo && sel.palette && sel.trademark;
  }

  function handleFinish() {
    const selections = {
      logo: sel.logo,
      palette: sel.palette,
      image_replacements: sel.image ? [{ original_url: parts?.key_images?.[0]?.url, new_url: sel.image.image_url }] : [],
      trademark: sel.trademark,
    };
    onComplete(selections);
  }

  if (phase === 'idle') {
    return (
      <div style={{ textAlign: 'center', padding: '30px 0' }}>
        <Building size={48} style={{ color: '#C89B3C', margin: '0 auto 16px', display: 'block' }} />
        <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 26, margin: '0 0 8px' }}>Identify & Customize</h3>
        <p style={{ color: '#666', fontSize: 14, margin: '0 0 20px', maxWidth: 500, margin: '0 auto 20px' }}>
          We'll re-clone the site, identify the logo, colors, images, and trademark content that must change,
          then generate multiple options for each. You pick one from each category.
        </p>
        <input
          type="text" value={bizName} onChange={e => setBizName(e.target.value)}
          placeholder="Your new business name (optional)"
          style={{ padding: '12px 16px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, width: 300, maxWidth: '100%', marginBottom: 16 }}
        />
        <div>
          <button onClick={startIdentify} style={{
            padding: '14px 28px', background: 'linear-gradient(135deg, #E7C86E, #C89B3C)',
            color: '#111', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>
            Identify Changeable Parts →
          </button>
        </div>
        {error && <p style={{ color: '#C63D34', fontSize: 13, marginTop: 16 }}>{error}</p>}
      </div>
    );
  }

  if (phase === 'identifying' || phase === 'generating') {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Loader2 size={40} className="animate-spin" style={{ color: '#C89B3C', margin: '0 auto 16px', display: 'block' }} />
        <p style={{ color: '#666', fontSize: 14 }}>
          {phase === 'identifying' ? 'Identifying logo, colors, images, and trademark content…' : 'Generating customization options (logos, palettes, images, content)…'}
        </p>
        <p style={{ color: '#999', fontSize: 12, marginTop: 8 }}>This takes 30-60 seconds</p>
      </div>
    );
  }

  // Ready — show options
  return (
    <div>
      <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 24, margin: '0 0 20px' }}>Choose Your Customizations</h3>
      <p style={{ color: '#666', fontSize: 13, margin: '0 0 24px' }}>
        Pick one option from each category. We'll apply only these changes and keep everything else exactly as the original.
      </p>

      {/* LOGOS */}
      <Category icon={Building} title="Logo" identified={parts?.logo?.current_value ? `Current: ${parts.logo.current_value.slice(0, 40)}` : ''}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {options.logos.map(l => (
            <OptionCard key={l.id} selected={sel.logo?.id === l.id} onClick={() => setSel({ ...sel, logo: l })} label={l.label}>
              {l.image_url ? <Image src={l.image_url} alt={l.label} fittingType="fit" style={{ height: 80, width: '100%' }} /> : <div style={{ height: 80, background: '#f0f0f0', display: 'grid', placeItems: 'center', color: '#999', fontSize: 11 }}>No preview</div>}
            </OptionCard>
          ))}
        </div>
      </Category>

      {/* COLOR PALETTES */}
      <Category icon={Palette} title="Accent Colors" identified={parts?.accent_colors ? `Current: ${parts.accent_colors.map(c => c.hex).slice(0, 3).join(', ')}` : ''}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {options.palettes.map(p => (
            <OptionCard key={p.id} selected={sel.palette?.id === p.id} onClick={() => setSel({ ...sel, palette: p })} label={p.name}>
              <div style={{ display: 'flex', height: 60, borderRadius: 6, overflow: 'hidden' }}>
                {[p.primary, p.secondary, p.accent, p.background].filter(Boolean).map((c, i) => (
                  <div key={i} style={{ flex: 1, background: c }} />
                ))}
              </div>
            </OptionCard>
          ))}
        </div>
      </Category>

      {/* KEY IMAGES */}
      {parts?.key_images?.length > 0 && options.images.length > 0 && (
        <Category icon={ImageIcon} title="Hero Images" identified={`Current: ${parts.key_images.length} owner-specific images`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {options.images.map(im => (
              <OptionCard key={im.id} selected={sel.image?.id === im.id} onClick={() => setSel({ ...sel, image: im })} label={im.label}>
                {im.image_url ? <Image src={im.image_url} alt={im.label} fittingType="fill" style={{ height: 80, width: '100%' }} /> : <div style={{ height: 80, background: '#f0f0f0' }} />}
              </OptionCard>
            ))}
            <OptionCard selected={!sel.image} onClick={() => setSel({ ...sel, image: null })} label="Keep original images">
              <div style={{ height: 80, display: 'grid', placeItems: 'center', color: '#999', fontSize: 12, background: '#f8f7f4' }}>Keep originals</div>
            </OptionCard>
          </div>
        </Category>
      )}

      {/* TRADEMARK CONTENT */}
      <Category icon={Type} title="Brand Content" identified="Business name, tagline, about text, contact info">
        <div style={{ display: 'grid', gap: 12 }}>
          {options.trademarks.map(t => (
            <OptionCard key={t.id} selected={sel.trademark?.id === t.id} onClick={() => setSel({ ...sel, trademark: t })} label={t.tone}>
              <div style={{ textAlign: 'left', padding: 8 }}>
                <b style={{ fontSize: 13 }}>{t.business_name}</b>
                <p style={{ fontSize: 12, color: '#C89B3C', margin: '2px 0', fontStyle: 'italic' }}>"{t.tagline}"</p>
                <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0', lineHeight: 1.4 }}>{t.about_text?.slice(0, 100)}…</p>
                {t.contact && <p style={{ fontSize: 10, color: '#aaa', margin: '4px 0 0' }}>{t.contact.phone} · {t.contact.email}</p>}
              </div>
            </OptionCard>
          ))}
        </div>
      </Category>

      {/* FINISH */}
      <div style={{ marginTop: 28, padding: 20, background: '#f8f7f4', borderRadius: 10, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#666', margin: '0 0 12px' }}>
          {canFinish() ? 'Ready to apply your customizations and finalize for production.' : 'Select a logo, color palette, and brand content to continue.'}
        </p>
        <button onClick={handleFinish} disabled={!canFinish()} style={{
          padding: '14px 32px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: canFinish() ? 'pointer' : 'not-allowed',
          background: canFinish() ? 'linear-gradient(135deg, #E7C86E, #C89B3C)' : '#ddd', color: '#111', border: 0,
        }}>
          Apply & Finalize for Production →
        </button>
      </div>
    </div>
  );
}

function Category({ icon: Icon, title, identified, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon size={16} style={{ color: '#C89B3C' }} />
        <b style={{ fontSize: 15 }}>{title}</b>
        {identified && <span style={{ fontSize: 11, color: '#999' }}>({identified})</span>}
      </div>
      {children}
    </div>
  );
}

function OptionCard({ selected, onClick, label, children }) {
  return (
    <button onClick={onClick} style={{
      border: `2px solid ${selected ? '#C89B3C' : '#eee'}`, borderRadius: 8, padding: 8,
      background: selected ? '#faf8f2' : '#fff', cursor: 'pointer', textAlign: 'left', position: 'relative',
    }}>
      {selected && <Check size={16} style={{ position: 'absolute', top: 6, right: 6, color: '#C89B3C', background: '#fff', borderRadius: '50%' }} />}
      <div style={{ fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6 }}>{label}</div>
      {children}
    </button>
  );
}