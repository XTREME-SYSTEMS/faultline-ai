import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Terminal, MessageSquare, Building2, Globe, Shield, ShieldCheck,
  Search, TrendingUp, Package, DollarSign, Users, FileText, PenTool,
  Database, Video, Share2, Settings, Layers, Cpu, Zap, ChevronDown,
  Copy, Images, ListChecks, Archive, BarChart3, Gauge
} from 'lucide-react';

// Three-module sidebar organization:
// 1. Xtreme Clone System (main focus — cloning, building, business formation)
// 2. Xtreme OS (core OS — command center, store, media, admin)
// 3. FaultLine AI (archived — old diagnostic/audit/client system)
const MODULES = [
  {
    id: 'ghl-clone',
    label: 'GoHighLevel Clone',
    icon: Copy,
    accent: '#059669',
    archived: false,
    collapsed: false,
    items: [
      { to: '/app/ghl-crm', label: 'CRM + Pipelines', icon: Users },
      { to: '/app/ghl-funnels', label: 'Funnels & Sites', icon: Layers },
    ]
  },
  {
    id: 'clone-system',
    label: 'Xtreme Clone System',
    icon: Copy,
    accent: '#C89B3C',
    archived: false,
    collapsed: false,
    items: [
      { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/app/niche-websites', label: 'Niche Search', icon: Search },
      { to: '/app/clone-queue', label: 'Clone Queue', icon: ListChecks },
      { to: '/app/clone-studio', label: 'Clone Studio', icon: Copy },
      { to: '/app/clone-gallery', label: 'Clone Gallery', icon: Images },
      { to: '/app/business', label: 'Business Hub', icon: Building2 },
      { to: '/app/template-library', label: 'Template Library', icon: Layers },
      { to: '/app/clone-pipeline', label: 'Clone Pipeline', icon: ShieldCheck },
      { to: '/app/multi-site', label: 'Multi-Site Manager', icon: Globe },
      { to: '/app/build-studio', label: 'Build Studio', icon: Layers },
    ]
  },
  {
    id: 'xtreme-os',
    label: 'Xtreme OS',
    icon: Terminal,
    accent: '#2563eb',
    archived: false,
    collapsed: false,
    items: [
      { to: '/app/command-center', label: 'Command Center', icon: Terminal },
      { to: '/app/chat', label: 'Chat', icon: MessageSquare },
      { to: '/store', label: 'Store', icon: Package },
      { to: '/app/tool-advisor', label: 'Tool Advisor', icon: Zap },
      { to: '/app/xps-catalog', label: 'XPS Catalog', icon: Layers },
      { to: '/app/marketplace', label: 'Implementation Market', icon: DollarSign },
      { to: '/app/books', label: 'Books', icon: DollarSign },
      { to: '/app/visual-studio', label: 'Visual Studio', icon: PenTool },
      { to: '/app/video-studio', label: 'Video Studio', icon: Video },
      { to: '/app/social-media', label: 'Social Media', icon: Share2 },
      { to: '/app/seo-console', label: 'SEO Console', icon: Gauge },
      { to: '/app/ai-control', label: 'AI Control', icon: Cpu },
      { to: '/app/database', label: 'Database', icon: Database },
      { to: '/app/settings', label: 'Settings', icon: Settings },
    ]
  },
  {
    id: 'faultline',
    label: 'FaultLine AI',
    icon: Archive,
    accent: '#666',
    archived: true,
    collapsed: true, // collapsed by default
    items: [
      { to: '/app/discovery-engine', label: 'Discovery Engine', icon: Search },
      { to: '/app/industry-opportunities', label: 'Opportunities', icon: TrendingUp },
      { to: '/app/competitive-intel', label: 'Competitive Intel', icon: TrendingUp },
      { to: '/app/security-pipeline', label: 'Security Pipeline', icon: Shield },
      { to: '/app/qa-center', label: 'QA Dashboard', icon: Shield },
      { to: '/app/enhancement-engine', label: 'Enhancement Engine', icon: Zap },
      { to: '/app/roi', label: 'Client ROI', icon: BarChart3 },
      { to: '/app/financial-sync', label: 'Financial Sync', icon: DollarSign },
      { to: '/app/white-label', label: 'White Label', icon: Layers },
      { to: '/app/audit-templates', label: 'Audit Templates', icon: FileText },
      { to: '/app/partner-api', label: 'Partner API', icon: Zap },
      { to: '/app/pcu-control', label: 'PCU Control', icon: Cpu },
      { to: '/app/client-projects', label: 'Client Projects', icon: Users },
      { to: '/app/client-portal', label: 'Client Portal', icon: Users },
      { to: '/app/demo-portal', label: 'Demo Portal', icon: Globe },
      { to: '/app/deliverable-studio', label: 'Deliverable Studio', icon: FileText },
      { to: '/app/drive-sync', label: 'Drive Sync', icon: Database },
      { to: '/app/esign', label: 'E-Signature', icon: FileText },
    ]
  },
];

export default function XtremeOSSidebar() {
  const [collapsedModules, setCollapsedModules] = useState(
    Object.fromEntries(MODULES.map(m => [m.id, m.collapsed]))
  );

  function toggleModule(id) {
    setCollapsedModules(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <aside className="xtremeos-sidebar" style={{
      width: 240, flexShrink: 0, background: '#090909', color: '#fff',
      position: 'fixed', left: 0, top: 60, bottom: 0, overflowY: 'auto',
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
            <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 15, display: 'block', lineHeight: 1.1 }}>
              Xtreme<span style={{ color: '#E7C86E' }}>Clone</span> System
            </b>
            <small style={{ color: '#666', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em' }}>xtremeclonesystems.com</small>
          </div>
        </div>
      </div>

      {/* Module Navigation */}
      <nav style={{ padding: '8px 8px 60px' }}>
        {MODULES.map(mod => {
          const isCollapsed = collapsedModules[mod.id];
          return (
            <div key={mod.id} style={{ marginBottom: 6 }}>
              {/* Module Header */}
              <button
                onClick={() => toggleModule(mod.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 12px 8px', background: 'none', border: 0,
                  color: mod.archived ? '#555' : mod.accent,
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <mod.icon size={13} />
                  {mod.label}
                  {mod.archived && (
                    <span style={{
                      padding: '2px 5px', borderRadius: 3, background: '#1a1a1a', color: '#555',
                      fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em',
                      border: '1px solid #333',
                    }}>Archived</span>
                  )}
                </span>
                <ChevronDown size={11} style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: '.2s', color: '#555' }} />
              </button>
              {/* Module Items */}
              {!isCollapsed && (
                <div style={{ display: 'grid', gap: 1, marginBottom: 6 }}>
                  {mod.items.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      style={({ isActive }) => ({
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 12px', borderRadius: 5, fontSize: 13,
                        color: mod.archived ? '#555' : (isActive ? '#fff' : '#bbb'),
                        background: isActive ? '#232323' : 'none',
                        boxShadow: isActive ? `inset 3px 0 ${mod.archived ? '#555' : '#C89B3C'}` : 'none',
                        textDecoration: 'none',
                        opacity: mod.archived ? 0.6 : 1,
                      })}
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon size={15} style={{ flexShrink: 0, color: mod.archived ? '#444' : (isActive ? '#E7C86E' : '#888') }} />
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