import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, Loader2, Zap, Plus, Trash2, Globe, CheckCircle2,
  AlertCircle, Clock, RefreshCw, ListChecks, X, Search,
} from 'lucide-react';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import DiscoveryView from '@/components/clone-queue/DiscoveryView';
import { CLONE_INDUSTRIES, getIndustryGroups } from '@/lib/cloneIndustries';

function getBusinessRefs(industryLabel) {
  const ind = CLONE_INDUSTRIES.find(i => i.label === industryLabel);
  return ind?.businesses || [];
}

export default function CloneQueue() {
  const [tab, setTab] = useState('discover'); // discover | queue
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [adding, setAdding] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await base44.entities.CloneQueue.list('-created_date', 200);
      setItems(list);
    } catch (e) {
      setError(e.message || 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newUrl.trim()) return;
    setAdding(true);
    setError('');
    try {
      await base44.entities.CloneQueue.create({
        target_url: newUrl.trim(),
        site_name: newName.trim() || deriveName(newUrl.trim()),
        industry: newIndustry.trim() || 'Uncategorized',
        priority: newPriority,
        status: 'queued',
        source: 'manual',
      });
      setNewUrl(''); setNewName(''); setNewIndustry(''); setNewPriority('medium');
      setShowAdd(false);
      loadQueue();
    } catch (e) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this item from the queue?')) return;
    try {
      await base44.entities.CloneQueue.delete(id);
      loadQueue();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleProcess() {
    setProcessing(true);
    setError('');
    try {
      const res = await base44.functions.invoke('processCloneQueue', { max_items: 1 });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setTimeout(loadQueue, 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  }

  async function handleCleanup() {
    if (!confirm('This will DELETE all clones below 100/100 and save them to the queue for re-cloning. Good clones (100/100) will be kept. Continue?')) return;
    setCleaningUp(true);
    setError('');
    setCleanupResult(null);
    try {
      const res = await base44.functions.invoke('cleanupBrokenClones', { dry_run: false });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setCleanupResult(d);
      loadQueue();
    } catch (e) {
      setError(e.message);
    } finally {
      setCleaningUp(false);
    }
  }

  async function handleDryRun() {
    setCleaningUp(true);
    setError('');
    try {
      const res = await base44.functions.invoke('cleanupBrokenClones', { dry_run: true });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setCleanupResult(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setCleaningUp(false);
    }
  }

  const stats = {
    queued: items.filter(i => i.status === 'queued').length,
    cloning: items.filter(i => i.status === 'cloning' || i.status === 'validating' || i.status === 'auditing').length,
    passed: items.filter(i => i.status === 'passed').length,
    failed: items.filter(i => i.status === 'failed').length,
  };

  return (
    <>
      <XtremeOSSidebar />
      <div className="portal-page xtremeos-content" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240 }}>
        {/* Header */}
        <div style={{
          background: 'radial-gradient(circle at 82% 40%, #C89B3C45, transparent 25%), #0a0a0a',
          color: '#fff', padding: '36px 28px', margin: '-28px -28px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ color: '#E7C86E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>Clone Queue</p>
            <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 38, margin: '8px 0 4px', letterSpacing: '-.03em' }}>
              Clone <span style={{ color: '#E7C86E' }}>Queue</span>
            </h1>
            <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>
              Scan any industry for the top 50 sites, analyze market data, then queue the best ones for cloning.
            </p>
          </div>
          <Link to="/app" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#aaa', fontSize: 13 }}>
            <ChevronLeft size={16} /> Back
          </Link>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #ddd' }}>
          <TabButton active={tab === 'discover'} onClick={() => setTab('discover')} icon={Search} label="Discover & Scan" />
          <TabButton active={tab === 'queue'} onClick={() => setTab('queue')} icon={ListChecks} label={`My Queue (${items.length})`} />
        </div>

        {/* Discover tab */}
        {tab === 'discover' && <DiscoveryView />}

        {/* Queue tab */}
        {tab === 'queue' && (
          <div>
            {/* Stats bar */}
            <div style={{ display: 'flex', gap: 13, marginBottom: 20, flexWrap: 'wrap' }}>
              <StatCard label="Queued" value={stats.queued} icon={Clock} color="#B88214" />
              <StatCard label="Processing" value={stats.cloning} icon={Loader2} color="#2563eb" />
              <StatCard label="Passed" value={stats.passed} icon={CheckCircle2} color="#237A4B" />
              <StatCard label="Failed" value={stats.failed} icon={AlertCircle} color="#C63D34" />
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                <button onClick={handleDryRun} disabled={cleaningUp} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px',
                  background: '#fff', border: '1px solid #ddd', borderRadius: 8,
                  fontWeight: 700, fontSize: 13, cursor: cleaningUp ? 'wait' : 'pointer', color: '#666',
                }}>
                  {cleaningUp ? <Loader2 size={16} className="animate-spin" /> : <ListChecks size={16} />}
                  Dry Run Cleanup
                </button>
                <button onClick={handleCleanup} disabled={cleaningUp} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px',
                  background: cleaningUp ? '#666' : '#C63D34', color: '#fff',
                  border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: cleaningUp ? 'wait' : 'pointer',
                }}>
                  {cleaningUp ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Cleanup Broken Clones
                </button>
                <button onClick={handleProcess} disabled={processing} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
                  background: processing ? '#333' : 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111',
                  border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: processing ? 'wait' : 'pointer',
                }}>
                  {processing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                  {processing ? 'Processing…' : 'Process Next'}
                </button>
              </div>
            </div>

            {/* Cleanup result */}
            {cleanupResult && (
              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 20, margin: 0 }}>
                    {cleanupResult.status === 'dry_run' ? 'Dry Run Results' : 'Cleanup Complete'}
                  </h3>
                  <button onClick={() => setCleanupResult(null)} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4 }}>
                    <X size={18} color="#999" />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                  <ResultStat label="Good Clones (kept)" value={cleanupResult.good_count ?? cleanupResult.good?.length ?? 0} color="#237A4B" />
                  <ResultStat label="Broken Clones" value={cleanupResult.broken_count ?? cleanupResult.broken?.length ?? 0} color="#C63D34" />
                  <ResultStat label="Deleted" value={cleanupResult.deleted ?? 0} color="#C63D34" />
                  <ResultStat label="Saved to Queue" value={cleanupResult.saved_to_queue ?? 0} color="#B88214" />
                </div>
                {cleanupResult.saved_to_queue_list && cleanupResult.saved_to_queue_list.length > 0 && (
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#666', marginBottom: 8 }}>SAVED TO RE-CLONE QUEUE:</p>
                    <div style={{ display: 'grid', gap: 4, maxHeight: 200, overflow: 'auto' }}>
                      {cleanupResult.saved_to_queue_list.map((q, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, color: '#666', padding: '4px 0' }}>
                          <Globe size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>{q.site_name} — {q.target_url}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Add form */}
            {showAdd ? (
              <form onSubmit={handleAdd} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 20, margin: 0 }}>Add Site to Queue</h3>
                  <button type="button" onClick={() => setShowAdd(false)} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4 }}>
                    <X size={18} color="#999" />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12 }}>
                  <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://example.com" required style={inputStyle} />
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Site name (optional)" style={inputStyle} />
                  <select value={newIndustry} onChange={e => setNewIndustry(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Select industry…</option>
                    {getIndustryGroups().map(group => (
                      <optgroup key={group.group} label={group.group}>
                        {group.industries.map(ind => <option key={ind.id} value={ind.label}>{ind.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <select value={newPriority} onChange={e => setNewPriority(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {newIndustry && getBusinessRefs(newIndustry).length > 0 && (
                  <div style={{ marginTop: 14, padding: 14, background: '#f8f7f4', borderRadius: 8, border: '1px solid #e5e1da' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#8A641C', textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 10px' }}>
                      Real {newIndustry} Businesses — Click to Clone
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {getBusinessRefs(newIndustry).map(biz => (
                        <button key={biz.url} type="button" onClick={() => { setNewUrl(biz.url); setNewName(biz.name); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#fff', border: '1px solid #d9c8aa', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#333' }}>
                          <Globe size={12} style={{ color: '#C89B3C' }} />
                          {biz.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button type="submit" disabled={adding} style={{
                  marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                  background: adding ? '#666' : 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111',
                  border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: adding ? 'wait' : 'pointer',
                }}>
                  {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Add to Queue
                </button>
              </form>
            ) : (
              <button onClick={() => setShowAdd(true)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
                background: '#fff', border: '1px dashed #C89B3C', borderRadius: 8,
                fontWeight: 700, fontSize: 13, cursor: 'pointer', color: '#C89B3C', marginBottom: 20,
              }}>
                <Plus size={16} /> Add Site Manually
              </button>
            )}

            {error && (
              <div style={{ padding: 14, background: '#f5d8d5', borderRadius: 8, color: '#a52d23', fontSize: 13, marginBottom: 20 }}>{error}</div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block', color: '#C89B3C' }} />
                Loading queue…
              </div>
            ) : items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                <ListChecks size={48} style={{ opacity: 0.3, margin: '0 auto 16px', display: 'block' }} />
                <p style={{ fontSize: 15, margin: '0 0 8px' }}>No items in the clone queue.</p>
                <button onClick={() => setTab('discover')} style={{ color: '#C89B3C', fontWeight: 700, fontSize: 14, background: 'none', border: 0, cursor: 'pointer' }}>
                  Go to Discover to scan an industry →
                </button>
              </div>
            ) : (
              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #eee' }}>
                      <th style={thStyle}>Site</th>
                      <th style={thStyle}>Industry</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Score</th>
                      <th style={thStyle}>Priority</th>
                      <th style={thStyle}>Source</th>
                      <th style={{ padding: '12px 16px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <b style={{ fontSize: 13, display: 'block' }}>{item.site_name || 'Unknown'}</b>
                          <a href={item.target_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Globe size={10} /> {shortUrl(item.target_url)}
                          </a>
                          {item.vercel_url && (
                            <a href={item.vercel_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#666', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <Globe size={10} /> {shortUrl(item.vercel_url)}
                            </a>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#666' }}>{item.industry || 'Uncategorized'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <StatusBadge status={item.status} />
                          {item.notes && <small style={{ display: 'block', color: '#999', fontSize: 10, marginTop: 4, maxWidth: 200 }}>{item.notes}</small>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 18, color: scoreColor(item.final_score) }}>{item.final_score || 0}</b>
                          <span style={{ fontSize: 10, color: '#999' }}>/100</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}><PriorityBadge priority={item.priority} /></td>
                        <td style={{ padding: '12px 16px', fontSize: 11, color: '#888' }}>{item.source}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4, color: '#C63D34' }}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: 20, padding: 16, background: '#f8f7f4', border: '1px solid #eee', borderRadius: 8 }}>
              <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                <Zap size={12} style={{ display: 'inline', marginRight: 6, color: '#C89B3C' }} />
                The autonomous workflow processes the queue every 30 minutes. Click "Process Next" to run it immediately.
                Each clone must reach 100/100 visual + operational parity AND pass a forensic audit before entering the gallery.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const inputStyle = { padding: '10px 12px', border: '1px solid #d7d7d7', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', background: '#fff', color: '#111', outline: 'none' };
const thStyle = { textAlign: 'left', padding: '12px 16px', fontSize: 11, textTransform: 'uppercase', color: '#888' };

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
      background: 'none', border: 0, borderBottom: active ? '3px solid #C89B3C' : '3px solid transparent',
      color: active ? '#111' : '#888', fontWeight: 700, fontSize: 14, cursor: 'pointer',
    }}>
      <Icon size={16} style={{ color: active ? '#C89B3C' : '#999' }} />
      {label}
    </button>
  );
}

function deriveName(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const parts = host.split('.');
    if (parts.length >= 2) return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    return host;
  } catch { return 'Unknown'; }
}

function shortUrl(url) {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 35);
}

function scoreColor(score) {
  if (score >= 100) return '#237A4B';
  if (score >= 70) return '#B88214';
  return '#C63D34';
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: '14px 18px', minWidth: 110 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={14} style={{ color }} />
        <small style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</small>
      </div>
      <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 26, display: 'block', color, marginTop: 4 }}>{value}</b>
    </div>
  );
}

function ResultStat({ label, value, color }) {
  return (
    <div style={{ background: '#f8f7f4', border: '1px solid #eee', borderRadius: 6, padding: 12, textAlign: 'center' }}>
      <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 24, display: 'block', color }}>{value}</b>
      <small style={{ color: '#888', fontSize: 10, textTransform: 'uppercase' }}>{label}</small>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    queued: { bg: '#f4edca', color: '#7e6b00', label: 'Queued' },
    cloning: { bg: '#dbeafe', color: '#2563eb', label: 'Cloning' },
    validating: { bg: '#dbeafe', color: '#2563eb', label: 'Validating' },
    auditing: { bg: '#e0e7ff', color: '#4f46e5', label: 'Auditing' },
    passed: { bg: '#d4edda', color: '#237A4B', label: 'Passed' },
    failed: { bg: '#f5d8d5', color: '#C63D34', label: 'Failed' },
    cancelled: { bg: '#eee', color: '#888', label: 'Cancelled' },
  };
  const s = map[status] || map.queued;
  return <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>;
}

function PriorityBadge({ priority }) {
  const map = {
    critical: { bg: '#f5d8d5', color: '#C63D34' },
    high: { bg: '#f8e5ce', color: '#a85c00' },
    medium: { bg: '#f4edca', color: '#7e6b00' },
    low: { bg: '#eee', color: '#888' },
  };
  const s = map[priority] || map.medium;
  return <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: s.bg, color: s.color, textTransform: 'uppercase' }}>{priority}</span>;
}