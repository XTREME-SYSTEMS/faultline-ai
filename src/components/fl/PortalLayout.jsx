import { Outlet, useLocation, matchPath } from 'react-router-dom';
import { lazy, Suspense, useState, useEffect } from 'react';
import BottomNav from './BottomNav';

// Lazy-load the 5 bottom-nav tab pages for keep-alive (display:none when inactive)
const Overview = lazy(() => import('@/pages/Overview'));
const CommandCenter = lazy(() => import('@/pages/CommandCenter'));
const Chat = lazy(() => import('@/pages/Chat'));
const BusinessHub = lazy(() => import('@/pages/business/BusinessHub'));
const Settings = lazy(() => import('@/pages/Settings'));

const TAB_ROUTES = [
  { path: '/app', component: Overview },
  { path: '/app/command-center', component: CommandCenter },
  { path: '/app/chat', component: Chat },
  { path: '/app/business', component: BusinessHub },
  { path: '/app/settings', component: Settings },
];

const PageLoader = () => (
  <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
  </div>
);

export default function PortalLayout() {
  const location = useLocation();
  const [visited, setVisited] = useState(new Set());

  const activeIndex = TAB_ROUTES.findIndex(t =>
    matchPath({ path: t.path, end: true }, location.pathname) !== null
  );
  const isTabRoute = activeIndex !== -1;
  const activePath = isTabRoute ? TAB_ROUTES[activeIndex].path : null;

  useEffect(() => {
    if (activePath) {
      setVisited(prev => prev.has(activePath) ? prev : new Set([...prev, activePath]));
    }
  }, [activePath]);

  return (
    <>
      {/* Keep-alive tab stacks: visited tabs stay mounted, hidden via display:none */}
      {TAB_ROUTES.map(({ path, component: Comp }) => {
        if (!visited.has(path)) return null;
        const isActive = isTabRoute && activePath === path;
        return (
          <div key={path} style={{ display: isActive ? 'block' : 'none' }}>
            <Suspense fallback={<PageLoader />}>
              <Comp />
            </Suspense>
          </div>
        );
      })}

      {/* Non-tab routes render through Outlet */}
      {!isTabRoute && <Outlet />}

      <BottomNav />
    </>
  );
}