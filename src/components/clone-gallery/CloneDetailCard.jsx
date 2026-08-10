import { useState } from 'react';
import { ExternalLink, Globe, ShoppingCart, Building2, FileText, CheckCircle2 } from 'lucide-react';
import BuyUrlModal from './BuyUrlModal';
import BusinessFormationModal from './BusinessFormationModal';

// CloneDetailCard — shows a clone with live Vercel preview, original URL, clone URL,
// and action buttons: Buy URL, Form Business (DBA/LLC), Customize, Specs.
export default function CloneDetailCard({ clone, onShowSpecs }) {
  const [showBuyUrl, setShowBuyUrl] = useState(false);
  const [showFormation, setShowFormation] = useState(false);
  const [imgError, setImgError] = useState(false);

  const scoreColor = clone.score >= 100 ? '#237A4B' : clone.score >= 70 ? '#B88214' : '#C63D34';
  const shortUrl = (url) => url ? url.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 40) : '';

  return (
    <>
      <div style={{
        border: '1px solid #ddd', borderRadius: 10, overflow: 'hidden', background: '#fff',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Thumbnail — live screenshot of the Vercel clone */}
        <div style={{ position: 'relative', height: 170, background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)', overflow: 'hidden' }}>
          {clone.thumbnail && !imgError ? (
            <img
              src={clone.thumbnail}
              alt={clone.name}
              loading="lazy"
              onError={() => setImgError(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%', display: 'grid', placeItems: 'center',
              color: '#E7C86E', fontFamily: "'Libre Caslon Display', serif", fontSize: 28,
            }}>
              {clone.name?.slice(0, 2).toUpperCase()}
            </div>
          )}
          {/* Score badge */}
          <div style={{
            position: 'absolute', top: 8, right: 8, padding: '4px 10px', borderRadius: 20,
            background: 'rgba(0,0,0,0.8)', color: scoreColor, fontSize: 12, fontWeight: 700,
          }}>
            {clone.score}/100
          </div>
          {clone.score >= 100 && (
            <div style={{
              position: 'absolute', top: 8, left: 8, padding: '3px 8px', borderRadius: 20,
              background: '#237A4B', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <CheckCircle2 size={11} /> PASSED
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          <b style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clone.name}</b>

          {/* URLs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 10, background: '#f8f7f4', borderRadius: 8 }}>
            {clone.target_url && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#999', textTransform: 'uppercase', minWidth: 52 }}>Original</span>
                <a href={clone.target_url} target="_blank" rel="noreferrer" title={clone.target_url}
                  style={{ color: '#666', fontSize: 11, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden' }}>
                  <Globe size={11} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortUrl(clone.target_url)}</span>
                </a>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#999', textTransform: 'uppercase', minWidth: 52 }}>Vercel</span>
              <a href={clone.url} target="_blank" rel="noreferrer" title={clone.url}
                style={{ color: '#2563eb', fontSize: 11, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden' }}>
                <ExternalLink size={11} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortUrl(clone.url)}</span>
              </a>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
            <button onClick={() => setShowBuyUrl(true)} style={{
              flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '10px 8px', border: 0, borderRadius: 6,
              background: 'linear-gradient(135deg, #E7C86E, #C89B3C)', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, color: '#111',
            }}>
              <ShoppingCart size={14} /> Buy URL
            </button>
            <button onClick={() => setShowFormation(true)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '10px 8px', border: '1px solid #ddd', borderRadius: 6,
              background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#666',
            }} title="File DBA or LLC">
              <Building2 size={14} />
            </button>
            <button onClick={() => onShowSpecs?.(clone)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '10px 8px', border: '1px solid #ddd', borderRadius: 6,
              background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#666',
            }}>
              <FileText size={14} />
            </button>
          </div>
        </div>
      </div>

      {showBuyUrl && <BuyUrlModal clone={clone} onClose={() => setShowBuyUrl(false)} />}
      {showFormation && <BusinessFormationModal clone={clone} onClose={() => setShowFormation(false)} />}
    </>
  );
}