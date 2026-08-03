import { useState } from 'react';
import PortalShell from '@/components/fl/PortalShell';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Trash2, AlertTriangle, User, Shield } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const [showDelete, setShowDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') { setError('Type DELETE exactly to confirm'); return; }
    setDeleting(true);
    setError('');
    try {
      await base44.functions.invoke('deleteUserAccount', {});
      await base44.auth.logout();
      window.location.href = '/';
    } catch (e) {
      setError(e.message || 'Failed to delete account. Please contact support.');
      setDeleting(false);
    }
  };

  return (
    <PortalShell>
      <div className="page-head">
        <div>
          <p className="eyebrow">Configure</p>
          <h1>Settings</h1>
          <p>Manage your workspace, preferences, and account.</p>
        </div>
      </div>

      {/* Account section */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={18} style={{ color: 'var(--gold)' }} /> Account
        </h3>
        <div style={{ display: 'grid', gap: 10 }}>
          <p style={{ fontSize: 13, color: '#666', margin: 0 }}><b style={{ color: '#111' }}>Email:</b> {user?.email || '—'}</p>
          <p style={{ fontSize: 13, color: '#666', margin: 0 }}><b style={{ color: '#111' }}>Name:</b> {user?.full_name || '—'}</p>
          <p style={{ fontSize: 13, color: '#666', margin: 0 }}><b style={{ color: '#111' }}>Role:</b> {user?.role || 'user'}</p>
        </div>
      </div>

      {/* Security section */}
      <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 24, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} style={{ color: 'var(--gold)' }} /> Security
        </h3>
        <p style={{ fontSize: 13, color: '#666', margin: 0 }}>Your session is managed securely through the platform authentication system. Password resets are available from the login screen.</p>
      </div>

      {/* Danger zone */}
      <div style={{ background: '#fff', border: '1px solid #f5d8d5', borderRadius: 8, padding: 24 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#a52d23', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={18} /> Danger Zone
        </h3>
        <p style={{ fontSize: 13, color: '#666', margin: '0 0 16px' }}>
          Permanently delete your account and all associated workspace data. This action cannot be undone.
        </p>
        {!showDelete ? (
          <button onClick={() => setShowDelete(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            background: '#C63D34', color: '#fff', border: 0, borderRadius: 6,
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
          }}>
            <Trash2 size={16} /> Delete Account
          </button>
        ) : (
          <div style={{ borderTop: '1px solid #f5d8d5', paddingTop: 16 }}>
            <p style={{ fontSize: 13, color: '#a52d23', marginBottom: 10 }}>
              Type <b>DELETE</b> to permanently delete your account and all data:
            </p>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="DELETE"
              disabled={deleting}
              style={{
                width: '100%', maxWidth: 300, padding: 10, border: '1px solid #f5d8d5',
                borderRadius: 6, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box'
              }}
            />
            {error && <p style={{ color: '#a52d23', fontSize: 12, marginTop: 8 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button
                onClick={handleDelete}
                disabled={deleting || confirmText !== 'DELETE'}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px',
                  background: '#C63D34', color: '#fff', border: 0, borderRadius: 6,
                  fontSize: 13, fontWeight: 700, cursor: deleting || confirmText !== 'DELETE' ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', opacity: deleting || confirmText !== 'DELETE' ? 0.5 : 1
                }}
              >
                <Trash2 size={16} /> {deleting ? 'Deleting…' : 'Confirm Delete'}
              </button>
              <button
                onClick={() => { setShowDelete(false); setConfirmText(''); setError(''); }}
                disabled={deleting}
                style={{
                  padding: '10px 18px', background: '#fff', border: '1px solid #ddd', borderRadius: 6,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#666'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}