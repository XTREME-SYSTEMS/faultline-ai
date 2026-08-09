import { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';

const CHARCOAL = '#1a1a1a';
const LIME = '#7AB800';

/**
 * Top notification bar — urgency/scarcity + limited-time offer.
 * Dismissible; stays sticky at the top of the page.
 */
export default function NotificationBar({ onStart }) {
  const [closed, setClosed] = useState(false);
  if (closed) return null;

  return (
    <div style={{
      background: CHARCOAL, color: '#fff', padding: '10px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontSize: 13, fontWeight: 600, textAlign: 'center', position: 'relative'
    }}>
      <span>Limited Time: Free Estimate + 10% Off Installation</span>
      <button onClick={onStart} style={{
        color: LIME, background: 'none', border: 'none', cursor: 'pointer',
        fontWeight: 800, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4
      }}>
        Claim Now <ArrowRight size={14} />
      </button>
      <button onClick={() => setClosed(true)} style={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 4
      }}>
        <X size={16} />
      </button>
    </div>
  );
}