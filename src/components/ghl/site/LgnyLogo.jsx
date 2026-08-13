import { Image } from '@/components/ui/image';
import { BRAND } from '@/lib/brandIdentity';

// AUTO LEADS brand logo — "CONSTRUCTION INTELLIGENCE" tagline
export default function LgnyLogo({ size = 36, withText = true, light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <Image
        src={light ? BRAND.logoLight : BRAND.logoDark}
        alt={`${BRAND.name} logo`}
        fittingType="fill"
        className="shrink-0"
        style={{ width: size * 1.6, height: size, borderRadius: 4 }}
      />
      {withText && (
        <div className="flex flex-col leading-none">
          <b className="font-display text-[15px] tracking-tight" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 800, color: light ? '#fff' : '#0B0B0D' }}>
            AUTO <span style={{ color: BRAND.accent }}>LEADS</span>
          </b>
          <small className="text-[8px] uppercase tracking-[.14em]" style={{ color: light ? '#9a9a9e' : '#666' }}>{BRAND.tagline}</small>
        </div>
      )}
    </div>
  );
}