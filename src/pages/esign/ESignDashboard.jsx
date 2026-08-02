import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';

export default function ESignDashboard() {
  const [envelopes, setEnvelopes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadEnvelopes();
  }, []);

  const loadEnvelopes = async () => {
    try {
      const data = await base44.entities.SignatureEnvelope.list('-created_date', 50);
      setEnvelopes(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const stats = {
    total: envelopes.length,
    pending: envelopes.filter(e => e.status === 'sent' || e.status === 'viewed').length,
    completed: envelopes.filter(e => e.status === 'completed').length,
    declined: envelopes.filter(e => e.status === 'declined').length
  };

  const filtered = filter === 'all' ? envelopes : envelopes.filter(e => e.status === filter);

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">E-Signature</p>
          <h1>FaultSign</h1>
          <p>Send documents for legally binding e-signature. Track status, audit trails, and signed copies — all in-house.</p>
        </div>
        <Link to="/app/esign/new" className="btn dark">+ New Envelope</Link>
      </div>

      <div className="metrics">
        <article><span>Total Envelopes</span><b>{stats.total}</b><em>{stats.completed} completed</em></article>
        <article><span>Pending Signature</span><b>{stats.pending}</b><em>Awaiting signers</em></article>
        <article><span>Completed</span><b>{stats.completed}</b><em>Fully signed</em></article>
        <article><span>Declined</span><b>{stats.declined}</b><em>Needs follow-up</em></article>
      </div>

      <div style={{ marginTop: 25 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['all', 'sent', 'viewed', 'completed', 'declined'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '7px 14px', borderRadius: 6, border: `1px solid ${filter === f ? '#0a0a0a' : '#ddd'}`,
              background: filter === f ? '#0a0a0a' : '#fff', color: filter === f ? '#fff' : '#666',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', textTransform: 'capitalize'
            }}>{f}</button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>Loading envelopes…</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, border: '1px solid #ddd', borderRadius: 8, background: '#fff' }}>
            <p style={{ color: '#999', fontSize: 15 }}>No envelopes yet. Create your first signature request.</p>
            <Link to="/app/esign/new" className="btn dark" style={{ marginTop: 16, display: 'inline-flex' }}>+ New Envelope</Link>
          </div>
        ) : (
          <div className="table" style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8 }}>
            <table>
              <thead>
                <tr style={{ background: '#f8f7f4' }}>
                  <th>Title</th><th>Recipients</th><th>Status</th><th>Created</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(env => (
                  <tr key={env.id}>
                    <td><b>{env.title}</b><small>{env.document_name}</small></td>
                    <td>{env.recipients?.length || 0} recipient(s)<br /><small>{env.recipients?.filter(r => r.status === 'signed').length || 0} signed</small></td>
                    <td><span className={`pill ${env.status === 'completed' ? '' : env.status === 'declined' ? 'critical' : env.status === 'viewed' ? 'medium' : 'high'}`} style={{ textTransform: 'capitalize' }}>{env.status}</span></td>
                    <td>{new Date(env.created_date).toLocaleDateString()}</td>
                    <td><Link to={`/app/esign/${env.id}`} style={{ color: 'var(--gold)', fontWeight: 600, fontSize: 12 }}>View →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalShell>
  );
}