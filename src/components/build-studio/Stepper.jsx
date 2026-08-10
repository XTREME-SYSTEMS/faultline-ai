import { Fragment } from 'react';
import { STEPS } from './options';

export default function Stepper({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', maxWidth: 820, margin: '0 auto 28px' }}>
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <Fragment key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center',
                background: active ? '#C89B3C' : done ? '#237A4B' : '#fff',
                color: active || done ? '#fff' : '#999',
                border: `2px solid ${active ? '#C89B3C' : done ? '#237A4B' : '#ddd'}`,
                fontSize: 12, fontWeight: 700,
              }}>{done ? '✓' : i + 1}</div>
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: active || done ? '#111' : '#999', whiteSpace: 'nowrap',
              }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 12px', minWidth: 16,
                background: done ? '#C89B3C' : '#ddd',
              }} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}