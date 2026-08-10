import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Shield, AlertCircle, CheckCircle2, Loader2, Sparkles, Brain,
  ChevronDown, ChevronUp, X, RefreshCw, ExternalLink, TrendingUp,
} from 'lucide-react';

// Clone Health Card — shows how many gallery clones are at 100/100 vs. how many
// have errors. The "Self-Reflect & Heal All" button triggers the
// selfReflectAndHeal backend function, which uses LLM self-reflection to
// identify root causes across all failing clones, generates targeted fix
// directives, then runs the autonomous recursive heal loop on each one.
export default function CloneHealthCard() {
  const [stats, setStats] = useState({ total: 0, at100: 0, failing: 0, failingList: [] });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [healing, setHealing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const projects = await base44.entities.LaunchProject.list('-created_date', 200).catch(() => []);
      const gallery = projects.filter(p => p.vercel_deployment_url || p.metadata?.vercel_deployment_url);
      const at100 = gallery.filter(p => (p.parity_score || 0) >= 100);
      const failing = gallery
        .filter(p => (p.parity_score || 0) < 100)
        .sort((a, b) => (a.parity_score || 0) - (b.parity_score || 0));

      setStats({
        total: gallery.length,
        at100: at100.length,
        failing: failing.length,
        failingList: failing.slice(0, 20),
      });
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSelfReflectHeal() {
    setHealing(true);
    setError('');
    setResult(null);
    try {
      const res = await base44.functions.invoke('selfReflectAndHeal', {
        heal_limit: 5,
        max_iterations: 3,
      });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      setResult(d);
      setTimeout(load, 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setHealing(false);
    }
  }

  const healthPct = stats.total > 0 ? Math.round((stats.at100 / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 12, padding: 20, marginBottom: 13 }}>
        <Loader2 size={20} className="animate-spin" style={{ color: '#C89B3C' }} /> Loading clone health…
      </div>
    );
  }

  return (
    <div style={{
      background: '#fff', border: `1px solid ${stats.failing > 0 ? '#f5d8d5' : '#d4edda'}`,
      borderRadius: 12, marginBottom: 13, overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,.04)',
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: stats.failing > 0 ? '#fff5f4' : '#f0faf3',
          border: 0, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: stats.failing > 0 ? 'linear-gradient(135deg, #f5d8d5, #C63D34)' : 'linear-gradient(135deg, #d4edda, #237A4B)',
            display: 'grid', placeItems: 'center',
          }}>
            <Shield size={20} style={{ color: '#fff' }} />
          </div>
          <span style={{ textAlign: 'left' }}>
            <b style={{ fontSize: 15, color: stats.failing > 0 ? '#C63D34' : '#237A4B', display: 'flex', alignItems: 'center', gap: 6 }}>
              Clone Health Guardian
              {stats.failing > 0 && (
                <span style={{ padding: '2px 8px', borderRadius: 4, background: '#C63D34', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                  {stats.failing} NEED HEALING
                </span>
              )}
            </b>
            <small style={{ fontSize: 12, color: '#888' }}>
              {stats.at100} perfect · {stats.failing} with errors · {stats.total} total clones
            </small>
          </span>
        </span>
        {open ? <ChevronUp size={18} style={{ color: '#999' }} /> : <ChevronDown size={18} style={{ color: '#999' }} />}
      </button>

      {open && (
        <div style={{ padding: '0 20px 20px' }}>
          {/* Big stat row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
            <StatBox
              label="Perfect (100/100)"
              value={stats.at100}
              icon={CheckCircle2}
              color="#237A4B"
              bg="#f0faf3"
            />
            <StatBox
              label="With Errors"
              value={stats.failing}
              icon={AlertCircle}
              color="#C63D34"
              bg="#fff5f4"
            />
            <StatBox
              label="Health Rate"
              value={`${healthPct}%`}
              icon={TrendingUp}
              color={healthPct >= 80 ? '#237A4B' : '#B88214'}
              bg="#f8f7f4"
            />
          </div>

          {/* Self-Reflect & Heal button */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={handleSelfReflectHeal}
              disabled={healing || stats.failing === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px',
                background: healing ? '#666' : 'linear-gradient(135deg, #E7C86E, #C89B3C)',
                color: '#111', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 13,
                cursor: healing || stats.failing === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {healing ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
              {healing ? 'Self-Reflecting & Healing…' : 'Self-Reflect & Heal All'}
            </button>
            <span style={{ fontSize: 12, color: '#888' }}>
              AI analyzes all errors, identifies root causes, then autonomously heals each clone to 100/100
            </span>
            <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 0, cursor: 'pointer', color: '#999', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div style={{ marginTop: 12, padding: 12, background: '#f5d8d5', borderRadius: 8, color: '#a52d23', fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Self-reflection result */}
          {result && (
            <div style={{ marginTop: 14 }}>
              {/* Summary */}
              <div style={{
                padding: 16, borderRadius: 8,
                background: result.status === 'all_perfect' ? '#e8f5ec' : result.status === 'all_healed' ? '#e8f5ec' : '#fff8e8',
                border: `1px solid ${result.status === 'all_perfect' || result.status === 'all_healed' ? '#237A4B' : '#B88214'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <b style={{ fontSize: 14, color: result.status === 'all_healed' || result.status === 'all_perfect' ? '#237A4B' : '#B88214' }}>
                    <Sparkles size={16} style={{ display: 'inline', marginRight: 6 }} />
                    {result.status === 'all_perfect' ? 'All Clones Perfect!' : result.status === 'all_healed' ? 'All Clones Healed to 100/100!' : 'Partial Heal — Some Clones Still Failing'}
                  </b>
                  <button onClick={() => setResult(null)} style={{ background: 'none', border: 0, cursor: 'pointer' }}>
                    <X size={16} color="#999" />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
                  <span><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 20 }}>{result.total_gallery}</b> total</span>
                  <span style={{ color: '#237A4B' }}><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 20 }}>{result.at_100}</b> at 100/100</span>
                  {result.healed > 0 && <span style={{ color: '#237A4B' }}><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 20 }}>{result.healed}</b> healed</span>}
                  {result.still_failing > 0 && <span style={{ color: '#C63D34' }}><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 20 }}>{result.still_failing}</b> still failing</span>}
                </div>
              </div>

              {/* Self-reflection analysis */}
              {result.reflection && (result.reflection.root_causes?.length > 0 || result.reflection.patterns_identified) && (
                <div style={{ marginTop: 12, padding: 14, background: '#f8f7f4', border: '1px solid #d9c8aa', borderRadius: 8 }}>
                  <b style={{ fontSize: 13, color: '#8A641C', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Brain size={14} /> AI Self-Reflection — Root Cause Analysis
                  </b>
                  {result.reflection.patterns_identified && (
                    <p style={{ fontSize: 12, color: '#666', margin: '0 0 10px', lineHeight: 1.5 }}>
                      {result.reflection.patterns_identified}
                    </p>
                  )}
                  {result.reflection.root_causes?.length > 0 && (
                    <div style={{ display: 'grid', gap: 4 }}>
                      {result.reflection.root_causes.map((cause, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: '#555' }}>
                          <span style={{ color: '#C89B3C', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                          <span>{cause}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Per-clone heal results */}
              {result.results?.length > 0 && (
                <div style={{ marginTop: 12, border: '1px solid #eee', borderRadius: 8, maxHeight: 250, overflowY: 'auto' }}>
                  {result.results.map((r, i) => (
                    <div key={i} style={{ padding: '10px 14px', borderBottom: '1px solid #f6f3ec', display: 'flex', alignItems: 'center', gap: 10 }}>
                      {r.passed ? (
                        <CheckCircle2 size={14} style={{ color: '#237A4B', flexShrink: 0 }} />
                      ) : (
                        <AlertCircle size={14} style={{ color: '#C63D34', flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ fontSize: 13, display: 'block' }}>{r.name}</b>
                        {r.fix_directives && (
                          <small style={{ fontSize: 11, color: '#888', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Fix: {r.fix_directives}
                          </small>
                        )}
                        {r.error && (
                          <small style={{ fontSize: 11, color: '#C63D34', display: 'block' }}>Error: {r.error}</small>
                        )}
                      </div>
                      <span style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 14, flexShrink: 0, whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#C63D34' }}>{r.before}</span>
                        <span style={{ color: '#999', margin: '0 4px' }}>→</span>
                        <span style={{ color: r.passed ? '#237A4B' : '#B88214' }}>{r.after}</span>
                      </span>
                      {r.vercel_url && (
                        <a href={r.vercel_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', flexShrink: 0 }}>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Failing clones list */}
          {stats.failing > 0 && !result && (
            <div style={{ marginTop: 14 }}>
              <small style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#888', marginBottom: 8, display: 'block' }}>
                Clones Needing Healing ({stats.failing})
              </small>
              <div style={{ border: '1px solid #eee', borderRadius: 8, maxHeight: 200, overflowY: 'auto' }}>
                {stats.failingList.map(p => (
                  <div key={p.id} style={{ padding: '10px 14px', borderBottom: '1px solid #f6f3ec', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertCircle size={14} style={{ color: '#C63D34', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: 13, display: 'block' }}>{p.project_name || 'Unknown'}</b>
                      <small style={{ fontSize: 11, color: '#999', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.last_validation_summary || 'No validation summary'}
                      </small>
                    </div>
                    <span style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 14, color: '#C63D34', flexShrink: 0 }}>
                      {p.parity_score || 0}<small style={{ fontSize: 8 }}>/100</small>
                    </span>
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

function StatBox({ label, value, icon: Icon, color, bg }) {
  return (
    <div style={{ background: bg, borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={14} style={{ color }} />
        <small style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</small>
      </div>
      <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 28, color }}>{value}</b>
    </div>
  );
}