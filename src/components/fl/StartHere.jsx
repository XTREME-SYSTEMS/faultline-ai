import { useState } from 'react';
import { base44 } from '@/api/base44Client';

const STEPS = [
  {
    key: 'discover',
    title: 'Discover companies',
    desc: 'Tell the engine where to look. It will find real businesses with live websites and add them to your pipeline.',
    tip: 'Tip: start local — a city + industry combo returns the most actionable results.',
    cta: 'Discover now',
    icon: '①'
  },
  {
    key: 'scan',
    title: 'Scan a website',
    desc: 'The scanner reads each company\'s site and flags faults — performance, trust signals, UX gaps, and conversion blockers.',
    tip: 'Scans run automatically on new companies, but you can trigger one manually to see results faster.',
    cta: 'Scan next company',
    icon: '②'
  },
  {
    key: 'review',
    title: 'Review findings',
    desc: 'Each scan produces ranked findings with severity, evidence, and confidence scores so you know what matters most.',
    tip: 'Critical and high-severity findings surface to the top of your dashboard automatically.',
    cta: 'Go to overview',
    icon: '③'
  },
  {
    key: 'report',
    title: 'Generate an executive report',
    desc: 'Turn findings into a shareable report — health score, revenue at risk, and a prioritized repair plan.',
    tip: 'Reports are the deliverable you hand to a client or stakeholder. Generate one once an audit completes.',
    cta: 'Generate report',
    icon: '④'
  },
  {
    key: 'monitor',
    title: 'Set up continuous monitoring',
    desc: 'Schedule re-scans so new faults are caught as the business changes. The orchestrator runs on a cadence you control.',
    tip: 'Monitoring turns a one-time audit into an ongoing operating system for the business.',
    cta: 'Enable monitoring',
    icon: '⑤'
  }
];

export default function StartHere({ companies, audits, receipts, busy, onDiscover, onScanNext, onGenerateReport, onGoOverview }) {
  const [aiBusy, setAiBusy] = useState(false);
  const [advice, setAdvice] = useState(null);

  const completion = {
    discover: companies.length > 0,
    scan: companies.some(c => c.status === 'scanned'),
    review: audits.some(a => a.status === 'completed' || a.status === 'reported'),
    report: audits.some(a => a.status === 'reported'),
    monitor: receipts.some(r => r.system === 'monitoring_orchestrator')
  };

  const completedCount = Object.values(completion).filter(Boolean).length;
  const firstIncomplete = STEPS.find(s => !completion[s.key]);
  const currentStep = firstIncomplete || STEPS[STEPS.length - 1];

  const handleAction = (step) => {
    if (step.key === 'discover') onDiscover();
    else if (step.key === 'scan') onScanNext();
    else if (step.key === 'review') onGoOverview();
    else if (step.key === 'report') onGenerateReport();
    else if (step.key === 'monitor') onGoOverview();
  };

  const getAiAdvice = async () => {
    setAiBusy(true);
    setAdvice(null);
    try {
      const prompt = `You are an onboarding coach for FaultLine AI, a business diagnostic platform.
A user is onboarding. Here is their current state:
- Companies discovered: ${companies.length}
- Companies scanned: ${companies.filter(c => c.status === 'scanned').length}
- Audits completed: ${audits.length}
- Reports generated: ${audits.filter(a => a.status === 'reported').length}
- Pipeline runs: ${receipts.length}

Completed steps: ${Object.entries(completion).filter(([,v]) => v).map(([k]) => k).join(', ') || 'none'}
Current step: ${currentStep.key}

Give ONE short, specific, encouraging sentence (max 18 words) telling them exactly what to do next. No preamble, no quotes.`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      setAdvice(res);
    } catch {
      setAdvice('Start by discovering companies in your target area, then scan the top result.');
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <section style={{
      background: 'radial-gradient(circle at 88% 30%, rgba(200,155,60,.14), transparent 38%), #0a0a0a',
      color: '#fff',
      borderRadius: 14,
      padding: 30,
      marginBottom: 20,
      border: '1px solid #2b2b2b'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 22 }}>
        <div style={{ maxWidth: 620 }}>
          <p className="eyebrow" style={{ color: 'var(--gold2)' }}>Start here</p>
          <h2 style={{ font: '400 34px Libre Caslon Display, serif', margin: '4px 0 10px', letterSpacing: '-.02em' }}>
            Get your first diagnostic in 5 steps
          </h2>
          <p style={{ color: '#aaa', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
            Follow the path below. Each step unlocks the next. Your AI coach will tell you exactly what to do at any point.
          </p>
        </div>
        <div style={{ textAlign: 'center', minWidth: 150 }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            border: '6px solid', borderColor: completedCount === 5 ? '#3a9d6e' : 'var(--gold)',
            display: 'grid', placeItems: 'center', margin: '0 auto 8px',
            background: 'rgba(255,255,255,.04)'
          }}>
            <b style={{ font: '400 30px Libre Caslon Display, serif' }}>{completedCount}<span style={{ color: '#777', fontSize: 16 }}>/5</span></b>
          </div>
          <small style={{ color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em' }}>
            {completedCount === 5 ? 'Onboarding complete' : 'Steps done'}
          </small>
        </div>
      </div>

      {/* AI coach strip */}
      <div style={{
        background: 'rgba(200,155,60,.08)',
        border: '1px solid #59411e',
        borderRadius: 10,
        padding: '14px 18px',
        marginBottom: 22,
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: 22 }}>✦</span>
        <div style={{ flex: 1, minWidth: 220 }}>
          <b style={{ fontSize: 13, color: 'var(--gold2)' }}>AI Coach</b>
          <p style={{ margin: '2px 0 0', fontSize: 14, color: advice ? '#fff' : '#bbb' }}>
            {aiBusy ? 'Thinking…' : advice || `Next up: ${currentStep.title}. ${currentStep.tip}`}
          </p>
        </div>
        <button
          onClick={getAiAdvice}
          disabled={aiBusy}
          style={{
            padding: '9px 16px', borderRadius: 6, border: '1px solid var(--gold)',
            background: 'transparent', color: 'var(--gold2)', fontWeight: 700, fontSize: 13,
            cursor: aiBusy ? 'wait' : 'pointer', fontFamily: 'inherit'
          }}
        >
          {aiBusy ? '…' : 'Coach me →'}
        </button>
      </div>

      {/* Steps */}
      <div style={{ display: 'grid', gap: 10 }}>
        {STEPS.map((step, i) => {
          const done = completion[step.key];
          const isCurrent = step.key === currentStep.key;
          return (
            <div key={step.key} style={{
              display: 'grid',
              gridTemplateColumns: '44px 1fr auto',
              gap: 16,
              alignItems: 'center',
              padding: '16px 18px',
              borderRadius: 10,
              background: done ? 'rgba(58,157,110,.1)' : isCurrent ? 'rgba(200,155,60,.12)' : 'rgba(255,255,255,.03)',
              border: `1px solid ${done ? '#2a5a44' : isCurrent ? 'var(--gold)' : '#2b2b2b'}`,
              transition: 'all .2s'
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                display: 'grid', placeItems: 'center',
                background: done ? '#3a9d6e' : isCurrent ? 'var(--gold)' : '#1b1b1b',
                color: done || isCurrent ? '#111' : '#888',
                font: '700 15px DM Sans, sans-serif',
                border: done || isCurrent ? 'none' : '1px solid #333'
              }}>
                {done ? '✓' : i + 1}
              </div>
              <div>
                <b style={{ fontSize: 15, color: done ? '#9ad8b6' : '#fff' }}>{step.title}</b>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: '#aaa', lineHeight: 1.5 }}>{step.desc}</p>
                {!done && isCurrent && (
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--gold2)', fontStyle: 'italic' }}>{step.tip}</p>
                )}
              </div>
              <button
                onClick={() => handleAction(step)}
                disabled={!!busy || (step.key === 'scan' && !companies.some(c => c.status === 'discovered')) || (step.key === 'report' && !audits.some(a => a.status === 'completed'))}
                style={{
                  padding: '10px 18px', borderRadius: 6, fontFamily: 'inherit', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer',
                  background: done ? 'transparent' : isCurrent ? 'var(--gold)' : '#1b1b1b',
                  color: done ? '#9ad8b6' : isCurrent ? '#111' : '#ddd',
                  border: done ? '1px solid #2a5a44' : isCurrent ? 'none' : '1px solid #333',
                  opacity: (!!busy) ? .6 : 1
                }}
              >
                {done ? '✓ Done' : busy && busy.includes(step.key) ? 'Working…' : step.cta}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}