import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, ExternalLink, Loader2, FileText, TrendingUp, Target, DollarSign, Cpu, Users, Lightbulb, BarChart3, AlertCircle, Rocket, Search, Building2, Globe, Megaphone, PenLine, Eye, Gauge, CheckCircle2, RefreshCw } from 'lucide-react';

const SECTIONS = [
  { key: 'discovery_summary', label: 'Discovery Summary', icon: Search },
  { key: 'financial_summary', label: 'Financial Summary', icon: DollarSign },
  { key: 'strategy_summary', label: 'Strategy Summary', icon: TrendingUp },
  { key: 'niche_summary', label: 'Niche Summary', icon: Target },
  { key: 'stack_summary', label: 'Stack Summary', icon: Cpu },
  { key: 'target_market_summary', label: 'Target Market', icon: Users },
  { key: 'financial_intelligence_summary', label: 'Financial Intelligence', icon: BarChart3 },
  { key: 'ai_enhancement_summary', label: 'AI Enhancement', icon: Lightbulb },
  { key: 'estimated_profit_margin_yearly', label: 'Est. Profit Margin (Yearly)', icon: DollarSign },
  { key: 'customer_base', label: 'Customer Base', icon: Users },
  { key: 'monetization_strategy', label: 'Monetization Strategy', icon: Rocket },
  { key: 'competitive_landscape', label: 'Competitive Landscape', icon: Building2 },
  { key: 'growth_trajectory', label: 'Growth Trajectory', icon: TrendingUp },
  { key: 'content_strategy', label: 'Content Strategy', icon: PenLine },
  { key: 'ux_assessment', label: 'UX Assessment', icon: Eye },
  { key: 'seo_strength', label: 'SEO Strength', icon: Gauge },
  { key: 'overall_assessment', label: 'Overall Assessment', icon: CheckCircle2 },
  { key: 'clone_recommendation', label: 'Clone Recommendation', icon: Rocket }
];

function Section({ icon: Icon, title, children }) {
  if (!children) return null;
  return (
    <div style={{ borderBottom: '1px solid #eee', padding: '18px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon size={16} style={{ color: 'var(--gold)' }} />
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{title}</h3>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: '#444', whiteSpace: 'pre-wrap' }}>{children}</div>
    </div>
  );
}

function ListSection({ icon: Icon, title, items }) {
  if (!items || !items.length) return null;
  return (
    <div style={{ borderBottom: '1px solid #eee', padding: '18px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon size={16} style={{ color: 'var(--gold)' }} />
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{title}</h3>
      </div>
      <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
        {items.map((item, i) => <li key={i} style={{ fontSize: 13, lineHeight: 1.6, color: '#444' }}>{item}</li>)}
      </ul>
    </div>
  );
}

export default function BenchmarkReport({ project, onClose }) {
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState(project.benchmark_report || null);
  const [error, setError] = useState(null);
  const benchmarkUrl = project.benchmark_url || project.metadata?.target_url;

  const generate = async () => {
    if (!benchmarkUrl) { setError('No benchmark URL found for this project.'); return; }
    setGenerating(true); setError(null);
    try {
      const res = await base44.functions.invoke('discoverBenchmarkSite', {
        target_url: benchmarkUrl, industry: project.industry,
        business_name: project.business_name || project.project_name,
        launch_project_id: project.id
      });
      const r = res?.data || res;
      if (r.report) setReport(r.report);
      else if (r.error) setError(r.error);
    } catch (e) { setError(e.message); }
    finally { setGenerating(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: 'min(900px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e1da', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <p className="eyebrow" style={{ margin: '0 0 4px' }}>Benchmark Discovery & Audit</p>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{project.project_name || project.business_name}</h2>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {benchmarkUrl && (
              <a href={benchmarkUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, background: '#f4f1ea', color: '#8A641C', fontSize: 12, fontWeight: 700, border: '1px solid #d9c8aa', textDecoration: 'none' }}>
                <ExternalLink size={14} /> Open Benchmark Site
              </a>
            )}
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
          {!report && !generating && (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <FileText size={40} style={{ color: '#ccc', margin: '0 auto 14px' }} />
              <p style={{ fontSize: 14, color: '#666', marginBottom: 18 }}>No discovery report yet. Generate an exhaustive audit of the benchmark site.</p>
              {error && <p style={{ fontSize: 13, color: '#a52d23', marginBottom: 12 }}>{error}</p>}
              <button onClick={generate} disabled={!benchmarkUrl} style={{ padding: '12px 24px', borderRadius: 6, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: benchmarkUrl ? 'pointer' : 'not-allowed', background: benchmarkUrl ? 'linear-gradient(135deg, #E7C86E, #C89B3C)' : '#ccc', color: '#111', border: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <FileText size={16} /> Generate Discovery Report
              </button>
            </div>
          )}
          {generating && (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--gold)', margin: '0 auto 14px' }} />
              <p style={{ fontSize: 14, color: '#666' }}>Researching benchmark site with AI + web search…</p>
              <p style={{ fontSize: 12, color: '#999', marginTop: 6 }}>This takes 30-60 seconds for an exhaustive report.</p>
            </div>
          )}
          {report && (
            <>
              {report.generated_at && <p style={{ fontSize: 11, color: '#999', paddingTop: 14 }}>Generated {new Date(report.generated_at).toLocaleString()}</p>}
              {SECTIONS.map(s => <Section key={s.key} icon={s.icon} title={s.label}>{report[s.key]}</Section>)}
              <ListSection icon={AlertCircle} title="Strengths" items={report.strengths} />
              <ListSection icon={AlertCircle} title="Weaknesses" items={report.weaknesses} />
              <ListSection icon={Lightbulb} title="Opportunities" items={report.opportunities} />
              <ListSection icon={AlertCircle} title="Threats" items={report.threats} />
              <ListSection icon={Cpu} title="Tech Stack Detected" items={report.tech_stack_detected} />
              <ListSection icon={DollarSign} title="Revenue Streams" items={report.revenue_streams} />
              <ListSection icon={Megaphone} title="Marketing Channels" items={report.marketing_channels} />
              {report.key_metrics && Object.keys(report.key_metrics).length > 0 && (
                <div style={{ borderBottom: '1px solid #eee', padding: '18px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <BarChart3 size={16} style={{ color: 'var(--gold)' }} />
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Key Metrics</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                    {Object.entries(report.key_metrics).map(([k, v]) => (
                      <div key={k} style={{ background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 6, padding: '10px 12px' }}>
                        <small style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k.replace(/_/g, ' ')}</small>
                        <b style={{ fontSize: 14, display: 'block', marginTop: 2 }}>{String(v)}</b>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ padding: '18px 0' }}>
                <button onClick={generate} disabled={generating} style={{ padding: '10px 20px', borderRadius: 6, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', background: '#f4f1ea', color: '#8A641C', border: '1px solid #d9c8aa', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Regenerate Report
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}