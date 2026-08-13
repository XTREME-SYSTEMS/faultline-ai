import { Link } from 'react-router-dom';
import { Image } from '@/components/ui/image';
import { BRAND } from '@/lib/brandIdentity';

// AUTO LEADS brand logo — dark-master variant works on both light & dark surfaces
export default function Brand({ variant = 'dark' }) {
  const src = variant === 'light' ? BRAND.logoLight : BRAND.logoDark;
  return (
    <Link className="brand" to="/">
      <Image
        src={src}
        alt={BRAND.name}
        fittingType="fill"
        style={{ height: 40, width: 'auto', borderRadius: 4 }}
      />
    </Link>
  );
}