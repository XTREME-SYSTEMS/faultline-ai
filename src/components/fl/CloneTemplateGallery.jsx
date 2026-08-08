import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Shows cloned platform templates (Hostinger, Relume, etc.) as selectable
// website generator templates with live iframe previews. When a template is
// selected, the parent generator passes its design DNA to generateWebsite.
export default function CloneTemplateGallery({ selectedTemplate, onSelect }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        // Fetch cloned LaunchProjects with high parity scores — these become
        // selectable website templates. Hostinger (98/100) is the flagship.
        const projects = await base44.entities.LaunchProject.filter(
          {}, '-parity_score', 30
        );
        // Only include projects with a live Vercel URL and parity >= 80
        const usable = projects
          .filter(p => p.vercel_deployment_url && (p.parity_score || 0) >= 80)
          .map(p => ({
            id: p.id,
            name: p.project_name,
            url: p.vercel_deployment_url,
            score: p.parity_score,
            target: p.metadata?.target_url || '',
            isHostinger: (p.project_name || '').toLowerCase().includes('hostinger') ||
                         (p.metadata?.target_url || '').includes('hostinger')
          }));
        // Put Hostinger first, then by score
        usable.sort((a, b) => {
          if (a.isHostinger && !b.isHostinger) return -1;
          if (!a.isHostinger && b.isHostinger) return 1;
          return (b.score || 0) - (a.score || 0);
        });
        setTemplates(usable.slice(0, 6));
      } catch (e) {
        console.error('CloneTemplateGallery error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#888', fontSize: 13 }}>
        Loading clone templates…
      </div>
    );
  }

  if (templates.length === 0) return null;

  return (
    <div>
      <p style={{ fontSize: 13, color: '#666', margin: '0 0 14px' }}>
        Select a cloned platform as your design template. The generator will replicate its layout, color system, and component structure — then swap in your business content. The flagship template is the <b>Hostinger</b> clone (98/100 parity).
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {templates.map(t => {
          const isSelected = selectedTemplate?.id === t.id;
          const isPreviewing = previewId === t.id;
          return (
            <div key={t.id} style={{
              border: `2px solid ${isSelected ? '#C89B3C' : isPreviewing ? '#0a0a0a' : '#ddd'}`,
              borderRadius: 8, overflow: 'hidden', background: '#fff',
              transition: 'border-color .15s'
            }}>
              {/* Thumbnail / live preview */}
              <div style={{ position: 'relative', height: 160, background: '#f5f5f3', overflow: 'hidden' }}>
                <iframe
                  src={t.url}
                  style={{ width: '1280px', height: '800px', transform: 'scale(0.22)', transformOrigin: 'top left', border: 0, pointerEvents: 'none' }}
                  title={t.name}
                  loading="lazy"
                  sandbox="allow-scripts allow-same-origin"
                />
                {t.isHostinger && (
                  <span style={{ position: 'absolute', top: 8, left: 8, background: '#C89B3C', color: '#111', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 4, letterSpacing: '.08em' }}>FLAGSHIP</span>
                )}
                <span style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.8)', color: '#fff', fontSize: 9, fontWeight: 600, padding: '3px 8px', borderRadius: 4 }}>
                  {t.score}/100
                </span>
              </div>
              {/* Info + actions */}
              <div style={{ padding: '12px 14px' }}>
                <b style={{ fontSize: 13, display: 'block', marginBottom: 2 }}>{t.name.replace('Clone — Full Parity', '').trim() || t.name}</b>
                {t.target && <a href={t.target} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#888', display: 'block', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Original: {t.target}</a>}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => onSelect(isSelected ? null : t)}
                    style={{
                      flex: 1, padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                      border: `1px solid ${isSelected ? '#C89B3C' : '#ddd'}`,
                      background: isSelected ? '#C89B3C' : '#fff',
                      color: isSelected ? '#111' : '#666'
                    }}
                  >
                    {isSelected ? '✓ Selected' : 'Use Template'}
                  </button>
                  <button
                    onClick={() => setPreviewId(isPreviewing ? null : t.id)}
                    style={{
                      padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
                      border: '1px solid #ddd', background: '#fff', color: '#666'
                    }}
                  >
                    {isPreviewing ? 'Hide' : 'Preview'}
                  </button>
                </div>
                {isPreviewing && (
                  <div style={{ marginTop: 10, height: 300, border: '1px solid #ddd', borderRadius: 6, overflow: 'hidden' }}>
                    <iframe src={t.url} style={{ width: '100%', height: '100%', border: 0 }} title={`Preview ${t.name}`} sandbox="allow-scripts allow-same-origin" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {selectedTemplate && (
        <div style={{ marginTop: 14, padding: 14, background: '#f0f9f3', border: '1px solid #c8e6d0', borderRadius: 6, fontSize: 13 }}>
          ✓ Using <b>{selectedTemplate.name}</b> as design template. The generator will replicate this platform's design and swap in your business content.
        </div>
      )}
    </div>
  );
}