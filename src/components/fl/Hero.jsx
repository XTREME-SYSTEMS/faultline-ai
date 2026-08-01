import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div>
          <p className="eyebrow">✦ AI-powered business intelligence</p>
          <h1>Expose What’s Broken.<br /><span>Build What Works.</span></h1>
          <p className="lead">FaultLine AI privately uncovers hidden failures, revenue leaks, and operational risks across your website, systems, and workflows, then delivers an evidence-backed repair plan.</p>
          <div className="actions">
            <Link className="btn dark" to="/register">Start free audit →</Link>
            <Link className="btn outline" to="/contact">Book a strategy call</Link>
          </div>
          <div className="trust">
            <span>✓ No credit card required</span>
            <span>◇ Confidential analysis</span>
            <span>▣ Evidence-backed findings</span>
          </div>
        </div>
        <div className="fracture" aria-label="Abstract fracture becoming a connected business system">
          <div className="crack one" />
          <div className="crack two" />
          <div className="crack three" />
          <div className="core">
            <img src="/assets/faultline/monogram/svg/monogram-gold-white-transparent.svg" alt="" />
            <b>FaultLine AI</b>
            <small>Diagnose → Repair → Grow</small>
          </div>
          {['Website', 'Operations', 'Revenue', 'AI readiness', 'Repair plan'].map((x, i) => (
            <span className={`node n${i + 1}`} key={x}>{x}</span>
          ))}
        </div>
      </div>
    </section>
  );
}