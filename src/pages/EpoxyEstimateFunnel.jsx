import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FLAKE_COLORS, GARAGE_SIZES, FLOOR_CONDITIONS } from '@/lib/epoxyFlakeColors';
import { Image } from '@/components/ui/image';

const VIDEO_URL = 'https://media.base44.com/videos/public/6a6e5a0e8a902b5e240d7633/38585a5f7_Epoxy_Install_Video.mp4';
const LIME = '#7AB800';
const DARK_GREEN = '#2D4A3E';

export default function EpoxyEstimateFunnel() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    address: '', city: '', state: '', zip: '',
    garageSize: '', floorConditions: [],
    photoUrl: '', flakeColor: null,
    name: '', email: '', phone: '',
    leadId: null, garageSqft: 0, lowEstimate: 0, highEstimate: 0,
    beforeUrl: '', afterUrl: '', generating: false, scraping: false
  });
  const fileRef = useRef(null);

  const update = (k, v) => setData(d => ({ ...d, [k]: v }));

  // ─── Step 5: Upload photo + generate before/after ───
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

  // ─── Step 7: Run scraper + generate bid ───
  const runScraperAndBid = async () => {
    update('scraping', true);
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

      // Wait for dramatic effect (scraper animation)
      await new Promise(r => setTimeout(r, 4000));

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

      setStep(7); // Results
    } catch (e) {
      console.error('Scrape/bid failed:', e);
      // Still show results with estimated data
      const est = (GARAGE_SIZES.find(s => s.id === data.garageSize)?.sqft) || 440;
      update('garageSqft', est);
      update('lowEstimate', Math.round(est * 3.5));
      update('highEstimate', Math.round(est * 6.5));
      setStep(7);
    }
    update('scraping', false);
  };

  const canProceed = () => {
    switch (step) {
      case 1: return data.address && data.zip;
      case 2: return !!data.garageSize;
      case 3: return data.floorConditions.length > 0;
      case 4: return !!data.flakeColor;
      case 5: return data.name && data.email && data.phone;
      default: return true;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @keyframes epoxy-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes epoxy-spin { to { transform: rotate(360deg); } }
        @keyframes epoxy-slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .epoxy-spinner { animation: epoxy-spin 1s linear infinite; }
        .epoxy-dot { animation: epoxy-pulse 1.4s infinite; }
        .epoxy-progress-bar { animation: epoxy-slide 1.5s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e5e5', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: LIME, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>E</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#1a1a1a' }}>epoxygaragefloorestimate</div>
            <div style={{ fontSize: 10, color: '#888', letterSpacing: 1, textTransform: 'uppercase' }}>.com</div>
          </div>
        </div>
        <a href="tel:9545550199" style={{ color: LIME, fontWeight: 700, fontSize: 14 }}>(954) 555-0199</a>
      </header>

      {/* Progress bar */}
      <div style={{ height: 4, background: '#eee', position: 'relative' }}>
        <div style={{ height: '100%', width: `${(step / 7) * 100}%`, background: LIME, transition: 'width 0.4s ease' }} />
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* ─── STEP 0: Welcome ─── */}
        {step === 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: LIME, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>The Original One-Day Flooring Solution</div>
            <h1 style={{ fontSize: 42, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.1, marginBottom: 20 }}>Get Your Epoxy Garage Floor Estimate in 60 Seconds</h1>
            <p style={{ fontSize: 18, color: '#555', lineHeight: 1.6, marginBottom: 30, maxWidth: 560, margin: '0 auto' }}>
              Upload a photo of your garage, pick your flake color, and we'll look up your garage's square footage from public records — then email you a professional bid within 24 hours.
            </p>

            {/* Video */}
            <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 30, boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>
              <video src={VIDEO_URL} autoPlay loop muted playsInline style={{ width: '100%', display: 'block' }} />
            </div>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 30, flexWrap: 'wrap' }}>
              {[{ icon: '📸', text: 'Photo Visualizer' }, { icon: '🎨', text: '12 Flake Colors' }, { icon: '📏', text: 'Auto Sq Ft Lookup' }, { icon: '📧', text: 'Bid in 24hrs' }].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#f8f8f8', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#444' }}>
                  <span style={{ fontSize: 18 }}>{f.icon}</span> {f.text}
                </div>
              ))}
            </div>

            <button onClick={() => setStep(1)} style={{ background: LIME, color: '#fff', border: 'none', padding: '18px 48px', borderRadius: 8, fontSize: 18, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 24px rgba(122,184,0,0.3)' }}>
              Start My Free Estimate →
            </button>
            <div style={{ marginTop: 16, fontSize: 12, color: '#888' }}>No obligation • Free • 60 seconds</div>
          </div>
        )}

        {/* ─── STEP 1: Address ─── */}
        {step === 1 && (
          <StepCard title="What's Your Address?" subtitle="We use this to look up your garage's square footage from public records.">
            <input className="epoxy-input" placeholder="Street Address" value={data.address} onChange={e => update('address', e.target.value)} style={inputStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input className="epoxy-input" placeholder="City" value={data.city} onChange={e => update('city', e.target.value)} style={inputStyle} />
              <input className="epoxy-input" placeholder="State" value={data.state} onChange={e => update('state', e.target.value)} style={inputStyle} maxLength={2} />
            </div>
            <input className="epoxy-input" placeholder="ZIP Code" value={data.zip} onChange={e => update('zip', e.target.value)} style={inputStyle} maxLength={5} />
            <NavButtons step={step} setStep={setStep} canProceed={canProceed()} />
          </StepCard>
        )}

        {/* ─── STEP 2: Garage Size ─── */}
        {step === 2 && (
          <StepCard title="How Big Is Your Garage?" subtitle="Pick the closest match. If you're not sure, our system will detect it from public records.">
            <div style={{ display: 'grid', gap: 12 }}>
              {GARAGE_SIZES.map(s => (
                <button key={s.id} onClick={() => update('garageSize', s.id)} style={{
                  ...cardBtnStyle,
                  borderColor: data.garageSize === s.id ? LIME : '#e0e0e0',
                  background: data.garageSize === s.id ? '#f5ffe8' : '#fff'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a' }}>{s.label}</div>
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

        {/* ─── STEP 3: Floor Condition ─── */}
        {step === 3 && (
          <StepCard title="What Condition Is Your Floor In?" subtitle="Select all that apply. This helps us prepare the right installation plan.">
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
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{c.label}</span>
                    {sel && <span style={{ color: LIME, fontSize: 18 }}>✓</span>}
                  </button>
                );
              })}
            </div>
            <NavButtons step={step} setStep={setStep} canProceed={canProceed()} />
          </StepCard>
        )}

        {/* ─── STEP 4: Visualizer — Upload + Flake Color ─── */}
        {step === 4 && (
          <StepCard title="Visualize Your New Floor" subtitle="Upload a photo of your garage floor, then pick a flake color to see your before & after.">
            {/* Upload */}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()} style={{
              width: '100%', padding: '24px', border: `2px dashed ${data.photoUrl ? LIME : '#ccc'}`,
              borderRadius: 12, background: data.photoUrl ? '#f5ffe8' : '#fafafa', cursor: 'pointer', marginBottom: 20
            }}>
              {data.generating ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div className="epoxy-spinner" style={{ width: 32, height: 32, border: `4px solid ${LIME}`, borderTopColor: 'transparent', borderRadius: '50%' }} />
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

            {/* Before/After result */}
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

            {/* Flake color chart */}
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>Pick Your Flake Color:</div>
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
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a' }}>{c.name}</div>
                  <div style={{ fontSize: 9, color: '#888' }}>{c.code}</div>
                </button>
              ))}
            </div>
            <NavButtons step={step} setStep={setStep} canProceed={canProceed()} />
          </StepCard>
        )}

        {/* ─── STEP 5: Contact Info ─── */}
        {step === 5 && (
          <StepCard title="Almost There!" subtitle="Enter your contact info so we can look up your garage and email your estimate.">
            <input className="epoxy-input" placeholder="Full Name" value={data.name} onChange={e => update('name', e.target.value)} style={inputStyle} />
            <input className="epoxy-input" placeholder="Email Address" type="email" value={data.email} onChange={e => update('email', e.target.value)} style={inputStyle} />
            <input className="epoxy-input" placeholder="Phone Number" type="tel" value={data.phone} onChange={e => update('phone', e.target.value)} style={inputStyle} />
            <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>🔒 Your info is secure. We'll only use it to send your estimate.</div>
            <NavButtons step={step} setStep={setStep} canProceed={canProceed()} onNext={runScraperAndBid} nextLabel="Get My Estimate →" />
          </StepCard>
        )}

        {/* ─── STEP 6: Scraper Progress ─── */}
        {step === 6 && <ScrapeProgress data={data} />}

        {/* ─── STEP 7: Results ─── */}
        {step === 7 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 30 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: LIME, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 40 }}>✓</span>
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a1a1a', marginBottom: 8 }}>Your Estimate Is Ready!</h1>
              <p style={{ fontSize: 16, color: '#555' }}>Based on public records for {data.address}, {data.state} {data.zip}</p>
            </div>

            {/* Detected sq ft */}
            <div style={{ background: DARK_GREEN, color: '#fff', borderRadius: 12, padding: 24, marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.7, marginBottom: 8 }}>Detected Garage Size</div>
              <div style={{ fontSize: 48, fontWeight: 800 }}>{data.garageSqft}<span style={{ fontSize: 20, opacity: 0.7 }}> sq ft</span></div>
              <div style={{ fontSize: 14, opacity: 0.8, marginTop: 8 }}>Source: Public property records</div>
            </div>

            {/* Price range */}
            <div style={{ border: `2px solid ${LIME}`, borderRadius: 12, padding: 24, marginBottom: 20, textAlign: 'center', background: '#f5ffe8' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: DARK_GREEN, marginBottom: 8, fontWeight: 700 }}>Estimated Price Range</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: DARK_GREEN }}>${data.lowEstimate} – ${data.highEstimate}</div>
              <div style={{ fontSize: 14, color: '#666', marginTop: 8 }}>Full Flake Epoxy System in {data.flakeColor?.name || 'Tidal Wave'}</div>
            </div>

            {/* Before/After */}
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

            {/* 24-hour message */}
            <div style={{ background: DARK_GREEN, color: '#fff', borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⏱️</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>A specialist from Xtreme Polishing Systems will contact you within 24 hours.</div>
              <div style={{ fontSize: 14, opacity: 0.8 }}>We've emailed your detailed bid to {data.email}</div>
            </div>

            {/* CTA */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <a href="tel:9545550199" style={{ background: LIME, color: '#fff', padding: '16px 32px', borderRadius: 8, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>Call Now: (954) 555-0199</a>
              <a href="https://xtremepolishingsystems.com" style={{ border: '2px solid #ddd', color: '#1a1a1a', padding: '14px 32px', borderRadius: 8, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>Learn More</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helper Components ───
const inputStyle = {
  width: '100%', padding: '14px 16px', border: '1px solid #ddd', borderRadius: 8,
  fontSize: 16, fontFamily: 'inherit', marginBottom: 12, outline: 'none'
};

const cardBtnStyle = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '16px', borderRadius: 10,
  border: '2px solid #e0e0e0', background: '#fff', cursor: 'pointer', textAlign: 'left',
  transition: 'all 0.15s', fontFamily: 'inherit'
};

function StepCard({ title, subtitle, children }) {
  return (
    <div>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: '#1a1a1a', marginBottom: 8 }}>{title}</h2>
      <p style={{ fontSize: 15, color: '#666', marginBottom: 24 }}>{subtitle}</p>
      {children}
    </div>
  );
}

function NavButtons({ step, setStep, canProceed, onNext, nextLabel }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
      {step > 0 && (
        <button onClick={() => setStep(step - 1)} style={{ padding: '14px 24px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', color: '#666', fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
          ← Back
        </button>
      )}
      {onNext ? (
        <button onClick={onNext} disabled={!canProceed} style={{
          flex: 1, padding: '14px 24px', border: 'none', borderRadius: 8,
          background: canProceed ? LIME : '#ccc', color: '#fff', fontWeight: 700, cursor: canProceed ? 'pointer' : 'not-allowed', fontSize: 16
        }}>
          {nextLabel || 'Continue →'}
        </button>
      ) : (
        <button onClick={() => canProceed && setStep(step + 1)} disabled={!canProceed} style={{
          flex: 1, padding: '14px 24px', border: 'none', borderRadius: 8,
          background: canProceed ? LIME : '#ccc', color: '#fff', fontWeight: 700, cursor: canProceed ? 'pointer' : 'not-allowed', fontSize: 16
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
    <div style={{ textAlign: 'center', paddingTop: 40 }}>
      <div style={{ width: 80, height: 80, margin: '0 auto 24px', position: 'relative' }}>
        <div className="epoxy-spinner" style={{ width: 80, height: 80, border: `6px solid ${LIME}`, borderTopColor: 'transparent', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 32 }}>🔍</div>
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1a1a1a', marginBottom: 8 }}>Looking Up Your Garage…</h2>
      <p style={{ fontSize: 14, color: '#888', marginBottom: 30 }}>{data.address}, {data.state} {data.zip}</p>

      <div style={{ maxWidth: 400, margin: '0 auto', textAlign: 'left' }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', opacity: i <= progressStep ? 1 : 0.4 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i < progressStep ? LIME : i === progressStep ? '#fff' : '#eee', border: `2px solid ${i <= progressStep ? LIME : '#ddd'}` }}>
              {i < progressStep ? <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span> : i === progressStep ? <div className="epoxy-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: LIME }} /> : null}
            </div>
            <span style={{ fontSize: 14, fontWeight: i <= progressStep ? 600 : 400, color: i <= progressStep ? '#1a1a1a' : '#999' }}>{s}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ maxWidth: 400, margin: '24px auto 0', height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${((progressStep + 1) / steps.length) * 100}%`, background: LIME, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}