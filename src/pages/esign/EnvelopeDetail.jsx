import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';
import { useParams, Link } from 'react-router-dom';

export default function EnvelopeDetail() {
  const { id } = useParams();
  const [envelope, setEnvelope] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSigned, setShowSigned] = useState(false);

  useEffect(() => {
    loadEnvelope();
  }, [id]);

  const loadEnvelope = async () => {
    try {
      const data = await base44.entities.SignatureEnvelope.get(id);
      setEnvelope(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (loading) return <PortalShell><p style={{ color: '#999' }}>Loading…</p></PortalShell>;
  if (!envelope) return <PortalShell><p>Envelope not found.</p></PortalShell>;

  const statusColors = { completed: '#237A4B', sent: '#B88214', viewed: '#B88214', declined: '#C63D34', draft: '#666', expired: '#C63D34' };

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">E-Signature</p>
          <h1>{envelope.title}</h1>
          <p>{envelope.document_name} · Created {new Date(envelope.created_date).toLocaleDateString()}</p>
        </div>
        <Link to="/app/esign" className="btn outline">← Back to Envelopes</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 20 }}>
        <div>
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Document Preview</h3>
              {envelope.status === 'completed' && envelope.signed_document_html && (
                <button onClick={() => setShowSigned(!showSigned)} className="btn outline" style={{ fontSize: 12, padding: '8px 14px' }}>
                  {showSigned ? 'View Original' : 'View Signed Copy'}
                </button>
              )}
            </div>
            <div style={{ border: '1px solid #eee', borderRadius: 8, minHeight: 400, maxHeight: 600, overflow: 'auto', padding: 20, background: '#faf9f7' }}>
              {envelope.document_type === 'html' ? (
                <div dangerouslySetInnerHTML={{ __html: showSigned ? envelope.signed_document_html : envelope.document_html }} />
              ) : envelope.document_type === 'pdf' ? (
                <iframe src={envelope.document_url} style={{ width: '100%', height: 500, border: '0' }} title="Document" />
              ) : (
                <img src={envelope.document_url} alt="Document" style={{ width: '100%' }} />
              )}
            </div>
          </div>

          {envelope.fields && envelope.fields.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Signature Fields</h3>
              <table>
                <thead><tr><th>Type</th><th>Recipient</th><th>Position</th><th>Status</th></tr></thead>
                <tbody>
                  {envelope.fields.map((f, i) => {
                    const recipient = envelope.recipients?.find(r => r.email === f.recipient_email);
                    return (
                      <tr key={i}>
                        <td style={{ textTransform: 'capitalize' }}>{f.type}</td>
                        <td>{recipient?.name || f.recipient_email}</td>
                        <td>X:{f.x}% Y:{f.y}%</td>
                        <td>{f.value ? <span style={{ color: '#237A4B' }}>✓ Filled</span> : <span style={{ color: '#999' }}>Pending</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Status</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'capitalize', background: statusColors[envelope.status] + '20', color: statusColors[envelope.status] }}>
                {envelope.status}
              </span>
              {envelope.expires_at && <small style={{ color: '#999' }}>Expires {new Date(envelope.expires_at).toLocaleDateString()}</small>}
            </div>
            {envelope.completed_at && <p style={{ fontSize: 12, color: '#237A4B' }}>✓ Completed on {new Date(envelope.completed_at).toLocaleString()}</p>}
          </div>

          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Recipients</h3>
            {envelope.recipients?.map((r, i) => (
              <div key={i} style={{ borderBottom: '1px solid #eee', paddingBottom: 10, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <b style={{ fontSize: 13 }}>{r.name || r.email}</b>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', color: '#999' }}>{r.role}</span>
                </div>
                <small style={{ color: '#666' }}>{r.email}</small>
                <div style={{ marginTop: 4 }}>
                  <span style={{ fontSize: 11, textTransform: 'capitalize', color: r.status === 'signed' ? '#237A4B' : r.status === 'declined' ? '#C63D34' : '#999' }}>
                    {r.status === 'signed' ? `✓ Signed ${r.signed_at ? new Date(r.signed_at).toLocaleDateString() : ''}` : r.status === 'viewed' ? '👁 Viewed' : r.status === 'declined' ? '✕ Declined' : '⏳ Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {envelope.audit_trail && envelope.audit_trail.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Audit Trail</h3>
              {envelope.audit_trail.map((event, i) => (
                <div key={i} style={{ borderBottom: '1px solid #eee', paddingBottom: 8, marginBottom: 8, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <b style={{ textTransform: 'capitalize', fontSize: 11 }}>{event.event.replace(/_/g, ' ')}</b>
                    <small style={{ color: '#999' }}>{new Date(event.timestamp).toLocaleString()}</small>
                  </div>
                  <small style={{ color: '#666' }}>{event.actor} — {event.details}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}