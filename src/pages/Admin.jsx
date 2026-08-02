import PortalShell from '@/components/fl/PortalShell';
import PageHead from '@/components/fl/PageHead';
import PageCoach from '@/components/fl/PageCoach';

export default function Admin() {
  const coachContext = { page: 'admin console', queues: 'audit, evidence, outreach, failed jobs', systemHealth: 'control plane, supabase, vercel, monitoring, evidence QA, model gateway' };

  return (
    <PortalShell assistant={<PageCoach pageKey="admin" context={coachContext} title="Admin" />}>
      <PageHead eyebrow="Internal operations" title="FaultLine AI admin console" text="Manage queues, agents, connectors, governance, release gates, and operating evidence." />
      <div className="queue-grid">
        {[['Audit queue', '12', '3 awaiting review'], ['Evidence queue', '38', '8 need validation'], ['Outreach approvals', '7', 'All draft-only'], ['Failed jobs', '2', 'Dead-lettered safely']].map(([a, b, c]) => (
          <article key={a}>
            <span>{a}</span>
            <b>{b}</b>
            <small>{c}</small>
          </article>
        ))}
      </div>
      <div className="admin-grid">
        <article>
          <h3>System health</h3>
          {[['Control plane', 'Healthy'], ['Supabase adapter', 'Not configured'], ['Vercel workflow', 'Contract ready'], ['Monitoring agents', 'Preview'], ['Evidence QA', 'Active'], ['Model gateway', 'Environment needed']].map(([a, b]) => (
            <p key={a}><span>{a}</span><b>{b}</b></p>
          ))}
        </article>
        <article>
          <h3>Release gates</h3>
          <p>✓ Vite package assembled</p>
          <p>✓ Base44 handoff documented</p>
          <p>△ Supabase requires cost confirmation</p>
          <p>△ Vercel requires repo and environment</p>
          <p>△ Live outreach remains blocked</p>
        </article>
      </div>
    </PortalShell>
  );
}