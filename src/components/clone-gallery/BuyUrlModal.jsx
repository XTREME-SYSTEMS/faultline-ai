import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Wand2, Loader2, CheckCircle2, Globe, RefreshCw, ExternalLink, ShoppingCart, ArrowRight } from 'lucide-react';

// Buy URL Modal — AI-powered domain recommendation + purchase flow.
// 1. User types 1-2 words describing the business → AI generates 10 business names + available domains.
// 2. User can retry to get fresh suggestions.
// 3. User picks a name + domain → we assign it to the Vercel project + link to registrar for purchase.
export default function BuyUrlModal({ clone, onClose }) {
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [selected, setSelected] = useState(null);
  const [assignResult, setAssignResult] = useState(null);
  const [attempt, setAttempt] = useState(1);
  const [error, setError] = useState('');

  async function handleAiAssist(e) {
    e?.preventDefault();
    if (!keywords.trim()) return;
    setLoading(true);
    setError('');
    setSuggestions(null);
    setSelected(null);
    setAssignResult(null);
    try {
      const res = await base44.functions.invoke('suggestBusinessDomains', {
        keywords: keywords.trim(),
        industry: clone?.industry,
        attempt,
      });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setSuggestions(d);
    } catch (err) {
      setError(err.message || 'Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  }

  async function handleRetry() {
    setAttempt(a => a + 1);
    await handleAiAssist();
  }

  async function handleApprove() {
    if (!selected) return;
    setAssigning(true);
    setError('');
    setAssignResult(null);
    try {
      // Assign the domain to the Vercel project
      const res = await base44.functions.invoke('assignVercelDomain', {
        launch_project_id: clone.id,
        domain: selected.domain,
      });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setAssignResult(d);
    } catch (err) {
      setError(err.message || 'Failed to assign domain');
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h2 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 24, margin: 0 }}>Buy a URL</h2>
            <p style={{ color: '#999', fontSize: 13, margin: '4px 0 0' }}>
              For <b style={{ color: '#111' }}>{clone?.name}</b> · {clone?.industry}
            </p>
          </div>
          <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
        </div>

        {/* AI Assist input */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 8 }}>
            Describe the business in 1-2 words
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAiAssist()}
              placeholder="e.g. epoxy flooring, coffee shop, gym"
              style={{
                flex: 1, padding: '12px 14px', border: '1px solid #ddd', borderRadius: 8,
                fontSize: 14, fontFamily: 'inherit', outline: 'none',
              }}
            />
            <button
              onClick={handleAiAssist}
              disabled={loading || !keywords.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
                background: loading || !keywords.trim() ? '#ccc' : 'linear-gradient(135deg, #E7C86E, #C89B3C)',
                color: '#111', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 14,
                cursor: loading || !keywords.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              AI Assist
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ margin: '16px 24px', padding: 12, background: '#f5d8d5', borderRadius: 8, color: '#a52d23', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && !suggestions && (
          <div style={{ padding: 60, textAlign: 'center', color: '#999' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block', color: '#C89B3C' }} />
            Generating business names + checking domain availability…
          </div>
        )}

        {/* Suggestions */}
        {suggestions && (
          <div style={{ padding: '16px 24px', maxHeight: 360, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
                <b style={{ color: '#237A4B' }}>{suggestions.available_count}</b> available domains found
              </p>
              <button onClick={handleRetry} disabled={loading} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                background: '#fff', border: '1px solid #ddd', borderRadius: 6,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#666',
              }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Retry
              </button>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {suggestions.suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setSelected(s); setAssignResult(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                    border: selected?.domain === s.domain ? '2px solid #C89B3C' : '1px solid #ddd',
                    background: selected?.domain === s.domain ? '#fdf8ed' : '#fff',
                    textAlign: 'left',
                  }}
                >
                  <div>
                    <b style={{ fontSize: 14 }}>{s.name}</b>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Globe size={12} style={{ color: '#888' }} />
                      <span style={{ fontSize: 12, color: '#2563eb' }}>{s.domain}</span>
                      {s.available === true && (
                        <span style={{ fontSize: 10, color: '#237A4B', fontWeight: 700, background: '#e8f5e9', padding: '2px 6px', borderRadius: 10 }}>
                          AVAILABLE
                        </span>
                      )}
                      {s.available === false && (
                        <span style={{ fontSize: 10, color: '#C63D34', fontWeight: 700, background: '#fdecea', padding: '2px 6px', borderRadius: 10 }}>
                          TAKEN
                        </span>
                      )}
                      {s.price && (
                        <span style={{ fontSize: 11, color: '#666' }}>${s.price}/{s.period}yr</span>
                      )}
                    </div>
                  </div>
                  {selected?.domain === s.domain && <CheckCircle2 size={20} style={{ color: '#C89B3C' }} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Approve + assign section */}
        {selected && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', background: '#f8f7f4' }}>
            {assignResult ? (
              <div style={{ textAlign: 'center' }}>
                <CheckCircle2 size={32} style={{ color: '#237A4B', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>
                  {selected.domain} assigned to your Vercel project!
                </p>
                <p style={{ fontSize: 12, color: '#666', margin: '0 0 12px' }}>
                  To complete the purchase, buy this domain at a registrar, then point DNS to Vercel.
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <a href={`https://www.namecheap.com/domains/registration/results/?domain=${selected.domain}`} target="_blank" rel="noreferrer"
                    style={registrarBtnStyle}>
                    <ShoppingCart size={14} /> Buy on Namecheap
                  </a>
                  <a href={`https://www.godaddy.com/domainsearch/find?domainToCheck=${selected.domain}`} target="_blank" rel="noreferrer"
                    style={registrarBtnStyle}>
                    <ShoppingCart size={14} /> Buy on GoDaddy
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <b style={{ fontSize: 14 }}>{selected.name}</b>
                  <span style={{ fontSize: 12, color: '#2563eb', marginLeft: 8 }}>{selected.domain}</span>
                  {selected.price && <span style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>${selected.price}/yr</span>}
                </div>
                <button onClick={handleApprove} disabled={assigning}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                    background: assigning ? '#ccc' : '#0b0b0b', color: '#fff',
                    border: 0, borderRadius: 8, fontWeight: 700, fontSize: 14,
                    cursor: assigning ? 'wait' : 'pointer',
                  }}>
                  {assigning ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  Approve & Assign
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
};

const modalStyle = {
  background: '#fff', borderRadius: 12, width: 'min(560px, 100%)',
  maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
};

const headerStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  padding: '20px 24px', borderBottom: '1px solid #eee',
};

const closeBtnStyle = {
  background: 'none', border: 0, cursor: 'pointer', padding: 4, color: '#999',
};

const registrarBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px',
  background: '#0b0b0b', color: '#fff', borderRadius: 8, fontSize: 13,
  fontWeight: 700, textDecoration: 'none',
};