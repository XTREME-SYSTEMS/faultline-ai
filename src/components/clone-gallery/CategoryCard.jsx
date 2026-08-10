import { Image } from '@/components/ui/image';

// CategoryCard — top-level industry group card with AI-generated image.
// Clicking navigates to the sub-industries view for this group.
export default function CategoryCard({ group, industryCount, cloneCount, image, onClick }) {
  return (
    <button onClick={onClick} style={{
      position: 'relative', borderRadius: 12, overflow: 'hidden',
      border: '1px solid #ddd', cursor: 'pointer', textAlign: 'left',
      height: 200, width: '100%', padding: 0, background: '#0a0a0a',
    }}>
      {/* Background image */}
      {image ? (
        <Image
          src={image}
          alt={group}
          fittingType="fill"
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.55 }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)',
        }} />
      )}

      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)',
      }} />

      {/* Content */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: 16, color: '#fff',
      }}>
        <h3 style={{
          fontFamily: "'Libre Caslon Display', serif", fontSize: 20,
          margin: '0 0 4px', lineHeight: 1.1, letterSpacing: '-.02em',
        }}>
          {group}
        </h3>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#E7C86E', fontWeight: 600 }}>
          <span>{industryCount} industries</span>
          {cloneCount > 0 && <span>· {cloneCount} clones</span>}
        </div>
      </div>
    </button>
  );
}