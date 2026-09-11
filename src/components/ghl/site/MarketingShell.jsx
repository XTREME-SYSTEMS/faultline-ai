import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import LgnyLogo from './LgnyLogo';

const NAV = [
  { to: '/lgny/features', label: 'Features' },
  { to: '/lgny/pricing', label: 'Pricing' },
  { to: '/lgny/solutions', label: 'Solutions' },
  { to: '/store', label: 'Store' },
  { to: '/lgny/about', label: 'About' },
];

export default function MarketingShell({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-[#000000] text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/lgny"><LgnyLogo size={32} /></Link>
          <nav className="hidden md:flex items-center gap-8">
            {NAV.map(n => (
              <Link key={n.to} to={n.to} className="text-sm font-medium text-slate-300 hover:text-white transition">{n.label}</Link>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white">Login</Link>
            <Link to="/register" className="px-4 py-2 rounded-lg text-sm font-bold bg-[#FFD700] text-[#000000] hover:bg-[#FFE566] transition">Start 14-day trial</Link>
          </div>
          <button className="md:hidden text-white" onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
        {open && (
          <div className="md:hidden border-t border-white/10 px-5 py-4 flex flex-col gap-3">
            {NAV.map(n => <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="text-sm font-medium text-slate-300">{n.label}</Link>)}
            <Link to="/register" className="mt-2 px-4 py-2 rounded-lg text-sm font-bold bg-[#FFD700] text-[#000000] text-center">Start 14-day trial</Link>
          </div>
        )}
      </header>

      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-[#000000] text-slate-300 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-5 grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2">
            <LgnyLogo size={34} />
            <p className="mt-4 text-sm text-slate-400 max-w-xs">The AI-powered construction intelligence platform. Capture, nurture, and close leads — all in one platform.</p>
          </div>
          {[
            { h: 'Product', links: ['Features', 'Pricing', 'Integrations', 'Mobile App'] },
            { h: 'Company', links: ['About', 'Careers', 'Blog', 'Contact'] },
            { h: 'Resources', links: ['Help Center', 'Community', 'API Docs', 'Status'] },
          ].map(col => (
            <div key={col.h}>
              <b className="text-white text-sm block mb-3">{col.h}</b>
              <ul className="space-y-2">{col.links.map(l => <li key={l}><Link to="/lgny" className="text-sm text-slate-400 hover:text-white">{l}</Link></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="max-w-7xl mx-auto px-5 mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between gap-3 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} FaultLine AI · faultline.ai</span>
          <span>Privacy · Terms · Security</span>
        </div>
      </footer>
    </div>
  );
}