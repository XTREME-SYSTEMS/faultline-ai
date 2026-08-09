const LIME = '#7AB800';
const CHARCOAL = '#1a1a1a';

/**
 * Epoxy Garage Floors Near You — brand logo.
 * Green circle with a white map-pin (teardrop) and a BLACK inner dot.
 * Used in the header, footer, PWA install button, and home-screen icon.
 */
export default function EpoxyLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" style={{ display: 'block' }}>
      <circle cx="256" cy="256" r="200" fill={LIME} />
      <path d="M256 150 C195 150 146 199 146 260 C146 340 256 400 256 400 C256 400 366 340 366 260 C366 199 317 150 256 150 Z" fill="#ffffff" />
      <circle cx="256" cy="260" r="26" fill={CHARCOAL} />
    </svg>
  );
}