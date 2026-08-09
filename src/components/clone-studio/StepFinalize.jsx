import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, ExternalLink, Rocket } from 'lucide-react';

export default function StepFinalize({ launchProjectId, vercelUrl, onRestart }) {
  const [project, setProject] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!launchProjectId) return;
    let active = true;
    const poll = async () => {
      try {
        const p = await base44.entities.LaunchProject.get(launchProjectId);
        if (!active) return;
        setProject(p);
        if (p.status === 'passed' || p.parity_score >= 100) { setDone(true); return; }
        if (p.status === 'failed') { setDone(true); return; }
        setTimeout(poll, 4000);
      } catch (e) { /* retry */ }
    };
    poll();
    return () => { active = false; };
  }, [launchProjectId]);

  const score = project?.parity_score || 0;
  const progress = project?.progress || 0;
  const stage = project?.last_validation_summary || 'Applying customizations…';
  const finalUrl = project?.vercel_deployment_url || vercelUrl;
  const isReady = done && score >= 100;
  const isFailed = done && score < 100;

  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      {isReady ? (
        <>
          <div style={{
            width: 100, height: 100, borderRadius: '50', margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #237A4B, #1a5a35)', display: 'grid', placeItems: 'center',
          }}>
            <Rocket size={40} style={{ color: '#fff' }} />
          </div>
          <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 32, margin: '0 0 8px' }}>
            Production Ready — <span style={{ color: '#237A4B' }}>100/100</span>
          </h3>
          <p style={{ color: '#666', fontSize: 14, margin: '0 0 24px' }}>
            Your customized clone is live, audited, healed, and hardened. Ready to launch.
          </p>
          {finalUrl && (
            <a href={finalUrl} target="_blank" rel="noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px',
              background: '#111', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 14,
            }}>
              <ExternalLink size={18} /> View Live Site
            </a>
          )}
          <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {project?.drive_folder_url && <Link label="Drive" url={project.drive_folder_url} />}
            {project?.github_repo_url && <Link label="GitHub" url={project.github_repo_url} />}
            {project?.supabase_project_url && <Link label="Supabase" url={project.supabase_project_url} />}
          </div>
          <div style={{ marginTop: 28 }}>
            <button onClick={onRestart} style={{ padding: '12px 24px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              Clone Another Site →
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ width: 120, height: 120, margin: '0 auto 24px', position: 'relative' }}>
            <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="60" cy="60" r="52" fill="none" stroke="#eee" strokeWidth="8" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={isFailed ? '#C63D34' : '#C89B3C'} strokeWidth="8"
                strokeLinecap="round" strokeDasharray={327} strokeDashoffset={327 - (327 * Math.max(progress, score) / 100)}
                style={{ transition: 'stroke-dashoffset .5s' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
              <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 30 }}>{score || progress}</b>
            </div>
          </div>
          <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 24, margin: '0 0 8px' }}>
            {isFailed ? 'Finalized with issues' : 'Finalizing for Production'}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            {!done && <Loader2 size={16} className="animate-spin" style={{ color: '#C89B3C' }} />}
            <span style={{ color: '#666', fontSize: 13 }}>{stage}</span>
          </div>
          <p style={{ color: '#999', fontSize: 12 }}>
            Applying changes → re-launching → auditing → auto-fixing → healing → hardening
          </p>
          {isFailed && (
            <div style={{ marginTop: 16 }}>
              <button onClick={onRestart} style={{ padding: '12px 24px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                Start Over →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Link({ label, url }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{
      display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
      background: '#f8f7f4', border: '1px solid #eee', borderRadius: 20, fontSize: 12, color: '#8A641C', fontWeight: 600,
    }}>
      <CheckCircle2 size={13} /> {label} <ExternalLink size={11} />
    </a>
  );
}