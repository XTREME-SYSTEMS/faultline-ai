import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';

export default function BooksDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const res = await fetch('/api/base44/functions/getFinancialSummary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!data.error) setSummary(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const s = summary?.summary || {};
  const fmt = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Accounting</p>
          <h1>FaultBooks</h1>
          <p>Track invoices, expenses, payments, and financial health — all in-house, no QuickBooks required.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/app/books/invoices/new" className="btn dark">+ New Invoice</Link>
          <Link to="/app/books/expenses" className="btn outline">Record Expense</Link>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>Loading financial data…</p>
      ) : (
        <>
          <div className="metrics">
            <article><span>Total Revenue</span><b style={{ fontSize: 22 }}>{fmt(s.total_revenue)}</b><em style={{ color: '#237A4B' }}>{s.paid_count} invoices paid</em></article>
            <article><span>Outstanding AR</span><b style={{ fontSize: 22 }}>{fmt(s.total_ar)}</b><em style={{ color: '#B88214' }}>{s.outstanding_count} pending</em></article>
            <article><span>Overdue</span><b style={{ fontSize: 22, color: s.total_overdue > 0 ? '#C63D34' : '#0a0a0a' }}>{fmt(s.total_overdue)}</b><em style={{ color: '#C63D34' }}>{s.overdue_count} overdue</em></article>
            <article><span>Total Expenses</span><b style={{ fontSize: 22 }}>{fmt(s.total_expenses)}</b><em>{s.expense_count} expenses</em></article>
            <article><span>Net Income</span><b style={{ fontSize: 22, color: s.net_income >= 0 ? '#237A4B' : '#C63D34' }}>{fmt(s.net_income)}</b><em>{s.profit_margin?.toFixed(1)}% margin</em></article>
            <article><span>Profit Margin</span><b style={{ fontSize: 22 }}>{s.profit_margin?.toFixed(1)}%</b><em>{s.profit_margin >= 20 ? 'Healthy' : s.profit_margin >= 10 ? 'OK' : 'Watch'}</em></article>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>AR Aging</h3>
              {summary?.ar_aging && (
                <div style={{ display: 'grid', gap: 10 }}>
                  {[
                    ['Current', summary.ar_aging.current, '#237A4B'],
                    ['1-30 days', summary.ar_aging['1_30'], '#B88214'],
                    ['31-60 days', summary.ar_aging['31_60'], '#B88214'],
                    ['61-90 days', summary.ar_aging['61_90'], '#C63D34'],
                    ['90+ days', summary.ar_aging['90_plus'], '#C63D34']
                  ].map(([label, amount, color]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: 8 }}>
                      <span style={{ fontSize: 13, color }}>{label}</span>
                      <b style={{ fontSize: 14 }}>{fmt(amount)}</b>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Expenses by Category</h3>
              {summary?.expenses_by_category && Object.keys(summary.expenses_by_category).length > 0 ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {Object.entries(summary.expenses_by_category).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 6 }}>
                      <span style={{ fontSize: 13, textTransform: 'capitalize' }}>{cat}</span>
                      <b style={{ fontSize: 13 }}>{fmt(amount)}</b>
                    </div>
                  ))}
                </div>
              ) : <p style={{ color: '#999', fontSize: 13 }}>No expenses recorded yet.</p>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>Recent Invoices</h3>
                <Link to="/app/books/invoices" style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 600 }}>View all →</Link>
              </div>
              {summary?.recent_invoices?.length > 0 ? (
                <table>
                  <thead><tr><th>Number</th><th>Client</th><th>Total</th><th>Status</th></tr></thead>
                  <tbody>
                    {summary.recent_invoices.slice(0, 5).map(inv => (
                      <tr key={inv.id}>
                        <td><Link to={`/app/books/invoices/${inv.id}`} style={{ color: 'var(--gold)', fontWeight: 600 }}>{inv.number}</Link></td>
                        <td>{inv.client}</td>
                        <td>{fmt(inv.total)}</td>
                        <td><span className="pill" style={{ textTransform: 'capitalize' }}>{inv.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p style={{ color: '#999', fontSize: 13 }}>No invoices yet.</p>}
            </div>

            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>Recent Expenses</h3>
                <Link to="/app/books/expenses" style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 600 }}>View all →</Link>
              </div>
              {summary?.recent_expenses?.length > 0 ? (
                <table>
                  <thead><tr><th>Date</th><th>Vendor</th><th>Category</th><th>Amount</th></tr></thead>
                  <tbody>
                    {summary.recent_expenses.slice(0, 5).map(exp => (
                      <tr key={exp.id}>
                        <td>{exp.date}</td>
                        <td>{exp.vendor}</td>
                        <td style={{ textTransform: 'capitalize' }}>{exp.category}</td>
                        <td>{fmt(exp.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p style={{ color: '#999', fontSize: 13 }}>No expenses yet.</p>}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20, marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>6-Month Trend</h3>
              <Link to="/app/books/reports" style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 600 }}>Full reports →</Link>
            </div>
            {summary?.monthly_trend && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
                {summary.monthly_trend.map((m, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
                    <b style={{ display: 'block', fontSize: 13 }}>{m.month}</b>
                    <small style={{ color: '#237A4B', display: 'block', marginTop: 4 }}>Rev: {fmt(m.revenue)}</small>
                    <small style={{ color: '#C63D34' }}>Exp: {fmt(m.expenses)}</small>
                    <b style={{ display: 'block', marginTop: 6, fontSize: 12, color: m.net >= 0 ? '#237A4B' : '#C63D34' }}>Net: {fmt(m.net)}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </PortalShell>
  );
}