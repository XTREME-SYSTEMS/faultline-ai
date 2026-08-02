import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';

export default function ESignature() {
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDeliverable, setSelectedDeliverable] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Deliverable.filter({ deliverable_type: 'client_proposal' }, '-created_date', 50);
        setDeliverables(list);
      } catch (e) { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const send = async () => {
    if (!selectedDeliverable || !recipientEmail) return;
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke('sendForSignature', {
        deliverable_id: selectedDeliverable,
        recipient_email: recipientEmail,
        recipient_name: recipientName
      });
      const data = res.data || res;
      if (data.error) setError(data.error);
      else {
        setResult(data);
        if (data.signing_url) window.open(data.signing_url, '_blank');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <PortalShell><p style={{ padding: 28, color: '#888' }}>Loading…</p></PortalShell>;

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">E-Signature</p>
          <h1>DocuSign Integration</h1>
          <p>Send proposals and contracts for legally binding e-signature. Recipients sign via DocuSign — you get notified when complete.</p>
        </div>
      </div>

      {/* Send form */}
      <section className="finding" style={{ marginTop: 13 }}>
        <h2 style={{ fontSize: 18, marginBottom: 15 }}>Send Document for Signature</h2>
        <div style={{ display: 'grid', gap: 14, maxWidth: 600 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
            Select Proposal/Deliverable
            <select
              value={selectedDeliverable}
              onChange={e => setSelectedDeliverable(e.target.value)}
              style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 6, fontWeight: 400, background: '#fff' }}
            >
              <option value="">— Choose a deliverable —</option>
              {deliverables.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
              Recipient Email
              <input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 6, fontWeight: 400 }} placeholder="client@company.com" />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
              Recipient Name
              <input value={recipientName} onChange={e => setRecipientName(e.target.value)} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 6, fontWeight: 400 }} placeholder="John Smith" />
            </label>
          </div>
          <button className="btn dark" onClick={send} disabled={sending || !selectedDeliverable || !recipientEmail}>
            {sending ? '⏳ Sending via DocuSign…' : '✍️ Send for Signature'}
          </button>
        </div>
      </section>

      {error && (
        <section className="finding" style={{ marginTop: 13, borderColor: '#f5d8d5' }}>
          <p style={{ color: '#a52d23', fontSize: 14 }}>{error}</p>
          {error.includes('not connected') && (
            <p style={{ color: '#888', fontSize: 12, marginTop: 8 }}>DocuSign is not connected. Authorize the DocuSign connector to enable e-signature.</p>
          )}
        </section>
      )}

      {result && (
        <section className="finding" style={{ marginTop: 13, borderColor: '#c3e6cb', background: '#f0f9f3' }}>
          <h2 style={{ fontSize: 18, marginBottom: 10 }}>✓ Envelope Sent</h2>
          <p style={{ fontSize: 13 }}>Document sent to <b>{result.recipient}</b> for signature.</p>
          <p style={{ fontSize: 12, color: '#888', marginTop: 6 }}>Envelope ID: <code>{result.envelope_id}</code></p>
          {result.signing_url && (
            <a href={result.signing_url} target="_blank" rel="noopener noreferrer" className="btn dark" style={{ fontSize: 13, marginTop: 12, display: 'inline-block' }}>Open Signing URL →</a>
          )}
        </section>
      )}

      {/* Recent deliverables */}
      <section className="finding" style={{ marginTop: 13 }}>
        <h2 style={{ fontSize: 18, marginBottom: 15 }}>Available Documents</h2>
        {deliverables.length === 0 ? (
          <p style={{ color: '#888' }}>No proposals found. Generate a proposal from the Deliverable Studio first.</p>
        ) : (
          <div className="table">
            <table>
              <thead>
                <tr><th>Title</th><th>Type</th><th>Created</th><th>Action</th></tr>
              </thead>
              <tbody>
                {deliverables.map(d => (
                  <tr key={d.id}>
                    <td><b>{d.title}</b></td>
                    <td style={{ fontSize: 11 }}>{d.deliverable_type}</td>
                    <td style={{ fontSize: 11 }}>{new Date(d.created_date).toLocaleDateString()}</td>
                    <td><button className="btn outline" style={{ fontSize: 11, padding: '6px 12px' }} onClick={() => setSelectedDeliverable(d.id)}>Select</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PortalShell>
  );
}