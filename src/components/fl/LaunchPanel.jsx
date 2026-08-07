import { useState } from 'react';
import { base44 } from '@/api/base44Client';

const STEP_LABELS = {
  drive: { label: 'Google Drive Folder', icon: '📁', desc: 'Create a shared folder for project assets' },
  github: { label: 'GitHub Repo', icon: '🐙', desc: 'Create a private repo and push the website code' },
  supabase: { label: 'Supabase Project', icon: '🗄️', desc: 'Provision a new Supabase backend (DB + Auth)' },
  vercel: { label: 'Vercel Deploy', icon: '▲', desc: 'Create a Vercel project and deploy the live site' },
  domain: { label: 'Purchase Domain', icon: '🌐', desc: 'Buy a domain via Vercel registrar and attach it' }
};

export default function LaunchPanel({ websiteHtml, projectName }) {
  const [steps, setSteps] = useState({ drive: true, github: true, supabase: true, vercel: true, domain: false });
  const [domain, setDomain] = useState('');
  const [showContact, setShowContact] = useState(false);
  const [contact, setContact] = useState({ firstName: '', lastName: '', email: '', phone: '', address1: '', city: '', state: '', zip: '', country: 'US' });
  const [launching, setLaunching] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const toggle = (k) => setSteps(s => ({ ...s, [k]: !s[k] }));
  const updateContact = (k, v) => setContact(c => ({ ...c, [k]: v }));

  const launch = async () => {
    if (steps.domain && !domain.trim()) { setError('Enter a domain name to purchase'); return; }
    setLaunching(true);
    setError('');
    setResult(null);
    try {
      const response = await base44.functions.invoke('launchProject', {
        project_name: projectName || 'FaultLine Site',
        website_html: websiteHtml,
        domain_name: steps.domain ? domain.trim() : null,
        steps,
        contact_info: steps.domain ? contact : null
      });
      const data = response.data;
      if (data.error) { setError(data.error); setLaunching(false); return; }
      setResult(data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Launch failed. Check that GITHUB_TOKEN, SUPABASE_ACCESS_TOKEN, and VERCEL_TOKEN secrets are set.');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <section style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, marginBottom: 16, padding: 20 }}>
      <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>🚀 End-to-End Launch</h3>
      <p style={{ fontSize: 13, color: '#666', margin: '0 0 16px' }}>Provision every resource for this website in one click: a Google Drive folder, GitHub repo, Supabase backend, Vercel deployment, and an optional domain purchase — all wired together.</p>

      <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        {Object.entries(STEP_LABELS).map(([key, info]) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: `1px solid ${steps[key] ? '#C89B3C' : '#e5e1da'}`, borderRadius: 6, background: steps[key] ? '#C89B3C08' : '#fff', cursor: 'pointer' }}>
            <input type="checkbox" checked={steps[key]} onChange={() => toggle(key)} style={{ cursor: 'pointer', width: 18, height: 18 }} />
            <span style={{ fontSize: 20 }}>{info.icon}</span>
            <div style={{ flex: 1 }}>
              <b style={{ fontSize: 13, display: 'block' }}>{info.label}</b>
              <small style={{ fontSize: 11, color: '#888' }}>{info.desc}</small>
            </div>
          </label>
        ))}
      </div>

      {steps.domain && (
        <div style={{ marginBottom: 16, padding: 14, background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 6 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
            Domain to Purchase
            <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="mynewbusiness.com" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
          </label>
          <button onClick={() => setShowContact(!showContact)} style={{ background: 'none', border: 0, color: '#8A641C', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', padding: 0 }}>
            {showContact ? '▾' : '▸'} Registrant contact info (required for domain purchase)
          </button>
          {showContact && (
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['firstName', 'First Name'], ['lastName', 'Last Name'], ['email', 'Email'], ['phone', 'Phone'], ['address1', 'Address'], ['city', 'City'], ['state', 'State'], ['zip', 'ZIP'], ['country', 'Country Code']].map(([k, l]) => (
                <label key={k} style={{ display: 'grid', gap: 4, fontSize: 11, fontWeight: 700 }}>
                  {l}
                  <input value={contact[k]} onChange={e => updateContact(k, e.target.value)} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }} />
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <div style={{ background: '#f5d8d5', color: '#a52d23', padding: 12, borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{error}</div>}

      <button onClick={launch} disabled={launching} className="btn dark" style={{ width: '100%', padding: '15px', fontSize: 15, opacity: launching ? 0.6 : 1 }}>
        {launching ? '🚀 Launching… provisioning resources' : '🚀 Launch Everything End-to-End'}
      </button>
      {launching && <p style={{ textAlign: 'center', color: '#999', fontSize: 12, marginTop: 10 }}>Creating Drive folder, GitHub repo, Supabase project, Vercel deployment{steps.domain ? ', and purchasing domain' : ''}…</p>}

      {result && (
        <div style={{ marginTop: 16, padding: 16, background: result.status === 'success' ? '#f0f9f3' : '#fff8e8', border: `1px solid ${result.status === 'success' ? '#c8e6d0' : '#e8d9b0'}`, borderRadius: 6 }}>
          <b style={{ fontSize: 14 }}>{result.status === 'success' ? '✓ All resources launched!' : '⚠ Partial launch (some steps failed)'}</b>
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            {result.results.drive && (
              <div style={{ fontSize: 13 }}>
                <b>📁 Google Drive Folder</b> — <a href={result.results.drive.url} target="_blank" rel="noreferrer" style={{ color: '#237A4B' }}>Open folder ↗</a>
              </div>
            )}
            {result.results.github && (
              <div style={{ fontSize: 13 }}>
                <b>🐙 GitHub Repo</b> — <a href={result.results.github.url} target="_blank" rel="noreferrer" style={{ color: '#237A4B' }}>{result.results.github.name} ↗</a>
              </div>
            )}
            {result.results.supabase && (
              <div style={{ fontSize: 13 }}>
                <b>🗄️ Supabase Project</b> — <a href={result.results.supabase.url} target="_blank" rel="noreferrer" style={{ color: '#237A4B' }}>{result.results.supabase.ref} ↗</a>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>DB password: <code style={{ background: '#eee', padding: '1px 4px', borderRadius: 3 }}>{result.results.supabase.db_password}</code> (save this — shown once)</div>
              </div>
            )}
            {result.results.vercel && (
              <div style={{ fontSize: 13 }}>
                <b>▲ Vercel Deploy</b> {result.results.vercel.deploy?.url && <span>— <a href={result.results.vercel.deploy.url} target="_blank" rel="noreferrer" style={{ color: '#237A4B' }}>{result.results.vercel.deploy.url} ↗</a></span>}
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Project: {result.results.vercel.project.name} · Status: {result.results.vercel.deploy?.readyState || 'QUEUED'}</div>
              </div>
            )}
            {result.results.domain && (
              <div style={{ fontSize: 13 }}>
                <b>🌐 Domain</b> — {result.results.domain.name} {result.results.domain.attached ? '✓ purchased & attached' : '✓ purchased (attach pending)'}
              </div>
            )}
          </div>
          {result.errors && result.errors.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e8d9b0' }}>
              <b style={{ fontSize: 12, color: '#a52d23' }}>Failed steps:</b>
              {result.errors.map((e, i) => <div key={i} style={{ fontSize: 12, color: '#a52d23', marginTop: 4 }}>• {e.step}: {e.error}</div>)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}