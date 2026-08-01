import { useState, useEffect, useCallback } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import PageHead from '@/components/fl/PageHead';
import { base44 } from '@/api/base44Client';

export default function DriveSync() {
  const [state, setState] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('driveSync', { direction: 'status' });
      setState(res.data.sync_state);
      setHistory(res.data.history || []);
    } catch (e) {
      setError(e.message || 'Failed to load sync status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const runSync = async (direction) => {
    setBusy(direction);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke('driveSync', { direction });
      setResult(res.data);
      await fetchStatus();
    } catch (e) {
      setError(e.message || `Sync ${direction} failed`);
    } finally {
      setBusy(null);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  return (
    <PortalShell>
      <PageHead eyebrow="Integrations" title="Google Drive Sync" text="Two-way backup between FaultLine AI and your Google Drive. Export audits, findings, and repair plans to Drive; import Drive files as evidence." />

      {error && (
        <div style={{ background: '#f5d8d5', color: '#a52d23', padding: '14px 18px', borderRadius: 6, marginBottom: 13, border: '1px solid #e3b8b3' }}>
          {error}
        </div>
      )}
      {result && (
        <div style={{ background: '#dcefe2', color: '#1e6b3a', padding: '14px 18px', borderRadius: 6, marginBottom: 13, border: '1px solid #b8d9c2' }}>
          <b>{result.direction === 'export' ? 'Export complete' : 'Import complete'}.</b>{' '}
          {result.direction === 'export'
            ? `${result.counts.audits} audits, ${result.counts.findings} findings, ${result.counts.repair_plans} repair plans → ${result.file_name}`
            : `${result.evidence_created} evidence records from ${result.files_found} Drive files`}
        </div>
      )}

      <div className="queue-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <article>
          <small style={{ color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', fontSize: 10 }}>Export to Drive</small>
          <b style={{ fontSize: 30, marginTop: 8, display: 'block' }}>Backup → Drive</b>
          <p style={{ color: '#666', fontSize: 13, margin: '12px 0 20px' }}>
            Push all audits, findings, and repair plans as a timestamped JSON file into the "FaultLine AI Backups" folder in your Google Drive.
          </p>
          <button className="btn dark" onClick={() => runSync('export')} disabled={!!busy}>
            {busy === 'export' ? 'Exporting…' : 'Run export →'}
          </button>
        </article>
        <article>
          <small style={{ color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', fontSize: 10 }}>Import from Drive</small>
          <b style={{ fontSize: 30, marginTop: 8, display: 'block' }}>Drive → Evidence</b>
          <p style={{ color: '#666', fontSize: 13, margin: '12px 0 20px' }}>
            Scan the backup folder in your Google Drive and create Evidence records from each backup file, linking them back to their source audits.
          </p>
          <button className="btn gold" onClick={() => runSync('import')} disabled={!!busy}>
            {busy === 'import' ? 'Importing…' : 'Run import →'}
          </button>
        </article>
      </div>

      <section className="finding" style={{ marginTop: 26 }}>
        <h2>Sync status</h2>
        {loading ? (
          <p style={{ color: '#888' }}>Loading…</p>
        ) : state ? (
          <div className="table">
            <table>
              <tbody>
                <tr><td><b>Last sync</b></td><td>{fmtDate(state.last_sync_at)}</td></tr>
                <tr><td><b>Direction</b></td><td>{state.last_direction || '—'}</td></tr>
                <tr><td><b>Records synced</b></td><td>{state.last_count ?? '—'}</td></tr>
                <tr><td><b>Drive folder ID</b></td><td><small>{state.drive_folder_id || '—'}</small></td></tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#888' }}>No syncs yet. Run an export or import to get started.</p>
        )}
      </section>

      <section className="finding" style={{ marginTop: 13 }}>
        <h2>Recent activity</h2>
        {history.length === 0 ? (
          <p style={{ color: '#888' }}>No sync history yet.</p>
        ) : (
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Status</th>
                  <th>Summary</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id}>
                    <td><b>{r.action}</b></td>
                    <td><span className="pill" style={{ background: '#dcefe2', color: '#1e6b3a' }}>{r.status}</span></td>
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