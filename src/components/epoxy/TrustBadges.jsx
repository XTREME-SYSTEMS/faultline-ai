import { ShieldCheck, Clock, Zap, Star } from 'lucide-react';

const LIME = '#7AB800';
const CHARCOAL = '#1a1a1a';

const BADGES = [
  { icon: ShieldCheck, label: 'Lifetime Warranty', sub: 'Residential' },
  { icon: Clock, label: '1-Day Install', sub: 'Minimal Disruption' },
  { icon: Zap, label: '20x Stronger', sub: 'Than Epoxy' },
  { icon: Star, label: '4.9 Star Rating', sub: '847+ Reviews' }
];

/**
 * Trust badge row — E-E-A-T signals (Expertise, Experience, Authority, Trust).
 * Reinforces credibility with warranty, speed, strength, and social proof.
 */
export default function TrustBadges() {
  return (
    <section style={{ background: '#fff', padding: '28px 24px', borderBottom: '1px solid #eee' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, maxWidth: 1000, margin: '0 auto' }}>
        {BADGES.map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
            <b.icon size={28} color={LIME} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: CHARCOAL }}>{b.label}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{b.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}