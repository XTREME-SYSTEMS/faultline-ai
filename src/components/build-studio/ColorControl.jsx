import SpectrumPicker from './SpectrumPicker';

export default function ColorControl({ label, presets, value, onChange, showSpectrum }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 200 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <b style={{ fontSize: 12 }}>{label}</b>
        {value && (
          <button onClick={() => onChange('')} style={{
            fontSize: 10, color: '#999', background: 'none', border: '1px solid #ddd',
            borderRadius: 3, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit',
          }}>Reset</button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {presets.map(c => (
          <button key={c} onClick={() => onChange(c)} title={c} style={{
            width: 28, height: 28, borderRadius: 5, background: c,
            border: (value || '').toLowerCase() === c.toLowerCase() ? '3px solid #111' : '1px solid #ddd',
            cursor: 'pointer', padding: 0, transition: 'transform .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'} />
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="color" value={value || '#ffffff'} onChange={e => onChange(e.target.value)}
            style={{ width: 28, height: 28, border: '1px solid #ddd', borderRadius: 5, cursor: 'pointer', padding: 0, background: 'none' }} />
        </label>
        {value && <span style={{ fontSize: 10, color: '#999', fontFamily: 'monospace' }}>{value}</span>}
      </div>
      {showSpectrum && <SpectrumPicker value={value} onChange={onChange} />}
    </div>
  );
}