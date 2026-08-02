import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';

export default function FinancialSync() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const sync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('syncQuickBooks', {});
      const result = res.data || res;
      if (result.error) setError(result.error);
      else setData(result);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { sync(); }, []);

  if (loading && !data) return <PortalShell><p style={{ padding: 28, color: '#888' }}>Loading QuickBooks data…</p></PortalShell>;

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Financial Integration</p>
          <h1>QuickBooks Sync</h1>
          <p>Cross-reference your QuickBooks customers and invoices with FaultLine AI audit findings. See who owes you money and who has security gaps.</p>
        </div>
        <button className="btn dark" onClick={sync} disabled={syncing}>
          {syncing ? '⏳ Syncing…' : '▶ Sync Now'}
        </button>
      </div>

      {error && (
        <section className="finding" style={{ marginTop: 13, borderColor: '#f5d8d5' }}>
          <p style={{ color: '#a52d23', fontSize: 14 }}>{error}</p>
          <p style={{ color: '#888', fontSize: 12, marginTop: 8 }}>
            {error.includes('not connected') || error.includes('QuickBooks')
              ? 'QuickBooks is not connected. Authorize the QuickBooks connector from the Command Center to enable financial sync.'
              : 'An error occurred during sync. Try again or check the QuickBooks connection.'}
          </p>
        </section>
      )}

      {data?.summary && (
        <>
          <div className="metrics" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <article>
              <small>QuickBooks Customers</small>
              <b>{data.summary.total_customers}</b>
              <span>synced</span>
            </article>
            <article>
              <small>Total Invoices</small>
              <b>{data.summary.total_invoices}</b>
              <span>synced</span>
            </article>
            <article style={{ borderTop: '3px solid #C63D34' }}>
              <small>Outstanding</small>
              <b style={{ color: '#C63D34' }}>${data.summary.total_outstanding?.toFixed(0)?.toLocaleString()}</b>
              <span>unpaid balance</span>
            </article>
            <article style={{ borderTop: '3px solid #237A4B' }}>
              <small>Paid</small>
              <b style={{ color: '#237A4B' }}>${data.summary.total_paid?.toFixed(0)?.toLocaleString()}</b>
              <span>collected</span>
            </article>
          </div>

          {/* Customer cross-reference */}
          <section className="finding" style={{ marginTop: 13 }}>
            <h2 style={{ fontSize: 18, marginBottom: 15 }}>Customer Cross-Reference</h2>
            <div className="table">
              <table>
                <thead>
                  <tr><th>QuickBooks Customer</th><th>Email</th><th>Balance</th><th>FaultLine Match</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {data.customers?.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888' }}>No customers found in QuickBooks.</td></tr>
                  ) : (
                    data.customers?.map(c => (
                      <tr key={c.quickbooks_id}>
                        <td><b>{c.name}</b></td>
                        <td style={{ fontSize: 12 }}>{c.email || '—'}</td>
                        <td>${parseFloat(c.balance || 0).toFixed(2)}</td>
                        <td>{c.faultline_company_name ? <b style={{ color: '#237A4B' }}>{c.faultline_company_name}</b> : <span style={{ color: '#888' }}>No match</span>}</td>
                        <td>
                          {c.faultline_company_id
                            ? <span className="pill medium">Linked</span>
                            : <span className="pill high">Unlinked</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recent invoices */}
          <section className="finding" style={{ marginTop: 13 }}>
            <h2 style={{ fontSize: 18, marginBottom: 15 }}>Recent Invoices</h2>
            <div className="table">
              <table>
                <thead>
                  <tr><th>Invoice #</th><th>Customer</th><th>Date</th><th>Due</th><th>Total</th><th>Balance</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {data.invoices?.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: '#888' }}>No invoices found.</td></tr>
                  ) : (
                    data.invoices?.map(inv => (
                      <tr key={inv.id}>
                        <td><b>{inv.number}</b></td>
                        <td>{inv.customer}</td>
                        <td style={{ fontSize: 11 }}>{inv.date}</td>
                        <td style={{ fontSize: 11 }}>{inv.due_date}</td>
                        <td>${inv.total?.toFixed(2)}</td>
                        <td style={{ color: inv.balance > 0 ? '#C63D34' : '#237A4B' }}>${inv.balance?.toFixed(2)}</td>
                        <td><span className={`pill ${inv.status === 'paid' ? 'medium' : 'high'}`}>{inv.status}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </PortalShell>
  );
}