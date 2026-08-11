import { Loader2, Check, RotateCw } from 'lucide-react';
import { useState } from 'react';

/* ---------- Layout primitives ---------- */
export function Card({ step, label, status, children, accent = '#C89B3C' }) {
  const statusColor = {
    pending: '#666',
    running: '#2563eb',
    done: '#237A4B',
    error: '#C63D34',
    skipped: '#999',
  }[status] || '#666';
  return (
    <div style={{
      background: '#fff', border: `1px solid ${status === 'running' ? accent : '#e2e2e2'}`,
      borderRadius: 14, padding: 22, marginBottom: 16,
      boxShadow: status === 'running' ? `0 0 0 3px ${accent}22` : '0 2px 8px rgba(0,0,0,.04)',
      transition: 'border-color .2s, box-shadow .2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, display: 'grid', placeItems: 'center', flexShrink: 0,
          background: status === 'done' ? '#237A4B' : status === 'running' ? accent : '#f3f3f3',
          color: status === 'done' || status === 'running' ? '#fff' : '#999', fontWeight: 700, fontSize: 14,
        }}>
          {status === 'done' ? <Check size={18} /> : status === 'running' ? <Loader2 size={18} className="animate-spin" /> : step}
        </div>
        <div style={{ flex: 1 }}>
          <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 19, display: 'block', lineHeight: 1.1 }}>{label}</b>
        </div>
        <StatusPill status={status} />
      </div>
      {children}
    </div>
  );
}

export function StatusPill({ status }) {
  const map = {
    pending: { bg: '#f0f0f0', color: '#888', label: 'Pending' },
    running: { bg: '#dbeafe', color: '#2563eb', label: 'Running' },
    done: { bg: '#d4edda', color: '#237A4B', label: 'Done' },
    error: { bg: '#f5d8d5', color: '#C63D34', label: 'Failed' },
    skipped: { bg: '#eee', color: '#999', label: 'Skipped' },
  };
  const s = map[status] || map.pending;
  return <span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.08em', background: s.bg, color: s.color, padding: '4px 10px', borderRadius: 12 }}>{s.label}</span>;
}

export function ErrorBox({ text, onRetry }) {
  return (
    <div style={{ marginTop: 12, padding: 14, borderRadius: 8, background: '#f5d8d5', border: '1px solid #C63D34', color: '#a52d23', fontSize: 13 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ flex: 1 }}>{text}</span>
        {onRetry && <button onClick={onRetry} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#C63D34', color: '#fff', border: 0, borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}><RotateCw size={12} /> Retry</button>}
      </div>
    </div>
  );
}

export function SuccessBox({ children }) {
  return <div style={{ marginTop: 12, padding: 14, borderRadius: 8, background: '#e8f5ec', border: '1px solid #237A4B', color: '#237A4B', fontSize: 13 }}>{children}</div>;
}

export function BtnGold({ disabled, children, onClick, style }) {
  return <button onClick={onClick} disabled={disabled} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', background: disabled ? '#bbb' : 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: disabled ? 'wait' : 'pointer', ...style }}>{children}</button>;
}
export function BtnDark({ disabled, children, onClick, style }) {
  return <button onClick={onClick} disabled={disabled} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', background: disabled ? '#333' : '#0a0a0a', color: '#E7C86E', border: '1px solid #333', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: disabled ? 'wait' : 'pointer', ...style }}>{children}</button>;
}
export function BtnOutline({ children, onClick, style }) {
  return <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 18px', background: '#fff', color: '#666', border: '1px solid #ddd', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', ...style }}>{children}</button>;
}

export function Log({ lines }) {
  if (!lines?.length) return null;
  return (
    <div style={{ marginTop: 12, background: '#0a0a0a', color: '#E7C86E', borderRadius: 8, padding: 14, fontFamily: 'ui-monospace, monospace', fontSize: 12, lineHeight: 1.8, maxHeight: 200, overflowY: 'auto' }}>
      {lines.map((l, i) => <div key={i}>› {l}</div>)}
    </div>
  );
}

export function useLog() {
  const [lines, setLines] = useState([]);
  const push = (m) => setLines(prev => [...prev, m]);
  const reset = () => setLines([]);
  return { lines, push, reset };
}