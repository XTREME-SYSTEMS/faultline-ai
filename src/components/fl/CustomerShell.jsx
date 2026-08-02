import Brand from './Brand';

export default function CustomerShell({ children, coach, companyName = 'Your Company' }) {
  return (
    <div className="customer-shell" style={{ minHeight: '100vh', background: '#f7f7f5', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        height: 68, background: '#fff', borderBottom: '1px solid #e5e1da',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', position: 'sticky', top: 0, zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Brand variant="monogram" />
          <div style={{ height: 28, width: 1, background: '#e5e1da' }} />
          <div>
            <b style={{ fontSize: 14, fontWeight: 700 }}>{companyName}</b>
            <small style={{ display: 'block', fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '.12em' }}>Client Portal</small>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', minHeight: 'calc(100vh - 68px)' }}>
        <div style={{ padding: '32px 40px', overflowY: 'auto' }}>
          {children}
        </div>
        <aside style={{ background: '#fff', borderLeft: '1px solid #e5e1da', position: 'sticky', top: 68, height: 'calc(100vh - 68px)' }}>
          {coach}
        </aside>
      </main>

      {/* Footer */}
      <footer style={{ background: '#0d0d0d', color: '#888', padding: '20px 24px', fontSize: 12, textAlign: 'center' }}>
        Powered by FaultLine AI — Evidence-centered business diagnostics
      </footer>
    </div>
  );
}