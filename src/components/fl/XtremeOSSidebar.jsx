import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Terminal, MessageSquare, Building2, Globe, Shield,
  Search, TrendingUp, Package, DollarSign, Users, FileText, PenTool,
  Database, Video, Share2, Settings, Layers, Cpu, Zap, ChevronDown
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/app', label: 'XtremeOS', icon: LayoutDashboard, end: true },
      { to: '/app/command-center', label: 'Command Center', icon: Terminal },
      { to: '/app/chat', label: 'Chat', icon: MessageSquare },
    ]
  },
  {
    label: 'Build',
    items: [
      { to: '/app/business', label: 'Business Hub', icon: Building2 },
      { to: '/app/website-generator', label: 'Website Generator', icon: Globe },
      { to: '/app/app-generator', label: 'App Generator', icon: Cpu },
      { to: '/app/universal-builder', label: 'Universal Builder', icon: Layers },
      { to: '/app/brand-generator', label: 'Brand Generator', icon: PenTool },
      { to: '/app/niche-websites', label: 'Niche Websites', icon: Globe },
    ]
  },
  {
    label: 'Marketplace',
    items: [
      { to: '/store', label: 'Store', icon: Package },
      { to: '/app/tool-advisor', label: 'Tool Advisor', icon: Zap },
      { to: '/app/xps-catalog', label: 'XPS Catalog', icon: Layers },
      { to: '/app/marketplace', label: 'Implementation Market', icon: DollarSign },
    ]
  },
  {
    label: 'Discovery',
    items: [
      { to: '/app/discovery-engine', label: 'Discovery Engine', icon: Search },
      { to: '/app/industry-opportunities', label: 'Opportunities', icon: TrendingUp },
      { to: '/app/competitive-intel', label: 'Competitive Intel', icon: TrendingUp },
    ]
  },
  {
    label: 'Security & QA',
    items: [
      { to: '/app/security-pipeline', label: 'Security Pipeline', icon: Shield },
      { to: '/app/qa-center', label: 'QA Dashboard', icon: Shield },
      { to: '/app/enhancement-engine', label: 'Enhancement Engine', icon: Zap },
    ]
  },
  {
    label: 'Operations',
    items: [
      { to: '/app/books', label: 'Books', icon: DollarSign },
      { to: '/app/financial-sync', label: 'Financial Sync', icon: DollarSign },
      { to: '/app/drive-sync', label: 'Drive Sync', icon: Database },
      { to: '/app/esign', label: 'E-Signature', icon: FileText },
    ]
  },
  {
    label: 'Clients',
    items: [
      { to: '/app/client-projects', label: 'Client Projects', icon: Users },
      { to: '/app/client-portal', label: 'Client Portal', icon: Users },
      { to: '/app/demo-portal', label: 'Demo Portal', icon: Globe },
      { to: '/app/deliverable-studio', label: 'Deliverable Studio', icon: FileText },
      { to: '/app/roi', label: 'Client ROI', icon: TrendingUp },
    ]
  },
  {
    label: 'Media & Tools',
    items: [
      { to: '/app/visual-studio', label: 'Visual Studio', icon: PenTool },
      { to: '/app/video-studio', label: 'Video Studio', icon: Video },
      { to: '/app/social-media', label: 'Social Media', icon: Share2 },
      { to: '/app/ai-control', label: 'AI Control', icon: Cpu },
      { to: '/app/xv', label: 'Xtreme Visualizer', icon: PenTool },
    ]
  },
  {
    label: 'Admin',
    items: [
      { to: '/app/white-label', label: 'White Label', icon: Layers },
      { to: '/app/audit-templates', label: 'Audit Templates', icon: FileText },
      { to: '/app/partner-api', label: 'Partner API', icon: Zap },
      { to: '/app/pcu-control', label: 'PCU Control', icon: Cpu },
      { to: '/app/database', label: 'Database', icon: Database },
      { to: '/app/settings', label: 'Settings', icon: Settings },
    ]
  },
];

export default function XtremeOSSidebar() {
  const [collapsed, setCollapsed] = useState(null);

  return (
    <aside className="xtremeos-sidebar" style={{
      width: 240, flexShrink: 0, background: '#090909', color: '#fff',
      position: 'fixed', left: 0, top: 0, bottom: 0, overflowY: 'auto',
      zIndex: 60, borderRight: '1px solid #2b2b2b',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {/* Brand */}
      <div style={{ padding: '20px 18px', borderBottom: '1px solid #2b2b2b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)',
            display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700, color: '#111'
          }}>X</div>
          <div>
            <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 18, display: 'block' }}>Xtreme<span style={{ color: '#E7C86E' }}>OS</span></b>
            <small style={{ color: '#777', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.12em' }}>Operating System</small>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '8px 8px 60px' }}>
        {NAV_GROUPS.map((group, gi) => {
          const isCollapsed = collapsed === gi;
          return (
            <div key={gi} style={{ marginBottom: 4 }}>
              <button
                onClick={() => setCollapsed(isCollapsed ? null : gi)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', background: 'none', border: 0, color: '#888',
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em',
                  cursor: 'pointer', textAlign: 'left'
                }}
              >
                <span>{group.label}</span>
                <ChevronDown size={12} style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: '.2s' }} />
              </button>
              {!isCollapsed && (
                <div style={{ display: 'grid', gap: 2, marginBottom: 8 }}>
                  {group.items.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      style={({ isActive }) => ({
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', borderRadius: 5, fontSize: 13,
                        color: isActive ? '#fff' : '#bbb',
                        background: isActive ? '#232323' : 'none',
                        boxShadow: isActive ? 'inset 3px 0 #C89B3C' : 'none',
                        textDecoration: 'none',
                      })}
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon size={15} style={{ flexShrink: 0, color: isActive ? '#E7C86E' : '#888' }} />
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}