import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import AccentPicker from '@/components/rebrand-pipeline/AccentPicker';
import {
  Loader2, Search, Globe, Copy, ShieldCheck, Palette, CheckCircle2, Rocket,
  Check, X, AlertTriangle, ExternalLink, RefreshCw, Sparkles, ArrowRight, Eye,
} from 'lucide-react';

const STEPS = [
  { n: 1, label: 'Find',      icon: Search },
  { n: 2, label: 'Clone',     icon: Copy },
  { n: 3, label: 'Audit',     icon: ShieldCheck },
  { n: 4, label: 'Style',     icon: Palette },
  { n: 5, label: 'Approve',   icon: CheckCircle2 },
];

export default function RebrandPipeline() {
  const [step, setStep] = useState(1);
  const [myRebrands, setMyRebrands] = useState([]);
  const [loadingRebrands, setLoadingRebrands] = useState(true);

  // Step 1 — find
  const [mode, setMode] = useState('search'); // 'search' | 'url' | 'existing'
  const [niche, setNiche] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [urlInput, setUrlInput] = useState('');
  const [existingClones, setExistingClones] = useState([]);
  const [picked, setPicked] = useState(null); // {url, name}

  // Step 2 — clone
  const [cloning, setCloning] = useState(false);
  const [cloneLog, setCloneLog] = useState([]);
  const [clone, setClone] = useState(null); // {vercel_url, name}
  const [cloneError, setCloneError] = useState('');

  // Step 3 — audit
  const [auditing, setAuditing] = useState(false);
  const [audit, setAudit] = useState(null); // RebrandProject

  // Step 4 — style
  const [accent, setAccent] = useState('#C89B3C');
  const [rebranding, setRebranding] = useState(false);
  const [rebrand, setRebrand] = useState(null); // {deploy_url, elements}

  // Step 5 — approve
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  useEffect(() => { loadRebrands(); loadExisting(); }, []);
  async function loadRebrands() {
    setLoadingRebrands(true);
    try {
      const list = await base44.entities.RebrandProject.list('-created_date', 50).catch(() => []);
      setMyRebrands((list || []).filter(p => p.status === 'approved' || p.status === 'completed'));
    } finally { setLoadingRebrands(false); }
  }
  async function loadExisting() {
    try {
      const list = await base44.entities.LaunchProject.list('-created_date', 200).catch(() => []);
      setExistingClones((list || []).filter(p => p.vercel_deployment_url || p.metadata?.vercel_deployment_url));
    } catch {}
  }

  function pickSite(p) { setPicked(p); setStep(2); }

  // ---- Step 2: clone a new URL end-to-end ----
  async function runClone() {
    if (!picked?.url) return;
    setCloning(true); setCloneError(''); setCloneLog([]); setClone(null);
    try {
      pushLog('Scraping target site DNA…');
      const dr = await base44.functions.invoke('deepCloneTarget', { target_url: picked.url });
      const d = dr.data || dr;
      if (d.error) throw new Error(d.error);
      const bizName = d.bizName || picked.name || 'Clone';
      pushLog(`Captured ${d.dna?.colors?.length || 0} colors, ${d.dna?.nav?.length || 0} nav items via ${d.fetchMethod}`);
      pushLog('Generating faithful clone…');
      const gr = await base44.functions.invoke('generateWebsite', {
        business_name: bizName, description: d.brief, primary_color: d.dna?.primary, target_dna: d.dna,
      });
      const g = gr.data || gr;
      if (g.error) throw new Error(g.error);
      pushLog('Deploying clone to Vercel…');
      const lr = await base44.functions.invoke('launchProject', {
        project_name: `${bizName} clone`, website_html: g.website_html, steps: { vercel: true, drive: false, github: false, supabase: false },
      });
      const l = lr.data || lr;
      if (l.error) throw new Error(l.error);
      const vercelUrl = l.results?.vercel?.deploy?.url || l.results?.vercel?.deploy?.alias?.[0];
      if (!vercelUrl) throw new Error('Vercel deploy URL not returned');
      pushLog(`Deployed ✓ ${vercelUrl}`);
      setClone({ vercel_url: vercelUrl, name: bizName });
      setStep(3);
    } catch (e) { setCloneError(e.message); }
    finally { setCloning(false); }
  }
  function pushLog(msg) { setCloneLog(prev => [...prev, msg]); }

  // use an existing deployed clone — skip straight to audit
  function useExisting(c) {
    setPicked({ url: c.vercel_deployment_url || c.metadata?.vercel_deployment_url, name: c.project_name });
    setClone({ vercel_url: c.vercel_deployment_url || c.metadata?.vercel_deployment_url, name: c.project_name });
    setStep(3);
  }

  // ---- Step 3: audit mandatory changes ----
  async function runAudit() {
    if (!clone?.vercel_url) return;
    setAuditing(true); setAudit(null);
    try {
      const r = await base44.functions.invoke('detectMandatoryChanges', { source_url: clone.vercel_url });
      const d = r.data || r;
      if (d.error) throw new Error(d.error);
      setAudit(d.project);
      setStep(4);
    } catch (e) { setCloneError(e.message); }
    finally { setAuditing(false); }
  }

  // ---- Step 4: style + rebrand preview ----
  async function runRebrand() {
    if (!clone?.vercel_url) return;
    setRebranding(true); setRebrand(null);
    try {
      const r = await base44.functions.invoke('autonomousRebrand', {
        source_url: clone.vercel_url, accent_color: accent,
        clone_name: clone.name, rebrand_project_id: audit?.id,
      });
      const d = r.data || r;
      if (d.error) throw new Error(d.error);
      setRebrand(d);
      setStep(5);
    } catch (e) { setCloneError(e.message); }
    finally { setRebranding(false); }
  }

  // ---- Step 5: approve ----
  async function approve() {
    const pid = audit?.id || rebrand?.project?.id;
    if (!pid) return;
    setApproving(true);
    try {
      await base44.entities.RebrandProject.update(pid, { status: 'approved', approval_state: 'approved' });
      setApproved(true);
      loadRebrands();
    } catch (e) { setCloneError(e.message); }
    finally { setApproving(false); }
  }

  function reset() {
    setStep(1); setPicked(null); setClone(null); setAudit(null); setRebrand(null);
    setApproved(false); setCloneLog([]); setCloneError(''); setResults([]); setUrlInput('');
    setMode('search'); setNiche('');
  }

  return (
    <>
      <XtremeOSSidebar />
      <div className="portal-page xtremeos-content" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240 }}>
        <Header onReset={reset} />

        {/* Stepper */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: '#fff', border: '1px solid #ddd', borderRadius: 12, padding: '14px 18px', overflowX: 'auto' }}>
          {STEPS.map((s, i) => {
            const done = step > s.n;
            const active = step === s.n;
            return (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 120 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
                  background: done ? '#237A4B' : active ? 'linear-gradient(135deg, #E7C86E, #C89B3C)' : '#eee',
                  color: done || active ? (done ? '#fff' : '#111') : '#999', fontWeight: 700, fontSize: 14,
                }}>
                  {done ? <Check size={16} /> : <s.icon size={16} />}
                </div>
                <div>
                  <small style={{ color: '#999', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em' }}>Step {s.n}</small>
                  <b style={{ display: 'block', fontSize: 13, color: active || done ? '#111' : '#999' }}>{s.label}</b>
                </div>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: done ? '#237A4B' : '#eee', minWidth: 12 }} />}
              </div>
            );
          })}
        </div>

        {cloneError && <ErrorBanner text={cloneError} onClose={() => setCloneError('')} />}

        {/* Step bodies */}
        {step === 1 && <StepFind
          mode={mode} setMode={setMode} niche={niche} setNiche={setNiche} searching={searching}
          onSearch={async () => { setSearching(true); setResults([]); try { const r = await base44.functions.invoke('searchTopWebsitesByIndustry', { industry: niche || 'general', max_results: 10 }); const d = r.data || r; if (d.error) throw new Error(d.error); setResults(d.websites || []); } catch (e) { setCloneError(e.message); } finally { setSearching(false); } }}
          results={results} urlInput={urlInput} setUrlInput={setUrlInput} onPickUrl={() => pickSite({ url: urlInput.trim(), name: '' })}
          existingClones={existingClones} onUseExisting={useExisting} onPick={pickSite} />}

        {step === 2 && <StepClone picked={picked} cloning={cloning} cloneLog={cloneLog} clone={clone} onClone={runClone} onBack={() => setStep(1)} onNext={runAudit} />}

        {step === 3 && <StepAudit auditing={auditing} clone={clone} onAudit={runAudit} audit={audit} onNext={() => setStep(4)} onBack={() => setStep(2)} />}

        {step === 4 && <StepStyle accent={accent} setAccent={setAccent} rebranding={rebranding} rebrand={rebrand} onRun={runRebrand} onNext={() => setStep(5)} onBack={() => setStep(3)} />}

        {step === 5 && <StepApprove approving={approving} approved={approved} rebrand={rebrand} audit={audit} onApprove={approve} onReset={reset} onBack={() => setStep(4)} />}

        {/* My Rebrands dashboard */}
        <Section title="My Rebrands" sub="Approved rebrands from this pipeline">
          {loadingRebrands ? <Center><Loader2 className="animate-spin" /></Center> :
           myRebrands.length === 0 ? <Empty text="No approved rebrands yet. Run the pipeline above." /> :
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
             {myRebrands.map(p => <RebrandCard key={p.id} p={p} />)}
           </div>}
        </Section>
      </div>
    </>
  );
}

/* ---------- Step 1: Find ---------- */
function StepFind({ mode, setMode, niche, setNiche, searching, onSearch, results, urlInput, setUrlInput, onPickUrl, existingClones, onUseExisting, onPick }) {
  return (
    <Card>
      <Tabs mode={mode} setMode={setMode} tabs={[{ id: 'search', label: 'Search by Niche' }, { id: 'url', label: 'Enter a URL' }, { id: 'existing', label: 'Use Existing Clone' }]} />

      {mode === 'search' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="e.g. epoxy flooring, roofing, HVAC, plumbing…"
              style={{ flex: 1, padding: '13px 14px', border: '1px solid #d7d7d7', borderRadius: 8, fontSize: 14, background: '#fff', color: '#111' }}
              onKeyDown={e => e.key === 'Enter' && onSearch()} />
            <button onClick={onSearch} disabled={searching} style={btnGold(searching)}>
              {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} {searching ? 'Searching…' : 'Find Top Sites'}
            </button>
          </div>
          {results.length > 0 && (
            <div style={{ display: 'grid', gap: 8 }}>
              {results.map((r, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 14 }}>{r.name}</b>
                    <div style={{ fontSize: 12, color: '#2563eb', marginTop: 2 }}>{r.url}</div>
                    <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>{r.description}</p>
                  </div>
                  <button onClick={() => onPick({ url: r.url, name: r.name })} style={btnDark()}>
                    <Copy size={14} /> Clone This
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {mode === 'url' && (
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://example.com"
            style={{ flex: 1, padding: '13px 14px', border: '1px solid #d7d7d7', borderRadius: 8, fontSize: 14, background: '#fff', color: '#111' }} />
          <button onClick={onPickUrl} disabled={!urlInput.trim()} style={btnGold(!urlInput.trim())}>
            <ArrowRight size={16} /> Continue
          </button>
        </div>
      )}

      {mode === 'existing' && (
        existingClones.length === 0 ? <Empty text="No deployed clones found. Clone a new site first." /> :
        <div style={{ display: 'grid', gap: 8 }}>
          {existingClones.map(c => (
            <div key={c.id} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <b style={{ fontSize: 14 }}>{c.project_name}</b>
                <div style={{ fontSize: 12, color: '#2563eb', marginTop: 2 }}>{c.vercel_deployment_url || c.metadata?.vercel_deployment_url}</div>
              </div>
              <button onClick={() => onUseExisting(c)} style={btnDark()}>
                <ArrowRight size={14} /> Use This
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------- Step 2: Clone ---------- */
function StepClone({ picked, cloning, cloneLog, clone, onClone, onBack, onNext }) {
  return (
    <Card>
      <CardHead title="Clone the Target" sub={picked?.url} />
      {clone ? (
        <Banner ok>
          <CheckCircle2 size={18} />
          <div>
            <b>Clone deployed</b>
            <div style={{ fontSize: 12, marginTop: 2 }}>
              <a href={clone.vercel_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{clone.vercel_url} <ExternalLink size={11} style={{ display: 'inline' }} /></a>
            </div>
          </div>
          <button onClick={onNext} style={btnGold(false)}>Audit Now <ArrowRight size={14} /></button>
        </Banner>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button onClick={onClone} disabled={cloning} style={btnGold(cloning)}>
              {cloning ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />} {cloning ? 'Cloning…' : 'Clone This Site'}
            </button>
            <button onClick={onBack} style={btnOutline()}>Back</button>
          </div>
          {cloneLog.length > 0 && (
            <div style={{ background: '#0a0a0a', color: '#E7C86E', borderRadius: 8, padding: 14, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8 }}>
              {cloneLog.map((l, i) => <div key={i}>› {l}</div>)}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

/* ---------- Step 3: Audit ---------- */
function StepAudit({ auditing, clone, onAudit, audit, onNext, onBack }) {
  return (
    <Card>
      <CardHead title="Audit Mandatory Changes" sub={clone?.vercel_url} />
      {!audit ? (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onAudit} disabled={auditing} style={btnGold(auditing)}>
            {auditing ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} {auditing ? 'Auditing…' : 'Run Legal Audit'}
          </button>
          <button onClick={onBack} style={btnOutline()}>Back</button>
        </div>
      ) : (
        <>
          <Banner ok><CheckCircle2 size={18} /><b>Audit complete — {audit.mandatory_swaps?.length || 0} mandatory swaps found</b></Banner>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: '#333', margin: '12px 0' }}>{audit.audit_summary}</p>
          {audit.mandatory_swaps?.length > 0 && (
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              {audit.mandatory_swaps.map((s, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <code style={{ background: '#f5d8d5', color: '#a52d23', padding: '5px 10px', borderRadius: 6, fontSize: 12, flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{s.find}</code>
                  <ArrowRight size={16} style={{ color: '#C89B3C' }} />
                  <code style={{ background: '#e8f5ec', color: '#237A4B', padding: '5px 10px', borderRadius: 6, fontSize: 12, flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{s.replace}</code>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={onNext} style={btnGold(false)}>Choose Colors <ArrowRight size={14} /></button>
            <button onClick={onBack} style={btnOutline()}>Back</button>
          </div>
        </>
      )}
    </Card>
  );
}

/* ---------- Step 4: Style & Preview ---------- */
function StepStyle({ accent, setAccent, rebranding, rebrand, onRun, onNext, onBack }) {
  return (
    <Card>
      <CardHead title="Style & Rebrand Preview" sub="Pick an accent color, then generate the full rebrand preview" />
      <div style={{ marginBottom: 16 }}>
        <b style={{ fontSize: 14, display: 'block', marginBottom: 10 }}>Accent Color</b>
        <AccentPicker value={accent} onChange={setAccent} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button onClick={onRun} disabled={rebranding} style={btnGold(rebranding)}>
          {rebranding ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {rebranding ? 'Generating rebrand…' : 'Generate Rebrand Preview'}
        </button>
        <button onClick={onBack} style={btnOutline()}>Back</button>
      </div>

      {rebrand && (
        <>
          <Banner ok><CheckCircle2 size={18} /><b>Rebrand deployed — 12 mandatory elements processed</b></Banner>
          {rebrand.elements?.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, marginTop: 12 }}>
              {rebrand.elements.map(e => (
                <div key={e.id} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 10, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {e.status === 'done' ? <Check size={14} style={{ color: '#237A4B' }} /> : e.status === 'skipped' ? <X size={14} style={{ color: '#999' }} /> : <AlertTriangle size={14} style={{ color: '#B88214' }} />}
                    <b>{e.label}</b>
                  </div>
                  {e.detail && <p style={{ color: '#888', margin: '4px 0 0', fontSize: 11 }}>{e.detail}</p>}
                </div>
              ))}
            </div>
          )}
          {rebrand.deploy_url && (
            <div style={{ marginTop: 14 }}>
              <a href={rebrand.deploy_url} target="_blank" rel="noreferrer" style={btnDark()}>
                <Globe size={14} /> View Live Rebrand <ExternalLink size={11} style={{ display: 'inline' }} />
              </a>
            </div>
          )}
          {rebrand.deploy_url && (
            <div style={{ marginTop: 12, border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', height: 480, background: '#fff' }}>
              <iframe src={rebrand.deploy_url} title="Rebrand preview" style={{ width: '100%', height: '100%', border: 0 }} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={onNext} style={btnGold(false)}>Review & Approve <ArrowRight size={14} /></button>
            <button onClick={onBack} style={btnOutline()}>Back</button>
          </div>
        </>
      )}
    </Card>
  );
}

/* ---------- Step 5: Approve ---------- */
function StepApprove({ approving, approved, rebrand, audit, onApprove, onReset, onBack }) {
  const url = rebrand?.deploy_url || rebrand?.project?.provisioned?.vercel_deployment_url;
  return (
    <Card>
      <CardHead title="Approve & Publish" sub="Final review — approve to add this rebrand to your dashboard" />
      {approved ? (
        <>
          <Banner ok><CheckCircle2 size={20} /><div><b>Approved & added to your dashboard!</b><div style={{ fontSize: 12, marginTop: 2 }}>This rebrand now appears in "My Rebrands" above.</div></div></Banner>
          {url && <a href={url} target="_blank" rel="noreferrer" style={{ ...btnDark(), display: 'inline-flex', marginTop: 14 }}><Eye size={14} /> View Live Site</a>}
          <div style={{ marginTop: 16 }}>
            <button onClick={onReset} style={btnGold(false)}><Sparkles size={16} /> Start Another Rebrand</button>
          </div>
        </>
      ) : (
        <>
          {url && (
            <div style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', height: 420, background: '#fff', marginBottom: 16 }}>
              <iframe src={url} title="Final preview" style={{ width: '100%', height: '100%', border: 0 }} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onApprove} disabled={approving} style={btnGold(approving)}>
              {approving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {approving ? 'Approving…' : 'Approve Rebrand'}
            </button>
            <button onClick={onBack} style={btnOutline()}>Back</button>
          </div>
        </>
      )}
    </Card>
  );
}

/* ---------- Rebrand dashboard card ---------- */
function RebrandCard({ p }) {
  const url = p.provisioned?.vercel_deployment_url;
  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ height: 150, background: '#0a0a0a', position: 'relative' }}>
        {url ? <iframe src={url} title={p.source_clone_name} style={{ width: '100%', height: '100%', border: 0, pointerEvents: 'none' }} /> : <Center><Globe color="#666" /></Center>}
        <div style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: '50%', background: p.accent_color || '#C89B3C', border: '2px solid #fff' }} title={p.accent_color} />
      </div>
      <div style={{ padding: 12 }}>
        <b style={{ fontSize: 13, display: 'block' }}>{p.target_brand || p.source_clone_name || 'Rebrand'}</b>
        <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{p.source_url}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: '#237A4B', background: '#d4edda', padding: '2px 8px', borderRadius: 12 }}>{p.status}</span>
          {url && <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#2563eb', marginLeft: 'auto' }}>View <ExternalLink size={11} style={{ display: 'inline' }} /></a>}
        </div>
      </div>
    </div>
  );
}

/* ---------- shared bits ---------- */
function Header({ onReset }) {
  return (
    <div style={{ background: 'radial-gradient(circle at 82% 40%, #C89B3C45, transparent 25%), #0a0a0a', color: '#fff', padding: '36px 28px', margin: '-28px -28px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <p style={{ color: '#E7C86E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>End-to-End Rebrand Pipeline</p>
        <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 38, margin: '8px 0 4px', letterSpacing: '-.03em' }}>Search → Clone → <span style={{ color: '#E7C86E' }}>Rebrand</span> → Approve</h1>
        <p style={{ color: '#aaa', fontSize: 14, margin: 0 }}>Find a site you like, clone it, audit what must change, pick your colors, preview the rebrand, and approve — all in one place.</p>
      </div>
      <button onClick={onReset} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a1a', color: '#E7C86E', border: '1px solid #333', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
        <RefreshCw size={14} /> Start Over
      </button>
    </div>
  );
}
function Section({ title, sub, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: 10 }}><b style={{ fontSize: 16, fontFamily: "'Libre Caslon Display', serif" }}>{title}</b>{sub && <span style={{ fontSize: 12, color: '#999', marginLeft: 10 }}>{sub}</span>}</div>
      {children}
    </div>
  );
}
function Card({ children }) {
  return <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 4px 12px rgba(0,0,0,.04)' }}>{children}</div>;
}
function CardHead({ title, sub }) {
  return <div style={{ marginBottom: 16 }}><b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 22 }}>{title}</b>{sub && <div style={{ fontSize: 12, color: '#2563eb', marginTop: 2 }}>{sub}</div>}</div>;
}
function Tabs({ mode, setMode, tabs }) {
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #eee', marginBottom: 18 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setMode(t.id)} style={{
          padding: '10px 16px', background: 'none', border: 0, borderBottom: mode === t.id ? '2px solid #C89B3C' : '2px solid transparent',
          fontWeight: 700, fontSize: 13, color: mode === t.id ? '#111' : '#999', cursor: 'pointer',
        }}>{t.label}</button>
      ))}
    </div>
  );
}
function Banner({ ok, children }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, borderRadius: 8, background: ok ? '#e8f5ec' : '#f8e5ce', border: `1px solid ${ok ? '#237A4B' : '#C89B3C'}`, color: ok ? '#237A4B' : '#a85c00', fontSize: 13 }}>{children}</div>;
}
function ErrorBanner({ text, onClose }) {
  return <div style={{ marginBottom: 16, padding: 14, borderRadius: 8, background: '#f5d8d5', border: '1px solid #C63D34', color: '#a52d23', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>{text}</span><button onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer' }}><X size={16} color="#a52d23" /></button></div>;
}
function Empty({ text }) { return <div style={{ padding: 30, textAlign: 'center', color: '#999', fontSize: 13 }}>{text}</div>; }
function Center({ children }) { return <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>{children}</div>; }
function btnGold(disabled) { return { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 22px', background: disabled ? '#999' : 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: disabled ? 'wait' : 'pointer' }; }
function btnDark() { return { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#0a0a0a', color: '#E7C86E', border: 0, borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer', textDecoration: 'none' }; }
function btnOutline() { return { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '13px 18px', background: '#fff', color: '#666', border: '1px solid #ddd', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }; }