import { Link } from 'react-router-dom';

// Xtreme AI Systems brand logos (uploaded from the official brand handoff package).
// Per the brand guide:
//  - logo-light.png = dark-colored logo for LIGHT surfaces (white site header)
//  - logo-dark.png  = light-colored logo for DARK surfaces (portal sidebar, dark footer)
// The wordmark is artwork — always render the image, never retype the name in web fonts.
const LOGOS = {
  dark: 'https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633/ed45981bc_logo-light.png',      // variant 'dark' = dark logo → light surfaces
  light: 'https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633/a12021ad5_logo-dark.png',     // variant 'light' = light logo → dark surfaces
  monogram: 'https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633/a12021ad5_logo-dark.png'  // portal sidebar (dark) — full logo w/ wordmark
};

export default function Brand({ variant = 'dark' }) {
  const src = LOGOS[variant] || LOGOS.dark;
  const className = variant === 'monogram' ? 'mono' : '';
  return (
    <Link className="brand" to="/">
      <img className={className} src={src} alt="Xtreme AI Systems" />
    </Link>
  );
}