import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import Brand from './Brand';
import AiPanel from './AiPanel';
import { portalNav } from './data';

export default function PortalShell({ children, assistant = false }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="portal">
      <aside className={open ? 'sidebar open' : 'sidebar'}>
        <div className="side-top">
          <Brand variant="monogram" />
          <button onClick={() => setOpen(false)}>×</button>
        </div>
        <div className="workspace">
          <b>Acme Manufacturing</b>
          <small>Growth operating system</small>
        </div>
        <nav>
          {portalNav.map(([label, to]) => (
            <NavLink key={to} to={to} end={to === '/app'} onClick={() => setOpen(false)}>{label}</NavLink>
          ))}
        </nav>
        <div className="side-help">
          <b>Need help interpreting results?</b>
          <p>Book a strategy call with a human reviewer.</p>
          <button>Book a call</button>
        </div>
      </aside>
      <div className="portal-main">
        <header>
          <button className="mobile-menu" onClick={() => setOpen(true)}>☰</button>
          <input placeholder="Search audits, issues, opportunities…" />
          <button className="btn dark">+ New audit</button>
          <span className="avatar">AM</span>
        </header>
        <div className={assistant ? 'portal-content with-ai' : 'portal-content'}>
          <div className="portal-page">{children}</div>
          {assistant && <AiPanel />}
        </div>
      </div>
    </div>
  );
}