import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ExternalLink, Wand2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CloneCard({ clone }) {
  const navigate = useNavigate();
  const [healing, setHealing] = useState(false);
  const [healResult, setHealResult] = useState(null);

  async function handleHeal(e) {
    e.stopPropagation();
    setHealing(true);
    setHealResult(null);
    try {
      const res = await base44.functions.invoke('autonomousCloneTo100', {
        launch_project_id: clone.id,
        max_iterations: 3,
      });
      const score = res.data?.score ?? res.score ?? 0;
      setHealResult({ score, ok: true });
    } catch (err) {
      setHealResult({ error: err.message, ok: false });
    } finally {
      setHealing(false);
    }
  }

  function handleCustomize() {
    navigate(`/app/clone-studio?project=${clone.id}`);
  }

  const scoreColor = clone.score >= 100 ? '#237A4B' : clone.score >= 70 ? '#B88214' : '#C63D34';

  return (
    <div style={{
      border: '1px solid #ddd', borderRadius: 10, overflow: 'hidden', background: '#fff',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Thumbnail — screenshot of the clone's home page */}
      <div style={{ position: 'relative', height: 160, background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)', overflow: 'hidden' }}>
        {clone.thumbnail ? (
          <img
            src={clone.thumbnail}
            alt={clone.name}
            loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'grid'; }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
          />
        ) : null}
        <div style={{
          width: '100%', height: '100%', display: clone.thumbnail ? 'none' : 'grid', placeItems: 'center',
          color: '#E7C86E', fontFamily: "'Libre Caslon Display', serif", fontSize: 28,
        }}>
          {clone.name?.slice(0, 2).toUpperCase()}
        </div>
        {/* Score badge */}
        <div style={{
          position: 'absolute', top: 8, right: 8, padding: '4px 10px', borderRadius: 20,
          background: 'rgba(0,0,0,0.8)', color: scoreColor, fontSize: 12, fontWeight: 700,
        }}>
          {clone.score}/100
        </div>
        {healResult?.ok && healResult.score >= 100 && (
          <div style={{
            position: 'absolute', top: 8, left: 8, padding: '4px 10px', borderRadius: 20,
            background: '#237A4B', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <CheckCircle2 size={12} /> HEALED
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <div>
          <b style={{ fontSize: 14, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clone.name}</b>
          <a href={clone.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
            style={{ color: '#2563eb', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
            <ExternalLink size={11} /> Live URL
          </a>
        </div>

        {healResult && !healResult.ok && (
          <p style={{ color: '#C63D34', fontSize: 11, margin: 0 }}>{healResult.error}</p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <button onClick={handleHeal} disabled={healing} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            padding: '9px 10px', border: '1px solid #ddd', borderRadius: 6,
            background: healing ? '#f8f7f4' : '#fff', cursor: healing ? 'wait' : 'pointer',
            fontSize: 12, fontWeight: 600, color: '#666',
          }}>
            {healing ? <Loader2 size={14} className="animate-spin" /> : clone.score >= 100 ? <CheckCircle2 size={14} style={{ color: '#237A4B' }} /> : <AlertCircle size={14} style={{ color: '#B88214' }} />}
            {healing ? 'Healing…' : clone.score >= 100 ? '100/100' : 'Heal'}
          </button>
          <button onClick={handleCustomize} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            padding: '9px 10px', border: 0, borderRadius: 6,
            background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', cursor: 'pointer',
            fontSize: 12, fontWeight: 700, color: '#111',
          }}>
            <Wand2 size={14} /> Customize
          </button>
        </div>
      </div>
    </div>
  );
}