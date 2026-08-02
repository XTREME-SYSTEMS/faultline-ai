import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalShell from '@/components/fl/PortalShell';
import SetupCoach from '@/components/fl/SetupCoach';
import { CLIENT_PHASES } from '@/components/fl/clientSetupPhases';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export default function ClientSetupWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [config, setConfig] = useState(null);
  const [configId, setConfigId] = useState(null);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const orgId = user?.data?.organization_id;
  const phase = CLIENT_PHASES[phaseIndex];

  const loadCompanies = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await base44.functions.invoke('getPortalData', {});
      setCompanies((res.data || res).companies || []);
    } catch (e) {
      console.error(e);
    }
  }, [orgId]);

  const loadConfig = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    try {
      await loadCompanies();
      const existing = await base44.entities.ClientPortalConfig.filter({ organization_id: orgId });
      if (existing.length > 0 && !existing[0].setup_complete) {
        const c = existing[0];
        setConfig(c);
        setConfigId(c.id);
        setPhaseIndex(c.current_phase || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [orgId, loadCompanies]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleComplete = async (phaseConfig) => {
    setSaving(true);
    try {
      const companyId = phaseConfig.company_id || config?.company_id;
      if (!configId && companyId) {
        const created = await base44.entities.ClientPortalConfig.create({
          organization_id: orgId,
          company_id: companyId,
          current_phase: 1,
          ...phaseConfig
        });
        setConfig(created);
        setConfigId(created.id);
      } else if (configId) {
        const merged = { ...phaseConfig, current_phase: phaseIndex + 1 };
        const updated = await base44.entities.ClientPortalConfig.update(configId, merged);
        setConfig(updated);
      }
      if (phaseIndex < CLIENT_PHASES.length - 1) {
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
        <div style={{ padding: 60, textAlign: 'center', color: '#888' }}>Loading client setup…</div>
      </PortalShell>
    );
  }

  const completedCount = phaseIndex;
  const progress = Math.round((completedCount / CLIENT_PHASES.length) * 100);

  // Enrich the first phase prompt with the company list
  const enrichedPhase = phaseIndex === 0 ? {
    ...phase,
    prompt: `${phase.prompt}

Available companies (pick one of these):
${companies.length > 0 ? companies.map(c => `- ${c.name} (id: ${c.id}, status: ${c.status})`).join('\n') : '(no companies yet — tell the user to run the discovery engine first)'}`
  } : phase;

  return (
    <PortalShell>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', minHeight: 'calc(100vh - 72px)' }}>
        {/* Phase rail */}
        <aside style={{ background: '#0d0d0d', borderRight: '1px solid #2b2b2b', padding: '24px 0' }}>
          <div style={{ padding: '0 24px 20px', borderBottom: '1px solid #2b2b2b' }}>
            <p className="eyebrow" style={{ color: 'var(--gold2)', margin: '0 0 6px' }}>Client portal wizard</p>
            <h2 style={{ font: '400 24px Libre Caslon Display, serif', color: '#fff', margin: 0, letterSpacing: '-.02em' }}>
              Build client portal
            </h2>
            <div style={{ marginTop: 14, height: 6, borderRadius: 3, background: '#1b1b1b', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--gold2), var(--gold))', transition: 'width .4s' }} />
            </div>
            <small style={{ color: '#888', fontSize: 12 }}>{completedCount} of {CLIENT_PHASES.length} steps · {progress}%</small>
          </div>
          <nav style={{ padding: '12px 0' }}>
            {CLIENT_PHASES.map((p, i) => {
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
          {phaseIndex >= CLIENT_PHASES.length - 1 && config?.company_id && (
            <div style={{ padding: '20px 24px' }}>
              <a href={`/portal/${config.company_id}`} target="_blank" rel="noopener noreferrer" className="btn gold" style={{ width: '100%', display: 'block', textAlign: 'center', marginBottom: 8 }}>
                Open client portal →
              </a>
              <button onClick={() => navigate('/app')} className="btn outline" style={{ width: '100%', background: '#1b1b1b', color: '#fff', borderColor: '#333' }}>
                Back to dashboard
              </button>
            </div>
          )}
        </aside>

        {/* Coach area */}
        <main style={{ background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #2b2b2b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--gold2)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em' }}>
                Step {phaseIndex + 1} of {CLIENT_PHASES.length}
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
              phase={enrichedPhase}
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