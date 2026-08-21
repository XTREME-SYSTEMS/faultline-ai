import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { StepShell, StepNav, getColorFilter } from './StepShell';

// ─── STEP 3: BRAND PACK ─────────────────────────────────────────────
export function StepBrandPack({ onboarding, saving, onComplete, onBack }) {
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const packs = onboarding?.brand_packs || [];
    if (onboarding?.selected_brand_pack?.name) {
      const idx = packs.findIndex(p => p.name === onboarding.selected_brand_pack.name);
      if (idx >= 0) return idx;
    }
    return 0;
  });

  const packs = onboarding?.brand_packs || [];
  const selected = packs[selectedIdx];

  if (packs.length === 0) {
    return (
      <StepShell title="Brand Pack" subtitle="No brand packs generated yet.">
        <p style={{ color: '#888' }}>Go back and complete the questionnaire to generate brand packs.</p>
        <StepNav onBack={onBack} onNext={() => onComplete({})} saving={saving} nextLabel="Skip" />
      </StepShell>
    );
  }

  return (
    <StepShell title="Choose Your Brand Pack" subtitle="Each pack includes a color palette and font pairing. Pick the one that matches your vision — it'll be applied to your website.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 680 }}>
        {packs.map((pack, i) => {
          const isSelected = selectedIdx === i;
          const colors = pack.colors || {};
          return (
            <div key={i} onClick={() => setSelectedIdx(i)} style={{
              border: `2px solid ${isSelected ? colors.primary || '#C89B3C' : '#e5e1da'}`, borderRadius: 12, overflow: 'hidden',
              cursor: 'pointer', background: '#fff', transition: 'all .2s', position: 'relative',
              boxShadow: isSelected ? `0 6px 20px ${colors.primary || '#C89B3C'}30` : '0 1px 4px rgba(0,0,0,.06)',
              transform: isSelected ? 'translateY(-2px)' : 'none',
            }}>
              {/* Color swatches */}
              <div style={{ height: 80, display: 'flex' }}>
                <div style={{ flex: 2, background: colors.primary || '#ccc' }} />
                <div style={{ flex: 1, background: colors.secondary || '#999' }} />
                <div style={{ flex: 1, background: colors.accent || '#666' }} />
              </div>

              <div style={{ padding: '14px 16px' }}>
                <b style={{ fontSize: 14, fontFamily: "'Libre Caslon Display', serif" }}>{pack.name}</b>
                <p style={{ fontSize: 11, color: '#777', lineHeight: 1.5, margin: '4px 0 10px' }}>{pack.description}</p>

                {/* Font preview */}
                <div style={{ padding: 10, background: '#f8f7f4', borderRadius: 6, marginBottom: 8 }}>
                  <div style={{ fontFamily: pack.fonts?.heading || 'serif', fontSize: 16, fontWeight: 700, color: colors.primary }}>
                    {onboarding?.business_name || 'Your Business'}
                  </div>
                  <div style={{ fontFamily: pack.fonts?.body || 'sans-serif', fontSize: 11, color: '#666', marginTop: 2 }}>
                    Premium epoxy flooring services
                  </div>
                </div>

                {/* Color hex values */}
                <div style={{ display: 'flex', gap: 4, fontSize: 9 }}>
                  <span style={{ color: '#888' }}>{colors.primary}</span>
                  <span style={{ color: '#888' }}>·</span>
                  <span style={{ color: '#888' }}>{colors.secondary}</span>
                  <span style={{ color: '#888' }}>·</span>
                  <span style={{ color: '#888' }}>{colors.accent}</span>
                </div>
              </div>

              {isSelected && (
                <div style={{ position: 'absolute', top: 8, right: 8, background: colors.primary || '#C89B3C', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'grid', placeItems: 'center' }}>
                  <CheckCircle2 size={14} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Live preview with selected brand colors */}
      {selected && (
        <div style={{ marginTop: 24, maxWidth: 680, borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e1da' }}>
          <div style={{ padding: '6px 12px', background: '#f0ede7', fontSize: 10, color: '#888', fontWeight: 600 }}>PREVIEW WITH {selected.name?.toUpperCase()}</div>
          <div style={{ padding: 28, background: '#fff', textAlign: 'center' }}>
            <h2 style={{ fontFamily: selected.fonts?.heading || 'serif', fontSize: 28, margin: '0 0 10px', color: selected.colors?.primary }}>
              {(onboarding?.questionnaire_answers?.differentiator || 'Premium Epoxy Floors').split(' ').slice(0, 4).join(' ')}
            </h2>
            <p style={{ fontFamily: selected.fonts?.body || 'sans-serif', fontSize: 13, color: '#666', lineHeight: 1.6, margin: '0 0 16px' }}>
              {onboarding?.business_name} — serving {onboarding?.service_area || 'your area'}
            </p>
            <button style={{ padding: '10px 24px', borderRadius: 6, border: 0, background: selected.colors?.primary, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'default', fontFamily: selected.fonts?.body || 'sans-serif' }}>
              Get a Free Quote
            </button>
          </div>
        </div>
      )}

      <StepNav
        onBack={onBack}
        onNext={() => onComplete({
          selected_brand_pack: selected,
          brand_color: selected?.colors?.primary || onboarding?.brand_color,
        })}
        saving={saving}
        nextLabel="Continue to Web Pack"
      />
    </StepShell>
  );
}