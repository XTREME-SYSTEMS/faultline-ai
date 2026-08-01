import { Link } from 'react-router-dom';
import Brand from '@/components/fl/Brand';

export default function Checkout() {
  return (
    <div className="checkout">
      <header>
        <Brand />
        <Link to="/login">Sign in</Link>
      </header>
      <main>
        <section>
          <p className="eyebrow">Secure. Scalable. Built for growth.</p>
          <h1>Choose your plan.<br />Start fixing what’s broken.</h1>
          <p>Test-mode presentation only. Final prices, taxes, and entitlements require validation.</p>
          <div className="plan-grid">
            {[['Diagnostic', '$0'], ['Growth', '$299/mo'], ['Operating System', '$699/mo'], ['Enterprise', 'Custom']].map(([n, p], i) => (
              <article className={i === 2 ? 'chosen' : ''} key={n}>
                <h3>{n}</h3>
                <b>{p}</b>
                <p>Evidence-backed findings, repair roadmaps, and a secure customer portal.</p>
              </article>
            ))}
          </div>
        </section>
        <aside>
          <h2>Secure checkout</h2>
          <p>1 Plan · 2 Payment · 3 Confirm</p>
          <div className="summary">
            <span>Operating System</span>
            <b>$699/month</b>
          </div>
          <label>Card number<input value="4242 4242 4242 4242" readOnly /></label>
          <div className="split">
            <label>Expiry<input value="12/30" readOnly /></label>
            <label>CVC<input value="123" readOnly /></label>
          </div>
          <label>Name on card<input placeholder="Full name" /></label>
          <label>Billing email<input placeholder="billing@company.com" /></label>
          <button className="btn dark">Complete test subscription</button>
          <small>No live payment will be processed.</small>
        </aside>
      </main>
    </div>
  );
}