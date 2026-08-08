import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Search, Target, Copy, Palette, Layers, Layout, Globe, Rocket,
  Loader2, CheckCircle2, XCircle, ChevronDown, Sparkles, ArrowRight, Lightbulb, ExternalLink, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

// AI-guided step-by-step generation pipeline timeline.
// Each step: discover → select → clone → logo → brand → web pack → website → launch
const STEPS = [
  { id: 'discover', title: 'Discover Top Performers', desc: 'Scan industries for the top profit- & wealth-generating websites. AI identifies their niche, revenue model, and client base.', icon: Search, action: 'Scan Industries' },
  { id: 'select', title: 'Select Clone Target', desc: 'Pick the top performer to clone, or let AI recommend the highest-profit-potential target.', icon: Target, action: 'Load Targets' },
  { id: 'clone', title: 'Clone System', desc: 'Analyze the target and build a superiority strategy — design direction, feature advantages, and conversion improvements.', icon: Copy, action: 'Clone Target' },
  { id: 'logo', title: 'Generate Logo Pack', desc: 'AI generates a premium logo pack — primary, monogram, and icon mark — tuned to the industry.', icon: Palette, action: 'Generate Logo Pack' },
  { id: 'brand', title: 'Generate Brand Pack', desc: 'Full brand system — colors, fonts, voice, messaging pillars, and tagline.', icon: Layers, action: 'Generate Brand Pack' },
  { id: 'webpack', title: 'Generate Web Pack', desc: 'Complete web design system — layout, component library, page structure, responsive rules.', icon: Layout, action: 'Generate Web Pack' },
  { id: 'website', title: 'Generate Website', desc: 'Production-ready website built from the packs — responsive, high-converting, real copy.', icon: Globe, action: 'Generate Website' },
  { id: 'launch', title: 'Validate & Launch', desc: '100/100 parity & operational validation, then autonomous launch to Vercel + GitHub + Drive + Supabase.', icon: Rocket, action: 'Validate & Launch' }
];

export default function GenerationPipeline() {
  const [activeStep, setActiveStep] = useState(0);
  const [stepStates, setStepStates] = useState({}); // { [id]: { status, result, guidance, showGuidance } }
  const [performers, setPerformers] = useState([]);
  const [selectedPerformer, setSelectedPerformer] = useState(null);
  const [industryFilter, setIndustryFilter] = useState('all');
  const [seedStatus, setSeedStatus] = useState(null);
  const [fullRunning, setFullRunning] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualIndustry, setManualIndustry] = useState('');
  const { user } = useAuth();

  // Check if the prompt library is seeded
  useEffect(() => {
    (async () => {
      try {
        const prompts = await base44.entities.PromptTemplate.list('-created_date', 1);
        if (!prompts || prompts.length === 0) setSeedStatus('empty');
        else setSeedStatus('seeded');
      } catch (e) { setSeedStatus('unknown'); }
    })();
  }, []);

  const seedLibrary = async () => {
    setStepStates(s => ({ ...s, discover: { ...s.discover, status: 'seeding' } }));
    try {
      const res = await base44.functions.invoke('seedPromptLibrary', {});
      setSeedStatus('seeded');
      setStepStates(s => ({ ...s, discover: { ...s.discover, status: undefined } }));
    } catch (e) {
      setStepStates(s => ({ ...s, discover: { ...s.discover, status: undefined } }));
    }
  };

  const runBuildPhase = useCallback(async (full) => {
    // Step 3: Clone
    setActiveStep(2);
    setStepStates(s => ({ ...s, clone: { status: 'running' } }));
    const cRes = await base44.functions.invoke('cloneTopWebsites', { category: full.industry, industry: full.industry, top_performer_id: full.id });
    setStepStates(s => ({ ...s, clone: { status: 'done', result: cRes.data || cRes } }));

    // Step 4: Logo
    setActiveStep(3);
    setStepStates(s => ({ ...s, logo: { status: 'running' } }));
    const lRes = await base44.functions.invoke('generateDesignPack', { pack_type: 'logo_pack', business_name: full.name, industry: full.industry });
    setStepStates(s => ({ ...s, logo: { status: 'done', result: lRes.data || lRes } }));

    // Step 5: Brand
    setActiveStep(4);
    setStepStates(s => ({ ...s, brand: { status: 'running' } }));
    const bRes = await base44.functions.invoke('generateDesignPack', { pack_type: 'brand_pack', business_name: full.name, industry: full.industry });
    setStepStates(s => ({ ...s, brand: { status: 'done', result: bRes.data || bRes } }));

    // Step 6: Web Pack
    setActiveStep(5);
    setStepStates(s => ({ ...s, webpack: { status: 'running' } }));
    const wRes = await base44.functions.invoke('generateDesignPack', { pack_type: 'web_pack', business_name: full.name, industry: full.industry });
    setStepStates(s => ({ ...s, webpack: { status: 'done', result: wRes.data || wRes } }));

    // Step 7: Website
    setActiveStep(6);
    setStepStates(s => ({ ...s, website: { status: 'running' } }));
    const wsRes = await base44.functions.invoke('generateWebsite', {
      business_name: full.name, industry: full.industry,
      description: full.value_proposition || full.niche || `${full.name} — ${full.industry} platform`
    });
    setStepStates(s => ({ ...s, website: { status: 'done', result: wsRes.data || wsRes } }));

    // Step 8: Launch
    setActiveStep(7);
    setStepStates(s => ({ ...s, launch: { status: 'running' } }));
    const lpRes = await base44.entities.LaunchProject.create({
      project_name: `${full.name} Website`, project_type: 'website',
      business_name: full.name, industry: full.industry, client_name: full.name
    });
    setStepStates(s => ({ ...s, launch: { status: 'done', result: { launch_project_id: lpRes.id, status: 'queued' } } }));
  }, []);

  const handlePipelineError = (e) => {
    setStepStates(s => {
      const updated = { ...s };
      for (const st of STEPS) {
        if (updated[st.id]?.status === 'running') updated[st.id] = { ...updated[st.id], status: 'error', error: e.message };
      }
      return updated;
    });
  };

  const runFullPipeline = useCallback(async () => {
    setFullRunning(true);
    try {
      // Step 1: Discover
      setStepStates(s => ({ ...s, discover: { status: 'running' } }));
      setActiveStep(0);
      const dRes = await base44.functions.invoke('discoverTopPerformers', {});
      const dData = dRes.data || dRes;
      const discovered = dData.performers || [];
      setPerformers(discovered);
      setStepStates(s => ({ ...s, discover: { status: 'done', result: dData } }));
      if (discovered.length === 0) throw new Error('No top performers discovered. Try again.');

      // Step 2: Select — auto-pick highest profit potential
      const priority = { very_high: 3, high: 2, medium: 1, low: 0 };
      const topPick = [...discovered].sort((a, b) => (priority[b.profit_potential] || 0) - (priority[a.profit_potential] || 0))[0];
      let full = topPick;
      try { full = await base44.entities.TopPerformer.get(topPick.id); } catch (e) {}
      setSelectedPerformer(full);
      setStepStates(s => ({ ...s, select: { status: 'done', result: { count: discovered.length } } }));
      setActiveStep(1);

      await runBuildPhase(full);
    } catch (e) {
      handlePipelineError(e);
    } finally {
      setFullRunning(false);
    }
  }, [runBuildPhase]);

  const runManualTarget = useCallback(async () => {
    const url = (manualUrl || '').trim();
    if (!url) return;
    setFullRunning(true);
    try {
      const bizName = (manualName || '').trim() || url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      const industry = (manualIndustry || '').trim() || 'General';
      const full = await base44.entities.TopPerformer.create({
        organization_id: user?.data?.organization_id,
        name: bizName, url, industry,
        niche: '', revenue_model: '', profit_potential: 'high',
        clone_status: 'discovered', clone_priority: 2, status: 'active'
      });
      setSelectedPerformer(full);
      setPerformers([full]);
      setStepStates(s => ({
        ...s,
        discover: { status: 'done', result: { performers_discovered: 1, industries_scanned: 1, performers: [full] } },
        select: { status: 'done', result: { count: 1 } }
      }));
      setActiveStep(1);
      await runBuildPhase(full);
    } catch (e) {
      handlePipelineError(e);
    } finally {
      setFullRunning(false);
    }
  }, [manualUrl, manualName, manualIndustry, user, runBuildPhase]);

  const runStep = useCallback(async (stepId) => {
    setStepStates(s => ({ ...s, [stepId]: { ...s[stepId], status: 'running' } }));
    try {
      let result;
      switch (stepId) {
        case 'discover': {
          const res = await base44.functions.invoke('discoverTopPerformers', {});
          result = res.data || res;
          setPerformers(result.performers || []);
          break;
        }
        case 'select': {
          // Load existing top performers if discover wasn't run this session
          if (performers.length === 0) {
            const list = await base44.entities.TopPerformer.list('-clone_priority', 50);
            setPerformers(list || []);
          }
          result = { count: performers.length || (await base44.entities.TopPerformer.list('-clone_priority', 1)).length };
          break;
        }
        case 'clone': {
          if (!selectedPerformer) throw new Error('Select a target performer first');
          const res = await base44.functions.invoke('cloneTopWebsites', {
            category: selectedPerformer.industry,
            industry: selectedPerformer.industry,
            top_performer_id: selectedPerformer.id
          });
          result = res.data || res;
          break;
        }
        case 'logo': {
          const res = await base44.functions.invoke('generateDesignPack', {
            pack_type: 'logo_pack',
            business_name: selectedPerformer?.name || 'New Business',
            industry: selectedPerformer?.industry || 'Technology'
          });
          result = res.data || res;
          break;
        }
        case 'brand': {
          const res = await base44.functions.invoke('generateDesignPack', {
            pack_type: 'brand_pack',
            business_name: selectedPerformer?.name || 'New Business',
            industry: selectedPerformer?.industry || 'Technology'
          });
          result = res.data || res;
          break;
        }
        case 'webpack': {
          const res = await base44.functions.invoke('generateDesignPack', {
            pack_type: 'web_pack',
            business_name: selectedPerformer?.name || 'New Business',
            industry: selectedPerformer?.industry || 'Technology'
          });
          result = res.data || res;
          break;
        }
        case 'website': {
          const res = await base44.functions.invoke('generateWebsite', {
            business_name: selectedPerformer?.name || 'New Business',
            industry: selectedPerformer?.industry || 'Technology',
            description: selectedPerformer?.value_proposition || selectedPerformer?.niche || `${selectedPerformer?.name || 'New Business'} — ${selectedPerformer?.industry || 'Technology'} platform`
          });
          result = res.data || res;
          break;
        }
        case 'launch': {
          // Create a LaunchProject to trigger the autonomous pipeline
          const res = await base44.entities.LaunchProject.create({
            project_name: selectedPerformer?.name || 'New Business Website',
            project_type: 'website',
            business_name: selectedPerformer?.name || 'New Business',
            industry: selectedPerformer?.industry || 'Technology',
            client_name: selectedPerformer?.name || 'FaultLine Operator'
          });
          result = { launch_project_id: res.id, status: 'queued' };
          break;
        }
      }
      setStepStates(s => ({ ...s, [stepId]: { ...s[stepId], status: 'done', result } }));
      // Auto-advance to next step
      const idx = STEPS.findIndex(st => st.id === stepId);
      if (idx < STEPS.length - 1) setActiveStep(idx + 1);
    } catch (e) {
      setStepStates(s => ({ ...s, [stepId]: { ...s[stepId], status: 'error', error: e.message } }));
    }
  }, [performers, selectedPerformer]);

  const getGuidance = async (stepId) => {
    setStepStates(s => ({ ...s, [stepId]: { ...s[stepId], guidanceLoading: true, showGuidance: true } }));
    try {
      const step = STEPS.find(st => st.id === stepId);
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are the FaultLine AI Pipeline Coach. The operator is on step "${step.title}" of the generation pipeline${selectedPerformer ? ` for ${selectedPerformer.name} in the ${selectedPerformer.industry} industry` : ' for a new business'}.

Previous results: ${JSON.stringify(stepStates[stepId]?.result || {}).slice(0, 500)}

Provide concise, actionable guidance for THIS step to achieve the highest possible quality:
1. RECOMMENDATION — what to do and why (2-3 sentences)
2. BEST_PRACTICES — 3 specific best practices
3. PARAMETERS — recommended parameters for this step
4. PITFALLS — 2 common mistakes to avoid

Be specific and practical.`,
        response_json_schema: {
          type: 'object',
          properties: {
            recommendation: { type: 'string' },
            best_practices: { type: 'array', items: { type: 'string' } },
            parameters: { type: 'string' },
            pitfalls: { type: 'array', items: { type: 'string' } }
          }
        }
      });
      setStepStates(s => ({ ...s, [stepId]: { ...s[stepId], guidanceLoading: false, guidance: res } }));
    } catch (e) {
      setStepStates(s => ({ ...s, [stepId]: { ...s[stepId], guidanceLoading: false, guidanceError: e.message } }));
    }
  };

  const industries = ['all', ...Array.from(new Set(performers.map(p => p.industry)))];
  const filteredPerformers = industryFilter === 'all' ? performers : performers.filter(p => p.industry === industryFilter);

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 12, padding: '28px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <p className="eyebrow" style={{ margin: '0 0 6px' }}>AI-Guided Generation Pipeline</p>
          <h2 style={{ font: '400 28px Libre Caslon Display, serif', margin: '0 0 6px', letterSpacing: '-.02em' }}>Autonomous Build Pipeline</h2>
          <p style={{ color: '#666', fontSize: 14, margin: 0, maxWidth: 600 }}>Step-by-step timeline guided by AI. Discover top performers, clone them, generate logo/brand/web packs, build the website, and launch — all at maximum quality.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {seedStatus === 'empty' && (
            <button onClick={seedLibrary} className="btn gold" style={{ fontSize: 13, padding: '10px 18px' }}>
              <Sparkles size={14} style={{ display: 'inline', marginRight: 6 }} /> Seed Prompt Library
            </button>
          )}
          {seedStatus === 'seeded' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#237A4B', fontWeight: 600 }}>
              <CheckCircle2 size={14} /> Prompt Library Active
            </div>
          )}
          <button onClick={runFullPipeline} disabled={fullRunning} style={{ padding: '11px 22px', borderRadius: 6, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: fullRunning ? 'wait' : 'pointer', background: fullRunning ? '#555' : 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', border: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            {fullRunning ? <><Loader2 size={15} className="animate-spin" /> Running Full Pipeline…</> : <><Zap size={15} /> Run Full Pipeline</>}
          </button>
        </div>
      </div>

      {/* Manual target clone — enter a specific website to build from */}
      <div style={{ marginTop: 18, padding: 16, background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Target size={15} style={{ color: 'var(--gold)' }} />
          <b style={{ fontSize: 13 }}>Clone a Specific Website</b>
          <span style={{ fontSize: 11, color: '#888' }}>— skip discovery and build from a target you choose</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder="https://example.com" style={{ flex: 2, minWidth: 200, padding: '9px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
          <input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Business name (optional)" style={{ flex: 1.5, minWidth: 160, padding: '9px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
          <input value={manualIndustry} onChange={e => setManualIndustry(e.target.value)} placeholder="Industry (optional)" style={{ flex: 1, minWidth: 140, padding: '9px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
          <button onClick={runManualTarget} disabled={fullRunning || !manualUrl.trim()} style={{ padding: '9px 18px', borderRadius: 6, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: (fullRunning || !manualUrl.trim()) ? 'wait' : 'pointer', background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', border: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            {fullRunning ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />} Clone & Build
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: 0 }}>
        {STEPS.map((step, idx) => {
          const state = stepStates[step.id] || {};
          const isActive = activeStep === idx;
          const Icon = step.icon;
          const isComplete = state.status === 'done';
          const isRunning = state.status === 'running';
          const isError = state.status === 'error';
          const isLast = idx === STEPS.length - 1;

          return (
            <div key={step.id} style={{ display: 'flex', gap: 18, position: 'relative' }}>
              {/* Vertical line + node */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
                  background: isComplete ? '#237A4B' : isRunning ? 'linear-gradient(135deg, #E7C86E, #C89B3C)' : isError ? '#f5d8d5' : isActive ? '#0a0a0a' : '#f0ede5',
                  color: isComplete ? '#fff' : isRunning ? '#111' : isError ? '#a52d23' : isActive ? '#fff' : '#999',
                  border: isActive && !isComplete && !isRunning ? '2px solid var(--gold)' : '2px solid transparent',
                  transition: 'all .2s'
                }}>
                  {isRunning ? <Loader2 size={18} className="animate-spin" /> : isComplete ? <CheckCircle2 size={20} /> : isError ? <XCircle size={20} /> : <Icon size={18} />}
                </div>
                {!isLast && <div style={{ width: 2, flex: 1, background: isComplete ? '#237A4B' : '#e5e1da', minHeight: 28, marginTop: 4 }} />}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: isLast ? 0 : 28, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Step {idx + 1}</span>
                      {isActive && !isRunning && !isComplete && <span style={{ fontSize: 10, background: 'var(--gold)', color: '#111', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>ACTIVE</span>}
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>{step.title}</h3>
                    <p style={{ fontSize: 13, color: '#888', margin: 0, lineHeight: 1.5 }}>{step.desc}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => getGuidance(step.id)}
                      style={{ padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', background: '#f8f7f4', border: '1px solid #e5e1da', color: '#666', display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      <Lightbulb size={13} /> AI Guide
                    </button>
                    <button
                      onClick={() => runStep(step.id)}
                      disabled={isRunning || fullRunning}
                      style={{ padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: isRunning ? 'wait' : 'pointer', background: isRunning ? '#ccc' : '#0a0a0a', color: '#fff', border: 0, display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      {isRunning ? <Loader2 size={13} className="animate-spin" /> : isComplete ? <CheckCircle2 size={13} /> : <ArrowRight size={13} />}
                      {isRunning ? 'Running…' : step.action}
                    </button>
                  </div>
                </div>

                {/* AI Guidance panel */}
                {state.showGuidance && (
                  <div style={{ marginTop: 12, padding: 16, background: 'linear-gradient(135deg, #faf8f2, #f5f0e4)', border: '1px solid #e5dcc6', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <Sparkles size={14} style={{ color: 'var(--gold)' }} />
                      <b style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--gold-dark)' }}>AI Guidance</b>
                    </div>
                    {state.guidanceLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888', fontSize: 13 }}><Loader2 size={14} className="animate-spin" /> Analyzing best approach…</div>
                    ) : state.guidance ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6 }}>{state.guidance.recommendation}</p>
                        {state.guidance.best_practices?.length > 0 && (
                          <div><b style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: '#666' }}>Best Practices</b>
                            <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 12.5, color: '#555', lineHeight: 1.6 }}>{state.guidance.best_practices.map((b, i) => <li key={i}>{b}</li>)}</ul>
                          </div>
                        )}
                        {state.guidance.parameters && <p style={{ fontSize: 12.5, margin: 0 }}><b style={{ color: '#666' }}>Parameters:</b> {state.guidance.parameters}</p>}
                        {state.guidance.pitfalls?.length > 0 && (
                          <div><b style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: '#a52d23' }}>Pitfalls to Avoid</b>
                            <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 12.5, color: '#a52d23', lineHeight: 1.6 }}>{state.guidance.pitfalls.map((p, i) => <li key={i}>{p}</li>)}</ul>
                          </div>
                        )}
                      </div>
                    ) : state.guidanceError ? (
                      <p style={{ fontSize: 13, color: '#a52d23', margin: 0 }}>{state.guidanceError}</p>
                    ) : null}
                  </div>
                )}

                {/* Step-specific result rendering */}
                {isError && <div style={{ marginTop: 10, padding: 10, background: '#f5d8d5', borderRadius: 6, fontSize: 12, color: '#a52d23' }}>{state.error}</div>}

                {step.id === 'select' && isComplete && filteredPerformers.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    {industries.length > 1 && (
                      <select value={industryFilter} onChange={e => setIndustryFilter(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 5, fontSize: 12, fontFamily: 'inherit', marginBottom: 10, background: '#fff' }}>
                        {industries.map(ind => <option key={ind} value={ind}>{ind === 'all' ? 'All Industries' : ind}</option>)}
                      </select>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                      {filteredPerformers.map(p => (
                        <button key={p.id} onClick={() => setSelectedPerformer(p)} style={{
                          textAlign: 'left', padding: 12, borderRadius: 8, border: `2px solid ${selectedPerformer?.id === p.id ? 'var(--gold)' : '#e5e1da'}`,
                          background: selectedPerformer?.id === p.id ? '#faf8f2' : '#fff', cursor: 'pointer', fontFamily: 'inherit'
                        }}>
                          <b style={{ fontSize: 13, display: 'block' }}>{p.name}</b>
                          <small style={{ fontSize: 11, color: '#888' }}>{p.industry}</small>
                          {p.profit_potential && (
                            <span style={{ display: 'inline-block', marginLeft: 6, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: p.profit_potential === 'very_high' ? '#237A4B' : p.profit_potential === 'high' ? 'var(--gold)' : '#ccc', color: p.profit_potential === 'medium' ? '#333' : '#fff', textTransform: 'uppercase' }}>{p.profit_potential?.replace('_', ' ')}</span>
                          )}
                          {p.niche && <p style={{ fontSize: 11, color: '#666', margin: '4px 0 0', lineHeight: 1.4 }}>{p.niche.slice(0, 80)}</p>}
                        </button>
                      ))}
                    </div>
                    {selectedPerformer && (
                      <div style={{ marginTop: 10, padding: 12, background: '#0a0a0a', color: '#fff', borderRadius: 8, fontSize: 12 }}>
                        <b>Selected: {selectedPerformer.name}</b>
                        {selectedPerformer.revenue_model && <p style={{ color: 'var(--gold2)', margin: '4px 0 0' }}>Revenue: {selectedPerformer.revenue_model}</p>}
                        {selectedPerformer.client_base && <p style={{ color: '#aaa', margin: '2px 0 0' }}>Clients: {selectedPerformer.client_base}</p>}
                      </div>
                    )}
                  </div>
                )}

                {isComplete && state.result && step.id !== 'select' && (
                  <div style={{ marginTop: 10, padding: 10, background: '#e6f4ec', borderRadius: 6, fontSize: 12, color: '#237A4B', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={13} />
                    {step.id === 'discover' && `${state.result.performers_discovered || 0} top performers discovered across ${state.result.industries_scanned || 0} industries`}
                    {step.id === 'clone' && `Superiority strategy built for ${state.result.competitors?.length || 0} competitors`}
                    {step.id === 'logo' && 'Logo pack generated'}
                    {step.id === 'brand' && 'Brand pack generated'}
                    {step.id === 'webpack' && 'Web pack generated'}
                    {step.id === 'website' && 'Website generated'}
                    {step.id === 'launch' && `Launch project queued — ${state.result.launch_project_id?.slice(0, 8)}…`}
                  </div>
                )}
                {step.id === 'website' && isComplete && state.result?.file_url && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <a href={state.result.file_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: '#0a0a0a', color: '#fff', textDecoration: 'none' }}>
                      <Globe size={13} /> Preview Cloned Site
                    </a>
                    <Link to="/app/deliverable-studio" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: '#f8f7f4', border: '1px solid #e5e1da', color: '#333', textDecoration: 'none' }}>
                      <ExternalLink size={13} /> Open in Deliverable Studio
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}