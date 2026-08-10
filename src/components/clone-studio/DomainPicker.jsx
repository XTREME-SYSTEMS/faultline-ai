import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Globe, Check, X, ArrowRight, ShoppingCart } from 'lucide-react';

export default function DomainPicker({ launchProjectId, businessName, industry, vercelUrl }) {
  const [phase, setPhase] = useState('idle'); // idle | searching | ready | assigning | assigned
  const [suggestions, setSuggestions] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [assignResult, setAssignResult] = useState(null);
  const [customDomain, setCustomDomain] = useState('');

  async function search() {
    setPhase('searching');
    setError('');
    setAssignResult(null);
    try {
      const res = await base44.functions.invoke('suggestDomains', {
        launch_project_id: launchProjectId,
        business_name: businessName,
        industry: industry
      });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setSuggestions(d.suggestions);
      setPhase('ready');
    } catch (e) {
      setError(e.message || 'Failed to search domains');
      setPhase('idle');
    }
  }

  async function assignDomain(domain) {
    setPhase('assigning');
    setError('');
    try {
      const res = await base44.functions.invoke('assignVercelDomain', {
        launch_project_id: launchProjectId,
        domain: domain
      });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setAssignResult(d);
      setPhase('assigned');
    } catch (e) {
      setError(e.message || 'Failed to assign domain');
      setPhase('ready');
    }
  }

  function handleAssignCustom() {
    if (!customDomain) return;
    assignDomain(customDomain.replace(/^https?:\/\//, '').replace(/\/$/, ''));
  }

  if (phase === 'idle') {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <Globe size={44} style={{ color: '#C89B3C', margin: '0 auto 14px', display: 'block' }} />
        <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22, margin: '0 0 8px' }}>Custom Domain</h3>
        <p style={{ color: '#666', fontSize: 13, margin: '0 auto 16px', maxWidth: 480 }}>
          Generate domain name suggestions, check availability, and assign a custom domain to your Vercel deployment.
        </p>
        <button onClick={search} style={{
          padding: '13px 26px', background: 'linear-gradient(135deg, #E7C86E, #C89B3C)',
          color: '#111', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>
          Search Available Domains →
        </button>
        {error && <p style={{ color: '#C63D34', fontSize: 13, marginTop: 14 }}>{error}</p>}
      </div>
    );
  }

  if (phase === 'searching') {
    return (
      <div style={{ textAlign: 'center', padding: 30 }}>
        <Loader2 size={36} className="animate-spin" style={{ color: '#C89B3C', margin: '0 auto 12px', display: 'block' }} />
        <p style={{ color: '#666', fontSize: 13 }}>Generating domain suggestions + checking availability…</p>
      </div>
    );
  }

  if (phase === 'assigned' && assignResult) {
    return (
      <div style={{ padding: 20, background: '#f0faf4', border: '1px solid #9ae6b4', borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Check size={20} style={{ color: '#237A4B' }} />
          <b style={{ fontSize: 15, color: '#237A4B' }}>Domain Assigned</b>
        </div>
        <p style={{ fontSize: 13, color: '#333', margin: '0 0 16px' }}>
          <b>{assignResult.domain}</b> has been linked to your Vercel project. Add the DNS verification record below at your domain registrar to go live.
        </p>
        {assignResult.verification?.verification_record && (
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <small style={{ color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em' }}>DNS Verification Record</small>
            <pre style={{ fontSize: 12, margin: '6px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#333' }}>
              {JSON.stringify(assignResult.verification.verification_record, null, 2)}
            </pre>
          </div>
        )}
        <p style={{ fontSize: 12, color: '#666', margin: '0 0 12px' }}>{assignResult.verification?.instructions}</p>
        <button onClick={() => { setPhase('idle'); setAssignResult(null); }} style={{
          padding: '10px 20px', background: '#fff', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, cursor: 'pointer',
        }}>
          ← Back to domain search
        </button>
      </div>
    );
  }

  // Ready — show suggestions
  const available = suggestions?.filter(s => s.available === true) || [];
  const unverified = suggestions?.filter(s => s.available === null) || [];
  const taken = suggestions?.filter(s => s.available === false) || [];

  return (
    <div>
      <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22, margin: '0 0 6px' }}>Domain Suggestions</h3>
      <p style={{ color: '#666', fontSize: 12, margin: '0 0 16px' }}>
        {suggestions?.length || 0} domain suggestions for <b>{businessName}</b>. Click "Assign" to link any domain to your Vercel deployment.
      </p>

      {/* Custom domain input */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, padding: 14, background: '#f8f7f4', borderRadius: 8 }}>
        <input
          type="text" value={customDomain} onChange={e => setCustomDomain(e.target.value)}
          placeholder="Or enter your own domain (e.g. mybrand.com)"
          style={{ flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
        />
        <button onClick={handleAssignCustom} disabled={!customDomain || phase === 'assigning'} style={{
          padding: '10px 18px', background: customDomain ? '#111' : '#ddd', color: '#fff', border: 0, borderRadius: 6,
          fontSize: 13, fontWeight: 700, cursor: customDomain ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {phase === 'assigning' ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
          Assign
        </button>
      </div>

      {phase === 'assigning' && (
        <div style={{ textAlign: 'center', padding: 20, color: '#666', fontSize: 13 }}>
          <Loader2 size={24} className="animate-spin" style={{ display: 'inline-block', marginRight: 8, color: '#C89B3C' }} />
          Assigning domain to Vercel project…
        </div>
      )}

      {error && <p style={{ color: '#C63D34', fontSize: 13, marginBottom: 14 }}>{error}</p>}

      {/* Available domains */}
      {available.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <small style={{ color: '#237A4B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>✓ Available</small>
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            {available.map(s => (
              <DomainRow key={s.domain} domain={s.domain} available={true} price={s.price} period={s.period}
                onAssign={() => assignDomain(s.domain)} disabled={phase === 'assigning'} />
            ))}
          </div>
        </div>
      )}

      {/* Unverified domains — availability couldn't be checked, but still assignable */}
      {unverified.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <small style={{ color: '#B88214', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Suggestions (verify availability at your registrar)</small>
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            {unverified.map(s => (
              <DomainRow key={s.domain} domain={s.domain} available={true} price={null}
                onAssign={() => assignDomain(s.domain)} disabled={phase === 'assigning'} />
            ))}
          </div>
        </div>
      )}

      {/* Taken domains */}
      {taken.length > 0 && (
        <div>
          <small style={{ color: '#999', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Unavailable</small>
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            {taken.map(s => (
              <DomainRow key={s.domain} domain={s.domain} available={false} />
            ))}
          </div>
        </div>
      )}

      <button onClick={() => setPhase('idle')} style={{
        marginTop: 20, padding: '8px 16px', background: 'none', border: 0, color: '#888', fontSize: 12, cursor: 'pointer',
      }}>← Back</button>
    </div>
  );
}

function DomainRow({ domain, available, price, period, onAssign, disabled }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 14px', border: '1px solid #eee', borderRadius: 8, background: '#fff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {available ? <Check size={16} style={{ color: '#237A4B' }} /> : <X size={16} style={{ color: '#C63D34' }} />}
        <b style={{ fontSize: 14 }}>{domain}</b>
        {available && price && (
          <span style={{ fontSize: 12, color: '#888' }}>${(price / 100).toFixed(2)}/{period || 1}yr</span>
        )}
      </div>
      {available && (
        <button onClick={onAssign} disabled={disabled} style={{
          padding: '7px 14px', background: disabled ? '#ddd' : '#111', color: '#fff', border: 0, borderRadius: 5,
          fontSize: 12, fontWeight: 700, cursor: disabled ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <ShoppingCart size={12} /> Assign
        </button>
      )}
    </div>
  );
}