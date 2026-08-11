import { Image } from '@/components/ui/image';

// 4-color Google-style location-pin logo for "Lead Generation Near You"
const LOGO_URL = 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/20de672b0_ChatGPTImageAug9202611_49_11PM.png';

export default function LgnyLogo({ size = 36, withText = true, light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <Image
        src={LOGO_URL}
        alt="Lead Generation Near You logo"
        fittingType="fill"
        className="shrink-0"
        style={{ width: size, height: size * 1.2, borderRadius: 6 }}
      />
      {withText && (
        <div className="flex flex-col leading-none">
          <b className="font-display text-[15px] tracking-tight" style={{ fontFamily: "'Libre Caslon Display', serif", color: light ? '#fff' : '#0B1120' }}>
            Lead Generation <span style={{ color: '#10B981' }}>Near You</span>
          </b>
          <small className="text-[8px] uppercase tracking-[.14em] text-slate-400">leadgenerationnearyou.com</small>
        </div>
      )}
    </div>
  );
}