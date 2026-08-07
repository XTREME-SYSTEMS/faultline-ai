import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Image } from '@/components/ui/image';
import Icon from '@/components/fl/Icon';
import { submitFaultLineForm } from '@/lib/faultlineForms';
import { useAuth } from '@/lib/AuthContext';
import {
  Camera, FileText, Users, Mail, Calculator, Palette, Calendar,
  Globe, Sparkles, Layout, TrendingUp, ShieldCheck
} from 'lucide-react';
import '@/components/fl/approved-homepage.css';

const LOGO_LIGHT = 'https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633/ed45981bc_logo-light.png';
const LOGO_DARK = 'https://base44.app/api/apps/6a6e5a0e8a902b5e240d7633/files/mp/public/6a6e5a0e8a902b5e240d7633/a12021ad5_logo-dark.png';

const IMG = {
  showroom: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/74f654c52_generated_image.png',
  beforeAfter: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/2a0fb4607_generated_image.png',
  warehouse: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/06b87bf6c_generated_image.png',
  epoxyCountertop: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/282098d5a_generated_image.png',
  stained: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/5d52dedde_generated_image.png',
  concreteCountertop: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/2c7cb786a_generated_image.png',
  solid: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/615618a3a_generated_image.png',
  flake: 'https://media.base44.com/images/public/6a6e5a0e8a902b5e240d7633/207137c11_generated_image.png',
};

const floorTypes = [
  { name: 'Metallic Epoxy', img: IMG.showroom, desc: 'Showroom-grade metallic pigment floors with mirror depth.' },
  { name: 'Flake Epoxy', img: IMG.flake, desc: 'Decorative vinyl-chip garage & patio systems.' },
  { name: 'Solid Epoxy', img: IMG.solid, desc: 'Seamless solid-color epoxy coatings.' },
  { name: 'Polished Concrete', img: IMG.warehouse, desc: 'High-sheen polished concrete for commercial spaces.' },
  { name: 'Stained Concrete', img: IMG.stained, desc: 'Acid-stained decorative concrete finishes.' },
  { name: 'Epoxy Countertops', img: IMG.epoxyCountertop, desc: 'Metallic epoxy countertop transformations.' },
  { name: 'Concrete Countertops', img: IMG.concreteCountertop, desc: 'Cast polished concrete counters.' },
  { name: 'Garage Floors', img: IMG.beforeAfter, desc: 'Residential garage floor makeovers.' },
];

const aiTools = [
  { icon: Camera, name: 'Floor Visualizer', desc: 'Upload a room photo, apply finishes, generate photoreal mockups in seconds.' },
  { icon: FileText, name: 'Bid Generator', desc: 'AI-built bids and estimates from measurements and finish profiles.' },
  { icon: Sparkles, name: 'Lead Generator', desc: 'AI lead capture and outreach to fill your pipeline.' },
  { icon: Users, name: 'CRM Pipeline', desc: 'Track leads, quotes, and jobs from first contact to close.' },
  { icon: Mail, name: 'Email Templates', desc: 'Pro follow-up and nurture sequences ready to send.' },
  { icon: Calculator, name: 'Pricing Calculator', desc: 'Material volume, cost, and margin calculators.' },
  { icon: Palette, name: 'Color Charts', desc: 'Full epoxy & polished concrete color chart library.' },
  { icon: Calendar, name: 'Appointments', desc: 'Book and manage consultations and installs.' },
];

const services = [
  { icon: Sparkles, title: 'AI Tools Marketplace', desc: 'Buy individual AI tools or the full XV suite — visualizer, bidding, CRM, leads, and more.' },
  { icon: Globe, title: 'Custom Websites', desc: 'Get a high-converting website built for your floor business by Xtreme AI Systems.' },
  { icon: Camera, title: 'Floor Visualizer', desc: 'Win more quotes with photoreal AI floor visualizations.' },
  { icon: TrendingUp, title: 'Lead Generation', desc: 'AI-driven lead generation built for floor contractors.' },
  { icon: Layout, title: 'CRM & Pipeline', desc: 'Manage leads, quotes, and jobs in one place.' },
  { icon: ShieldCheck, title: 'Estimating & Bidding', desc: 'Accurate AI estimates and professional bids in minutes.' },
];

const plans = [
  { name: 'Free', audience: 'Browse the marketplace.', price: '$0', cadence: 'Free Account', features: ['Floor Visualizer trial', 'Browse AI tool catalog', 'XV community access', 'No credit card required'], cta: 'Get Started Free' },
  { name: 'Growth', audience: 'For active floor pros.', price: '$299', suffix: '/mo', cadence: 'Billed monthly', features: ['Full XV AI tool suite', 'Floor Visualizer + Bid Generator', 'CRM + Lead Generator', 'Email support'], cta: 'Start Growth Plan' },
  { name: 'Operating System', audience: 'For scaling contractors.', price: '$699', suffix: '/mo', cadence: 'Billed monthly', features: ['Everything in Growth', 'Custom website built for you', 'Priority support', 'Advanced reporting'], cta: 'Start OS Plan', featured: true },
  { name: 'Enterprise', audience: 'For multi-location firms.', price: 'Custom', cadence: "Let's build the right solution.", features: ['Multi-location management', 'Custom integrations', 'Dedicated support', 'SLA & security review'], cta: 'Talk to Sales' },
];

function FooterColumn({ title, links }) {
  return <div><h3>{title}</h3>{links.map(link => <a href="#" key={link}>{link}</a>)}</div>;
}

export default function Home() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [modal, setModal] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('Free');
  const [notice, setNotice] = useState('');
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

  function openAudit(plan = 'Free') {
    setSelectedPlan(plan);
    setNotice('');
    setModal('audit');
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
          <a className="brand" href="#top" aria-label="Xtreme AI Systems home"><img src={LOGO_DARK} alt="Xtreme AI Systems" style={{ height: 48, width: 'auto' }} /></a>
          <button className="menu-button" type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}><span /><span /><span /></button>
          <nav className={`primary-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Primary navigation">
            <a href="#tools">AI Tools</a>
            <a href="#floors">Floor Gallery</a>
            <a href="#websites">Websites</a>
            <a href="#services">Services</a>
            <Link to="/pricing">Pricing</Link>
          </nav>
          <div className="header-actions">{user ? <><Link to="/app/xv" style={{ fontWeight: 600 }}>Visualizer</Link><Link to="/app" className="button button--dark button--small">Client Portal <Icon name="arrow-right" /></Link></> : <><Link to="/login">Sign In</Link><button className="button button--dark button--small" type="button" onClick={() => setModal('call')}>Get a Website <Icon name="arrow-right" /></button></>}</div>
        </div>
      </header>

      <main id="main">
        {/* 2-tone hero */}
        <section id="top" style={{ background: 'linear-gradient(115deg, #0B0B0D 0%, #0B0B0D 48%, #1A1A1D 48%, #1A1A1D 100%)', padding: '72px 0', borderBottom: '1px solid #2b2b2b' }}>
          <div className="page-wrap" style={{ display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: 56, alignItems: 'center' }}>
            <div style={{ color: '#fff' }}>
              <p className="eyebrow" style={{ color: '#FFD60A', margin: '0 0 14px' }}>AI Tools & Websites for Floor Pros</p>
              <h1 style={{ font: "400 clamp(40px, 5vw, 70px)/1 'Libre Caslon Display', serif", letterSpacing: '-.035em', margin: '0 0 18px' }}>Win More Jobs.<br /><span style={{ color: '#FFD60A' }}>Scale Your Floor Business.</span></h1>
              <p style={{ fontSize: 18, lineHeight: 1.7, color: '#c9c9cc', maxWidth: 540, margin: 0 }}>Xtreme AI Systems is the client portal for students of Xtreme Polishing Systems &amp; Polished Concrete University. Buy AI tools, generate photoreal floor visualizations, and get a custom website built for your business.</p>
              <div className="button-row" style={{ marginTop: 28 }}>
                <Link to="/app/xv" className="button button--gold">Explore AI Tools <Icon name="arrow-right" /></Link>
                <button type="button" className="button button--dark-outline" onClick={() => setModal('call')}>Get a Website <Icon name="arrow-right" /></button>
              </div>
              <ul className="hero-trust" style={{ color: '#9a9a9e', marginTop: 22 }}>
                <li><Icon name="shield" />Built for floor contractors</li>
                <li><Icon name="evidence" />Photoreal visualizer</li>
                <li><Icon name="invoice" />No credit card to start</li>
              </ul>
            </div>
            <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', boxShadow: '0 30px 80px #00000080' }}>
              <Image src={IMG.showroom} alt="Ultra-realistic metallic epoxy showroom floor" fittingType="fill" className="block w-full" style={{ height: 460 }} />
              <div style={{ position: 'absolute', left: 18, bottom: 18, background: 'rgba(11,11,13,.82)', color: '#fff', padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, backdropFilter: 'blur(6px)' }}>
                <span style={{ color: '#FFD60A' }}>●</span> Metallic epoxy showroom floor
              </div>
            </div>
          </div>
        </section>

        {/* Floor types gallery */}
        <section className="content-section section-line" id="floors" style={{ background: '#FFFFFF' }}>
          <div className="page-wrap">
            <div className="center-heading">
              <p className="eyebrow">Ultra-lifelike floor library</p>
              <h2>Every Finish. Photoreal.</h2>
              <p style={{ color: '#666', maxWidth: 640, margin: '8px auto 0' }}>AI-generated showroom imagery for every coating and concrete system you install — use them in your visualizer, bids, and website.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginTop: 36 }}>
              {floorTypes.map(f => (
                <article key={f.name} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <Image src={f.img} alt={f.name} fittingType="fill" className="block w-full" style={{ height: 200 }} />
                  <div style={{ padding: '16px 18px' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{f.name}</h3>
                    <p style={{ margin: 0, fontSize: 13, color: '#777', lineHeight: 1.5 }}>{f.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Before / after */}
        <section className="content-section section-line" style={{ background: '#0B0B0D', color: '#fff' }}>
          <div className="page-wrap" style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 56, alignItems: 'center' }}>
            <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 60px #00000099' }}>
              <Image src={IMG.beforeAfter} alt="Garage floor before and after flake epoxy" fittingType="fill" className="block w-full" style={{ height: 420 }} />
              <div style={{ position: 'absolute', left: 16, top: 16, background: '#C63D34', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>BEFORE</div>
              <div style={{ position: 'absolute', right: 16, top: 16, background: '#237A4B', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>AFTER</div>
            </div>
            <div>
              <p className="eyebrow" style={{ color: '#FFD60A' }}>Before &amp; after</p>
              <h2 style={{ font: "400 clamp(34px, 3.5vw, 52px)/1.05 'Libre Caslon Display', serif", margin: '0 0 16px' }}>Show Clients the Transformation.</h2>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: '#bbb' }}>Use the Xtreme Visualizer to turn a drab, cracked slab into a flawless flake-epoxy showpiece — then drop the before/after straight into your bid or website. Clients buy the outcome when they can see it.</p>
              <div style={{ marginTop: 26 }}>
                <Link to="/app/xv" className="button button--gold">Try the Visualizer <Icon name="arrow-right" /></Link>
              </div>
            </div>
          </div>
        </section>

        {/* AI tools */}
        <section className="content-section section-line" id="tools">
          <div className="page-wrap">
            <div className="center-heading">
              <p className="eyebrow">AI tools marketplace</p>
              <h2>Buy the AI Tools That Win Floor Jobs.</h2>
              <p style={{ color: '#666', maxWidth: 640, margin: '8px auto 0' }}>Every tool is built for floor contractors — buy what you need, or unlock the full XV suite.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginTop: 36 }}>
              {aiTools.map(t => {
                const I = t.icon;
                return (
                  <article key={t.name} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 14, padding: '24px 22px' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #FFD60A, #FFB800)', display: 'grid', placeItems: 'center', marginBottom: 16 }}>
                      <I size={24} color="#0B0B0D" />
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>{t.name}</h3>
                    <p style={{ margin: 0, fontSize: 13, color: '#777', lineHeight: 1.55 }}>{t.desc}</p>
                  </article>
                );
              })}
            </div>
            <div className="center-action" style={{ marginTop: 32 }}>
              <Link to="/app/xv" className="button button--dark">Open the XV Suite <Icon name="arrow-right" /></Link>
            </div>
          </div>
        </section>

        {/* Websites service */}
        <section className="content-section section-line" id="websites" style={{ background: '#FFFFFF' }}>
          <div className="page-wrap" style={{ display: 'grid', gridTemplateColumns: '.95fr 1.05fr', gap: 56, alignItems: 'center' }}>
            <div>
              <p className="eyebrow">Custom websites</p>
              <h2 style={{ font: "400 clamp(34px, 3.5vw, 52px)/1.05 'Libre Caslon Display', serif", margin: '0 0 16px' }}>Get a Website Built by Xtreme AI Systems.</h2>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: '#666', margin: '0 0 22px' }}>We design and build high-converting websites for floor contractors — loaded with your floor gallery, before/after visualizer, and AI-powered lead capture. Launch-ready, mobile-first, and built to sell.</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'grid', gap: 12 }}>
                {['Floor-gallery & before/after showcase', 'Integrated Floor Visualizer', 'AI lead capture & CRM', 'Mobile-first, launch-ready'].map(b => (
                  <li key={b} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 15, color: '#333' }}><span style={{ color: '#FFB800', fontWeight: 700 }}>✓</span>{b}</li>
                ))}
              </ul>
              <div className="button-row">
                <button type="button" className="button button--gold" onClick={() => setModal('call')}>Request a Website <Icon name="arrow-right" /></button>
                <Link to="/pricing" className="button button--light">See Plans <Icon name="arrow-right" /></Link>
              </div>
            </div>
            <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 60px #0000001a', border: '1px solid #e5e5e5' }}>
              <Image src={IMG.warehouse} alt="Polished concrete commercial floor website showcase" fittingType="fill" className="block w-full" style={{ height: 380 }} />
              <div style={{ position: 'absolute', inset: '16px', border: '1px solid rgba(255,255,255,.4)', borderRadius: 10, pointerEvents: 'none' }} />
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="content-section section-line" id="services">
          <div className="page-wrap">
            <div className="center-heading">
              <p className="eyebrow">What we offer</p>
              <h2>Everything You Need to Grow a Floor Business.</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginTop: 32 }}>
              {services.map(s => {
                const I = s.icon;
                return (
                  <article key={s.title} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 14, padding: '26px 24px' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: '#0B0B0D', display: 'grid', placeItems: 'center', marginBottom: 16 }}>
                      <I size={22} color="#FFD60A" />
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 17 }}>{s.title}</h3>
                    <p style={{ margin: 0, fontSize: 14, color: '#777', lineHeight: 1.6 }}>{s.desc}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="content-section pricing section-line" id="pricing" style={{ background: '#FFFFFF' }}>
          <div className="page-wrap">
            <div className="center-heading">
              <p className="eyebrow">Pricing</p>
              <h2>Choose the Right Plan for Your Floor Business</h2>
            </div>
            <div className="pricing-grid">{plans.map(plan => (
              <article className={`pricing-card ${plan.featured ? 'is-featured' : ''}`} key={plan.name}>
                {plan.featured && <div className="popular">Most Popular</div>}
                <h3>{plan.name}</h3>
                <p>{plan.audience}</p>
                <div className="price">{plan.price}{plan.suffix && <small>{plan.suffix}</small>}</div>
                <div className="cadence">{plan.cadence}</div>
                <ul>{plan.features.map(feature => <li key={feature}><Icon name="check" />{feature}</li>)}</ul>
                <button type="button" className={`button ${plan.featured ? 'button--gold' : plan.name === 'Enterprise' ? 'button--light' : 'button--dark'}`} onClick={() => plan.name === 'Enterprise' ? setModal('call') : openAudit(plan.name)}>{plan.cta}<Icon name="arrow-right" /></button>
              </article>
            ))}</div>
            <p className="plan-note">All plans include a 14-day satisfaction guarantee. Cancel anytime.</p>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="closing-cta" style={{ background: 'linear-gradient(135deg, #0B0B0D, #1A1A1D)', color: '#fff' }}>
          <div className="page-wrap closing-grid">
            <div>
              <h2>Stop Guessing.<br /><span style={{ color: '#FFD60A' }}>Start Winning Floor Jobs.</span></h2>
              <p style={{ color: '#bbb' }}>Get AI tools and a custom website built for your floor business — built by Xtreme AI Systems.</p>
            </div>
            <div>
              <div className="button-row">
                <button type="button" className="button button--gold" onClick={() => openAudit()}>Get Started <Icon name="arrow-right" /></button>
                <button type="button" className="button button--dark-outline" onClick={() => setModal('call')}>Book a Demo <Icon name="arrow-right" /></button>
              </div>
              <ul style={{ color: '#9a9a9e' }}>
                <li><Icon name="invoice" />No credit card</li>
                <li><Icon name="shield" />Built for contractors</li>
                <li><Icon name="evidence" />Photoreal results</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer" id="footer">
        <div className="page-wrap footer-grid">
          <div className="footer-brand">
            <img src={LOGO_LIGHT} alt="Xtreme AI Systems" style={{ height: 200, width: 'auto' }} />
            <p>AI tools &amp; websites for floor pros.</p>
            <div className="socials"><a href="#" aria-label="LinkedIn">in</a><a href="#" aria-label="Instagram">◎</a><a href="#" aria-label="YouTube">▶</a></div>
          </div>
          <FooterColumn title="AI Tools" links={['Floor Visualizer', 'Bid Generator', 'Lead Generator', 'CRM', 'Pricing Calculator']} />
          <FooterColumn title="Services" links={['Custom Websites', 'Floor Visualizer', 'Lead Generation', 'Estimating', 'CRM & Pipeline']} />
          <FooterColumn title="Resources" links={['Floor Gallery', 'Before & After', 'Color Charts', 'Pricing', 'Help Center']} />
          <FooterColumn title="Company" links={['About Us', 'Xtreme Polishing Systems', 'Polished Concrete University', 'Contact', 'Trust Center']} />
          <div className="newsletter">
            <h3>Newsletter</h3>
            <p>AI tips &amp; tools to grow your floor business.</p>
            <form onSubmit={e => handleSubmit(e, 'newsletter')}>
              <label className="sr-only" htmlFor="newsletter-email">Email address</label>
              <input id="newsletter-email" name="email" type="email" placeholder="Enter your email" required />
              <button aria-label="Subscribe"><Icon name="arrow-right" /></button>
            </form>
            {notice === 'You are subscribed.' && <small className="form-notice">{notice}</small>}
          </div>
        </div>
        <div className="page-wrap footer-bottom">
          <span>© 2026 Xtreme AI Systems. All rights reserved.</span>
          <nav><a href="#">Privacy Policy</a><a href="#">Terms of Service</a><a href="#">Cookie Policy</a><a href="#">Acceptable Use</a></nav>
          <span className="compliance"><Icon name="shield" />Built for<br />Floor Contractors</span>
        </div>
      </footer>

      {modal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={dialogRef}>
            <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Close dialog">×</button>
            {modal === 'audit' && (
              <>
                <p className="eyebrow">Get started</p>
                <h2 id="modal-title">Start Your {selectedPlan} Plan</h2>
                <p>Tell us about your floor business. No credit card required to start.</p>
                <form className="lead-form" onSubmit={e => handleSubmit(e, 'audit_lead')}>
                  <input type="hidden" name="plan" value={selectedPlan} />
                  <label>Full name<input name="name" required autoComplete="name" /></label>
                  <label>Work email<input name="email" type="email" required autoComplete="email" /></label>
                  <label>Company<input name="company" required autoComplete="organization" /></label>
                  <label>Website<input name="website" type="url" placeholder="https://" /></label>
                  <label>What do you need?<select name="concern" defaultValue="website">
                    <option value="website">A custom website</option>
                    <option value="tools">AI tools for my floor business</option>
                    <option value="visualizer">Floor Visualizer</option>
                    <option value="leads">Lead generation</option>
                  </select></label>
                  <button className="button button--gold" type="submit">Request <Icon name="arrow-right" /></button>
                </form>
              </>
            )}
            {modal === 'call' && (
              <>
                <p className="eyebrow">Book a demo</p>
                <h2 id="modal-title">Get a Website or AI Tool Demo</h2>
                <p>Share your goals and preferred time. We'll follow up to confirm.</p>
                <form className="lead-form" onSubmit={e => handleSubmit(e, 'strategy_call')}>
                  <label>Full name<input name="name" required autoComplete="name" /></label>
                  <label>Work email<input name="email" type="email" required autoComplete="email" /></label>
                  <label>Company<input name="company" required autoComplete="organization" /></label>
                  <label>Phone<input name="phone" type="tel" autoComplete="tel" /></label>
                  <label>Preferred date<input name="preferred_date" type="date" required /></label>
                  <button className="button button--gold" type="submit">Request Demo <Icon name="arrow-right" /></button>
                </form>
              </>
            )}
            {notice && notice !== 'You are subscribed.' && <div className="form-notice">{notice}</div>}
          </div>
        </div>
      )}
    </div>
  );
}