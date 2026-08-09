import { COATING_SYSTEMS, GALLERY_IMAGES } from '@/lib/epoxyVisualizerData';
import { ArrowRight, ArrowUp } from 'lucide-react';

const LIME = '#7AB800';
const LIGHT_GREY = '#B7B7B7';
const CHARCOAL = '#1a1a1a';

const VIDEO_URL = 'https://media.base44.com/videos/public/6a6e5a0e8a902b5e240d7633/38585a5f7_Epoxy_Install_Video.mp4';

export default function EpoxyWelcome({ onStart }) {
  return (
    <>
      <style>{`
        .gf-hero-bg { background-image: linear-gradient(rgba(255,255,255,0.35), rgba(255,255,255,0.55)), url('https://garageforce.com/wp-content/uploads/2022/11/garageforce-42.jpg'); background-size: cover; background-position: center; }
      `}</style>

      {/* Hero — light overlay, dark text */}
      <div className="gf-hero-bg" style={{ minHeight: 580, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: LIME, marginBottom: 20 }}>The Original One-Day Flooring Solution</div>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 800, lineHeight: 1.05, margin: '0 0 20px', maxWidth: 900, color: CHARCOAL }}>
          Your Local Garage Floor Coating Estimate
        </h1>
        <p style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, maxWidth: 700, color: CHARCOAL }}>
          The World's Largest Installer of Garage Floor Coatings
        </p>
        <p style={{ fontSize: 16, color: '#444', maxWidth: 650, lineHeight: 1.6, marginBottom: 36 }}>
          Proprietary CycloSpartic™ — 20x Stronger than Epoxy, Installed in a Day, Proven for Life. Get your estimate in 60 seconds.
        </p>
        <button onClick={onStart} style={{
          background: LIME, color: '#fff', border: 'none', padding: '20px 52px', borderRadius: 4,
          fontSize: 18, fontWeight: 800, cursor: 'pointer', letterSpacing: 0.5, textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 30px rgba(122,184,0,0.4)'
        }}>
          Get My Free Estimate <ArrowRight size={20} />
        </button>
        <div style={{ marginTop: 16, fontSize: 12, color: '#666' }}>No obligation • Free • 60 seconds</div>
      </div>

      {/* Three-column feature section — white / lime / light grey */}
      <div id="process" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', minHeight: 320 }}>
        <div style={{ background: '#fff', color: CHARCOAL, padding: '48px 36px', display: 'flex', flexDirection: 'column', borderTop: `4px solid ${LIME}` }}>
          <ArrowUp size={28} color={LIME} style={{ marginBottom: 16 }} />
          <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 14px', textTransform: 'uppercase' }}>Our Coatings</h3>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: '#555', margin: 0 }}>
            The benefits of a CycloSpartic™ floor coating put traditional epoxy and polyurea floors to shame. Higher-quality, more durable, damage-resistant, and cures in a fraction of the time.
          </p>
        </div>
        <div style={{ background: LIME, color: '#fff', padding: '48px 36px', display: 'flex', flexDirection: 'column' }}>
          <ArrowUp size={28} color="#fff" style={{ marginBottom: 16 }} />
          <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 14px', textTransform: 'uppercase' }}>Our Process</h3>
          <p style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.95, margin: 0 }}>
            Our comprehensive installation process covers everything — professionally evaluating your floor, mechanically preparing the surface, and applying our exclusive CycloSpartic™ coating system.
          </p>
        </div>
        <div style={{ background: LIGHT_GREY, color: '#fff', padding: '48px 36px', display: 'flex', flexDirection: 'column' }}>
          <ArrowUp size={28} color="#fff" style={{ marginBottom: 16 }} />
          <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 14px', textTransform: 'uppercase' }}>Our Local Pros</h3>
          <p style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.9, margin: 0 }}>
            Not only are our expert installers the best at what they do, but they are also locally based in your area. As part of the community, your local team cares just as much as you do about getting the best results.
          </p>
        </div>
      </div>

      {/* Coating Systems Showcase — 6 cards */}
      <div id="systems" style={{ padding: '80px 24px', background: '#f5f5f5' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: LIME, marginBottom: 12 }}>Our CycloSpartic™ Solutions</div>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: CHARCOAL, margin: 0 }}>Floor Coating Systems</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
          {COATING_SYSTEMS.map(sys => (
            <div key={sys.id} style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <div style={{ height: 200, background: '#f0f0f0' }}>
                <img src={sys.image} alt={sys.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ padding: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: CHARCOAL, margin: '0 0 10px' }}>{sys.name}</h3>
                <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, margin: 0 }}>{sys.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Section — white background */}
      <div style={{ padding: '80px 24px', background: '#fff', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: LIME, marginBottom: 12 }}>See It In Action</div>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: CHARCOAL, margin: '0 0 40px' }}>Professional Installation in a Day</h2>
        <div style={{ maxWidth: 800, margin: '0 auto', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>
          <video src={VIDEO_URL} autoPlay loop muted playsInline style={{ width: '100%', display: 'block' }} />
        </div>
        <button onClick={onStart} style={{
          marginTop: 40, background: LIME, color: '#fff', border: 'none', padding: '18px 48px', borderRadius: 4,
          fontSize: 16, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5,
          display: 'inline-flex', alignItems: 'center', gap: 10
        }}>
          Start My Free Estimate <ArrowRight size={18} />
        </button>
      </div>

      {/* Our Work Gallery */}
      <div style={{ padding: '80px 24px', background: '#f5f5f5' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: LIME, marginBottom: 12 }}>Our Work</div>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: CHARCOAL, margin: 0 }}>Recent Installations</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, maxWidth: 1100, margin: '0 auto' }}>
          {GALLERY_IMAGES.map((img, i) => (
            <div key={i} style={{ borderRadius: 8, overflow: 'hidden', height: 240, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
              <img src={img} alt={`Installation ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div style={{ background: LIME, padding: '60px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: '0 0 24px' }}>Ready to Transform Your Garage?</h2>
        <button onClick={onStart} style={{
          background: '#fff', color: CHARCOAL, border: 'none', padding: '18px 48px', borderRadius: 4,
          fontSize: 16, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5,
          display: 'inline-flex', alignItems: 'center', gap: 10
        }}>
          Get My Free Estimate <ArrowRight size={18} />
        </button>
      </div>
    </>
  );
}