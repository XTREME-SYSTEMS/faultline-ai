import { Link } from 'react-router-dom';
import MarketingShell from '@/components/fl/MarketingShell';
import Section from '@/components/fl/Section';
import { marketing } from '@/components/fl/data';

export default function MarketingPage({ page }) {
  const [eye, title, intro, points] = marketing[page] || marketing.product;
  return (
    <MarketingShell>
      <section className="subhero">
        <div className="container">
          <p className="eyebrow">{eye}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
          <div className="actions">
            <Link className="btn dark" to="/register">Start free audit →</Link>
            <Link className="btn outline" to="/contact">Book a strategy call</Link>
          </div>
        </div>
      </section>
      <Section eyebrow="What’s included" title="A disciplined system, not a pile of AI features.">
        <div className="card-grid three">
          {points.map((x) => (
            <article key={x}>
              <span className="icon">✓</span>
              <h3>{x}</h3>
              <p>Designed with evidence, permissions, approval gates, and measurable outcomes at the center.</p>
            </article>
          ))}
        </div>
      </Section>
    </MarketingShell>
  );
}