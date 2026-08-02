import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PortalShell from '@/components/fl/PortalShell';
import PageHead from '@/components/fl/PageHead';
import SystemMap from '@/components/fl/SystemMap';
import PageCoach from '@/components/fl/PageCoach';

export default function SystemClone() {
  const { id: companyId } = useParams();
  const [company, setCompany] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      try {
        const comp = await base44.entities.Company.get(companyId);
        setCompany(comp);
        const [n, e, f] = await Promise.all([
          base44.entities.SystemNode.filter({ company_id: companyId }),
          base44.entities.SystemEdge.filter({ organization_id: comp.organization_id }),
          base44.entities.Finding.filter({ organization_id: comp.organization_id })
        ]);
        setNodes(n);
        const nodeIds = new Set(n.map(x => x.id));
        setEdges(e.filter(edge => nodeIds.has(edge.source_node_id) || nodeIds.has(edge.target_node_id)));
        setFindings(f);
      } catch (err) {
        setMsg({ type: 'error', text: err.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId]);

  const cloneSystem = async () => {
    setCloning(true);
    setMsg(null);
    try {
      const res = await fetch('/api/functions/mapCompanySystems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setMsg({ type: 'success', text: `System cloned! ${data.nodes?.length || 0} systems mapped, ${data.leak_point_count || 0} leak points identified.` });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setCloning(false);
    }
  };

  const runDeepScan = async () => {
    setScanning(true);
    setMsg(null);
    try {
      const res = await fetch('/api/functions/deepSecurityScan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const updatedFindings = await base44.entities.Finding.filter({ organization_id: company.organization_id });
      setFindings(updatedFindings);
      setMsg({ type: 'success', text: `Deep security scan complete! ${data.findings_created} new findings.` });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setScanning(false);
    }
  };

  const totalLeaks = nodes.reduce((sum, n) => sum + (n.leak_points?.length || 0), 0);
  const criticalNodes = nodes.filter(n => n.health_status === 'critical').length;
  const atRiskNodes = nodes.filter(n => n.health_status === 'at_risk').length;
  const securityFindings = findings.filter(f => f.category === 'security');

  const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null;

  const coachContext = {
    company_name: company?.name,
    node_count: nodes.length,
    edge_count: edges.length,
    total_leaks: totalLeaks,
    critical_nodes: criticalNodes,
    at_risk_nodes: atRiskNodes,
    security_findings: securityFindings.length,
    nodes: nodes.map(n => ({ name: n.name, type: n.node_type, health: n.health_status, leaks: n.leak_points, ai_enhancement: n.ai_enhancement })),
    edges: edges.map(e => ({ relationship: e.relationship, risk: e.risk_status }))
  };

  if (loading) return <PortalShell><div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading…</div></PortalShell>;

  return (
    <PortalShell assistant={<PageCoach pageKey="system-clone" context={coachContext} title="System Clone Coach" />}>
      <PageHead
        eyebrow="System Clone for AI Enhancement"
        title={`${company?.name || 'Company'} — System Map`}
        text="We've cloned this company's operational systems. Each node shows leak points and AI enhancement opportunities — use this to show them exactly where we can fix gaps and boost performance."
        onAction={cloneSystem}
        actionLabel={cloning ? 'Cloning…' : '↻ Clone System'}
      />

      {msg && (
        <div style={{
          padding: '14px 18px', borderRadius: 10, marginBottom: 16, fontSize: 14, fontWeight: 600,
          background: msg.type === 'success' ? 'rgba(35,122,75,.15)' : 'rgba(198,61,52,.15)',
          border: `1px solid ${msg.type === 'success' ? '#237A4B' : '#C63D34'}`,
          color: msg.type === 'success' ? '#4ade80' : '#f87171'
        }}>
          {msg.text}
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={cloneSystem} disabled={cloning} className="btn dark" style={{ fontSize: 13, padding: '11px 18px', opacity: cloning ? .6 : 1 }}>
          {cloning ? '⏳ Cloning system…' : '🔄 Clone System Map'}
        </button>
        <button onClick={runDeepScan} disabled={scanning} className="btn outline" style={{ fontSize: 13, padding: '11px 18px', background: 'none', borderColor: '#C63D34', color: '#f87171', opacity: scanning ? .6 : 1 }}>
          {scanning ? '⏳ Scanning…' : '🛡️ Deep Security Scan'}
        </button>
        <Link to={`/app/companies/${companyId}`} className="btn outline" style={{ fontSize: 13, padding: '11px 18px', background: 'none', borderColor: '#555', color: '#ccc' }}>
          ← Back to Company
        </Link>
        {company && (
          <a href={`/portal/${companyId}`} target="_blank" rel="noopener noreferrer" className="btn gold" style={{ fontSize: 13, padding: '11px 18px', marginLeft: 'auto' }}>
            Open Client Portal →
          </a>
        )}
      </div>

      {/* Summary metrics */}
      {nodes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #ddd', padding: 18, borderRadius: 8 }}>
            <span style={{ fontSize: 10, color: '#777', textTransform: 'uppercase', letterSpacing: '.1em' }}>Systems Mapped</span>
            <b style={{ display: 'block', fontSize: 30, fontFamily: "'Libre Caslon Display', serif", margin: '6px 0' }}>{nodes.length}</b>
          </div>
          <div style={{ background: '#fff', border: '1px solid #ddd', padding: 18, borderRadius: 8 }}>
            <span style={{ fontSize: 10, color: '#C63D34', textTransform: 'uppercase', letterSpacing: '.1em' }}>Leak Points</span>
            <b style={{ display: 'block', fontSize: 30, fontFamily: "'Libre Caslon Display', serif", margin: '6px 0', color: '#C63D34' }}>{totalLeaks}</b>
          </div>
          <div style={{ background: '#fff', border: '1px solid #ddd', padding: 18, borderRadius: 8 }}>
            <span style={{ fontSize: 10, color: '#B88214', textTransform: 'uppercase', letterSpacing: '.1em' }}>At Risk / Critical</span>
            <b style={{ display: 'block', fontSize: 30, fontFamily: "'Libre Caslon Display', serif", margin: '6px 0', color: '#B88214' }}>{atRiskNodes + criticalNodes}</b>
          </div>
          <div style={{ background: '#fff', border: '1px solid #ddd', padding: 18, borderRadius: 8 }}>
            <span style={{ fontSize: 10, color: '#C63D34', textTransform: 'uppercase', letterSpacing: '.1em' }}>Security Issues</span>
            <b style={{ display: 'block', fontSize: 30, fontFamily: "'Libre Caslon Display', serif", margin: '6px 0', color: '#C63D34' }}>{securityFindings.length}</b>
          </div>
        </div>
      )}

      {/* System Map visualization */}
      <SystemMap nodes={nodes} edges={edges} onSelect={setSelectedNode} selectedId={selectedNode} />

      {/* Selected node detail */}
      {selectedNodeData && (
        <div style={{ marginTop: 20, padding: 24, background: '#fff', border: '2px solid var(--gold)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 22, fontFamily: "'Libre Caslon Display', serif" }}>{selectedNodeData.name}</h3>
              <p style={{ margin: 0, color: '#666', fontSize: 14 }}>{selectedNodeData.description}</p>
            </div>
            <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 0, fontSize: 22, cursor: 'pointer', color: '#999' }}>×</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
            {/* Leak points */}
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 18 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 13, color: '#C63D34', textTransform: 'uppercase', letterSpacing: '.1em' }}>🩸 Leak Points</h4>
              {selectedNodeData.leak_points?.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
                  {selectedNodeData.leak_points.map((leak, i) => (
                    <li key={i} style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.5 }}>{leak}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: 13, color: '#999' }}>No leaks detected in this system.</p>
              )}
            </div>

            {/* AI enhancement */}
            <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 10, padding: 18 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 13, color: '#B88214', textTransform: 'uppercase', letterSpacing: '.1em' }}>✨ AI Enhancement</h4>
              <p style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6, margin: 0 }}>{selectedNodeData.ai_enhancement || 'No enhancement recommendation available.'}</p>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 16, fontSize: 12, color: '#888' }}>
            <span>Owner: <b style={{ color: '#444' }}>{selectedNodeData.owner_role || 'Unknown'}</b></span>
            <span>Type: <b style={{ color: '#444' }}>{selectedNodeData.node_type}</b></span>
            <span>Confidence: <b style={{ color: '#444' }}>{selectedNodeData.confidence || 0}%</b></span>
          </div>
        </div>
      )}

      {/* All nodes detailed list */}
      {nodes.length > 0 && !selectedNodeData && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 18, fontFamily: "'Libre Caslon Display', serif", marginBottom: 16 }}>All Systems & Enhancement Opportunities</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {nodes.map((node) => (
              <div key={node.id} onClick={() => setSelectedNode(node.id)} style={{
                background: '#fff', border: '1px solid #ddd', borderRadius: 10, padding: 18, cursor: 'pointer',
                transition: 'all .15s', borderLeft: `4px solid ${node.health_status === 'critical' ? '#C63D34' : node.health_status === 'at_risk' ? '#B88214' : '#237A4B'}`
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: 15 }}>{node.name}</b>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>{node.description}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {node.leak_points?.length > 0 && (
                      <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 10, background: '#fef2f2', color: '#C63D34', fontWeight: 700 }}>
                        {node.leak_points.length} leaks
                      </span>
                    )}
                    <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 10, background: '#f0fdf4', color: '#237A4B', fontWeight: 700 }}>
                      AI-ready
                    </span>
                  </div>
                </div>
                {node.ai_enhancement && (
                  <p style={{ margin: '10px 0 0', fontSize: 12, color: '#B88214', fontStyle: 'italic' }}>
                    ✨ {node.ai_enhancement.substring(0, 150)}{node.ai_enhancement.length > 150 ? '…' : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </PortalShell>
  );
}