import { useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function ToolCard({ tool, companies, audits }) {
  const [params, setParams] = useState({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const setParam = (key, value) => setParams(prev => ({ ...prev, [key]: value }));

  const run = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const payload = { ...params };
      for (const [k, v] of Object.entries(payload)) {
        if (v === '' || v === null) delete payload[k];
      }
      const res = await base44.functions.invoke(tool.id, payload);
      setResult(res.data || res);
      setShowResult(true);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Execution failed');
      setShowResult(true);
    } finally {
      setRunning(false);
    }
  };

  const renderInput = (param) => {
    const common = {
      value: params[param.key] || '',
      onChange: e => setParam(param.key, e.target.value),
      disabled: running,
      style: { width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 5, fontSize: 12, fontFamily: 'inherit', background: '#fff' }
    };
    switch (param.type) {
      case 'company_select':
        return (
          <select {...common}>
            <option value="">Select company…</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        );
      case 'audit_select':
        return (
          <select {...common}>
            <option value="">Select audit…</option>
            {audits.map(a => <option key={a.id} value={a.id}>{a.title || a.id}</option>)}
          </select>
        );
      case 'select':
        return (
          <select {...common}>
            <option value="">Select…</option>
            {param.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      case 'textarea':
        return <textarea {...common} placeholder={param.placeholder} rows={3} style={{ ...common.style, resize: 'vertical' }} />;
      default:
        return <input {...common} placeholder={param.placeholder} />;
    }
  };

  const resultStr = result ? JSON.stringify(result, null, 2) : '';
  const isSuccess = result && (result.status === 'success' || result.status === 'passed' || result.status === 'warnings');

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 1px 3px #0000000a' }}>
      <div>
        <b style={{ fontSize: 13 }}>{tool.label}</b>
        <p style={{ fontSize: 11, color: '#888', margin: '3px 0 0', lineHeight: 1.4 }}>{tool.desc}</p>
      </div>
      {tool.params.length > 0 && (
        <div style={{ display: 'grid', gap: 5 }}>
          {tool.params.map(p => (
            <div key={p.key}>
              <label style={{ fontSize: 9, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 2 }}>{p.label}</label>
              {renderInput(p)}
            </div>
          ))}
        </div>
      )}
      <button
        onClick={run}
        disabled={running}
        style={{
          padding: '8px 14px', borderRadius: 5, fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: running ? 'wait' : 'pointer',
          background: running ? '#ccc' : '#0b0b0b', color: '#fff', border: 0, transition: 'all .15s'
        }}
      >
        {running ? '⏳ Running…' : '▶ Run'}
      </button>
      {error && (
        <div style={{ fontSize: 11, color: '#a52d23', background: '#fdf0f0', padding: '8px', borderRadius: 4, lineHeight: 1.4 }}>{error}</div>
      )}
      {result && showResult && (
        <div style={{ borderTop: '1px solid #eee', paddingTop: 8 }}>
          <div
            onClick={() => setShowResult(!showResult)}
            style={{ cursor: 'pointer', fontSize: 11, fontWeight: 700, color: isSuccess ? '#237A4B' : '#B88214', display: 'flex', justifyContent: 'space-between' }}
          >
            <span>{isSuccess ? '✓ Success' : '⚠ Result'} — {result.status || 'done'}</span>
            <span>{showResult ? '▲' : '▼'}</span>
          </div>
          {showResult && (
            <pre style={{ fontSize: 10, color: '#555', background: '#f8f7f4', padding: 8, borderRadius: 4, overflow: 'auto', maxHeight: 300, margin: '6px 0 0', lineHeight: 1.4 }}>
              {resultStr.substring(0, 3000)}{resultStr.length > 3000 ? '\n…(truncated)' : ''}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}