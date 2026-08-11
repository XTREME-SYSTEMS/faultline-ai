import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import XtremeOSSidebar from '@/components/fl/XtremeOSSidebar';
import AccentPicker from '@/components/rebrand-pipeline/AccentPicker';
import { Card, StatusPill, ErrorBox, SuccessBox, BtnGold, BtnDark, Log, useLog } from '@/components/clone-pipeline/parts';
import {
  Loader2, Search, Globe, Copy, ShieldCheck, Palette, CheckCircle2, Rocket,
  Check, X, AlertTriangle, ExternalLink, RefreshCw, Sparkles, ArrowRight, Eye, Zap, Wrench, PenLine,
} from 'lucide-react';

export default function ClonePipeline() {
  // ---- pipeline state ----
  const [stage, setStage] = useState({ find: 'pending', clone: 'pending', harden: 'pending', rewrite: 'pending', audit: 'pending', style: 'pending', approve: 'pending' });
  const setStageStatus = (k, s) => setStage(prev => ({ ...prev, [k]: s }));

  // find
  const [mode, setMode] = useState('search');
  const [niche, setNiche] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [urlInput, setUrlInput] = useState('');
  const [existingClones, setExistingClones] = useState([]);
  const [picked, setPicked] = useState(null);

  // clone
  const cloneLog = useLog();
  const [cloning, setCloning] = useState(false);
  const [clone, setClone] = useState(null);
  const [cloneError, setCloneError] = useState('');

  // harden (audit + analyze + fix + heal + harden + optimize)
  const hardenLog = useLog();
  const [hardening, setHardening] = useState(false);
  const [hardenResult, setHardenResult] = useState(null);
  const [hardenError, setHardenError] = useState('');

  // rewrite (SEO-safe original content rewrite)
  const rewriteLog = useLog();
  const [rewriting, setRewriting] = useState(false);
  const [rewriteResult, setRewriteResult] = useState(null);
  const [rewriteError, setRewriteError] = useState('');

  // audit
  const [auditing, setAuditing] = useState(false);
  const [audit, setAudit] = useState(null);
  const [auditError, setAuditError] = useState('');

  // style
  const [accent, setAccent] = useState('#C89B3C');
  const [rebranding, setRebranding] = useState(false);
  const [rebrand, setRebrand] = useState(null);
  const [rebrandError, setRebrandError] = useState('');

  // approve
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  // dashboard
  const [completed, setCompleted] = useState([]);
  const [loadingCompleted, setLoadingCompleted] = useState(true);

  // one-click full pipeline
  const [autoRunning, setAutoRunning] = useState(false);

  useEffect(() => { loadCompleted(); loadExisting(); }, []);
  async function loadCompleted() {
    setLoadingCompleted(true);
    try {
      const list = await base44.entities.RebrandProject.list('-created_date', 50).catch(() => []);
      setCompleted((list || []).filter(p => p.status === 'approved' || p.status === 'completed'));
    } finally { setLoadingCompleted(false); }
  }
  async function loadExisting() {
    try {
      const list = await base44.entities.LaunchProject.list('-created_date', 200).catch(() => []);
      setExistingClones((list || []).filter(p => p.vercel_deployment_url || p.metadata?.vercel_deployment_url));
    } catch {}
  }

  // ---------- FIND ----------
  async function runSearch() {
    setSearching(true); setResults([]);
    try {
      const r = await base44.functions.invoke('searchTopWebsitesByIndustry', { industry: niche || 'general', max_results: 10 });
      const d = r.data || r;
      if (d.error) throw new Error(d.error);
      setResults(d.websites || []);
    } catch (e) { setCloneError(e.message); }
    finally { setSearching(false); }
  }
  function pickSite(p) {
    setPicked(p);
    setStage(prev => ({ ...prev, find: 'done', clone: 'pending', harden: 'pending', rewrite: 'pending', audit: 'pending', style: 'pending', approve: 'pending' }));
    setCloneError(''); setClone(null); cloneLog.reset();
    setHardenResult(null); setHardenError(''); hardenLog.reset();
    setRewriteResult(null); setRewriteError(''); rewriteLog.reset();
    setAudit(null); setRebrand(null); setApproved(false);
  }
  function pickExisting(c) {
    const url = c.vercel_deployment_url || c.metadata?.vercel_deployment_url;
    setPicked({ url, name: c.project_name });
    setClone({ vercel_url: url, name: c.project_name });
    setStage({ find: 'done', clone: 'done', harden: 'pending', rewrite: 'pending', audit: 'pending', style: 'pending', approve: 'pending' });
    setHardenResult(null); setHardenError(''); hardenLog.reset();
    setRewriteResult(null); setRewriteError(''); rewriteLog.reset();
    setAudit(null); setRebrand(null); setApproved(false);
  }

  // ---------- CLONE (with retry + fallback) ----------
  const runClone = useCallback(async () => {
    if (!picked?.url) return;
    setCloning(true); setCloneError(''); setClone(null); cloneLog.reset();
    setStageStatus('clone', 'running');
    try {
      cloneLog.push(`Scraping target DNA: ${picked.url}`);
      let dr;
      try {
        dr = await base44.functions.invoke('deepCloneTarget', { target_url: picked.url });
      } catch (e) {
        cloneLog.push(`deepCloneTarget failed (${e.message}); retrying with deterministic fallback…`);
        dr = await base44.functions.invoke('deterministicClone', { target_url: picked.url });
      }
      const d = dr.data || dr;
      if (d.error) throw new Error(d.error);
      const bizName = d.bizName || picked.name || 'Clone';
      cloneLog.push(`Captured ${d.dna?.colors?.length || 0} colors, ${d.dna?.nav?.length || 0} nav items via ${d.fetchMethod || 'fetch'}`);
      cloneLog.push('Generating faithful clone HTML…');
      const gr = await base44.functions.invoke('generateWebsite', {
        business_name: bizName, description: d.brief, primary_color: d.dna?.primary, target_dna: d.dna,
      });
      const g = gr.data || gr;
      if (g.error) throw new Error(g.error);
      cloneLog.push('Deploying to Vercel…');
      let lr;
      try {
        lr = await base44.functions.invoke('launchProject', {
          project_name: `${bizName} clone`, website_html: g.website_html, steps: { vercel: true, drive: false, github: false, supabase: false },
        });
      } catch (e) {
        cloneLog.push(`launch failed (${e.message}); retrying deploy…`);
        lr = await base44.functions.invoke('launchProject', {
          project_name: `${bizName} clone (r2)`, website_html: g.website_html, steps: { vercel: true, drive: false, github: false, supabase: false },
        });
      }
      const l = lr.data || lr;
      if (l.error) throw new Error(l.error);
      const vercelUrl = l.results?.vercel?.deploy?.url || l.results?.vercel?.deploy?.alias?.[0];
      if (!vercelUrl) throw new Error('Vercel deploy URL not returned');
      cloneLog.push(`Deployed ✓ ${vercelUrl}`);
      setClone({ vercel_url: vercelUrl, name: bizName });
      setStageStatus('clone', 'done');
      setStageStatus('harden', 'pending');
      return true;
    } catch (e) {
      setCloneError(e.message || 'Clone failed');
      setStageStatus('clone', 'error');
      return false;
    } finally { setCloning(false); }
  }, [picked, cloneLog]);

  // ---------- HARDEN (audit + analyze + fix + heal + harden + optimize) ----------
  const runHarden = useCallback(async () => {
    if (!clone?.vercel_url || !picked?.url) return;
    setHardening(true); setHardenError(''); setHardenResult(null); hardenLog.reset();
    setStageStatus('harden', 'running');
    try {
      // Create a tracker LaunchProject so the autonomous heal engine can
      // validate, auto-fix, re-deploy, and re-validate this specific clone.
      const me = await base44.auth.me();
      const orgId = me?.data?.organization_id || me?.organization_id;
      if (!orgId) throw new Error('Could not determine your organization');
      hardenLog.push(`Creating tracker for ${clone.name || 'clone'}…`);
      const tracker = await base44.entities.LaunchProject.create({
        organization_id: orgId,
        project_name: `${clone.name || 'Clone'} (harden)`,
        project_type: 'website',
        status: 'validating',
        parity_score: 0,
        vercel_deployment_url: clone.vercel_url,
        benchmark_url: picked.url,
        metadata: { target_url: picked.url, autonomous: true },
      });
      hardenLog.push(`Auditing + healing to 100/100 (may re-clone & re-deploy)…`);
      const r = await base44.functions.invoke('autonomousCloneTo100', {
        launch_project_id: tracker.id,
        max_iterations: 3,
      });
      const d = r.data || r;
      if (d.error) throw new Error(d.error);
      const finalScore = d.score ?? 0;
      const finalUrl = d.vercel_url || clone.vercel_url;
      hardenLog.push(`Heal complete: ${finalScore}/100${finalUrl ? ' · ' + finalUrl : ''}`);
      setHardenResult({ score: finalScore, vercel_url: finalUrl, summary: d.summary });
      // If the heal engine re-deployed, point subsequent steps at the hardened URL.
      if (finalUrl && finalUrl !== clone.vercel_url) {
        setClone(prev => ({ ...prev, vercel_url: finalUrl }));
      }
      setStageStatus('harden', 'done');
      setStageStatus('audit', 'pending');
      return true;
    } catch (e) {
      setHardenError(e.message || 'Harden failed');
      setStageStatus('harden', 'error');
      return false;
    } finally { setHardening(false); }
  }, [clone, picked, hardenLog]);

  // ---------- REWRITE (SEO-safe original content) ----------
  const runRewrite = useCallback(async () => {
    if (!clone?.vercel_url) return;
    setRewriting(true); setRewriteError(''); setRewriteResult(null); rewriteLog.reset();
    setStageStatus('rewrite', 'running');
    try {
      rewriteLog.push(`Rewriting content on ${clone.vercel_url} to be original (SEO-safe)…`);
      const r = await base44.functions.invoke('rewriteContentForSeo', {
        source_url: clone.vercel_url,
        clone_name: clone.name,
      });
      const d = r.data || r;
      if (d.error) throw new Error(d.error);
      rewriteLog.push(`Rewrote ${d.blocks_rewritten} of ${d.blocks_found} text blocks and redeployed.`);
      setRewriteResult(d);
      if (d.rewritten_url && d.rewritten_url !== clone.vercel_url) {
        setClone(prev => ({ ...prev, vercel_url: d.rewritten_url }));
      }
      setStageStatus('rewrite', 'done');
      setStageStatus('audit', 'pending');
      return true;
    } catch (e) {
      setRewriteError(e.message || 'Rewrite failed');
      setStageStatus('rewrite', 'error');
      return false;
    } finally { setRewriting(false); }
  }, [clone, rewriteLog]);

  // ---------- AUDIT ----------
  const runAudit = useCallback(async () => {
    if (!clone?.vercel_url) return;
    setAuditing(true); setAuditError(''); setAudit(null);
    setStageStatus('audit', 'running');
    try {
      const r = await base44.functions.invoke('detectMandatoryChanges', { source_url: clone.vercel_url });
      const d = r.data || r;
      if (d.error) throw new Error(d.error);
      setAudit(d.project);
      setStageStatus('audit', 'done');
      setStageStatus('style', 'pending');
      return true;
    } catch (e) {
      setAuditError(e.message);
      setStageStatus('audit', 'error');
      return false;
    } finally { setAuditing(false); }
  }, [clone]);

  // ---------- STYLE / REBRAND ----------
  const runRebrand = useCallback(async () => {
    if (!clone?.vercel_url) return;
    setRebranding(true); setRebrandError(''); setRebrand(null);
    setStageStatus('style', 'running');
    try {
      const r = await base44.functions.invoke('autonomousRebrand', {
        source_url: clone.vercel_url, accent_color: accent,
        clone_name: clone.name, rebrand_project_id: audit?.id,
      });
      const d = r.data || r;
      if (d.error) throw new Error(d.error);
      setRebrand(d);
      setStageStatus('style', 'done');
      setStageStatus('approve', 'pending');
      return true;
    } catch (e) {
      setRebrandError(e.message);
      setStageStatus('style', 'error');
      return false;
    } finally { setRebranding(false); }
  }, [clone, accent, audit]);

  // ---------- APPROVE ----------
  const approve = useCallback(async () => {
    const pid = audit?.id || rebrand?.project?.id;
    if (!pid) return;
    setApproving(true);
    setStageStatus('approve', 'running');
    try {
      await base44.entities.RebrandProject.update(pid, { status: 'approved', approval_state: 'approved' });
      setApproved(true);
      setStageStatus('approve', 'done');
      loadCompleted();
      return true;
    } catch (e) { setStageStatus('approve', 'error'); return false; }
    finally { setApproving(false); }
  }, [audit, rebrand]);

  // ---------- ONE-CLICK FULL PIPELINE ----------
  async function runFullPipeline() {
    if (!picked?.url) { setCloneError('Pick a site to clone first (Step 1).'); return; }
    setAutoRunning(true);
    setCloneError(''); setAuditError(''); setRebrandError('');
    try {
      const okClone = await runClone();
      if (!okClone) return;
      await new Promise(r => setTimeout(r, 50));
      const okHarden = await runHarden();
      if (!okHarden) return;
      await new Promise(r => setTimeout(r, 50));
      const okRewrite = await runRewrite();
      if (!okRewrite) return;
      await new Promise(r => setTimeout(r, 50));
      const okAudit = await runAudit();
      if (!okAudit) return;
      await new Promise(r => setTimeout(r, 50));
      const okRebrand = await runRebrand();
      if (!okRebrand) return;
      await new Promise(r => setTimeout(r, 50));
      await approve();
    } finally { setAutoRunning(false); }
  }

  function reset() {
    setStage({ find: 'pending', clone: 'pending', harden: 'pending', rewrite: 'pending', audit: 'pending', style: 'pending', approve: 'pending' });
    setPicked(null); setClone(null); setAudit(null); setRebrand(null); setApproved(false);
    setHardenResult(null); setHardenError('');
    setRewriteResult(null); setRewriteError('');
    setCloneError(''); setAuditError(''); setRebrandError('');
    setResults([]); setUrlInput(''); setMode('search'); setNiche('');
    cloneLog.reset(); hardenLog.reset(); rewriteLog.reset();
  }

  const allDone = stage.approve === 'done';

  return (
    <>
      <XtremeOSSidebar />
      <div className="portal-page xtremeos-content" style={{ background: '#f7f7f5', minHeight: '100vh', marginLeft: 240 }}>
        {/* Hero */}
        <div style={{ background: 'radial-gradient(circle at 82% 40%, #C89B3C45, transparent 25%), #0a0a0a', color: '#fff', padding: '40px 28px', margin: '-28px -28px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <p style={{ color: '#E7C86E', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', margin: 0 }}>End-to-End Clone + Rebrand Factory</p>
            <h1 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 42, margin: '10px 0 6px', letterSpacing: '-.03em' }}>Clone <span style={{ color: '#E7C86E' }}>Pipeline</span></h1>
            <p style={{ color: '#aaa', fontSize: 14, margin: 0, maxWidth: 640 }}>One page, top to bottom. Find a site, clone it, audit what must change, pick your colors, preview the rebrand, and approve — with retry + fallback for the lowest failure rate.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={runFullPipeline} disabled={autoRunning || !picked} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '15px 26px',
              background: autoRunning ? '#333' : 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111',
              border: 0, borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: autoRunning || !picked ? 'wait' : 'pointer',
              boxShadow: '0 8px 24px rgba(200,155,60,.35)',
            }}>
              {autoRunning ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
              {autoRunning ? 'Running Pipeline…' : 'Run Entire Pipeline'}
            </button>
            <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a1a', color: '#E7C86E', border: '1px solid #333', borderRadius: 8, padding: '12px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <RefreshCw size={14} /> Start Over
            </button>
          </div>
        </div>

        {/* Pipeline progress bar */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: '#fff', border: '1px solid #ddd', borderRadius: 12, padding: '14px 18px', alignItems: 'center' }}>
          {[
            { k: 'find', n: 1, label: 'Find', icon: Search },
            { k: 'clone', n: 2, label: 'Clone', icon: Copy },
            { k: 'harden', n: 3, label: 'Harden', icon: Wrench },
            { k: 'rewrite', n: 4, label: 'Rewrite', icon: PenLine },
            { k: 'audit', n: 5, label: 'Audit', icon: ShieldCheck },
            { k: 'style', n: 6, label: 'Style', icon: Palette },
            { k: 'approve', n: 7, label: 'Approve', icon: CheckCircle2 },
          ].map((s, i) => {
            const st = stage[s.k];
            return (
              <div key={s.k} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 100 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
                  background: st === 'done' ? '#237A4B' : st === 'running' ? 'linear-gradient(135deg, #E7C86E, #C89B3C)' : '#eee',
                  color: st === 'done' || st === 'running' ? (st === 'done' ? '#fff' : '#111') : '#999', fontWeight: 700, fontSize: 13,
                }}>
                  {st === 'done' ? <Check size={15} /> : st === 'running' ? <Loader2 size={15} className="animate-spin" /> : <s.icon size={15} />}
                </div>
                <div>
                  <small style={{ color: '#999', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em' }}>Stage {s.n}</small>
                  <b style={{ display: 'block', fontSize: 12, color: st === 'done' || st === 'running' ? '#111' : '#999' }}>{s.label}</b>
                </div>
                {i < 6 && <div style={{ flex: 1, height: 2, background: st === 'done' ? '#237A4B' : '#eee', minWidth: 8 }} />}
              </div>
            );
          })}
        </div>

        {/* STAGE 1: FIND */}
        <Card step={1} label="Find a Site to Clone" status={stage.find}>
          <Tabs mode={mode} setMode={setMode} tabs={[{ id: 'search', label: 'Search by Niche' }, { id: 'url', label: 'Enter a URL' }, { id: 'existing', label: 'Use Existing Clone' }]} />
          {mode === 'search' && (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="e.g. epoxy flooring, roofing, HVAC, plumbing…"
                  style={{ flex: 1, padding: '13px 14px', border: '1px solid #d7d7d7', borderRadius: 8, fontSize: 14, background: '#fff', color: '#111' }}
                  onKeyDown={e => e.key === 'Enter' && runSearch()} />
                <BtnGold disabled={searching} onClick={runSearch}>
                  {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} {searching ? 'Searching…' : 'Find Top Sites'}
                </BtnGold>
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
                      <BtnDark onClick={() => pickSite({ url: r.url, name: r.name })}><Copy size={14} /> Clone This</BtnDark>
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
              <BtnGold disabled={!urlInput.trim()} onClick={() => pickSite({ url: urlInput.trim(), name: '' })}><ArrowRight size={16} /> Continue</BtnGold>
            </div>
          )}
          {mode === 'existing' && (
            existingClones.length === 0 ? <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 13 }}>No deployed clones found. Clone a new site first.</div> :
            <div style={{ display: 'grid', gap: 8 }}>
              {existingClones.map(c => {
                const url = c.vercel_deployment_url || c.metadata?.vercel_deployment_url;
                return (
                  <div key={c.id} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <b style={{ fontSize: 14 }}>{c.project_name}</b>
                      <div style={{ fontSize: 12, color: '#2563eb', marginTop: 2 }}>{url}</div>
                    </div>
                    <BtnDark onClick={() => pickExisting(c)}><ArrowRight size={14} /> Use This</BtnDark>
                  </div>
                );
              })}
            </div>
          )}
          {picked && <SuccessBox><b>Selected:</b> {picked.name || picked.url}</SuccessBox>}
        </Card>

        {/* STAGE 2: CLONE */}
        <Card step={2} label="Clone the Target" status={stage.clone}>
          {!picked ? <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>Pick a site in Stage 1 above to begin.</div> :
          <>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Target: <a href={picked.url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{picked.url} <ExternalLink size={11} style={{ display: 'inline' }} /></a></div>
            {clone ? (
              <SuccessBox>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <CheckCircle2 size={18} />
                  <b>Clone deployed</b>
                  <a href={clone.vercel_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: 12 }}>{clone.vercel_url} <ExternalLink size={11} style={{ display: 'inline' }} /></a>
                </div>
              </SuccessBox>
            ) : (
              <BtnGold disabled={cloning} onClick={runClone}>
                {cloning ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />} {cloning ? 'Cloning…' : 'Clone This Site'}
              </BtnGold>
            )}
            <Log lines={cloneLog.lines} />
            {cloneError && <ErrorBox text={cloneError} onRetry={runClone} />}
          </>}
        </Card>

        {/* STAGE 3: HARDEN */}
        <Card step={3} label="Harden & Optimize" status={stage.harden}>
          {!clone ? <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>Complete Stage 2 (Clone) first.</div> :
          <>
            <p style={{ fontSize: 13, color: '#666', margin: '0 0 12px' }}>
              Audits the fresh clone, analyzes imperfections, then autonomously fixes, heals, hardens, and optimizes it to 100/100 — re-deploying if needed — before the content rewrite. Optional: you can skip straight to Stage 5.
            </p>
            {hardenResult ? (
              <SuccessBox>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <CheckCircle2 size={18} />
                  <b>Harden complete — {hardenResult.score}/100</b>
                  {hardenResult.vercel_url && <a href={hardenResult.vercel_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: 12 }}>{hardenResult.vercel_url} <ExternalLink size={11} style={{ display: 'inline' }} /></a>}
                </div>
                {hardenResult.summary && <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{hardenResult.summary}</div>}
              </SuccessBox>
            ) : (
              <BtnGold disabled={hardening} onClick={runHarden}>
                {hardening ? <Loader2 size={16} className="animate-spin" /> : <Wrench size={16} />} {hardening ? 'Hardening…' : 'Audit, Heal & Harden to 100'}
              </BtnGold>
            )}
            <Log lines={hardenLog.lines} />
            {hardenError && <ErrorBox text={hardenError} onRetry={runHarden} />}
          </>}
        </Card>

        {/* STAGE 4: REWRITE */}
        <Card step={4} label="Rewrite Content (SEO-Safe)" status={stage.rewrite}>
          {!clone ? <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>Complete Stage 2 (Clone) first.</div> :
          <>
            <p style={{ fontSize: 13, color: '#666', margin: '0 0 12px' }}>
              Rewrites every substantial text block on the clone into original copy (same meaning, keywords, and length) so Google won't flag it as duplicate content — then redeploys. This is what lets a cloned structure actually compete for rankings instead of being suppressed.
            </p>
            {rewriteResult ? (
              <SuccessBox>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <CheckCircle2 size={18} />
                  <b>{rewriteResult.blocks_rewritten} of {rewriteResult.blocks_found} blocks rewritten</b>
                  {rewriteResult.rewritten_url && <a href={rewriteResult.rewritten_url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: 12 }}>{rewriteResult.rewritten_url} <ExternalLink size={11} style={{ display: 'inline' }} /></a>}
                </div>
                {rewriteResult.summary && <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{rewriteResult.summary}</div>}
              </SuccessBox>
            ) : (
              <BtnGold disabled={rewriting} onClick={runRewrite}>
                {rewriting ? <Loader2 size={16} className="animate-spin" /> : <PenLine size={16} />} {rewriting ? 'Rewriting…' : 'Rewrite to Original Content'}
              </BtnGold>
            )}
            <Log lines={rewriteLog.lines} />
            {rewriteError && <ErrorBox text={rewriteError} onRetry={runRewrite} />}
          </>}
        </Card>

        {/* STAGE 5: AUDIT */}
        <Card step={5} label="Audit Mandatory Changes" status={stage.audit}>
          {!clone ? <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>Complete Stage 2 (Clone) first.</div> :
          <>
            {audit ? (
              <>
                <SuccessBox><b>Audit complete — {audit.mandatory_swaps?.length || 0} mandatory swaps found</b></SuccessBox>
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
              </>
            ) : (
              <BtnGold disabled={auditing} onClick={runAudit}>
                {auditing ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} {auditing ? 'Auditing…' : 'Run Legal Audit'}
              </BtnGold>
            )}
            {auditError && <ErrorBox text={auditError} onRetry={runAudit} />}
          </>}
        </Card>

        {/* STAGE 6: STYLE */}
        <Card step={6} label="Style & Rebrand Preview" status={stage.style}>
          {!clone ? <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>Complete Stage 2 (Clone) first.</div> :
          <>
            <div style={{ marginBottom: 16 }}>
              <b style={{ fontSize: 14, display: 'block', marginBottom: 10 }}>Accent Color</b>
              <AccentPicker value={accent} onChange={setAccent} />
            </div>
            {!rebrand ? (
              <BtnGold disabled={rebranding} onClick={runRebrand}>
                {rebranding ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {rebranding ? 'Generating rebrand…' : 'Generate Rebrand Preview'}
              </BtnGold>
            ) : (
              <>
                <SuccessBox><b>Rebrand deployed — 12 mandatory elements processed</b></SuccessBox>
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
                    <a href={rebrand.deploy_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#0a0a0a', color: '#E7C86E', borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                      <Globe size={14} /> View Live Rebrand <ExternalLink size={11} style={{ display: 'inline' }} />
                    </a>
                  </div>
                )}
                {rebrand.deploy_url && (
                  <div style={{ marginTop: 12, border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', height: 480, background: '#fff' }}>
                    <iframe src={rebrand.deploy_url} title="Rebrand preview" style={{ width: '100%', height: '100%', border: 0 }} />
                  </div>
                )}
              </>
            )}
            {rebrandError && <ErrorBox text={rebrandError} onRetry={runRebrand} />}
          </>}
        </Card>

        {/* STAGE 7: APPROVE */}
        <Card step={7} label="Approve & Publish" status={stage.approve}>
          {!rebrand ? <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>Complete Stage 6 (Style) first.</div> :
          <>
            {approved ? (
              <>
                <SuccessBox>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle2 size={20} />
                    <div><b>Approved & published!</b><div style={{ fontSize: 12, marginTop: 2 }}>This clone now appears in "Completed Clones" below.</div></div>
                  </div>
                </SuccessBox>
                {(rebrand.deploy_url || rebrand?.project?.provisioned?.vercel_deployment_url) && (
                  <a href={rebrand.deploy_url || rebrand.project.provisioned.vercel_deployment_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, padding: '10px 16px', background: '#0a0a0a', color: '#E7C86E', borderRadius: 6, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                    <Eye size={14} /> View Live Site
                  </a>
                )}
              </>
            ) : (
              <>
                {rebrand.deploy_url && (
                  <div style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', height: 420, background: '#fff', marginBottom: 16 }}>
                    <iframe src={rebrand.deploy_url} title="Final preview" style={{ width: '100%', height: '100%', border: 0 }} />
                  </div>
                )}
                <BtnGold disabled={approving} onClick={approve}>
                  {approving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {approving ? 'Approving…' : 'Approve & Publish'}
                </BtnGold>
              </>
            )}
          </>}
        </Card>

        {/* Completed clones */}
        <div style={{ marginTop: 24, marginBottom: 12 }}>
          <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 18 }}>Completed Clones</b>
          <span style={{ fontSize: 12, color: '#999', marginLeft: 10 }}>Approved rebrands from this pipeline</span>
        </div>
        {loadingCompleted ? <div style={{ padding: 30, textAlign: 'center' }}><Loader2 className="animate-spin" style={{ color: '#C89B3C' }} /></div> :
         completed.length === 0 ? <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 13, background: '#fff', border: '1px solid #ddd', borderRadius: 10 }}>No approved clones yet. Run the pipeline above.</div> :
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
           {completed.map(p => <CloneCard key={p.id} p={p} />)}
         </div>}
      </div>
    </>
  );
}

/* ---------- small helpers ---------- */
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
function CloneCard({ p }) {
  const url = p.provisioned?.vercel_deployment_url;
  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ height: 150, background: '#0a0a0a', position: 'relative' }}>
        {url ? <iframe src={url} title={p.source_clone_name} style={{ width: '100%', height: '100%', border: 0, pointerEvents: 'none' }} /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}><Globe color="#666" /></div>}
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