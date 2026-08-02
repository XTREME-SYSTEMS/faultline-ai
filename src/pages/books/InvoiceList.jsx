import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadInvoices(); }, []);

  const loadInvoices = async () => {
    try {
      const data = await base44.entities.Invoice.list('-created_date', 100);
      setInvoices(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter);
  const fmt = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Accounting</p>
          <h1>Invoices</h1>
          <p>Create, send, and track client invoices.</p>
        </div>
        <Link to="/app/books/invoices/new" className="btn dark">+ New Invoice</Link>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['all', 'draft', 'sent', 'partial', 'paid', 'overdue', 'void'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 14px', borderRadius: 6, border: `1px solid ${filter === f ? '#0a0a0a' : '#ddd'}`,
            background: filter === f ? '#0a0a0a' : '#fff', color: filter === f ? '#fff' : '#666',
            cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', textTransform: 'capitalize'
          }}>{f}</button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, border: '1px solid #ddd', borderRadius: 8, background: '#fff' }}>
          <p style={{ color: '#999' }}>No invoices found. Create your first invoice.</p>
          <Link to="/app/books/invoices/new" className="btn dark" style={{ marginTop: 16, display: 'inline-flex' }}>+ New Invoice</Link>
        </div>
      ) : (
        <div className="table" style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8 }}>
          <table>
            <thead>
              <tr style={{ background: '#f8f7f4' }}>
                <th>Number</th><th>Client</th><th>Issue Date</th><th>Due Date</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id}>
                  <td><Link to={`/app/books/invoices/${inv.id}`} style={{ color: 'var(--gold)', fontWeight: 600 }}>{inv.invoice_number}</Link></td>
                  <td><b>{inv.client_name}</b><small>{inv.client_email}</small></td>
                  <td>{inv.issue_date}</td>
                  <td>{inv.due_date}</td>
                  <td><b>{fmt(inv.total)}</b></td>
                  <td>{fmt(inv.amount_paid)}</td>
                  <td style={{ color: inv.balance_due > 0 ? '#C63D34' : '#237A4B' }}>{fmt(inv.balance_due)}</td>
                  <td><span className={`pill ${inv.status === 'paid' ? '' : inv.status === 'overdue' ? 'critical' : inv.status === 'partial' ? 'medium' : 'high'}`} style={{ textTransform: 'capitalize' }}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalShell>
  );
}