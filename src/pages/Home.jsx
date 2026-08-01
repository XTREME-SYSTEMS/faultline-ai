import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/components/fl/Icon';
import DeliverablePreview from '@/components/fl/DeliverablePreview';
import '@/components/fl/production-homepage.css';

const PROBLEMS = [
  { icon: 'lead', label: 'Missed Leads', text: 'Inbound interest that never gets a timely response.' },
  { icon: 'website', label: 'Weak Websites', text: 'Slow, unclear pages that quietly repel buyers.' },
  { icon: 'workflow', label: 'Broken Workflows', text: 'Manual hand-offs that stall deals and deliveries.' },
  { icon: 'pricing', label: 'Pricing Leaks', text: 'Discounts and quotes that erode margin silently.' },
  { icon: 'clock', label: 'Slow Approvals', text: 'Bottlenecks that delay every revenue moment.' },
  { icon: 'invoice', label: 'Unbilled Work', text: 'Effort delivered but never invoiced or tracked.' },
  { icon: 'tools', label: 'Redundant Tools', text: 'Overlapping subscriptions draining budget.' },
  { icon: 'ai', label: 'AI Unprepared', text: 'No strategy to capture AI productivity gains.' }
];

const PLATFORM = [
  { icon: 'website', label: 'Website Intelligence' },
  { icon: 'audit', label: 'Operational Audit' },
  { icon: 'map', label: 'System Mapping' },
  { icon: 'revenue', label: 'Revenue Leak Detection' },
  { icon: 'risk', label: 'Risk Register' },
  { icon: 'readiness', label: 'AI Readiness' },
  { icon: 'roadmap', label: 'Repair Roadmap' },
  { icon: 'builder', label: 'Business Builder' },
  { icon: 'outreach', label: 'Outreach Assistance' },
  { icon: 'monitor', label: 'Continuous Monitoring' }
];

const STEPS = [
  { icon: 'search', label: 'Connect & Discover', text: 'Point FaultLine at your domain and systems — no code, no install.' },
  { icon: 'audit', label: 'Analyze & Diagnose', text: 'Multi-pass scans surface what is broken and why.' },
  { icon: 'revenue', label: 'Quantify & Prioritize', text: 'Every finding gets a dollar impact and confidence score.' },
  { icon: 'roadmap', label: 'Repair & Improve', text: 'A 90-day plan with owners, actions, and validation.' },
  { icon: 'monitor', label: 'Monitor & Scale', text: 'Continuous checks keep the system honest as you grow.' }
];

const DELIVERABLES = [
  { label: 'Executive Summary', metric: '01', variant: 'dark' },
  { label: 'Failure Map', metric: '02', variant: 'dark' },
  { label: 'Revenue Leak Report', metric: '$1.8M', variant: 'light' },
  { label: 'Risk Register', metric: '04', variant: 'light' },
  { label: 'AI Readiness Score', metric: '62', variant: 'dark' },
  { label: '90-Day Repair Plan', metric: '06', variant: 'dark' }
];

const INDUSTRIES = [
  { icon: 'construction', label: 'Construction' },
  { icon: 'contractor', label: 'Contractors' },
  { icon: 'manufacturing', label: 'Manufacturing' },
  { icon: 'distribution', label: 'Distribution' },
  { icon: 'locations', label: 'Multi-Location Services' },
  { icon: 'agency', label: 'Agencies & Consultants' },
  { icon: 'professional', label: 'Professional Services' },
  { icon: 'more', label: 'And More' }
];

const SECURITY = [
  { icon: 'lock', title: 'SOC 2 Aligned', text: 'Evidence handled with audit-grade controls.' },
  { icon: 'shield', title: 'Encrypted at Rest', text: 'All data encrypted in transit and storage.' },
  { icon: 'evidence', title: 'Evidence-Backed', text: 'Every finding links to verifiable source data.' }
];

const PLANS = [
  { name: 'Diagnostic', price: '$0', sub: 'Free forever', desc: 'Start with a free audit and see what is broken.', features: ['1 company scan', 'Executive summary', 'Top 5 findings', 'Self-serve portal'], cta: 'Start Free', variant: 'dark' },
  { name: 'Growth', price: '$299', sub: 'per month', desc: 'For growing teams that need to fix and scale.', features: ['5 company scans', 'Full finding library', '90-day repair plan', 'Revenue leak report', 'Email support'], cta: 'Choose Growth', variant: 'dark', featured: false },
  { name: 'Operating System', price: '$699', sub: 'per month', desc: 'The complete growth operating system.', features: ['Unlimited scans', 'Continuous monitoring', 'AI readiness score', 'Outreach assistance', 'Priority support', 'Quarterly review'], cta: 'Choose OS', variant: 'gold', featured: true },
  { name: 'Enterprise', price: 'Custom', sub: 'talk to us', desc: 'For multi-location and complex operations.', features: ['Everything in OS', 'Dedicated reviewer', 'Custom integrations', 'SLA & onboarding', 'Team training'], cta: 'Contact Sales', variant: 'outline' }
];

export default function Home() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand" to="/" onClick={() => setNavOpen(false)}>
            <img src="/logo-horizontal.svg" alt="FaultLine AI" />
          </Link>
          <nav className={navOpen ? 'primary-nav is-open' : 'primary-nav'}>
            <Link to="/product" onClick={() => setNavOpen(false)}>Product</Link>
            <Link to="/solutions" onClick={() => setNavOpen(false)}>Solutions</Link>
            <Link to="/industries" onClick={() => setNavOpen(false)}>Industries</Link>
            <Link to="/how-it-works" onClick={() => setNavOpen(false)}>How It Works</Link>
            <Link to="/pricing" onClick={() => setNavOpen(false)}>Pricing</Link>
            <Link to="/resources" onClick={() => setNavOpen(false)}>Resources</Link>
          </nav>
          <div className="header-actions">
            <Link className="text-link" to="/login">Sign In</Link>
            <Link className="button button--dark" to="/register">Start Free Audit</Link>
            <button className="menu-button" onClick={() => setNavOpen(!navOpen)} aria-label="Toggle menu">
              <Icon name="search" size={22} />
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">AI-Powered Business Intelligence</span>
              <h1>Expose What's Broken.<br /><span>Build What Works.</span></h1>
              <p className="hero-lead">FaultLine AI uncovers hidden failures, revenue leaks, and operational risks across your website, systems, and workflows — then delivers an evidence-backed plan to fix them.</p>
              <div className="button-row">
                <Link className="button button--dark" to="/register">Start Free Audit</Link>
                <Link className="button button--outline" to="/contact">Book a Strategy Call</Link>
              </div>
              <ul className="trust-list">
                <li><Icon name="check" size={16} /> No credit card required</li>
                <li><Icon name="shield" size={16} /> Confidential analysis</li>
                <li><Icon name="evidence" size={16} /> Evidence-backed recommendations</li>
              </ul>
            </div>
            <div className="hero-visual">
              <img src="/hero-network.svg" alt="Fractured systems becoming a connected network" />
              <span className="signal signal--one"><span className="dot" /> Disconnected Systems</span>
              <span className="signal signal--two"><span className="dot" /> Lost Revenue</span>
              <span className="signal signal--three"><span className="dot" /> Operational Gaps</span>
              <span className="signal signal--dark signal--four"><span className="dot" /> Connected Systems</span>
              <span className="signal signal--dark signal--five"><span className="dot" /> Revenue Recovered</span>
              <span className="signal signal--dark signal--six"><span className="dot" /> Business Optimized</span>
            </div>
          </div>
        </section>

        {/* Customer logos */}
        <div className="container customer-logos">
          <span>◇ PIVOT EAST</span>
          <span>⬡ NEXORA</span>
          <span>◈ VERIDIAN</span>
          <span>⬢ ALTIVY</span>
          <span>⌁ LUMENIX</span>
        </div>

        {/* Problem */}
        <section className="content-section">
          <div className="container">
            <div className="section-intro">
              <span className="eyebrow">The Problem</span>
              <h2>Most Businesses Lose More Than They Realize</h2>
              <p>Hidden failures and inefficiencies silently drain revenue, limit growth, and create unnecessary risk — every day they go unfixed.</p>
            </div>
            <div className="problem-grid">
              {PROBLEMS.map(p => (
                <article className="problem-card" key={p.label}>
                  <Icon name={p.icon} size={28} />
                  <h3>{p.label}</h3>
                  <p>{p.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Platform */}
        <section className="content-section content-section--soft">
          <div className="container">
            <div className="section-intro">
              <span className="eyebrow">The Platform</span>
              <h2>Everything You Need to Fix, Build, and Scale</h2>
              <p>Complete visibility and guidance to run a stronger business — from diagnosis to repair to continuous monitoring.</p>
            </div>
            <div className="platform-grid">
              {PLATFORM.map(p => (
                <article className="platform-item" key={p.label}>
                  <Icon name={p.icon} size={22} />
                  <strong>{p.label}</strong>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Process */}
        <section className="content-section">
          <div className="container">
            <div className="section-intro center">
              <span className="eyebrow">How It Works</span>
              <h2>A Simple Process. Real Results.</h2>
              <p>From first scan to continuous improvement in five clear steps.</p>
            </div>
            <div className="steps">
              {STEPS.map(s => (
                <article className="step" key={s.label}>
                  <div className="step-icon"><Icon name={s.icon} size={26} /></div>
                  <h3>{s.label}</h3>
                  <p>{s.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Deliverables */}
        <section className="content-section content-section--soft">
          <div className="container">
            <div className="section-intro center">
              <span className="eyebrow">Sample Deliverables</span>
              <h2>Clear Reports. Actionable Insight.</h2>
              <p>Every engagement ends with evidence-backed documents your team can act on immediately.</p>
            </div>
            <div className="deliverable-grid">
              {DELIVERABLES.map(d => (
                <article className="deliverable" key={d.label}>
                  <DeliverablePreview label={d.label} metric={d.metric} variant={d.variant} />
                  <h3>{d.label}</h3>
                  <p>Evidence, confidence, and next actions — ready to share with your team.</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Industries */}
        <section className="content-section">
          <div className="container">
            <div className="section-intro center">
              <span className="eyebrow">Industries We Serve</span>
              <h2>Built for Businesses That Build</h2>
              <p>Field-tested with operations that have real systems, real teams, and real revenue on the line.</p>
            </div>
            <div className="industry-grid">
              {INDUSTRIES.map(i => (
                <article className="industry-card" key={i.label}>
                  <Icon name={i.icon} size={30} />
                  <strong>{i.label}</strong>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="content-section content-section--dark">
          <div className="container">
            <div className="security-grid">
              <div>
                <span className="eyebrow">Trust & Security</span>
                <h2>Evidence You Can Trust. Controls You Can Audit.</h2>
                <p>FaultLine AI is built for operators who need defensible, verifiable analysis — not black-box guesses. Every finding links back to source evidence.</p>
              </div>
              <ul>
                {SECURITY.map(s => (
                  <li key={s.title}>
                    <Icon name={s.icon} size={28} />
                    <strong>{s.title}</strong>
                    <span>{s.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="content-section content-section--soft" id="pricing">
          <div className="container">
            <div className="section-intro center">
              <span className="eyebrow">Pricing</span>
              <h2>Choose the Right Plan for Your Business</h2>
              <p>Start free. Upgrade when you are ready to repair and scale.</p>
            </div>
            <div className="pricing-grid">
              {PLANS.map(plan => (
                <article className={`pricing-card ${plan.featured ? 'pricing-card--featured' : ''}`} key={plan.name}>
                  {plan.featured && <span className="popular">Most Popular</span>}
                  <h3>{plan.name}</h3>
                  <p>{plan.desc}</p>
                  <div className="price">{plan.price}</div>
                  <small>{plan.sub}</small>
                  <ul>
                    {plan.features.map(f => (
                      <li key={f}><Icon name="check" size={16} /> {f}</li>
                    ))}
                  </ul>
                  <Link className={`button button--${plan.variant}`} to={plan.name === 'Enterprise' ? '/contact' : '/checkout'}>
                    {plan.cta}
                  </Link>
                </article>
              ))}
            </div>
            <p className="pricing-note">All plans include the customer portal. Cancel anytime. No credit card required for the Diagnostic plan.</p>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="closing-cta">
          <div className="container closing-grid">
            <div>
              <h2>Stop Guessing.<br /><span>Start Fixing.</span></h2>
              <p>Get your free audit and discover what is holding your business back — with a clear plan to move forward.</p>
              <ul className="cta-trust">
                <li><Icon name="check" size={16} /> Free audit</li>
                <li><Icon name="shield" size={16} /> Confidential</li>
                <li><Icon name="evidence" size={16} /> Evidence-backed</li>
              </ul>
            </div>
            <div className="button-row">
              <Link className="button button--gold" to="/register">Start Free Audit</Link>
              <Link className="button button--ghost-light" to="/contact">Book a Strategy Call</Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <img src="/logo-horizontal-light.svg" alt="FaultLine AI" />
              <p>Expose what's broken.<br />Build what works.</p>
              <div className="socials">
                <a href="#" aria-label="LinkedIn">in</a>
                <a href="#" aria-label="X">𝕏</a>
                <a href="#" aria-label="YouTube">▶</a>
              </div>
            </div>
            <div>
              <h3>Product</h3>
              <Link to="/product">Features</Link>
              <Link to="/how-it-works">How It Works</Link>
              <Link to="/pricing">Pricing</Link>
              <Link to="/product">Integrations</Link>
              <Link to="/product">Roadmap</Link>
            </div>
            <div>
              <h3>Solutions</h3>
              <Link to="/solutions">Website Intelligence</Link>
              <Link to="/solutions">Operational Audit</Link>
              <Link to="/solutions">Revenue Leak Detection</Link>
              <Link to="/solutions">AI Readiness</Link>
              <Link to="/solutions">Repair Plans</Link>
            </div>
            <div>
              <h3>Resources</h3>
              <Link to="/resources">Case Studies</Link>
              <Link to="/resources">Guides & Templates</Link>
              <Link to="/resources">Blog</Link>
              <Link to="/resources">Webinars</Link>
              <Link to="/contact">Help Center</Link>
            </div>
            <div>
              <h3>Company</h3>
              <Link to="/about">About Us</Link>
              <Link to="/about">Careers</Link>
              <Link to="/about">Partners</Link>
              <Link to="/security">Trust Center</Link>
              <Link to="/contact">Contact</Link>
            </div>
            <div className="newsletter">
              <h3>Newsletter</h3>
              <p>Insights to help you fix, build, and grow your business.</p>
              <form onSubmit={(e) => e.preventDefault()}>
                <input aria-label="Email" placeholder="Enter your email" />
                <button type="submit" aria-label="Subscribe"><Icon name="arrow-right" size={18} /></button>
              </form>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 FaultLine AI. All rights reserved.</span>
            <nav>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Cookie Policy</a>
              <a href="#">Acceptable Use</a>
            </nav>
            <span className="compliance"><Icon name="shield" size={20} /> SOC 2 Aligned</span>
          </div>
        </div>
      </footer>
    </div>
  );
}