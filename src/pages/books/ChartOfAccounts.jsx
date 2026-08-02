import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: 'asset', subtype: '', balance: 0, description: '' });

  useEffect(() => { loadAccounts(); }, []);

  const loadAccounts = async () => {
    try {
      const data = await base44.entities.LedgerAccount.list('code', 100);
      setAccounts(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const create = async () => {
    if (!form.code || !form.name) return;
    try {
      await base44.entities.LedgerAccount.create(form);
      setForm({ code: '', name: '', type: 'asset', subtype: '', balance: 0, description: '' });
      setShowForm(false);
      loadAccounts();
    } catch (e) { console.error(e); }
  };

  const fmt = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const typeColors = { asset: '#237A4B', liability: '#C63D34', equity: '#B88214', revenue: '#237A4B', expense: '#C63D34' };

  const grouped = ['asset', 'liability', 'equity', 'revenue', 'expense'].map(type => ({
    type, accounts: accounts.filter(a => a.type === type)
  }));

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Accounting</p>
          <h1>Chart of Accounts</h1>
          <p>Manage your ledger accounts — assets, liabilities, equity, revenue, and expenses.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn dark">+ New Account</button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>New Account</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Code
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="1000" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Name
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Cash" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Type
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}>
                {['asset', 'liability', 'equity', 'revenue', 'expense'].map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>Opening Balance
              <input type="number" step="0.01" value={form.balance} onChange={e => setForm({ ...form, balance: parseFloat(e.target.value) || 0 })} style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
            </label>
          </div>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginTop: 12 }}>Description
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional" style={{ padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
          </label>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button onClick={create} className="btn dark">Save Account</button>
            <button onClick={() => setShowForm(false)} className="btn outline">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>Loading…</p>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {grouped.map(group => (
            <div key={group.type} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, textTransform: 'capitalize', color: typeColors[group.type] }}>{group.type}s</h3>
              {group.accounts.length === 0 ? (
                <p style={{ color: '#999', fontSize: 13 }}>No {group.type} accounts.</p>
              ) : (
                <table>
                  <thead><tr><th>Code</th><th>Name</th><th>Subtype</th><th>Balance</th></tr></thead>
                  <tbody>
                    {group.accounts.map(a => (
                      <tr key={a.id}>
                        <td><b>{a.code}</b></td>
                        <td>{a.name}</td>
                        <td>{a.subtype || '—'}</td>
                        <td style={{ fontWeight: 700, color: typeColors[group.type] }}>{fmt(a.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}