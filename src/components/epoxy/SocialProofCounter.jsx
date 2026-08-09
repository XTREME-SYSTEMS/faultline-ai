import { useState, useEffect, useRef } from 'react';

const LIME = '#7AB800';
const CHARCOAL = '#1a1a1a';

/**
 * Social proof counter — animates from 0 to target when scrolled into view.
 * Reinforces scale and trust through a dynamic number.
 */
export default function SocialProofCounter() {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  const target = 1362;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <section ref={ref} style={{ background: CHARCOAL, color: '#fff', padding: '50px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 'clamp(48px, 8vw, 80px)', fontWeight: 800, color: LIME, lineHeight: 1 }}>
        {count.toLocaleString()}+
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, marginTop: 12 }}>Homeowners Trust Us With Their Garage Floors</div>
      <div style={{ fontSize: 14, color: '#999', marginTop: 8 }}>Join thousands of satisfied customers across 8 states</div>
    </section>
  );
}