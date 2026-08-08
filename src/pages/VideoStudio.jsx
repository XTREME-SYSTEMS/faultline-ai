import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Video, Film, Smartphone, Monitor, Download, Sparkles } from 'lucide-react';

const VIDEO_TYPES = [
  { id: 'hero', label: 'Hero Promo', desc: '16:9 landscape video for website headers', icon: Monitor, aspect: '16:9', duration: 6, audio: false, cost: 30 },
  { id: 'social', label: 'Social Reel', desc: '9:16 vertical video for Facebook Reels & Stories', icon: Smartphone, aspect: '9:16', duration: 6, audio: true, cost: 30 },
  { id: 'demo', label: 'Product Demo', desc: '16:9 walkthrough video showing your product in action', icon: Film, aspect: '16:9', duration: 8, audio: true, cost: 40 }
];

export default function VideoStudio() {
  const [selectedType, setSelectedType] = useState('hero');
  const [prompt, setPrompt] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [niche, setNiche] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [error, setError] = useState(null);
  const [recentVideos, setRecentVideos] = useState([]);

  const loadRecent = useCallback(async () => {
    try {
      const videos = await base44.entities.MediaAsset.filter(
        { media_type: 'video' }, '-created_date', 12
      );
      setRecentVideos((videos || []).filter(v => v.prompt_snapshot?.generated_by === 'generateMarketingVideo'));
    } catch (e) {}
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  const generate = async () => {
    if (!prompt.trim()) { setError('Please enter a video description'); return; }
    setLoading(true); setError(null); setCurrentVideo(null);
    try {
      const res = await base44.functions.invoke('generateMarketingVideo', {
        type: selectedType,
        prompt,
        business_name: businessName,
        niche
      });
      setCurrentVideo(res);
      loadRecent();
    } catch (e) {
      setError(e.message || 'Video generation failed');
    } finally { setLoading(false); }
  };

  const activeType = VIDEO_TYPES.find(t => t.id === selectedType);

  return (
    <div className="portal-page" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Video Studio</p>
          <h1 style={{ fontSize: 36, fontFamily: 'Libre Caslon Display, serif' }}>AI Video Generation</h1>
          <p style={{ color: '#666', fontSize: 15, marginTop: 6 }}>Create hero promos, social reels, and product demos with AI - then publish to Facebook.</p>
        </div>
      </div>

      {/* Video type selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {VIDEO_TYPES.map(t => {
          const Icon = t.icon;
          const active = selectedType === t.id;
          return (
            <button key={t.id} onClick={() => setSelectedType(t.id)}
              style={{ background: active ? '#0b0b0b' : '#fff', color: active ? '#fff' : '#333', border: `1px solid ${active ? '#0b0b0b' : '#e5e1da'}`, borderRadius: 12, padding: 20, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
              <Icon size={24} style={{ marginBottom: 10, color: active ? 'var(--gold2)' : 'var(--gold)' }} />
              <b style={{ fontSize: 15, display: 'block' }}>{t.label}</b>
              <small style={{ fontSize: 12, opacity: .7, display: 'block', marginTop: 4 }}>{t.desc}</small>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, fontSize: 11 }}>
                <span style={{ background: active ? '#222' : '#f4f1ea', color: active ? '#ccc' : '#8A641C', padding: '2px 8px', borderRadius: 10 }}>{t.aspect}</span>
                <span style={{ background: active ? '#222' : '#f4f1ea', color: active ? '#ccc' : '#8A641C', padding: '2px 8px', borderRadius: 10 }}>{t.duration}s</span>
                <span style={{ background: active ? '#222' : '#f4f1ea', color: active ? '#ccc' : '#8A641C', padding: '2px 8px', borderRadius: 10 }}>{t.cost} credits</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Form */}
      <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
          Video Description / Prompt
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
            placeholder="e.g. A serene mountain lake at sunset with gentle ripples, cinematic wide shot, warm golden lighting"
            style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, resize: 'vertical' }} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
            Business Name (optional)
            <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Your business"
              style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'inherit', fontSize: 14 }} />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
            Niche (optional)
            <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="e.g. personal finance"
              style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontFamily: 'inherit', fontSize: 14 }} />
          </label>
        </div>
        <button onClick={generate} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 8, background: loading ? '#ccc' : '#0b0b0b', color: '#fff', fontSize: 15, fontWeight: 700, border: 0, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
          {loading ? <><Loader2 size={18} className="animate-spin" /> Generating {activeType.label}... (30-60s)</> : <><Video size={18} /> Generate {activeType.label}</>}
        </button>
        <p style={{ fontSize: 12, color: '#888', marginTop: 10 }}>Costs {activeType.cost} integration credits. Generation takes 30-60 seconds.</p>
      </div>

      {error && <div style={{ background: '#f5d8d5', border: '1px solid #e5c5c0', borderRadius: 8, padding: 14, color: '#a52d23', fontSize: 13, marginBottom: 20 }}>{error}</div>}

      {/* Current video */}
      {currentVideo && (
        <div style={{ background: '#fff', border: '2px solid var(--gold)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} style={{ color: 'var(--gold)' }} /> {currentVideo.label} - Ready!
          </h2>
          <video src={currentVideo.url} controls autoPlay loop muted={selectedType === 'hero'}
            style={{ width: '100%', maxHeight: 500, borderRadius: 12, background: '#000' }} />
          <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
            <a href={currentVideo.url} download style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, background: '#0b0b0b', color: '#fff', fontSize: 13, fontWeight: 700 }}>
              <Download size={14} /> Download Video
            </a>
            <a href={currentVideo.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, fontWeight: 700 }}>
              Open in New Tab
            </a>
          </div>
        </div>
      )}

      {/* Recent videos */}
      {!loading && recentVideos.length > 0 && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 14 }}>Recent Videos</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {recentVideos.map(v => (
              <div key={v.id} style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, overflow: 'hidden' }}>
                <video src={v.storage_url} controls muted
                  style={{ width: '100%', height: 160, objectFit: 'cover', background: '#000' }} />
                <div style={{ padding: 12 }}>
                  <b style={{ fontSize: 13 }}>{v.prompt_snapshot?.label || 'Marketing Video'}</b>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <span style={{ fontSize: 10, background: '#f4f1ea', color: '#8A641C', padding: '2px 8px', borderRadius: 10 }}>{v.prompt_snapshot?.video_type}</span>
                    <span style={{ fontSize: 10, background: '#f4f1ea', color: '#8A641C', padding: '2px 8px', borderRadius: 10 }}>{v.prompt_snapshot?.aspect_ratio}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}