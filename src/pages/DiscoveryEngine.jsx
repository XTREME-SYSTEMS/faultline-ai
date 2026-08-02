import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalShell from '@/components/fl/PortalShell';
import PageHead from '@/components/fl/PageHead';
import StartHere from '@/components/fl/StartHere';
import { base44 } from '@/api/base44Client';

export default function DiscoveryEngine() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [audits, setAudits] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('Pompano Beach, FL');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('getPortalData', {});
      const { companies = [], audits = [], receipts = [] } = res.data || {};
      setCompanies(companies);
      setAudits(audits);
      setReceipts(receipts.filter(r => ['discovery_engine', 'scanner', 'report_generator'].includes(r.system)));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const run = async (fn, args, label) => {
    setBusy(label);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke(fn, args);
      setResult(res.data || res);
      await fetchAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  const stats = [
    ['Companies discovered', companies.length, 'In the autonomous database'],
    ['Audits completed', audits.filter(a => a.status === 'completed' || a.status === 'reported').length, 'Websites scanned'],
    ['Reports generated', audits.filter(a => a.status === 'reported').length, 'Executive reports ready'],
    ['Pending scans', companies.filter(c => c.status === 'discovered').length, 'Awaiting scanner']
  ];

  return (
    <PortalShell>
      <PageHead eyebrow="Autonomous pipeline" title="Discovery Engine" text="The system autonomously discovers businesses, scans their websites for faults, and generates executive reports — no outreach, no external contact." onAction={() => run('discoverCompanies', { industry, location }, 'discovery')} actionLabel="Discover now →" />

      <StartHere
        companies={companies}
        audits={audits}
        receipts={receipts}
        busy={busy}
        onDiscover={() => run('discoverCompanies', { industry, location }, 'discovery')}
        onScanNext={() => {
          const next = companies.find(c => c.status === 'discovered');
          if (next) run('scanCompany', { company_id: next.id }, 'scan-' + next.id);
        }}
        onGenerateReport={() => {
          const next = audits.find(a => a.status === 'completed' && !a.report_url);
          if (next) run('generateReport', { audit_id: next.id }, 'report-' + next.id);
        }}
        onGoOverview={() => navigate('/app')}
      />

      {error && (
        <div style={{ background: '#f5d8d5', color: '#a52d23', padding: '14px 18px', borderRadius: 6, marginBottom: 13, border: '1px solid #e3b8b3' }}>
          {error}
        </div>
      )}
      {result && (
        <div style={{ background: '#dcefe2', color: '#1e6b3a', padding: '14px 18px', borderRadius: 6, marginBottom: 13, border: '1px solid #b8d9c2' }}>
          <b>Done.</b> {result.summary || JSON.stringify(result).substring(0, 200)}
        </div>
      )}

      <div className="metrics" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {stats.map(([l, v, d]) => (
          <article key={l}>
            <small>{l}</small>
            <b>{loading ? '—' : v}</b>
            <span>{d}</span>
          </article>
        ))}
      </div>

      <section className="finding" style={{ marginTop: 13 }}>
        <h2>Manual trigger</h2>
        <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>
          The pipeline runs automatically (discovery daily at 9am, scanning on new companies, reports on audit completion).
          Use this to trigger a discovery run on demand for a specific industry.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Location (e.g. Pompano Beach, FL / Florida / United States)"
            style={{ padding: '11px 14px', border: '1px solid #ddd', borderRadius: 6, minWidth: 280, fontSize: 14 }}
          />
          <input
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            placeholder="Industry (optional, e.g. manufacturing, logistics)"
            style={{ padding: '11px 14px', border: '1px solid #ddd', borderRadius: 6, minWidth: 240, fontSize: 14 }}
          />
          <button className="btn dark" onClick={() => run('discoverCompanies', { industry, location }, 'discovery')} disabled={!!busy}>
            {busy === 'discovery' ? 'Discovering…' : 'Discover now →'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {['Pompano Beach, FL', 'Florida', 'United States'].map(loc => (
            <button key={loc} onClick={() => setLocation(loc)} style={{ padding: '6px 12px', fontSize: 12, border: `1px solid ${location === loc ? 'var(--gold)' : '#ddd'}`, borderRadius: 20, background: location === loc ? '#f8f4ea' : '#fff', cursor: 'pointer', fontWeight: 600 }}>{loc}</button>
          ))}
        </div>
      </section>

      <section className="finding" style={{ marginTop: 13 }}>
        <h2>Discovered companies</h2>
        {loading ? (
          <p style={{ color: '#888' }}>Loading…</p>
        ) : companies.length === 0 ? (
          <p style={{ color: '#888' }}>No companies yet. Trigger a discovery run to populate the database.</p>
        ) : (
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Industry</th>
                  <th>Status</th>
                  <th>Discovered</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(c => (
                  <tr key={c.id}>
                    <td><b>{c.name}</b><small>{c.domain}</small></td>
                    <td>{c.industry}</td>
                    <td>
                      <span className="pill" style={{
                        background: c.status === 'scanned' ? '#dcefe2' : '#f4edca',
                        color: c.status === 'scanned' ? '#1e6b3a' : '#7e6b00'
                      }}>{c.status}</span>
                    </td>
                    <td><small>{fmtDate(c.created_date)}</small></td>
                    <td>
                      {c.status === 'discovered' && (
                        <button
                          className="btn outline"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => run('scanCompany', { company_id: c.id }, 'scan-' + c.id)}
                          disabled={!!busy}
                        >
                          {busy === 'scan-' + c.id ? 'Scanning…' : 'Scan →'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="finding" style={{ marginTop: 13 }}>
        <h2>Audits & reports</h2>
        {loading ? (
          <p style={{ color: '#888' }}>Loading…</p>
        ) : audits.length === 0 ? (
          <p style={{ color: '#888' }}>No audits yet. Scanned companies will appear here.</p>
        ) : (
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>Audit</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Report</th>
                </tr>
              </thead>
              <tbody>
                {audits.map(a => (
                  <tr key={a.id}>
                    <td><b>{a.title}</b><small>{a.id}</small></td>
                    <td>{a.audit_type}</td>
                    <td>
                      <span className="pill" style={{
                        background: a.status === 'reported' ? '#dcefe2' : a.status === 'completed' ? '#f8e5ce' : '#f4edca',
                        color: a.status === 'reported' ? '#1e6b3a' : a.status === 'completed' ? '#a85c00' : '#7e6b00'
                      }}>{a.status}</span>
                    </td>
                    <td><small>{fmtDate(a.created_date)}</small></td>
                    <td>
                      {a.report_url ? (
                        <a href={a.report_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 12 }}>View report →</a>
                      ) : a.status === 'completed' ? (
                        <button
                          className="btn outline"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => run('generateReport', { audit_id: a.id }, 'report-' + a.id)}
                          disabled={!!busy}
                        >
                          {busy === 'report-' + a.id ? 'Generating…' : 'Generate →'}
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="finding" style={{ marginTop: 13 }}>
        <h2>Pipeline activity</h2>
        {receipts.length === 0 ? (
          <p style={{ color: '#888' }}>No activity yet.</p>
        ) : (
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>System</th>
                  <th>Action</th>
                  <th>Summary</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map(r => (
                  <tr key={r.id}>
                    <td><b>{r.system}</b></td>
                    <td>{r.action}</td>
                    <td>{r.summary}</td>
                    <td><small>{fmtDate(r.created_date)}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PortalShell>
  );
}