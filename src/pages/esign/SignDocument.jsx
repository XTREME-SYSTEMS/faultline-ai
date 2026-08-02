import { useState, useEffect, useRef } from 'react';
import SignaturePad from '@/components/fl/SignaturePad';
import { base44 } from '@/api/base44Client';

// Public signing page — no auth required. Recipient accesses via unique signing token.
export default function SignDocument() {
  const token = window.location.pathname.split('/sign/')[1];
  const [envelope, setEnvelope] = useState(null);
  const [recipient, setRecipient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [signatureData, setSignatureData] = useState(null);
  const previewRef = useRef(null);

  useEffect(() => {
    loadEnvelope();
  }, []);

  const loadEnvelope = async () => {
    try {
      const res = await fetch('/api/base44/functions/getSignatureEnvelope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signing_token: token })
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setLoading(false); return; }
      setEnvelope(data.envelope);
      setRecipient(data.recipient);
    } catch (e) {
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!signatureData) { setError('Please draw your signature first'); return; }
    setSigning(true);
    setError('');
    try {
      const res = await fetch('/api/base44/functions/signEnvelope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signing_token: token,
          signature_data: signatureData,
          field_values: envelope.fields?.map(f => ({ label: f.label, recipient_email: f.recipient_email, value: signatureData }))
        })
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setSigning(false); return; }
      setSigned(true);
    } catch (e) {
      setError(e.message); setSigning(false);
    }
  };

  const handleDecline = async () => {
    setSigning(true);
    try {
      const res = await fetch('/api/base44/functions/signEnvelope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signing_token: token, action: 'decline', reason: declineReason })
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setSigning(false); return; }
      setSigned(true);
    } catch (e) {
      setError(e.message); setSigning(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f7f7f5' }}>
        <p style={{ color: '#999' }}>Loading document…</p>
      </div>
    );
  }

  if (error && !envelope) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f7f7f5' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <h1 style={{ font: '400 36px "Libre Caslon Display", serif', margin: '0 0 10px' }}>Link Invalid</h1>
          <p style={{ color: '#666' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f7f7f5' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, background: '#fff', border: '1px solid #ddd', borderRadius: 12, padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h1 style={{ font: '400 32px "Libre Caslon Display", serif', margin: '0 0 10px' }}>Thank You</h1>
          <p style={{ color: '#666' }}>Your signature has been recorded. You will receive a copy of the signed document via email.</p>
        </div>
      </div>
    );
  }

  if (recipient?.status === 'signed') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f7f7f5' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, background: '#fff', border: '1px solid #ddd', borderRadius: 12, padding: 40 }}>
          <h1 style={{ font: '400 32px "Libre Caslon Display", serif', margin: '0 0 10px' }}>Already Signed</h1>
          <p style={{ color: '#666' }}>You have already signed this document on {recipient.signed_at ? new Date(recipient.signed_at).toLocaleString() : ''}.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f5' }}>
      <header style={{ background: '#0a0a0a', color: '#fff', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <b style={{ font: '400 20px "Libre Caslon Display", serif' }}>FaultSign</b>
          <small style={{ marginLeft: 12, color: '#C89B3C', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em' }}>E-Signature</small>
        </div>
        <small style={{ color: '#999' }}>Signed by {recipient?.name || recipient?.email}</small>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <h1 style={{ font: '400 32px "Libre Caslon Display", serif', margin: '0 0 8px' }}>{envelope.title}</h1>
          <p style={{ color: '#666', fontSize: 14 }}>{envelope.message}</p>
          {envelope.expires_at && <p style={{ color: '#999', fontSize: 12, marginTop: 8 }}>Expires on {new Date(envelope.expires_at).toLocaleDateString()}</p>}
        </div>

        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Document</h3>
          <div ref={previewRef} style={{ border: '1px solid #eee', borderRadius: 8, minHeight: 300, maxHeight: 500, overflow: 'auto', padding: 20, background: '#faf9f7' }}>
            {envelope.document_type === 'html' ? (
              <div dangerouslySetInnerHTML={{ __html: envelope.document_html }} />
            ) : envelope.document_type === 'pdf' ? (
              <iframe src={envelope.document_url} style={{ width: '100%', height: 450, border: '0' }} title="Document" />
            ) : (
              <img src={envelope.document_url} alt="Document" style={{ width: '100%' }} />
            )}
          </div>
        </div>

        {error && <div style={{ background: '#f5d8d5', color: '#a52d23', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 12, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Sign Document</h3>
          <SignaturePad onSave={(data) => setSignatureData(data)} label="Draw your legal signature" />
          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <button onClick={handleSign} disabled={!signatureData || signing} style={{
              padding: '14px 28px', borderRadius: 8, border: '0', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
              background: signatureData && !signing ? '#0a0a0a' : '#ccc', color: '#fff', cursor: signatureData && !signing ? 'pointer' : 'not-allowed'
            }}>
              {signing ? 'Signing…' : 'Sign Document'}
            </button>
            <button onClick={() => setShowDecline(!showDecline)} style={{
              padding: '14px 28px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
              background: '#fff', color: '#C63D34', cursor: 'pointer'
            }}>Decline to Sign</button>
          </div>
          {showDecline && (
            <div style={{ marginTop: 16, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
                Reason for declining (optional)
                <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, minHeight: 60 }} />
              </label>
              <button onClick={handleDecline} disabled={signing} style={{ marginTop: 10, padding: '10px 20px', borderRadius: 6, border: '0', background: '#C63D34', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
                {signing ? 'Processing…' : 'Confirm Decline'}
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', color: '#999', fontSize: 11, marginTop: 20 }}>
          By signing, you agree this electronic signature is legally binding. Your signature, IP address, and timestamp are recorded in the audit trail.
        </p>
      </div>
    </div>
  );
}