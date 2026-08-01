import { Link } from 'react-router-dom';

const LOGOS = {
  dark: '/assets/faultline/logos/svg/logo-horizontal-dark-transparent.svg',
  light: '/assets/faultline/logos/svg/logo-horizontal-light-transparent.svg',
  monogram: '/assets/faultline/monogram/svg/monogram-gold-black-transparent.svg'
};

export default function Brand({ variant = 'dark' }) {
  if (variant === 'monogram') {
    return (
      <Link className="brand" to="/">
        <img className="mono" src={LOGOS.monogram} alt="FaultLine AI" />
        <span>
          <b>FaultLine <i>AI</i></b>
          <small>Expose what&rsquo;s broken. Build what works.</small>
        </span>
      </Link>
    );
  }
  return (
    <Link className="brand" to="/">
      <img src={LOGOS[variant]} alt="FaultLine AI" />
    </Link>
  );
}