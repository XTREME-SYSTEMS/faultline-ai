import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Copy, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import StepDiscover from '@/components/clone-studio/StepDiscover';
import StepSelect from '@/components/clone-studio/StepSelect';
import StepClone from '@/components/clone-studio/StepClone';
import StepCustomize from '@/components/clone-studio/StepCustomize';
import StepFinalize from '@/components/clone-studio/StepFinalize';

const STEPS = [
  { n: 1, label: 'Discover' },
  { n: 2, label: 'Select' },
  { n: 3, label: 'Clone' },
  { n: 4, label: 'Customize' },
  { n: 5, label: 'Finalize' },
];

export default function CloneStudio() {
  const [step, setStep] = useState(1);
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [launchId, setLaunchId] = useState(null);
  const [vercelUrl, setVercelUrl] = useState(null);
  const [selections, setSelections] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDiscover(input, mode) {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('discoverCloneCandidates', input);
      const cands = res.data?.candidates || res.candidates || [];
      if (cands.length === 0) throw new Error('No candidates found. Try a different search.');
      setCandidates(cands);
      setStep(2);
    } catch (e) {
      setError(e.message || 'Discovery failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(candidate) {
    setSelected(candidate);
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('autonomousCloneTo100', {
        target_url: candidate.url,
        industry: candidate.industry,
        business_name: candidate.name,
        project_name: `${candidate.name} — Clone Studio`,
        max_iterations: 5,
      });
      const id = res.data?.launch_project_id || res.launch_project_id;
      if (!id) throw new Error('Clone did not start — no project ID returned');
      setLaunchId(id);
      setStep(3);
    } catch (e) {
      setError(e.message || 'Clone failed to start');
    } finally {
      setLoading(false);
    }
  }

  function handleCloneComplete(project) {
    setVercelUrl(project.vercel_deployment_url || project.metadata?.vercel_deployment_url);
    setStep(4);
  }

  async function handleCustomizeComplete(sels) {
    setSelections(sels);
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('applyCustomization', {
        launch_project_id: launchId,
        selections: sels,
      });
      setVercelUrl(res.data?.vercel_url || res.vercel_url);
      setStep(5);
    } catch (e) {
      setError(e.message || 'Failed to apply customizations');
    } finally {
      setLoading(false);
    }
  }

  function handleRestart() {
    setStep(1);
    setCandidates([]);
    setSelected(null);
    setLaunchId(null);
    setVercelUrl(null);
    setSelections(null);
    setError('');
  }

  return (
    <>
    <XtremeOSSidebar />
    <div className="portal-page xtremeos-content" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240 }}>
      {/* Header */}
      <div style={{
        background: 'radial-gradient(circle at 82% 40%, #C89B3C45, transparent 25%), #0a0a0a',
        color: '#fff', padding: '36px 28px', margin: '-28px -28px 24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#E7C86E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>Clone Studio</p>
            <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 38, margin: '8px 0 4px', letterSpacing: '-.03em' }}>
              Clone <span style={{ color: '#E7C86E' }}>Studio</span>
            </h1>
            <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>Discover → clone → customize → finalize. Full pipeline, end-to-end autonomous.</p>
          </div>
          <Link to="/app" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#aaa', fontSize: 13 }}>
            <ChevronLeft size={16} /> Back to XtremeOS
          </Link>
        </div>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: '#fff', border: '1px solid #ddd', borderRadius: 10, overflow: 'hidden' }}>
        {STEPS.map((s, i) => (
          <div key={s.n} style={{
            flex: 1, padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 8,
            background: step === s.n ? '#faf8f2' : step > s.n ? '#f8f7f4' : 'transparent',
            borderRight: i < STEPS.length - 1 ? '1px solid #eee' : 'none',
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center',
              fontSize: 12, fontWeight: 700, flexShrink: 0,
              background: step > s.n ? '#237A4B' : step === s.n ? '#C89B3C' : '#eee',
              color: step >= s.n ? '#fff' : '#999',
            }}>
              {step > s.n ? '✓' : s.n}
            </div>
            <span style={{ fontSize: 13, fontWeight: step === s.n ? 700 : 500, color: step >= s.n ? '#333' : '#999' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 32, minHeight: 400 }}>
        {error && (
          <div style={{ padding: 14, background: '#f5d8d5', borderRadius: 8, color: '#a52d23', fontSize: 13, marginBottom: 20 }}>
            {error}
          </div>
        )}
        {step === 1 && <StepDiscover onDiscover={handleDiscover} loading={loading} />}
        {step === 2 && <StepSelect candidates={candidates} onSelect={handleSelect} onBack={() => setStep(1)} loading={loading} />}
        {step === 3 && launchId && <StepClone launchProjectId={launchId} candidate={selected} onComplete={handleCloneComplete} onError={() => {}} />}
        {step === 4 && launchId && <StepCustomize launchProjectId={launchId} onComplete={handleCustomizeComplete} />}
        {step === 5 && launchId && <StepFinalize launchProjectId={launchId} vercelUrl={vercelUrl} onRestart={handleRestart} />}
      </div>
    </div>
    </>
  );
}