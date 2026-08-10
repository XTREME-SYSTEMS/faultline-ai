import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ClipboardPaste, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react';

export default function BulkUpload({ onDone }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  function parseUrls(raw) {
    // Split by newlines, commas, spaces, or tabs — extract anything that looks like a URL or domain
    const tokens = raw.split(/[\s,\n\r\t]+/).map(t => t.trim()).filter(Boolean);
    const urls = [];
    for (const tok of tokens) {
      let url = tok;
      // Strip surrounding quotes or brackets
      url = url.replace(/^["'\[\](]+|["'\]\])]+$/g, '');
      if (!url) continue;
      // Add protocol if missing
      if (!url.match(/^https?:\/\//)) {
        url = `https://${url}`;
      }
      // Validate it looks like a domain
      if (url.match(/^https?:\/\/[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-z]{2,}/)) {
        urls.push(url);
      }
    }
    // Dedupe
    return [...new Set(urls)];
  }

  async function handleBulkAdd() {
    const urls = parseUrls(text);
    if (urls.length === 0) {
      setError('No valid URLs found. Paste one URL per line (e.g. example.com or https://example.com).');
      return;
    }
    setProcessing(true);
    setError('');
    setResults(null);
    const succeeded = [];
    const failed = [];
    for (const url of urls) {
      try {
        const res = await base44.functions.invoke('categorizeWebsite', { url, auto_queue: true });
        const d = res.data || res;
        if (d.error) {
          failed.push({ url, error: d.error });
        } else {
          succeeded.push({ url, name: d.site_name, industry: d.industry });
        }
      } catch (e) {
        failed.push({ url, error: e.message });
      }
    }
    setResults({ total: urls.length, succeeded, failed });
    setProcessing(false);
    if (onDone) onDone();
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 12, marginBottom: 20, boxShadow: '0 4px 12px rgba(0,0,0,.04)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px', background: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f8f7f4', border: '1px solid #e5e1da', display: 'grid', placeItems: 'center' }}>
            <ClipboardPaste size={18} style={{ color: '#C89B3C' }} />
          </div>
          <span style={{ textAlign: 'left' }}>
            <b style={{ fontSize: 16, color: '#111', display: 'block' }}>Bulk Add by Paste</b>
            <small style={{ fontSize: 12, color: '#888' }}>Paste a list of URLs — one per line or comma-separated. AI auto-categorizes each one.</small>
          </span>
        </span>
        {open ? <ChevronUp size={20} style={{ color: '#999' }} /> : <ChevronDown size={20} style={{ color: '#999' }} />}
      </button>

      {open && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f0ede5' }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={'Paste URLs here — one per line:\n\nhttps://roofmaxx.com\nhttps://garageforce.com\nhttps:// Xtremepolishingsystems.com\nhttps://concretecrafters.com'}
            disabled={processing}
            style={{
              width: '100%', minHeight: 140, padding: 14, border: '1px solid #d7d7d7',
              borderRadius: 8, fontSize: 13, fontFamily: 'monospace', background: '#fff',
              color: '#111', outline: 'none', resize: 'vertical', marginTop: 16,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <small style={{ fontSize: 12, color: '#888' }}>
              {text.trim() ? `${parseUrls(text).length} URL${parseUrls(text).length !== 1 ? 's' : ''} detected` : 'Tip: works with or without https://'}
            </small>
            <button
              onClick={handleBulkAdd}
              disabled={processing || !text.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                background: processing ? '#666' : 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111',
                border: 0, borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: processing ? 'wait' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {processing ? <Loader2 size={16} className="animate-spin" /> : <ClipboardPaste size={16} />}
              {processing ? 'Queuing…' : `Queue ${parseUrls(text).length || ''} Sites`}
            </button>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: 12, background: '#f5d8d5', borderRadius: 8, color: '#a52d23', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {results && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13 }}>
                <span style={{ color: '#237A4B', fontWeight: 700 }}>
                  <CheckCircle2 size={14} style={{ display: 'inline', marginRight: 4 }} />
                  {results.succeeded.length} queued
                </span>
                {results.failed.length > 0 && (
                  <span style={{ color: '#C63D34', fontWeight: 700 }}>
                    <AlertCircle size={14} style={{ display: 'inline', marginRight: 4 }} />
                    {results.failed.length} failed
                  </span>
                )}
                <span style={{ color: '#888' }}>{results.total} total</span>
                <button onClick={() => { setResults(null); setText(''); }} style={{ marginLeft: 'auto', background: 'none', border: 0, cursor: 'pointer', color: '#999', fontSize: 12 }}>
                  <X size={14} />
                </button>
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
                {results.succeeded.map((s, i) => (
                  <div key={i} style={{ padding: '8px 12px', borderBottom: '1px solid #f6f3ec', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <CheckCircle2 size={14} style={{ color: '#237A4B', flexShrink: 0 }} />
                    <b>{s.name}</b>
                    <span style={{ color: '#8A641C', fontSize: 11 }}>→ {s.industry}</span>
                    <a href={s.url} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', color: '#2563eb', fontSize: 11 }}>{s.url.replace(/^https?:\/\//, '').slice(0, 30)}</a>
                  </div>
                ))}
                {results.failed.map((f, i) => (
                  <div key={i} style={{ padding: '8px 12px', borderBottom: '1px solid #f6f3ec', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <AlertCircle size={14} style={{ color: '#C63D34', flexShrink: 0 }} />
                    <span style={{ color: '#666' }}>{f.url}</span>
                    <span style={{ marginLeft: 'auto', color: '#C63D34', fontSize: 11 }}>{f.error}</span>
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