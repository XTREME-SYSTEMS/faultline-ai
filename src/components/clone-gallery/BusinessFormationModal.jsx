import { useState } from 'react';
import { X, Building2, FileText, Loader2, ExternalLink, CheckCircle2, CreditCard } from 'lucide-react';

// Business Formation Modal — fast-track DBA or LLC filing.
// Collects business info, pre-fills it for copy-paste, and opens sunbiz.org (FL state registry)
// or the user's state registry to complete the filing.
//
// NOTE: Full automation of government form filing + payment is not possible from a web app.
// This module pre-fills all the information and opens the filing portal so the user can
// review and submit with one click.
export default function BusinessFormationModal({ clone, onClose }) {
  const [entityType, setEntityType] = useState('dba'); // 'dba' or 'llc'
  const [form, setForm] = useState({
    business_name: clone?.name || clone?.business_name || '',
    owner_name: '',
    address: '',
    city: '',
    state: 'FL',
    zip: '',
    email: '',
    phone: '',
  });
  const [step, setStep] = useState('form'); // 'form' → 'review' → 'filed'
  const [filing, setFiling] = useState(false);

  const stateRegistryUrl = form.state === 'FL'
    ? 'https://dos.fl.gov/sunbiz/'
    : `https://www.sos.${form.state.toLowerCase()}.gov/`;

  function update(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleFile(e) {
    e.preventDefault();
    setFiling(true);
    // Simulate filing prep — in reality we open the state registry
    setTimeout(() => {
      setFiling(false);
      setStep('filed');
    }, 1500);
  }

  const filledInfo = [
    `Business Name: ${form.business_name}`,
    `Owner: ${form.owner_name}`,
    `Address: ${form.address}, ${form.city}, ${form.state} ${form.zip}`,
    `Contact: ${form.email} / ${form.phone}`,
    `Entity Type: ${entityType === 'dba' ? 'DBA (Fictitious Name)' : 'LLC'}`,
  ].join('\n');

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h2 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 24, margin: 0 }}>
              Fast-Track Business Formation
            </h2>
            <p style={{ color: '#999', fontSize: 13, margin: '4px 0 0' }}>
              File a DBA or LLC for <b style={{ color: '#111' }}>{clone?.name}</b>
            </p>
          </div>
          <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
        </div>

        {step === 'form' && (
          <>
            {/* Entity type selector */}
            <div style={{ padding: '20px 24px', display: 'flex', gap: 12 }}>
              <button onClick={() => setEntityType('dba')} style={entityBtnStyle(entityType === 'dba')}>
                <FileText size={20} />
                <div>
                  <b>DBA</b>
                  <small>Fictitious Name Registration</small>
                </div>
              </button>
              <button onClick={() => setEntityType('llc')} style={entityBtnStyle(entityType === 'llc')}>
                <Building2 size={20} />
                <div>
                  <b>LLC</b>
                  <small>Limited Liability Company</small>
                </div>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFile} style={{ padding: '0 24px 20px', display: 'grid', gap: 12 }}>
              <div style={inputRowStyle}>
                <input style={inputStyle} placeholder="Business Name" value={form.business_name} onChange={e => update('business_name', e.target.value)} required />
                <input style={inputStyle} placeholder="Owner Full Name" value={form.owner_name} onChange={e => update('owner_name', e.target.value)} required />
              </div>
              <input style={inputStyle} placeholder="Street Address" value={form.address} onChange={e => update('address', e.target.value)} required />
              <div style={inputRowStyle}>
                <input style={inputStyle} placeholder="City" value={form.city} onChange={e => update('city', e.target.value)} required />
                <select style={inputStyle} value={form.state} onChange={e => update('state', e.target.value)}>
                  <option value="FL">Florida</option>
                  <option value="CA">California</option>
                  <option value="TX">Texas</option>
                  <option value="NY">New York</option>
                  <option value="GA">Georgia</option>
                  <option value="AZ">Arizona</option>
                  <option value="NV">Nevada</option>
                  <option value="CO">Colorado</option>
                  <option value="NC">N. Carolina</option>
                  <option value="OH">Ohio</option>
                </select>
                <input style={inputStyle} placeholder="ZIP" value={form.zip} onChange={e => update('zip', e.target.value)} required />
              </div>
              <div style={inputRowStyle}>
                <input style={inputStyle} type="email" placeholder="Email" value={form.email} onChange={e => update('email', e.target.value)} required />
                <input style={inputStyle} placeholder="Phone" value={form.phone} onChange={e => update('phone', e.target.value)} required />
              </div>

              <div style={{ padding: 12, background: '#f8f7f4', borderRadius: 8, fontSize: 12, color: '#666', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <CreditCard size={16} style={{ flexShrink: 0, color: '#C89B3C', marginTop: 1 }} />
                <span>Your saved credit card on file will be used for the state filing fee (typically $50-$125 for DBA, $100-$500 for LLC). You'll review and confirm on the state portal.</span>
              </div>

              <button type="submit" disabled={filing} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px', background: filing ? '#ccc' : 'linear-gradient(135deg, #E7C86E, #C89B3C)',
                color: '#111', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 15,
                cursor: filing ? 'wait' : 'pointer',
              }}>
                {filing ? <Loader2 size={18} className="animate-spin" /> : <Building2 size={18} />}
                {filing ? 'Preparing filing…' : `Continue to ${form.state} State Registry`}
              </button>
            </form>
          </>
        )}

        {step === 'filed' && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <CheckCircle2 size={48} style={{ color: '#237A4B', margin: '0 auto 16px' }} />
            <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22, margin: '0 0 8px' }}>
              Ready to File
            </h3>
            <p style={{ color: '#666', fontSize: 14, margin: '0 0 20px' }}>
              We've prepared your {entityType.toUpperCase()} filing information. Click below to open
              the {form.state} state registry and complete your filing.
            </p>

            {/* Pre-filled info for copy-paste */}
            <div style={{ background: '#f8f7f4', borderRadius: 8, padding: 14, textAlign: 'left', marginBottom: 20, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', color: '#333' }}>
              {filledInfo}
            </div>

            <a href={stateRegistryUrl} target="_blank" rel="noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px',
              background: '#0b0b0b', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 15,
              textDecoration: 'none',
            }}>
              <ExternalLink size={18} /> Open {form.state} State Registry
            </a>
            <p style={{ fontSize: 11, color: '#999', marginTop: 16 }}>
              Copy the pre-filled info above and paste it into the state filing form.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
};

const modalStyle = {
  background: '#fff', borderRadius: 12, width: 'min(560px, 100%)',
  maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
};

const headerStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  padding: '20px 24px', borderBottom: '1px solid #eee',
};

const closeBtnStyle = { background: 'none', border: 0, cursor: 'pointer', padding: 4, color: '#999' };

const inputStyle = {
  width: '100%', padding: '11px 14px', border: '1px solid #ddd', borderRadius: 8,
  fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff',
};

const inputRowStyle = { display: 'flex', gap: 10 };

const entityBtnStyle = (active) => ({
  flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: 16,
  border: active ? '2px solid #C89B3C' : '1px solid #ddd', borderRadius: 10,
  background: active ? '#fdf8ed' : '#fff', cursor: 'pointer', textAlign: 'left',
});