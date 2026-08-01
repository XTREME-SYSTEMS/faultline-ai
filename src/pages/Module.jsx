import { useParams } from 'react-router-dom';
import PortalShell from '@/components/fl/PortalShell';
import PageHead from '@/components/fl/PageHead';
import { modules } from '@/components/fl/data';

export default function Module() {
  const { slug } = useParams();
  const m = modules[slug] || { title: 'Module', eyebrow: 'Operate', description: 'Governed module preview.', outcomes: ['Evidence', 'Approval', 'Action', 'Validation'] };
  return (
    <PortalShell>
      <PageHead eyebrow={m.eyebrow} title={m.title} text={m.description} />
      <section className="module-hero">
        <div>
          <p className="eyebrow">Guided workflow</p>
          <h2>Move from an approved question to an evidence-backed result.</h2>
          <p>Each step records source provenance, confidence, decisions, receipts, and the next eligible action.</p>
        </div>
        <div className="module-score">
          <b>84</b>
          <small>readiness</small>
        </div>
      </section>
      <div className="module-grid">
        {m.outcomes.map((x, i) => (
          <article key={x}>
            <span>0{i + 1}</span>
            <h3>{x}</h3>
            <p>Configured as a governed preview component with role, evidence, and approval requirements documented in the handoff.</p>
          </article>
        ))}
      </div>
      <section className="governance">
        <b>Approval and evidence controls are active.</b>
        <p>Material findings require review. Outreach remains draft-only. Production, payments, secrets, and destructive actions remain gated.</p>
      </section>
    </PortalShell>
  );
}