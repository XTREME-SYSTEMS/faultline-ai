import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  X, Loader2, Globe, ExternalLink, Server, DollarSign, Target,
  TrendingUp, Users, Layers, Palette, CheckCircle2, AlertCircle,
} from 'lucide-react';

export default function SiteSpecsModal({ clone, onClose }) {
  const [specs, setSpecs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await base44.functions.invoke('getSiteSpecs', {
          launch_project_id: clone.id,
        });
        const d = res.data || res;
        if (d.error) throw new Error(d.error);
        setSpecs(d.specs);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [clone.id]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 12, width: 'min(800px, 100%)', maxHeight: '85vh',
        overflow: 'auto', display: 'flex', flexDirection: 'column',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          background: 'radial-gradient(circle at 82% 40%, #C89B3C45, transparent 25%), #0a0a0a',
          color: '#fff', padding: '24px 28px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', borderRadius: '12px 12px 0 0',
        }}>
          <div>
            <p style={{ color: '#E7C86E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>Site Specs</p>
            <h2 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 30, margin: '6px 0 4px', letterSpacing: '-.03em' }}>
              {clone.name || 'Unknown Site'}
            </h2>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
              {clone.target_url && (
                <a href={clone.target_url} target="_blank" rel="noreferrer" style={{ color: '#aaa', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Globe size={12} /> Original Site
                </a>
              )}
              {clone.url && (
                <a href={clone.url} target="_blank" rel="noreferrer" style={{ color: '#E7C86E', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ExternalLink size={12} /> Vercel Clone
                </a>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4, color: '#aaa' }}>
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 28, flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block', color: '#C89B3C' }} />
              Analyzing site specs…
            </div>
          ) : error ? (
            <div style={{ padding: 16, background: '#f5d8d5', borderRadius: 8, color: '#a52d23', fontSize: 13 }}>
              {error}
            </div>
          ) : specs ? (
            <div style={{ display: 'grid', gap: 20 }}>
              {/* Key metrics row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <SpecCard icon={CheckCircle2} label="Parity Score" value={`${specs.parity_score || 0}/100`} color={specs.parity_score >= 100 ? '#237A4B' : '#B88214'} />
                <SpecCard icon={Layers} label="Industry" value={specs.industry || 'N/A'} color="#C89B3C" />
                <SpecCard icon={DollarSign} label="Est. ROI" value={typeof specs.estimated_roi === 'number' ? `${specs.estimated_roi}%` : (specs.estimated_roi || 'N/A')} color="#237A4B" />
                <SpecCard icon={AlertCircle} label="Audit" value={specs.audit_passed ? 'Passed' : 'N/A'} color={specs.audit_passed ? '#237A4B' : '#B88214'} />
              </div>

              {/* Full Stack */}
              <Section title="Full Stack" icon={Server}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  <StackItem label="Frontend" value={specs.full_stack?.frontend} />
                  <StackItem label="Backend" value={specs.full_stack?.backend} />
                  <StackItem label="Database" value={specs.full_stack?.database} />
                  <StackItem label="Hosting" value={specs.full_stack?.hosting} />
                  <StackItem label="CMS" value={specs.full_stack?.cms} />
                  <StackItem label="Tech Stack" value={(specs.tech_stack || []).join(', ') || 'Unknown'} />
                </div>
              </Section>

              {/* Target Market & Monetization */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Section title="Target Market" icon={Target}>
                  <p style={{ fontSize: 13, color: '#555', margin: 0, lineHeight: 1.6 }}>
                    {specs.target_market || 'Not yet analyzed'}
                  </p>
                </Section>
                <Section title="Monetization" icon={DollarSign}>
                  <p style={{ fontSize: 13, color: '#555', margin: 0, lineHeight: 1.6 }}>
                    {specs.monetization || 'Unknown'}
                  </p>
                </Section>
              </div>

              {/* Financials */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <SpecCard icon={TrendingUp} label="Profit Margin" value={specs.profit_margin || 'N/A'} color="#237A4B" />
                <SpecCard icon={Users} label="Customer Base" value={specs.customer_base || 'N/A'} color="#2563eb" />
                <SpecCard icon={DollarSign} label="Revenue Model" value={specs.monetization || 'N/A'} color="#C89B3C" />
              </div>

              {/* Key Features */}
              {specs.key_features && specs.key_features.length > 0 && (
                <Section title="Key Features" icon={Layers}>
                  <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
                    {specs.key_features.map((f, i) => (
                      <li key={i} style={{ fontSize: 13, color: '#555' }}>{typeof f === 'string' ? f : f.name || JSON.stringify(f)}</li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Navigation Structure */}
              {specs.nav_structure && specs.nav_structure.length > 0 && (
                <Section title="Site Structure" icon={Layers}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {specs.nav_structure.map((nav, i) => (
                      <span key={i} style={{ padding: '4px 12px', background: '#f8f7f4', border: '1px solid #eee', borderRadius: 20, fontSize: 11, color: '#666' }}>
                        {typeof nav === 'string' ? nav : nav.label || nav.text || JSON.stringify(nav)}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Colors */}
              {(specs.colors?.primary || specs.colors?.secondary) && (
                <Section title="Brand Colors" icon={Palette}>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {specs.colors.primary && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: specs.colors.primary, border: '1px solid #ddd' }} />
                        <div>
                          <small style={{ color: '#888', fontSize: 10 }}>Primary</small>
                          <b style={{ display: 'block', fontSize: 12 }}>{specs.colors.primary}</b>
                        </div>
                      </div>
                    )}
                    {specs.colors.secondary && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: specs.colors.secondary, border: '1px solid #ddd' }} />
                        <div>
                          <small style={{ color: '#888', fontSize: 10 }}>Secondary</small>
                          <b style={{ display: 'block', fontSize: 12 }}>{specs.colors.secondary}</b>
                        </div>
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {/* Benchmark Report */}
              {specs.benchmark && (
                <Section title="Benchmark Analysis" icon={TrendingUp}>
                  <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>
                    {typeof specs.benchmark === 'string' ? specs.benchmark : (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {specs.benchmark.overview && <p style={{ margin: 0 }}>{specs.benchmark.overview}</p>}
                        {specs.benchmark.niche && <p style={{ margin: 0 }}><b>Niche:</b> {specs.benchmark.niche}</p>}
                        {specs.benchmark.strategy && <p style={{ margin: 0 }}><b>Strategy:</b> {specs.benchmark.strategy}</p>}
                        {specs.benchmark.ai_enhancement && <p style={{ margin: 0 }}><b>AI Enhancement:</b> {specs.benchmark.ai_enhancement}</p>}
                        {specs.benchmark.superiority_strategy && (
                          <p style={{ margin: 0 }}><b>Superiority Strategy:</b> {typeof specs.benchmark.superiority_strategy === 'object' ? JSON.stringify(specs.benchmark.superiority_strategy) : specs.benchmark.superiority_strategy}</p>
                        )}
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {/* Audit Summary */}
              {specs.audit_summary && (
                <Section title="Forensic Audit" icon={CheckCircle2}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {specs.audit_passed ? <CheckCircle2 size={18} style={{ color: '#237A4B', flexShrink: 0, marginTop: 2 }} /> : <AlertCircle size={18} style={{ color: '#B88214', flexShrink: 0, marginTop: 2 }} />}
                    <p style={{ fontSize: 13, color: '#555', margin: 0, lineHeight: 1.6 }}>{specs.audit_summary}</p>
                  </div>
                </Section>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SpecCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{ background: '#f8f7f4', border: '1px solid #eee', borderRadius: 8, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon size={14} style={{ color }} />
        <small style={{ color: '#888', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</small>
      </div>
      <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 18, color, display: 'block', wordBreak: 'break-word' }}>{value}</b>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Icon size={16} style={{ color: '#C89B3C' }} />
        <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 18, margin: 0 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function StackItem({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8f7f4', borderRadius: 6 }}>
      <small style={{ color: '#888', fontSize: 11 }}>{label}</small>
      <b style={{ fontSize: 12, color: '#333' }}>{value || 'Unknown'}</b>
    </div>
  );
}