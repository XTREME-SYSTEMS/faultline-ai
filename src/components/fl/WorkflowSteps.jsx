import { useLocation, Link } from 'react-router-dom';

// The end-to-end FaultLine AI workflow, in order. Each step maps to a route
// (or route prefix) so the active step is highlighted automatically.
const STEPS = [
  { n: 1, label: 'Universal Builder', to: '/app/universal-builder', match: '/app/universal-builder' },
  { n: 2, label: 'Setup Wizard', to: '/app/setup', match: '/app/setup' },
  { n: 2, label: 'Discovery Engine', to: '/app/discovery-engine', match: '/app/discovery-engine' },
  { n: 3, label: 'Scan & Clone', to: '/app', match: '/app/companies' },
  { n: 4, label: 'Repair Board', to: '/app', match: '/repair-board' },
  { n: 5, label: 'Industry Opportunities', to: '/app/industry-opportunities', match: '/app/industry-opportunities' },
  { n: 6, label: 'Deliverable Studio', to: '/app/deliverable-studio', match: '/app/deliverable-studio' },
  { n: 7, label: 'Client Setup', to: '/app/client-setup', match: '/app/client-setup' },
  { n: 8, label: 'Demo Portal', to: '/app/demo-portal', match: '/app/demo-portal' },
  { n: 9, label: 'Trends', to: '/app/trends', match: '/app/trends' },
  { n: 10, label: 'AI Control Panel', to: '/app/ai-control', match: '/app/ai-control' }
];

export default function WorkflowSteps() {
  const location = useLocation();
  const path = location.pathname;

  const activeIndex = STEPS.findIndex(s => {
    if (s.match === '/app/companies') return path.includes('/app/companies');
    if (s.match === '/repair-board') return path.includes('/repair-board');
    return path === s.match;
  });
  const active = activeIndex >= 0 ? activeIndex : -1;

  return (
    <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #2b2b2b' }}>
      <small style={{ color: 'var(--gold)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em' }}>
        ✦ Workflow
      </small>
      <p style={{ color: '#888', fontSize: 11, margin: '4px 0 10px', lineHeight: 1.4 }}>
        Follow these steps in order. You're on step {active >= 0 ? active + 1 : '—'}.
      </p>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {STEPS.map((s, i) => {
          const isActive = i === active;
          const isDone = active >= 0 && i < active;
          return (
            <li key={i}>
              <Link
                to={s.to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 8px', borderRadius: 5, fontSize: 12, fontWeight: 600,
                  color: isActive ? '#fff' : isDone ? '#9a9a9a' : '#777',
                  background: isActive ? '#232323' : 'transparent',
                  boxShadow: isActive ? 'inset 3px 0 var(--gold)' : 'none'
                }}
              >
                <span style={{
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                  width: 22, height: 22, borderRadius: '50%', fontSize: 10, fontWeight: 700,
                  border: `1px solid ${isActive ? 'var(--gold)' : isDone ? '#3a3a3a' : '#444'}`,
                  background: isActive ? 'var(--gold)' : isDone ? '#1c1c1c' : 'transparent',
                  color: isActive ? '#111' : isDone ? '#237A4B' : '#888'
                }}>
                  {isDone ? '✓' : i + 1}
                </span>
                <span>{s.label}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}