import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import CustomerShell from '@/components/fl/CustomerShell';
import CustomerCoach from '@/components/fl/CustomerCoach';
import { base44 } from '@/api/base44Client';

export default function CustomerPortal() {
  const { companyId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('getCustomerPortalData', { company_id: companyId });
      if (res.error) throw new Error(res.error);
      setData(res.data || res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '—';

  const { company, audits = [], findings = [], repairPlans = [], healthScore, severityCounts = {}, totalFindings = 0 } = data || {};

  const criticalCount = severityCounts.critical || 0;
  const highCount = severityCounts.high || 0;
  const reportedAudits = audits.filter(a => a.status === 'reported');

  return (
    <CustomerShell companyName={company?.name} coach={!loading && !error && data ? <CustomerCoach data={data} /> : null}>
      {loading && <div style={{ textAlign: 'center', padding: 80, color: '#888' }}>Loading your diagnostic portal…</div>}
      {error && (
        <div style={{ background: '#f5d8d5', color: '#a52d23', padding: 16, borderRadius: 8, border: '1px solid #e3b8b3' }}>
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Hero */}
          <div style={{
            background: 'radial-gradient(circle at 85% 30%, rgba(200,155,60,.12), transparent 50%), #fff',
            border: '1px solid #e5e1da', borderRadius: 16, padding: '36px 40px', marginBottom: 24
          }}>
            <p style={{ color: 'var(--gold)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: '0 0 8px' }}>
              Diagnostic Portal
            </p>
            <h1 style={{ font: '400 44px Libre Caslon Display, serif', margin: '0 0 8px', letterSpacing: '-.03em', color: '#0a0a0a' }}>
              {company?.name}
            </h1>
            <p style={{ color: '#666', fontSize: 16, margin: '0 0 24px', maxWidth: 600 }}>
              Your business diagnostic results, findings, and repair roadmap — explained by AI.
            </p>

            {/* Health score + severity summary */}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
              {healthScore !== null && (
                <div style={{
                  width: 120, height: 120, borderRadius: '50%',
                  border: '10px solid', borderColor: healthScore > 70 ? '#3a9d6e' : healthScore > 40 ? '#e7c46e' : '#e0846e',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: '#fff'
                }}>
                  <b style={{ font: '400 38px Libre Caslon Display, serif', color: '#0a0a0a' }}>{healthScore}</b>
                  <small style={{ fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: '.12em' }}>Health</small>
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  ['Critical', criticalCount, '#e0846e'],
                  ['High', highCount, '#e7c46e'],
                  ['Medium', severityCounts.medium || 0, '#d9d46e'],
                  ['Low', severityCounts.low || 0, '#a8d9b8']
                ].map(([label, count, color]) => (
                  <div key={label} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 10, padding: '16px 22px', minWidth: 100, textAlign: 'center' }}>
                    <b style={{ display: 'block', font: '400 32px Libre Caslon Display, serif', color }}>{count}</b>
                    <small style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.1em' }}>{label}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Findings */}
          <section style={{ marginBottom: 24 }}>
            <h2 style={{ font: '400 28px Libre Caslon Display, serif', margin: '0 0 16px', letterSpacing: '-.02em' }}>
              Your findings ({totalFindings})
            </h2>
            {findings.length === 0 ? (
              <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: 32, textAlign: 'center', color: '#888' }}>
                No findings yet. Your diagnostic is being processed.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {findings.map(f => (
                  <div key={f.id} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: '20px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 8 }}>
                      <b style={{ fontSize: 15, color: '#0a0a0a' }}>{f.title}</b>
                      <span style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', flexShrink: 0,
                        background: f.severity === 'critical' ? '#f5d8d5' : f.severity === 'high' ? '#f8e5ce' : f.severity === 'medium' ? '#f4edca' : '#dcefe2',
                        color: f.severity === 'critical' ? '#a52d23' : f.severity === 'high' ? '#a85c00' : f.severity === 'medium' ? '#7e6b00' : '#1e6b3a'
                      }}>{f.severity}</span>
                    </div>
                    <p style={{ color: '#666', fontSize: 13, lineHeight: 1.6, margin: '0 0 8px' }}>{f.description}</p>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#999' }}>
                      <span>Category: {f.category}</span>
                      {f.business_impact && <span>Impact: {f.business_impact}</span>}
                      {f.confidence && <span>Confidence: {f.confidence}%</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Repair plans */}
          {repairPlans.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ font: '400 28px Libre Caslon Display, serif', margin: '0 0 16px', letterSpacing: '-.02em' }}>
                Your repair roadmap
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {repairPlans.map(rp => (
                  <div key={rp.id} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <b style={{ fontSize: 15, color: '#0a0a0a' }}>{rp.title}</b>
                      <small style={{ display: 'block', fontSize: 12, color: '#888', marginTop: 4 }}>
                        {rp.horizon_days ? `${rp.horizon_days}-day plan` : 'Repair plan'} · {rp.status}
                      </small>
                    </div>
                    <span style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: rp.status === 'completed' ? '#dcefe2' : '#f4edca',
                      color: rp.status === 'completed' ? '#1e6b3a' : '#7e6b00'
                    }}>{rp.status}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Reports */}
          {reportedAudits.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ font: '400 28px Libre Caslon Display, serif', margin: '0 0 16px', letterSpacing: '-.02em' }}>
                Executive reports
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reportedAudits.map(a => (
                  <div key={a.id} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <b style={{ fontSize: 15, color: '#0a0a0a' }}>{a.title}</b>
                      <small style={{ display: 'block', fontSize: 12, color: '#888', marginTop: 4 }}>{fmtDate(a.created_date)}</small>
                    </div>
                    {a.report_url && (
                      <a href={a.report_url} target="_blank" rel="noopener noreferrer" style={{
                        padding: '8px 18px', borderRadius: 8, background: '#0a0a0a', color: '#fff', fontSize: 13, fontWeight: 600
                      }}>View report →</a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

    </CustomerShell>
  );
}