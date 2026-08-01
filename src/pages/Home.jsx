import { useState } from 'react';
import { Link } from 'react-router-dom';
import '@/components/fl/faultline-homepage.css';

const A = 'https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633';
const ICONS = {
  'ai-readiness': `${A}/3883d433d_ai-readiness.svg`,
  'analytics': `${A}/c24a35f69_analytics.svg`,
  'audits': `${A}/28e114c34_audits.svg`,
  'business-builder': `${A}/38dcc3399_business-builder.svg`,
  'monitoring': `${A}/0dac5c193_monitoring.svg`,
  'outreach': `${A}/1b3475502_outreach.svg`,
  'projects': `${A}/34036019e_projects.svg`,
  'repair-plans': `${A}/93b318c92_repair-plans.svg`,
  'reports': `${A}/b3c4b6770_reports.svg`,
  'revenue-leaks': `${A}/f1d567de0_revenue-leaks.svg`,
  'risk-register': `${A}/b21753da1_risk-register.svg`,
  'search': `${A}/e79ddbd0b_search.svg`,
  'security': `${A}/29d05d2ac_security.svg`,
  'system-map': `${A}/bdb4f776b_system-map.svg`,
  'team': `${A}/6ee08dc85_team.svg`,
  'website-intelligence': `${A}/bc2152f9a_website-intelligence.svg`
};

const PROBLEMS = [
  ['Missed Leads', 'outreach'],
  ['Weak Websites', 'website-intelligence'],
  ['Broken Workflows', 'system-map'],
  ['Pricing Leaks', 'revenue-leaks'],
  ['Slow Approvals', 'audits'],
  ['Unbilled Work', 'reports'],
  ['Redundant Tools', 'projects'],
  ['AI Unprepared', 'ai-readiness']
];

const PLATFORM = [
  ['Website Intelligence', 'website-intelligence'],
  ['Operational Audit', 'audits'],
  ['System Mapping', 'system-map'],
  ['Revenue Leak Detection', 'revenue-leaks'],
  ['Risk Register', 'risk-register'],
  ['AI Readiness', 'ai-readiness'],
  ['Repair Roadmap', 'repair-plans'],
  ['Business Builder', 'business-builder'],
  ['Outreach Assistance', 'outreach'],
  ['Continuous Monitoring', 'monitoring']
];

const STEPS = [
  ['Connect & Discover', 'search'],
  ['Analyze & Diagnose', 'analytics'],
  ['Quantify & Prioritize', 'revenue-leaks'],
  ['Repair & Improve', 'repair-plans'],
  ['Monitor & Scale', 'monitoring']
];

const DELIVERABLES = ['Executive Summary', 'Failure Map', 'Revenue Leak Report', 'Risk Register', 'AI Readiness Score', '90-Day Repair Plan'];
const INDUSTRIES = ['Construction', 'Contractors', 'Manufacturing', 'Distribution', 'Multi-Location Services', 'Agencies & Consultants', 'Professional Services', 'And More'];
const PLANS = [['Diagnostic', '$0'], ['Growth', '$299/mo'], ['Operating System', '$699/mo'], ['Enterprise', 'Custom']];

export default function Home() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="faultline-homepage">
      <header className="site-header">
        <div className="wrap header-row">
          <Link className="brand" to="/"><img src={`${A}/e3b8ba1d2_logo-horizontal.svg`} alt="FaultLine AI" /></Link>
          <nav className={navOpen ? 'nav open' : 'nav'}>
            <Link to="/product" onClick={() => setNavOpen(false)}>Product</Link>
            <Link to="/solutions" onClick={() => setNavOpen(false)}>Solutions</Link>
            <Link to="/industries" onClick={() => setNavOpen(false)}>Industries</Link>
            <Link to="/how-it-works" onClick={() => setNavOpen(false)}>How It Works</Link>
            <Link to="/pricing" onClick={() => setNavOpen(false)}>Pricing</Link>
            <Link to="/resources" onClick={() => setNavOpen(false)}>Resources</Link>
          </nav>
          <div className="header-actions">
            <Link to="/login">Sign In</Link>
            <Link className="fl-button dark" to="/register">Start Free Audit</Link>
            <button className="menu" onClick={() => setNavOpen(!navOpen)}>☰</button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">AI-Powered Business Intelligence</p>
              <h1>Expose What's Broken.<br /><span>Build What Works.</span></h1>
              <p className="lead">FaultLine AI uncovers hidden failures, revenue leaks, and operational risks across your website, systems, and workflows, then delivers an evidence-backed plan to fix them.</p>
              <div className="hero-actions">
                <Link className="fl-button dark" to="/register">Start Free Audit</Link>
                <Link className="fl-button outline" to="/contact">Book a Strategy Call</Link>
              </div>
              <div className="trust-row">
                <span><b>▣</b>No credit card required</span>
                <span><b>◇</b>Confidential analysis</span>
                <span><b>⌘</b>Evidence-backed recommendations</span>
              </div>
            </div>
            <div className="hero-art">
              <img src={`${A}/e7dffd655_hero-fracture-network.jpg`} alt="Fractured systems becoming connected" />
              <span className="hero-tag tag1">Disconnected Systems</span>
              <span className="hero-tag tag2">Lost Revenue</span>
              <span className="hero-tag tag3">Operational Gaps</span>
              <span className="hero-tag dark tag4">Connected Systems</span>
              <span className="hero-tag dark tag5">Revenue Recovered</span>
              <span className="hero-tag dark tag6">Business Optimized</span>
            </div>
          </div>
        </section>

        <section className="logo-strip">
          <div className="wrap">
            <small>Trusted by growing businesses across industries</small>
            <div className="logos">
              <strong>◇ PIVOT EAST</strong>
              <strong>⬡ NEXORA</strong>
              <strong>◈ VERIDIAN</strong>
              <strong>⬢ ALTIVY</strong>
              <strong>⌁ LUMENIX</strong>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="wrap problem-layout">
            <div className="section-head">
              <p className="eyebrow">The Problem</p>
              <h2>Most Businesses Lose More Than They Realize</h2>
              <p>Hidden failures and inefficiencies silently drain revenue, limit growth, and create unnecessary risk.</p>
            </div>
            <div className="problem-grid">
              {PROBLEMS.map(([label, icon]) => (
                <article className="problem-card" key={label}>
                  <img src={ICONS[icon]} alt="" />
                  <div>
                    <h3>{label}</h3>
                    <p>Evidence-backed analysis and a practical path to repair.</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="platform">
          <div className="wrap platform-layout">
            <div className="section-head">
              <p className="eyebrow">The Platform</p>
              <h2>Everything You Need to Fix, Build, and Scale</h2>
              <p>Complete visibility and guidance to run a stronger business.</p>
            </div>
            <div className="platform-grid">
              {PLATFORM.map(([label, icon]) => (
                <article className="platform-item" key={label}>
                  <img src={ICONS[icon]} alt="" />
                  <strong>{label}</strong>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section process" id="process">
          <div className="wrap">
            <div className="section-head center">
              <p className="eyebrow">How It Works</p>
              <h2>A Simple Process. Real Results.</h2>
            </div>
            <div className="steps">
              {STEPS.map(([label, icon]) => (
                <article className="step" key={label}>
                  <div className="step-icon">
                    <img src={ICONS[icon]} alt="" />
                  </div>
                  <h3>{label}</h3>
                  <p>Clear evidence, accountable actions, and measurable results.</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section soft" id="reports">
          <div className="wrap">
            <div className="section-head center">
              <p className="eyebrow">Sample Deliverables</p>
              <h2>Clear Reports. Actionable Insight.</h2>
            </div>
            <div className="deliverables">
              {DELIVERABLES.map((label, i) => (
                <article className="deliverable" key={label}>
                  <div className={`preview ${i > 1 ? 'light' : ''}`}>
                    <small>FAULTLINE AI</small>
                    <span className="metric">{i === 4 ? '62' : i === 2 ? '$1.82M' : `0${i + 1}`}</span>
                    <div className="preview-lines"><i /><i /><i /></div>
                  </div>
                  <h3>{label}</h3>
                  <p>Evidence, confidence, and next actions.</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="industries">
          <div className="wrap">
            <div className="section-head center">
              <p className="eyebrow">Industries We Serve</p>
              <h2>Built for Businesses That Build</h2>
            </div>
            <div className="industries">
              {INDUSTRIES.map(label => (
                <article className="industry" key={label}>
                  <span>◇</span>
                  <strong>{label}</strong>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section soft" id="pricing">
          <div className="wrap">
            <div className="section-head center">
              <p className="eyebrow">Pricing</p>
              <h2>Choose the Right Plan for Your Business</h2>
            </div>
            <div className="pricing">
              {PLANS.map(([name, price], i) => (
                <article className={`plan ${i === 2 ? 'featured' : ''}`} key={name}>
                  {i === 2 && <em>Most Popular</em>}
                  <h3>{name}</h3>
                  <p>Built for the next stage of your business.</p>
                  <div className="price">{price}</div>
                  <ul>
                    <li>Evidence-backed findings</li>
                    <li>Repair roadmap</li>
                    <li>Customer portal</li>
                  </ul>
                  <Link className={`fl-button ${i === 2 ? 'gold' : 'dark'}`} to="/checkout">Choose Plan</Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="closing">
          <div className="wrap closing-row">
            <div>
              <h2>Stop Guessing. Start Fixing.<br /><span>Build a Stronger Business.</span></h2>
              <p>Get your free audit and discover what is holding your business back.</p>
            </div>
            <div className="closing-actions">
              <Link className="fl-button gold" to="/register">Start Free Audit</Link>
              <Link className="fl-button dark" to="/contact">Book a Strategy Call</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap footer-grid">
          <div>
            <img className="footer-logo" src={`${A}/52739e021_logo-horizontal-light.svg`} alt="FaultLine AI" />
            <p>Expose what's broken.<br />Build what works.</p>
          </div>
          <div>
            <h4>Product</h4>
            <Link to="/product">Features</Link>
            <Link to="/how-it-works">How It Works</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/app/integrations">Integrations</Link>
          </div>
          <div>
            <h4>Solutions</h4>
            <Link to="/app/website-intelligence">Website Intelligence</Link>
            <Link to="/app/audits">Operational Audit</Link>
            <Link to="/app/revenue-leaks">Revenue Leak Detection</Link>
            <Link to="/app/ai-readiness">AI Readiness</Link>
          </div>
          <div>
            <h4>Resources</h4>
            <Link to="/resources">Case Studies</Link>
            <Link to="/resources">Guides & Templates</Link>
            <Link to="/resources">Blog</Link>
            <Link to="/contact">Help Center</Link>
          </div>
          <div>
            <h4>Company</h4>
            <Link to="/about">About Us</Link>
            <Link to="/about">Careers</Link>
            <Link to="/about">Partners</Link>
            <Link to="/security">Trust Center</Link>
          </div>
          <div>
            <h4>Newsletter</h4>
            <p>Insights to help you fix, build, and grow your business.</p>
            <div className="newsletter">
              <input aria-label="Email" placeholder="Enter your email" />
              <button>→</button>
            </div>
          </div>
        </div>
        <div className="wrap legal">
          <span>© 2026 FaultLine AI. All rights reserved.</span>
          <span>Privacy Policy &nbsp;&nbsp; Terms of Service &nbsp;&nbsp; Cookie Policy &nbsp;&nbsp; Acceptable Use</span>
        </div>
      </footer>
    </div>
  );
}