import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';

export default function PartnerPortal() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newPartner, setNewPartner] = useState('');
  const [newScopes, setNewScopes] = useState(['read_audits', 'read_findings']);

  const load = async () => {
    try {
      const list = await base44.entities.PartnerApiKey.list('-created_date', 50);
      setKeys(list);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createKey = async () => {
    if (!newPartner.trim()) return;
    setCreating(true);
    try {
      const apiKey = `flk_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
      await base44.entities.PartnerApiKey.create({
        partner_name: newPartner.trim(),
        api_key: apiKey,
        scopes: newScopes,
        rate_limit_per_hour: 100,
        active: true
      });
      setNewPartner('');
      load();
    } catch (e) { /* ignore */ }
    setCreating(false);
  };

  const toggleScope = (scope) => {
    setNewScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]);
  };

  const toggleActive = async (key) => {
    await base44.entities.PartnerApiKey.update(key.id, { active: !key.active });
    load();
  };

  const deleteKey = async (key) => {
    await base44.entities.PartnerApiKey.delete(key.id);
    load();
  };

  const allScopes = ['read_audits', 'read_findings', 'read_companies', 'create_leads', 'read_scores'];

  if (loading) return <PortalShell><p style={{ padding: 28, color: '#888' }}>Loading partner API keys…</p></PortalShell>;

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Partner API</p>
          <h1>API Key Management</h1>
          <p>Generate API keys for partners to access your audit data programmatically. Scoped permissions, rate-limited, usage-tracked.</p>
        </div>
      </div>

      {/* Create new key */}
      <section className="finding" style={{ marginTop: 13 }}>
        <h2 style={{ fontSize: 18, marginBottom: 15 }}>Generate New API Key</h2>
        <div style={{ display: 'grid', gap: 14 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 700 }}>
            Partner Name
            <input value={newPartner} onChange={e => setNewPartner(e.target.value)} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 6, fontWeight: 400 }} placeholder="Acme Agency" />
          </label>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Scopes</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {allScopes.map(s => (
                <button
                  key={s}
                  onClick={() => toggleScope(s)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                    background: newScopes.includes(s) ? '#0a0a0a' : '#fff', color: newScopes.includes(s) ? '#fff' : '#666',
                    border: '1px solid #ddd'
                  }}
                >
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
          <button className="btn dark" onClick={createKey} disabled={creating || !newPartner.trim()}>
            {creating ? '⏳ Generating…' : 'Generate API Key'}
          </button>
        </div>
      </section>

      {/* Existing keys */}
      <section className="finding" style={{ marginTop: 13 }}>
        <h2 style={{ fontSize: 18, marginBottom: 15 }}>Active API Keys</h2>
        {keys.length === 0 ? (
          <p style={{ color: '#888' }}>No API keys yet. Generate one above to get started.</p>
        ) : (
          <div className="table">
            <table>
              <thead>
                <tr><th>Partner</th><th>API Key</th><th>Scopes</th><th>Usage</th><th>Last Used</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {keys.map(k => (
                  <tr key={k.id}>
                    <td><b>{k.partner_name}</b></td>
                    <td><code style={{ fontSize: 11, background: '#f4f0e8', padding: '3px 6px', borderRadius: 4 }}>{k.api_key.substring(0, 20)}…</code></td>
                    <td style={{ fontSize: 11 }}>{k.scopes?.map(s => s.replace(/_/g, ' ')).join(', ') || '—'}</td>
                    <td style={{ fontSize: 11 }}>{k.requests_this_hour || 0}/{k.rate_limit_per_hour}/hr</td>
                    <td style={{ fontSize: 11 }}>{k.last_used ? new Date(k.last_used).toLocaleDateString() : 'Never'}</td>
                    <td><span className={`pill ${k.active ? 'medium' : 'high'}`}>{k.active ? 'Active' : 'Disabled'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => toggleActive(k)} style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', background: '#fff' }}>{k.active ? 'Disable' : 'Enable'}</button>
                        <button onClick={() => deleteKey(k)} style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #f5d8d5', borderRadius: 4, cursor: 'pointer', background: '#fff', color: '#a52d23' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* API documentation */}
      <section className="finding" style={{ marginTop: 13 }}>
        <h2 style={{ fontSize: 18, marginBottom: 15 }}>API Documentation</h2>
        <div style={{ background: '#0a0a0a', color: '#fff', padding: 18, borderRadius: 8, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, overflowX: 'auto' }}>
          <p style={{ color: '#888' }}># List audits</p>
          <p>GET /api/base44/functions/partnerApi?action=list_audits&limit=50</p>
          <p style={{ color: '#888' }}>Header: X-API-Key: your_api_key</p>
          <br />
          <p style={{ color: '#888' }}># Get findings for an audit</p>
          <p>GET /api/base44/functions/partnerApi?action=list_findings&audit_id=AUDIT_ID</p>
          <br />
          <p style={{ color: '#888' }}># List companies</p>
          <p>GET /api/base44/functions/partnerApi?action=list_companies</p>
          <br />
          <p style={{ color: '#888' }}># Get health scores</p>
          <p>GET /api/base44/functions/partnerApi?action=get_scores</p>
          <br />
          <p style={{ color: '#888' }}># Create a lead (requires create_leads scope)</p>
          <p>POST /api/base44/functions/partnerApi?action=create_lead</p>
          <p>Body: {"{ \"email\": \"lead@example.com\", \"company\": \"Acme Co\", \"website\": \"acme.com\" }"}</p>
        </div>
      </section>
    </PortalShell>
  );
}