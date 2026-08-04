import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import DeliverablePreview from '@/components/fl/DeliverablePreview';
import Icon from '@/components/fl/Icon';
import { submitFaultLineForm } from '@/lib/faultlineForms';
import { useAuth } from '@/lib/AuthContext';
import '@/components/fl/approved-homepage.css';

const navGroups = [
  { label: 'Solutions', links: [
    { label: 'Website Intelligence', to: '/solutions' },
    { label: 'Operational Audit', to: '/solutions' },
    { label: 'Revenue Leak Detection', to: '/solutions' },
    { label: 'AI Readiness', to: '/solutions' },
  ]},
  { label: 'Industries', links: [
    { label: 'Construction', to: '/industries' },
    { label: 'Manufacturing', to: '/industries' },
    { label: 'Distribution', to: '/industries' },
    { label: 'Professional Services', to: '/industries' },
  ]},
  { label: 'Resources', links: [
    { label: 'Sample Reports', to: '/resources' },
    { label: 'How It Works', to: '/how-it-works' },
    { label: 'Pricing', to: '/pricing' },
    { label: 'Trust Center', to: '/security' },
  ]},
];

const problems = [
  ['lead', 'Missed Leads', 'Prospects slip through the cracks every day.'],
  ['website', 'Weak Websites', 'Low trust, poor UX, and lost conversions.'],
  ['workflow', 'Broken Workflows', 'Disconnected handoffs slow everything down.'],
  ['pricing', 'Pricing Leaks', 'Profit disappears in estimates and proposals.'],
  ['clock', 'Slow Approvals', 'Bottlenecks delay projects and payments.'],
  ['invoice', 'Unbilled Work', 'Services delivered but never invoiced.'],
  ['tools', 'Redundant Tools', 'Too many systems, no real integration.'],
  ['ai', 'AI Unprepared', 'Automating chaos creates faster chaos.'],
];

const platform = [
  ['website', 'Website Intelligence'], ['audit', 'Operational Audit'], ['map', 'System Mapping'], ['revenue', 'Revenue Leak Detection'], ['risk', 'Risk Register'],
  ['readiness', 'AI Readiness'], ['roadmap', 'Repair Roadmap'], ['builder', 'Business Builder'], ['outreach', 'Outreach Assistance'], ['monitor', 'Continuous Monitoring'],
];

const steps = [
  ['search', 'Connect & Discover', 'We gather data from your website, systems, and public sources.'],
  ['monitor', 'Analyze & Diagnose', 'AI agents and experts identify failures, gaps, and opportunities.'],
  ['readiness', 'Quantify & Prioritize', 'We calculate impact, score risk, and rank what matters most.'],
  ['roadmap', 'Repair & Improve', 'Get a clear 30/60/90-day plan to fix issues and recover value.'],
  ['revenue', 'Monitor & Scale', 'We track progress, detect new issues, and support your growth.'],
];

const deliverables = [
  ['summary', 'Executive Summary', 'A high-level view of health, risks, and top opportunities.'],
  ['map', 'Failure Map', 'Visual breakdown of where operations are breaking.'],
  ['leaks', 'Revenue Leak Report', 'Detailed analysis of lost revenue and hidden costs.'],
  ['risk', 'Risk Register', 'Top risks, probability, impact, and recommended actions.'],
  ['readiness', 'AI Readiness Score', 'Your readiness to automate and scale with confidence.'],
  ['plan', '90-Day Repair Plan', 'Prioritized actions with owners, effort, and timeline.'],
];

const industries = [
  ['construction', 'Construction'], ['contractor', 'Contractors'], ['manufacturing', 'Manufacturing'], ['distribution', 'Distribution'],
  ['locations', 'Multi-Location Services'], ['agency', 'Agencies & Consultants'], ['professional', 'Professional Services'], ['more', 'And More'],
];

const plans = [
  { name: 'Diagnostic', audience: 'Perfect for getting started.', price: '$0', cadence: 'Free Audit', features: ['Limited audit scope', 'Top issue summary', 'Sample report', 'No credit card required'], cta: 'Start Free Audit' },
  { name: 'Growth', audience: 'For businesses ready to improve.', price: '$299', suffix: '/mo', cadence: 'Billed monthly', features: ['Full business audit', 'Repair roadmap', 'Quarterly monitoring', 'Email support'], cta: 'Start Growth Plan' },
  { name: 'Operating System', audience: 'For businesses ready to scale.', price: '$699', suffix: '/mo', cadence: 'Billed monthly', features: ['Continuous monitoring', 'Advanced reporting', 'AI readiness tracking', 'Priority support'], cta: 'Start OS Plan', featured: true },
  { name: 'Enterprise', audience: 'For organizations with complex needs.', price: 'Custom', cadence: "Let's build the right solution.", features: ['Custom integrations', 'Multi-location management', 'Dedicated support', 'SLA & security review'], cta: 'Talk to Sales' },
];

function FooterColumn({ title, links }) {
  return <div><h3>{title}</h3>{links.map(link => <a href="#" key={link}>{link}</a>)}</div>;
}

export default function Home() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [modal, setModal] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('Diagnostic');
  const [notice, setNotice] = useState('');
  const [scanUrl, setScanUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const dialogRef = useRef(null);

  useEffect(() => {
    const closeMenus = () => { setMenuOpen(false); setActiveDropdown(null); };
    window.addEventListener('resize', closeMenus);
    return () => window.removeEventListener('resize', closeMenus);
  }, []);

  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement;
    const onKey = (event) => event.key === 'Escape' && setModal(null);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => dialogRef.current?.querySelector('input,button')?.focus());
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus();
    };
  }, [modal]);

  function openAudit(plan = 'Diagnostic') {
    setSelectedPlan(plan);
    setNotice('');
    setModal('audit');
  }

  async function runPublicScan() {
    if (!scanUrl.trim()) return;
    setScanning(true);
    setScanError('');
    setScanResult(null);
    try {
      const res = await fetch('/api/base44/functions/publicScan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scanUrl.trim() })
      });
      const data = await res.json();
      if (data.error) { setScanError(data.error); }
      else { setScanResult(data); }
    } catch (e) {
      setScanError('Could not scan this URL. Please check it and try again.');
    } finally {
      setScanning(false);
    }
  }

  async function handleSubmit(event, kind) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      await submitFaultLineForm(kind, payload);
      setNotice(kind === 'newsletter' ? 'You are subscribed.' : 'Thank you. Your request has been received.');
      event.currentTarget.reset();
      if (kind !== 'newsletter') setTimeout(() => setModal(null), 1100);
    } catch {
      setNotice('Something went wrong. Please try again.');
    }
  }

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="site-header">
        <div className="page-wrap header-inner">
          <a className="brand" href="#top" aria-label="FaultLine AI home"><img src="/logo-horizontal.svg" alt="FaultLine AI" /></a>
          <button className="menu-button" type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}><span /><span /><span /></button>
          <nav className={`primary-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Primary navigation">
            <Link to="/product">Product</Link>
            {navGroups.map(group => (
              <div className="nav-group" key={group.label} onMouseLeave={() => setActiveDropdown(null)}>
                <button type="button" aria-expanded={activeDropdown === group.label} onClick={() => setActiveDropdown(activeDropdown === group.label ? null : group.label)}>{group.label}<span className="chevron" aria-hidden="true">⌄</span></button>
                <div className={`nav-dropdown ${activeDropdown === group.label ? 'is-open' : ''}`}>
                  {group.links.map(link => <Link key={link.label} to={link.to} onClick={() => { setActiveDropdown(null); setMenuOpen(false); }}>{link.label}</Link>)}
                </div>
              </div>
            ))}
            <Link to="/how-it-works">How It Works</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/app/xv">Visualizer</Link>
          </nav>
          <div className="header-actions">{user ? <><Link to="/app/xv" style={{ fontWeight: 600 }}>Visualizer</Link><Link to="/app" className="button button--dark button--small">Launch App <Icon name="arrow-right" /></Link></> : <><Link to="/login">Sign In</Link><button className="button button--dark button--small" type="button" onClick={() => openAudit()}>Start Free Audit <Icon name="arrow-right" /></button></>}</div>
        </div>
      </header>

      <main id="main">
        <section className="hero" id="top">
          <div className="page-wrap hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">AI-powered business intelligence</p>
              <h1>Expose What's Broken.<br /><span>Build What Works.</span></h1>
              <p className="hero-lead">FaultLine AI uncovers hidden failures, revenue leaks, and operational risks across your website, systems, and workflows, then delivers an evidence-backed plan to fix them.</p>
              <div className="scan-box" style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e1da', boxShadow: '0 8px 30px #0000000a', marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#8A641C', textTransform: 'uppercase', letterSpacing: '.12em', margin: '0 0 8px' }}>⚡ Free 60-Second Scan</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={scanUrl}
                    onChange={e => setScanUrl(e.target.value)}
                    placeholder="Enter your website URL (e.g., mycompany.com)"
                    style={{ flex: 1, padding: '12px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }}
                    onKeyDown={e => e.key === 'Enter' && runPublicScan()}
                  />
                  <button
                    type="button"
                    onClick={runPublicScan}
                    disabled={scanning}
                    style={{ padding: '12px 20px', borderRadius: 6, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: scanning ? 'wait' : 'pointer', background: scanning ? '#ccc' : '#0b0b0b', color: '#fff', border: 0, whiteSpace: 'nowrap' }}
                  >
                    {scanning ? '⏳ Scanning…' : 'Scan My Site'}
                  </button>
                </div>
                {scanError && <p style={{ color: '#a52d23', fontSize: 12, marginTop: 8 }}>{scanError}</p>}
                {scanResult && (
                  <div style={{ marginTop: 14, borderTop: '1px solid #eee', paddingTop: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                      <div style={{ width: 64, height: 64, borderRadius: '50%', border: `6px solid ${scanResult.health_score >= 80 ? '#237A4B' : scanResult.health_score >= 60 ? '#d9b46f' : '#C63D34'}`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <b style={{ font: '400 22px Libre Caslon Display, serif' }}>{scanResult.health_score}</b>
                      </div>
                      <div>
                        <b style={{ fontSize: 15 }}>{scanResult.headline}</b>
                        <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>Estimated revenue leak: <b style={{ color: '#C63D34' }}>${scanResult.revenue_leak_estimate?.min?.toLocaleString()}–${scanResult.revenue_leak_estimate?.max?.toLocaleString()}/yr</b></p>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {scanResult.findings?.map((f, i) => (
                        <div key={i} style={{ padding: '10px 12px', background: '#f8f7f4', borderRadius: 6, border: '1px solid #e5e1da' }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                            <span className={`pill ${f.severity}`} style={{ fontWeight: 700, textTransform: 'uppercase' }}>{f.severity}</span>
                            <b style={{ fontSize: 13 }}>{f.title}</b>
                          </div>
                          <p style={{ fontSize: 12, color: '#555', margin: 0, lineHeight: 1.4 }}>{f.description}</p>
                          <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}><b>Impact:</b> {f.impact}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button type="button" className="button button--gold" onClick={() => setModal('call')} style={{ fontSize: 14 }}>Book Strategy Call <Icon name="arrow-right" /></button>
                      <button type="button" className="button button--dark-outline" onClick={() => setModal('audit')} style={{ fontSize: 14 }}>Get Full Audit</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="button-row"><button className="button button--dark" type="button" onClick={() => openAudit()}>Start Free Audit <Icon name="arrow-right" /></button><button className="button button--light" type="button" onClick={() => setModal('call')}>Book a Strategy Call <Icon name="arrow-right" /></button></div>
              <ul className="hero-trust"><li><Icon name="invoice" />No credit card required</li><li><Icon name="shield" />Confidential analysis</li><li><Icon name="evidence" />Evidence-backed recommendations</li></ul>
            </div>
            <div className="hero-art" role="img" aria-label="Fractured business systems becoming a connected intelligent network"><img src="/hero-approved.webp" alt="" /></div>
          </div>
        </section>

        <section className="trusted section-line"><div className="page-wrap"><p>Trusted by growing businesses across industries</p><div className="logo-row"><div><b>◇</b><span>PIVOT EAST<small>CONSTRUCTION</small></span></div><div><b>⬡</b><span>NEXORA<small>MANUFACTURING</small></span></div><div><b>▽</b><span>VERIDIAN<small>DISTRIBUTION</small></span></div><div><b>⬢</b><span>ALTIVY<small>SOLUTIONS</small></span></div><div><b>⌁</b><span>LUMENIX<small>SERVICES</small></span></div></div></div></section>

        <section className="content-section section-line" id="platform"><div className="page-wrap split-layout"><div className="section-intro"><p className="eyebrow">The problem</p><h2>Most Businesses Lose More Than They Realize</h2><p>Hidden failures and inefficiencies silently drain revenue, limit growth, and create unnecessary risk — every day they go unfixed.</p></div><div className="problem-grid">{problems.map(([icon, title, copy]) => <div className="problem-item" key={title}><Icon name={icon} /><div><h3>{title}</h3><p>{copy}</p></div></div>)}</div></div></section>

        <section className="content-section section-line"><div className="page-wrap split-layout"><div className="section-intro"><p className="eyebrow">The platform</p><h2>Everything You Need to Fix, Build, and Scale</h2><p>Complete visibility and guidance to run a stronger business — from diagnosis to repair to continuous monitoring.</p></div><div className="platform-grid">{platform.map(([icon, title]) => <div className="platform-item" key={title}><Icon name={icon} /><strong>{title}</strong></div>)}</div></div></section>

        <section className="content-section process section-line" id="how-it-works"><div className="page-wrap"><div className="center-heading"><p className="eyebrow">How it works</p><h2>A Simple Process. Real Results.</h2></div><div className="steps">{steps.map(([icon, title, copy], i) => <div className="step" key={title}><div className="step-icon"><Icon name={icon} /></div><span>STEP {String(i + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{copy}</p></div>)}</div></div></section>

        <section className="content-section deliverables section-line" id="deliverables"><div className="page-wrap"><div className="center-heading"><p className="eyebrow">Sample deliverables</p><h2>Clear Reports. Actionable Insight.</h2></div><div className="deliverable-grid">{deliverables.map(([type, title, copy]) => <article className="deliverable-card" key={title}><DeliverablePreview type={type} /><h3>{title}</h3><p>{copy}</p></article>)}</div><div className="center-action"><button type="button" className="outline-link" onClick={() => setModal('report')}>View Full Sample Report <Icon name="arrow-right" /></button></div></div></section>

        <section className="content-section industries section-line" id="industries"><div className="page-wrap"><div className="center-heading"><p className="eyebrow">Industries we serve</p><h2>Built for Businesses That Build</h2></div><div className="industry-grid">{industries.map(([icon, title]) => <a href="#pricing" className="industry-item" key={title}><Icon name={icon} /><strong>{title}</strong></a>)}</div></div></section>

        <section className="content-section pricing section-line" id="pricing"><div className="page-wrap"><div className="center-heading"><p className="eyebrow">Pricing</p><h2>Choose the Right Plan for Your Business</h2></div><div className="pricing-grid">{plans.map(plan => <article className={`pricing-card ${plan.featured ? 'is-featured' : ''}`} key={plan.name}>{plan.featured && <div className="popular">Most Popular</div>}<h3>{plan.name}</h3><p>{plan.audience}</p><div className="price">{plan.price}{plan.suffix && <small>{plan.suffix}</small>}</div><div className="cadence">{plan.cadence}</div><ul>{plan.features.map(feature => <li key={feature}><Icon name="check" />{feature}</li>)}</ul><button type="button" className={`button ${plan.featured ? 'button--gold' : plan.name === 'Enterprise' ? 'button--light' : 'button--dark'}`} onClick={() => plan.name === 'Enterprise' ? setModal('call') : openAudit(plan.name)}>{plan.cta}<Icon name="arrow-right" /></button></article>)}</div><p className="plan-note">All plans include a 14-day satisfaction guarantee. Cancel anytime.</p></div></section>

        <section className="content-section section-line" id="visualizer"><div className="page-wrap"><div className="center-heading"><p className="eyebrow">Xtreme Visualizer</p><h2>Visualize Floors. Win More Quotes.</h2><p>Upload room photos, apply custom finish and coating profiles, generate photorealistic visual mockups, calculate material volumes and costs, and create client quotes tracked in your XV CRM pipeline.</p></div><div className="center-action"><Link to="/app/xv" className="button button--gold">Launch Xtreme Visualizer <Icon name="arrow-right" /></Link></div></div></section>

        <section className="closing-cta"><div className="page-wrap closing-grid"><div><h2>Stop Guessing. Start Fixing.<br /><span>Build a Stronger Business.</span></h2><p>Get your free audit and discover what's holding your business back, and how to fix it.</p></div><div><div className="button-row"><button type="button" className="button button--gold" onClick={() => openAudit()}>Start Free Audit <Icon name="arrow-right" /></button><button type="button" className="button button--dark-outline" onClick={() => setModal('call')}>Book a Strategy Call <Icon name="arrow-right" /></button></div><ul><li><Icon name="invoice" />No credit card</li><li><Icon name="shield" />Confidential</li><li><Icon name="evidence" />Evidence-backed</li></ul></div></div></section>
      </main>

      <footer className="site-footer" id="footer"><div className="page-wrap footer-grid"><div className="footer-brand"><img src="/logo-horizontal-light.svg" alt="FaultLine AI" /><p>Expose what's broken.<br />Build what works.</p><div className="socials"><a href="#" aria-label="LinkedIn">in</a><a href="#" aria-label="Instagram">◎</a><a href="#" aria-label="YouTube">▶</a></div></div><FooterColumn title="Product" links={['Features', 'How It Works', 'Pricing', 'Integrations', 'Roadmap']} /><FooterColumn title="Solutions" links={['Website Intelligence', 'Operational Audit', 'Revenue Leak Detection', 'AI Readiness', 'Repair Plans']} /><FooterColumn title="Resources" links={['Case Studies', 'Guides & Templates', 'Blog', 'Webinars', 'Help Center']} /><FooterColumn title="Company" links={['About Us', 'Careers', 'Partners', 'Contact', 'Trust Center']} /><div className="newsletter"><h3>Newsletter</h3><p>Insights to help you fix, build, and grow your business.</p><form onSubmit={e => handleSubmit(e, 'newsletter')}><label className="sr-only" htmlFor="newsletter-email">Email address</label><input id="newsletter-email" name="email" type="email" placeholder="Enter your email" required /><button aria-label="Subscribe"><Icon name="arrow-right" /></button></form>{notice === 'You are subscribed.' && <small className="form-notice">{notice}</small>}</div></div><div className="page-wrap footer-bottom"><span>© 2026 FaultLine AI. All rights reserved.</span><nav><a href="#">Privacy Policy</a><a href="#">Terms of Service</a><a href="#">Cookie Policy</a><a href="#">Acceptable Use</a></nav><span className="compliance"><Icon name="shield" />SOC 2<br />Type II Compliant</span></div></footer>

      {modal && <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && setModal(null)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={dialogRef}><button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Close dialog">×</button>{modal === 'audit' && <><p className="eyebrow">Free business audit</p><h2 id="modal-title">Start Your {selectedPlan} Audit</h2><p>Tell us where to begin. No credit card is required.</p><form className="lead-form" onSubmit={e => handleSubmit(e, 'audit_lead')}><input type="hidden" name="plan" value={selectedPlan} /><label>Full name<input name="name" required autoComplete="name" /></label><label>Work email<input name="email" type="email" required autoComplete="email" /></label><label>Company<input name="company" required autoComplete="organization" /></label><label>Website<input name="website" type="url" placeholder="https://" required /></label><label>Primary concern<select name="concern" defaultValue="website"><option value="website">Website performance</option><option value="revenue">Revenue leaks</option><option value="workflow">Broken workflows</option><option value="ai">AI readiness</option></select></label><button className="button button--gold" type="submit">Request Free Audit <Icon name="arrow-right" /></button></form></>}{modal === 'call' && <><p className="eyebrow">Free strategy call</p><h2 id="modal-title">Book a Strategy Call</h2><p>Share your goals and preferred time. We'll follow up to confirm.</p><form className="lead-form" onSubmit={e => handleSubmit(e, 'strategy_call')}><label>Full name<input name="name" required autoComplete="name" /></label><label>Work email<input name="email" type="email" required autoComplete="email" /></label><label>Company<input name="company" required autoComplete="organization" /></label><label>Phone<input name="phone" type="tel" autoComplete="tel" /></label><label>Preferred date<input name="preferred_date" type="date" required /></label><button className="button button--gold" type="submit">Request Call <Icon name="arrow-right" /></button></form></>}{modal === 'report' && <><p className="eyebrow">Sample deliverable</p><h2 id="modal-title">FaultLine AI Sample Report</h2><div className="sample-report"><div><strong>Business Health</strong><span>62/100</span></div><div><strong>Annual Revenue at Risk</strong><span>$2.47M</span></div><div><strong>Critical Failures</strong><span>14</span></div><div><strong>90-Day Repair Actions</strong><span>12</span></div></div><p>Every production report connects findings to evidence, confidence, impact, ownership, and the next recommended action.</p><button className="button button--gold" type="button" onClick={() => { setModal(null); openAudit(); }}>Get My Free Report <Icon name="arrow-right" /></button></>}{notice && notice !== 'You are subscribed.' && <div className="form-notice">{notice}</div>}</div></div>}
    </div>
  );
}