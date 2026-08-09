import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Terminal, MessageSquare, Building2, Settings as SettingsIcon } from 'lucide-react';

const TABS = [
  { to: '/app', label: 'XtremeOS', icon: LayoutDashboard, end: true },
  { to: '/app/command-center', label: 'Command', icon: Terminal },
  { to: '/app/chat', label: 'Chat', icon: MessageSquare },
  { to: '/app/business', label: 'Build', icon: Building2 },
  { to: '/app/settings', label: 'Settings', icon: SettingsIcon },
];

export default function BottomNav() {
  return (
    <nav className="fl-bottom-nav">
      <div className="fl-bottom-nav-inner">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}