import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import Icon from '@/components/fl/Icon';

export default function WebPackGallery() {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.DesignPack.filter(
          { pack_type: 'web_pack' },
          '-created_date',
          20
        );
        setPacks(list || []);
      } catch (e) {
        setError(e.message || 'Failed to load web packs');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0B0B0D', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, margin: '0 auto 16px', border: '4px solid #2b2b2b', borderTopColor: '#FFD60A', borderRadius: '50%', animation: 'fl-dot 1s linear infinite' }} />
          <p style={{ color: '#9a9a9e' }}>Loading web packs…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0B0B0D', color: '#fff' }}>
        <div style={{ textAlign: 'center', maxWidth: 460, padding: 24 }}>
          <p style={{ color: '#C63D34', fontWeight: 700, marginBottom: 8 }}>Couldn't load web packs</p>
          <p style={{ color: '#9a9a9e', fontSize: 14 }}>{error}</p>
          <Link to="/" style={{ display: 'inline-block', marginTop: 20, color: '#FFD60A' }}>← Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0D', color: '#fff' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, height: 64, borderBottom: '1px solid #2b2b2b', background: 'rgba(11,11,13,.92)', backdropFilter: 'blur(12px)' }}>
        <div style={{ height: '100%', maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', fontWeight: 700 }}>
            <Icon name="arrow-left" /> <span>Web Pack Gallery</span>
          </Link>
          <span style={{ color: '#9a9a9e', fontSize: 13 }}>{packs.length} pack{packs.length === 1 ? '' : 's'} ready for approval</span>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '36px 24px 80px' }}>
        <div style={{ marginBottom: 32 }}>
          <p style={{ color: '#FFD60A', fontSize: 12, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', margin: '0 0 10px' }}>Design Packs · Web</p>
          <h1 style={{ font: "400 clamp(34px,4vw,52px)/1 'Libre Caslon Display', serif", letterSpacing: '-.035em', margin: 0 }}>5 Web Packs for Approval</h1>
          <p style={{ color: '#9a9a9e', fontSize: 16, lineHeight: 1.6, maxWidth: 620, margin: '12px 0 0' }}>Each pack is a complete, production-ready website design spec — colors, fonts, pages, and components. Review the reference image, then approve the one that fits.</p>
        </div>

        {packs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed #2b2b2b', borderRadius: 14 }}>
            <p style={{ color: '#9a9a9e' }}>No web packs yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 24 }}>
            {packs.map((p, i) => {
              const brand = p.spec?.brand || {};
              const colors = brand.colors || {};
              const pages = p.spec?.pages || [];
              const swatches = [colors.background, colors.primary, colors.secondary, colors.accent, colors.text].filter(Boolean);
              return (
                <article key={p.id} style={{ background: '#111114', border: '1px solid #2b2b2b', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ position: 'relative' }}>
                    {p.image_url ? (
                      <Image src={p.image_url} alt={p.pack_name} fittingType="fill" className="block w-full" style={{ height: 240 }} />
                    ) : (
                      <div style={{ height: 240, display: 'grid', placeItems: 'center', color: '#555', fontSize: 13 }}>No preview</div>
                    )}
                    <span style={{ position: 'absolute', left: 14, top: 14, background: 'rgba(11,11,13,.82)', color: '#FFD60A', padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 800, letterSpacing: '.08em', backdropFilter: 'blur(4px)' }}>PACK {String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>{p.pack_name || 'Untitled web pack'}</h3>
                      <p style={{ margin: 0, fontSize: 13, color: '#9a9a9e', lineHeight: 1.55 }}>{brand.style_description?.slice(0, 120)}{brand.style_description?.length > 120 ? '…' : ''}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {swatches.map((c, idx) => (
                        <span key={idx} title={c} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #2b2b2b', background: c }} />
                      ))}
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9a9a9e' }}>{pages.length} pages</span>
                    </div>
                    <div style={{ display: 'flex', gap: 18, fontSize: 12, color: '#bbb' }}>
                      <span><b style={{ color: '#FFD60A' }}>H:</b> {brand.fonts?.heading || '—'}</span>
                      <span><b style={{ color: '#FFD60A' }}>B:</b> {brand.fonts?.body || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
                      <button type="button" onClick={() => setSelected(p)} style={{ flex: 1, padding: '11px', background: '#1a1a1d', color: '#fff', border: '1px solid #2b2b2b', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>View Spec</button>
                      <button type="button" style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg,#FFD60A,#FFB800)', color: '#0B0B0D', border: 0, borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Approve</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {selected && (
        <div role="presentation" onMouseDown={e => e.target === e.currentTarget && setSelected(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 24, background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(8px)' }}>
          <div role="dialog" aria-modal="true" style={{ position: 'relative', width: 'min(100%, 920px)', maxHeight: 'calc(100vh - 48px)', overflow: 'auto', background: '#111114', border: '1px solid #2b2b2b', borderRadius: 14, color: '#fff' }}>
            <button type="button" onClick={() => setSelected(null)} aria-label="Close" style={{ position: 'absolute', top: 14, right: 16, width: 36, height: 36, background: 'transparent', border: 0, color: '#fff', fontSize: 22, cursor: 'pointer' }}>×</button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              <div style={{ padding: 28 }}>
                {selected.image_url && <Image src={selected.image_url} alt={selected.pack_name} fittingType="fill" className="block w-full" style={{ height: 320, borderRadius: 10 }} />}
              </div>
              <div style={{ padding: '28px 28px 28px 0' }}>
                <p style={{ color: '#FFD60A', fontSize: 11, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', margin: '0 0 8px' }}>Web Pack Spec</p>
                <h2 style={{ font: "400 30px/1 'Libre Caslon Display', serif", margin: '0 0 12px' }}>{selected.pack_name}</h2>
                <p style={{ color: '#9a9a9e', fontSize: 14, lineHeight: 1.6, margin: '0 0 18px' }}>{selected.spec?.brand?.style_description}</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                  {Object.entries(selected.spec?.brand?.colors || {}).map(([k, v]) => (
                    <span key={k} title={`${k}: ${v}`} style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #2b2b2b', background: v }} />
                  ))}
                </div>
                <p style={{ fontSize: 13, color: '#bbb', margin: '0 0 6px' }}><b style={{ color: '#FFD60A' }}>Heading font:</b> {selected.spec?.brand?.fonts?.heading}</p>
                <p style={{ fontSize: 13, color: '#bbb', margin: '0 0 18px' }}><b style={{ color: '#FFD60A' }}>Body font:</b> {selected.spec?.brand?.fonts?.body}</p>
                <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px' }}>Pages</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px', display: 'grid', gap: 6 }}>
                  {(selected.spec?.pages || []).map((pg, idx) => (
                    <li key={idx} style={{ fontSize: 13, color: '#ccc', paddingBottom: 6, borderBottom: '1px solid #1f1f22' }}>
                      <b style={{ color: '#FFD60A' }}>{pg.name}</b> <span style={{ color: '#777' }}>— {pg.purpose?.slice(0, 60)}{pg.purpose?.length > 60 ? '…' : ''}</span>
                    </li>
                  ))}
                </ul>
                <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 8px' }}>Components</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(selected.spec?.components || []).map((c, idx) => (
                    <span key={idx} style={{ fontSize: 11, padding: '4px 9px', background: '#1a1a1d', border: '1px solid #2b2b2b', borderRadius: 20, color: '#bbb' }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: '18px 28px 24px', display: 'flex', gap: 12, borderTop: '1px solid #2b2b2b' }}>
              <button type="button" onClick={() => setSelected(null)} style={{ padding: '12px 22px', background: '#1a1a1d', color: '#fff', border: '1px solid #2b2b2b', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Close</button>
              <button type="button" style={{ marginLeft: 'auto', padding: '12px 26px', background: 'linear-gradient(135deg,#FFD60A,#FFB800)', color: '#0B0B0D', border: 0, borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>Approve this Pack <Icon name="arrow-right" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}