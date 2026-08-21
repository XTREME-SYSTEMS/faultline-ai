import { useState } from 'react';
import { Rocket, CheckCircle2, ExternalLink, Globe } from 'lucide-react';
import { StepShell, StepNav } from './StepShell';

// ─── STEP 6: DOMAIN & LAUNCH ─────────────────────────────────────────
export function StepDomainLaunch({ onboarding, saving, onComplete, onBack }) {
  const [domain, setDomain] = useState(onboarding?.domain_name || '');
  const [launched, setLaunched] = useState(onboarding?.status === 'completed');
  const subdomain = (onboarding?.business_name || 'yourbusiness').toLowerCase().replace(/[^a-z0-9]/g, '');

  const launch = async () => {
    await onComplete({ domain_name: domain });
    setLaunched(true);
  };

  if (launched) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', maxWidth: 560, margin: '0 auto' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#237A4B', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
          <Rocket size={36} color="#fff" />
        </div>
        <h1 style={{ font: "400 36px 'Libre Caslon Display', serif", margin: '0 0 12px' }}>Your Website Is Live! 🎉</h1>
        <p style={{ fontSize: 15, color: '#666', marginBottom: 24 }}>Your {onboarding?.primary_service || 'epoxy'} website has been launched with your custom logo, brand pack, and content.</p>
        <div style={{ display: 'grid', gap: 10, textAlign: 'left', marginBottom: 28 }}>
          {[
            `Website live at ${domain || subdomain + '.faultline.app'}`,
            'Custom logo and brand colors applied',
            'AI-generated copy published',
            '24/7 monitoring and support included',
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fff', border: '1px solid #e5e1da', borderRadius: 8 }}>
              <CheckCircle2 size={18} color="#237A4B" />
              <span style={{ fontSize: 13 }}>{t}</span>
            </div>
          ))}
        </div>
        {onboarding?.selected_template_url && (
          <a href={onboarding.selected_template_url} target="_blank" rel="noopener noreferrer" className="btn dark" style={{ fontSize: 14, padding: '14px 28px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <ExternalLink size={16} /> View Your Website
          </a>
        )}
      </div>
    );
  }

  const summary = [
    ['Business', onboarding?.business_name],
    ['Service Area', onboarding?.service_area],
    ['Primary Service', onboarding?.primary_service],
    ['Logo', onboarding?.logo_url ? '✓ Selected' : 'Not set'],
    ['Brand Pack', onboarding?.selected_brand_pack?.name || onboarding?.brand_color],
    ['Template', onboarding?.selected_template_name],
    ['Brand Color', onboarding?.brand_color],
    ['Hero Headline', onboarding?.hero_headline],
  ].filter(([, v]) => v);

  return (
    <StepShell title="Domain & Launch" subtitle="Connect your domain and launch your website with everything we've built together.">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, maxWidth: 900 }}>
        {/* Left: Domain setup */}
        <div style={{ display: 'grid', gap: 18 }}>
          <Field label="Custom Domain">
            <input className="fl-input" value={domain} onChange={e => setDomain(e.target.value)} placeholder="mybusiness.com" />
          </Field>
          <div style={{ padding: 16, borderRadius: 8, background: '#f8f7f4', border: '1px solid #e5e1da' }}>
            <p style={{ fontSize: 12, color: '#666', margin: '0 0 8px' }}>No domain yet? Use our free subdomain:</p>
            <button onClick={() => setDomain(`${subdomain}.faultline.app`)} style={{ fontSize: 13, fontWeight: 600, color: '#C89B3C', border: '1px solid #C89B3C', borderRadius: 6, padding: '8px 16px', background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
              Use {subdomain}.faultline.app
            </button>
          </div>
          {domain && (
            <div style={{ padding: 16, borderRadius: 8, background: '#e6f4ec', border: '1px solid #bcd9c5', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Globe size={16} color="#237A4B" />
              <span style={{ fontSize: 13, color: '#237A4B', fontWeight: 600 }}>{domain}</span>
            </div>
          )}
        </div>

        {/* Right: Summary */}
        <div>
          <div style={{ border: '1px solid #e5e1da', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', background: '#f0ede7', fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.08em' }}>Your Setup Summary</div>
            {summary.map(([label, value], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < summary.length - 1 ? '1px solid #f0ede7' : 'none', background: '#fff' }}>
                <span style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'right', maxWidth: '65%' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={launch} disabled={!domain} saving={saving} nextLabel="🚀 Launch My Website" />
    </StepShell>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}