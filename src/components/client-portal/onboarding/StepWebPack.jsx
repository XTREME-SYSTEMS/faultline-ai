import { useState } from 'react';
import { CheckCircle2, ExternalLink, Star } from 'lucide-react';
import { StepShell, StepNav, TemplateThumbnail, getColorFilter } from './StepShell';
import { WEB_PACKS, assignTemplatesToPacks } from '@/components/client-portal/webPacks';

// ─── STEP 4: WEB PACK (template selection with brand colors applied) ─
export function StepWebPack({ onboarding, templates, saving, onComplete, onBack }) {
  const packs = assignTemplatesToPacks(WEB_PACKS, templates);
  const [selectedId, setSelectedId] = useState(onboarding?.selected_template_name || '');
  const [colorOverrides, setColorOverrides] = useState({});

  const selectedPack = packs.find(p => p.id === selectedId);
  const brandColor = onboarding?.selected_brand_pack?.colors?.primary || onboarding?.brand_color || '#C89B3C';
  const VARIATION_COLORS = [brandColor, '#1a56DB', '#DC2626', '#059669', '#7C3AED'];

  return (
    <StepShell title="Choose Your Web Pack" subtitle="Each pack is a proven website design. Your brand colors are applied as the default — click color dots to preview variations.">
      {templates.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
          <p>No templates available. Contact your account manager.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
          {packs.map(pack => {
            const isSelected = selectedId === pack.id;
            const hasTemplate = !!pack.template;
            const activeColor = colorOverrides[pack.id] || brandColor;
            return (
              <div key={pack.id} onClick={() => hasTemplate && setSelectedId(pack.id)} style={{
                border: `2px solid ${isSelected ? activeColor : '#e5e1da'}`, borderRadius: 14, overflow: 'hidden',
                cursor: hasTemplate ? 'pointer' : 'not-allowed', background: '#fff',
                transition: 'all .2s ease', opacity: hasTemplate ? 1 : .5,
                boxShadow: isSelected ? `0 8px 24px ${activeColor}30` : '0 1px 4px rgba(0,0,0,.06)',
                transform: isSelected ? 'translateY(-2px)' : 'none',
              }}>
                {/* Screenshot */}
                <div style={{ height: 160, background: '#f0ede7', position: 'relative', overflow: 'hidden' }}>
                  {hasTemplate ? (
                    <TemplateThumbnail
                      url={pack.template.vercel_deployment_url}
                      benchmarkUrl={pack.template.benchmark_url}
                      name={pack.name}
                      filter={getColorFilter(activeColor)}
                    />
                  ) : (
                    <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#aaa', fontSize: 12 }}>Coming soon</div>
                  )}
                  {pack.badge && (
                    <div style={{ position: 'absolute', top: 8, left: 8, background: activeColor, color: '#fff', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>{pack.badge}</div>
                  )}
                  {isSelected && (
                    <div style={{ position: 'absolute', top: 8, right: 8, background: activeColor, color: '#fff', borderRadius: '50%', width: 26, height: 26, display: 'grid', placeItems: 'center' }}>
                      <CheckCircle2 size={15} />
                    </div>
                  )}
                  {/* Color variation toggles */}
                  {hasTemplate && (
                    <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5, background: 'rgba(255,255,255,.9)', padding: '4px 8px', borderRadius: 12, backdropFilter: 'blur(4px)' }}>
                      {VARIATION_COLORS.map((c, i) => (
                        <button
                          key={i}
                          onClick={(e) => { e.stopPropagation(); setColorOverrides(prev => ({ ...prev, [pack.id]: i === 0 ? undefined : c })); }}
                          style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${activeColor === c ? '#111' : '#fff'}`, background: c, cursor: 'pointer', padding: 0, boxShadow: '0 1px 3px rgba(0,0,0,.2)' }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Pack info */}
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <b style={{ fontSize: 14, fontFamily: "'Libre Caslon Display', serif" }}>{pack.name}</b>
                    <span style={{ fontSize: 9, fontWeight: 700, color: activeColor, textTransform: 'uppercase', letterSpacing: '.1em' }}>{pack.style}</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#777', lineHeight: 1.5, margin: '0 0 10px' }}>{pack.description}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                    {pack.features.slice(0, 3).map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#555' }}>
                        <CheckCircle2 size={12} color={activeColor} /> {f}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 10, borderTop: '1px solid #f0ede7' }}>
                    {hasTemplate && (
                      <a href={pack.template.vercel_deployment_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: activeColor, display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none', fontWeight: 600 }}>
                        <ExternalLink size={12} /> Live Preview
                      </a>
                    )}
                    {isSelected ? (
                      <span style={{ fontSize: 11, color: '#237A4B', fontWeight: 700, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Star size={12} fill="#237A4B" /> Selected
                      </span>
                    ) : hasTemplate ? (
                      <span style={{ fontSize: 11, color: '#888', marginLeft: 'auto', fontWeight: 600 }}>Click to select →</span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <StepNav
        onBack={onBack}
        onNext={() => selectedPack && onComplete({
          selected_template_url: selectedPack.template?.vercel_deployment_url || '',
          selected_template_name: selectedPack.name,
          selected_template_source: selectedPack.template?.benchmark_url || '',
          brand_color: colorOverrides[selectedPack.id] || brandColor,
        })}
        disabled={!selectedId}
        saving={saving}
        nextLabel="Continue to Content"
      />
    </StepShell>
  );
}