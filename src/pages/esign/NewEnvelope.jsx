import { useState } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';

export default function NewEnvelope() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('html');
  const [docHtml, setDocHtml] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docName, setDocName] = useState('');
  const [recipients, setRecipients] = useState([{ email: '', name: '', role: 'signer' }]);
  const [fields, setFields] = useState([]);
  const [message, setMessage] = useState('');
  const [expiresDays, setExpiresDays] = useState(30);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const addRecipient = () => setRecipients([...recipients, { email: '', name: '', role: 'signer' }]);
  const removeRecipient = (i) => setRecipients(recipients.filter((_, idx) => idx !== i));
  const updateRecipient = (i, key, val) => setRecipients(recipients.map((r, idx) => idx === i ? { ...r, [key]: val } : r));

  const addField = (type) => {
    const firstSigner = recipients.find(r => r.role === 'signer');
    setFields([...fields, {
      type,
      recipient_email: firstSigner?.email || '',
      label: `${type}_${fields.length + 1}`,
      x: 10, y: 80, width: 25, height: 6, page: 1, required: true, value: ''
    }]);
  };

  const updateField = (i, key, val) => setFields(fields.map((f, idx) => idx === i ? { ...f, [key]: val } : f));
  const removeField = (i) => setFields(fields.filter((_, idx) => idx !== i));

  const send = async () => {
    setError('');
    if (!title) { setError('Title is required'); setStep(1); return; }
    if (docType === 'html' && !docHtml) { setError('Document content is required'); setStep(1); return; }
    if (docType !== 'html' && !docUrl) { setError('Document URL is required'); setStep(1); return; }
    if (recipients.some(r => !r.email)) { setError('All recipients need an email'); setStep(2); return; }

    setSending(true);
    try {
      const res = await fetch('/api/base44/functions/createSignatureEnvelope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          document_name: docName || title,
          document_html: docType === 'html' ? docHtml : null,
          document_url: docType !== 'html' ? docUrl : null,
          document_type: docType,
          recipients: recipients.filter(r => r.email),
          fields,
          message,
          expires_days: expiresDays
        })
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setSending(false); return; }
      navigate('/app/esign');
    } catch (e) {
      setError(e.message); setSending(false);
    }
  };

  const stepStyle = (n) => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
    borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
    background: step >= n ? '#0a0a0a' : '#f0ede5', color: step >= n ? '#fff' : '#666',
    border: '1px solid ' + (step >= n ? '#0a0a0a' : '#ddd')
  });

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">E-Signature</p>
          <h1>New Envelope</h1>
          <p>Create a document, add recipients, place signature fields, and send.</p>
        </div>
      </div>

      {error && <div style={{ background: '#f5d8d5', color: '#a52d23', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <div style={stepStyle(1)} onClick={() => setStep(1)}>1. Document</div>
        <div style={stepStyle(2)} onClick={() => setStep(2)}>2. Recipients</div>
        <div style={stepStyle(3)} onClick={() => setStep(3)}>3. Fields</div>
        <div style={stepStyle(4)} onClick={() => setStep(4)}>4. Review & Send</div>
      </div>

      {step === 1 && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
            Envelope Title
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Service Agreement — Acme Corp" style={{ padding: 12, border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }} />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
            Document Name
            <input value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. Service Agreement v2" style={{ padding: 12, border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }} />
          </label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['html', 'pdf', 'image'].map(t => (
              <button key={t} onClick={() => setDocType(t)} style={{
                padding: '8px 16px', borderRadius: 6, border: `1px solid ${docType === t ? '#0a0a0a' : '#ddd'}`,
                background: docType === t ? '#0a0a0a' : '#fff', color: docType === t ? '#fff' : '#666',
                cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', textTransform: 'uppercase'
              }}>{t}</button>
            ))}
          </div>
          {docType === 'html' ? (
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
              Document HTML Content
              <textarea value={docHtml} onChange={e => setDocHtml(e.target.value)} placeholder="<h1>Service Agreement</h1><p>This agreement...</p><p>Sign here: /s1/</p>" style={{ padding: 12, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'monospace', minHeight: 250 }} />
            </label>
          ) : (
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
              Document URL ({docType === 'pdf' ? 'PDF' : 'Image'} file URL)
              <input value={docUrl} onChange={e => setDocUrl(e.target.value)} placeholder="https://..." style={{ padding: 12, border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }} />
            </label>
          )}
          <div style={{ marginTop: 16 }}>
            <button onClick={() => setStep(2)} className="btn dark">Next: Recipients →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24 }}>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Add recipients who need to sign or receive a copy.</p>
          {recipients.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto', gap: 10, marginBottom: 10 }}>
              <input value={r.name} onChange={e => updateRecipient(i, 'name', e.target.value)} placeholder="Full name" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
              <input value={r.email} onChange={e => updateRecipient(i, 'email', e.target.value)} placeholder="Email address" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
              <select value={r.role} onChange={e => updateRecipient(i, 'role', e.target.value)} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}>
                <option value="signer">Signer</option>
                <option value="cc">CC (copy only)</option>
                <option value="witness">Witness</option>
              </select>
              {recipients.length > 1 && <button onClick={() => removeRecipient(i)} style={{ padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}>✕</button>}
            </div>
          ))}
          <button onClick={addRecipient} style={{ padding: '8px 16px', border: '1px dashed #c9a66b', borderRadius: 6, background: '#fff', color: 'var(--gold)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>+ Add Recipient</button>
          <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(1)} className="btn outline">← Back</button>
            <button onClick={() => setStep(3)} className="btn dark">Next: Fields →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24 }}>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Add signature fields. Position is relative (percentage of page width/height). Use anchor strings like /s1/ in your HTML for auto-placement.</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => addField('signature')} className="btn outline" style={{ fontSize: 12 }}>+ Signature</button>
            <button onClick={() => addField('initial')} className="btn outline" style={{ fontSize: 12 }}>+ Initial</button>
            <button onClick={() => addField('date')} className="btn outline" style={{ fontSize: 12 }}>+ Date</button>
            <button onClick={() => addField('text')} className="btn outline" style={{ fontSize: 12 }}>+ Text</button>
          </div>
          {fields.length === 0 ? (
            <p style={{ color: '#999', fontSize: 13, padding: 20, textAlign: 'center' }}>No fields added. Recipients can still sign anywhere on the document.</p>
          ) : (
            fields.map((f, i) => (
              <div key={i} style={{ border: '1px solid #eee', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <b style={{ fontSize: 13, textTransform: 'capitalize' }}>{f.type} Field</b>
                  <button onClick={() => removeField(i)} style={{ border: '0', background: 'none', color: '#c63d34', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 600 }}>Recipient
                    <select value={f.recipient_email} onChange={e => updateField(i, 'recipient_email', e.target.value)} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4, fontSize: 12, fontFamily: 'inherit' }}>
                      {recipients.filter(r => r.role !== 'cc' && r.email).map(r => <option key={r.email} value={r.email}>{r.name || r.email}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 11, fontWeight: 600 }}>X (%)
                    <input type="number" value={f.x} onChange={e => updateField(i, 'x', parseFloat(e.target.value))} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }} />
                  </label>
                  <label style={{ fontSize: 11, fontWeight: 600 }}>Y (%)
                    <input type="number" value={f.y} onChange={e => updateField(i, 'y', parseFloat(e.target.value))} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }} />
                  </label>
                  <label style={{ fontSize: 11, fontWeight: 600 }}>Width (%)
                    <input type="number" value={f.width} onChange={e => updateField(i, 'width', parseFloat(e.target.value))} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }} />
                  </label>
                  <label style={{ fontSize: 11, fontWeight: 600 }}>Height (%)
                    <input type="number" value={f.height} onChange={e => updateField(i, 'height', parseFloat(e.target.value))} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }} />
                  </label>
                </div>
              </div>
            ))
          )}
          <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(2)} className="btn outline">← Back</button>
            <button onClick={() => setStep(4)} className="btn dark">Next: Review →</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Review & Send</h3>
          <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 10 }}><b style={{ fontSize: 13 }}>Title:</b><span style={{ fontSize: 13 }}>{title || '—'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 10 }}><b style={{ fontSize: 13 }}>Document:</b><span style={{ fontSize: 13 }}>{docName || title} ({docType})</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 10 }}><b style={{ fontSize: 13 }}>Recipients:</b><span style={{ fontSize: 13 }}>{recipients.filter(r => r.email).length} recipient(s)</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 10 }}><b style={{ fontSize: 13 }}>Fields:</b><span style={{ fontSize: 13 }}>{fields.length} field(s)</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 10 }}><b style={{ fontSize: 13 }}>Expires in:</b><span style={{ fontSize: 13 }}>{expiresDays} days</span></div>
          </div>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
            Message to Recipients
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Please review and sign the attached document." style={{ padding: 12, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, minHeight: 80 }} />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 20 }}>
            Expires After (days)
            <input type="number" value={expiresDays} onChange={e => setExpiresDays(parseInt(e.target.value) || 30)} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 14, width: 120 }} />
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(3)} className="btn outline">← Back</button>
            <button onClick={send} disabled={sending} className="btn dark" style={{ opacity: sending ? 0.6 : 1 }}>
              {sending ? 'Sending…' : 'Send for Signature →'}
            </button>
          </div>
        </div>
      )}
    </PortalShell>
  );
}