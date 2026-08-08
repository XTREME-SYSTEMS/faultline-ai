import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Copy, ExternalLink, Loader2, Rocket, Globe, Cloud, Github, Database } from 'lucide-react';

const CAT_LABEL = {
  epoxy_metallic: 'Metallic Epoxy', epoxy_flake: 'Flake Epoxy', epoxy_quartz: 'Quartz Epoxy',
  epoxy_solid_color: 'Solid Epoxy', concrete_polished: 'Polished Concrete', concrete_stained: 'Stained Concrete',
  concrete_decorative: 'Decorative Concrete', commercial_flooring: 'Commercial', residential_flooring: 'Residential'
};

export default function ClonedSystems() {
  const [cloned, setCloned] = useState([]);
  const [launches, setLaunches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [c, l] = await Promise.all([
          base44.entities.UniversalCatalog.filter({ clone_status: 'cloned' }, '-created_date', 100),
          base44.entities.LaunchProject.list('-created_date', 50)
        ]);
        setCloned(c || []);
        setLaunches(l || []);
      } catch (e) { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div style={{ padding: 28, textAlign: 'center', color: '#888' }}>
      <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
      <div style={{ fontSize: 12 }}>Loading cloned systems…</div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* Cloned catalog items */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Copy size={16} style={{ color: 'var(--gold)' }} />
          <b style={{ fontSize: 14 }}>Cloned Systems</b>
          <span style={{ background: 'var(--gold)', color: '#111', borderRadius: 10, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>{cloned.length}</span>
        </div>
        {cloned.length === 0 ? (
          <div style={{ padding: 20, border: '1px dashed #ddd', borderRadius: 8, color: '#888', fontSize: 12 }}>
            No cloned systems yet. Run a clone cycle from the Universal Database to clone discovered sites.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {cloned.map(c => (
              <div key={c.id} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <b style={{ fontSize: 13, lineHeight: 1.3 }}>{c.name}</b>
                  {c.url && <a href={c.url} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)', flexShrink: 0 }}><ExternalLink size={14} /></a>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, background: '#f4f1ea', color: '#8A641C', padding: '2px 8px', borderRadius: 10 }}>{CAT_LABEL[c.category] || c.category}</span>
                  <span style={{ fontSize: 10, background: '#e6f4ec', color: '#237A4B', padding: '2px 8px', borderRadius: 10 }}>✓ Cloned</span>
                </div>
                {c.niche && <small style={{ fontSize: 11, color: '#888', lineHeight: 1.4 }}>{c.niche}</small>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Launched projects */}
      {launches.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Rocket size={16} style={{ color: 'var(--gold)' }} />
            <b style={{ fontSize: 14 }}>Launched Projects</b>
            <span style={{ background: '#8A641C', color: '#fff', borderRadius: 10, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>{launches.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {launches.map(p => {
              const vercelUrl = p.vercel_deployment_url || p.vercel_project_url;
              const proofLinks = [
                { url: p.drive_folder_url, Icon: Cloud, label: 'Drive', color: '#4285F4' },
                { url: p.github_repo_url, Icon: Github, label: 'GitHub', color: '#181717' },
                { url: vercelUrl, Icon: Globe, label: p.vercel_deployment_url ? 'Live Site' : 'Vercel', color: '#000' },
                { url: p.supabase_project_url, Icon: Database, label: 'Supabase', color: '#3ECF8E' }
              ].filter(l => l.url);
              return (
                <div key={p.id} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <b style={{ fontSize: 13, lineHeight: 1.3 }}>{p.project_name}</b>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, flexShrink: 0, background: p.status === 'passed' ? '#e6f4ec' : p.status === 'failed' ? '#f5d8d5' : '#f8e5ce', color: p.status === 'passed' ? '#237A4B' : p.status === 'failed' ? '#a52d23' : '#8A641C' }}>{p.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, background: '#f4f1ea', color: '#8A641C', padding: '2px 8px', borderRadius: 10 }}>{p.project_type}</span>
                    {p.parity_score != null && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: p.parity_score >= 90 ? '#e6f4ec' : p.parity_score >= 60 ? '#f8e5ce' : '#f5d8d5', color: p.parity_score >= 90 ? '#237A4B' : p.parity_score >= 60 ? '#8A641C' : '#a52d23' }}>{p.parity_score}/100</span>}
                  </div>
                  {proofLinks.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {proofLinks.map((l, i) => {
                        const Icon = l.Icon;
                        return (
                          <a key={i} href={l.url} target="_blank" rel="noreferrer" title={`Open ${l.label} proof`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 6, border: '1px solid #e5e1da', background: '#faf9f5', fontSize: 10, fontWeight: 700, color: '#333', textDecoration: 'none' }}>
                            <Icon size={12} style={{ color: l.color }} /> {l.label}
                          </a>
                        );
                      })}
                    </div>
                  )}
                  {p.domain_name && <small style={{ fontSize: 11, color: '#888' }}>{p.domain_name}</small>}
                  {p.vercel_deployment_url && (
                    <a href={p.vercel_deployment_url} target="_blank" rel="noreferrer" style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 6, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                      <Globe size={14} /> View Live Site
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}