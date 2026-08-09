import { useState, useEffect } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { base44 } from '@/api/base44Client';

export default function DriveWorkspace() {
  const [loading, setLoading] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const loadState = async () => {
    try {
      const receipts = await base44.entities.Receipt.filter({ system: 'xtreme_drive_bootstrap' }, '-created_date', 1);
      if (receipts.length > 0) {
        setData(receipts[0].evidence);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadState(); }, []);

  const bootstrap = async () => {
    setBootstrapping(true);
    setError('');
    try {
      const res = await base44.functions.invoke('bootstrapXtremeDrive', { regenerate_docs: true });
      const d = res.data || res;
      if (d.error) { setError(d.error); setBootstrapping(false); return; }
      setData({
        root_folder_url: d.root_folder?.url,
        master_sheet_url: d.master_sheet_url,
        document_urls: d.documents?.map(doc => ({ name: doc.name, url: doc.url }))
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBootstrapping(false);
    }
  };

  const folderOrder = [
    '00_Master_Blueprint', '01_Business_Strategy', '02_Financial_Strategy',
    '03_Automation_Strategy', '04_Market_Research', '05_Product_Strategy',
    '06_Clone_Capabilities', '07_Prompt_Library', '08_Data', '09_Governance'
  ];

  const folderLabels = {
    '00_Master_Blueprint': 'Master Blueprint',
    '01_Business_Strategy': 'Business Strategy',
    '02_Financial_Strategy': 'Financial Strategy',
    '03_Automation_Strategy': 'Automation Strategy',
    '04_Market_Research': 'Market Research',
    '05_Product_Strategy': 'Product Strategy',
    '06_Clone_Capabilities': 'Clone Capabilities',
    '07_Prompt_Library': 'Prompt Library',
    '08_Data': 'Data & Sheets',
    '09_Governance': 'Governance & Risk'
  };

  if (loading) {
    return (
      <PortalShell>
        <div className="page-head"><h1>Drive Workspace</h1><p>Loading...</p></div>
      </PortalShell>
    );
  }

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Source of Truth</p>
          <h1>Xtreme AI Systems — Drive Workspace</h1>
          <p>The complete strategic library, research, and operational documents. This is the source of truth for all overnight automation workflows.</p>
        </div>
        <button onClick={bootstrap} disabled={bootstrapping} className="btn dark" style={{ padding: '12px 20px', fontSize: 13, opacity: bootstrapping ? 0.6 : 1 }}>
          {bootstrapping ? '⚡ Regenerating all documents…' : '🔄 Regenerate All Documents'}
        </button>
      </div>

      {error && <div style={{ background: '#f5d8d5', color: '#a52d23', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {bootstrapping && (
        <div style={{ background: '#f8f7f4', border: '1px solid #e5e1da', borderRadius: 8, padding: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="dot-anim" style={{ fontSize: 18 }}>●</span>
          <div>
            <b style={{ fontSize: 14 }}>Generating 10 strategic documents via AI…</b>
            <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>This takes 3-4 minutes. Creating folders, master sheet, and all research-backed documents in Google Drive.</p>
          </div>
        </div>
      )}

      {/* Quick Access */}
      {data?.root_folder_url && (
        <section style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Quick Access</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            <a href={data.root_folder_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, border: '1px solid #ddd', borderRadius: 8, background: '#f8f7f4', textDecoration: 'none', color: 'inherit' }}>
              <span style={{ fontSize: 24 }}>📁</span>
              <div>
                <b style={{ fontSize: 13 }}>Root Folder</b>
                <p style={{ fontSize: 11, color: '#888', margin: '2px 0 0' }}>Xtreme AI Systems — all subfolders</p>
              </div>
            </a>
            {data.master_sheet_url && (
              <a href={data.master_sheet_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, border: '1px solid #ddd', borderRadius: 8, background: '#f8f7f4', textDecoration: 'none', color: 'inherit' }}>
                <span style={{ fontSize: 24 }}>📊</span>
                <div>
                  <b style={{ fontSize: 13 }}>Master Catalog Sheet</b>
                  <p style={{ fontSize: 11, color: '#888', margin: '2px 0 0' }}>Cloned sites, opportunities, performers</p>
                </div>
              </a>
            )}
          </div>
        </section>
      )}

      {/* Folder Structure */}
      <section style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Document Library</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          {folderOrder.map(folder => {
            const docs = (data?.document_urls || []).filter(d => d.name.includes(folder.split('_')[1]) || d.name.startsWith(folder.split('_')[0]));
            return (
              <div key={folder} style={{ border: '1px solid #eee', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: '#0a0a0a', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: 'var(--gold)', fontSize: 14 }}>📂</span>
                  <b style={{ fontSize: 13 }}>{folderLabels[folder] || folder}</b>
                </div>
                <div style={{ padding: '8px 16px' }}>
                  {docs.length > 0 ? docs.map((doc, i) => (
                    <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < docs.length - 1 ? '1px solid #f0f0f0' : 'none', textDecoration: 'none', color: 'inherit' }}>
                      <span style={{ color: 'var(--gold)', fontSize: 12 }}>📄</span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{doc.name.replace(/_/g, ' ').replace(/^\d+\s/, '')}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--gold)' }}>Open ↗</span>
                    </a>
                  )) : (
                    <p style={{ fontSize: 12, color: '#aaa', padding: '10px 0' }}>No documents yet — click "Regenerate" to create.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* What's in each folder */}
      <section style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>What's Inside Each Folder</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {[
            { folder: 'Master Blueprint', docs: 'Master Blueprint & Roadmap — the $1M 12-month plan, priority order, tech stack, day/night ops' },
            { folder: 'Business Strategy', docs: 'Business Plan & Strategy — vision, market analysis, go-to-market, competitive moat' },
            { folder: 'Financial Strategy', docs: 'Financial Plan & ROI — 1/3/6/12-month and 3/5/10-year projections, best/worst case' },
            { folder: 'Automation Strategy', docs: 'Automation Plan & 24/7 Ops — overnight schedule, queue orchestration, kill switch' },
            { folder: 'Market Research', docs: 'Industry Competition + Wealth Trends — flooded vs blue ocean, competitor pricing, VC trends' },
            { folder: 'Product Strategy', docs: 'Product & Service Plan — 20+ product ideas, competitor analysis, development priority' },
            { folder: 'Clone Capabilities', docs: 'Deepest Clone Spec — what\'s included/excluded, 100/100 parity, 12-loop remediation' },
            { folder: 'Prompt Library', docs: 'Top 50 Prompts — strategic, generation, cloning, automation, optimization + 5 starter prompts' },
            { folder: 'Data & Sheets', docs: 'Master Google Sheet — cloned websites, discovered opportunities, top performers' },
            { folder: 'Governance & Risk', docs: 'Risk assessment, kill switch, compliance, trade secrets, transparency obligations' }
          ].map((item, i) => (
            <div key={i} style={{ padding: 14, border: '1px solid #eee', borderRadius: 6, background: '#fafaf8' }}>
              <b style={{ fontSize: 12, color: 'var(--gold)' }}>{item.folder}</b>
              <p style={{ fontSize: 11, color: '#666', margin: '6px 0 0', lineHeight: 1.5 }}>{item.docs}</p>
            </div>
          ))}
        </div>
      </section>
    </PortalShell>
  );
}