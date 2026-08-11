import { useState, useMemo } from 'react';
import { Loader2, Search, Layout, Star, ExternalLink, ChevronDown } from 'lucide-react';

// Build a screenshot image URL from a live preview URL when no static
// screenshot is stored. Uses thum.io's free website screenshot service.
const screenshotOf = (url) => {
  if (!url) return null;
  return `https://image.thum.io/get/width/1280/crop/800/noanimate/${url}`;
};

// Image with graceful fallback: tries screenshot_url → live screenshot of
// preview_url → Layout icon placeholder. Handles broken/expired screenshots.
function TemplateImage({ screenshotUrl, previewUrl, alt, iconSize = 24 }) {
  const [stage, setStage] = useState(screenshotUrl ? 'screenshot' : previewUrl ? 'live' : 'placeholder');
  const src = stage === 'screenshot' ? screenshotUrl : stage === 'live' ? screenshotOf(previewUrl) : null;
  return (
    <>
      {src ? (
        <img
          src={src}
          alt={alt}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setStage(s => (s === 'screenshot' && previewUrl ? 'live' : 'placeholder'))}
        />
      ) : null}
      {stage === 'placeholder' && (
        <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#999', fontSize: iconSize, position: 'absolute', inset: 0 }}>
          <Layout />
        </div>
      )}
    </>
  );
}

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
  const [industryFilter, setIndustryFilter] = useState('all');
  const [collapsedCats, setCollapsedCats] = useState({});

  const industries = useMemo(() => {
    const set = new Set(templates.map(t => t.industry).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [templates]);

  const filtered = useMemo(() => {
    return templates.filter(t => {
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
  }, [templates, search, industryFilter]);

  // Group by layout_type (category)
  const categories = useMemo(() => {
    const groups = {};
    for (const t of filtered) {
      const key = t.layout_type || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
    // Sort categories by size (most templates first)
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const toggleCat = (key) => setCollapsedCats(prev => ({ ...prev, [key]: !prev[key] }));

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
        {loading ? 'Loading templates…' : `${filtered.length} template${filtered.length !== 1 ? 's' : ''} in ${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'}`}
      </div>

      {/* Category Sections */}
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
        <div style={{ display: 'grid', gap: 24 }}>
          {categories.map(([catKey, catTemplates]) => (
            <CategorySection
              key={catKey}
              catKey={catKey}
              templates={catTemplates}
              selectedId={selectedId}
              onSelect={onSelect}
              collapsed={!!collapsedCats[catKey]}
              onToggle={() => toggleCat(catKey)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategorySection({ catKey, templates, selectedId, onSelect, collapsed, onToggle }) {
  // Pick the representative template — prefer one with a screenshot, else preview_url
  const rep = templates.find(t => t.screenshot_url) || templates.find(t => t.preview_url) || templates[0];
  const label = LAYOUT_LABELS[catKey] || catKey;

  return (
    <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 12, overflow: 'hidden' }}>
      {/* Category Banner — homepage screenshot of representative template */}
      <div
        onClick={onToggle}
        style={{ position: 'relative', height: 200, background: '#f0ede5', overflow: 'hidden', cursor: 'pointer' }}
      >
        {(rep?.screenshot_url || rep?.preview_url) ? (
          <img
            src={rep.screenshot_url || screenshotOf(rep.preview_url)}
            alt={label}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'grid'; }}
          />
        ) : null}
        <div style={{ display: 'none', placeItems: 'center', height: '100%', color: '#999', fontSize: 32, position: 'absolute', inset: 0 }}>
          <Layout />
        </div>
        {/* Dark overlay for text legibility */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,.72), rgba(0,0,0,.25) 60%, transparent)' }} />
        {/* Category label */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, padding: '0 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <b style={{ fontFamily: "'Libre Caslon Display', serif", fontSize: 28, letterSpacing: '-.02em' }}>{label}</b>
            <span style={{ fontSize: 11, fontWeight: 700, background: '#C89B3C', color: '#111', padding: '3px 9px', borderRadius: 4 }}>
              {templates.length} template{templates.length !== 1 ? 's' : ''}
            </span>
          </div>
          {rep?.layout_description && (
            <p style={{ fontSize: 12, color: '#ddd', margin: '6px 0 0', maxWidth: 480, lineHeight: 1.4 }}>{rep.layout_description}</p>
          )}
        </div>
        {/* Collapse chevron */}
        <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>{collapsed ? 'Expand' : 'Collapse'}</span>
          <ChevronDown size={18} style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: '.2s' }} />
        </div>
      </div>

      {/* Template cards in this category */}
      {!collapsed && (
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {templates.map(tpl => (
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
      <div style={{ height: 140, background: '#f0ede5', overflow: 'hidden', position: 'relative' }}>
        {(template.screenshot_url || template.preview_url) ? (
          <img
            src={template.screenshot_url || screenshotOf(template.preview_url)}
            alt={template.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'grid'; }}
          />
        ) : null}
        <div style={{ display: 'none', placeItems: 'center', height: '100%', color: '#999', fontSize: 24, position: 'absolute', inset: 0 }}>
          <Layout />
        </div>
        {template.featured && (
          <span style={{ position: 'absolute', top: 8, left: 8, background: '#C89B3C', color: '#111', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            ★ Featured
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <b style={{ fontSize: 13, fontFamily: "'Libre Caslon Display', serif", lineHeight: 1.2 }}>{template.name}</b>
          {template.preview_url && (
            <a href={template.preview_url} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} style={{ color: '#C89B3C', flexShrink: 0 }}>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
        {template.industry && (
          <span style={{ fontSize: 9, fontWeight: 600, color: '#666', background: '#f0ede5', padding: '2px 6px', borderRadius: 3, alignSelf: 'flex-start' }}>
            {template.industry}
          </span>
        )}
        {/* Color palette */}
        {template.color_palette && template.color_palette.accent && (
          <div style={{ display: 'flex', gap: 4, marginTop: 'auto', paddingTop: 6 }}>
            {['primary', 'secondary', 'accent', 'background', 'text'].map(key => {
              const c = template.color_palette[key];
              if (!c) return null;
              return <div key={key} title={key} style={{ width: 16, height: 16, borderRadius: 4, background: c, border: '1px solid #ddd' }} />;
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