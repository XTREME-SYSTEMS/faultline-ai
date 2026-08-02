import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import Brand from './Brand';
import AiPanel from './AiPanel';
import { portalNav } from './data';
import WorkflowSteps from './WorkflowSteps';

export default function PortalShell({ children, assistant = false }) {
  // assistant can be: false (no panel), true (default AiPanel), or a React node (custom coach)
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

  // One-time token refresh: push organization_id into the session so RLS sees it
  useEffect(() => {
    if (!user?.data?.organization_id) return;
    if (sessionStorage.getItem('fl_org_refreshed')) return;
    sessionStorage.setItem('fl_org_refreshed', 'true');
    base44.auth.updateMe({ organization_id: user.data.organization_id })
      .then(() => window.location.reload())
      .catch(() => {});
  }, [user]);

  const initials = (user?.full_name || user?.email?.split('@')[0] || 'U')
    .split(/[ ._-]/)
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
        <WorkflowSteps />
        <button onClick={handleLogout} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 5, fontSize: 13, fontWeight: 600, color: '#bbb', background: 'none', border: 0, cursor: 'pointer', marginTop: 16, fontFamily: 'inherit' }}>Sign out</button>
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
          <span className="avatar">{initials}</span>
        </header>
        <div className={assistant ? 'portal-content with-ai' : 'portal-content'}>
          <div className="portal-page">{children}</div>
          {assistant && (assistant === true ? <AiPanel /> : assistant)}
        </div>
      </div>
    </div>
  );
}