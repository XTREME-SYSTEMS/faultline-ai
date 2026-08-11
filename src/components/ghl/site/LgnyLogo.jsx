// 4-color pinwheel location-pin logo for "Lead Gen Near You"
export default function LgnyLogo({ size = 36, withText = true, light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size * 1.2} viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <path d="M20 0C9 0 0 9 0 20c0 14 20 28 20 28s20-14 20-28C40 9 31 0 20 0z" fill={light ? '#0B1120' : '#0B1120'} />
        <g transform="translate(20 20)">
          <path d="M0 0 L0 -10 A10 10 0 0 1 10 0 Z" fill="#E7C86E" />
          <path d="M0 0 L10 0 A10 10 0 0 1 0 10 Z" fill="#2563EB" />
          <path d="M0 0 L0 10 A10 10 0 0 1 -10 0 Z" fill="#059669" />
          <path d="M0 0 L-10 0 A10 10 0 0 1 0 -10 Z" fill="#DC2626" />
          <circle cx="0" cy="0" r="2.2" fill="#fff" />
        </g>
      </svg>
      {withText && (
        <div className="flex flex-col leading-none">
          <b className="font-display text-[15px] tracking-tight" style={{ fontFamily: "'Libre Caslon Display', serif" }}>
            Lead Gen <span style={{ color: '#10B981' }}>Near You</span>
          </b>
          <small className="text-[8px] uppercase tracking-[.14em] text-slate-400">leadgennearyou.com</small>
        </div>
      )}
    </div>
  );
}