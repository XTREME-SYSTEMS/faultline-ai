import { useState } from 'react';
import { useParams, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import Brand from './Brand';

// BusinessShell — 3-panel command center layout for the Business Generator
// Left: AI strategist chat (black) | Main: workspace | Right: context panel (frost)
// Forge brand: black/gold-yellow/white/frost/silver, Libre Caslon + DM Sans

const PHASES = [
  ['intake', 'Intake', '📝'],
  ['discovery', 'Discovery', '🔍'],
  ['viability', 'Viability', '📊'],
  ['brand', 'Brand', '🎨'],
  ['model', 'Model', '💼'],
  ['products', 'Products', '📦'],
  ['website', 'Website', '🌐'],
  ['leads', 'Leads', '🎯'],
  ['sales', 'Sales', '🤝'],
  ['marketing', 'Marketing', '📣'],
  ['financials', 'Financials', '💰'],
  ['operations', 'Operations', '⚙️'],
  ['launch', 'Launch', '🚀'],
  ['validation', 'Validation', '✅']
];

export default function BusinessShell({ children, project, rightPanel }) {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobilePanel, setMobilePanel] = useState('main');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const handleLogout = async () => {
    await base44.auth.logout();
    navigate('/login');
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are the Forge AI business strategist. The user is building a business project. Respond concisely and helpfully.

PROJECT: ${project?.name || 'New project'}
IDEA: ${project?.idea || 'Not set yet'}
CURRENT PHASE: ${project?.current_phase || 'intake'}

USER MESSAGE: "${msg}"

Respond in 2-3 sentences. Be direct, confident, and actionable. If the user should navigate to a specific phase, mention it.`
      });
      const reply = typeof res === 'string' ? res : res?.content || 'I can help with that.';
      setChatMessages(prev => [...prev, { role: 'bot', text: reply }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'bot', text: 'Sorry, I had trouble responding. Try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const initials = (user?.full_name || user?.email?.split('@')[0] || 'U')
    .split(/[ ._-]/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const currentPhaseIdx = PHASES.findIndex(p => p[0] === project?.current_phase);

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FB', display: 'flex', flexDirection: 'column' }}>
      {/* Top Toolbar */}
      <header style={{
        height: 56, background: '#0F0F10', color: '#fff', display: 'flex', alignItems: 'center',
        gap: 16, padding: '0 20px', position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid #C7CCD420'
      }}>
        <Brand variant="monogram" />
        <div style={{ height: 24, width: 1, background: '#333' }} />
        {project ? (
          <NavLink to="/app/business" style={{ color: '#73777F', fontSize: 13, fontWeight: 600 }}>Projects</NavLink>
        ) : null}
        {project && (
          <>
            <span style={{ color: '#73777F' }}>/</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{project.name}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em',
              color: '#E1B726', background: '#E1B72615', padding: '3px 8px', borderRadius: 4
            }}>{project.current_phase}</span>
          </>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {project && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 80, height: 4, background: '#333', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${project.progress || 0}%`, height: '100%', background: '#E1B726', borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 11, color: '#73777F' }}>{project.progress || 0}%</span>
            </div>
          )}
          <span style={{ fontSize: 13, color: '#73777F', cursor: 'pointer' }}>🔔</span>
          <span className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{initials}</span>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left Panel — AI Strategist Chat */}
        <aside style={{
          width: 300, background: '#0F0F10', color: '#fff', display: 'flex', flexDirection: 'column',
          borderRight: '1px solid #C7CCD420', flexShrink: 0
        }} className="biz-chat-panel">
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #222' }}>
            <p style={{ color: '#E1B726', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', margin: 0 }}>AI Strategist</p>
            <p style={{ fontSize: 13, color: '#73777F', margin: '4px 0 0' }}>Your business co-pilot</p>
          </div>

          {/* Phase Navigation */}
          {project && (
            <nav style={{ padding: '12px 10px', borderBottom: '1px solid #222', maxHeight: 200, overflowY: 'auto' }}>
              {PHASES.map(([key, label, icon], i) => {
                const active = project.current_phase === key;
                const done = i < currentPhaseIdx;
                return (
                  <NavLink key={key} to={`/app/business/${projectId}/${key === 'intake' ? 'chat' : key}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 5,
                      fontSize: 12, fontWeight: 600, color: active ? '#fff' : done ? '#9a9a9a' : '#555',
                      background: active ? '#E1B72615' : 'none', marginBottom: 2,
                      borderLeft: active ? '2px solid #E1B726' : '2px solid transparent'
                    }}>
                    <span style={{ fontSize: 13 }}>{icon}</span>
                    {label}
                    {done && <span style={{ marginLeft: 'auto', color: '#E1B726', fontSize: 10 }}>✓</span>}
                  </NavLink>
                );
              })}
            </nav>
          )}

          {/* Chat Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {chatMessages.length === 0 && (
              <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: 12, fontSize: 13, color: '#bbb' }}>
                <b style={{ color: '#E1B726' }}>Forge AI</b>
                <p style={{ margin: '6px 0 0', lineHeight: 1.5 }}>
                  {project ? `Let us build ${project.name}. Ask me anything, or tell me what you want to work on.` : 'Describe your business idea and I will help you build it from the ground up.'}
                </p>
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} style={{
                background: m.role === 'user' ? '#E1B72615' : '#1a1a1a',
                border: m.role === 'user' ? '1px solid #E1B72630' : '1px solid #2a2a2a',
                borderRadius: 8, padding: 10, fontSize: 13, lineHeight: 1.5,
                color: m.role === 'user' ? '#fff' : '#ccc', marginLeft: m.role === 'user' ? 20 : 0
              }}>
                {m.role === 'bot' && <b style={{ color: '#E1B726', fontSize: 10, display: 'block', marginBottom: 4 }}>FORGE AI</b>}
                {m.text}
              </div>
            ))}
            {chatLoading && <div style={{ fontSize: 12, color: '#555', padding: '4px 10px' }} className="dot-anim">●●●</div>}
          </div>

          {/* Chat Input */}
          <div style={{ padding: 12, borderTop: '1px solid #222' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Ask the strategist…"
                style={{ flex: 1, background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: 10, borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }}
              />
              <button onClick={sendChat} disabled={chatLoading} style={{
                background: '#E1B726', border: 0, borderRadius: 6, padding: '0 14px', cursor: 'pointer',
                fontSize: 14, fontFamily: 'inherit'
              }}>→</button>
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 28 }} className="biz-main-panel">
          {children}
        </main>

        {/* Right Context Panel */}
        {rightPanel && (
          <aside style={{
            width: 280, background: '#fff', borderLeft: '1px solid #C7CCD4', flexShrink: 0,
            overflowY: 'auto', padding: 20
          }} className="biz-context-panel">
            {rightPanel}
          </aside>
        )}
      </div>

      {/* Mobile panel switcher */}
      <div style={{
        display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0F0F10',
        borderTop: '1px solid #333', zIndex: 100, padding: 8, gap: 4
      }} className="biz-mobile-switcher">
        <button onClick={() => setMobilePanel('chat')} style={mobileBtn(mobilePanel === 'chat')}>💬</button>
        <button onClick={() => setMobilePanel('main')} style={mobileBtn(mobilePanel === 'main')}>📋</button>
        {rightPanel && <button onClick={() => setMobilePanel('context')} style={mobileBtn(mobilePanel === 'context')}>ℹ️</button>}
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .biz-chat-panel, .biz-context-panel { display: none; }
          .biz-main-panel { padding: 16px; }
          .biz-mobile-switcher { display: flex; }
        }
      `}</style>
    </div>
  );
}

function mobileBtn(active) {
  return {
    flex: 1, padding: 10, background: active ? '#E1B72620' : 'none', border: 0,
    color: active ? '#E1B726' : '#73777F', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit', borderRadius: 6
  };
}