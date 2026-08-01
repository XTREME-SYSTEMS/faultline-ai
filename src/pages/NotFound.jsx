import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="notfound">
      <img src="/assets/faultline/monogram/svg/monogram-gold-black-transparent.svg" alt="" />
      <h1>That page fell through a crack.</h1>
      <Link className="btn dark" to="/">Return home</Link>
    </div>
  );
}