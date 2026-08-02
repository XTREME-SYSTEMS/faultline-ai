import { useState } from 'react';

const TYPE_ICONS = {
  website: '🌐', crm: '👥', billing: '💳', scheduling: '📅', inventory: '📦',
  communications: '📧', support: '🎧', marketing: '📢', analytics: '📊',
  documents: '📄', hr: '👤', other: '⚙️'
};

const STATUS_COLORS = {
  healthy: { bg: '#1a3a2a', border: '#237A4B', text: '#4ade80' },
  at_risk: { bg: '#3a2a1a', border: '#B88214', text: '#fbbf24' },
  critical: { bg: '#3a1a1a', border: '#C63D34', text: '#f87171' }
};

export default function SystemMap({ nodes, edges, onSelect, selectedId }) {
  const [hoveredId, setHoveredId] = useState(null);

  if (!nodes || nodes.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#888', border: '1px dashed #333', borderRadius: 12 }}>
        <p style={{ fontSize: 40, margin: '0 0 12px' }}>🗺️</p>
        <p style={{ fontSize: 15 }}>No system map yet. Run the cloner to generate one.</p>
      </div>
    );
  }

  const nodeMap = {};
  nodes.forEach((n, i) => { nodeMap[n.id] = { ...n, index: i }; });

  return (
    <div>
      {/* Visual map */}
      <div style={{
        position: 'relative', padding: '30px', borderRadius: 12,
        background: 'radial-gradient(circle at 50% 50%, rgba(200,155,60,.06), transparent 70%), #0d0d0d',
        border: '1px solid #2b2b2b', minHeight: 340, overflow: 'hidden'
      }}>
        {/* Edges as labels */}
        {edges && edges.length > 0 && (
          <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 12, fontSize: 11, zIndex: 5 }}>
            {edges.map((e, i) => {
              const src = nodeMap[e.source_node_id];
              const tgt = nodeMap[e.target_node_id];
              if (!src || !tgt) return null;
              const color = e.risk_status === 'broken' ? '#C63D34' : e.risk_status === 'friction' ? '#B88214' : '#237A4B';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#999' }}>
                  <span style={{ width: 16, height: 2, background: color, borderRadius: 2 }} />
                  {e.risk_status}
                </div>
              );
            }).slice(0, 3)}
          </div>
        )}

        {/* Nodes in a grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(nodes.length, 4)}, 1fr)`,
          gap: 14, position: 'relative', zIndex: 2
        }}>
          {nodes.map((node) => {
            const colors = STATUS_COLORS[node.health_status] || STATUS_COLORS.healthy;
            const isSelected = selectedId === node.id;
            const isHovered = hoveredId === node.id;
            const connectedEdges = edges?.filter(e => e.source_node_id === node.id || e.target_node_id === node.id) || [];

            return (
              <div
                key={node.id}
                onClick={() => onSelect?.(node.id)}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  cursor: 'pointer', padding: '16px 14px', borderRadius: 10,
                  background: colors.bg, border: `2px solid ${isSelected ? 'var(--gold)' : colors.border}`,
                  transition: 'all .2s', transform: isSelected || isHovered ? 'translateY(-3px)' : 'none',
                  boxShadow: isSelected ? '0 0 0 1px var(--gold), 0 8px 24px rgba(0,0,0,.4)' : '0 4px 12px rgba(0,0,0,.3)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{TYPE_ICONS[node.node_type] || '⚙️'}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', flex: 1, lineHeight: 1.3 }}>{node.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10 }}>
                  <span style={{ color: colors.text, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                    {node.health_status?.replace('_', ' ')}
                  </span>
                  {node.leak_points?.length > 0 && (
                    <span style={{ color: '#C63D34', fontWeight: 600 }}>
                      {node.leak_points.length} leak{node.leak_points.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {connectedEdges.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #ffffff15', fontSize: 9, color: '#888' }}>
                    ↔ {connectedEdges.length} connection{connectedEdges.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edge list */}
      {edges && edges.length > 0 && (
        <div style={{ marginTop: 16, padding: 18, background: '#111', border: '1px solid #2b2b2b', borderRadius: 10 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--gold2)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Data Flow Connections</h4>
          <div style={{ display: 'grid', gap: 8 }}>
            {edges.map((e, i) => {
              const src = nodeMap[e.source_node_id];
              const tgt = nodeMap[e.target_node_id];
              if (!src || !tgt) return null;
              const color = e.risk_status === 'broken' ? '#C63D34' : e.risk_status === 'friction' ? '#B88214' : '#237A4B';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, padding: '8px 12px', background: '#161616', borderRadius: 6, borderLeft: `3px solid ${color}` }}>
                  <span style={{ color: '#ccc', fontWeight: 600 }}>{src.name}</span>
                  <span style={{ color: '#666' }}>→</span>
                  <span style={{ color: '#ccc', fontWeight: 600 }}>{tgt.name}</span>
                  <span style={{ marginLeft: 'auto', color, fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>{e.risk_status}</span>
                  <span style={{ color: '#888', fontSize: 11 }}>{e.relationship}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}