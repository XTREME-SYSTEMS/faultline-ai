import { useState } from 'react';
import { Image } from '@/components/ui/image';

const METALLIC_FLOORS = [
  { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/7fb9ea22f_generated_image.png', title: 'Black & White Metallic', desc: 'Swirling monochrome pigments with a 3D liquid marble effect' },
  { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/daaf3187d_generated_image.png', title: 'Silver Metallic', desc: 'Chrome-like reflective surface with swirling silver pigments' },
  { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/dc888082e_generated_image.png', title: 'Gold Metallic', desc: 'Luxurious shimmering gold pigments in opulent 3D patterns' },
  { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/b7328d438_generated_image.png', title: 'Copper Bronze Metallic', desc: 'Warm metallic pigments with rich copper and bronze tones' },
  { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/9854276f1_generated_image.png', title: 'Pearlescent White Metallic', desc: 'Iridescent pigments catching the light in a luxury boutique' }
];

const FLAKE_FLOORS = [
  { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/7cd010d4e_generated_image.png', title: 'Silver Lamborghini on Flake Floor', desc: 'Multi-colored flake chips in clear epoxy, luxury showroom' },
  { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/2f269e8b2_generated_image.png', title: 'Ferrari & Porsche Showroom', desc: 'Blue and silver flake floor in a high-end car showroom' },
  { url: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/b2047b81c_generated_image.png', title: 'McLaren on Black & Gold Metallic', desc: 'Exotic supercar on a mirror-finish gold metallic floor' }
];

export default function EpoxyFloorGallery() {
  const [lightbox, setLightbox] = useState(null);
  const [tab, setTab] = useState('metallic');

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      {/* Header */}
      <header style={{ padding: '40px 20px', borderBottom: '1px solid #2b2b2b', textAlign: 'center' }}>
        <p className="eyebrow" style={{ color: '#E7C86E' }}>Premium Epoxy Floor Collection</p>
        <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 'clamp(36px, 5vw, 64px)', margin: '8px 0 0', letterSpacing: '-0.03em' }}>
          Metallic & Flake Epoxy Floors
        </h1>
        <p style={{ color: '#aaa', fontSize: 16, maxWidth: 640, margin: '14px auto 0', lineHeight: 1.6 }}>
          Ultra-lifelike renders of high-end epoxy flooring — metallic pigments, flake systems, and luxury showroom settings.
        </p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, padding: '24px 20px 0' }}>
        <button
          onClick={() => setTab('metallic')}
          style={{
            padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 14, fontWeight: 700,
            border: `1px solid ${tab === 'metallic' ? '#C89B3C' : '#333'}`,
            background: tab === 'metallic' ? '#C89B3C' : '#161616',
            color: tab === 'metallic' ? '#111' : '#aaa'
          }}
        >
          Metallic Floors
        </button>
        <button
          onClick={() => setTab('flake')}
          style={{
            padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 14, fontWeight: 700,
            border: `1px solid ${tab === 'flake' ? '#C89B3C' : '#333'}`,
            background: tab === 'flake' ? '#C89B3C' : '#161616',
            color: tab === 'flake' ? '#111' : '#aaa'
          }}
        >
          Flake Floors & Showrooms
        </button>
      </div>

      {/* Gallery */}
      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '30px 20px 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {(tab === 'metallic' ? METALLIC_FLOORS : FLAKE_FLOORS).map((img, i) => (
            <article
              key={i}
              onClick={() => setLightbox(img)}
              style={{
                background: '#161616', border: '1px solid #2b2b2b', borderRadius: 12,
                overflow: 'hidden', cursor: 'pointer', transition: 'transform .2s, border-color .2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#C89B3C'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = '#2b2b2b'; }}
            >
              <div style={{ height: 240, overflow: 'hidden' }}>
                <Image src={img.url} alt={img.title} fittingType="fill" className="w-full" style={{ height: 240 }} />
              </div>
              <div style={{ padding: '16px 18px' }}>
                <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 20, margin: '0 0 6px' }}>{img.title}</h3>
                <p style={{ fontSize: 13, color: '#888', lineHeight: 1.5, margin: 0 }}>{img.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 100,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 20, cursor: 'pointer'
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 20, right: 20, background: '#161616', border: '1px solid #333',
              color: '#fff', width: 44, height: 44, borderRadius: 8, cursor: 'pointer', fontSize: 20
            }}
          >
            ✕
          </button>
          <div style={{ maxWidth: 1100, width: '100%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <Image src={lightbox.url} alt={lightbox.title} fittingType="fit" className="w-full" style={{ maxHeight: '80vh', borderRadius: 12 }} />
            <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 28, margin: '20px 0 6px' }}>{lightbox.title}</h3>
            <p style={{ color: '#aaa', fontSize: 15 }}>{lightbox.desc}</p>
          </div>
        </div>
      )}
    </div>
  );
}