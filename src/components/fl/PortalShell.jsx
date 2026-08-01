import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import Brand from './Brand';
import AiPanel from './AiPanel';
import { portalNav } from './data';

export default function PortalShell({ children, assistant = false }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState('Loading…');

  const handleLogout = async () => {
    await base44.auth.logout();
    navigate('/login');
  };

  useEffect(() => {
    if (user?.data?.organization_id) {
      base44.entities.Organization.get(user.data.organization_id)
        .then(org => setOrgName(org?.name || 'Your workspace'))
        .catch(() => setOrgName('Your workspace'));
    } else if (user) {
      setOrgName('Your workspace');
    }
  }, [user]);

  return (
    <div className="portal">
      <aside className={open ? 'sidebar open' : 'sidebar'}>
        <div className="side-top">
          <Brand variant="monogram" />
          <button onClick={() => setOpen(false)}>×</button>
        </div>
        <div className="workspace">
          <b>{orgName}</b>
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
          <button onClick={handleLogout} className="btn outline" style={{ padding: '8px 14px', fontSize: 12 }}>Sign out</button>
        </header>
        <div className={assistant ? 'portal-content with-ai' : 'portal-content'}>
          <div className="portal-page">{children}</div>
          {assistant && <AiPanel />}
        </div>
      </div>
    </div>
  );
}