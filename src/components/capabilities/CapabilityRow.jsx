import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Play, Wrench, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

const STATUS_CONFIG = {
  validated: { color: '#237A4B', bg: '#e8f5ec', label: 'Validated', icon: CheckCircle2 },
  implemented: { color: '#2563eb', bg: '#e8f1fd', label: 'Implemented', icon: CheckCircle2 },
  discovered: { color: '#B88214', bg: '#fdf3e0', label: 'Discovered', icon: ChevronRight },
  not_discovered: { color: '#999', bg: '#f5f5f5', label: 'Not Discovered', icon: XCircle },
  partial: { color: '#B88214', bg: '#fdf3e0', label: 'Partial', icon: ChevronDown },
  blocked: { color: '#C63D34', bg: '#f5d8d5', label: 'Blocked', icon: XCircle },
  modeled: { color: '#7c3aed', bg: '#f0e9fd', label: 'Modeled', icon: ChevronRight },
  not_applicable_with_proof: { color: '#666', bg: '#f0f0f0', label: 'N/A (Proof)', icon: CheckCircle2 },
};

export default function CapabilityRow({ cap, onTest, onFix, testingId, fixingId, testResult, fixResult }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[cap.status] || STATUS_CONFIG.not_discovered;
  const Icon = cfg.icon;
  const isTesting = testingId === cap.capability_id;
  const isFixing = fixingId === cap.capability_id;
  const score = cap.score || 0;

  return (
    <div style={{ borderBottom: '1px solid #eee' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
        {/* Score circle */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          border: `3px solid ${score >= 100 ? '#237A4B' : score >= 50 ? '#C89B3C' : '#C63D34'}`,
          display: 'grid', placeItems: 'center',
          background: score >= 100 ? '#e8f5ec' : score >= 50 ? '#fdf3e0' : '#f5d8d5',
        }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: score >= 100 ? '#237A4B' : score >= 50 ? '#8A641C' : '#a52d23' }}>
            {score}
          </span>
        </div>

        {/* Name + category */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <b style={{ fontSize: 13 }}>{cap.capability_name || cap.capability_id}</b>
            <span style={{
              padding: '2px 7px', borderRadius: 10, fontSize: 9, fontWeight: 600,
              background: cfg.bg, color: cfg.color, display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>
              <Icon size={10} /> {cfg.label}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 3, fontSize: 11, color: '#888' }}>
            <span>{cap.capability_category}</span>
            <span>·</span>
            <span>{cap.capability_id}</span>
            {cap.auth_requirement && cap.auth_requirement !== 'none' && (
              <>
                <span>·</span>
                <span style={{ color: '#B88214' }}>Auth: {cap.auth_requirement}</span>
              </>
            )}
          </div>
        </div>

        {/* Test + Fix buttons */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => onTest(cap)}
            disabled={isTesting}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
              background: isTesting ? '#f5f5f5' : '#fff', border: '1px solid #ddd',
              borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: isTesting ? 'wait' : 'pointer',
              color: '#2563eb',
            }}
          >
            {isTesting ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
            {isTesting ? 'Testing...' : 'Test'}
          </button>
          <button
            onClick={() => onFix(cap)}
            disabled={isFixing}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
              background: isFixing ? '#f5f5f5' : '#fff', border: '1px solid #ddd',
              borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: isFixing ? 'wait' : 'pointer',
              color: '#C89B3C',
            }}
          >
            {isFixing ? <Loader2 size={13} className="animate-spin" /> : <Wrench size={13} />}
            {isFixing ? 'Fixing...' : 'Auto-Fix'}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: '7px 8px', background: 'none', border: '1px solid #ddd',
              borderRadius: 6, cursor: 'pointer', color: '#888',
            }}
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        </div>
      </div>

      {/* Test/Fix result banner */}
      {testResult && (
        <div style={{ margin: '0 16px 10px', padding: '10px 14px', borderRadius: 6,
          background: testResult.status === 'pass' ? '#e8f5ec' : '#f5d8d5',
          border: `1px solid ${testResult.status === 'pass' ? '#237A4B' : '#C63D34'}`,
          fontSize: 12,
        }}>
          <b style={{ color: testResult.status === 'pass' ? '#237A4B' : '#a52d23' }}>
            Test Result: {testResult.status === 'pass' ? 'PASSED' : 'FAILED'}
          </b>
          <p style={{ margin: '4px 0 0', color: '#555' }}>{testResult.message}</p>
        </div>
      )}
      {fixResult && (
        <div style={{ margin: '0 16px 10px', padding: '10px 14px', borderRadius: 6,
          background: '#fdf3e0', border: '1px solid #C89B3C', fontSize: 12,
        }}>
          <b style={{ color: '#8A641C' }}>Auto-Fix Applied</b>
          <p style={{ margin: '4px 0 0', color: '#555' }}>{fixResult.message}</p>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: '0 16px 14px', fontSize: 12, color: '#555', lineHeight: 1.6 }}>
          {cap.source_observable_behavior && (
            <p style={{ margin: '0 0 6px' }}><b>Source Behavior:</b> {cap.source_observable_behavior}</p>
          )}
          {cap.clone_implementation && (
            <p style={{ margin: '0 0 6px' }}><b>Clone Implementation:</b> {cap.clone_implementation}</p>
          )}
          {cap.frontend && <p style={{ margin: '0 0 6px' }}><b>Frontend:</b> {cap.frontend}</p>}
          {cap.api && <p style={{ margin: '0 0 6px' }}><b>API:</b> {cap.api}</p>}
          {cap.data_model && <p style={{ margin: '0 0 6px' }}><b>Data Model:</b> {cap.data_model}</p>}
          {cap.defects && cap.defects.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <b>Defects ({cap.defects.length}):</b>
              <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                {cap.defects.map((d, i) => <li key={i} style={{ color: '#C63D34' }}>{d}</li>)}
              </ul>
            </div>
          )}
          {cap.tests && cap.tests.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <b>Tests:</b>
              <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                {cap.tests.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
          {cap.last_validated && (
            <p style={{ margin: '6px 0 0', fontSize: 11, color: '#999' }}>
              Last validated: {new Date(cap.last_validated).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}