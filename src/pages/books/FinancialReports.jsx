import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';

export default function FinancialReports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState('pnl');

  useEffect(() => { loadSummary(); }, []);

  const loadSummary = async () => {
    try {
      const res = await fetch('/api/base44/functions/getFinancialSummary', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({})
      });
      const data = await res.json();
      if (!data.error) setSummary(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fmt = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const s = summary?.summary || {};

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Accounting</p>
          <h1>Financial Reports</h1>
          <p>Profit & Loss, cash flow, AR aging, and expense breakdowns.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['pnl', 'ar_aging', 'expenses', 'trend', 'clients'].map(r => (
          <button key={r} onClick={() => setReport(r)} style={{
            padding: '8px 16px', borderRadius: 6, border: `1px solid ${report === r ? '#0a0a0a' : '#ddd'}`,
            background: report === r ? '#0a0a0a' : '#fff', color: report === r ? '#fff' : '#666',
            cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', textTransform: 'capitalize'
          }}>{r.replace('_', ' ')}</button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>Loading reports…</p>
      ) : (
        <>
          {report === 'pnl' && (
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24, maxWidth: 600 }}>
              <h2 style={{ margin: '0 0 20px', font: '400 28px "Libre Caslon Display", serif' }}>Profit & Loss Statement</h2>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 10 }}><b>Revenue (Paid Invoices)</b><b style={{ color: '#237A4B' }}>{fmt(s.total_revenue)}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 10 }}><span>Total Expenses</span><span style={{ color: '#C63D34' }}>{fmt(s.total_expenses)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #C89B3C', paddingBottom: 10, fontSize: 18 }}><b>Net Income</b><b style={{ color: s.net_income >= 0 ? '#237A4B' : '#C63D34' }}>{fmt(s.net_income)}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Profit Margin</span><b>{s.profit_margin?.toFixed(1)}%</b></div>
              </div>
            </div>
          )}

          {report === 'ar_aging' && summary?.ar_aging && (
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24, maxWidth: 600 }}>
              <h2 style={{ margin: '0 0 20px', font: '400 28px "Libre Caslon Display", serif' }}>Accounts Receivable Aging</h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  ['Current (not yet due)', summary.ar_aging.current, '#237A4B'],
                  ['1-30 days overdue', summary.ar_aging['1_30'], '#B88214'],
                  ['31-60 days overdue', summary.ar_aging['31_60'], '#B88214'],
                  ['61-90 days overdue', summary.ar_aging['61_90'], '#C63D34'],
                  ['90+ days overdue', summary.ar_aging['90_plus'], '#C63D34']
                ].map(([label, amount, color]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 10 }}>
                    <span style={{ color }}>{label}</span><b>{fmt(amount)}</b>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, paddingTop: 8, borderTop: '2px solid #C89B3C' }}>
                  <span>Total Outstanding</span><span>{fmt(s.total_ar)}</span>
                </div>
              </div>
            </div>
          )}

          {report === 'expenses' && summary?.expenses_by_category && (
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24, maxWidth: 600 }}>
              <h2 style={{ margin: '0 0 20px', font: '400 28px "Libre Caslon Display", serif' }}>Expense Breakdown by Category</h2>
              {Object.keys(summary.expenses_by_category).length === 0 ? (
                <p style={{ color: '#999' }}>No expenses recorded.</p>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {Object.entries(summary.expenses_by_category).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => {
                    const pct = s.total_expenses > 0 ? (amount / s.total_expenses) * 100 : 0;
                    return (
                      <div key={cat}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ textTransform: 'capitalize', fontSize: 13 }}>{cat}</span>
                          <b style={{ fontSize: 13 }}>{fmt(amount)} ({pct.toFixed(1)}%)</b>
                        </div>
                        <div style={{ height: 8, background: '#f0ede5', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gold)', borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, paddingTop: 8, borderTop: '2px solid #C89B3C' }}>
                    <span>Total Expenses</span><span>{fmt(s.total_expenses)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {report === 'trend' && summary?.monthly_trend && (
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24 }}>
              <h2 style={{ margin: '0 0 20px', font: '400 28px "Libre Caslon Display", serif' }}>6-Month Cash Flow Trend</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
                {summary.monthly_trend.map((m, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
                    <b style={{ display: 'block', fontSize: 14, marginBottom: 8 }}>{m.month}</b>
                    <div style={{ display: 'grid', gap: 6, fontSize: 11 }}>
                      <div><span style={{ color: '#999' }}>Rev</span><br /><b style={{ color: '#237A4B' }}>{fmt(m.revenue)}</b></div>
                      <div><span style={{ color: '#999' }}>Exp</span><br /><b style={{ color: '#C63D34' }}>{fmt(m.expenses)}</b></div>
                      <div style={{ borderTop: '1px solid #eee', paddingTop: 6, marginTop: 4 }}><span style={{ color: '#999' }}>Net</span><br /><b style={{ color: m.net >= 0 ? '#237A4B' : '#C63D34' }}>{fmt(m.net)}</b></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report === 'clients' && summary?.top_clients && (
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24, maxWidth: 600 }}>
              <h2 style={{ margin: '0 0 20px', font: '400 28px "Libre Caslon Display", serif' }}>Top Clients by Revenue</h2>
              {summary.top_clients.length === 0 ? (
                <p style={{ color: '#999' }}>No paid invoices yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {summary.top_clients.map((c, i) => (
                    <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: 10 }}>
                      <span><b style={{ color: 'var(--gold)', marginRight: 8 }}>#{i + 1}</b>{c.name}</span>
                      <b style={{ color: '#237A4B' }}>{fmt(c.revenue)}</b>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </PortalShell>
  );
}