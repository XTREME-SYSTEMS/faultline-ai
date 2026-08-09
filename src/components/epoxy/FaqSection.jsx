import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FAQS } from '@/lib/epoxyFaqData';

const LIME = '#7AB800';
const CHARCOAL = '#1a1a1a';

/**
 * Collapsible FAQ section — visible UI counterpart to the FAQPage JSON-LD
 * schema injected by SeoHead. Optimized for AEO: concise, factual answers
 * that AI assistants and voice search can surface directly.
 */
export default function FaqSection() {
  const [open, setOpen] = useState(null);

  return (
    <section id="faq" style={{ padding: '80px 24px', background: '#fff' }}>
      <div style={{ textAlign: 'center', marginBottom: 50 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: LIME, marginBottom: 12 }}>Got Questions?</div>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: CHARCOAL, margin: 0 }}>Frequently Asked Questions</h2>
        <p style={{ fontSize: 15, color: '#666', marginTop: 12, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
          Everything you need to know about epoxy garage floor coating — pricing, installation, warranty, and more.
        </p>
      </div>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {FAQS.map((f, i) => (
          <div key={i} style={{ borderBottom: '1px solid #eee', marginBottom: 4 }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: '100%', textAlign: 'left', padding: '20px 0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit'
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700, color: CHARCOAL, flex: 1 }}>{f.q}</span>
              <ChevronDown
                size={20}
                color={LIME}
                style={{ transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
              />
            </button>
            {open === i && (
              <p style={{ fontSize: 15, color: '#555', lineHeight: 1.7, margin: '0 0 20px' }}>{f.a}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}