import { useEffect, useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Clock, Zap, TrendingUp, Loader2, Square } from 'lucide-react';

const STAGE_LABELS = {
  queued: 'Queued', generating: 'Generating', provisioning: 'Provisioning',
  validating: 'Validating', testing: 'Testing', retrying: 'Retrying',
  passed: 'Passed', failed: 'Failed', cancelled: 'Cancelled'
};

function fmtTime(secs) {
  if (secs < 60) return `${Math.round(secs)}s`;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}m ${s}s`;
}

export default function PipelineProgress({ project }) {
  const [proj, setProj] = useState(project);
  const [now, setNow] = useState(Date.now());
  const [stopping, setStopping] = useState(false);

  const handleStop = async () => {
    setStopping(true);
    try {
      await base44.entities.LaunchProject.update(project.id, {
        status: 'cancelled',
        last_validation_summary: 'Cancelled by user'
      });
      setProj(prev => ({ ...prev, status: 'cancelled', last_validation_summary: 'Cancelled by user' }));
    } catch (e) { console.error('Stop failed:', e); }
    finally { setStopping(false); }
  };

  useEffect(() => {
    setProj(project);
    const poll = setInterval(async () => {
      try {
        const p = await base44.entities.LaunchProject.get(project.id);
        if (p) setProj(p);
      } catch (e) { /* ignore */ }
      setNow(Date.now());
    }, 3000);
    let unsub = () => {};
    try {
      unsub = base44.entities.LaunchProject.subscribe((event) => {
        if (event?.data?.id === project.id) setProj(event.data);
      });
    } catch (e) { /* subscribe not available */ }
    return () => { clearInterval(poll); unsub(); };
  }, [project.id]);

  const history = proj?.metadata?.progress_history || [];
  const progress = proj?.progress || 0;
  const stage = proj?.last_validation_summary || 'Starting…';
  const status = proj?.status || 'queued';
  const isDone = status === 'passed' || status === 'failed' || status === 'cancelled';

  const chartData = useMemo(() => {
    if (history.length === 0) return [{ t: 0, p: 0 }];
    const firstTs = history[0].ts;
    return history.map(h => ({ t: Math.max(0, Math.round((h.ts - firstTs) / 1000)), p: h.progress }));
  }, [history]);

  const elapsed = history.length > 0 ? (now - history[0].ts) / 1000 : 0;
  const speedPerMin = useMemo(() => {
    if (chartData.length < 2) return 0;
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    const dtMin = (last.t - first.t) / 60;
    return dtMin > 0 ? (last.p - first.p) / dtMin : 0;
  }, [chartData]);
  const etaMin = progress < 100 && speedPerMin > 0 ? (100 - progress) / speedPerMin : 0;
  const progressColor = progress >= 100 ? '#237A4B' : progress >= 60 ? '#C89B3C' : '#8A641C';

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, gridColumn: 'span 2' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <b style={{ fontSize: 13, lineHeight: 1.3 }}>{proj?.project_name || 'Pipeline'}</b>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: isDone ? (status === 'passed' ? '#e6f4ec' : '#f5d8d5') : '#f8e5ce', color: isDone ? (status === 'passed' ? '#237A4B' : '#a52d23') : '#8A641C', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {!isDone && <Loader2 size={10} className="animate-spin" />}
              {STAGE_LABELS[status] || status}
            </span>
            <small style={{ fontSize: 11, color: '#888' }}>{stage}</small>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <b style={{ font: '400 32px Libre Caslon Display, serif', color: progressColor, lineHeight: 1 }}>{Math.round(progress)}<span style={{ fontSize: 16, color: '#aaa' }}>%</span></b>
          {!isDone && (
            <button onClick={handleStop} disabled={stopping} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 5, fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: stopping ? 'wait' : 'pointer', background: stopping ? '#ccc' : '#a52d23', color: '#fff', border: 0 }}>
              {stopping ? <Loader2 size={11} className="animate-spin" /> : <Square size={11} />} Stop
            </button>
          )}
        </div>
      </div>

      <div style={{ height: 8, background: '#f0ede5', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, #E7C86E, ${progressColor})`, transition: 'width 0.5s ease', borderRadius: 4 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div style={{ padding: 10, background: '#f8f7f4', borderRadius: 6, border: '1px solid #eee' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#888', marginBottom: 4 }}><Clock size={11} /> Elapsed</div>
          <b style={{ fontSize: 14 }}>{fmtTime(elapsed)}</b>
        </div>
        <div style={{ padding: 10, background: '#f8f7f4', borderRadius: 6, border: '1px solid #eee' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#888', marginBottom: 4 }}><Zap size={11} /> Speed</div>
          <b style={{ fontSize: 14 }}>{speedPerMin > 0 ? `${speedPerMin.toFixed(1)}%/min` : '—'}</b>
        </div>
        <div style={{ padding: 10, background: '#f8f7f4', borderRadius: 6, border: '1px solid #eee' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#888', marginBottom: 4 }}><TrendingUp size={11} /> ETA</div>
          <b style={{ fontSize: 14 }}>{etaMin > 0 ? `~${fmtTime(etaMin * 60)}` : isDone ? 'Done' : '—'}</b>
        </div>
      </div>

      <div style={{ height: 140, marginTop: 4 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="progressGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C89B3C" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#C89B3C" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#999' }} tickFormatter={(v) => `${v}s`} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#999' }} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #ddd' }}
              labelFormatter={(v) => `${v}s elapsed`}
              formatter={(v) => [`${v}%`, 'Progress']}
            />
            <Area type="monotone" dataKey="p" stroke="#C89B3C" strokeWidth={2} fill="url(#progressGrad)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}