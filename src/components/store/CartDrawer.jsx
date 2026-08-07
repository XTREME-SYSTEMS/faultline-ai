import { useState } from 'react';
import { useCart } from '@/lib/useCart';
import { base44 } from '@/api/base44Client';

export default function CartDrawer({ open, onClose }) {
  const { items, remove, setQty, clear, subtotal, count } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inIframe = window.self !== window.top;

  if (!open) return null;

  async function checkout() {
    if (inIframe) {
      setError('Checkout works only from a published app. Open the store in a new tab to purchase.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('createStoreCheckout', {
        items: items.map((i) => ({
          name: i.name,
          amount: i.amount,
          quantity: i.quantity,
          image: i.image,
          description: i.description,
          pack_id: i.pack_id,
          type: i.type
        }))
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError(res.data?.error || 'Failed to create checkout session.');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Checkout failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="xas-cart-overlay" onClick={onClose} />
      <aside className="xas-cart-drawer" role="dialog" aria-label="Shopping cart">
        <header>
          <h3>Your Cart {count > 0 && <span style={{ color: 'var(--bronze)', fontSize: 14 }}>({count})</span>}</h3>
          <button className="close" onClick={onClose} aria-label="Close cart">×</button>
        </header>
        <div className="cart-body">
          {items.length === 0 ? (
            <div className="cart-empty">Your cart is empty.<br />Add a website, app, or AI tool to get started.</div>
          ) : (
            items.map((it) => (
              <div className="xas-cart-item" key={it.sku}>
                {it.image && <img src={it.image} alt={it.name} />}
                <div className="ci-body">
                  <p className="ci-name">{it.name}</p>
                  <span className="ci-type">{it.type}</span>
                  <div className="ci-controls">
                    <span className="qty">
                      <button onClick={() => setQty(it.sku, it.quantity - 1)} aria-label="Decrease">−</button>
                      <span>{it.quantity}</span>
                      <button onClick={() => setQty(it.sku, it.quantity + 1)} aria-label="Increase">+</button>
                    </span>
                    <button className="ci-remove" onClick={() => remove(it.sku)}>Remove</button>
                    <span className="ci-price">${(it.amount * it.quantity).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {items.length > 0 && (
          <footer>
            <div className="cart-total">
              <span>Total</span>
              <b>${subtotal.toLocaleString()}</b>
            </div>
            <button className="checkout-btn" onClick={checkout} disabled={loading}>
              {loading ? 'Redirecting to checkout…' : 'Checkout with Stripe'}
            </button>
            <p className="cart-note">Secure payment via Stripe · Test mode: use 4242 4242 4242 4242</p>
            {error && <p className="cart-error">{error}</p>}
          </footer>
        )}
      </aside>
    </>
  );
}