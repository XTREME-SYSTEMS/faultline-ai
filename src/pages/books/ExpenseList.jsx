import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';

export default function ExpenseList() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0], vendor: '', description: '',
    category: 'other', amount: 0, payment_method: 'credit_card', notes: '', is_billable: false
  });

  useEffect(() => { loadExpenses(); }, []);

  const loadExpenses = async () => {
    try {
      const data = await base44.entities.Expense.list('-created_date', 100);
      setExpenses(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const create = async () => {
    if (!form.vendor || !form.amount) return;
    try {
      await base44.entities.Expense.create(form);
      setForm({ date: new Date().toISOString().split('T')[0], vendor: '', description: '', category: 'other', amount: 0, payment_method: 'credit_card', notes: '', is_billable: false });
      setShowForm(false);
      loadExpenses();
    } catch (e) { console.error(e); }
  };

  const fmt = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Accounting</p>
          <h1>Expenses</h1>
          <p>Track business expenses by category. {expenses.length} expenses totaling {fmt(total)}.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn dark">+ Record Expense</button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>New Expense</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Date
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Vendor
              <input value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} placeholder="Vendor name" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Amount
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Category
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}>
                {['office', 'software', 'marketing', 'travel', 'meals', 'contractors', 'utilities', 'rent', 'legal', 'insurance', 'other'].map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Payment Method
              <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}>
                {['cash', 'credit_card', 'bank_transfer', 'check', 'other'].map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Description
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What was this for?" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            </label>
          </div>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginTop: 12 }}>
            Notes
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
          </label>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button onClick={create} className="btn dark">Save Expense</button>
            <button onClick={() => setShowForm(false)} className="btn outline">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>Loading…</p>
      ) : expenses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, border: '1px solid #ddd', borderRadius: 8, background: '#fff' }}>
          <p style={{ color: '#999' }}>No expenses recorded yet.</p>
        </div>
      ) : (
        <div className="table" style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8 }}>
          <table>
            <thead><tr style={{ background: '#f8f7f4' }}><th>Date</th><th>Vendor</th><th>Description</th><th>Category</th><th>Method</th><th>Amount</th></tr></thead>
            <tbody>
              {expenses.map(exp => (
                <tr key={exp.id}>
                  <td>{exp.date}</td>
                  <td><b>{exp.vendor}</b></td>
                  <td>{exp.description || '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{exp.category}</td>
                  <td style={{ textTransform: 'capitalize' }}>{exp.payment_method?.replace('_', ' ')}</td>
                  <td><b>{fmt(exp.amount)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalShell>
  );
}