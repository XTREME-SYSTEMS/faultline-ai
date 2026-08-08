import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Layers, Loader2, Globe, Smartphone, Zap, ExternalLink, RefreshCw, Rocket } from 'lucide-react';

export default function CloneQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(null);

  const load = useCallback(async () => {
    try {
      const q = await base44.entities.BuildQueueItem.filter({ status: 'queued' }, '-created_date', 100);
      setQueue(q || []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    let unsub = () => {};
    try { unsub = base44.entities.BuildQueueItem.subscribe(() => load()); } catch (e) {}
    return unsub;
  }, [load]);

  const launchNow = async (item) => {
    setLaunching(item.id);
    try {
      const target = item.input?.target_url;
      const name = item.input?.business_name || item.name;
      if (!target) return;
      await base44.functions.invoke('autonomousCloneTo100', {
        target_url: target,
        business_name: name,
        industry: item.industry || 'general',
        max_iterations: 5
      });
      setTimeout(() => load(), 2000);
    } catch (e) {
      console.error('Launch failed:', e);
    } finally {
      setLaunching(null);
    }
  };

  if (loading) return (
    <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
      <Loader2 size={18} className="animate-spin" style={{ margin: '0 auto 6px' }} />
      <div style={{ fontSize: 12 }}>Loading clone queue…</div>
    </div>
  );

  const urgent = queue.filter(q => q.priority === 'urgent');
  const high = queue.filter(q => q.priority === 'high');
  const normal = queue.filter(q => q.priority === 'normal' || !q.priority);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
        <div style={{ background: '#f4f1ea', border: '1px solid #d9c8aa', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <b style={{ fontSize: 24, fontFamily: 'Libre Caslon Display, serif', color: '#8A641C', display: 'block' }}>{queue.length}</b>
          <small style={{ fontSize: 10, color: '#8A641C', textTransform: 'uppercase', letterSpacing: '.08em' }}>Queued</small>
        </div>
        <div style={{ background: '#f5d8d5', border: '1px solid #e5c5c0', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <b style={{ fontSize: 24, fontFamily: 'Libre Caslon Display, serif', color: '#a52d23', display: 'block' }}>{urgent.length}</b>
          <small style={{ fontSize: 10, color: '#a52d23', textTransform: 'uppercase', letterSpacing: '.08em' }}>Urgent</small>
        </div>
        <div style={{ background: '#f8e5ce', border: '1px solid #e8d4b5', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <b style={{ fontSize: 24, fontFamily: 'Libre Caslon Display, serif', color: '#a85c00', display: 'block' }}>{high.length}</b>
          <small style={{ fontSize: 10, color: '#a85c00', textTransform: 'uppercase', letterSpacing: '.08em' }}>High Priority</small>
        </div>
        <div style={{ background: '#e6f4ec', border: '1px solid #c3e0cc', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <b style={{ fontSize: 24, fontFamily: 'Libre Caslon Display, serif', color: '#237A4B', display: 'block' }}>6h</b>
          <small style={{ fontSize: 10, color: '#237A4B', textTransform: 'uppercase', letterSpacing: '.08em' }}>Auto-Cycle</small>
        </div>
      </div>

      {queue.length === 0 ? (
        <div style={{ padding: 20, border: '1px dashed #ddd', borderRadius: 8, color: '#888', fontSize: 12, textAlign: 'center' }}>
          Queue is empty — all discovered targets have been processed. Run the Wealth Discovery Engine to find more.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {queue.map(item => {
            const target = item.input?.target_url;
            const isUrgent = item.priority === 'urgent';
            const isApp = item.build_type === 'app';
            return (
              <div key={item.id} style={{ background: '#fff', border: `1px solid ${isUrgent ? '#e5c5c0' : '#e5e1da'}`, borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <b style={{ fontSize: 13, lineHeight: 1.3 }}>{item.name.replace('Wealth Clone: ', '')}</b>
                  {target && <a href={target} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)', flexShrink: 0 }}><ExternalLink size={14} /></a>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, background: isUrgent ? '#f5d8d5' : '#f8e5ce', color: isUrgent ? '#a52d23' : '#a85c00', padding: '2px 8px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
                    {isUrgent ? <Zap size={9} /> : null} {item.priority || 'normal'}
                  </span>
                  <span style={{ fontSize: 10, background: '#f4f1ea', color: '#8A641C', padding: '2px 8px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
                    {isApp ? <Smartphone size={9} /> : <Globe size={9} />} {item.build_type || 'website'}
                  </span>
                  {item.input?.wealth_score && (
                    <span style={{ fontSize: 10, background: '#e6f4ec', color: '#237A4B', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                      ★ {item.input.wealth_score}
                    </span>
                  )}
                </div>
                {item.input?.target_billionaire && (
                  <small style={{ fontSize: 10, color: '#888' }}>Target: {item.input.target_billionaire}</small>
                )}
                <button
                  onClick={() => launchNow(item)}
                  disabled={launching === item.id}
                  style={{ marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 6, background: launching === item.id ? '#ccc' : '#0b0b0b', color: '#fff', fontSize: 12, fontWeight: 700, border: 0, cursor: launching === item.id ? 'wait' : 'pointer', fontFamily: 'inherit' }}
                >
                  {launching === item.id ? <><Loader2 size={14} className="animate-spin" /> Cloning…</> : <><Rocket size={14} /> Clone Now</>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}