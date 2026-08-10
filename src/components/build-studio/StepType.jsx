import { Globe, Cpu, Layers, Wrench } from 'lucide-react';
import { APP_TYPES } from './options';

export default function StepType({ form, update, next }) {
  const types = [
    { id: 'website', label: 'Website', icon: Globe, desc: 'Marketing site, landing page, portfolio, blog' },
    { id: 'app', label: 'App', icon: Cpu, desc: 'Dashboard, CRM, booking, inventory, POS' },
    { id: 'system', label: 'System', icon: Layers, desc: 'Multi-page system, portal, workflow tool' },
    { id: 'tool', label: 'Tool', icon: Wrench, desc: 'Single-purpose utility, calculator, converter' },
  ];

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {types.map(t => (
          <button key={t.id} onClick={() => update('buildType', t.id)} style={{
            padding: 28, borderRadius: 12,
            border: `2px solid ${form.buildType === t.id ? '#C89B3C' : '#ddd'}`,
            background: form.buildType === t.id ? '#C89B3C10' : '#fff',
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            transition: 'all .15s',
          }}>
            <t.icon size={32} style={{ color: form.buildType === t.id ? '#C89B3C' : '#666' }} />
            <b style={{ display: 'block', fontSize: 22, fontFamily: "'Libre Caslon Display', serif", margin: '12px 0 4px' }}>{t.label}</b>
            <small style={{ fontSize: 13, color: '#888' }}>{t.desc}</small>
          </button>
        ))}
      </div>

      {form.buildType === 'app' && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>Choose App Type</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {APP_TYPES.map(t => (
              <button key={t.id} onClick={() => update('appType', t.id)} style={{
                padding: 14, borderRadius: 8,
                border: `2px solid ${form.appType === t.id ? '#C89B3C' : '#e5e1da'}`,
                background: form.appType === t.id ? '#C89B3C10' : '#fff',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                display: 'flex', gap: 10, alignItems: 'start',
              }}>
                <span style={{ fontSize: 20 }}>{t.icon}</span>
                <div>
                  <b style={{ fontSize: 12, display: 'block' }}>{t.label}</b>
                  <small style={{ fontSize: 10, color: '#888' }}>{t.desc}</small>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={next} style={{
        background: '#0a0a0a', color: '#fff', border: 0, borderRadius: 8,
        padding: '14px 40px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
      }}>Continue →</button>
    </div>
  );
}