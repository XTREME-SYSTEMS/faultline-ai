import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BRAND } from '@/lib/brandIdentity';
import { publicNav, problems, capabilities, steps } from '@/components/fl/data';
import { submitFaultLineForm } from '@/lib/faultlineForms';
import {
  Search, Globe, Workflow, DollarSign, Unplug, Bot,
  ClipboardCheck, Network, TrendingDown, ShieldAlert, Cpu, Map,
  Building2, Mail, Users, FileText, Activity, Wrench, BarChart3, Link2,
  Check, Menu, X, ArrowRight,
} from 'lucide-react';
import '@/components/fl/faultline-homepage.css';

const PROBLEM_ICONS = [Search, Globe, Workflow, DollarSign, Unplug, Bot];
const CAPABILITY_ICONS = [Globe, ClipboardCheck, Network, TrendingDown, ShieldAlert, Cpu, Map, Building2, Mail, Users, FileText, Activity];
const STEP_ICONS = [Link2, Search, BarChart3, Wrench, Activity];

const PLANS = [
  { name: 'Free Scan', desc: 'Start with a focused diagnostic.', price: '$0', features: ['Initial surface scan', 'Top 3 findings', 'No credit card', 'Private workspace'], cta: 'Start Free', featured: false },
  { name: 'Diagnostic', desc: 'Paid diagnostic with evidence.', price: '$299', suffix: '/mo', features: ['Full audit scope', 'Evidence timeline', 'Revenue leak model', 'Repair roadmap', 'Email support'], cta: 'Start Diagnostic', featured: true },
  { name: 'Operations', desc: 'Full operational audit + repair.', price: '$699', suffix: '/mo', features: ['Everything in Diagnostic', 'Continuous monitoring', 'System mapping', 'Approval gates', 'Priority support'], cta: 'Start Operations', featured: false },
  { name: 'Enterprise', desc: 'Governance for multi-location.', price: 'Custom', features: ['Multi-org governance', 'Custom integrations', 'Dedicated support', 'SLA & security review', 'Audit logs'], cta: 'Talk to Sales', featured: false },
];

const INDUSTRIES = [
  { icon: Building2, label: 'Construction' },
  { icon: Cpu, label: 'Manufacturing' },
  { icon: Network, label: 'Distribution' },
  { icon: Globe, label: 'Multi-location' },
  { icon: Users, label: 'Agencies' },
  { icon: FileText, label: 'Professional' },
  { icon: ShieldAlert, label: 'Compliance' },
  { icon: Activity, label: 'Operations' },
];

const DELIVERABLES = [
  { metric: '100/100', label: 'Convergence Score', dark: true },
  { metric: '99%', label: 'Route Parity', dark: false },
  { metric: '0', label: 'Critical Defects', dark: true },
  { metric: '12', label: 'Workflows Repaired', dark: false },
  { metric: '$340K', label: 'Revenue Recovered', dark: true },
  { metric: '5min', label: 'Monitor Cadence', dark: false },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState('');

  async function handleNewsletter(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await submitFaultLineForm('newsletter', Object.fromEntries(form.entries()));
      setNotice('You are subscribed.');
      e.currentTarget.reset();
    } catch {
      setNotice('Something went wrong. Please try again.');
    }
  }

  return (
    <div className="faultline-homepage">
      {/* Header */}
      <header className="site-header">
        <div className="wrap header-row">
          <Link to="/" className="brand">
            <img src={BRAND.logoLight} alt={BRAND.name} />
          </Link>
          <nav className={`nav ${menuOpen ? 'open' : ''}`}>
            {publicNav.map(([label, path]) => (
              <Link key={path} to={path} onClick={() => setMenuOpen(false)}>{label}</Link>
            ))}
          </nav>
          <div className="header-actions">
            <Link to="/login">Sign in</Link>
            <Link to="/checkout" className="fl-button dark" style={{ padding: '12px 20px' }}>Start free audit</Link>
            <button className="menu" onClick={() => setMenuOpen(v => !v)} aria-label="Toggle menu">
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">FAULTLINE AI</p>
            <h1>Expose What's <span>Broken.</span><br />Build What Works.</h1>
            <p className="lead">The AI-driven diagnostic and operations platform that finds business inefficiencies, repairs fragmented workflows, and builds seamless, high-performance operating networks — with evidence before action.</p>
            <div className="hero-actions">
              <Link to="/checkout" className="fl-button dark">Start free audit</Link>
              <Link to="/consultation" className="fl-button outline">Book a strategy call</Link>
            </div>
            <div className="trust-row">
              <span><b>✓</b> Evidence-first</span>
              <span><b>✓</b> Human-approved</span>
              <span><b>✓</b> Private by design</span>
            </div>
          </div>
          <div className="hero-art">
            <img src="https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/06b87bf6c_generated_image.png" alt="Polished concrete operations floor" />
            <div className="hero-tag dark tag1">Revenue leak found</div>
            <div className="hero-tag tag2">12 broken workflows</div>
            <div className="hero-tag dark tag3">3 critical defects</div>
            <div className="hero-tag tag4">99% parity</div>
            <div className="hero-tag dark tag5">100/100 score</div>
            <div className="hero-tag tag6">5-min monitor</div>
          </div>
        </div>
      </section>

      {/* Logo strip */}
      <div className="logo-strip">
        <div className="wrap">
          <small>Built for operationally complex businesses</small>
          <div className="logos">
            <strong>CONSTRUCTION</strong>
            <strong>MANUFACTURING</strong>
            <strong>DISTRIBUTION</strong>
            <strong>AGENCIES</strong>
            <strong>SERVICES</strong>
          </div>
        </div>
      </div>

      {/* Problems section */}
      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">The problem</p>
            <h2>Every business has <span style={{ color: 'var(--fl-gold)' }}>fault lines</span>.</h2>
            <p>Most inefficiencies hide between teams, tools, and handoffs — invisible until they cost you leads, margin, or customers.</p>
          </div>
          <div className="problem-layout">
            <div>
              <p style={{ fontSize: 15, color: 'var(--fl-muted)', lineHeight: 1.7 }}>FaultLine AI surfaces the cracks that matter most — the missed leads, broken workflows, and pricing leakage that quietly drain your business every day.</p>
            </div>
            <div className="problem-grid">
              {problems.map(([title, desc], i) => {
                const Icon = PROBLEM_ICONS[i] || Search;
                return (
                  <div className="problem-card" key={title}>
                    <Icon size={28} style={{ color: 'var(--fl-gold)', flexShrink: 0 }} />
                    <div>
                      <h3>{title}</h3>
                      <p>{desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Platform / Capabilities */}
      <section className="section soft">
        <div className="wrap">
          <div className="section-head center">
            <p className="eyebrow">The platform</p>
            <h2>One operating system. <span style={{ color: 'var(--fl-gold)' }}>Every tool.</span></h2>
            <p>Diagnose, quantify, repair, and monitor — all in one private, evidence-centered platform.</p>
          </div>
          <div className="platform-grid">
            {capabilities.map((cap, i) => {
              const Icon = CAPABILITY_ICONS[i] || Check;
              return (
                <div className="platform-item" key={cap}>
                  <Icon size={22} style={{ color: 'var(--fl-gold)', flexShrink: 0 }} />
                  <span>{cap}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Process steps */}
      <section className="section">
        <div className="wrap">
          <div className="section-head center">
            <p className="eyebrow">How it works</p>
            <h2>From uncertainty to an <span style={{ color: 'var(--fl-gold)' }}>accountable repair plan</span>.</h2>
            <p>A disciplined cycle: discover, diagnose, quantify, repair, and validate.</p>
          </div>
          <div className="process">
            <div className="steps">
              {steps.map(([num, title, desc], i) => {
                const Icon = STEP_ICONS[i] || Check;
                return (
                  <div className="step" key={num}>
                    <div className="step-icon">
                      <Icon size={28} color="#fff" />
                    </div>
                    <h3>{title}</h3>
                    <p>{desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Deliverables */}
      <section className="section soft">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Deliverables</p>
            <h2>Evidence-backed <span style={{ color: 'var(--fl-gold)' }}>outputs</span>, not consulting theater.</h2>
            <p>Every output is sourced, confidence-scored, and built to turn insight into action.</p>
          </div>
          <div className="deliverables">
            {DELIVERABLES.map(d => (
              <div className="deliverable" key={d.label}>
                <div className={`preview ${d.dark ? '' : 'light'}`}>
                  <div className="metric">{d.metric}</div>
                  <div className="preview-lines">
                    <i style={{ width: '80%' }} />
                    <i style={{ width: '55%' }} />
                    <i style={{ width: '70%' }} />
                  </div>
                </div>
                <h3>{d.label}</h3>
                <p>Measured, validated, and tracked over time.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="section">
        <div className="wrap">
          <div className="section-head center">
            <p className="eyebrow">Industries</p>
            <h2>Designed for <span style={{ color: 'var(--fl-gold)' }}>operationally complex</span> businesses.</h2>
            <p>FaultLine AI begins where handoffs, field operations, estimating, fulfillment, and fragmented systems create expensive blind spots.</p>
          </div>
          <div className="industries">
            {INDUSTRIES.map(ind => (
              <div className="industry" key={ind.label}>
                <ind.icon size={34} style={{ color: 'var(--fl-gold)' }} />
                <strong>{ind.label}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="section soft">
        <div className="wrap">
          <div className="section-head center">
            <p className="eyebrow">Pricing</p>
            <h2>Start with a <span style={{ color: 'var(--fl-gold)' }}>focused diagnostic</span>.</h2>
            <p>Launch with a small defensible engagement and expand only when the evidence supports more work.</p>
          </div>
          <div className="pricing">
            {PLANS.map(plan => (
              <div className={`plan ${plan.featured ? 'featured' : ''}`} key={plan.name}>
                {plan.featured && <em>Most Popular</em>}
                <h3>{plan.name}</h3>
                <p>{plan.desc}</p>
                <div className="price">{plan.price}{plan.suffix && <small style={{ fontSize: 14, color: '#666' }}>{plan.suffix}</small>}</div>
                <ul>
                  {plan.features.map(f => <li key={f}>{f}</li>)}
                </ul>
                <Link to={plan.name === 'Enterprise' ? '/consultation' : '/checkout'} className="fl-button dark" style={{ marginTop: 'auto' }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="closing">
        <div className="wrap closing-row">
          <div>
            <h2>Stop guessing.<br /><span>Start repairing.</span></h2>
            <p>Get a free diagnostic scan. See your top 3 fault lines — no credit card, no commitment.</p>
          </div>
          <div className="closing-actions">
            <Link to="/checkout" className="fl-button gold">Start free audit</Link>
            <Link to="/consultation" className="fl-button outline" style={{ borderColor: '#555', color: '#fff' }}>Book a strategy call</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="wrap footer-grid">
          <div>
            <img className="footer-logo" src={BRAND.logoDark} alt={BRAND.name} />
            <p style={{ marginTop: 16 }}>{BRAND.tagline}</p>
            <p>AI-driven diagnostics, repair, and operations for businesses that can't afford to guess.</p>
          </div>
          <div>
            <h4>Product</h4>
            <Link to="/product">Overview</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/security">Security</Link>
            <Link to="/store">Store</Link>
          </div>
          <div>
            <h4>Solutions</h4>
            <Link to="/solutions">Diagnostics</Link>
            <Link to="/industries">Industries</Link>
            <Link to="/how-it-works">How It Works</Link>
            <Link to="/resources">Resources</Link>
          </div>
          <div>
            <h4>Company</h4>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/consultation">Strategy Call</Link>
            <Link to="/login">Sign In</Link>
          </div>
          <div>
            <h4>Newsletter</h4>
            <p>AI tips & repair insights for operators.</p>
            <form className="newsletter" onSubmit={handleNewsletter}>
              <input name="email" type="email" placeholder="Enter your email" required />
              <button type="submit" aria-label="Subscribe"><ArrowRight size={16} color="#fff" /></button>
            </form>
            {notice && <p style={{ color: 'var(--fl-gold2)' }}>{notice}</p>}
          </div>
        </div>
        <div className="wrap legal">
          <span>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</span>
          <span>{BRAND.domain} · Private by design</span>
        </div>
      </footer>
    </div>
  );
}