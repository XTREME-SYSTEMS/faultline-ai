import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Brand from './Brand';
import { publicNav } from './data';

export default function MarketingShell({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <header className="site-header">
        <div className="container header-row">
          <Brand />
          <nav className={open ? 'public-nav open' : 'public-nav'}>
            {publicNav.map(([label, to]) => (
              <NavLink key={to} to={to} onClick={() => setOpen(false)}>{label}</NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <Link to="/login">Sign in</Link>
            <Link className="btn dark" to="/register">Start free audit →</Link>
            <button className="menu" onClick={() => setOpen(!open)}>☰</button>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer>
        <section className="footer-cta">
          <div className="container">
            <div>
              <p className="eyebrow">A stronger business starts with the truth</p>
              <h2>Stop guessing. Start fixing.<br /><span>Build what works.</span></h2>
            </div>
            <div>
              <Link className="btn gold" to="/register">Start free audit →</Link>
              <Link className="btn outline-light" to="/contact">Book a strategy call</Link>
            </div>
          </div>
        </section>
        <div className="container footer-grid">
          <Brand />
          <div>
            <b>Product</b>
            <Link to="/product">Features</Link>
            <Link to="/how-it-works">How it works</Link>
            <Link to="/pricing">Pricing</Link>
          </div>
          <div>
            <b>Solutions</b>
            <Link to="/solutions">Website intelligence</Link>
            <Link to="/solutions">Operational audits</Link>
            <Link to="/solutions">Repair plans</Link>
          </div>
          <div>
            <b>Company</b>
            <Link to="/about">About</Link>
            <Link to="/resources">Resources</Link>
            <Link to="/contact">Contact</Link>
          </div>
          <div>
            <b>Practical intelligence, not noise.</b>
            <p>Monthly notes on business systems, AI readiness, and measurable repair.</p>
            <input placeholder="you@company.com" />
          </div>
        </div>
        <div className="container legal">© 2026 FaultLine AI. Private diagnostics. Evidence-backed action.</div>
      </footer>
    </div>
  );
}