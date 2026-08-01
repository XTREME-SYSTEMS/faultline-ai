import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function OutreachView() {
  const [drafts, setDrafts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null);
  const [result, setResult] = useState(null);

  const fetchDrafts = async () => {
    try {
      const [d, c] = await Promise.all([
        base44.entities.OutreachDraft.list('-created_date', 50),
        base44.entities.Company.list('-created_date', 100)
      ]);
      setDrafts(d); setCompanies(c); setLoading(false);
    } catch (e) { setLoading(false); }
  };

  useEffect(() => { fetchDrafts(); }, []);

  const companyFor = (draft) => companies.find(c => c.id === draft.company_id);

  const handleApprove = async (id) => {
    setActioning(id);
    try {
      await base44.entities.OutreachDraft.update(id, { approval_status: 'approved', send_status: 'approved_for_send' });
      await fetchDrafts();
      setResult({ type: 'success', msg: 'Draft approved for send.' });
    } catch (e) { setResult({ type: 'error', msg: e.message }); }
    setActioning(null);
  };

  const handleReject = async (id) => {
    setActioning(id);
    try {
      await base44.entities.OutreachDraft.update(id, { approval_status: 'rejected' });
      await fetchDrafts();
      setResult({ type: 'success', msg: 'Draft rejected.' });
    } catch (e) { setResult({ type: 'error', msg: e.message }); }
    setActioning(null);
  };

  const handleSend = async (draft) => {
    const company = companyFor(draft);
    const to = prompt(`Recipient email for ${company?.name || 'company'}:`, company?.domain ? `info@${company.domain}` : '');
    if (!to) return;
    setActioning(draft.id);
    try {
      const res = await base44.functions.invoke('sendApprovedOutreach', { draft_id: draft.id, to });
      setResult({ type: 'success', msg: `Sent to ${res.data?.sent_to || to}` });
      await fetchDrafts();
    } catch (e) { setResult({ type: 'error', msg: e.response?.data?.error || e.message }); }
    setActioning(null);
  };

  if (loading) return <p style={{ color: '#888' }}>Loading outreach drafts…</p>;

  return (
    <div>
      {result && (
        <div style={{ background: result.type === 'success' ? '#d4edda' : '#f5d8d5', color: result.type === 'success' ? '#155724' : '#a52d23', padding: '12px 16px', borderRadius: 6, marginBottom: 13, border: `1px solid ${result.type === 'success' ? '#c3e6cb' : '#e3b8b3'}` }}>
          {result.msg}
        </div>
      )}
      {drafts.length === 0 ? <p style={{ color: '#888' }}>No outreach drafts yet. They are generated from company findings.</p> : (
        drafts.map(d => {
          const company = companyFor(d);
          const approved = d.approval_status === 'approved';
          const canSend = approved && d.send_status === 'approved_for_send';
          return (
            <article key={d.id} style={{ background: '#fff', border: '1px solid #ddd', padding: 20, marginBottom: 13, borderRadius: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px' }}>{d.subject}</h3>
                  <small style={{ color: '#888' }}>To: {company?.name} · Approval: <span className={`pill ${approved ? 'medium' : 'high'}`}>{d.approval_status}</span> · Send: {d.send_status}</small>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!approved && d.approval_status !== 'rejected' && (
                    <>
                      <button className="btn gold" style={{ padding: '8px 14px', fontSize: 12 }} disabled={actioning === d.id} onClick={() => handleApprove(d.id)}>Approve</button>
                      <button className="btn outline" style={{ padding: '8px 14px', fontSize: 12 }} disabled={actioning === d.id} onClick={() => handleReject(d.id)}>Reject</button>
                    </>
                  )}
                  {canSend && <button className="btn dark" style={{ padding: '8px 14px', fontSize: 12 }} disabled={actioning === d.id} onClick={() => handleSend(d)}>{actioning === d.id ? '…' : 'Send'}</button>}
                </div>
              </div>
              <div style={{ background: '#f8f7f4', border: '1px solid #eee', padding: 14, borderRadius: 4, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{d.body}</div>
            </article>
          );
        })
      )}
    </div>
  );
}