import { useState, useMemo } from 'react';
import { Image } from '@/components/ui/image';
import { Loader2, Search, Layout, Filter, Star, ExternalLink } from 'lucide-react';

const LAYOUT_LABELS = {
  hero_centric: 'Hero Centric',
  split_hero: 'Split Hero',
  grid: 'Grid',
  magazine: 'Magazine',
  dashboard: 'Dashboard',
  portfolio: 'Portfolio',
  ecommerce: 'E-Commerce',
  landing_page: 'Landing Page',
  agency: 'Agency',
  blog: 'Blog',
};

export default function TemplateGallery({ templates, loading, onSelect, selectedId, onDerive, deriving }) {
  const [search, setSearch] = useState('');
  const [layoutFilter, setLayoutFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');

  const industries = useMemo(() => {
    const set = new Set(templates.map(t => t.industry).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [templates]);

  const layouts = useMemo(() => {
    const set = new Set(templates.map(t => t.layout_type).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [templates]);

  const filtered = useMemo(() => {
    return templates.filter(t => {
      if (layoutFilter !== 'all' && t.layout_type !== layoutFilter) return false;
      if (industryFilter !== 'all' && t.industry !== industryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const match = t.name?.toLowerCase().includes(q) ||
          t.industry?.toLowerCase().includes(q) ||
          t.tags?.some(tag => tag.toLowerCase().includes(q)) ||
          t.tone?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [templates, search, layoutFilter, industryFilter]);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates by name, industry, or tag…"
            style={{
              width: '100%', padding: '10px 12px 10px 34px', border: '1px solid #d7d7d7',
              borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#111',
            }}
          />
        </div>
        <select
          value={layoutFilter}
          onChange={e => setLayoutFilter(e.target.value)}
          style={{ padding: '10px 12px', border: '1px solid #d7d7d7', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#111' }}
        >
          {layouts.map(l => <option key={l} value={l}>{l === 'all' ? 'All Layouts' : LAYOUT_LABELS[l] || l}</option>)}
        </select>
        <select
          value={industryFilter}
          onChange={e => setIndustryFilter(e.target.value)}
          style={{ padding: '10px 12px', border: '1px solid #d7d7d7', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: '#111' }}
        >
          {industries.map(i => <option key={i} value={i}>{i === 'all' ? 'All Industries' : i}</option>)}
        </select>
        <button
          onClick={onDerive}
          disabled={deriving}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: deriving ? '#666' : 'linear-gradient(135deg, #E7C86E, #C89B3C)',
            color: '#111', border: 0, borderRadius: 6, padding: '10px 18px',
            fontSize: 13, fontWeight: 700, cursor: deriving ? 'wait' : 'pointer', fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          {deriving ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} />}
          {deriving ? 'Deriving…' : 'Derive New Templates'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ fontSize: 12, color: '#999', marginBottom: 14 }}>
        {loading ? 'Loading templates…' : `${filtered.length} template${filtered.length !== 1 ? 's' : ''} available`}
      </div>

      {/* Template Grid */}
      {loading ? (
        <div style={{ padding: 80, textAlign: 'center' }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 10px', display: 'block', color: '#C89B3C' }} />
          <p style={{ fontSize: 13, color: '#999' }}>Loading template library…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#fff', border: '1px solid #ddd', borderRadius: 10 }}>
          <Layout size={32} style={{ color: '#C89B3C', margin: '0 auto 10px' }} />
          <p style={{ fontSize: 14, color: '#666', margin: '0 0 6px' }}>No templates yet</p>
          <p style={{ fontSize: 12, color: '#999', margin: 0 }}>Click "Derive New Templates" to auto-extract templates from your 100/100 clones.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(tpl => (
            <TemplateCard key={tpl.id} template={tpl} isSelected={selectedId === tpl.id} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template, isSelected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(template)}
      style={{
        border: `2px solid ${isSelected ? '#C89B3C' : '#ddd'}`, borderRadius: 10, overflow: 'hidden',
        background: '#fff', cursor: 'pointer', transition: 'transform .15s, box-shadow .15s',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Screenshot */}
      <div style={{ height: 160, background: '#f0ede5', overflow: 'hidden', position: 'relative' }}>
        {template.screenshot_url ? (
          <Image src={template.screenshot_url} alt={template.name} fittingType="fill" className="w-full h-full" />
        ) : template.preview_url ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <iframe
              src={template.preview_url}
              title={template.name}
              style={{ width: '1280px', height: '800px', transform: 'scale(0.22)', transformOrigin: 'top left', border: 0, pointerEvents: 'none' }}
              loading="lazy"
            />
          </div>
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#999', fontSize: 24 }}>
            <Layout />
          </div>
        )}
        {template.featured && (
          <span style={{ position: 'absolute', top: 8, left: 8, background: '#C89B3C', color: '#111', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            ★ Featured
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <b style={{ fontSize: 14, fontFamily: "'Libre Caslon Display', serif", lineHeight: 1.2 }}>{template.name}</b>
          {template.preview_url && (
            <a href={template.preview_url} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} style={{ color: '#C89B3C', flexShrink: 0 }}>
              <ExternalLink size={13} />
            </a>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {template.layout_type && (
            <span style={{ fontSize: 9, fontWeight: 700, color: '#C89B3C', background: '#C89B3C15', padding: '2px 6px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {LAYOUT_LABELS[template.layout_type] || template.layout_type}
            </span>
          )}
          {template.industry && (
            <span style={{ fontSize: 9, fontWeight: 600, color: '#666', background: '#f0ede5', padding: '2px 6px', borderRadius: 3 }}>
              {template.industry}
            </span>
          )}
        </div>
        {template.layout_description && (
          <p style={{ fontSize: 11, color: '#888', lineHeight: 1.4, margin: 0 }}>{template.layout_description}</p>
        )}
        {/* Color palette */}
        {template.color_palette && template.color_palette.accent && (
          <div style={{ display: 'flex', gap: 4, marginTop: 'auto', paddingTop: 6 }}>
            {['primary', 'secondary', 'accent', 'background', 'text'].map(key => {
              const c = template.color_palette[key];
              if (!c) return null;
              return <div key={key} title={key} style={{ width: 18, height: 18, borderRadius: 4, background: c, border: '1px solid #ddd' }} />;
            })}
          </div>
        )}
        {template.usage_count > 0 && (
          <span style={{ fontSize: 10, color: '#999' }}>Used {template.usage_count}×</span>
        )}
      </div>
    </div>
  );
}