import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';

export default function NewInvoice() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({
    company_id: '', client_name: '', client_email: '', client_address: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    tax_rate: 0, discount: 0, notes: '', terms: 'Payment due within 30 days of issue date.'
  });
  const [lineItems, setLineItems] = useState([{ description: '', quantity: 1, rate: 0 }]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.entities.Company.list().then(setCompanies).catch(() => {});
  }, []);

  const updateForm = (key, val) => setForm({ ...form, [key]: val });

  const updateLineItem = (i, key, val) => {
    setLineItems(lineItems.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
  };

  const addLineItem = () => setLineItems([...lineItems, { description: '', quantity: 1, rate: 0 }]);
  const removeLineItem = (i) => setLineItems(lineItems.filter((_, idx) => idx !== i));

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.rate || 0), 0);
  const taxAmount = subtotal * (form.tax_rate / 100);
  const total = subtotal + taxAmount - (form.discount || 0);

  const selectCompany = (id) => {
    updateForm('company_id', id);
    const company = companies.find(c => c.id === id);
    if (company) {
      updateForm('client_name', company.name || '');
      updateForm('client_email', company.website ? '' : '');
    }
  };

  const create = async () => {
    setError('');
    if (!form.client_name) { setError('Client name is required'); return; }
    if (lineItems.some(i => !i.description)) { setError('All line items need a description'); return; }

    setCreating(true);
    try {
      const res = await fetch('/api/base44/functions/createInvoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, line_items: lineItems })
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setCreating(false); return; }
      navigate(`/app/books/invoices/${data.invoice_id}`);
    } catch (e) {
      setError(e.message); setCreating(false);
    }
  };

  const fmt = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Accounting</p>
          <h1>New Invoice</h1>
          <p>Create a client invoice with line items, tax, and payment terms.</p>
        </div>
      </div>

      {error && <div style={{ background: '#f5d8d5', color: '#a52d23', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Client Details</h3>
          {companies.length > 0 && (
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
              Select Existing Company (optional)
              <select value={form.company_id} onChange={e => selectCompany(e.target.value)} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}>
                <option value="">— Manual entry —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Client Name
              <input value={form.client_name} onChange={e => updateForm('client_name', e.target.value)} placeholder="Acme Corp" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Client Email
              <input value={form.client_email} onChange={e => updateForm('client_email', e.target.value)} placeholder="billing@acme.com" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, gridColumn: 'span 2' }}>Client Address
              <textarea value={form.client_address} onChange={e => updateForm('client_address', e.target.value)} placeholder="123 Main St, Suite 100, City, State 12345" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, minHeight: 50 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Issue Date
              <input type="date" value={form.issue_date} onChange={e => updateForm('issue_date', e.target.value)} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Due Date
              <input type="date" value={form.due_date} onChange={e => updateForm('due_date', e.target.value)} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            </label>
          </div>

          <h3 style={{ margin: '24px 0 12px', fontSize: 16 }}>Line Items</h3>
          {lineItems.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Description
                <input value={item.description} onChange={e => updateLineItem(i, 'description', e.target.value)} placeholder="Security audit — 40 hours" style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }} />
              </label>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Qty
                <input type="number" value={item.quantity} onChange={e => updateLineItem(i, 'quantity', parseFloat(e.target.value) || 0)} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }} />
              </label>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Rate
                <input type="number" step="0.01" value={item.rate} onChange={e => updateLineItem(i, 'rate', parseFloat(e.target.value) || 0)} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }} />
              </label>
              <label style={{ fontSize: 11, fontWeight: 600 }}>Amount
                <div style={{ padding: 8, fontSize: 12, fontWeight: 700 }}>{fmt((item.quantity || 0) * (item.rate || 0))}</div>
              </label>
              {lineItems.length > 1 && <button onClick={() => removeLineItem(i)} style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>✕</button>}
            </div>
          ))}
          <button onClick={addLineItem} style={{ marginTop: 8, padding: '8px 16px', border: '1px dashed #c9a66b', borderRadius: 6, background: '#fff', color: 'var(--gold)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>+ Add Line Item</button>

          <h3 style={{ margin: '24px 0 12px', fontSize: 16 }}>Additional</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Tax Rate (%)
              <input type="number" step="0.01" value={form.tax_rate} onChange={e => updateForm('tax_rate', parseFloat(e.target.value) || 0)} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Discount ($)
              <input type="number" step="0.01" value={form.discount} onChange={e => updateForm('discount', parseFloat(e.target.value) || 0)} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            </label>
          </div>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Notes
            <textarea value={form.notes} onChange={e => updateForm('notes', e.target.value)} placeholder="Thank you for your business." style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, minHeight: 50 }} />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Terms
            <input value={form.terms} onChange={e => updateForm('terms', e.target.value)} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
          </label>
        </div>

        <div>
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24, position: 'sticky', top: 90 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Summary</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 8 }}><span>Subtotal:</span><b>{fmt(subtotal)}</b></div>
              {form.tax_rate > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 8 }}><span>Tax ({form.tax_rate}%):</span><b>{fmt(taxAmount)}</b></div>}
              {form.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 8 }}><span>Discount:</span><b>-{fmt(form.discount)}</b></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, paddingTop: 8, borderTop: '2px solid #C89B3C' }}><span>Total:</span><b>{fmt(total)}</b></div>
            </div>
            <button onClick={create} disabled={creating} className="btn dark" style={{ width: '100%', marginTop: 20, opacity: creating ? 0.6 : 1 }}>
              {creating ? 'Creating…' : 'Create Invoice'}
            </button>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}