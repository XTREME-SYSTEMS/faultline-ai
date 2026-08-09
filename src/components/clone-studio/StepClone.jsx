import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, ExternalLink } from 'lucide-react';

export default function StepClone({ launchProjectId, candidate, onComplete, onError }) {
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!launchProjectId) return;
    let active = true;
    const poll = async () => {
      try {
        const p = await base44.entities.LaunchProject.get(launchProjectId);
        if (!active) return;
        setProject(p);
        if (p.status === 'passed' || (p.parity_score >= 100)) {
          onComplete(p);
          return;
        }
        if (p.status === 'failed') {
          setError(p.last_validation_summary || 'Clone failed');
          onError(p);
          return;
        }
        setTimeout(poll, 3000);
      } catch (e) {
        if (active) setError(e.message);
      }
    };
    poll();
    return () => { active = false; };
  }, [launchProjectId]);

  const progress = project?.progress || 0;
  const score = project?.parity_score || 0;
  const stage = project?.last_validation_summary || 'Starting clone pipeline…';
  const vercelUrl = project?.vercel_deployment_url || project?.metadata?.vercel_deployment_url;

  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 28, margin: '0 0 8px' }}>
          Cloning <span style={{ color: '#C89B3C' }}>{candidate?.name}</span>
        </h3>
        <p style={{ color: '#666', fontSize: 14, margin: 0 }}>
          Scraping → generating clone → provisioning Drive, GitHub, Vercel, Supabase → launching → healing to 100/100
        </p>
      </div>

      {/* Progress ring */}
      <div style={{ width: 140, height: 140, margin: '0 auto 24px', position: 'relative' }}>
        <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="70" cy="70" r="62" fill="none" stroke="#eee" strokeWidth="10" />
          <circle cx="70" cy="70" r="62" fill="none" stroke="#C89B3C" strokeWidth="10"
            strokeLinecap="round" strokeDasharray={389} strokeDashoffset={389 - (389 * progress / 100)}
            style={{ transition: 'stroke-dashoffset .5s' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', flexDirection: 'column' }}>
          <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 36 }}>{progress}%</b>
          {score > 0 && <small style={{ color: score >= 100 ? '#237A4B' : '#B88214', fontSize: 11, fontWeight: 700 }}>{score}/100</small>}
        </div>
      </div>

      {/* Stage label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
        <Loader2 size={16} className="animate-spin" style={{ color: '#C89B3C' }} />
        <span style={{ color: '#666', fontSize: 13 }}>{stage}</span>
      </div>

      {/* Infra links as they come in */}
      {project?.drive_folder_url && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
          {project.drive_folder_url && <InfraBadge label="Drive" url={project.drive_folder_url} />}
          {project.github_repo_url && <InfraBadge label="GitHub" url={project.github_repo_url} />}
          {project.supabase_project_url && <InfraBadge label="Supabase" url={project.supabase_project_url} />}
          {vercelUrl && <InfraBadge label="Vercel" url={vercelUrl} />}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 20, padding: 14, background: '#f5d8d5', borderRadius: 8, color: '#a52d23', fontSize: 13 }}>
          {error}
        </div>
      )}
    </div>
  );
}

function InfraBadge({ label, url }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{
      display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
      background: '#f8f7f4', border: '1px solid #eee', borderRadius: 20,
      fontSize: 12, color: '#8A641C', fontWeight: 600,
    }}>
      <CheckCircle2 size={13} /> {label} <ExternalLink size={11} />
    </a>
  );
}