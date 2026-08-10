import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';

// BusinessHub — project list + new project creation
// Entry point for the Business Generator at /app/business

export default function BusinessHub() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [idea, setIdea] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('businessOrchestrator', { action: 'get_projects' });
      setProjects(res.data?.projects || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!idea.trim()) { setError('Enter your business idea first'); return; }
    setCreating(true);
    setError('');
    try {
      const res = await base44.functions.invoke('businessOrchestrator', {
        action: 'create_project',
        idea: idea.trim()
      });
      if (res.data?.error) { setError(res.data.error); setCreating(false); return; }
      navigate(`/app/business/${res.data.project.id}/chat`);
    } catch (e) {
      setError(e.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const phaseLabels = {
    intake: 'Intake', discovery: 'Discovery', viability: 'Viability', brand: 'Brand',
    model: 'Model', products: 'Products', website: 'Website', leads: 'Leads',
    sales: 'Sales', marketing: 'Marketing', financials: 'Financials', operations: 'Operations',
    launch: 'Launch', validation: 'Validation', complete: 'Complete'
  };

  return (
    <>
      <XtremeOSSidebar />
      <div className="portal-page" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240, transition: 'margin .3s' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <p style={{ color: '#D4AF37', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>Forge · Business Generator</p>
          <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 48, margin: '8px 0 0', letterSpacing: '-.03em' }}>Your Businesses</h1>
          <p style={{ color: '#73777F', fontSize: 16, margin: '8px 0 0', maxWidth: 600 }}>
            One idea in. A complete business out. Forge researches, brands, prices, and plans your entire business — launch-ready.
          </p>
        </div>

        {/* New Project Card */}
        <div style={{
          background: '#fff', border: '1px solid #C7CCD4', borderRadius: 12, padding: 28, marginBottom: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          {!showNew ? (
            <button onClick={() => setShowNew(true)} style={{
              width: '100%', padding: '20px', background: 'none', border: `2px dashed #C7CCD4`, borderRadius: 10,
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, fontWeight: 700, color: '#202124',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
            }}>
              <span style={{ fontSize: 22, color: '#D4AF37' }}>+</span> Start a New Business
            </button>
          ) : (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: '#D4AF37', margin: '0 0 8px' }}>Step 1 · Your Idea</p>
              <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 28, margin: '0 0 16px' }}>Describe the business you want.</h3>
              <p style={{ color: '#73777F', fontSize: 14, margin: '0 0 16px' }}>One sentence is enough. The AI will ask for the rest.</p>
              <textarea
                value={idea}
                onChange={e => setIdea(e.target.value)}
                placeholder="e.g. Create a mobile epoxy-flooring company serving homeowners in Tampa, Florida."
                style={{
                  width: '100%', minHeight: 80, padding: 14, border: '1px solid #C7CCD4', borderRadius: 8,
                  fontSize: 15, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box'
                }}
                autoFocus
              />
              {error && <p style={{ color: '#C63D34', fontSize: 13, margin: '10px 0' }}>{error}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={createProject} disabled={creating} style={{
                  background: '#0F0F10', color: '#fff', border: 0, borderRadius: 8, padding: '13px 28px',
                  fontSize: 14, fontWeight: 700, cursor: creating ? 'wait' : 'pointer', fontFamily: 'inherit',
                  opacity: creating ? 0.6 : 1
                }}>
                  {creating ? 'Creating…' : 'Begin →'}
                </button>
                <button onClick={() => { setShowNew(false); setIdea(''); setError(''); }} style={{
                  background: 'none', border: '1px solid #C7CCD4', borderRadius: 8, padding: '13px 20px',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#73777F'
                }}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Project List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#73777F' }}>Loading your projects…</div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#73777F' }}>
            <p style={{ fontSize: 40, margin: '0 0 12px' }}>💡</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#202124' }}>No businesses yet</p>
            <p style={{ fontSize: 14 }}>Start your first business above.</p>
          </div>
        ) : (
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#73777F', margin: '0 0 16px' }}>Active Projects</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {projects.map(p => (
                <div key={p.id} onClick={() => navigate(`/app/business/${p.id}/${p.current_phase === 'intake' ? 'chat' : p.current_phase}`)} style={{
                  background: '#fff', border: '1px solid #C7CCD4', borderRadius: 10, padding: 20,
                  cursor: 'pointer', transition: 'box-shadow .2s'
                }} onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                    <b style={{ fontSize: 15, fontFamily: "'Libre Caslon Display', serif" }}>{p.name}</b>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#D4AF37', background: '#D4AF3715', padding: '3px 8px', borderRadius: 4 }}>
                      {phaseLabels[p.current_phase] || p.current_phase}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: '#73777F', lineHeight: 1.5, margin: '0 0 12px' }}>{p.idea}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, background: '#F8F9FB', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${p.progress || 0}%`, height: '100%', background: '#D4AF37', borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#73777F' }}>{p.progress || 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
}