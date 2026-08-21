import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { AIStepCoach } from '@/components/client-portal/AIStepCoach';
import { CheckCircle2, Rocket, Building2, Palette, FileText, Globe, Layout, Loader2 } from 'lucide-react';
import { StepQuestionnaire } from '@/components/client-portal/onboarding/StepQuestionnaire';
import { StepLogoPack } from '@/components/client-portal/onboarding/StepLogoPack';
import { StepBrandPack } from '@/components/client-portal/onboarding/StepBrandPack';
import { StepWebPack } from '@/components/client-portal/onboarding/StepWebPack';
import { StepContentReview } from '@/components/client-portal/onboarding/StepContentReview';
import { StepDomainLaunch } from '@/components/client-portal/onboarding/StepDomainLaunch';

const TOTAL_STEPS = 6;
const STEP_META = [
  { icon: Building2, title: 'Discovery', desc: 'Answer questions about your business' },
  { icon: Palette, title: 'Logo Pack', desc: 'AI-generated logo concepts' },
  { icon: Palette, title: 'Brand Pack', desc: 'Colors, fonts, style direction' },
  { icon: Layout, title: 'Web Pack', desc: 'Choose a template design' },
  { icon: FileText, title: 'Content', desc: 'Review your website copy' },
  { icon: Globe, title: 'Launch', desc: 'Connect domain & go live' },
];

export default function ClientOnboardingPortal() {
  const [user, setUser] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [suggestions, setSuggestions] = useState({});

  // Load user + onboarding record + templates
  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        const orgId = me?.data?.organization_id || 'default';
        const existing = await base44.entities.ClientOnboarding.filter({ organization_id: orgId });
        let record = existing[0];
        if (!record) {
          record = await base44.entities.ClientOnboarding.create({
            organization_id: orgId,
            current_step: 1,
            total_steps: TOTAL_STEPS,
            status: 'in_progress',
          });
        }
        setOnboarding(record);

        // Load epoxy templates — only those with valid URLs (filter potential 404s)
        const projects = await base44.entities.LaunchProject.filter({ organization_id: orgId, status: 'passed' });
        const epoxy = projects.filter(p => {
          const t = `${p.project_name || ''} ${p.business_name || ''} ${p.industry || ''}`.toLowerCase();
          return (t.includes('epoxy') || t.includes('garage') || t.includes('concrete') || t.includes('floor') || t.includes('coating'))
            && p.vercel_deployment_url  // must have a URL
            && p.benchmark_url;          // must have source URL for screenshots
        }).slice(0, 12);
        setTemplates(epoxy);
      } catch (e) {
        console.error('Onboarding load error:', e);
      }
      setLoading(false);
    })();
  }, []);

  const update = useCallback(async (data) => {
    if (!onboarding) return;
    setSaving(true);
    try {
      const updated = await base44.entities.ClientOnboarding.update(onboarding.id, data);
      setOnboarding(updated);
    } catch (e) {
      console.error('Update error:', e);
    }
    setSaving(false);
  }, [onboarding]);

  const completeStep = async (stepData) => {
    const nextStep = (onboarding.current_step || 1) + 1;
    const isLast = nextStep > TOTAL_STEPS;
    await update({
      ...stepData,
      current_step: isLast ? TOTAL_STEPS : nextStep,
      status: isLast ? 'completed' : 'in_progress',
      completed_at: isLast ? new Date().toISOString() : undefined,
    });
  };

  const goBack = async () => {
    if (!onboarding || onboarding.current_step <= 1) return;
    await update({ current_step: onboarding.current_step - 1 });
  };

  const handleSuggest = (type, data) => {
    setSuggestions(prev => ({ ...prev, [type]: data }));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f7f7f5' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#C89B3C' }} />
      </div>
    );
  }

  const step = onboarding?.current_step || 1;

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f5', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ height: 64, background: '#fff', borderBottom: '1px solid #e5e1da', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#0a0a0a', display: 'grid', placeItems: 'center' }}>
            <Rocket size={18} color="#C89B3C" />
          </div>
          <div>
            <b style={{ fontSize: 14 }}>Client Onboarding</b>
            <p style={{ fontSize: 10, color: '#888', margin: 0 }}>AI-Guided Website Builder</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#666' }}>
          {user?.email && <span>{user.email}</span>}
          <Link to="/app" style={{ color: '#888', fontSize: 12, textDecoration: 'underline' }}>Exit</Link>
        </div>
      </header>

      {/* Progress bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e1da', padding: '16px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, maxWidth: 900, margin: '0 auto' }}>
          {STEP_META.map((s, i) => {
            const num = i + 1;
            const isDone = num < step;
            const isCurrent = num === step;
            const Icon = s.icon;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEP_META.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center',
                    background: isDone ? '#237A4B' : isCurrent ? '#C89B3C' : '#e5e1da',
                    color: isDone || isCurrent ? '#fff' : '#999',
                    border: isCurrent ? '2px solid #C89B3C' : '2px solid transparent',
                    transition: 'all .2s',
                  }}>
                    {isDone ? <CheckCircle2 size={18} /> : <Icon size={16} />}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 600, color: isCurrent ? '#8A641C' : isDone ? '#237A4B' : '#999', whiteSpace: 'nowrap' }}>{s.title}</span>
                </div>
                {i < STEP_META.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: isDone ? '#237A4B' : '#e5e1da', margin: '0 4px', marginBottom: 18, transition: 'background .2s' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main content + AI coach */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', minHeight: 0 }}>
        {/* Step content */}
        <div style={{ padding: '32px 40px', overflowY: 'auto' }}>
          {onboarding?.status === 'completed' ? (
            <CompletionScreen onboarding={onboarding} onRestart={() => update({ status: 'in_progress', current_step: 1 })} />
          ) : (
            <StepContent
              step={step}
              onboarding={onboarding}
              templates={templates}
              suggestions={suggestions}
              saving={saving}
              onComplete={completeStep}
              onBack={goBack}
              onUpdate={update}
            />
          )}
        </div>

        {/* AI Coach */}
        <aside style={{ borderLeft: '1px solid #e5e1da', position: 'sticky', top: 112, height: 'calc(100vh - 112px)', overflow: 'hidden' }}>
          <AIStepCoach step={step} onboarding={onboarding} onSuggest={handleSuggest} />
        </aside>
      </div>
    </div>
  );
}

// ─── STEP CONTENT ROUTER ─────────────────────────────────────────────
function StepContent({ step, onboarding, templates, suggestions, saving, onComplete, onBack, onUpdate }) {
  switch (step) {
    case 1: return <StepQuestionnaire onboarding={onboarding} saving={saving} onComplete={onComplete} onBack={onBack} />;
    case 2: return <StepLogoPack onboarding={onboarding} saving={saving} onComplete={onComplete} onBack={onBack} onUpdate={onUpdate} />;
    case 3: return <StepBrandPack onboarding={onboarding} saving={saving} onComplete={onComplete} onBack={onBack} />;
    case 4: return <StepWebPack onboarding={onboarding} templates={templates} saving={saving} onComplete={onComplete} onBack={onBack} />;
    case 5: return <StepContentReview onboarding={onboarding} saving={saving} onComplete={onComplete} onBack={onBack} />;
    case 6: return <StepDomainLaunch onboarding={onboarding} saving={saving} onComplete={onComplete} onBack={onBack} />;
    default: return null;
  }
}

// ─── COMPLETION SCREEN ───────────────────────────────────────────────
function CompletionScreen({ onboarding, onRestart }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#237A4B', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
        <CheckCircle2 size={36} color="#fff" />
      </div>
      <h1 style={{ font: "400 34px 'Libre Caslon Display', serif", margin: '0 0 12px' }}>Onboarding Complete!</h1>
      <p style={{ fontSize: 15, color: '#666', marginBottom: 24 }}>Your website is live and ready. You can revisit any step to make changes.</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {onboarding?.selected_template_url && (
          <a href={onboarding.selected_template_url} target="_blank" rel="noopener noreferrer" className="btn dark" style={{ fontSize: 13, padding: '12px 24px', textDecoration: 'none' }}>View Website</a>
        )}
        <button onClick={onRestart} className="btn outline" style={{ fontSize: 13, padding: '12px 24px' }}>Edit Setup</button>
      </div>
    </div>
  );
}