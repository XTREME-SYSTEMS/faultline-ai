import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { Loader2 } from 'lucide-react';

// SubIndustryCard — sub-industry card with ultra-lifelike AI image (auto-generated on mount).
// Images are cached in localStorage after first generation to avoid regenerating.
export default function SubIndustryCard({ industry, cloneCount, onClick }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const generatedRef = useRef(false);

  async function generateImage() {
    if (generatedRef.current || generating) return;
    generatedRef.current = true;
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateIndustryImage', {
        label: industry.label,
        group: industry.group,
      });
      const d = res.data || res;
      if (d.image_url) {
        setImageUrl(d.image_url);
        try {
          const cache = JSON.parse(localStorage.getItem('subindustry_images') || '{}');
          cache[industry.label] = d.image_url;
          localStorage.setItem('subindustry_images', JSON.stringify(cache));
        } catch {}
      }
    } catch (err) {
      generatedRef.current = false;
    } finally {
      setGenerating(false);
    }
  }

  // Auto-generate on mount if not cached; check localStorage cache first
  useEffect(() => {
    try {
      const cache = JSON.parse(localStorage.getItem('subindustry_images') || '{}');
      if (cache[industry.label]) {
        setImageUrl(cache[industry.label]);
        generatedRef.current = true;
        return;
      }
    } catch {}
    generateImage();
  }, [industry.label]);

  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative', borderRadius: 10, overflow: 'hidden',
        border: '1px solid #ddd', cursor: 'pointer', textAlign: 'left',
        height: 160, width: '100%', padding: 0, background: '#0a0a0a',
      }}
    >
      {/* Background image or gradient */}
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={industry.label}
          fittingType="fill"
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.6 }}
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