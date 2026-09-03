import { useState } from 'react';
import { POTENTIAL_CAPABILITIES } from '@/lib/potentialCapabilities';
import { Sparkles, ChevronDown, ChevronRight, Lightbulb } from 'lucide-react';

const CATEGORY_COLORS = {
  Reliability: '#237A4B',
  Security: '#C63D34',
  Discovery: '#2563eb',
  Content: '#7c3aed',
  Validation: '#B88214',
  Growth: '#059669',
  Architecture: '#6366f1',
  Business: '#C89B3C',
  Marketing: '#ec4899',
  Operations: '#0ea5e9',
  Intelligence: '#8b5cf6',
  Performance: '#f59e0b',
  Interface: '#14b8a6',
  AI: '#7c3aed',
  Data: '#3b82f6',
  Infrastructure: '#64748b',
  Strategy: '#8B4513',
  Integration: '#2563eb',
};

export default function PotentialCapabilitiesList() {
  const [expanded, setExpanded] = useState({});
  const [filter, setFilter] = useState('All');

  const categories = ['All', ...new Set(POTENTIAL_CAPABILITIES.map(c => c.category))];
  const filtered = filter === 'All'
    ? POTENTIAL_CAPABILITIES
    : POTENTIAL_CAPABILITIES.filter(c => c.category === filter);

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: filter === cat ? '#0a0a0a' : '#fff',
              color: filter === cat ? '#E7C86E' : '#666',
              border: `1px solid ${filter === cat ? '#0a0a0a' : '#ddd'}`,
              cursor: 'pointer',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Capability cards */}
      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.map(cap => {
          const isOpen = expanded[cap.id];
          const color = CATEGORY_COLORS[cap.category] || '#666';
          return (
            <div key={cap.id} style={{
              background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, overflow: 'hidden',
            }}>
              <button
                onClick={() => setExpanded(prev => ({ ...prev, [cap.id]: !prev[cap.id] }))}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', background: 'none', border: 0, cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: `${color}15`, display: 'grid', placeItems: 'center',
                }}>
                  <Sparkles size={16} style={{ color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{cap.name}</b>
                    <span style={{
                      padding: '2px 7px', borderRadius: 10, fontSize: 9, fontWeight: 600,
                      background: `${color}15`, color,
                    }}>
                      {cap.category}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: '#888', margin: '3px 0 0', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cap.description}
                  </p>
                </div>
                {isOpen ? <ChevronDown size={16} style={{ color: '#999' }} /> : <ChevronRight size={16} style={{ color: '#999' }} />}
              </button>

              {isOpen && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f0f0f0' }}>
                  <p style={{ fontSize: 12, color: '#555', lineHeight: 1.6, margin: '12px 0 12px' }}>
                    {cap.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Lightbulb size={13} style={{ color: '#C89B3C' }} />
                    <b style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: '#8A641C' }}>
                      3 Examples of How It Helps
                    </b>
                  </div>
                  <ol style={{ margin: '0 0 0 18px', padding: 0, display: 'grid', gap: 8 }}>
                    {cap.examples.map((ex, i) => (
                      <li key={i} style={{ fontSize: 12, color: '#555', lineHeight: 1.6, paddingLeft: 4 }}>
                        {ex}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}