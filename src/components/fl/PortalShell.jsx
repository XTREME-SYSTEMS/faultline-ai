import { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import Brand from './Brand';
import AiPanel from './AiPanel';
import { portalNavCategories } from './data';

// Match a route path against a category's items (active = current route is in this category)
function categoryMatches(cat, pathname) {
  return cat.items.some(([, to]) => {
    if (to === '/app') return pathname === '/app';
    return pathname === to || pathname.startsWith(to + '/') || pathname.startsWith(to);
  });
}

export default function PortalShell({ children, assistant = false }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [orgName, setOrgName] = useState('Loading…');

  // Auto-expand the category matching the current route; all others collapsed.
  const activeCategory = useMemo(
    () => portalNavCategories.find(c => categoryMatches(c, location.pathname)),
    [location.pathname]
  );
  const [expanded, setExpanded] = useState(() => activeCategory ? { [activeCategory.label]: true } : {});

  // When the route changes, expand the matching category (keep any the user manually opened)
  useEffect(() => {
    if (activeCategory) setExpanded(prev => ({ ...prev, [activeCategory.label]: true }));
  }, [activeCategory]);

  const toggle = (label) => setExpanded(prev => ({ ...prev, [label]: !prev[label] }));

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
          {portalNavCategories.map(cat => {
            const isExpanded = !!expanded[cat.label];
            const isActiveCat = activeCategory?.label === cat.label;
            return (
              <div key={cat.label} style={{ marginBottom: 2 }}>
                <button
                  onClick={() => toggle(cat.label)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 10px', border: 0, borderRadius: 5, cursor: 'pointer',
                    background: isActiveCat ? '#1a1a1a' : 'none',
                    color: isActiveCat ? '#fff' : '#999',
                    fontSize: 12, fontWeight: 700, fontFamily: 'inherit', textAlign: 'left',
                    boxShadow: isActiveCat ? 'inset 3px 0 var(--gold)' : 'none'
                  }}
                >
                  <span style={{
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                    width: 20, height: 20, borderRadius: '50%', fontSize: 10, fontWeight: 700,
                    border: `1px solid ${isActiveCat ? 'var(--gold)' : '#3a3a3a'}`,
                    background: isActiveCat ? 'var(--gold)' : 'transparent',
                    color: isActiveCat ? '#111' : '#888'
                  }}>{cat.step}</span>
                  <span style={{ color: 'var(--gold)', fontSize: 13 }}>{cat.icon}</span>
                  <span style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '.08em', fontSize: 11 }}>{cat.label}</span>
                  <span style={{ fontSize: 11, color: isActiveCat ? 'var(--gold)' : '#555' }}>{isExpanded ? '−' : '+'}</span>
                </button>
                {isExpanded && (
                  <div style={{ paddingBottom: 4 }}>
                    {cat.items.map(([label, to]) => (
                      <NavLink
                        key={to}
                        to={to}
                        end={to === '/app'}
                        onClick={() => setOpen(false)}
                        style={({ isActive }) => ({
                          display: 'block',
                          padding: '7px 10px 7px 42px',
                          fontSize: 12.5,
                          fontWeight: 500,
                          color: isActive ? '#fff' : '#999',
                          background: isActive ? '#232323' : 'transparent'
                        })}
                      >
                        {label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
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