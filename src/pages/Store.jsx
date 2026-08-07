import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Image } from '@/components/ui/image';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/lib/useCart';
import CartDrawer from '@/components/store/CartDrawer';
import '@/components/store/store.css';

const PRICE = { website: 1499, app: 2999, logo: 199, brand: 399 };

export default function Store() {
  const [packs, setPacks] = useState({ web: [], logos: [], brands: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [added, setAdded] = useState('');
  const { add, count } = useCart();
  const [params] = useSearchParams();
  const status = params.get('status');

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke('getStoreCatalog', {});
        if (res.data?.error) throw new Error(res.data.error);
        setPacks(res.data || { web: [], logos: [], brands: [] });
      } catch (e) {
        setError(e.message || 'Failed to load catalog');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function handleAdd(item) {
    add(item);
    setAdded(item.sku);
    setCartOpen(true);
    setTimeout(() => setAdded(''), 1500);
  }

  const webItem = (p, kind) => ({
    sku: `${kind}:${p.id}`,
    name: `${p.pack_name} — ${kind === 'web' ? 'Website' : 'App'}`,
    amount: kind === 'web' ? PRICE.website : PRICE.app,
    type: kind === 'web' ? 'Website Build' : 'App Build',
    pack_id: p.id,
    image: p.image_url,
    description: p.spec?.brand?.style_description || ''
  });

  const toolItem = (p) => ({
    sku: `${p.pack_type}:${p.id}`,
    name: p.pack_name,
    amount: p.pack_type === 'logo_pack' ? PRICE.logo : PRICE.brand,
    type: p.pack_type === 'logo_pack' ? 'Logo Pack' : 'Brand Pack',
    pack_id: p.id,
    image: p.image_url,
    description: p.spec?.brand?.style_description || ''
  });

  const swatches = (p) => {
    const c = p.spec?.brand?.colors || {};
    return [c.background, c.primary, c.secondary, c.accent].filter(Boolean);
  };

  return (
    <div className="xas-store">
      <header className="store-header">
        <div className="wrap">
          <Link to="/" className="store-logo">Xtreme <b>AI</b> Systems</Link>
          <nav className="store-nav">
            <a href="#websites">Websites</a>
            <a href="#apps">Apps</a>
            <a href="#ai-tools">AI Tools</a>
            <Link to="/consultation">Book a Call</Link>
          </nav>
          <div className="store-actions">
            <Link to="/web-packs" style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 700 }}>Pack Gallery</Link>
            <button className="cart-btn" onClick={() => setCartOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>
              Cart {count > 0 && <span className="cart-count">{count}</span>}
            </button>
          </div>
        </div>
      </header>

      <main className="wrap">
        {status === 'success' && <div className="status-banner success">✓ Payment successful — we'll be in touch to start your build. Check your email for a receipt.</div>}
        {status === 'canceled' && <div className="status-banner canceled">Your checkout was canceled. Your cart is still saved.</div>}

        <section className="store-hero">
          <p className="eyebrow">The Xtreme Store</p>
          <h1>Buy a Website, an App,<br />or <span>AI Tools</span> for Your Floor Business.</h1>
          <p>Choose a finished design pack, drop it in your cart, and check out. Each pack is a complete, production-ready spec — we build the full website or app to your chosen pack and deliver it launch-ready.</p>
          <div className="hero-stats">
            <div><b>{packs.web.length}</b><small>Web Packs</small></div>
            <div><b>{packs.logos.length + packs.brands.length}</b><small>AI Tool Packs</small></div>
            <div><b>15 min</b><small>Strategy Call</small></div>
          </div>
        </section>

        {loading && <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>Loading the catalog…</div>}
        {error && <div className="status-banner canceled">{error}</div>}

        {!loading && (
          <>
            <section className="store-section" id="websites">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Websites</p>
                  <h2>Buy a Website Built to a Pack</h2>
                </div>
                <p>Each pack is a full multi-page site design. Add it as a Website build and we deliver a launch-ready site in that exact style.</p>
              </div>
              <div className="product-grid">
                {packs.web.map((p, i) => (
                  <article className="product-card" key={p.id}>
                    <div className="media">
                      <Image src={p.image_url} alt={p.pack_name} fittingType="fill" className="w-full" style={{ height: 220 }} />
                      <span className="pack-badge">PACK {String(i + 1).padStart(2, '0')}</span>
                      <span className="type-badge">Web Pack</span>
                    </div>
                    <div className="body">
                      <div>
                        <h3>{p.pack_name}</h3>
                        <p className="desc">{p.spec?.brand?.style_description?.slice(0, 110)}…</p>
                      </div>
                      <div className="product-meta">
                        {swatches(p).map((c, idx) => <span className="swatch" key={idx} style={{ background: c }} />)}
                        <span className="meta-fonts"><b>H:</b> {p.spec?.brand?.fonts?.heading} · <b>B:</b> {p.spec?.brand?.fonts?.body}</span>
                        <span className="meta-pages">{p.spec?.pages?.length || 0} pages</span>
                      </div>
                      <div className="price-row"><span className="price">${PRICE.website.toLocaleString()} <small>/ site</small></span></div>
                      <div className="product-actions">
                        <button className="btn btn-gold" onClick={() => handleAdd(webItem(p, 'web'))}>Add Website</button>
                        <button className="btn btn-ghost" onClick={() => handleAdd(webItem(p, 'app'))}>Add as App — ${PRICE.app.toLocaleString()}</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="store-section" id="apps">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Apps</p>
                  <h2>Buy an App Built to a Pack</h2>
                </div>
                <p>Want the same pack delivered as a mobile/web app? Add any web pack as an App build instead.</p>
              </div>
              <div className="product-grid">
                {packs.web.slice(0, 3).map((p, i) => (
                  <article className="product-card" key={`app-${p.id}`}>
                    <div className="media">
                      <Image src={p.image_url} alt={p.pack_name} fittingType="fill" className="w-full" style={{ height: 220 }} />
                      <span className="pack-badge">APP {String(i + 1).padStart(2, '0')}</span>
                      <span className="type-badge">App Build</span>
                    </div>
                    <div className="body">
                      <div>
                        <h3>{p.pack_name}</h3>
                        <p className="desc">The same design system, delivered as a production-ready app — iOS, Android, and web from one build.</p>
                      </div>
                      <div className="price-row"><span className="price">${PRICE.app.toLocaleString()} <small>/ app</small></span></div>
                      <div className="product-actions">
                        <button className="btn btn-gold" onClick={() => handleAdd(webItem(p, 'app'))}>Add App to Cart</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="store-section" id="ai-tools">
              <div className="section-head">
                <div>
                  <p className="eyebrow">AI Tools</p>
                  <h2>Logo & Brand Packs</h2>
                </div>
                <p>Instant AI-generated identity systems. Buy a logo pack or a full brand pack and download the assets.</p>
              </div>
              <div className="product-grid">
                {packs.logos.map((p, i) => (
                  <article className="product-card" key={p.id}>
                    <div className="media">
                      <Image src={p.image_url} alt={p.pack_name} fittingType="fill" className="w-full" style={{ height: 220 }} />
                      <span className="pack-badge">LOGO {String(i + 1).padStart(2, '0')}</span>
                      <span className="type-badge">Logo Pack</span>
                    </div>
                    <div className="body">
                      <div>
                        <h3>{p.pack_name}</h3>
                        <p className="desc">{p.spec?.brand?.style_description?.slice(0, 110)}…</p>
                      </div>
                      <div className="price-row"><span className="price">${PRICE.logo} <small>/ pack</small></span></div>
                      <div className="product-actions">
                        <button className="btn btn-gold" onClick={() => handleAdd(toolItem(p))}>Add to Cart</button>
                      </div>
                    </div>
                  </article>
                ))}
                {packs.brands.map((p, i) => (
                  <article className="product-card" key={p.id}>
                    <div className="media">
                      <Image src={p.image_url} alt={p.pack_name} fittingType="fill" className="w-full" style={{ height: 220 }} />
                      <span className="pack-badge">BRAND {String(i + 1).padStart(2, '0')}</span>
                      <span className="type-badge">Brand Pack</span>
                    </div>
                    <div className="body">
                      <div>
                        <h3>{p.pack_name}</h3>
                        <p className="desc">{p.spec?.brand?.style_description?.slice(0, 110)}…</p>
                      </div>
                      <div className="price-row"><span className="price">${PRICE.brand} <small>/ pack</small></span></div>
                      <div className="product-actions">
                        <button className="btn btn-gold" onClick={() => handleAdd(toolItem(p))}>Add to Cart</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="store-section">
              <div className="call-banner">
                <div>
                  <p className="eyebrow">Not sure which pack?</p>
                  <h3>Book a 15-Minute Strategy Call</h3>
                  <p>Talk through your website or app idea with our team. We'll help you pick the right pack and scope your build.</p>
                </div>
                <Link to="/consultation" className="btn btn-gold" style={{ minWidth: 200 }}>Book a Call →</Link>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="store-footer">
        <div className="wrap">
          <span>© 2026 Xtreme AI Systems — The Xtreme Store</span>
          <span>Secure checkout via Stripe · Test mode</span>
        </div>
      </footer>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}