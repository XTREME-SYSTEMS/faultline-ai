import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, RefreshCw } from 'lucide-react';

export default function StepName({ form, update, next, back }) {
  const [keywords, setKeywords] = useState(form.industry || '');
  const [industry, setIndustry] = useState(form.industry || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const generate = async () => {
    if (!keywords.trim()) { setError('Enter a keyword or description'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('suggestBusinessDomains', {
        keywords: keywords.trim(), industry: industry.trim() || undefined, attempt: Date.now() % 100,
      });
      const data = res.data || res;
      if (data.error) { setError(data.error); setLoading(false); return; }
      setSuggestions(data.suggestions || []);
    } catch (e) {
      setError(e.message || 'Failed to generate names');
    } finally {
      setLoading(false);
    }
  };

  const pick = (s) => {
    update('business_name', s.name);
    update('domain', s.domain);
    update('industry', industry || keywords);
  };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>Name & Domain Generator</h3>
        <p style={{ fontSize: 13, color: '#666', margin: '0 0 16px' }}>
          Describe your business. The AI generates 10 brandable names with matching available domains.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, flex: 1, minWidth: 200 }}>
            Keywords / Description
            <input value={keywords} onChange={e => setKeywords(e.target.value)}
              placeholder="e.g. epoxy flooring, coffee shop, SaaS dashboard"
              style={{ padding: 11, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, background: '#fff' }} />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, flex: 1, minWidth: 200 }}>
            Industry (optional)
            <input value={industry} onChange={e => setIndustry(e.target.value)}
              placeholder="e.g. Construction, SaaS, Healthcare"
              style={{ padding: 11, border: '1px solid #ddd', borderRadius: 6, fontSize: 13, background: '#fff' }} />
          </label>
          <button onClick={generate} disabled={loading} style={{
            background: '#0a0a0a', color: '#fff', border: 0, borderRadius: 6,
            padding: '11px 20px', fontSize: 13, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
            fontFamily: 'inherit', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </div>
        {error && <p style={{ color: '#a52d23', fontSize: 13, marginTop: 10 }}>{error}</p>}
      </div>

      {suggestions.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 16 }}>
          <h4 style={{ fontSize: 14, margin: '0 0 12px' }}>Pick a Name & Domain</h4>
          <div style={{ display: 'grid', gap: 8 }}>
            {suggestions.map((s, i) => {
              const selected = form.business_name === s.name;
              return (
                <button key={i} onClick={() => pick(s)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 8,
                  border: `2px solid ${selected ? '#C89B3C' : '#e5e1da'}`,
                  background: selected ? '#C89B3C10' : '#fff',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                }}>
                  <b style={{ fontSize: 15, fontFamily: "'Libre Caslon Display', serif", minWidth: 160 }}>{s.name}</b>
                  <span style={{ fontSize: 13, color: '#666' }}>{s.domain}</span>
                  {s.available === true && <span style={{ fontSize: 10, color: '#237A4B', fontWeight: 700, background: '#237A4B15', padding: '3px 8px', borderRadius: 4, marginLeft: 'auto' }}>✓ Available</span>}
                  {s.available === false && <span style={{ fontSize: 10, color: '#999', marginLeft: 'auto' }}>Taken</span>}
                  {selected && <span style={{ fontSize: 12, color: '#C89B3C', fontWeight: 700, marginLeft: 'auto' }}>✓ Selected</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {form.business_name && (
        <div style={{ background: '#f0f9f3', border: '1px solid #c8e6d0', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13 }}>
          ✓ <b>{form.business_name}</b> · {form.domain}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={back} style={{
          background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '14px 28px',
          fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#666',
        }}>← Back</button>
        <button onClick={next} disabled={!form.business_name} style={{
          background: '#0a0a0a', color: '#fff', border: 0, borderRadius: 8, padding: '14px 40px',
          fontSize: 15, fontWeight: 700, cursor: form.business_name ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit', opacity: form.business_name ? 1 : 0.4,
        }}>Continue →</button>
      </div>
    </div>
  );
}