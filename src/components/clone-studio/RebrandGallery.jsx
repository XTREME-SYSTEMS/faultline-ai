import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Sparkles, Check, ArrowRight } from 'lucide-react';
import { Image } from '@/components/ui/image';

export default function RebrandGallery({ launchProjectId, businessName, industry, onPickPackage, onUseIndividualMode }) {
  const [phase, setPhase] = useState('idle'); // idle | generating | ready
  const [packages, setPackages] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  async function generate() {
    setPhase('generating');
    setError('');
    try {
      const res = await base44.functions.invoke('generateRebrandPackages', {
        launch_project_id: launchProjectId,
        business_name: businessName || undefined,
        industry: industry || undefined
      });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setPackages(d.packages);
      setPhase('ready');
    } catch (e) {
      setError(e.message || 'Failed to generate rebrand packages');
      setPhase('idle');
    }
  }

  function handleApply() {
    if (!selected) return;
    const pkg = packages.find(p => p.id === selected);
    onPickPackage(pkg);
  }

  if (phase === 'idle') {
    return (
      <div style={{ textAlign: 'center', padding: '30px 0' }}>
        <Sparkles size={48} style={{ color: '#C89B3C', margin: '0 auto 16px', display: 'block' }} />
        <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 26, margin: '0 0 8px' }}>5 Rebrand Packages</h3>
        <p style={{ color: '#666', fontSize: 14, margin: '0 auto 20px', maxWidth: 520 }}>
          We'll generate 5 complete, cohesive rebrand packages — each with a matching logo, color palette,
          brand content, and hero image unified by a design theme. Pick one package and everything applies together.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={generate} style={{
            padding: '14px 28px', background: 'linear-gradient(135deg, #E7C86E, #C89B3C)',
            color: '#111', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>
            Generate 5 Rebrand Packages →
          </button>
          <button onClick={onUseIndividualMode} style={{
            padding: '14px 20px', background: '#fff', color: '#666',
            border: '1px solid #ddd', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>
            Pick individually instead
          </button>
        </div>
        {error && <p style={{ color: '#C63D34', fontSize: 13, marginTop: 16 }}>{error}</p>}
      </div>
    );
  }

  if (phase === 'generating') {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Loader2 size={40} className="animate-spin" style={{ color: '#C89B3C', margin: '0 auto 16px', display: 'block' }} />
        <p style={{ color: '#666', fontSize: 14 }}>Generating 5 cohesive rebrand packages…</p>
        <p style={{ color: '#999', fontSize: 12, marginTop: 8 }}>Logos, palettes, content, and hero images — all matching. ~60-90 seconds.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 24, margin: '0 0 8px' }}>Choose a Rebrand Package</h3>
      <p style={{ color: '#666', fontSize: 13, margin: '0 0 24px' }}>
        Each package is a complete cohesive rebrand — logo, colors, content, and hero image all match the theme. Pick one to apply everything together.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {packages.map(pkg => (
          <PackageCard key={pkg.id} pkg={pkg} selected={selected === pkg.id} onSelect={() => setSelected(pkg.id)} />
        ))}
      </div>

      <div style={{ marginTop: 24, padding: 20, background: '#f8f7f4', borderRadius: 10, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#666', margin: '0 0 12px' }}>
          {selected ? 'Ready to apply this rebrand package and finalize for production.' : 'Select a package above to continue.'}
        </p>
        <button onClick={handleApply} disabled={!selected} style={{
          padding: '14px 32px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: selected ? 'pointer' : 'not-allowed',
          background: selected ? 'linear-gradient(135deg, #E7C86E, #C89B3C)' : '#ddd', color: '#111', border: 0,
          display: 'inline-flex', alignItems: 'center', gap: 8,
        }}>
          Apply Rebrand & Finalize <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function PackageCard({ pkg, selected, onSelect }) {
  const { logo, palette, image, trademark, theme_name, vibe } = pkg;
  return (
    <button onClick={onSelect} style={{
      border: `2px solid ${selected ? '#C89B3C' : '#eee'}`, borderRadius: 12, padding: 0,
      background: selected ? '#faf8f2' : '#fff', cursor: 'pointer', textAlign: 'left',
      overflow: 'hidden', position: 'relative',
    }}>
      {selected && <Check size={20} style={{ position: 'absolute', top: 8, right: 8, color: '#C89B3C', background: '#fff', borderRadius: '50%', zIndex: 2 }} />}

      {/* Hero image */}
      <div style={{ height: 100, background: palette.background, position: 'relative', overflow: 'hidden' }}>
        {image?.image_url ? (
          <Image src={image.image_url} alt={theme_name} fittingType="fill" style={{ width: '100%', height: '100%' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${palette.primary}, ${palette.accent})` }} />
        )}
      </div>

      {/* Logo */}
      <div style={{ height: 70, background: palette.background, display: 'grid', placeItems: 'center', padding: 8, borderBottom: `1px solid ${palette.secondary}22` }}>
        {logo?.image_url ? (
          <Image src={logo.image_url} alt={theme_name} fittingType="fit" style={{ height: 50, maxWidth: 140 }} />
        ) : (
          <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 18, color: palette.primary }}>{trademark?.business_name || theme_name}</b>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <b style={{ fontSize: 14 }}>{theme_name}</b>
        </div>
        <p style={{ fontSize: 11, color: '#999', margin: '0 0 8px', fontStyle: 'italic' }}>{vibe}</p>

        {/* Color strip */}
        <div style={{ display: 'flex', height: 24, borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
          {[palette.primary, palette.secondary, palette.accent, palette.background].filter(Boolean).map((c, i) => (
            <div key={i} style={{ flex: 1, background: c, border: i === 3 ? '1px solid #eee' : 'none' }} />
          ))}
        </div>

        {/* Brand content preview */}
        <p style={{ fontSize: 12, color: palette.accent, margin: '0 0 4px', fontWeight: 600, fontStyle: 'italic' }}>"{trademark?.tagline || ''}"</p>
        <p style={{ fontSize: 11, color: '#888', margin: '0 0 6px', lineHeight: 1.4 }}>{trademark?.about_text?.slice(0, 80) || ''}…</p>
        {trademark?.contact && (
          <p style={{ fontSize: 10, color: '#aaa', margin: 0 }}>{trademark.contact.phone} · {trademark.contact.email}</p>
        )}
      </div>
    </button>
  );
}