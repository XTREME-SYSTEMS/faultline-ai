import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import PortalShell from '@/components/fl/PortalShell';
import PageHead from '@/components/fl/PageHead';
import { useToast } from '@/components/ui/use-toast';

const STAGES = [
  { value: 'new_business', label: 'Launching a business' },
  { value: 'growth', label: 'Growing an existing business' },
  { value: 'commercial', label: 'Moving into commercial work' },
  { value: 'student', label: 'Currently a PCU student' }
];

const GOALS = [
  { value: 'needs_leads', label: 'Get more leads' },
  { value: 'close_more', label: 'Close more estimates' },
  { value: 'pricing', label: 'Price jobs correctly' },
  { value: 'brand', label: 'Build my brand' },
  { value: 'operations', label: 'Run jobs better' },
  { value: 'training', label: 'Learn faster' }
];

const SERVICES = [
  'Epoxy coatings', 'Polished concrete', 'Decorative concrete', 'Concrete overlays',
  'Concrete staining', 'Urethane cement', 'Quartz systems', 'Terrazzo and resinous flooring'
];

function scoreTool(tool, stage, goals, budget) {
  let score = 0;
  const bestFor = (tool.audience || '').split(',').map(s => s.trim());
  if (bestFor.includes(stage)) score += 4;
  goals.forEach(goal => { if (bestFor.includes(goal)) score += 5; });
  if (tool.rating >= 5) score += 1;
  if (tool.price <= budget * 0.55) score += 1;
  return score;
}

function getRecommendations(tools, stage, goals, budget) {
  if (!stage || !goals.length) return [];
  const scored = tools.map(tool => ({ tool, score: scoreTool(tool, stage, goals, budget) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.tool.price - b.tool.price);
  const selected = [];
  let spend = 0;
  for (const entry of scored) {
    if (selected.length >= 5) break;
    if (spend + entry.tool.price <= budget || selected.length < 2) {
      selected.push(entry.tool);
      spend += entry.tool.price;
    }
  }
  return selected;
}

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export default function ToolAdvisor() {
  const { toast } = useToast();
  const [tools, setTools] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState('');
  const [goals, setGoals] = useState([]);
  const [focus, setFocus] = useState('');
  const [budget, setBudget] = useState(200);
  const [recommendations, setRecommendations] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All Tools');
  const [view, setView] = useState('advisor');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [toolData, bundleData] = await Promise.all([
        base44.entities.AiTool.filter({ status: 'published' }, '-rating', 50),
        base44.entities.ToolBundle.filter({ status: 'published' }, '-created_date', 20)
      ]);
      setTools(toolData);
      setBundles(bundleData);
    } catch (e) {
      toast({ title: 'Error loading tools', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setRecommendations(getRecommendations(tools, stage, goals, budget));
  }, [tools, stage, goals, budget]);

  const toggleGoal = (goal) => {
    setGoals(prev => prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]);
  };

  const addToCart = (tool) => {
    if (cart.find(c => c.tool_id === tool.tool_id)) {
      toast({ title: 'Already in cart', description: tool.name });
      return;
    }
    setCart(prev => [...prev, { tool_id: tool.tool_id, name: tool.name, price: tool.price, price_mode: tool.price_mode, type: 'tool' }]);
    toast({ title: 'Added to cart', description: tool.name });
  };

  const addBundleToCart = (bundle) => {
    if (cart.find(c => c.tool_id === bundle.bundle_id)) {
      toast({ title: 'Already in cart', description: bundle.name });
      return;
    }
    setCart(prev => [...prev, { tool_id: bundle.bundle_id, name: bundle.name, price: bundle.price, price_mode: 'subscription', type: 'bundle' }]);
    toast({ title: 'Bundle added to cart', description: bundle.name });
  };

  const addRecommendedStack = () => {
    let added = 0;
    for (const tool of recommendations) {
      if (!cart.find(c => c.tool_id === tool.tool_id)) {
        added++;
      }
    }
    setCart(prev => {
      const existing = new Set(prev.map(c => c.tool_id));
      const newItems = recommendations
        .filter(t => !existing.has(t.tool_id))
        .map(t => ({ tool_id: t.tool_id, name: t.name, price: t.price, price_mode: t.price_mode, type: 'tool' }));
      return [...prev, ...newItems];
    });
    toast({ title: 'Stack added', description: `${added} tools added to your cart` });
  };

  const removeFromCart = (toolId) => {
    setCart(prev => prev.filter(c => c.tool_id !== toolId));
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    try {
      const total = cart.reduce((sum, item) => sum + (item.price || 0), 0);
      const order = await base44.entities.CartOrder.create({
        items: cart,
        subtotal: total,
        total: total,
        item_count: cart.length,
        status: 'submitted'
      });
      toast({ title: 'Order submitted', description: `${cart.length} items — ${money(total)}/mo. A team member will contact you to finalize.` });
      setCart([]);
    } catch (e) {
      toast({ title: 'Checkout failed', description: e.message, variant: 'destructive' });
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price || 0), 0);
  const categories = ['All Tools', ...new Set(tools.map(t => t.category))];
  const filteredTools = activeCategory === 'All Tools' ? tools : tools.filter(t => t.category === activeCategory);

  return (
    <PortalShell assistant>
      <PageHead title="AI Tool Advisor" subtitle="Get a practical tool stack based on your services, stage, priorities, and budget." />

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid #ddd', paddingBottom: 0 }}>
        {['advisor', 'marketplace', 'bundles'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '10px 18px', border: 0, borderBottom: view === v ? '2px solid #C89B3C' : '2px solid transparent',
              background: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              color: view === v ? '#111' : '#888', textTransform: 'capitalize'
            }}
          >
            {v === 'advisor' ? 'Tool Advisor' : v === 'marketplace' ? 'All Tools' : 'Business Systems'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>Loading tools…</div>
      ) : view === 'advisor' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
          <div>
            <div style={{ background: '#fff', border: '1px solid #ddd', padding: 28, borderRadius: 8 }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
                  <span style={{ font: '400 24px "Libre Caslon Display", serif', color: '#C89B3C' }}>01</span>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontWeight: 700, fontSize: 14, display: 'block', marginBottom: 10 }}>What best describes you?</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                      {STAGES.map(s => (
                        <button key={s.value} onClick={() => setStage(s.value)}
                          style={{
                            padding: '12px 14px', borderRadius: 6, border: `1px solid ${stage === s.value ? '#C89B3C' : '#ddd'}`,
                            background: stage === s.value ? '#C89B3C15' : '#fff', fontWeight: 600, fontSize: 13,
                            cursor: 'pointer', textAlign: 'left'
                          }}>
                          {stage === s.value ? '✓ ' : '+ '}{s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
                  <span style={{ font: '400 24px "Libre Caslon Display", serif', color: '#C89B3C' }}>02</span>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontWeight: 700, fontSize: 14, display: 'block', marginBottom: 10 }}>What do you need help with most?</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {GOALS.map(g => (
                        <button key={g.value} onClick={() => toggleGoal(g.value)}
                          style={{
                            padding: '12px 14px', borderRadius: 6, border: `1px solid ${goals.includes(g.value) ? '#C89B3C' : '#ddd'}`,
                            background: goals.includes(g.value) ? '#C89B3C15' : '#fff', fontWeight: 600, fontSize: 13,
                            cursor: 'pointer', textAlign: 'left'
                          }}>
                          {goals.includes(g.value) ? '✓ ' : '+ '}{g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
                  <span style={{ font: '400 24px "Libre Caslon Display", serif', color: '#C89B3C' }}>03</span>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontWeight: 700, fontSize: 14, display: 'block', marginBottom: 10 }}>Primary service focus</label>
                    <select value={focus} onChange={e => setFocus(e.target.value)}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}>
                      <option value="">Choose a service</option>
                      {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ font: '400 24px "Libre Caslon Display", serif', color: '#C89B3C' }}>04</span>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontWeight: 700, fontSize: 14, display: 'block', marginBottom: 10 }}>Monthly software budget</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <input type="range" min="50" max="600" step="25" value={budget}
                        onChange={e => setBudget(Number(e.target.value))}
                        style={{ flex: 1, accentColor: '#C89B3C' }} />
                      <strong style={{ fontSize: 18, fontFamily: '"Libre Caslon Display", serif' }}>{money(budget)}/mo</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside style={{ position: 'sticky', top: 90, alignSelf: 'start' }}>
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24 }}>
              <span style={{ color: '#C89B3C', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em' }}>Your Recommended Stack</span>
              {recommendations.length > 0 ? (
                <>
                  {recommendations.map((tool, i) => (
                    <div key={tool.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 0', borderBottom: '1px solid #eee' }}>
                      <b style={{ font: '400 20px "Libre Caslon Display", serif', color: '#C89B3C', minWidth: 28 }}>{String(i + 1).padStart(2, '0')}</b>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 13, display: 'block' }}>{tool.name}</strong>
                        <small style={{ color: '#777', fontSize: 12, lineHeight: 1.4, display: 'block', marginTop: 2 }}>{tool.description?.split('.')[0]}</small>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#C89B3C' }}>{money(tool.price)}{tool.price_mode === 'subscription' ? '/mo' : ''}</span>
                      </div>
                      <button onClick={() => addToCart(tool)}
                        style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #C89B3C', background: '#C89B3C15', color: '#C89B3C', fontWeight: 700, cursor: 'pointer', fontSize: 16 }}>+</button>
                    </div>
                  ))}
                  <button onClick={addRecommendedStack}
                    style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 6, border: 0, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    Add Recommended Stack
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                  <span style={{ fontSize: 32, color: '#ddd' }}>✦</span>
                  <h3 style={{ fontSize: 15, margin: '12px 0 6px' }}>Your recommendations will appear here</h3>
                  <p style={{ fontSize: 13, color: '#888', lineHeight: 1.5 }}>Select your stage and at least one goal to generate a focused stack.</p>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div style={{ background: '#0a0a0a', color: '#fff', borderRadius: 8, padding: 20, marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <strong style={{ fontSize: 14 }}>Cart ({cart.length})</strong>
                  <span style={{ font: '400 22px "Libre Caslon Display", serif', color: '#E7C86E' }}>{money(cartTotal)}/mo</span>
                </div>
                {cart.map(item => (
                  <div key={item.tool_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #222', fontSize: 12 }}>
                    <span>{item.name}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: '#E7C86E' }}>{money(item.price)}</span>
                      <button onClick={() => removeFromCart(item.tool_id)} style={{ background: 'none', border: 0, color: '#C63D34', cursor: 'pointer', fontSize: 16 }}>×</button>
                    </div>
                  </div>
                ))}
                <button onClick={checkout}
                  style={{ width: '100%', marginTop: 14, padding: '12px', borderRadius: 6, border: 0, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Submit Order
                </button>
              </div>
            )}
          </aside>
        </div>
      ) : view === 'marketplace' ? (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '8px 16px', borderRadius: 20, border: `1px solid ${activeCategory === cat ? '#C89B3C' : '#ddd'}`,
                  background: activeCategory === cat ? '#C89B3C' : '#fff', color: activeCategory === cat ? '#fff' : '#666',
                  fontWeight: 600, fontSize: 12, cursor: 'pointer'
                }}>
                {cat}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filteredTools.map(tool => (
              <div key={tool.id} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 22, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#C89B3C', textTransform: 'uppercase', letterSpacing: '.12em' }}>{tool.category}</span>
                  {tool.rating >= 5 && <span style={{ fontSize: 10, background: '#C89B3C20', color: '#8A641C', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>FEATURED</span>}
                </div>
                <h3 style={{ fontSize: 17, margin: '0 0 8px' }}>{tool.name}</h3>
                <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, flex: 1 }}>{tool.description?.split('.')[0]}.</p>
                {tool.features && tool.features.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0', display: 'grid', gap: 5 }}>
                    {tool.features.slice(0, 4).map((f, i) => (
                      <li key={i} style={{ fontSize: 12, color: '#555' }}>✓ {f}</li>
                    ))}
                  </ul>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTop: '1px solid #eee' }}>
                  <div>
                    <b style={{ fontSize: 18, fontFamily: '"Libre Caslon Display", serif' }}>{money(tool.price)}</b>
                    <span style={{ fontSize: 11, color: '#888' }}>{tool.price_mode === 'subscription' ? '/mo' : ' setup'}</span>
                  </div>
                  <button onClick={() => addToCart(tool)}
                    style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #C89B3C', background: '#C89B3C15', color: '#C89B3C', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {bundles.map(bundle => (
            <div key={bundle.id} style={{
              background: '#fff', border: bundle.features?.includes('Featured') ? '2px solid #C89B3C' : '1px solid #ddd',
              borderRadius: 8, padding: 26, display: 'flex', flexDirection: 'column', position: 'relative'
            }}>
              {bundle.audience && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#C89B3C', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 8 }}>{bundle.audience}</span>
              )}
              <h3 style={{ font: '400 24px "Libre Caslon Display", serif', margin: '0 0 10px' }}>{bundle.name}</h3>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, flex: 1 }}>{bundle.description}</p>
              {bundle.features && (
                <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0', display: 'grid', gap: 6 }}>
                  {bundle.features.map((f, i) => (
                    <li key={i} style={{ fontSize: 12, color: '#555' }}>✓ {f}</li>
                  ))}
                </ul>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTop: '1px solid #eee' }}>
                <div>
                  <b style={{ fontSize: 26, fontFamily: '"Libre Caslon Display", serif' }}>{money(bundle.price)}</b>
                  <span style={{ fontSize: 11, color: '#888' }}>/mo</span>
                </div>
                <button onClick={() => addBundleToCart(bundle)}
                  style={{ padding: '10px 18px', borderRadius: 6, border: 0, background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', color: '#111', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  Add Bundle
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  );
}