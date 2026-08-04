import { fulfillment } from './registryData';

const STATUS_COLORS = {
  'MVP': '#237A4B',
  'Growth': '#B88214',
  'PLANNED': '#73777F'
};

export default function FulfillmentFlow() {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, margin: '0 0 4px' }}>Fulfillment Operating Model</h3>
        <p style={{ fontSize: 13, color: '#666', margin: 0 }}>19-step managed automation workflow from purchase through launch.</p>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {fulfillment.map((step, i) => (
          <div key={step.step_id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
            background: '#fff', border: '1px solid #e5e1da', borderRadius: 8
          }}>
            <div style={{
              flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
              background: i === 0 ? '#D4AF37' : '#f4f1eb', color: i === 0 ? '#111' : '#666',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700
            }}>
              {step.sequence / 10}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <b style={{ fontSize: 14 }}>{step.stage}</b>
                <span style={{ fontSize: 10, fontWeight: 700, color: STATUS_COLORS[step.release] || '#73777F', textTransform: 'uppercase', letterSpacing: '.08em' }}>{step.release}</span>
              </div>
              <p style={{ fontSize: 12, color: '#666', margin: '4px 0 0' }}>{step.output}</p>
              <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap', fontSize: 11, color: '#999' }}>
                <span>⚡ {step.automation}</span>
                <span>🚦 {step.human_gate}</span>
                <span>⏱ {step.target_sla}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}