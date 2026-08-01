import { Link } from 'react-router-dom';

export default function Brand() {
  return (
    <Link className="brand" to="/">
      <img src="/logo.svg" alt="FaultLine AI" />
      <span>
        <b>FaultLine <i>AI</i></b>
        <small>Expose what’s broken. Build what works.</small>
      </span>
    </Link>
  );
}