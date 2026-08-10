import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Globe, TrendingUp, Users, Target, DollarSign, AlertTriangle,
  CheckCircle2, XCircle, Lightbulb, Zap, Plus, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';

// SiteAnalysisCard — rich discovery card showing a scanned site with full
// business intelligence: market share, revenue, customer base, niche,
// competition, audit (strengths/weaknesses/leaks), recommendations, enhancements.
// User can expand for details and add the site to the clone queue.
export default function SiteAnalysisCard({ site, onAddToQueue, adding, onCustomize }) {
  const [expanded, setExpanded] = useState(false);
  const [added, setAdded] = useState(false);

  async function handleAdd() {
    if (added) return;
    setAdded(true);
    try {
      await base44.entities.CloneQueue.create({
        target_url: site.url,
        site_name: site.name,
        industry: site.niche || 'Uncategorized',
        priority: 'medium',
        status: 'queued',
        source: 'discovery',
        benchmark_report: {
          market_share: site.estimated_market_share,
          revenue: site.estimated_annual_revenue,
          customer_base: site.customer_base,
          niche: site.niche,
          competitors: site.top_competitors,
          strengths: site.strengths,
          weaknesses: site.weaknesses,
          leaks: site.leaks_or_problems,
          recommendations: site.recommendations,
          enhancements: site.enhancements,
        },
      });
      if (onAddToQueue) onAddToQueue(site);
    } catch (e) {
      setAdded(false);
    }
  }

  return (
    <div style={{
      background: '#fff', border: '1px solid #ddd', borderRadius: 10, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Thumbnail */}
      <div style={{ position: 'relative', height: 180, background: '#0a0a0a', overflow: 'hidden' }}>
        {site.thumbnail ? (
          <img
            src={site.thumbnail}
            alt={site.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#666' }}>
            <Globe size={32} />
          </div>
        )}
        <div style={{
          position: 'absolute', top: 8, left: 8, padding: '4px 10px',
          background: 'rgba(0,0,0,0.75)', color: '#E7C86E', borderRadius: 6,
          fontSize: 11, fontWeight: 700,
        }}>
          #{site.rank}
        </div>
        <div style={{
          position: 'absolute', bottom: 8, right: 8, padding: '4px 10px',
          background: 'rgba(0,0,0,0.75)', color: '#fff', borderRadius: 6,
          fontSize: 11, fontWeight: 700,
        }}>
          {site.estimated_annual_revenue || 'N/A'}
        </div>
      </div>

      {/* Header */}
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ fontSize: 14, display: 'block', lineHeight: 1.2 }}>{site.name}</b>
            <a href={site.url} target="_blank" rel="noreferrer" style={{
              fontSize: 11, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2,
            }}>
              <Globe size={10} /> {site.url?.replace(/^https?:\/\//, '').slice(0, 35)}
            </a>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              onClick={handleAdd}
              disabled={added || adding}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
                background: added ? '#237A4B' : '#fff',
                color: added ? '#fff' : '#666',
                border: '1px solid #ddd', borderRadius: 6, fontSize: 11, fontWeight: 700,
                cursor: added ? 'default' : 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {added ? <CheckCircle2 size={12} /> : <Plus size={12} />}
              {added ? 'Queued' : 'Queue'}
            </button>
            <button
              onClick={() => onCustomize?.(site)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
                background: 'linear-gradient(135deg, #E7C86E, #C89B3C)',
                color: '#111', border: 0, borderRadius: 6, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              <Zap size={12} /> Customize
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
          <Stat icon={TrendingUp} label="Market Share" value={site.estimated_market_share} color="#2563eb" />
          <Stat icon={DollarSign} label="Est. Revenue" value={site.estimated_annual_revenue} color="#237A4B" />
          <Stat icon={Users} label="Customer Base" value={site.customer_base?.slice(0, 40)} color="#7c3aed" />
          <Stat icon={Target} label="Niche" value={site.niche?.slice(0, 40)} color="#C89B3C" />
        </div>

        {/* Competitors */}
        {site.top_competitors?.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <small style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '.06em' }}>Competitors</small>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {site.top_competitors.slice(0, 5).map((c, i) => (
                <span key={i} style={{ padding: '2px 8px', background: '#f4edca', borderRadius: 4, fontSize: 10, color: '#7e6b00' }}>{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: '100%', marginTop: 10, padding: '8px', background: '#f8f7f4', border: '1px solid #eee',
            borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#666',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Hide Audit' : 'View Full Audit & Recommendations'}
        </button>

        {/* Expanded audit */}
        {expanded && (
          <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
            <AuditSection icon={CheckCircle2} title="Strengths" items={site.strengths} color="#237A4B" bg="#e8f5ec" />
            <AuditSection icon={XCircle} title="Weaknesses" items={site.weaknesses} color="#C63D34" bg="#fde8e6" />
            <AuditSection icon={AlertTriangle} title="Leaks & Problems" items={site.leaks_or_problems} color="#B88214" bg="#fef5e0" />
            <AuditSection icon={Lightbulb} title="Recommendations" items={site.recommendations} color="#2563eb" bg="#e0e7ff" />
            <AuditSection icon={Zap} title="Enhancements" items={site.enhancements} color="#7c3aed" bg="#f3e8ff" />
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Icon size={12} style={{ color, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <small style={{ fontSize: 9, color: '#999', textTransform: 'uppercase', display: 'block' }}>{label}</small>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#333', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || 'N/A'}
        </span>
      </div>
    </div>
  );
}

function AuditSection({ icon: Icon, title, items, color, bg }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ padding: 10, background: bg, borderRadius: 6, border: `1px solid ${color}22` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon size={13} style={{ color }} />
        <b style={{ fontSize: 11, color, textTransform: 'uppercase', letterSpacing: '.04em' }}>{title}</b>
      </div>
      <ul style={{ margin: 0, paddingLeft: 16, display: 'grid', gap: 4 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: 11, color: '#444', lineHeight: 1.4 }}>{item}</li>
        ))}
      </ul>
    </div>
  );
}