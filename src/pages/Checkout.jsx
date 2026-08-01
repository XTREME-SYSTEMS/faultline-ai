import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Brand from '@/components/fl/Brand';
import { base44 } from '@/api/base44Client';

const PLANS = [
  { name: 'Diagnostic', price: '$0', desc: 'Free initial scan', priceId: null },
  { name: 'Growth', price: '$299/mo', desc: 'Evidence-backed findings, repair roadmaps, and secure customer portal.', priceId: 'price_1TzknFACgTuVF1HNilM5MFR7' },
  { name: 'Operating System', price: '$699/mo', desc: 'Full diagnostic pipeline, repair plans, outreach, monitoring, and integrations.', priceId: 'price_1TzknFACgTuVF1HNiMFr62lT' },
  { name: 'Enterprise', price: 'Custom', desc: 'Multi-org governance, dedicated support, and custom integrations.', priceId: null }
];

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');
  const [selected, setSelected] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inIframe = window.self !== window.top;

  const handleSubscribe = async () => {
    const plan = PLANS[selected];
    if (!plan.priceId) {
      setError('This plan requires a custom quote. Contact us to get started.');
      return;
    }
    if (inIframe) {
      setError('Checkout works only from a published app. Open the app in a new tab to subscribe.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('createCheckout', { priceId: plan.priceId, planName: plan.name });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError('Failed to create checkout session.');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Checkout failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout">
      <header>
        <Brand />
        <Link to="/login">Sign in</Link>
      </header>
      <main>
        <section>
          <p className="eyebrow">Secure. Scalable. Built for growth.</p>
          <h1>Choose your plan.<br />Start fixing what's broken.</h1>
          <p>Select a plan to subscribe via Stripe. Test mode active — use card 4242 4242 4242 4242.</p>

          {status === 'success' && (
            <div style={{ background: '#d4edda', color: '#155724', padding: '14px 18px', borderRadius: 6, marginBottom: 20, border: '1px solid #c3e6cb' }}>
              <b>Subscription active!</b> Check your email for confirmation. Log in to access your portal.
            </div>
          )}
          {status === 'canceled' && (
            <div style={{ background: '#f5d8d5', color: '#a52d23', padding: '14px 18px', borderRadius: 6, marginBottom: 20, border: '1px solid #e3b8b3' }}>
              Checkout was canceled. You can try again anytime.
            </div>
          )}
          {error && (
            <div style={{ background: '#f5d8d5', color: '#a52d23', padding: '14px 18px', borderRadius: 6, marginBottom: 20, border: '1px solid #e3b8b3' }}>
              {error}
            </div>
          )}

          <div className="plan-grid">
            {PLANS.map((plan, i) => (
              <article
                key={plan.name}
                className={selected === i ? 'chosen' : ''}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelected(i)}
              >
                <h3>{plan.name}</h3>
                <b>{plan.price}</b>
                <p>{plan.desc}</p>
              </article>
            ))}
          </div>
        </section>
        <aside>
          <h2>Secure checkout</h2>
          <p>Powered by Stripe. No card details stored on our servers.</p>
          <div className="summary">
            <span>{PLANS[selected].name}</span>
            <b>{PLANS[selected].price}</b>
          </div>
          <p style={{ fontSize: 13, color: '#666' }}>
            {PLANS[selected].priceId
              ? 'Click below to proceed to Stripe checkout.'
              : 'This plan requires a custom quote.'}
          </p>
          <button
            className="btn dark"
            onClick={handleSubscribe}
            disabled={loading || !PLANS[selected].priceId}
            style={{ opacity: loading || !PLANS[selected].priceId ? 0.6 : 1 }}
          >
            {loading ? 'Redirecting…' : `Subscribe to ${PLANS[selected].name}`}
          </button>
          {inIframe && (
            <small style={{ color: '#a52d23' }}>Checkout works only from a published app. Open in a new tab.</small>
          )}
          {!PLANS[selected].priceId && (
            <small>This plan is not available for self-serve checkout.</small>
          )}
        </aside>
      </main>
    </div>
  );
}