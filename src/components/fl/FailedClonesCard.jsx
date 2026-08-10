import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle, RefreshCw, Loader2, ChevronDown, ChevronUp, Trash2, ExternalLink, Shield, Wrench } from 'lucide-react';

// Shows failed CloneQueue items + failed LaunchProjects on the dashboard.
// "Retry All" resets failed items back to 'queued' for the pipeline to reprocess.
// "Auto-Heal All" triggers autonomousCloneTo100 in heal mode on each failed project.
export default function FailedClonesCard() {
  const [failed, setFailed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [healing, setHealing] = useState(false);
  const [result, setResult] = useState(null);

  async function loadFailed() {
    setLoading(true);
    try {
      const [queueFailed, projectsFailed] = await Promise.all([
        base44.entities.CloneQueue.filter({ status: 'failed' }, '-created_date', 50).catch(() => []),
        base44.entities.LaunchProject.filter({ status: 'failed' }, '-created_date', 50).catch(() => []),
      ]);
      // Merge: queue items are the source of truth for retry; supplement with failed projects
      const queueIds = new Set(queueFailed.map(q => q.launch_project_id).filter(Boolean));
      const orphanProjects = projectsFailed.filter(p => !queueIds.has(p.id));
      setFailed({
        queue: queueFailed,
        orphanProjects,
      });
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFailed(); }, []);

  async function retryAll() {
    setRetrying(true);
    setResult(null);
    try {
      const items = failed.queue || [];
      let retried = 0;
      for (const item of items) {
        await base44.entities.CloneQueue.update(item.id, {
          status: 'queued',
          attempts: 0,
          error: '',
          notes: `Manually retried from failed card — reset to queued. System will audit, analyze, fix, heal, and harden automatically.`,
        });
        retried++;
      }
      setResult({ type: 'retry', count: retried });
      loadFailed();
    } catch (e) {
      setResult({ type: 'error', message: e.message });
    } finally {
      setRetrying(false);
    }
  }

  async function retryOne(id) {
    try {
      await base44.entities.CloneQueue.update(id, {
        status: 'queued',
        attempts: 0,
        error: '',
        notes: `Manually retried — reset to queued.`,
      });
      loadFailed();
    } catch (e) {
      setResult({ type: 'error', message: e.message });
    }
  }

  async function autoHealAll() {
    setHealing(true);
    setResult(null);
    try {
      // Heal failed orphan projects (no queue item) via autonomousCloneTo100 heal mode
      const projects = failed.orphanProjects || [];
      let healed = 0;
      for (const p of projects) {
        try {
          await base44.functions.invoke('autonomousCloneTo100', {
            launch_project_id: p.id,
            max_iterations: 3,
          });
          healed++;
        } catch (e) { /* continue to next */ }
      }
      // Also retry queue items
      const items = failed.queue || [];
      let retried = 0;
      for (const item of items) {
        await base44.entities.CloneQueue.update(item.id, {
          status: 'queued',
          attempts: 0,
          error: '',
          notes: `Auto-heal triggered — reset to queued for full audit → analyze → fix → heal → harden cycle.`,
        });
        retried++;
      }
      setResult({ type: 'heal', healed, retried });
      loadFailed();
    } catch (e) {
      setResult({ type: 'error', message: e.message });
    } finally {
      setHealing(false);
    }
  }

  const totalFailed = (failed.queue?.length || 0) + (failed.orphanProjects?.length || 0);

  if (loading) {
    return (
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 12, padding: 20, marginBottom: 13 }}>
        <Loader2 size={20} className="animate-spin" style={{ color: '#C89B3C' }} /> Loading failed clones…
      </div>
    );
  }

  if (totalFailed === 0 && !result) return null;

  return (
    <div style={{
      background: '#fff', border: '1px solid #f5d8d5', borderRadius: 12, marginBottom: 13, overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(198,61,52,.06)',
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: '#fff5f4', border: 0, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f5d8d5', display: 'grid', placeItems: 'center' }}>
            <AlertCircle size={18} style={{ color: '#C63D34' }} />
          </div>
          <span style={{ textAlign: 'left' }}>
            <b style={{ fontSize: 15, color: '#C63D34', display: 'block' }}>Failed Clones ({totalFailed})</b>
            <small style={{ fontSize: 12, color: '#a52d23' }}>Auto-retried 5× then moved here. Retry or auto-heal to investigate & fix.</small>
          </span>
        </span>
        {open ? <ChevronUp size={18} style={{ color: '#C63D34' }} /> : <ChevronDown size={18} style={{ color: '#C63D34' }} />}
      </button>

      {open && (
        <div style={{ padding: '0 20px 20px' }}>
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', paddingTop: 14 }}>
            <button onClick={retryAll} disabled={retrying || !failed.queue?.length} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
              background: retrying ? '#999' : '#0a0a0a', color: '#fff', border: 0, borderRadius: 8,
              fontWeight: 700, fontSize: 13, cursor: retrying ? 'wait' : 'pointer', fontFamily: 'inherit',
            }}>
              {retrying ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {retrying ? 'Retrying…' : `Retry All (${failed.queue?.length || 0})`}
            </button>
            <button onClick={autoHealAll} disabled={healing || totalFailed === 0} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
              background: healing ? '#999' : 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111',
              border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: healing ? 'wait' : 'pointer', fontFamily: 'inherit',
            }}>
              {healing ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
              {healing ? 'Healing…' : 'Auto-Heal All (Audit → Fix → Harden)'}
            </button>
          </div>

          {/* Result message */}
          {result && (
            <div style={{
              marginBottom: 12, padding: 12, borderRadius: 8, fontSize: 13,
              background: result.type === 'error' ? '#f5d8d5' : '#e8f5ec',
              color: result.type === 'error' ? '#a52d23' : '#237A4B',
            }}>
              {result.type === 'retry' && `✓ ${result.count} clones reset to queued. The pipeline will reprocess them automatically.`}
              {result.type === 'heal' && `✓ ${result.healed} projects sent for healing, ${result.retried} queue items reset. The system will audit, analyze, fix, heal, and harden each one.`}
              {result.type === 'error' && `Error: ${result.message}`}
            </div>
          )}

          {/* Failed queue items */}
          {failed.queue?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <small style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#888', marginBottom: 8, display: 'block' }}>
                Queue Failures ({failed.queue.length})
              </small>
              <div style={{ border: '1px solid #eee', borderRadius: 8, maxHeight: 300, overflowY: 'auto' }}>
                {failed.queue.map(item => (
                  <div key={item.id} style={{ padding: '10px 14px', borderBottom: '1px solid #f6f3ec', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertCircle size={14} style={{ color: '#C63D34', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: 13, display: 'block' }}>{item.site_name || 'Unknown'}</b>
                      <small style={{ fontSize: 11, color: '#999', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.error || item.notes || 'Unknown error'}
                      </small>
                    </div>
                    <span style={{ fontSize: 10, color: '#888', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {item.attempts || 0}/{item.max_attempts || 5} tries
                    </span>
                    {item.final_score != null && (
                      <span style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 14, color: '#B88214', flexShrink: 0 }}>
                        {item.final_score}<small style={{ fontSize: 8 }}>/100</small>
                      </span>
                    )}
                    <button onClick={() => retryOne(item.id)} title="Retry this clone" style={{
                      background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: 5, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', color: '#666', fontFamily: 'inherit',
                    }}>
                      <RefreshCw size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed orphan projects */}
          {failed.orphanProjects?.length > 0 && (
            <div>
              <small style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#888', marginBottom: 8, display: 'block' }}>
                Project Failures ({failed.orphanProjects.length})
              </small>
              <div style={{ border: '1px solid #eee', borderRadius: 8, maxHeight: 200, overflowY: 'auto' }}>
                {failed.orphanProjects.map(p => (
                  <div key={p.id} style={{ padding: '10px 14px', borderBottom: '1px solid #f6f3ec', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Wrench size={14} style={{ color: '#B88214', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: 13, display: 'block' }}>{p.project_name || 'Unknown'}</b>
                      <small style={{ fontSize: 11, color: '#999', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.last_validation_summary || 'Stalled — process terminated'}
                      </small>
                    </div>
                    {p.parity_score != null && (
                      <span style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 14, color: '#B88214', flexShrink: 0 }}>
                        {p.parity_score}<small style={{ fontSize: 8 }}>/100</small>
                      </span>
                    )}
                    {p.vercel_deployment_url && (
                      <a href={p.vercel_deployment_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: 12 }}>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}