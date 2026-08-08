import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Image } from '@/components/ui/image';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/lib/useCart';
import CartDrawer from '@/components/store/CartDrawer';
import '@/components/store/store.css';

// Cheap impulse-buy pricing
const PRICE = {
  tool: 29,        // AI Tools — cloned SaaS tools
  webPack: 49,     // Web Packs — cloned website templates
  appPack: 99,     // App Packs — cloned app templates
  website: 199,    // Full website build from design pack
  app: 399,        // Full app build from design pack
  logo: 19,        // Logo pack
  brand: 39        // Brand pack
};

export default function Store() {
  const [catalog, setCatalog] = useState({ web: [], logos: [], brands: [], tools: [], webPacks: [], appPacks: [], counts: {} });
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
        setCatalog(res.data || { web: [], logos: [], brands: [], tools: [], webPacks: [], appPacks: [], counts: {} });
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
    name: `${p.pack_name} — ${kind === 'web' ? 'Website Build' : 'App Build'}`,
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

  // Cloned product items (tools, web packs, app packs from UniversalCatalog)
  const clonedToolItem = (c) => ({
    sku: `tool:${c.id}`,
    name: c.name,
    amount: PRICE.tool,
    type: 'AI Tool',
    pack_id: c.id,
    image: c.image,
    description: c.description
  });

  const clonedWebPackItem = (c) => ({
    sku: `webpack:${c.id}`,
    name: c.name,
    amount: PRICE.webPack,
    type: 'Web Pack',
    pack_id: c.id,
    image: c.image,
    description: c.description
  });

  const clonedAppPackItem = (c) => ({
    sku: `apppack:${c.id}`,
    name: c.name,
    amount: PRICE.appPack,
    type: 'App Pack',
    pack_id: c.id,
    image: c.image,
    description: c.description
  });

  const swatches = (p) => {
    const c = p.spec?.brand?.colors || {};
    return [c.background, c.primary, c.secondary, c.accent].filter(Boolean);
  };

  const totalProducts = (catalog.counts?.tools || 0) + (catalog.counts?.webPacks || 0) + (catalog.counts?.appPacks || 0) + (catalog.web?.length || 0) + (catalog.logos?.length || 0) + (catalog.brands?.length || 0);

  return (
    <div className="xas-store">
      <header className="store-header">
        <div className="wrap">
          <Link to="/" className="store-logo">FaultLine <b>AI</b></Link>
          <nav className="store-nav">
            <a href="#tools">AI Tools</a>
            <a href="#web-packs">Web Packs</a>
            <a href="#app-packs">App Packs</a>
            <a href="#websites">Websites</a>
            <a href="#ai-tools">Brand</a>
            <Link to="/consultation">Book a Call</Link>
          </nav>
          <div className="store-actions">
            <Link to="/web-packs" style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 700 }}>Gallery</Link>
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
          <p className="eyebrow">The FaultLine Store</p>
          <h1>AI Tools, Web Packs & App Packs<br />for <span>$29 to $99</span> — Instant Download.</h1>
          <p>Production-ready clones of the world's best SaaS tools, websites, and apps. Buy a tool, a web pack, or an app pack and deploy it as your own product. Cheap, fast, ready to launch.</p>
          <div className="hero-stats">
            <div><b>{catalog.counts?.tools || 0}</b><small>AI Tools</small></div>
            <div><b>{catalog.counts?.webPacks || 0}</b><small>Web Packs</small></div>
            <div><b>{catalog.counts?.appPacks || 0}</b><small>App Packs</small></div>
            <div><b>${PRICE.tool}</b><small>Starting Price</small></div>
          </div>
        </section>

        {loading && <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>Loading the catalog…</div>}
        {error && <div className="status-banner canceled">{error}</div>}

        {!loading && (
          <>
            {/* AI TOOLS — cloned SaaS tools */}
            <section className="store-section" id="tools">
              <div className="section-head">
                <div>
                  <p className="eyebrow">AI Tools · ${PRICE.tool} each</p>
                  <h2>Clone-Ready AI Tools</h2>
                </div>
                <p>Production-ready clones of top SaaS tools — CRMs, automation platforms, AI assistants, and more. Buy and deploy as your own product.</p>
              </div>
              <div className="product-grid">
                {catalog.tools.map((c, i) => (
                  <article className="product-card" key={c.id}>
                    <div className="media">
                      {c.image ? (
                        <Image src={c.image} alt={c.name} fittingType="fill" className="w-full" style={{ height: 180 }} />
                      ) : (
                        <div style={{ height: 180, background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)', display: 'grid', placeItems: 'center', color: '#E7C86E', fontSize: 32 }}>⚡</div>
                      )}
                      <span className="pack-badge">TOOL {String(i + 1).padStart(2, '0')}</span>
                      <span className="type-badge">AI Tool</span>
                    </div>
                    <div className="body">
                      <div>
                        <h3>{c.name}</h3>
                        <p className="desc">{c.description?.slice(0, 100)}…</p>
                      </div>
                      {c.key_features?.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', margin: '8px 0' }}>
                          {c.key_features.slice(0, 3).map((f, idx) => (
                            <span key={idx} style={{ fontSize: 9, background: '#f4f1ea', color: '#8A641C', padding: '2px 6px', borderRadius: 8 }}>{f}</span>
                          ))}
                        </div>
                      )}
                      <div className="price-row"><span className="price">${PRICE.tool} <small>/ tool</small></span></div>
                      <div className="product-actions">
                        <button className="btn btn-gold" onClick={() => handleAdd(clonedToolItem(c))}>Add to Cart — ${PRICE.tool}</button>
                        {c.is_original && c.tool_url ? (
                          <Link to={c.tool_url} className="btn btn-ghost">Try It Free →</Link>
                        ) : c.url ? (
                          <a href={c.url} target="_blank" rel="noreferrer" className="btn btn-ghost">Live Demo</a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
                {catalog.tools.length === 0 && <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>No tools cloned yet. Run the Wealth Discovery Engine to clone tools.</div>}
              </div>
            </section>

            {/* WEB PACKS — cloned website templates */}
            <section className="store-section" id="web-packs">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Web Packs · ${PRICE.webPack} each</p>
                  <h2>Clone-Ready Website Templates</h2>
                </div>
                <p>Full website clones of top-performing sites across industries. Buy a pack, swap your branding, and launch in minutes.</p>
              </div>
              <div className="product-grid">
                {catalog.webPacks.map((c, i) => (
                  <article className="product-card" key={c.id}>
                    <div className="media">
                      {c.image ? (
                        <Image src={c.image} alt={c.name} fittingType="fill" className="w-full" style={{ height: 180 }} />
                      ) : (
                        <div style={{ height: 180, background: 'linear-gradient(135deg, #C89B3C, #8A641C)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 32 }}>🌐</div>
                      )}
                      <span className="pack-badge">PACK {String(i + 1).padStart(2, '0')}</span>
                      <span className="type-badge">Web Pack</span>
                    </div>
                    <div className="body">
                      <div>
                        <h3>{c.name}</h3>
                        <p className="desc">{c.description?.slice(0, 100)}…</p>
                      </div>
                      <div className="price-row"><span className="price">${PRICE.webPack} <small>/ pack</small></span></div>
                      <div className="product-actions">
                        <button className="btn btn-gold" onClick={() => handleAdd(clonedWebPackItem(c))}>Add to Cart — ${PRICE.webPack}</button>
                        {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="btn btn-ghost">Preview</a>}
                      </div>
                    </div>
                  </article>
                ))}
                {catalog.webPacks.length === 0 && <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>No web packs cloned yet.</div>}
              </div>
            </section>

            {/* APP PACKS — cloned app templates */}
            <section className="store-section" id="app-packs">
              <div className="section-head">
                <div>
                  <p className="eyebrow">App Packs · ${PRICE.appPack} each</p>
                  <h2>Clone-Ready App Templates</h2>
                </div>
                <p>Full app clones of top mobile and web apps. Buy a pack, customize, and launch your own SaaS product.</p>
              </div>
              <div className="product-grid">
                {catalog.appPacks.map((c, i) => (
                  <article className="product-card" key={c.id}>
                    <div className="media">
                      {c.image ? (
                        <Image src={c.image} alt={c.name} fittingType="fill" className="w-full" style={{ height: 180 }} />
                      ) : (
                        <div style={{ height: 180, background: 'linear-gradient(135deg, #237A4B, #1a5a35)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 32 }}>📱</div>
                      )}
                      <span className="pack-badge">APP {String(i + 1).padStart(2, '0')}</span>
                      <span className="type-badge">App Pack</span>
                    </div>
                    <div className="body">
                      <div>
                        <h3>{c.name}</h3>
                        <p className="desc">{c.description?.slice(0, 100)}…</p>
                      </div>
                      <div className="price-row"><span className="price">${PRICE.appPack} <small>/ pack</small></span></div>
                      <div className="product-actions">
                        <button className="btn btn-gold" onClick={() => handleAdd(clonedAppPackItem(c))}>Add to Cart — ${PRICE.appPack}</button>
                        {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="btn btn-ghost">Preview</a>}
                      </div>
                    </div>
                  </article>
                ))}
                {catalog.appPacks.length === 0 && <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>No app packs cloned yet.</div>}
              </div>
            </section>

            {/* FULL WEBSITE BUILDS from design packs */}
            <section className="store-section" id="websites">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Custom Builds · ${PRICE.website}+</p>
                  <h2>Custom Website & App Builds</h2>
                </div>
                <p>Want a full custom build? Pick a design pack and we deliver a launch-ready website or app in that exact style.</p>
              </div>
              <div className="product-grid">
                {catalog.web.map((p, i) => (
                  <article className="product-card" key={p.id}>
                    <div className="media">
                      <Image src={p.image_url} alt={p.pack_name} fittingType="fill" className="w-full" style={{ height: 220 }} />
                      <span className="pack-badge">PACK {String(i + 1).padStart(2, '0')}</span>
                      <span className="type-badge">Design Pack</span>
                    </div>
                    <div className="body">
                      <div>
                        <h3>{p.pack_name}</h3>
                        <p className="desc">{p.spec?.brand?.style_description?.slice(0, 110)}…</p>
                      </div>
                      <div className="product-meta">
                        {swatches(p).map((c, idx) => <span className="swatch" key={idx} style={{ background: c }} />)}
                        <span className="meta-pages">{p.spec?.pages?.length || 0} pages</span>
                      </div>
                      <div className="price-row"><span className="price">${PRICE.website.toLocaleString()} <small>/ site</small></span></div>
                      <div className="product-actions">
                        <button className="btn btn-gold" onClick={() => handleAdd(webItem(p, 'web'))}>Add Website — ${PRICE.website}</button>
                        <button className="btn btn-ghost" onClick={() => handleAdd(webItem(p, 'app'))}>Add as App — ${PRICE.app}</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* LOGO & BRAND PACKS */}
            <section className="store-section" id="ai-tools">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Brand Assets · ${PRICE.logo}–${PRICE.brand}</p>
                  <h2>Logo & Brand Packs</h2>
                </div>
                <p>Instant AI-generated identity systems. Buy a logo pack or a full brand pack and download the assets.</p>
              </div>
              <div className="product-grid">
                {catalog.logos.map((p, i) => (
                  <article className="product-card" key={p.id}>
                    <div className="media">
                      <Image src={p.image_url} alt={p.pack_name} fittingType="fill" className="w-full" style={{ height: 180 }} />
                      <span className="pack-badge">LOGO {String(i + 1).padStart(2, '0')}</span>
                      <span className="type-badge">Logo Pack</span>
                    </div>
                    <div className="body">
                      <div>
                        <h3>{p.pack_name}</h3>
                        <p className="desc">{p.spec?.brand?.style_description?.slice(0, 100)}…</p>
                      </div>
                      <div className="price-row"><span className="price">${PRICE.logo} <small>/ pack</small></span></div>
                      <div className="product-actions">
                        <button className="btn btn-gold" onClick={() => handleAdd(toolItem(p))}>Add to Cart — ${PRICE.logo}</button>
                      </div>
                    </div>
                  </article>
                ))}
                {catalog.brands.map((p, i) => (
                  <article className="product-card" key={p.id}>
                    <div className="media">
                      <Image src={p.image_url} alt={p.pack_name} fittingType="fill" className="w-full" style={{ height: 180 }} />
                      <span className="pack-badge">BRAND {String(i + 1).padStart(2, '0')}</span>
                      <span className="type-badge">Brand Pack</span>
                    </div>
                    <div className="body">
                      <div>
                        <h3>{p.pack_name}</h3>
                        <p className="desc">{p.spec?.brand?.style_description?.slice(0, 100)}…</p>
                      </div>
                      <div className="price-row"><span className="price">${PRICE.brand} <small>/ pack</small></span></div>
                      <div className="product-actions">
                        <button className="btn btn-gold" onClick={() => handleAdd(toolItem(p))}>Add to Cart — ${PRICE.brand}</button>
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
                  <p>Talk through your project with our team. We'll help you pick the right tool, pack, or build.</p>
                </div>
                <Link to="/consultation" className="btn btn-gold" style={{ minWidth: 200 }}>Book a Call →</Link>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="store-footer">
        <div className="wrap">
          <span>© 2026 FaultLine AI — The AI Store</span>
          <span>Secure checkout via Stripe · {totalProducts} products available</span>
        </div>
      </footer>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}