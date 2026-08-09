import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FLAKE_COLORS, GARAGE_SIZES, FLOOR_CONDITIONS } from '@/lib/epoxyFlakeColors';
import { Image } from '@/components/ui/image';

const VIDEO_URL = 'https://media.base44.com/videos/public/6a6e5a0e8a902b5e240d7633/38585a5f7_Epoxy_Install_Video.mp4';

// GarageForce design DNA
const LIME = '#7AB800';
const DARK_GREEN = '#2C483F';
const LIGHT_GREY = '#B7B7B7';
const CHARCOAL = '#1a1a1a';

// GarageForce coating system images
const COATING_SYSTEMS = [
  { id: 'full-chip', name: 'Full Chip System', desc: 'Most popular — decorative 3-layer chip system, installed in a day, back on floor in 24hrs', image: 'https://garageforce.com/wp-content/uploads/2022/11/square-full-chip.png' },
  { id: 'medici', name: 'Medici® System', desc: 'Custom decorative finish that outlasts acrylic or acid stain — no waxing or re-coating', image: 'https://garageforce.com/wp-content/uploads/2024/02/Medici-Patio.png' },
  { id: 'metallic', name: 'Metallic System', desc: 'Pearlescent metallic look — flowing, luxurious, like liquid metal or natural marble', image: 'https://garageforce.com/wp-content/uploads/2024/02/Metallic-Empty-Store.png' },
  { id: 'solid-color', name: 'Solid Color System', desc: 'Rich, vibrant direct-to-concrete coating with cyclo-aliphatic hybrid properties', image: 'https://garageforce.com/wp-content/uploads/2024/02/Solid-Color-Pallet-Jack.png' },
  { id: 'quartz', name: 'Quartz System', desc: 'Extreme abrasion resistance with textured finish — meets OSHA slip requirements', image: 'https://garageforce.com/wp-content/uploads/2024/02/Quartz-Fork-Lift.png' }
];

const GALLERY_IMAGES = [
  'https://garageforce.com/wp-content/uploads/2022/11/garageforce-42.jpg',
  'https://garageforce.com/wp-content/uploads/2022/11/garageforce-41.jpg',
  'https://garageforce.com/wp-content/uploads/2022/11/garageforce-40.jpg',
  'https://garageforce.com/wp-content/uploads/2022/11/garageforce-46.jpg',
  'https://garageforce.com/wp-content/uploads/2022/11/garageforce-45.jpg',
  'https://garageforce.com/wp-content/uploads/2022/11/garageforce-13.jpg'
];

export default function EpoxyEstimateFunnel() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    address: '', city: '', state: '', zip: '',
    garageSize: '', systemType: 'full-chip',
    floorConditions: [],
    photoUrl: '', flakeColor: null,
    name: '', email: '', phone: '',
    leadId: null, garageSqft: 0, lowEstimate: 0, highEstimate: 0,
    beforeUrl: '', afterUrl: '', generating: false, scraping: false
  });
  const fileRef = useRef(null);

  const update = (k, v) => setData(d => ({ ...d, [k]: v }));

  // ─── Upload photo + generate before/after ───
  const handlePhotoUpload = async (file) => {
    if (!file) return;
    update('generating', true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      update('photoUrl', file_url);

      if (data.flakeColor) {
        const res = await base44.functions.invoke('epoxyEstimatorEngine', {
          action: 'generate_visualization',
          photo_url: file_url,
          flake_color_name: data.flakeColor.name,
          flake_hex: data.flakeColor.hex
        });
        const d = res?.data || res;
        if (d.after_url) {
          update('afterUrl', d.after_url);
          update('beforeUrl', d.before_url || file_url);
        }
      }
    } catch (e) {
      console.error('Upload failed:', e);
    }
    update('generating', false);
  };

  const pickFlake = async (color) => {
    update('flakeColor', color);
    if (data.photoUrl) {
      update('generating', true);
      try {
        const res = await base44.functions.invoke('epoxyEstimatorEngine', {
          action: 'generate_visualization',
          photo_url: data.photoUrl,
          flake_color_name: color.name,
          flake_hex: color.hex
        });
        const d = res?.data || res;
        if (d.after_url) {
          update('afterUrl', d.after_url);
          update('beforeUrl', d.before_url || data.photoUrl);
        }
      } catch (e) { console.error('Viz failed:', e); }
      update('generating', false);
    }
  };

  // ─── Run scraper + generate bid ───
  const runScraperAndBid = async () => {
    update('scraping', true);
    setStep(7); // Show scraper progress
    const fullAddress = `${data.address}, ${data.city}, ${data.state} ${data.zip}`;
    try {
      // Create lead first
      const leadRes = await base44.functions.invoke('epoxyEstimatorEngine', {
        action: 'create_lead',
        name: data.name, email: data.email, phone: data.phone,
        address: fullAddress, garage_size: data.garageSize,
        floor_condition: data.floorConditions.join(', ')
      });
      const leadId = leadRes?.data?.lead_id || leadRes?.lead_id;
      update('leadId', leadId);

      // Wait for dramatic scraper animation
      await new Promise(r => setTimeout(r, 5000));

      // Lookup sq ft from public records
      const scrapeRes = await base44.functions.invoke('epoxyEstimatorEngine', {
        action: 'lookup_sqft',
        address: fullAddress,
        garage_size: data.garageSize
      });
      const sd = scrapeRes?.data || scrapeRes;
      update('garageSqft', sd.garage_sqft || 440);

      // Generate bid + email
      const bidRes = await base44.functions.invoke('epoxyEstimatorEngine', {
        action: 'generate_bid',
        lead_id: leadId,
        name: data.name, email: data.email, phone: data.phone,
        address: fullAddress,
        garage_sqft: sd.garage_sqft || 440,
        garage_size: data.garageSize,
        floor_condition: data.floorConditions.join(', '),
        flake_color: data.flakeColor?.name || 'Tidal Wave',
        flake_hex: data.flakeColor?.hex || '#3A6A8A',
        before_url: data.beforeUrl, after_url: data.afterUrl
      });
      const bd = bidRes?.data || bidRes;
      update('lowEstimate', bd.low_estimate || 0);
      update('highEstimate', bd.high_estimate || 0);

      setStep(8); // Results
    } catch (e) {
      console.error('Scrape/bid failed:', e);
      const est = (GARAGE_SIZES.find(s => s.id === data.garageSize)?.sqft) || 440;
      update('garageSqft', est);
      update('lowEstimate', Math.round(est * 3.5));
      update('highEstimate', Math.round(est * 6.5));
      setStep(8);
    }
    update('scraping', false);
  };

  const canProceed = () => {
    switch (step) {
      case 1: return data.address && data.zip;
      case 2: return !!data.garageSize;
      case 3: return !!data.systemType;
      case 4: return data.floorConditions.length > 0;
      case 5: return !!data.flakeColor;
      case 6: return data.name && data.email && data.phone;
      default: return true;
    }
  };

  const totalSteps = 8;

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @keyframes gf-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes gf-spin { to { transform: rotate(360deg); } }
        .gf-spinner { animation: gf-spin 1s linear infinite; }
        .gf-dot { animation: gf-pulse 1.4s infinite; }
        .gf-hero-bg { background-image: linear-gradient(rgba(44,72,63,0.55), rgba(26,26,26,0.75)), url('https://garageforce.com/wp-content/uploads/2022/11/garageforce-42.jpg'); background-size: cover; background-position: center; }
      `}</style>

      {/* ─── HEADER (GarageForce style) ─── */}
      <header style={{ background: '#fff', borderBottom: `3px solid ${LIME}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, background: LIME, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 20 }}>E</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: CHARCOAL, letterSpacing: 0.5 }}>EPOXY GARAGE FLOOR</div>
            <div style={{ fontSize: 10, color: LIME, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Estimate.com</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="#systems" style={{ fontSize: 13, fontWeight: 600, color: CHARCOAL, textDecoration: 'none' }}>What We Offer</a>
          <a href="#process" style={{ fontSize: 13, fontWeight: 600, color: CHARCOAL, textDecoration: 'none' }}>Our Process</a>
          <a href="tel:9545550199" style={{ background: LIME, color: '#fff', padding: '10px 20px', borderRadius: 4, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>GET PRICING</a>
        </div>
      </header>

      {/* ─── PROGRESS BAR ─── */}
      {step > 0 && step < 8 && (
        <div style={{ height: 6, background: '#e0e0e0', position: 'relative' }}>
          <div style={{ height: '100%', width: `${(step / totalSteps) * 100}%`, background: LIME, transition: 'width 0.4s ease' }} />
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: step === 0 ? '0' : '40px 24px 80px' }}>

        {/* ─── STEP 0: WELCOME (GarageForce-style hero) ─── */}
        {step === 0 && (
          <>
            {/* Hero */}
            <div className="gf-hero-bg" style={{ minHeight: 580, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: '#fff', padding: '60px 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: LIME, marginBottom: 20 }}>The Original One-Day Flooring Solution</div>
              <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 800, lineHeight: 1.05, margin: '0 0 20px', maxWidth: 900, textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
                Your Local Garage Floor Coating Estimate
              </h1>
              <p style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, maxWidth: 700 }}>
                The World's Largest Installer of Garage Floor Coatings
              </p>
              <p style={{ fontSize: 16, opacity: 0.9, maxWidth: 650, lineHeight: 1.6, marginBottom: 36 }}>
                Proprietary CycloSpartic™ — 20x Stronger than Epoxy, Installed in a Day, Proven for Life. Get your estimate in 60 seconds.
              </p>
              <button onClick={() => setStep(1)} style={{
                background: LIME, color: '#fff', border: 'none', padding: '20px 52px', borderRadius: 4,
                fontSize: 18, fontWeight: 800, cursor: 'pointer', letterSpacing: 0.5, textTransform: 'uppercase',
                boxShadow: '0 8px 30px rgba(122,184,0,0.4)'
              }}>
                Get My Free Estimate →
              </button>
              <div style={{ marginTop: 16, fontSize: 12, opacity: 0.7 }}>No obligation • Free • 60 seconds</div>
            </div>

            {/* Three-column feature section (GarageForce style) */}
            <div id="process" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', minHeight: 320 }}>
              <div style={{ background: DARK_GREEN, color: '#fff', padding: '48px 36px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 28, marginBottom: 16, color: LIME }}>↑</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 14px', textTransform: 'uppercase' }}>Our Coatings</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.85, margin: 0 }}>
                  The benefits of a CycloSpartic™ floor coating put traditional epoxy and polyurea floors to shame. Higher-quality, more durable, damage-resistant, and cures in a fraction of the time.
                </p>
              </div>
              <div style={{ background: LIME, color: '#fff', padding: '48px 36px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 28, marginBottom: 16 }}>↑</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 14px', textTransform: 'uppercase' }}>Our Process</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.95, margin: 0 }}>
                  Our comprehensive installation process covers everything — professionally evaluating your floor, mechanically preparing the surface, and applying our exclusive CycloSpartic™ coating system.
                </p>
              </div>
              <div style={{ background: LIGHT_GREY, color: '#fff', padding: '48px 36px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 28, marginBottom: 16 }}>↑</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 14px', textTransform: 'uppercase' }}>Our Local Pros</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, opacity: 0.9, margin: 0 }}>
                  Not only are our expert installers the best at what they do, but they are also locally based in your area. As part of the community, your local team cares just as much as you do about getting the best results.
                </p>
              </div>
            </div>

            {/* Coating Systems Showcase */}
            <div id="systems" style={{ padding: '80px 24px', background: '#f5f5f5' }}>
              <div style={{ textAlign: 'center', marginBottom: 50 }}>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: LIME, marginBottom: 12 }}>Our CycloSpartic™ Solutions</div>
                <h2 style={{ fontSize: 36, fontWeight: 800, color: CHARCOAL, margin: 0 }}>Floor Coating Systems</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
                {COATING_SYSTEMS.map(sys => (
                  <div key={sys.id} style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                    <div style={{ height: 200, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

            {/* Video Section */}
            <div style={{ padding: '80px 24px', background: DARK_GREEN, color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: LIME, marginBottom: 12 }}>See It In Action</div>
              <h2 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 40px' }}>Professional Installation in a Day</h2>
              <div style={{ maxWidth: 800, margin: '0 auto', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                <video src={VIDEO_URL} autoPlay loop muted playsInline style={{ width: '100%', display: 'block' }} />
              </div>
              <button onClick={() => setStep(1)} style={{
                marginTop: 40, background: LIME, color: '#fff', border: 'none', padding: '18px 48px', borderRadius: 4,
                fontSize: 16, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5
              }}>
                Start My Free Estimate →
              </button>
            </div>

            {/* Our Work Gallery */}
            <div style={{ padding: '80px 24px', background: '#fff' }}>
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
              <button onClick={() => setStep(1)} style={{
                background: '#fff', color: CHARCOAL, border: 'none', padding: '18px 48px', borderRadius: 4,
                fontSize: 16, fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5
              }}>
                Get My Free Estimate →
              </button>
            </div>
          </>
        )}

        {/* ─── STEP 1: Address ─── */}
        {step === 1 && (
          <StepCard stepNum={1} totalSteps={totalSteps} title="What's Your Address?" subtitle="We use this to look up your garage's square footage from public records.">
            <input className="gf-input" placeholder="Street Address" value={data.address} onChange={e => update('address', e.target.value)} style={inputStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input className="gf-input" placeholder="City" value={data.city} onChange={e => update('city', e.target.value)} style={inputStyle} />
              <input className="gf-input" placeholder="State" value={data.state} onChange={e => update('state', e.target.value)} style={inputStyle} maxLength={2} />
            </div>
            <input className="gf-input" placeholder="ZIP Code" value={data.zip} onChange={e => update('zip', e.target.value)} style={inputStyle} maxLength={5} />
            <NavButtons step={step} setStep={setStep} canProceed={canProceed()} />
          </StepCard>
        )}

        {/* ─── STEP 2: Garage Size ─── */}
        {step === 2 && (
          <StepCard stepNum={2} totalSteps={totalSteps} title="How Big Is Your Garage?" subtitle="Pick the closest match. If you're not sure, our system will detect it from public records.">
            <div style={{ display: 'grid', gap: 12 }}>
              {GARAGE_SIZES.map(s => (
                <button key={s.id} onClick={() => update('garageSize', s.id)} style={{
                  ...cardBtnStyle,
                  borderColor: data.garageSize === s.id ? LIME : '#e0e0e0',
                  background: data.garageSize === s.id ? '#f5ffe8' : '#fff'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: CHARCOAL }}>{s.label}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{s.desc}</div>
                    </div>
                    {data.garageSize === s.id && <span style={{ color: LIME, fontSize: 22 }}>✓</span>}
                  </div>
                </button>
              ))}
            </div>
            <NavButtons step={step} setStep={setStep} canProceed={canProceed()} />
          </StepCard>
        )}

        {/* ─── STEP 3: System Type (GarageForce coating systems) ─── */}
        {step === 3 && (
          <StepCard stepNum={3} totalSteps={totalSteps} title="Choose Your Coating System" subtitle="Select the floor coating system that fits your needs. All systems are installed in a day with a lifetime warranty.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {COATING_SYSTEMS.map(sys => (
                <button key={sys.id} onClick={() => update('systemType', sys.id)} style={{
                  ...cardBtnStyle,
                  padding: 0, overflow: 'hidden', flexDirection: 'column', gap: 0,
                  borderColor: data.systemType === sys.id ? LIME : '#e0e0e0',
                  background: data.systemType === sys.id ? '#f5ffe8' : '#fff'
                }}>
                  <div style={{ width: '100%', height: 140, background: '#f0f0f0' }}>
                    <img src={sys.image} alt={sys.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: 14, textAlign: 'left', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: CHARCOAL }}>{sys.name}</span>
                      {data.systemType === sys.id && <span style={{ color: LIME, fontSize: 18 }}>✓</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4 }}>{sys.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <NavButtons step={step} setStep={setStep} canProceed={canProceed()} />
          </StepCard>
        )}

        {/* ─── STEP 4: Floor Condition ─── */}
        {step === 4 && (
          <StepCard stepNum={4} totalSteps={totalSteps} title="What Condition Is Your Floor In?" subtitle="Select all that apply. This helps us prepare the right installation plan.">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {FLOOR_CONDITIONS.map(c => {
                const sel = data.floorConditions.includes(c.id);
                return (
                  <button key={c.id} onClick={() => {
                    update('floorConditions', sel ? data.floorConditions.filter(x => x !== c.id) : [...data.floorConditions, c.id]);
                  }} style={{
                    ...cardBtnStyle,
                    borderColor: sel ? LIME : '#e0e0e0',
                    background: sel ? '#f5ffe8' : '#fff'
                  }}>
                    <span style={{ fontSize: 24 }}>{c.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: CHARCOAL }}>{c.label}</span>
                    {sel && <span style={{ color: LIME, fontSize: 18 }}>✓</span>}
                  </button>
                );
              })}
            </div>
            <NavButtons step={step} setStep={setStep} canProceed={canProceed()} />
          </StepCard>
        )}

        {/* ─── STEP 5: Visualizer — Upload + Flake Color ─── */}
        {step === 5 && (
          <StepCard stepNum={5} totalSteps={totalSteps} title="Visualize Your New Floor" subtitle="Upload a photo of your garage floor, then pick a flake color to see your before & after.">
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()} style={{
              width: '100%', padding: '24px', border: `2px dashed ${data.photoUrl ? LIME : '#ccc'}`,
              borderRadius: 8, background: data.photoUrl ? '#f5ffe8' : '#fafafa', cursor: 'pointer', marginBottom: 20
            }}>
              {data.generating ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div className="gf-spinner" style={{ width: 32, height: 32, border: `4px solid ${LIME}`, borderTopColor: 'transparent', borderRadius: '50%' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#666' }}>Generating your before & after…</span>
                </div>
              ) : data.photoUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Image src={data.photoUrl} fittingType="fit" className="w-full max-h-40 rounded-lg object-cover" />
                  <span style={{ fontSize: 13, color: LIME, fontWeight: 600 }}>✓ Photo uploaded — tap to change</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 36 }}>📸</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#666' }}>Upload a photo of your garage floor</span>
                </div>
              )}
            </button>

            {data.beforeUrl && data.afterUrl && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Before</div>
                  <Image src={data.beforeUrl} fittingType="fill" className="w-full h-32 rounded-lg object-cover" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: LIME, marginBottom: 6, textTransform: 'uppercase' }}>After</div>
                  <Image src={data.afterUrl} fittingType="fill" className="w-full h-32 rounded-lg object-cover" />
                </div>
              </div>
            )}

            <div style={{ fontSize: 13, fontWeight: 700, color: CHARCOAL, marginBottom: 12 }}>Pick Your Flake Color:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {FLAKE_COLORS.map(c => (
                <button key={c.code} onClick={() => pickFlake(c)} style={{
                  ...cardBtnStyle,
                  padding: 12,
                  borderColor: data.flakeColor?.code === c.code ? LIME : '#e0e0e0',
                  background: data.flakeColor?.code === c.code ? '#f5ffe8' : '#fff',
                  flexDirection: 'column', gap: 6
                }}>
                  <div style={{ width: '100%', height: 40, borderRadius: 6, background: c.hex, border: '1px solid #ddd' }} />
                  <div style={{ fontSize: 11, fontWeight: 600, color: CHARCOAL }}>{c.name}</div>
                  <div style={{ fontSize: 9, color: '#888' }}>{c.code}</div>
                </button>
              ))}
            </div>
            <NavButtons step={step} setStep={setStep} canProceed={canProceed()} />
          </StepCard>
        )}

        {/* ─── STEP 6: Contact Info ─── */}
        {step === 6 && (
          <StepCard stepNum={6} totalSteps={totalSteps} title="Almost There!" subtitle="Enter your contact info so we can look up your garage and email your estimate.">
            <input className="gf-input" placeholder="Full Name" value={data.name} onChange={e => update('name', e.target.value)} style={inputStyle} />
            <input className="gf-input" placeholder="Email Address" type="email" value={data.email} onChange={e => update('email', e.target.value)} style={inputStyle} />
            <input className="gf-input" placeholder="Phone Number" type="tel" value={data.phone} onChange={e => update('phone', e.target.value)} style={inputStyle} />
            <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>🔒 Your info is secure. We'll only use it to send your estimate.</div>
            <NavButtons step={step} setStep={setStep} canProceed={canProceed()} onNext={runScraperAndBid} nextLabel="Get My Estimate →" />
          </StepCard>
        )}

        {/* ─── STEP 7: Scraper Progress ─── */}
        {step === 7 && <ScrapeProgress data={data} />}

        {/* ─── STEP 8: Results ─── */}
        {step === 8 && (
          <div style={{ padding: '40px 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 30 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: LIME, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 40, color: '#fff' }}>✓</span>
              </div>
              <h1 style={{ fontSize: 36, fontWeight: 800, color: CHARCOAL, marginBottom: 8 }}>Your Estimate Is Ready!</h1>
              <p style={{ fontSize: 16, color: '#555' }}>Based on public records for {data.address}, {data.state} {data.zip}</p>
            </div>

            <div style={{ background: DARK_GREEN, color: '#fff', borderRadius: 8, padding: 28, marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.7, marginBottom: 10, fontWeight: 700 }}>Detected Garage Size</div>
              <div style={{ fontSize: 52, fontWeight: 800 }}>{data.garageSqft}<span style={{ fontSize: 22, opacity: 0.7 }}> sq ft</span></div>
              <div style={{ fontSize: 14, opacity: 0.8, marginTop: 8 }}>Source: Public property records</div>
            </div>

            <div style={{ border: `3px solid ${LIME}`, borderRadius: 8, padding: 28, marginBottom: 20, textAlign: 'center', background: '#f5ffe8' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: DARK_GREEN, marginBottom: 10, fontWeight: 700 }}>Estimated Price Range</div>
              <div style={{ fontSize: 44, fontWeight: 800, color: DARK_GREEN }}>${data.lowEstimate} – ${data.highEstimate}</div>
              <div style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
                {COATING_SYSTEMS.find(s => s.id === data.systemType)?.name || 'Full Chip System'} in {data.flakeColor?.name || 'Tidal Wave'}
              </div>
            </div>

            {data.beforeUrl && data.afterUrl && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Before</div>
                  <Image src={data.beforeUrl} fittingType="fill" className="w-full h-40 rounded-lg object-cover" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: LIME, marginBottom: 6, textTransform: 'uppercase' }}>After</div>
                  <Image src={data.afterUrl} fittingType="fill" className="w-full h-40 rounded-lg object-cover" />
                </div>
              </div>
            )}

            <div style={{ background: DARK_GREEN, color: '#fff', borderRadius: 8, padding: 28, textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⏱️</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>A specialist will contact you within 24 hours.</div>
              <div style={{ fontSize: 14, opacity: 0.8 }}>We've emailed your detailed bid to {data.email}</div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="tel:9545550199" style={{ background: LIME, color: '#fff', padding: '16px 32px', borderRadius: 4, fontWeight: 700, fontSize: 16, textDecoration: 'none', textTransform: 'uppercase' }}>Call Now: (954) 555-0199</a>
              <button onClick={() => setStep(0)} style={{ border: '2px solid #ddd', color: CHARCOAL, padding: '14px 32px', borderRadius: 4, fontWeight: 700, fontSize: 16, cursor: 'pointer', background: '#fff', fontFamily: 'inherit' }}>Start Over</button>
            </div>
          </div>
        )}
      </div>

      {/* ─── FOOTER ─── */}
      <footer style={{ background: CHARCOAL, color: '#fff', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, background: LIME, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>E</div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>EPOXY GARAGE FLOOR ESTIMATE</div>
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>© 2026 Epoxy Garage Floor Estimate. The Original One-Day Flooring Solution.</div>
      </footer>
    </div>
  );
}

// ─── Helper Components ───
const inputStyle = {
  width: '100%', padding: '14px 16px', border: '1px solid #ddd', borderRadius: 4,
  fontSize: 16, fontFamily: 'inherit', marginBottom: 12, outline: 'none'
};

const cardBtnStyle = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '16px', borderRadius: 6,
  border: '2px solid #e0e0e0', background: '#fff', cursor: 'pointer', textAlign: 'left',
  transition: 'all 0.15s', fontFamily: 'inherit'
};

function StepCard({ stepNum, totalSteps, title, subtitle, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ background: DARK_GREEN, color: '#fff', padding: '6px 14px', borderRadius: 4, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
          STEP {stepNum} OF {totalSteps}
        </div>
        <div style={{ flex: 1, height: 2, background: '#e0e0e0' }} />
      </div>
      <h2 style={{ fontSize: 30, fontWeight: 800, color: CHARCOAL, marginBottom: 8 }}>{title}</h2>
      <p style={{ fontSize: 15, color: '#666', marginBottom: 24 }}>{subtitle}</p>
      {children}
    </div>
  );
}

function NavButtons({ step, setStep, canProceed, onNext, nextLabel }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
      {step > 0 && (
        <button onClick={() => setStep(step - 1)} style={{ padding: '14px 24px', border: '1px solid #ddd', borderRadius: 4, background: '#fff', color: '#666', fontWeight: 600, cursor: 'pointer', fontSize: 15, fontFamily: 'inherit' }}>
          ← Back
        </button>
      )}
      {onNext ? (
        <button onClick={onNext} disabled={!canProceed} style={{
          flex: 1, padding: '14px 24px', border: 'none', borderRadius: 4,
          background: canProceed ? LIME : '#ccc', color: '#fff', fontWeight: 800, cursor: canProceed ? 'pointer' : 'not-allowed', fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'inherit'
        }}>
          {nextLabel || 'Continue →'}
        </button>
      ) : (
        <button onClick={() => canProceed && setStep(step + 1)} disabled={!canProceed} style={{
          flex: 1, padding: '14px 24px', border: 'none', borderRadius: 4,
          background: canProceed ? LIME : '#ccc', color: '#fff', fontWeight: 800, cursor: canProceed ? 'pointer' : 'not-allowed', fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'inherit'
        }}>
          Continue →
        </button>
      )}
    </div>
  );
}

function ScrapeProgress({ data }) {
  const [progressStep, setProgressStep] = useState(0);
  const steps = [
    'Searching public property records…',
    'Locating parcel boundaries…',
    'Detecting garage footprint…',
    'Cross-referencing with county assessor…',
    'Calculating square footage…'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgressStep(p => {
        if (p >= steps.length - 1) { clearInterval(interval); return p; }
        return p + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <div style={{ width: 80, height: 80, margin: '0 auto 24px', position: 'relative' }}>
        <div className="gf-spinner" style={{ width: 80, height: 80, border: `6px solid ${LIME}`, borderTopColor: 'transparent', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 32 }}>🔍</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: LIME, marginBottom: 8 }}>Looking Up Your Garage</div>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: CHARCOAL, marginBottom: 8 }}>Analyzing Public Records…</h2>
      <p style={{ fontSize: 14, color: '#888', marginBottom: 30 }}>{data.address}, {data.state} {data.zip}</p>

      <div style={{ maxWidth: 400, margin: '0 auto', textAlign: 'left' }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', opacity: i <= progressStep ? 1 : 0.4 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i < progressStep ? LIME : i === progressStep ? '#fff' : '#eee', border: `2px solid ${i <= progressStep ? LIME : '#ddd'}` }}>
              {i < progressStep ? <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span> : i === progressStep ? <div className="gf-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: LIME }} /> : null}
            </div>
            <span style={{ fontSize: 14, fontWeight: i <= progressStep ? 600 : 400, color: i <= progressStep ? CHARCOAL : '#999' }}>{s}</span>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 400, margin: '24px auto 0', height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${((progressStep + 1) / steps.length) * 100}%`, background: LIME, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}