import { X } from 'lucide-react';

export default function ImageLightbox({ src, label, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, cursor: 'pointer',
    }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,.12)',
        border: '1px solid rgba(255,255,255,.2)', borderRadius: 50, width: 44, height: 44,
        color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'inherit',
      }}>
        <X size={22} />
      </button>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: '90vw', maxHeight: '90vh', background: '#fff', borderRadius: 12,
        overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'default',
        boxShadow: '0 20px 60px rgba(0,0,0,.5)',
      }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #eee', fontSize: 14, fontWeight: 700, color: '#111' }}>
          {label}
        </div>
        <div style={{ maxHeight: '85vh', overflow: 'auto' }}>
          <img src={src} alt={label} style={{ width: '100%', display: 'block' }} />
        </div>
      </div>
    </div>
  );
}