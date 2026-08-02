import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalShell from '@/components/fl/PortalShell';
import SetupCoach from '@/components/fl/SetupCoach';
import { PHASES } from '@/components/fl/setupPhases';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export default function SetupWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [configId, setConfigId] = useState(null);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const orgId = user?.data?.organization_id;
  const phase = PHASES[phaseIndex];

  const loadConfig = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    try {
      const existing = await base44.entities.SystemConfig.filter({ organization_id: orgId });
      if (existing.length > 0) {
        const c = existing[0];
        setConfig(c);
        setConfigId(c.id);
        setPhaseIndex(c.current_phase || 0);
      } else {
        const created = await base44.entities.SystemConfig.create({ organization_id: orgId, current_phase: 0 });
        setConfig(created);
        setConfigId(created.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleComplete = async (phaseConfig) => {
    setSaving(true);
    try {
      const merged = { ...phaseConfig, current_phase: phaseIndex + 1 };
      const updated = await base44.entities.SystemConfig.update(configId, merged);
      setConfig(updated);
      if (phaseIndex < PHASES.length - 1) {
        setPhaseIndex(phaseIndex + 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const goToPhase = (i) => {
    if (i <= phaseIndex) setPhaseIndex(i);
  };

  if (loading) {
    return (
      <PortalShell>
        <div style={{ padding: 60, textAlign: 'center', color: '#888' }}>Loading your setup…</div>
      </PortalShell>
    );
  }

  const completedCount = phaseIndex;
  const progress = Math.round((completedCount / PHASES.length) * 100);

  return (
    <PortalShell>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: 'calc(100vh - 72px)' }}>
        {/* Phase rail */}
        <aside style={{ background: '#0d0d0d', borderRight: '1px solid #2b2b2b', padding: '24px 0' }}>
          <div style={{ padding: '0 24px 20px', borderBottom: '1px solid #2b2b2b' }}>
            <p className="eyebrow" style={{ color: 'var(--gold2)', margin: '0 0 6px' }}>Setup wizard</p>
            <h2 style={{ font: '400 24px Libre Caslon Display, serif', color: '#fff', margin: 0, letterSpacing: '-.02em' }}>
              Build your system
            </h2>
            <div style={{ marginTop: 14, height: 6, borderRadius: 3, background: '#1b1b1b', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--gold2), var(--gold))', transition: 'width .4s' }} />
            </div>
            <small style={{ color: '#888', fontSize: 12 }}>{completedCount} of {PHASES.length} steps · {progress}%</small>
          </div>
          <nav style={{ padding: '12px 0' }}>
            {PHASES.map((p, i) => {
              const done = i < phaseIndex;
              const current = i === phaseIndex;
              const locked = i > phaseIndex;
              return (
                <button
                  key={p.key}
                  onClick={() => goToPhase(i)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12,
                    background: current ? 'rgba(200,155,60,.08)' : 'none', border: 0, borderBottom: '1px solid #1a1a1a',
                    cursor: locked ? 'not-allowed' : 'pointer', fontFamily: 'inherit', color: 'inherit'
                  }}
                >
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0,
                    background: done ? '#3a9d6e' : current ? 'var(--gold)' : '#1b1b1b',
                    color: done || current ? '#111' : '#555',
                    border: done || current ? 'none' : '1px solid #333'
                  }}>
                    {done ? '✓' : i + 1}
                  </span>
                  <span style={{ flex: 1 }}>
                    <b style={{ display: 'block', fontSize: 13, color: current ? '#fff' : done ? '#ccc' : '#666', fontWeight: 600 }}>{p.title}</b>
                    <small style={{ fontSize: 11, color: '#666' }}>{p.desc}</small>
                  </span>
                </button>
              );
            })}
          </nav>
          {phaseIndex >= PHASES.length - 1 && (
            <div style={{ padding: '20px 24px' }}>
              <button onClick={() => navigate('/app')} className="btn gold" style={{ width: '100%' }}>
                Go to dashboard →
              </button>
            </div>
          )}
        </aside>

        {/* Coach area */}
        <main style={{ background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #2b2b2b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--gold2)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em' }}>
                Step {phaseIndex + 1} of {PHASES.length}
              </p>
              <h1 style={{ font: '400 32px Libre Caslon Display, serif', color: '#fff', margin: '4px 0 0', letterSpacing: '-.02em' }}>
                {phase.icon} {phase.title}
              </h1>
            </div>
            {saving && <small style={{ color: 'var(--gold2)', fontSize: 13 }}>Saving…</small>}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <SetupCoach
              key={phaseIndex}
              phase={phase}
              phaseIndex={phaseIndex}
              config={config}
              existingConfig={config}
              onComplete={handleComplete}
            />
          </div>
        </main>
      </div>
    </PortalShell>
  );
}