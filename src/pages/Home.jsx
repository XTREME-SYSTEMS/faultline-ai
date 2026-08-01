import { Link } from 'react-router-dom';
import MarketingShell from '@/components/fl/MarketingShell';
import Hero from '@/components/fl/Hero';
import Section from '@/components/fl/Section';
import { problems, capabilities, steps } from '@/components/fl/data';

export default function Home() {
  return (
    <MarketingShell>
      <Hero />
      <section className="logo-strip">
        <div className="container">
          <small>Trusted by growing businesses</small>
          {['NEXORA', 'PIVOT EAST', 'VERIDIAN', 'ALTIVY', 'LUMENIX', 'IRONRIDGE'].map((x) => (
            <b key={x}>{x}</b>
          ))}
        </div>
      </section>
      <Section eyebrow="The problem" title="Most businesses lose more than they realize." intro="Small cracks become expensive blind spots. FaultLine AI makes the invisible visible without turning the process into a blame machine.">
        <div className="card-grid three">
          {problems.map(([t, p]) => (
            <article key={t}>
              <span className="icon">◇</span>
              <h3>{t}</h3>
              <p>{p}</p>
            </article>
          ))}
        </div>
      </Section>
      <Section eyebrow="The platform" title="Everything you need to diagnose, repair, build, and monitor." intro="One evidence-centered operating system designed to move from insight to measurable action.">
        <div className="cap-grid">
          {capabilities.map((x) => (
            <article key={x}>
              <span>◈</span>
              <b>{x}</b>
              <i>→</i>
            </article>
          ))}
        </div>
      </Section>
      <Section dark eyebrow="How it works" title="A simple process. Real results.">
        <div className="steps">
          {steps.map(([n, t, p]) => (
            <article key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{p}</p>
            </article>
          ))}
        </div>
      </Section>
      <Section eyebrow="Evidence you can trust" title="The claim is never stronger than the proof." intro="Every material finding is classified, sourced, scored, reviewed, and connected to a practical decision.">
        <div className="evidence">
          <div className="score">
            <b>91</b>
            <small>confidence</small>
          </div>
          <div className="card-grid two">
            <article>
              <h3>Verified evidence</h3>
              <p>Directly supported by connected data, documents, or approved public sources.</p>
            </article>
            <article>
              <h3>Supported inference</h3>
              <p>A reasoned conclusion with visible assumptions and uncertainty.</p>
            </article>
            <article>
              <h3>Confidence score</h3>
              <p>A transparent measure of how strongly the evidence supports a finding.</p>
            </article>
            <article>
              <h3>Modeled impact</h3>
              <p>A defensible range, not a theatrical promise dressed as mathematics.</p>
            </article>
          </div>
        </div>
      </Section>
      <Section soft eyebrow="Sample deliverables" title="Clear reports. Actionable intelligence." intro="Designed for executives, operators, reviewers, and the people responsible for making change real.">
        <div className="docs">
          {['Executive Audit Summary', 'Failure Map', 'Revenue Leak Report', 'Risk Register', 'AI Readiness Score', '90-Day Repair Plan'].map((x, i) => (
            <article key={x}>
              <div className={i < 2 ? 'doc darkdoc' : 'doc'}>
                <small>FAULTLINE AI</small>
                <b>{i === 2 ? '$1.82M' : i === 4 ? '62' : `0${i + 1}`}</b>
                <i /><i /><i />
              </div>
              <h3>{x}</h3>
              <p>Evidence, confidence, ownership, and next actions in a clean professional format.</p>
            </article>
          ))}
        </div>
      </Section>
      <Section eyebrow="Industries" title="Built for businesses that build.">
        <div className="industry">
          {['Construction', 'Contractors', 'Manufacturing', 'Distribution', 'Multi-location', 'Agencies', 'Professional services', 'Growth teams'].map((x) => (
            <article key={x}>⌂<b>{x}</b></article>
          ))}
        </div>
      </Section>
      <Section soft eyebrow="Pricing" title="Start with clarity. Scale with confidence." intro="Pricing is a validation hypothesis until delivery cost and willingness to pay are confirmed.">
        <div className="pricing">
          {[['Diagnostic', '$0', 'Initial scoped audit'], ['Growth', '$299/mo', 'Ongoing audit and repair'], ['Operating System', '$699/mo', 'Continuous monitoring'], ['Enterprise', 'Custom', 'Complex organizations']].map(([n, p, d], i) => (
            <article className={i === 2 ? 'featured' : ''} key={n}>
              {i === 2 && <em>Most popular</em>}
              <h3>{n}</h3>
              <b>{p}</b>
              <p>{d}</p>
              <ul>
                <li>Evidence-backed findings</li>
                <li>Repair roadmap</li>
                <li>Customer portal</li>
              </ul>
              <Link className={i === 2 ? 'btn gold' : 'btn outline'} to={i === 0 ? '/register' : '/checkout'}>Choose plan</Link>
            </article>
          ))}
        </div>
      </Section>
    </MarketingShell>
  );
}