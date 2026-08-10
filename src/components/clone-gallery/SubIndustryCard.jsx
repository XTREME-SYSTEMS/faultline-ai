import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

// SubIndustryCard — sub-industry card with AI image (generated on-demand).
// Clicking navigates to the clones view for this sub-industry.
export default function SubIndustryCard({ industry, cloneCount, onClick }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  async function generateImage(e) {
    e?.stopPropagation();
    if (generated) return;
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateIndustryImage', {
        label: industry.label,
        group: industry.group,
      });
      const d = res.data || res;
      if (d.image_url) {
        setImageUrl(d.image_url);
        setGenerated(true);
        // Cache in localStorage
        try {
          const cache = JSON.parse(localStorage.getItem('subindustry_images') || '{}');
          cache[industry.label] = d.image_url;
          localStorage.setItem('subindustry_images', JSON.stringify(cache));
        } catch {}
      }
    } catch (err) {
      // Fallback — use gradient
    } finally {
      setGenerating(false);
    }
  }

  // Check localStorage cache on mount
  useEffect(() => {
    try {
      const cache = JSON.parse(localStorage.getItem('subindustry_images') || '{}');
      if (cache[industry.label]) {
        setImageUrl(cache[industry.label]);
        setGenerated(true);
      }
    } catch {}
  }, [industry.label]);

  return (
    <button
      onClick={onClick}
      onMouseEnter={generateImage}
      style={{
        position: 'relative', borderRadius: 10, overflow: 'hidden',
        border: '1px solid #ddd', cursor: 'pointer', textAlign: 'left',
        height: 160, width: '100%', padding: 0, background: '#0a0a0a',
      }}
    >
      {/* Background image or gradient */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={industry.label}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.6,
          }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(135deg, hsl(${industry.label.charCodeAt(0) * 7 % 360}, 30%, 20%), hsl(${industry.label.charCodeAt(0) * 7 % 360 + 40}, 25%, 15%))`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {generating && <Loader2 size={20} className="animate-spin" style={{ color: '#E7C86E' }} />}
        </div>
      )}

      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)',
      }} />

      {/* Content */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: 12, color: '#fff',
      }}>
        <b style={{ fontSize: 13, display: 'block', lineHeight: 1.2 }}>{industry.label}</b>
        {cloneCount > 0 ? (
          <span style={{ fontSize: 10, color: '#E7C86E', fontWeight: 600 }}>{cloneCount} clones</span>
        ) : (
          <span style={{ fontSize: 10, color: '#888' }}>No clones yet</span>
        )}
      </div>
    </button>
  );
}