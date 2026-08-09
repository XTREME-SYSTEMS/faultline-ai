import { COATING_SYSTEMS, GALLERY_IMAGES, APPLICATIONS, TESTIMONIALS } from '@/lib/epoxyVisualizerData';
import { ArrowRight, ArrowUp, ShieldCheck, Award, FileCheck } from 'lucide-react';

const LIME = '#7AB800';
const LIGHT_GREY = '#B7B7B7';
const CHARCOAL = '#1a1a1a';

const VIDEO_URL = 'https://media.base44.com/videos/public/6a6e5a0e8a902b5e240d7633/38585a5f7_Epoxy_Install_Video.mp4';

export default function EpoxyWelcome({ onStart }) {
  return (
    <>
      <style>{`
        .gf-hero-bg { background-image: linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.65)), url('https://garageforce.com/wp-content/uploads/2022/11/garageforce-42.jpg'); background-size: cover; background-position: center; }
      `}</style>

      {/* ═══ 1. HERO ═══ */}
      <div className="gf-hero-bg" style={{ minHeight: 600, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: '#fff', padding: '80px 24px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: LIME, marginBottom: 24 }}>The Original One-Day Flooring Solution</div>
        <h1 style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 800, lineHeight: 1.05, margin: '0 0 16px', maxWidth: 900, textAlign: 'center' }}>
          Your Local Garage Floor Coating Solution
        </h1>
        <p style={{ fontSize: 22, fontWeight: 600, marginBottom: 16, maxWidth: 700 }}>
          The World's Largest Installer of Garage Floor Coatings
        </p>
        <p style={{ fontSize: 17, maxWidth: 650, lineHeight: 1.6, marginBottom: 36, opacity: 0.9 }}>
          Proprietary CycloSpartic™ – 20x Stronger than Epoxy, Installed in a Day, Proven for Life.
        </p>
        <button onClick={onStart} style={{
          background: LIME, color: '#fff', border: 'none', padding: '20px 52px', borderRadius: 4,
          fontSize: 18, fontWeight: 800, cursor: 'pointer', letterSpacing: 0.5, textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: 10,
          boxShadow: '0 8px 30px rgba(122,184,0,0.4)'
        }}>
          Get My Free Estimate <ArrowRight size={20} />
        </button>
      </div>

      {/* ═══ 2. THREE COLUMNS — Our Coatings / Our Process / Our Local Professionals ═══ */}
      <div id="process" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', minHeight: 320 }}>
        <div style={{ background: '#fff', color: CHARCOAL, padding: '48px 36px', display: 'flex', flexDirection: 'column', borderTop: `4px solid ${LIME}` }}>
          <ArrowUp size={28} color={LIME} style={{ marginBottom: 16 }} />
          <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 14px', textTransform: 'uppercase' }}>Our Coatings</h3>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: '#555', margin: 0 }}>
            The benefits of a CycloSpartic™ floor coating put traditional epoxy and polyurea floors to shame. Not only are they higher-quality, more durable and damage-resistant, but CycloSpartic™ floors also cure in a fraction of the time versus traditional epoxy floors and are exclusive to Garage Force.
          </p>
        </div>
        <div style={{ background: LIME, color: '#fff', padding: '48px 36px', display: 'flex', flexDirection: 'column' }}>
          <ArrowUp size={28} color="#fff" style={{ marginBottom: 16 }} />
          <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 14px', textTransform: 'uppercase' }}>Our Process</h3>
          <p style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.95, margin: 0 }}>
            Our comprehensive installation process covers everything including professionally evaluating your floor, mechanically preparing the surface, and applying our exclusive CycloSpartic™ coating system. Our expert-level process provides superior lifetime results.
          </p>
        </div>
        <div style={{ background: LIGHT_GREY, color: '#fff', padding: '48px 36px', display: 'flex', flexDirection: 'column' }}>
          <ArrowUp size={28} color="#fff" style={{ marginBottom: 16 }} />
          <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 14px', textTransform: 'uppercase' }}>Our Local Professionals</h3>
          <p style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.9, margin: 0 }}>
            Not only are our expert installers the best at what they do, but they are also locally based in your area. As part of the community, your local Garage Force teams care just as much as you do about getting the best results possible for your project (if not more)!
          </p>
        </div>
      </div>

      {/* ═══ 3. VERIFLOOR SECTION ═══ */}
      <div id="verifloor" style={{ padding: '80px 24px', background: '#fff', textAlign: 'center' }}>
        <img src="https://garageforce.com/wp-content/uploads/2025/07/garage-force-verifloor.png" alt="VeriFloor" style={{ height: 80, marginBottom: 16 }} />
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: LIME, marginBottom: 50 }}>See the Difference</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40, maxWidth: 1000, margin: '0 auto', textAlign: 'left' }}>
          <div>
            <ShieldCheck size={32} color={LIME} style={{ marginBottom: 12 }} />
            <h4 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 8px' }}>BUY <span style={{ fontWeight: 400 }}>With Confidence</span></h4>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, margin: 0 }}>VeriFloor™ ensures that the product you choose is the product you receive...guaranteed! In an industry that is NOT well regulated, be confident that the product we show you is the product we use. No gimmicks.</p>
          </div>
          <div>
            <Award size={32} color={LIME} style={{ marginBottom: 12 }} />
            <h4 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 8px' }}>UNIQUE <span style={{ fontWeight: 400 }}>Floor Properties</span></h4>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, margin: 0 }}>Garage Force is the only company that provides a unique serial number to every floor it installs; all stored in the VeriFloor™ coin code.</p>
            <img src="https://garageforce.com/wp-content/uploads/2025/04/VF-Coin-Icon.png" alt="VeriFloor Coin" style={{ width: 60, marginTop: 12 }} />
          </div>
          <div>
            <FileCheck size={32} color={LIME} style={{ marginBottom: 12 }} />
            <h4 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 8px' }}>EASY <span style={{ fontWeight: 400 }}>Warranty Registration</span></h4>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, margin: 0 }}>VeriFloor™ makes warranty registration a breeze. With the scan of the code, all of your information is filled out and ready for you to register.</p>
          </div>
        </div>
      </div>

      {/* ═══ 4. COATING SOLUTIONS — 6 systems ═══ */}
      <div id="systems" style={{ padding: '80px 24px', background: '#f5f5f5' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: CHARCOAL, margin: 0 }}>Our CycloSpartic™ Floor Coating Solutions</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
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

      {/* ═══ 5. APPLICATIONS GRID — 8 applications ═══ */}
      <div style={{ padding: '60px 24px', background: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, maxWidth: 900, margin: '0 auto' }}>
          {APPLICATIONS.map(app => (
            <div key={app.name} style={{ textAlign: 'center' }}>
              <img src={app.image} alt={app.name} style={{ width: '100%', maxWidth: 180, borderRadius: 8, marginBottom: 10 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: CHARCOAL }}>{app.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 6. ABOUT SECTION ═══ */}
      <div id="about" style={{ padding: '80px 24px', background: '#f5f5f5' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 50, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: CHARCOAL, margin: '0 0 20px' }}>About Garage Force</h2>
            <p style={{ fontSize: 15, color: '#555', lineHeight: 1.8, margin: '0 0 16px' }}>
              Our CycloSpartic™ concrete coatings provide a custom, finished look while adding functionality to your existing concrete surface. Offering a full range of options, Garage Force is a leader in floor coating installation across the country. Our professional coating systems provide a durable finished floor that is both easy to maintain and protects the value in your home.
            </p>
            <p style={{ fontSize: 15, color: '#555', lineHeight: 1.8, margin: '0 0 16px' }}>
              At Garage Force, our ultimate goal is to achieve 100% customer satisfaction. We want you to be absolutely thrilled with your project.
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: CHARCOAL, margin: '0 0 20px' }}>
              Let one of our expert professionals show you the Garage Force Difference!
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={onStart} style={{ background: LIME, color: '#fff', border: 'none', padding: '14px 28px', borderRadius: 4, fontWeight: 700, fontSize: 14, cursor: 'pointer', textTransform: 'uppercase' }}>Our Process</button>
              <button onClick={onStart} style={{ background: '#fff', color: CHARCOAL, border: '1px solid #ddd', padding: '14px 28px', borderRadius: 4, fontWeight: 700, fontSize: 14, cursor: 'pointer', textTransform: 'uppercase' }}>Color Options</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <img src="https://garageforce.com/wp-content/uploads/2026/06/IMG_0236.jpg" alt="Installation" style={{ width: '100%', borderRadius: 8, height: 250, objectFit: 'cover' }} />
            <img src="https://garageforce.com/wp-content/uploads/2022/11/garageforce-39.jpg" alt="Finished floor" style={{ width: '100%', borderRadius: 8, height: 250, objectFit: 'cover' }} />
          </div>
        </div>
      </div>

      {/* ═══ 7. OUR WORK GALLERY ═══ */}
      <div style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: CHARCOAL, margin: 0 }}>Our Work</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 1100, margin: '0 auto' }}>
          {GALLERY_IMAGES.map((img, i) => (
            <div key={i} style={{ borderRadius: 8, overflow: 'hidden', height: 280, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
              <img src={img} alt={`Installation ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 8. STORAGE & ORGANIZATION ═══ */}
      <div style={{ padding: '80px 24px', background: '#f5f5f5' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 50, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: CHARCOAL, margin: '0 0 20px' }}>Storage & Organization</h2>
            <p style={{ fontSize: 15, color: '#555', lineHeight: 1.8, margin: '0 0 24px' }}>
              Garage Force offers superior garage slatwall panels for your garage storage needs. Our premium garage wall panels are perfect for keeping your space organized.
            </p>
            <button onClick={onStart} style={{ background: LIME, color: '#fff', border: 'none', padding: '14px 28px', borderRadius: 4, fontWeight: 700, fontSize: 14, cursor: 'pointer', textTransform: 'uppercase' }}>See Storage Options</button>
          </div>
          <img src="https://garageforce.com/wp-content/uploads/2024/03/storewall.jpg" alt="Storage wall" style={{ width: '100%', borderRadius: 8, height: 300, objectFit: 'cover' }} />
        </div>
      </div>

      {/* ═══ 9. TESTIMONIALS ═══ */}
      <div id="testimonials" style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: CHARCOAL, margin: 0 }}>From Our Clients</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} style={{ background: '#f8f8f8', borderRadius: 8, padding: 28, border: '1px solid #eee' }}>
              <img src="https://garageforce.com/wp-content/uploads/2022/11/landscape-maintenance-09.png" alt="Client" style={{ width: 50, height: 50, borderRadius: '50%', marginBottom: 16 }} />
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.7, margin: '0 0 16px', fontStyle: 'italic' }}>"{t.text}"</p>
              <div style={{ fontSize: 13, fontWeight: 700, color: CHARCOAL }}>— {t.author}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 10. VIDEO + CTA ═══ */}
      <div style={{ padding: '80px 24px', background: '#f5f5f5', textAlign: 'center' }}>
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
          Get My Free Estimate <ArrowRight size={18} />
        </button>
      </div>

      {/* ═══ 11. FINAL CTA ═══ */}
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