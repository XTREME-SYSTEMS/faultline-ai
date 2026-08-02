import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';
import { useParams, Link } from 'react-router-dom';

export default function InvoiceDetail() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [payment, setPayment] = useState({ amount: 0, date: new Date().toISOString().split('T')[0], method: 'bank_transfer', reference: '' });
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { loadInvoice(); }, [id]);

  const loadInvoice = async () => {
    try {
      const data = await base44.entities.Invoice.get(id);
      setInvoice(data);
      setPayment(p => ({ ...p, amount: data?.balance_due || 0 }));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const sendInvoice = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/base44/functions/sendInvoice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: id })
      });
      const data = await res.json();
      if (data.error) { setMessage(data.error); } else { setMessage('Invoice sent to ' + invoice.client_email); loadInvoice(); }
    } catch (e) { setMessage(e.message); } finally { setSending(false); }
  };

  const recordPayment = async () => {
    setRecording(true);
    try {
      const res = await fetch('/api/base44/functions/recordInvoicePayment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: id, ...payment })
      });
      const data = await res.json();
      if (data.error) { setMessage(data.error); } else { setMessage(data.message); setShowPayment(false); loadInvoice(); }
    } catch (e) { setMessage(e.message); } finally { setRecording(false); }
  };

  if (loading) return <PortalShell><p style={{ color: '#999' }}>Loading…</p></PortalShell>;
  if (!invoice) return <PortalShell><p>Invoice not found.</p></PortalShell>;

  const fmt = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const statusColors = { paid: '#237A4B', sent: '#B88214', partial: '#B88214', overdue: '#C63D34', draft: '#666', void: '#999' };

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Accounting</p>
          <h1>{invoice.invoice_number}</h1>
          <p>{invoice.client_name} · Issued {invoice.issue_date} · Due {invoice.due_date}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/app/books/invoices" className="btn outline">← Back</Link>
          {invoice.status === 'draft' && <button onClick={sendInvoice} disabled={sending} className="btn dark">{sending ? 'Sending…' : 'Send Invoice'}</button>}
          {invoice.status !== 'paid' && invoice.status !== 'void' && <button onClick={() => setShowPayment(!showPayment)} className="btn gold">Record Payment</button>}
        </div>
      </div>

      {message && <div style={{ background: '#e8f5e9', color: '#237A4B', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #C89B3C', paddingBottom: 16, marginBottom: 20 }}>
            <div><h1 style={{ margin: 0, fontSize: 28, font: '400 28px "Libre Caslon Display", serif' }}>INVOICE</h1><p style={{ color: '#666', margin: '4px 0 0' }}>{invoice.invoice_number}</p></div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 14 }}>Issue: {invoice.issue_date}</p>
              <p style={{ margin: '4px 0 0', fontSize: 14 }}>Due: <strong>{invoice.due_date}</strong></p>
              <span style={{ display: 'inline-block', marginTop: 8, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'capitalize', background: statusColors[invoice.status] + '20', color: statusColors[invoice.status] }}>{invoice.status}</span>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 13, textTransform: 'uppercase', color: '#999' }}>Bill To</h3>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{invoice.client_name}</p>
            {invoice.client_email && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>{invoice.client_email}</p>}
            {invoice.client_address && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666', whiteSpace: 'pre-line' }}>{invoice.client_address}</p>}
          </div>

          <table>
            <thead><tr style={{ background: '#f8f7f4' }}><th>Description</th><th style={{ textAlign: 'center' }}>Qty</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
            <tbody>
              {invoice.line_items?.map((item, i) => (
                <tr key={i}>
                  <td>{item.description}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(item.rate)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginLeft: 'auto', width: 280, marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}><span>Subtotal:</span><span>{fmt(invoice.subtotal)}</span></div>
            {invoice.tax_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}><span>Tax ({invoice.tax_rate}%):</span><span>{fmt(invoice.tax_amount)}</span></div>}
            {invoice.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}><span>Discount:</span><span>-{fmt(invoice.discount)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid #C89B3C', fontSize: 18, fontWeight: 700 }}><span>Total:</span><span>{fmt(invoice.total)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#237A4B' }}><span>Paid:</span><span>{fmt(invoice.amount_paid)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: invoice.balance_due > 0 ? '#C63D34' : '#237A4B', fontWeight: 700 }}><span>Balance Due:</span><span>{fmt(invoice.balance_due)}</span></div>
          </div>

          {invoice.notes && <div style={{ marginTop: 20, padding: 15, background: '#f8f7f4', borderRadius: 8 }}><strong>Notes:</strong><br />{invoice.notes}</div>}
          {invoice.terms && <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}><strong>Terms:</strong> {invoice.terms}</div>}
        </div>

        <div>
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Payment History</h3>
            {invoice.payments && invoice.payments.length > 0 ? (
              invoice.payments.map((p, i) => (
                <div key={i} style={{ borderBottom: '1px solid #eee', paddingBottom: 10, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <b style={{ fontSize: 14, color: '#237A4B' }}>{fmt(p.amount)}</b>
                    <small style={{ color: '#999' }}>{p.date}</small>
                  </div>
                  <small style={{ color: '#666', textTransform: 'capitalize' }}>{p.method}{p.reference ? ` · ${p.reference}` : ''}</small>
                </div>
              ))
            ) : <p style={{ color: '#999', fontSize: 13 }}>No payments recorded.</p>}
          </div>

          {showPayment && (
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Record Payment</h3>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Amount
                <input type="number" step="0.01" value={payment.amount} onChange={e => setPayment({ ...payment, amount: parseFloat(e.target.value) || 0 })} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Date
                <input type="date" value={payment.date} onChange={e => setPayment({ ...payment, date: e.target.value })} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Method
                <select value={payment.method} onChange={e => setPayment({ ...payment, method: e.target.value })} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="stripe">Stripe</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>Reference (optional)
                <input value={payment.reference} onChange={e => setPayment({ ...payment, reference: e.target.value })} placeholder="Check #, transaction ID" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
              </label>
              <button onClick={recordPayment} disabled={recording} className="btn dark" style={{ width: '100%' }}>{recording ? 'Recording…' : 'Record Payment'}</button>
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}