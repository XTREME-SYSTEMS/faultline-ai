import { useEffect, useState, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, Loader2, Zap, Plus, Trash2, Globe, CheckCircle2,
  AlertCircle, Clock, RefreshCw, ListChecks, X, Search, Sparkles,
  Tag, ExternalLink, Images, Mic, MicOff,
} from 'lucide-react';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';

export default function CloneQueue() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [categorizing, setCategorizing] = useState(null); // shows categorization result inline
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState(null);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef(null);

  // Voice input using the Web Speech API (Chrome/Edge supported)
  function startListening() {
    setVoiceError('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (e) => {
      setListening(false);
      setVoiceError(e.error === 'not-allowed' ? 'Microphone access denied. Please allow microphone permissions.' : `Voice error: ${e.error}`);
    };
    recognition.onresult = (e) => {
      let transcript = '';
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      // Clean up the transcript: remove spaces around dots, add protocol if missing
      let cleaned = transcript.trim().toLowerCase().replace(/\s+/g, '');
      // "example dot com" → "example.com"
      cleaned = cleaned.replace(/\sdot\s/g, '.').replace(/\s/g, '');
      // Remove "www." prefix if user said it with spaces
      cleaned = cleaned.replace(/^www\./, '');
      if (cleaned && !cleaned.match(/^https?:\/\//)) {
        cleaned = `https://www.${cleaned}`;
      }
      setUrlInput(cleaned);
    };

    recognition.start();
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
    }
  }

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
    if (!urlInput.trim()) return;
    setAdding(true);
    setError('');
    setCategorizing(null);
    try {
      // Step 1: Auto-categorize the URL
      const catRes = await base44.functions.invoke('categorizeWebsite', {
        url: urlInput.trim(),
        auto_queue: true,
      });
      const d = catRes.data || catRes;
      if (d.error) throw new Error(d.error);

      setCategorizing(d);
      setUrlInput('');
      loadQueue();
    } catch (e) {
      setError(e.message || 'Failed to categorize and queue website');
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
    setProcessResult(null);
    try {
      const res = await base44.functions.invoke('processCloneQueue', { max_items: 1 });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setProcessResult(d);
      setTimeout(loadQueue, 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
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
              Type any website URL. The system auto-categorizes it, queues it, clones it, and sends it to the gallery.
            </p>
          </div>
          <Link to="/app" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#aaa', fontSize: 13 }}>
            <ChevronLeft size={16} /> Back
          </Link>
        </div>

        {/* URL Input — the main feature */}
        <div style={{
          background: '#fff', border: '1px solid #ddd', borderRadius: 12, padding: 28, marginBottom: 20,
          boxShadow: '0 4px 12px rgba(0,0,0,.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', display: 'grid', placeItems: 'center' }}>
              <Plus size={20} style={{ color: '#111' }} />
            </div>
            <div>
              <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22, margin: 0 }}>Add a Website to Clone</h3>
              <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>Type any URL — the AI will auto-detect the industry and add it to the queue.</p>
            </div>
          </div>

          <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Globe size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://example.com or example.com"
                disabled={adding}
                style={{
                  width: '100%', padding: '14px 14px 14px 42px', border: '1px solid #d7d7d7',
                  borderRadius: 8, fontSize: 15, fontFamily: 'inherit', background: '#fff',
                  color: '#111', outline: 'none', transition: 'border-color .15s',
                }}
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              disabled={adding}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px',
                background: listening ? '#C63D34' : '#fff', color: listening ? '#fff' : '#C89B3C',
                border: `2px solid ${listening ? '#C63D34' : '#C89B3C'}`, borderRadius: 8,
                fontWeight: 700, fontSize: 14, cursor: adding ? 'wait' : 'pointer',
                whiteSpace: 'nowrap', transition: 'all .15s',
              }}
              title={listening ? 'Stop listening' : 'Speak the website URL'}
            >
              {listening ? <MicOff size={18} className="animate-pulse" /> : <Mic size={18} />}
              {listening ? 'Listening…' : 'Speak URL'}
            </button>
            <button type="submit" disabled={adding || !urlInput.trim()} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '14px 28px',
              background: adding ? '#666' : 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111',
              border: 0, borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: adding ? 'wait' : 'pointer',
              whiteSpace: 'nowrap',
            }}>
              {adding ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {adding ? 'Categorizing…' : 'Auto-Categorize & Queue'}
            </button>
          </form>

          {/* Voice input status */}
          {listening && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#f8e5ce', border: '1px solid #C89B3C', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Mic size={16} className="animate-pulse" style={{ color: '#C89B3C' }} />
              <span style={{ fontSize: 13, color: '#a85c00', fontWeight: 600 }}>Listening… Speak the website URL (e.g. "roof maxx dot com")</span>
            </div>
          )}
          {voiceError && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#f5d8d5', border: '1px solid #C63D34', borderRadius: 8, fontSize: 13, color: '#a52d23' }}>
              {voiceError}
            </div>
          )}

          {/* Inline categorization result */}
          {categorizing && (
            <div style={{
              marginTop: 16, padding: 16, background: '#e8f5ec', border: '1px solid #237A4B',
              borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <CheckCircle2 size={20} style={{ color: '#237A4B', flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 14, color: '#237A4B' }}>Added to queue!</b>
                <div style={{ fontSize: 13, color: '#333', marginTop: 4 }}>
                  <b>{categorizing.site_name}</b> → categorized as{' '}
                  <span style={{ padding: '2px 8px', borderRadius: 4, background: '#f8f7f4', border: '1px solid #d9c8aa', fontSize: 12, fontWeight: 700, color: '#8A641C' }}>
                    {categorizing.industry_group} → {categorizing.industry}
                  </span>
                  <span style={{ marginLeft: 8, fontSize: 11, color: '#888' }}>({categorizing.confidence} confidence)</span>
                </div>
                {categorizing.description && (
                  <p style={{ fontSize: 12, color: '#666', margin: '6px 0 0' }}>{categorizing.description}</p>
                )}
              </div>
              <button onClick={() => setCategorizing(null)} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4 }}>
                <X size={16} color="#999" />
              </button>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 14, padding: 12, background: '#f5d8d5', borderRadius: 8, color: '#a52d23', fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 13, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <StatCard label="Queued" value={stats.queued} icon={Clock} color="#B88214" />
          <StatCard label="Processing" value={stats.cloning} icon={Loader2} color="#2563eb" />
          <StatCard label="Passed" value={stats.passed} icon={CheckCircle2} color="#237A4B" />
          <StatCard label="Failed" value={stats.failed} icon={AlertCircle} color="#C63D34" />
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
            <Link to="/app/clone-gallery" style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px',
              background: '#fff', border: '1px solid #ddd', borderRadius: 8,
              fontWeight: 700, fontSize: 13, color: '#666', textDecoration: 'none',
            }}>
              <Images size={16} /> View Gallery
            </Link>
            <button onClick={handleProcess} disabled={processing} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
              background: processing ? '#333' : 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111',
              border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: processing ? 'wait' : 'pointer',
            }}>
              {processing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
              {processing ? 'Processing…' : 'Process Next Clone'}
            </button>
          </div>
        </div>

        {/* Process result */}
        {processResult && (
          <div style={{
            marginBottom: 20, padding: 16, background: '#e8f5ec', border: '1px solid #237A4B',
            borderRadius: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ color: '#237A4B', fontSize: 14 }}>
                <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6 }} />
                Clone processing started for {processResult.processed || processResult.site_name || 'site'}
              </b>
              <button onClick={() => setProcessResult(null)} style={{ background: 'none', border: 0, cursor: 'pointer' }}>
                <X size={16} color="#999" />
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#666', margin: '6px 0 0' }}>
              The autonomous engine is cloning, auditing, and hardening the site to 100/100. It will appear in the gallery when done.
            </p>
          </div>
        )}

        {/* Queue list */}
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ListChecks size={20} style={{ color: '#C89B3C' }} />
            <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 20, margin: 0 }}>
              Queue ({items.length})
            </h3>
            <button onClick={loadQueue} style={{ marginLeft: 'auto', background: 'none', border: 0, cursor: 'pointer', color: '#999', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block', color: '#C89B3C' }} />
              Loading queue…
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
              <Globe size={48} style={{ opacity: 0.3, margin: '0 auto 16px', display: 'block' }} />
              <p style={{ fontSize: 15, margin: '0 0 8px' }}>No websites in the queue yet.</p>
              <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>Type a URL above to get started.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #eee' }}>
                    <th style={thStyle}>Website</th>
                    <th style={thStyle}>Industry</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Score</th>
                    <th style={thStyle}>Live URL</th>
                    <th style={{ padding: '12px 16px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Globe size={14} style={{ color: '#C89B3C', flexShrink: 0 }} />
                          <div>
                            <b style={{ fontSize: 13, display: 'block' }}>{item.site_name || 'Unknown'}</b>
                            <a href={item.target_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#2563eb' }}>
                              {shortUrl(item.target_url)}
                            </a>
                          </div>
                        </div>
                        {item.notes && (
                          <small style={{ display: 'block', color: '#999', fontSize: 10, marginTop: 4, marginLeft: 22, maxWidth: 250 }}>
                            {item.notes}
                          </small>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {item.industry && item.industry !== 'Uncategorized' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#f8f7f4', border: '1px solid #d9c8aa', borderRadius: 4, fontSize: 11, fontWeight: 700, color: '#8A641C' }}>
                            <Tag size={11} /> {item.industry}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#999' }}>Uncategorized</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge status={item.status} />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 18, color: scoreColor(item.final_score) }}>
                          {item.final_score || 0}
                        </b>
                        <span style={{ fontSize: 10, color: '#999' }}>/100</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {item.vercel_url ? (
                          <a href={item.vercel_url} target="_blank" rel="noreferrer" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#2563eb',
                          }}>
                            <ExternalLink size={11} /> View Live
                          </a>
                        ) : (
                          <span style={{ fontSize: 11, color: '#ccc' }}>—</span>
                        )}
                      </td>
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
        </div>

        {/* Info note */}
        <div style={{ marginTop: 20, padding: 16, background: '#f8f7f4', border: '1px solid #eee', borderRadius: 8 }}>
          <p style={{ fontSize: 12, color: '#888', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={14} style={{ color: '#C89B3C' }} />
            Type any URL above and the AI auto-detects the industry, queues it, and runs the full clone → audit → harden → gallery workflow.
            The autonomous workflow also processes the queue every 30 minutes. Click "Process Next Clone" to run it immediately.
          </p>
        </div>
      </div>
    </>
  );
}

const thStyle = { textAlign: 'left', padding: '12px 16px', fontSize: 11, textTransform: 'uppercase', color: '#888' };

function shortUrl(url) {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 40);
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