import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';

const CAMERAS = [
  { id: 'wide_architectural', name: 'Wide architectural reveal' },
  { id: 'floor_forward', name: 'Floor-forward hero' },
  { id: 'three_quarter', name: 'Three-quarter room view' },
  { id: 'detail_50mm', name: 'Material detail' },
  { id: 'overhead', name: 'Overhead plan view' },
  { id: 'entry_reveal', name: 'Entry reveal' },
  { id: 'corner_perspective', name: 'Corner perspective' },
  { id: 'garage_hero', name: 'Garage hero' },
  { id: 'commercial_wide', name: 'Commercial wide' },
  { id: 'exterior_approach', name: 'Exterior approach' }
];

const ASPECT_RATIOS = ['4:3', '16:9', '1:1', '9:16'];

export default function VisualMediaStudio() {
  const [tab, setTab] = useState('studio');
  const [finishes, setFinishes] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [adapters, setAdapters] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [finishId, setFinishId] = useState('');
  const [environmentId, setEnvironmentId] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [cameraId, setCameraId] = useState('wide_architectural');
  const [aspectRatio, setAspectRatio] = useState('4:3');
  const [marketingUse, setMarketingUse] = useState('professional contractor portfolio');
  const [compiledPrompt, setCompiledPrompt] = useState('');
  const [promptId, setPromptId] = useState('');
  const [compiling, setCompiling] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [f, e, a, ast] = await Promise.all([
        base44.entities.FinishProfile.list('-created_date', 50),
        base44.entities.EnvironmentProfile.list('-created_date', 50),
        base44.entities.MediaProviderAdapter.list('-created_date', 20),
        base44.entities.MediaAsset.list('-created_date', 20)
      ]);
      setFinishes(f);
      setEnvironments(e);
      setAdapters(a);
      setAssets(ast);
      if (f.length > 0) setFinishId(f[0].finish_id);
      if (e.length > 0) setEnvironmentId(e[0].environment_id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const compile = async () => {
    if (!finishId || !environmentId) { setError('Select a finish and environment'); return; }
    setCompiling(true);
    setError('');
    setGeneratedUrl(null);
    try {
      const res = await base44.functions.invoke('compileVisualPrompt', {
        finish_id: finishId,
        environment_id: environmentId,
        marketing_use: marketingUse,
        camera_id: cameraId,
        media_type: mediaType,
        aspect_ratio: aspectRatio
      });
      if (res.data?.error) { setError(res.data.error); return; }
      setCompiledPrompt(res.data.prompt);
      setPromptId(res.data.prompt_id);
    } catch (e) {
      setError(e.message);
    } finally {
      setCompiling(false);
    }
  };

  const generate = async () => {
    if (!promptId) { setError('Compile a prompt first'); return; }
    setGenerating(true);
    setError('');
    try {
      const res = await base44.functions.invoke('queueMediaGeneration', {
        prompt_id: promptId,
        provider_id: 'base44_native',
        media_type: mediaType,
        payload: { aspect_ratio: aspectRatio, duration: 6 }
      });
      if (res.data?.error) { setError(res.data.error); return; }
      setGeneratedUrl(res.data.asset_url);
      loadAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const reviewAsset = async (assetId, status) => {
    try {
      await base44.functions.invoke('createQAReview', { asset_id: assetId, status, note: '' });
      loadAll();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Xtreme AI · Visual Media Studio</p>
          <h1>Visual Media Studio</h1>
          <p>Compile ultra-realistic prompts from finish and environment profiles, generate images or videos, and run visual QA with disclosure labels.</p>
        </div>
      </div>

      {error && <div style={{ background: '#fde8e8', color: '#C63D34', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #C7CCD4' }}>
        {[['studio', 'Studio'], ['library', `Media Library (${assets.length})`], ['profiles', `Profiles (${finishes.length} finishes, ${environments.length} envs)`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '12px 18px', background: 'none', border: 0, borderBottom: tab === key ? '2px solid #D4AF37' : '2px solid transparent',
            fontSize: 13, fontWeight: 700, color: tab === key ? '#0F0F10' : '#73777F', cursor: 'pointer', fontFamily: 'inherit'
          }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#73777F' }}>
          <span className="dot-anim" style={{ fontSize: 24 }}>●</span>
          <p style={{ marginTop: 12 }}>Loading studio…</p>
        </div>
      ) : tab === 'studio' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Configuration Panel */}
          <div style={{ background: '#fff', border: '1px solid #C7CCD4', borderRadius: 12, padding: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: '#D4AF37', margin: '0 0 16px' }}>Configuration</p>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Media Type</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['image', 'video'].map(t => (
                <button key={t} onClick={() => setMediaType(t)} style={{
                  padding: '8px 16px', border: mediaType === t ? '2px solid #D4AF37' : '1px solid #C7CCD4', borderRadius: 6,
                  background: mediaType === t ? '#D4AF3715' : '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  color: mediaType === t ? '#8A641C' : '#73777F'
                }}>{t === 'image' ? '🖼️ Image' : '🎬 Video'}</button>
              ))}
            </div>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Finish Profile</label>
            <select value={finishId} onChange={e => setFinishId(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #C7CCD4', borderRadius: 6, fontSize: 13, marginBottom: 16, fontFamily: 'inherit' }}>
              {finishes.map(f => <option key={f.id} value={f.finish_id}>{f.name} ({f.family})</option>)}
            </select>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Environment</label>
            <select value={environmentId} onChange={e => setEnvironmentId(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #C7CCD4', borderRadius: 6, fontSize: 13, marginBottom: 16, fontFamily: 'inherit' }}>
              {environments.map(e => <option key={e.id} value={e.environment_id}>{e.name} ({e.sector})</option>)}
            </select>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Camera</label>
            <select value={cameraId} onChange={e => setCameraId(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #C7CCD4', borderRadius: 6, fontSize: 13, marginBottom: 16, fontFamily: 'inherit' }}>
              {CAMERAS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Aspect Ratio</label>
            <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #C7CCD4', borderRadius: 6, fontSize: 13, marginBottom: 16, fontFamily: 'inherit' }}>
              {ASPECT_RATIOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Marketing Use</label>
            <input value={marketingUse} onChange={e => setMarketingUse(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #C7CCD4', borderRadius: 6, fontSize: 13, marginBottom: 16, fontFamily: 'inherit' }} />

            <button onClick={compile} disabled={compiling} style={{
              width: '100%', background: '#0F0F10', color: '#fff', border: 0, borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 700,
              cursor: compiling ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: compiling ? 0.6 : 1
            }}>{compiling ? '⏳ Compiling…' : '⚡ Compile Prompt'}</button>
          </div>

          {/* Preview & Generate Panel */}
          <div style={{ background: '#fff', border: '1px solid #C7CCD4', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: '#D4AF37', margin: '0 0 16px' }}>Compiled Prompt</p>
            {compiledPrompt ? (
              <div style={{ background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 8, padding: 16, fontSize: 13, lineHeight: 1.6, color: '#333', marginBottom: 16, flex: 1, overflow: 'auto', maxHeight: 300 }}>
                {compiledPrompt}
              </div>
            ) : (
              <div style={{ background: '#f8f7f4', border: '1px dashed #C7CCD4', borderRadius: 8, padding: 40, textAlign: 'center', color: '#999', fontSize: 13, marginBottom: 16, flex: 1 }}>
                Configure your settings and compile a prompt to see it here.
              </div>
            )}

            {compiledPrompt && (
              <button onClick={generate} disabled={generating} style={{
                width: '100%', background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#0F0F10', border: 0, borderRadius: 8,
                padding: '12px', fontSize: 14, fontWeight: 700, cursor: generating ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: generating ? 0.6 : 1, marginBottom: 12
              }}>{generating ? '⏳ Generating…' : mediaType === 'image' ? '🖼️ Generate Image' : '🎬 Generate Video'}</button>
            )}

            {generatedUrl && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#237A4B', margin: '0 0 8px' }}>✓ Generated</p>
                {mediaType === 'image' ? (
                  <img src={generatedUrl} alt="Generated" style={{ width: '100%', borderRadius: 8, border: '1px solid #ddd' }} />
                ) : (
                  <video src={generatedUrl} controls style={{ width: '100%', borderRadius: 8, border: '1px solid #ddd' }} />
                )}
                <p style={{ fontSize: 10, color: '#999', marginTop: 8, textAlign: 'center' }}>AI-generated project concept. Not an installed customer project.</p>
              </div>
            )}
          </div>
        </div>
      ) : tab === 'library' ? (
        <div>
          {assets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#73777F' }}>
              <p style={{ fontSize: 40, margin: '0 0 12px' }}>🖼️</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#202124' }}>No media assets yet</p>
              <p style={{ fontSize: 14 }}>Generate images or videos in the Studio tab to build your library.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {assets.map(a => (
                <div key={a.id} style={{ background: '#fff', border: '1px solid #C7CCD4', borderRadius: 10, overflow: 'hidden' }}>
                  {a.media_type === 'image' && a.storage_url ? (
                    <img src={a.storage_url} alt={a.id} style={{ width: '100%', height: 200, objectFit: 'cover' }} />
                  ) : a.media_type === 'video' && a.storage_url ? (
                    <video src={a.storage_url} style={{ width: '100%', height: 200, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: 200, background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>{a.media_type === 'image' ? '🖼️' : '🎬'}</div>
                  )}
                  <div style={{ padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: a.approval_status === 'approved' ? '#237A4B' : a.approval_status === 'rejected' ? '#C63D34' : '#B88214' }}>{a.approval_status}</span>
                      <span style={{ fontSize: 10, color: '#999' }}>{a.media_type}</span>
                    </div>
                    <p style={{ fontSize: 10, color: '#999', margin: '0 0 10px' }}>AI-generated concept. Not an installed project.</p>
                    {a.approval_status === 'unreviewed' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => reviewAsset(a.id, 'approved')} style={{ flex: 1, padding: 6, background: '#237A4B', color: '#fff', border: 0, borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✓ Approve</button>
                        <button onClick={() => reviewAsset(a.id, 'revise')} style={{ flex: 1, padding: 6, background: '#B88214', color: '#fff', border: 0, borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>↻ Revise</button>
                        <button onClick={() => reviewAsset(a.id, 'rejected')} style={{ flex: 1, padding: 6, background: '#C63D34', color: '#fff', border: 0, borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✕ Reject</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <h3 style={{ fontSize: 16, margin: '0 0 14px' }}>Finish Profiles ({finishes.length})</h3>
            <div style={{ display: 'grid', gap: 8, maxHeight: 500, overflow: 'auto' }}>
              {finishes.map(f => (
                <div key={f.id} style={{ background: '#fff', border: '1px solid #C7CCD4', borderRadius: 8, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <b style={{ fontSize: 13 }}>{f.name}</b>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#D4AF37' }}>{f.family}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#73777F', margin: '4px 0 0' }}>{f.surface_description}</p>
                  {f.sheen && <p style={{ fontSize: 11, color: '#999', margin: '4px 0 0' }}>Sheen: {f.sheen}</p>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: 16, margin: '0 0 14px' }}>Environment Profiles ({environments.length})</h3>
            <div style={{ display: 'grid', gap: 8, maxHeight: 500, overflow: 'auto' }}>
              {environments.map(e => (
                <div key={e.id} style={{ background: '#fff', border: '1px solid #C7CCD4', borderRadius: 8, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <b style={{ fontSize: 13 }}>{e.name}</b>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#D4AF37' }}>{e.sector}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#73777F', margin: '4px 0 0' }}>{e.scene_details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}