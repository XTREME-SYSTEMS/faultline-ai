import { Image } from '@/components/ui/image';
import { BRAND } from '@/lib/brandIdentity';

// AUTO LEADS brand logo — "CONSTRUCTION INTELLIGENCE" tagline
export default function LgnyLogo({ size = 36, withText = true, light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <Image
        src={light ? BRAND.logoLight : BRAND.logoDark}
        alt={`${BRAND.name} logo`}
        fittingType="fit"
        className="shrink-0"
        style={{ height: size, width: 'auto', borderRadius: 4 }}
      />
      {withText && (
        <small className="text-[8px] uppercase tracking-[.14em]" style={{ color: light ? '#9a9a9e' : '#666' }}>{BRAND.tagline}</small>
      )}
    </div>
  );
}