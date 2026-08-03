import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';

// UniversalGenerator — the Xtreme AI Builder command center
// Accepts ANY request, infers build type, compiles a generator, queues it,
// executes it, and produces validated artifacts. Integrates with all other
// generators (Website, App, Business) through the compileGenerator function.

const BUILD_TYPE_ICONS = {
  'Website': '🌐',
  'Application': '📱',
  'End-to-End Business System': '🏢',
  'Multi-Generator Workflow': '🔄',
  'AI Tool': '🤖',
  'Single Generator': '⚙️'
};

const STATUS_COLORS = {
  queued: '#73777F', analyzing: '#D4AF37', planning: '#D4AF37', building: '#D4AF37',
  connecting: '#D4AF37', testing: '#D4AF37', repairing: '#B88214',
  waiting_input: '#73777F', waiting_connector: '#73777F',
  failed: '#C63D34', completed: '#237A4B', paused: '#73777F', cancelled: '#73777F'
};

export default function UniversalGenerator() {
  const [request, setRequest] = useState('');
  const [compiling, setCompiling] = useState(false);
  const [executing, setExecuting] = useState(null);
  const [error, setError] = useState('');
  const [generators, setGenerators] = useState([]);
  const [queue, setQueue] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [activeTab, setActiveTab] = useState('create');
  const [previewArtifact, setPreviewArtifact] = useState(null);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [genRes, queueRes, artRes] = await Promise.all([
        base44.functions.invoke('compileGenerator', { action: 'get_generators' }),
        base44.functions.invoke('compileGenerator', { action: 'get_queue' }),
        base44.functions.invoke('compileGenerator', { action: 'get_artifacts' })
      ]);
      setGenerators(genRes.data?.generators || []);
      setQueue(queueRes.data?.queue || []);
      setArtifacts(artRes.data?.artifacts || []);
    } catch (e) { console.error(e); }
  };

  const compile = async () => {
    if (!request.trim()) { setError('Describe what you want to build'); return; }
    setCompiling(true);
    setError('');
    try {
      const res = await base44.functions.invoke('compileGenerator', {
        action: 'compile',
        request: request.trim()
      });
      if (res.data?.error) { setError(res.data.error); setCompiling(false); return; }
      setRequest('');
      loadAll();
      setActiveTab('queue');
    } catch (e) {
      setError(e.message || 'Failed to compile');
    } finally {
      setCompiling(false);
    }
  };

  const execute = async (queueItemId) => {
    setExecuting(queueItemId);
    try {
      const res = await base44.functions.invoke('compileGenerator', {
        action: 'execute',
        queue_item_id: queueItemId
      });
      if (res.data?.error) { setError(res.data.error); }
      loadAll();
    } catch (e) {
      setError(e.message || 'Execution failed');
    } finally {
      setExecuting(null);
    }
  };

  const openArtifact = (a) => {
    setPreviewArtifact(a);
    setShowCode(false);
  };

  const downloadArtifact = (a) => {
    const ext = a.artifact_type === 'website' || a.artifact_type === 'app' ? 'html' : 'json';
    const blob = new Blob([a.content], { type: ext === 'html' ? 'text/html' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${a.name.replace(/\s+/g, '-').toLowerCase()}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openInNewTab = (a) => {
    if (a.artifact_type === 'website' || a.artifact_type === 'app') {
      const blob = new Blob([a.content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  const examples = [
    'Create a mobile epoxy-flooring company serving homeowners in Tampa, Florida',
    'Build a polished concrete estimate calculator for contractors',
    'Generate a website for a dental practice in Austin, TX',
    'Create a complete HVAC business operating system',
    'Build a SaaS dashboard for tracking contractor projects',
    'Generate a booking app for a landscaping company'
  ];

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Xtreme AI Builder · Universal Generator</p>
          <h1>Universal Generator</h1>
          <p>Describe anything you want to build. The AI infers the type, compiles a generator, and produces a validated artifact — website, app, business system, or AI tool.</p>
        </div>
      </div>

      {error && <div style={{ background: '#fde8e8', color: '#C63D34', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* Create Section */}
      <div style={{ background: '#fff', border: '1px solid #C7CCD4', borderRadius: 12, padding: 28, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: '#D4AF37', margin: 0 }}>Step 1 · Describe</p>
        <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 28, margin: '8px 0 16px' }}>What do you want to build?</h3>
        <textarea
          value={request}
          onChange={e => setRequest(e.target.value)}
          placeholder="e.g. Create a mobile epoxy-flooring company serving homeowners in Tampa, Florida"
          style={{
            width: '100%', minHeight: 80, padding: 14, border: '1px solid #C7CCD4', borderRadius: 8,
            fontSize: 15, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box'
          }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          {examples.map((ex, i) => (
            <button key={i} onClick={() => setRequest(ex)} style={{
              padding: '6px 12px', background: '#F8F9FB', border: '1px solid #C7CCD4', borderRadius: 20,
              fontSize: 11, color: '#73777F', cursor: 'pointer', fontFamily: 'inherit'
            }}>{ex.substring(0, 50)}…</button>
          ))}
        </div>
        <button onClick={compile} disabled={compiling} style={{
          marginTop: 16, background: '#0F0F10', color: '#fff', border: 0, borderRadius: 8,
          padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: compiling ? 'wait' : 'pointer',
          fontFamily: 'inherit', opacity: compiling ? 0.6 : 1
        }}>
          {compiling ? '⚡ Compiling generator…' : '⚡ Compile & Queue'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #C7CCD4' }}>
        {[['queue', `Build Queue (${queue.length})`], ['artifacts', `Artifacts (${artifacts.length})`], ['library', `Generator Library (${generators.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            padding: '12px 18px', background: 'none', border: 0, borderBottom: activeTab === key ? '2px solid #D4AF37' : '2px solid transparent',
            fontSize: 13, fontWeight: 700, color: activeTab === key ? '#0F0F10' : '#73777F', cursor: 'pointer', fontFamily: 'inherit'
          }}>{label}</button>
        ))}
      </div>

      {/* Build Queue Tab */}
      {activeTab === 'queue' && (
        <div>
          {queue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#73777F' }}>
              <p style={{ fontSize: 40, margin: '0 0 12px' }}>📋</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#202124' }}>No builds queued</p>
              <p style={{ fontSize: 14 }}>Describe what you want to build above to get started.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {queue.map(item => (
                <div key={item.id} style={{ background: '#fff', border: '1px solid #C7CCD4', borderRadius: 10, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{BUILD_TYPE_ICONS[item.build_type] || '⚙️'}</span>
                        <b style={{ fontSize: 15 }}>{item.name}</b>
                      </div>
                      <p style={{ fontSize: 13, color: '#73777F', margin: '4px 0 0' }}>{item.description}</p>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em',
                      color: STATUS_COLORS[item.status] || '#73777F', background: `${STATUS_COLORS[item.status] || '#73777F'}15`,
                      padding: '4px 10px', borderRadius: 4
                    }}>{item.status}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                    <div style={{ flex: 1, height: 5, background: '#F8F9FB', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${item.progress || 0}%`, height: '100%', background: STATUS_COLORS[item.status] || '#D4AF37', borderRadius: 3, transition: 'width .3s' }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#73777F' }}>{item.progress || 0}%</span>
                    {item.status === 'queued' && (
                      <button onClick={() => execute(item.id)} disabled={executing === item.id} style={{
                        background: '#D4AF37', color: '#0F0F10', border: 0, borderRadius: 6, padding: '8px 18px',
                        fontSize: 12, fontWeight: 700, cursor: executing === item.id ? 'wait' : 'pointer', fontFamily: 'inherit'
                      }}>{executing === item.id ? 'Building…' : '▶ Build'}</button>
                    )}
                    {item.status === 'completed' && item.artifact_ids?.length > 0 && (
                      <button onClick={() => {
                        const art = artifacts.find(a => a.id === item.artifact_ids[0]);
                        if (art) openArtifact(art);
                      }} style={{
                        background: '#0F0F10', color: '#fff', border: 0, borderRadius: 6, padding: '8px 18px',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                      }}>View →</button>
                    )}
                  </div>
                  {item.current_step && <p style={{ fontSize: 11, color: '#73777F', margin: '8px 0 0' }}>{item.current_step}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Artifacts Tab */}
      {activeTab === 'artifacts' && (
        <div>
          {artifacts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#73777F' }}>
              <p style={{ fontSize: 40, margin: '0 0 12px' }}>📦</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#202124' }}>No artifacts yet</p>
              <p style={{ fontSize: 14 }}>Build something to see your generated artifacts here.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {artifacts.map(a => (
                <div key={a.id} style={{ background: '#fff', border: '1px solid #C7CCD4', borderRadius: 10, padding: 18, cursor: 'pointer' }}
                  onClick={() => openArtifact(a)}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <b style={{ fontSize: 14 }}>{a.name}</b>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#D4AF37', background: '#D4AF3715', padding: '3px 8px', borderRadius: 4 }}>{a.artifact_type}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#73777F', margin: '0 0 10px' }}>{a.metadata?.industry || 'Universal'} · {new Date(a.created_date).toLocaleDateString()}</p>
                  {a.validation_score != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: '#73777F' }}>Validation:</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: a.validation_score >= 80 ? '#237A4B' : '#B88214' }}>{a.validation_score}/100</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Generator Library Tab */}
      {activeTab === 'library' && (
        <div>
          {generators.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#73777F' }}>
              <p style={{ fontSize: 40, margin: '0 0 12px' }}>📚</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#202124' }}>No generators yet</p>
              <p style={{ fontSize: 14 }}>Compile a request above to create your first generator.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {generators.map(g => (
                <div key={g.id} style={{ background: '#fff', border: '1px solid #C7CCD4', borderRadius: 10, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{BUILD_TYPE_ICONS[g.build_type] || '⚙️'}</span>
                      <b style={{ fontSize: 14 }}>{g.name}</b>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#D4AF37' }}>{g.quality_score}/100</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#73777F', margin: '0 0 10px', lineHeight: 1.5 }}>{g.description}</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {g.tags?.slice(0, 3).map((t, i) => (
                      <span key={i} style={{ fontSize: 10, background: '#F8F9FB', border: '1px solid #C7CCD4', padding: '2px 8px', borderRadius: 4, color: '#73777F' }}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Artifact Preview Modal */}
      {previewArtifact && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setPreviewArtifact(null)}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 1000, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: 16, borderBottom: '1px solid #C7CCD4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <b style={{ fontSize: 16 }}>{previewArtifact.name}</b>
                <span style={{ fontSize: 11, color: '#73777F', marginLeft: 10, textTransform: 'uppercase', fontWeight: 700 }}>{previewArtifact.artifact_type}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(previewArtifact.artifact_type === 'website' || previewArtifact.artifact_type === 'app') && (
                  <>
                    <button onClick={() => setShowCode(!showCode)} style={btnOutline}>{showCode ? 'Preview' : 'Code'}</button>
                    <button onClick={() => openInNewTab(previewArtifact)} style={btnOutline}>Open ↗</button>
                  </>
                )}
                <button onClick={() => downloadArtifact(previewArtifact)} style={btnGold}>⬇ Download</button>
                <button onClick={() => setPreviewArtifact(null)} style={btnOutline}>✕</button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {(previewArtifact.artifact_type === 'website' || previewArtifact.artifact_type === 'app') ? (
                showCode ? (
                  <pre style={{ padding: 16, fontSize: 11, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{previewArtifact.content}</pre>
                ) : (
                  <iframe srcDoc={previewArtifact.content} style={{ width: '100%', height: '70vh', border: 0 }} title="Preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
                )
              ) : (
                <pre style={{ padding: 20, fontSize: 12, margin: 0, whiteSpace: 'pre-wrap' }}>{(() => {
                  try { return JSON.stringify(JSON.parse(previewArtifact.content), null, 2); }
                  catch { return previewArtifact.content; }
                })()}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Integration Links */}
      <div style={{ marginTop: 32, padding: 20, background: '#0F0F10', borderRadius: 12, color: '#fff' }}>
        <p style={{ color: '#D4AF37', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', margin: 0 }}>Integrated Generators</p>
        <p style={{ fontSize: 13, color: '#9a9a9a', margin: '6px 0 16px' }}>The Universal Generator routes to these specialized systems based on your request type.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          <Link to="/app/website-generator" style={intLink}>🌐 Website Generator</Link>
          <Link to="/app/app-generator" style={intLink}>📱 App Generator</Link>
          <Link to="/app/business" style={intLink}>🏢 Business Generator</Link>
          <Link to="/app/deliverable-studio" style={intLink}>📦 Deliverable Studio</Link>
          <Link to="/app/universal-builder" style={intLink}>🏗️ Universal Builder</Link>
          <Link to="/app/qa-center" style={intLink}>✅ QA & Validation</Link>
        </div>
      </div>
    </PortalShell>
  );
}

const btnOutline = {
  padding: '8px 14px', background: '#fff', border: '1px solid #C7CCD4', borderRadius: 6,
  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#202124'
};
const btnGold = {
  padding: '8px 14px', background: '#D4AF37', border: 0, borderRadius: 6,
  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#0F0F10'
};
const intLink = {
  padding: '12px 16px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 8,
  fontSize: 13, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 8
};