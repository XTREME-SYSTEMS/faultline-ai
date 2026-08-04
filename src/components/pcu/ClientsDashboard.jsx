import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const STATUS_COLORS = {
  trial: '#73777F', active: '#237A4B', suspended: '#B88214', churned: '#C63D34',
  pending: '#73777F', expired: '#C63D34', cancelled: '#C63D34',
  draft: '#73777F', submitted: '#3B82F6', paid: '#237A4B', fulfilled: '#237A4B'
};

const STAGE_LABELS = {
  pre_launch: 'Pre-Launch', early_revenue: 'Early Revenue', growth: 'Growth',
  established: 'Established', commercial: 'Commercial'
};

export default function ClientsDashboard() {
  const [accounts, setAccounts] = useState([]);
  const [entitlements, setEntitlements] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [acct, ent, sub, ord] = await Promise.all([
        base44.entities.CustomerAccount.list('-created_date', 100).catch(() => []),
        base44.entities.ProductEntitlement.list('-created_date', 200).catch(() => []),
        base44.entities.Subscription.list('-created_date', 100).catch(() => []),
        base44.entities.CartOrder.filter({ status: 'paid' }, '-created_date', 50).catch(() => [])
      ]);
      setAccounts(acct);
      setEntitlements(ent);
      setSubscriptions(sub);
      setOrders(ord);
    } catch (e) {
      setError(e.message || 'Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#73777F' }}>Loading clients…</div>;
  }

  if (error) {
    return <div style={{ background: '#fde8e8', color: '#C63D34', padding: 12, borderRadius: 8, fontSize: 13 }}>{error}</div>;
  }

  // Summary metrics
  const activeAccounts = accounts.filter(a => a.status === 'active').length;
  const trialAccounts = accounts.filter(a => a.status === 'trial').length;
  const activeEntitlements = entitlements.filter(e => e.status === 'active').length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  const entsForAccount = (id) => entitlements.filter(e => e.account_id === id);
  const subsForAccount = (id) => subscriptions.filter(s => s.account_id === id);
  const ordersForAccount = (id) => orders.filter(o => o.owner_user_id && accounts.find(a => a.id === id));

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Summary metrics */}
      <div className="metrics" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        <article><b>{accounts.length}</b><span>Total Clients</span><em>{activeAccounts} active · {trialAccounts} trial</em></article>
        <article><b>{activeEntitlements}</b><span>Active Entitlements</span><em>{entitlements.length} total</em></article>
        <article><b>{subscriptions.length}</b><span>Subscriptions</span><em>Recurring</em></article>
        <article><b>{orders.length}</b><span>Paid Orders</span><em>Fulfilled</em></article>
        <article><b>${totalRevenue.toLocaleString()}</b><span>Revenue (Paid)</span><em style={{ color: '#237A4B' }}>From orders</em></article>
      </div>

      {accounts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#73777F' }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>👥</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#202124' }}>No clients yet</p>
          <p style={{ fontSize: 14 }}>Clients appear here when a CartOrder is paid and the fulfillment workflow creates their account.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 16, alignItems: 'start' }}>
          {/* Client list */}
          <div style={{ display: 'grid', gap: 10 }}>
            {accounts.map(a => {
              const ents = entsForAccount(a.id);
              const subs = subsForAccount(a.id);
              const isActive = a.status === 'active';
              return (
                <div key={a.id} onClick={() => setSelected(selected === a.id ? null : a.id)} style={{
                  background: '#fff', border: `1px solid ${selected === a.id ? '#D4AF37' : '#e5e1da'}`,
                  borderRadius: 8, padding: 18, cursor: 'pointer', transition: 'border-color .15s'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <b style={{ fontSize: 15 }}>{a.business_name || a.account_name}</b>
                      <p style={{ fontSize: 12, color: '#999', margin: '2px 0 0' }}>{a.account_name} · {a.industry || '—'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#fff', background: STATUS_COLORS[a.status] || '#73777F', padding: '3px 8px', borderRadius: 4 }}>{a.status}</span>
                      {a.lifecycle_state && <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#D4AF37', background: '#D4AF3715', padding: '3px 8px', borderRadius: 4 }}>{a.lifecycle_state}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666', flexWrap: 'wrap' }}>
                    <span><b>{ents.length}</b> entitlements</span>
                    <span><b>{subs.length}</b> subscriptions</span>
                    <span>{STAGE_LABELS[a.stage] || a.stage}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail panel */}
          {selected && (() => {
            const acct = accounts.find(a => a.id === selected);
            const ents = entsForAccount(selected);
            const subs = subsForAccount(selected);
            return (
              <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 22, position: 'sticky', top: 80 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
                  <div>
                    <b style={{ fontSize: 17 }}>{acct.business_name || acct.account_name}</b>
                    <p style={{ fontSize: 12, color: '#999', margin: '2px 0 0' }}>{acct.account_name}</p>
                  </div>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 0, fontSize: 18, cursor: 'pointer', color: '#999', fontFamily: 'inherit' }}>✕</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  <div style={{ padding: 10, background: '#f8f7f4', borderRadius: 6 }}>
                    <p style={{ fontSize: 10, color: '#999', margin: 0, textTransform: 'uppercase', letterSpacing: '.08em' }}>Status</p>
                    <b style={{ fontSize: 13, color: STATUS_COLORS[acct.status] || '#111' }}>{acct.status}</b>
                  </div>
                  <div style={{ padding: 10, background: '#f8f7f4', borderRadius: 6 }}>
                    <p style={{ fontSize: 10, color: '#999', margin: 0, textTransform: 'uppercase', letterSpacing: '.08em' }}>Stage</p>
                    <b style={{ fontSize: 13 }}>{STAGE_LABELS[acct.stage] || acct.stage}</b>
                  </div>
                  <div style={{ padding: 10, background: '#f8f7f4', borderRadius: 6 }}>
                    <p style={{ fontSize: 10, color: '#999', margin: 0, textTransform: 'uppercase', letterSpacing: '.08em' }}>Lifecycle</p>
                    <b style={{ fontSize: 13 }}>{acct.lifecycle_state || '—'}</b>
                  </div>
                  <div style={{ padding: 10, background: '#f8f7f4', borderRadius: 6 }}>
                    <p style={{ fontSize: 10, color: '#999', margin: 0, textTransform: 'uppercase', letterSpacing: '.08em' }}>Industry</p>
                    <b style={{ fontSize: 13 }}>{acct.industry || '—'}</b>
                  </div>
                </div>

                {acct.notes && <p style={{ fontSize: 12, color: '#666', background: '#f8f7f4', padding: 10, borderRadius: 6, margin: '0 0 16px' }}>{acct.notes}</p>}

                {/* Entitlements */}
                <h4 style={{ fontSize: 13, margin: '0 0 8px' }}>Entitlements ({ents.length})</h4>
                {ents.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#999' }}>No entitlements</p>
                ) : (
                  <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
                    {ents.map(e => (
                      <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#f8f7f4', borderRadius: 6, border: '1px solid #e5e1da' }}>
                        <b style={{ fontSize: 12 }}>{e.tool_id}</b>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: STATUS_COLORS[e.status] || '#73777F' }}>{e.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subscriptions */}
                <h4 style={{ fontSize: 13, margin: '0 0 8px' }}>Subscriptions ({subs.length})</h4>
                {subs.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#999' }}>No subscriptions</p>
                ) : (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {subs.map(s => (
                      <div key={s.id} style={{ padding: '8px 10px', background: '#f8f7f4', borderRadius: 6, border: '1px solid #e5e1da' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <b style={{ fontSize: 12 }}>{s.package_name || s.package_id}</b>
                          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: STATUS_COLORS[s.status] || '#73777F' }}>{s.status}</span>
                        </div>
                        <p style={{ fontSize: 11, color: '#999', margin: '4px 0 0' }}>${s.setup_price} setup · ${s.monthly_price}/mo</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}