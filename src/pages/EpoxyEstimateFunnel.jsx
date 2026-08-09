import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { COATING_SYSTEMS, getColorsBySystem, SHEEN_OPTIONS } from '@/lib/epoxyVisualizerData';
import { GARAGE_SIZES, FLOOR_CONDITIONS } from '@/lib/epoxyFlakeColors';
import ColorSwatch from '@/components/vq/ColorSwatch';
import EpoxyWelcome from '@/components/epoxy/EpoxyWelcome';
import { Image } from '@/components/ui/image';
import { Upload, Check, Clock, Search, Phone, ArrowRight, ArrowLeft, Camera, Loader2, ShieldCheck, Square, Wrench, Droplet, Layers, AlertTriangle, Droplets } from 'lucide-react';

const LIME = '#7AB800';
const LIGHT_GREY = '#B7B7B7';
const CHARCOAL = '#1a1a1a';

// Floor condition → lucide icon mapping (no generic emojis)
const CONDITION_ICONS = {
  'bare-concrete': Square,
  'cracks': Wrench,
  'oil-stains': Droplet,
  'existing-coating': Layers,
  'pitting': AlertTriangle,
  'moisture': Droplets
};

export default function EpoxyEstimateFunnel() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    address: '', city: '', state: '', zip: '',
    garageSize: '', systemType: 'flake',
    floorConditions: [],
    photoUrl: '', flakeColor: null, sheen: 'gloss',
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
          flake_color_name: data.flakeColor.color_name,
          flake_hex: data.flakeColor.hex,
          color_image_url: data.flakeColor.image_url,
          sheen: data.sheen
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
          flake_color_name: color.color_name,
          flake_hex: color.hex,
          color_image_url: color.image_url,
          sheen: data.sheen
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

  const pickSheen = async (sheenId) => {
    update('sheen', sheenId);
    if (data.photoUrl && data.flakeColor) {
      update('generating', true);
      try {
        const res = await base44.functions.invoke('epoxyEstimatorEngine', {
          action: 'generate_visualization',
          photo_url: data.photoUrl,
          flake_color_name: data.flakeColor.color_name,
          flake_hex: data.flakeColor.hex,
          color_image_url: data.flakeColor.image_url,
          sheen: sheenId
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
    setStep(7);
    const fullAddress = `${data.address}, ${data.city}, ${data.state} ${data.zip}`;
    try {
      const leadRes = await base44.functions.invoke('epoxyEstimatorEngine', {
        action: 'create_lead',
        name: data.name, email: data.email, phone: data.phone,
        address: fullAddress, garage_size: data.garageSize,
        floor_condition: data.floorConditions.join(', ')
      });
      const leadId = leadRes?.data?.lead_id || leadRes?.lead_id;
      update('leadId', leadId);

      await new Promise(r => setTimeout(r, 5000));

      const scrapeRes = await base44.functions.invoke('epoxyEstimatorEngine', {
        action: 'lookup_sqft',
        address: fullAddress,
        garage_size: data.garageSize
      });
      const sd = scrapeRes?.data || scrapeRes;
      update('garageSqft', sd.garage_sqft || 440);

      const bidRes = await base44.functions.invoke('epoxyEstimatorEngine', {
        action: 'generate_bid',
        lead_id: leadId,
        name: data.name, email: data.email, phone: data.phone,
        address: fullAddress,
        garage_sqft: sd.garage_sqft || 440,
        garage_size: data.garageSize,
        floor_condition: data.floorConditions.join(', '),
        flake_color: data.flakeColor?.color_name || 'Tidal Wave',
        flake_hex: data.flakeColor?.hex || '#3A6A8A',
        before_url: data.beforeUrl, after_url: data.afterUrl
      });
      const bd = bidRes?.data || bidRes;
      update('lowEstimate', bd.low_estimate || 0);
      update('highEstimate', bd.high_estimate || 0);

      setStep(8);
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
  const colors = getColorsBySystem(data.systemType);

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @keyframes gf-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes gf-spin { to { transform: rotate(360deg); } }
        .gf-spinner { animation: gf-spin 1s linear infinite; }
        .gf-dot { animation: gf-pulse 1.4s infinite; }
      `}</style>

      {/* ─── HEADER ─── */}
      <header style={{ background: '#fff', borderBottom: `3px solid ${LIME}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, background: LIME, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 20 }}>X</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: CHARCOAL, letterSpacing: 0.5 }}>XPS CERTIFIED</div>
            <div style={{ fontSize: 10, color: LIME, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Flooring Systems</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="tel:9545550199" style={{ background: LIME, color: '#fff', padding: '10px 20px', borderRadius: 4, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>GET PRICING</a>
          <a href="#verifloor" style={{ fontSize: 13, fontWeight: 600, color: CHARCOAL, textDecoration: 'none' }}>XPS CERTIFIED™</a>
          <a href="#systems" style={{ fontSize: 13, fontWeight: 600, color: CHARCOAL, textDecoration: 'none' }}>What We Offer</a>
          <a href="#about" style={{ fontSize: 13, fontWeight: 600, color: CHARCOAL, textDecoration: 'none' }}>Who We Are</a>
          <a href="#testimonials" style={{ fontSize: 13, fontWeight: 600, color: CHARCOAL, textDecoration: 'none' }}>Where We Are</a>
        </div>
      </header>

      {/* ─── PROGRESS BAR ─── */}
      {step > 0 && step < 8 && (
        <div style={{ height: 6, background: '#e0e0e0' }}>
          <div style={{ height: '100%', width: `${(step / totalSteps) * 100}%`, background: LIME, transition: 'width 0.4s ease' }} />
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: step === 0 ? '0' : '40px 24px 80px' }}>

        {/* ─── STEP 0: WELCOME ─── */}
        {step === 0 && <EpoxyWelcome onStart={() => setStep(1)} />}

        {/* ─── STEP 1: Address ─── */}
        {step === 1 && (
          <StepCard stepNum={1} totalSteps={totalSteps} title="What's Your Address?" subtitle="We use this to look up your garage's square footage from public records.">
            <input placeholder="Street Address" value={data.address} onChange={e => update('address', e.target.value)} style={inputStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input placeholder="City" value={data.city} onChange={e => update('city', e.target.value)} style={inputStyle} />
              <input placeholder="State" value={data.state} onChange={e => update('state', e.target.value)} style={inputStyle} maxLength={2} />
            </div>
            <input placeholder="ZIP Code" value={data.zip} onChange={e => update('zip', e.target.value)} style={inputStyle} maxLength={5} />
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
                    {data.garageSize === s.id && <Check size={22} color={LIME} />}
                  </div>
                </button>
              ))}
            </div>
            <NavButtons step={step} setStep={setStep} canProceed={canProceed()} />
          </StepCard>
        )}

        {/* ─── STEP 3: System Type (6 coating systems) ─── */}
        {step === 3 && (
          <StepCard stepNum={3} totalSteps={totalSteps} title="Choose Your Coating System" subtitle="Select the floor coating system that fits your needs. All systems are installed in a day with a lifetime warranty.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {COATING_SYSTEMS.map(sys => (
                <button key={sys.id} onClick={() => { update('systemType', sys.id); update('flakeColor', null); }} style={{
                  ...cardBtnStyle,
                  padding: 0, overflow: 'hidden', flexDirection: 'column', gap: 0,
                  borderColor: data.systemType === sys.id ? LIME : '#e0e0e0',
                  background: data.systemType === sys.id ? '#f5ffe8' : '#fff'
                }}>
                  <div style={{ width: '100%', height: 130, background: '#f0f0f0' }}>
                    <img src={sys.image} alt={sys.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: 12, textAlign: 'left', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: CHARCOAL }}>{sys.name}</span>
                      {data.systemType === sys.id && <Check size={16} color={LIME} />}
                    </div>
                    <div style={{ fontSize: 10, color: '#888', lineHeight: 1.4 }}>{sys.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <NavButtons step={step} setStep={setStep} canProceed={canProceed()} />
          </StepCard>
        )}

        {/* ─── STEP 4: Floor Condition (lucide icons, no emojis) ─── */}
        {step === 4 && (
          <StepCard stepNum={4} totalSteps={totalSteps} title="What Condition Is Your Floor In?" subtitle="Select all that apply. This helps us prepare the right installation plan.">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {FLOOR_CONDITIONS.map(c => {
                const sel = data.floorConditions.includes(c.id);
                const Icon = CONDITION_ICONS[c.id] || Square;
                return (
                  <button key={c.id} onClick={() => {
                    update('floorConditions', sel ? data.floorConditions.filter(x => x !== c.id) : [...data.floorConditions, c.id]);
                  }} style={{
                    ...cardBtnStyle,
                    borderColor: sel ? LIME : '#e0e0e0',
                    background: sel ? '#f5ffe8' : '#fff'
                  }}>
                    <Icon size={24} color={sel ? LIME : '#888'} />
                    <span style={{ fontWeight: 600, fontSize: 14, color: CHARCOAL }}>{c.label}</span>
                    {sel && <Check size={18} color={LIME} />}
                  </button>
                );
              })}
            </div>
            <NavButtons step={step} setStep={setStep} canProceed={canProceed()} />
          </StepCard>
        )}

        {/* ─── STEP 5: Visualizer — taller upload + ColorSwatch + before/after template ─── */}
        {step === 5 && (
          <StepCard stepNum={5} totalSteps={totalSteps} title="Visualize Your New Floor" subtitle="Upload a photo of your garage floor, then pick a color to see your before & after.">
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload(e.target.files[0])} />

            {/* Taller rectangle upload box */}
            <button onClick={() => fileRef.current?.click()} style={{
              width: '100%', minHeight: 280, padding: '32px',
              border: `2px dashed ${data.photoUrl ? LIME : '#ccc'}`,
              borderRadius: 12, background: '#fff',
              cursor: 'pointer', marginBottom: 20,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12
            }}>
              {data.generating ? (
                <>
                  <Loader2 size={32} className="gf-spinner" color={LIME} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#666' }}>Generating your before & after…</span>
                </>
              ) : data.photoUrl ? (
                <>
                  <Image src={data.photoUrl} fittingType="fill" className="w-full h-48 rounded-lg" />
                  <span style={{ fontSize: 13, color: LIME, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check size={16} /> Photo uploaded — tap to change
                  </span>
                </>
              ) : (
                <>
                  <Camera size={40} color="#999" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#666' }}>Upload a photo of your garage floor</span>
                  <span style={{ fontSize: 12, color: '#999' }}>JPG, PNG, or WEBP — drag or tap to browse</span>
                </>
              )}
            </button>

            {/* Before/After — side-by-side template from the visualizer package */}
            {data.beforeUrl && data.afterUrl && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <Image src={data.beforeUrl} fittingType="fill" className="w-full h-80 object-cover" />
                  </div>
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <Image src={data.afterUrl} fittingType="fill" className="w-full h-80 object-cover" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: '0.16em', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>BEFORE</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: CHARCOAL }}>Original photo</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: '0.16em', color: LIME, textTransform: 'uppercase', fontWeight: 700 }}>AFTER</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: CHARCOAL }}>{data.flakeColor?.color_name || 'Selected color'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Color chart — exact swatches from the visualizer package (ColorSwatch with manufacturer photos) */}
            <div style={{ fontSize: 13, fontWeight: 700, color: CHARCOAL, marginBottom: 12 }}>
              Pick Your Color ({COATING_SYSTEMS.find(s => s.id === data.systemType)?.name || 'Full Chip'}):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
              {colors.map(c => (
                <button key={c.code} onClick={() => pickFlake(c)} style={{
                  border: `2px solid ${data.flakeColor?.code === c.code ? LIME : '#e0e0e0'}`,
                  borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#fff',
                  padding: 0, textAlign: 'left'
                }}>
                  <ColorSwatch color={c} system={data.systemType} className="h-20" />
                  <div style={{ padding: '6px 8px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: CHARCOAL, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.color_name}</div>
                    <div style={{ fontSize: 9, color: '#888' }}>{c.code}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Sheen selector — Matte / Satin / Gloss */}
            <div style={{ fontSize: 13, fontWeight: 700, color: CHARCOAL, marginBottom: 12, marginTop: 20 }}>
              Select Your Sheen:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              {SHEEN_OPTIONS.map(s => (
                <button key={s.id} onClick={() => pickSheen(s.id)} style={{
                  ...cardBtnStyle,
                  flexDirection: 'column', gap: 4, textAlign: 'center', padding: '14px',
                  borderColor: data.sheen === s.id ? LIME : '#e0e0e0',
                  background: data.sheen === s.id ? '#f5ffe8' : '#fff'
                }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: CHARCOAL }}>{s.name}</span>
                  <span style={{ fontSize: 11, color: '#888' }}>{s.desc}</span>
                </button>
              ))}
            </div>
            <NavButtons step={step} setStep={setStep} canProceed={canProceed()} />
          </StepCard>
        )}

        {/* ─── STEP 6: Contact Info ─── */}
        {step === 6 && (
          <StepCard stepNum={6} totalSteps={totalSteps} title="Almost There!" subtitle="Enter your contact info so we can look up your garage and email your estimate.">
            <input placeholder="Full Name" value={data.name} onChange={e => update('name', e.target.value)} style={inputStyle} />
            <input placeholder="Email Address" type="email" value={data.email} onChange={e => update('email', e.target.value)} style={inputStyle} />
            <input placeholder="Phone Number" type="tel" value={data.phone} onChange={e => update('phone', e.target.value)} style={inputStyle} />
            <div style={{ fontSize: 11, color: '#888', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={14} color={LIME} /> Your info is secure. We'll only use it to send your estimate.
            </div>
            <NavButtons step={step} setStep={setStep} canProceed={canProceed()} onNext={runScraperAndBid} nextLabel="Get My Estimate" />
          </StepCard>
        )}

        {/* ─── STEP 7: Scraper Progress ─── */}
        {step === 7 && <ScrapeProgress data={data} />}

        {/* ─── STEP 8: Results ─── */}
        {step === 8 && (
          <div style={{ padding: '40px 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 30 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: LIME, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Check size={40} color="#fff" />
              </div>
              <h1 style={{ fontSize: 36, fontWeight: 800, color: CHARCOAL, marginBottom: 8 }}>Your Estimate Is Ready!</h1>
              <p style={{ fontSize: 16, color: '#555' }}>Based on public records for {data.address}, {data.state} {data.zip}</p>
            </div>

            {/* Detected sq ft — white card with lime border */}
            <div style={{ border: `2px solid ${LIME}`, borderRadius: 8, padding: 28, marginBottom: 20, textAlign: 'center', background: '#fff' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: LIME, marginBottom: 10, fontWeight: 700 }}>Detected Garage Size</div>
              <div style={{ fontSize: 52, fontWeight: 800, color: CHARCOAL }}>{data.garageSqft}<span style={{ fontSize: 22, color: '#888' }}> sq ft</span></div>
              <div style={{ fontSize: 14, color: '#888', marginTop: 8 }}>Source: Public property records</div>
            </div>

            {/* Price range — white card with lime border */}
            <div style={{ border: `2px solid ${LIME}`, borderRadius: 8, padding: 28, marginBottom: 20, textAlign: 'center', background: '#fff' }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: LIME, marginBottom: 10, fontWeight: 700 }}>Estimated Price Range</div>
              <div style={{ fontSize: 44, fontWeight: 800, color: CHARCOAL }}>${data.lowEstimate} – ${data.highEstimate}</div>
              <div style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
                {COATING_SYSTEMS.find(s => s.id === data.systemType)?.name || 'Full Chip System'} in {data.flakeColor?.color_name || 'Tidal Wave'}
              </div>
            </div>

            {/* Before/After — side-by-side template */}
            {data.beforeUrl && data.afterUrl && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <Image src={data.beforeUrl} fittingType="fill" className="w-full h-80 object-cover" />
                  </div>
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <Image src={data.afterUrl} fittingType="fill" className="w-full h-80 object-cover" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: '0.16em', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>BEFORE</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: CHARCOAL }}>Original photo</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: '0.16em', color: LIME, textTransform: 'uppercase', fontWeight: 700 }}>AFTER</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: CHARCOAL }}>{data.flakeColor?.color_name || 'Selected color'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* 24-hour message — white card with lime accent */}
            <div style={{ border: `2px solid ${LIME}`, borderRadius: 8, padding: 28, textAlign: 'center', marginBottom: 20, background: '#fff' }}>
              <Clock size={36} color={LIME} style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 20, fontWeight: 700, color: CHARCOAL, marginBottom: 8 }}>A specialist will contact you within 24 hours.</div>
              <div style={{ fontSize: 14, color: '#888' }}>We've emailed your detailed bid to {data.email}</div>
            </div>

            {/* CTA */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="tel:9545550199" style={{ background: LIME, color: '#fff', padding: '16px 32px', borderRadius: 4, fontWeight: 700, fontSize: 16, textDecoration: 'none', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Phone size={18} /> Call Now: (954) 555-0199
              </a>
              <button onClick={() => setStep(0)} style={{ border: '2px solid #ddd', color: CHARCOAL, padding: '14px 32px', borderRadius: 4, fontWeight: 700, fontSize: 16, cursor: 'pointer', background: '#fff', fontFamily: 'inherit' }}>Start Over</button>
            </div>
          </div>
        )}
      </div>

      {/* ─── FOOTER — white ─── */}
      <footer style={{ background: '#f5f5f5', color: CHARCOAL, padding: '40px 24px', textAlign: 'center', borderTop: `1px solid #e0e0e0` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, background: LIME, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>X</div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>XPS CERTIFIED</div>
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>© 2026 XPS Certified. The Original One-Day Flooring Solution.</div>
      </footer>
    </div>
  );
}

// ─── Helper Components ───
const inputStyle = {
  width: '100%', padding: '14px 16px', border: '1px solid #ddd', borderRadius: 4,
  fontSize: 16, fontFamily: 'inherit', marginBottom: 12, outline: 'none', background: '#fff'
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
        <div style={{ background: LIME, color: '#fff', padding: '6px 14px', borderRadius: 4, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
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
        <button onClick={() => setStep(step - 1)} style={{ padding: '14px 24px', border: '1px solid #ddd', borderRadius: 4, background: '#fff', color: '#666', fontWeight: 600, cursor: 'pointer', fontSize: 15, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <ArrowLeft size={18} /> Back
        </button>
      )}
      {onNext ? (
        <button onClick={onNext} disabled={!canProceed} style={{
          flex: 1, padding: '14px 24px', border: 'none', borderRadius: 4,
          background: canProceed ? LIME : '#ccc', color: '#fff', fontWeight: 800, cursor: canProceed ? 'pointer' : 'not-allowed', fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}>
          {nextLabel || 'Continue'} <ArrowRight size={18} />
        </button>
      ) : (
        <button onClick={() => canProceed && setStep(step + 1)} disabled={!canProceed} style={{
          flex: 1, padding: '14px 24px', border: 'none', borderRadius: 4,
          background: canProceed ? LIME : '#ccc', color: '#fff', fontWeight: 800, cursor: canProceed ? 'pointer' : 'not-allowed', fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}>
          Continue <ArrowRight size={18} />
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
        <Loader2 size={80} className="gf-spinner" color={LIME} strokeWidth={3} style={{ position: 'absolute', top: 0, left: 0 }} />
        <Search size={28} color={LIME} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: '50%', padding: 4 }} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: LIME, marginBottom: 8 }}>Looking Up Your Garage</div>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: CHARCOAL, marginBottom: 8 }}>Analyzing Public Records…</h2>
      <p style={{ fontSize: 14, color: '#888', marginBottom: 30 }}>{data.address}, {data.state} {data.zip}</p>

      <div style={{ maxWidth: 400, margin: '0 auto', textAlign: 'left' }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', opacity: i <= progressStep ? 1 : 0.4 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',               background: '#fff', border: `2px solid ${i <= progressStep ? LIME : '#ddd'}` }}>
              {i < progressStep ? <Check size={12} color="#fff" /> : i === progressStep ? <div className="gf-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: LIME }} /> : null}
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