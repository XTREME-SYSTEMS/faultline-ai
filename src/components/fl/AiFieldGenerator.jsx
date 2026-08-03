import { useState } from 'react';
import { base44 } from '@/api/base44Client';

const PROMPTS = {
  business_name: (f) => `Generate 5 creative, memorable business name suggestions for a company in the ${f.industry || 'general'} industry${f.description ? ` that ${f.description}` : ''}${f.target_audience ? ` targeting ${f.target_audience}` : ''}. Names should be brandable, easy to spell, and available-sounding. Return only the names.`,
  industry: (f) => `Based on the business name "${f.business_name || 'unknown'}"${f.description ? ` and description "${f.description}"` : ''}, suggest 5 possible industries this business could operate in. Be specific (e.g. "Residential HVAC" not just "Services"). Return only the industry names.`,
  description: (f) => `Write 3 compelling 2-3 sentence business descriptions for ${f.business_name || 'a business'}${f.industry ? ` in the ${f.industry} industry` : ''}${f.target_audience ? ` targeting ${f.target_audience}` : ''}. Each should be professional, engaging, and clearly communicate the value proposition. Return only the descriptions.`,
  target_audience: (f) => `Based on ${f.business_name || 'this business'}${f.industry ? ` in the ${f.industry} industry` : ''}${f.description ? ` — ${f.description}` : ''}, identify 5 specific target audience segments. Be specific (e.g. "Small business owners aged 30-55 in construction" not just "business owners"). Return only the audience descriptions.`,
  branding: (f) => `Suggest 3 complete branding packages for ${f.business_name || 'a business'}${f.industry ? ` in the ${f.industry} industry` : ''}${f.description ? ` — ${f.description}` : ''}. Each package should include a primary color (hex), secondary color (hex), font style (one of: modern, classic, bold), and tone (one of: professional, friendly, luxury, playful, technical, persuasive). Choose colors that fit the industry and audience.`
};

export default function AiFieldGenerator({ type, form, onApply }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [brandingOptions, setBrandingOptions] = useState([]);
  const [logoUrl, setLogoUrl] = useState(null);
  const [error, setError] = useState('');

  const generate = async () => {
    setOpen(true);
    setLoading(true);
    setError('');
    setSuggestions([]);
    setBrandingOptions([]);
    setLogoUrl(null);

    try {
      if (type === 'logo') {
        const prompt = `Create a clean, modern, professional minimalist logo for "${form.business_name || 'a business'}"${form.industry ? ` in the ${form.industry} industry` : ''}. Simple geometric design, scalable, no text or minimal text. Primary color: ${form.primary_color || '#C89B3C'}. Secondary: ${form.secondary_color || '#0a0a0a'}. Flat vector style on white background.`;
        const res = await base44.integrations.Core.GenerateImage({ prompt });
        setLogoUrl(res.url);
      } else if (type === 'branding') {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: PROMPTS[type](form),
          response_json_schema: {
            type: 'object',
            properties: {
              options: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    primary_color: { type: 'string' },
                    secondary_color: { type: 'string' },
                    font_style: { type: 'string' },
                    tone: { type: 'string' }
                  }
                }
              }
            }
          }
        });
        setBrandingOptions(res.options || []);
      } else {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: PROMPTS[type](form),
          response_json_schema: {
            type: 'object',
            properties: {
              suggestions: { type: 'array', items: { type: 'string' } }
            }
          }
        });
        setSuggestions(res.suggestions || []);
      }
    } catch (e) {
      setError(e.message || 'Generation failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (val) => {
    onApply(type, val);
    setOpen(false);
  };

  const applyBranding = (opt) => {
    onApply('branding', opt);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={generate}
        disabled={loading}
        style={{
          background: 'none', border: '1px solid #C89B3C', borderRadius: 4,
          padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#8A641C',
          cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit',
          whiteSpace: 'nowrap', opacity: loading ? 0.6 : 1
        }}
      >
        {loading ? '⏳' : '✨'} AI
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }} onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div style={{
            background: '#fff', borderRadius: 10, padding: 24, maxWidth: 560, width: '100%',
            maxHeight: '80vh', overflow: 'auto', boxShadow: '0 24px 70px #00000033'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>
                ✨ AI {type === 'business_name' ? 'Business Name' : type === 'industry' ? 'Industry' : type === 'description' ? 'Description' : type === 'target_audience' ? 'Target Audience' : type === 'branding' ? 'Branding' : 'Logo'} Suggestions
              </h3>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 0, fontSize: 20, cursor: 'pointer', color: '#999' }}>×</button>
            </div>

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 20 }}>
                <span className="dot-anim" style={{ fontSize: 18 }}>●</span>
                <span style={{ fontSize: 13, color: '#666' }}>Generating suggestions…</span>
              </div>
            )}

            {error && <p style={{ color: '#a52d23', fontSize: 13 }}>{error}</p>}

            {/* Text suggestions */}
            {!loading && suggestions.length > 0 && (
              <div style={{ display: 'grid', gap: 8 }}>
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => applySuggestion(s)} style={{
                    textAlign: 'left', padding: 14, border: '1px solid #e5e1da', borderRadius: 6,
                    background: '#f8f7f4', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                    color: '#333', lineHeight: 1.5
                  }}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Branding suggestions */}
            {!loading && brandingOptions.length > 0 && (
              <div style={{ display: 'grid', gap: 12 }}>
                {brandingOptions.map((opt, i) => (
                  <button key={i} onClick={() => applyBranding(opt)} style={{
                    textAlign: 'left', padding: 16, border: '1px solid #e5e1da', borderRadius: 6,
                    background: '#fff', cursor: 'pointer', fontFamily: 'inherit'
                  }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <span style={{ width: 32, height: 32, borderRadius: 6, background: opt.primary_color, border: '1px solid #ddd' }} />
                      <span style={{ width: 32, height: 32, borderRadius: 6, background: opt.secondary_color, border: '1px solid #ddd' }} />
                    </div>
                    <p style={{ fontSize: 12, color: '#666', margin: 0 }}>
                      <b>Font:</b> {opt.font_style} · <b>Tone:</b> {opt.tone}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* Logo result */}
            {!loading && logoUrl && (
              <div>
                <img src={logoUrl} alt="Generated logo" style={{ width: '100%', borderRadius: 8, border: '1px solid #ddd' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={() => onApply('logo_url', logoUrl)} className="btn gold" style={{ fontSize: 13, padding: '10px 16px' }}>✓ Use This Logo</button>
                  <button onClick={generate} className="btn outline" style={{ fontSize: 13, padding: '10px 16px' }}>↻ Regenerate</button>
                </div>
              </div>
            )}

            {!loading && !error && suggestions.length === 0 && brandingOptions.length === 0 && !logoUrl && (
              <p style={{ color: '#999', fontSize: 13, textAlign: 'center', padding: 20 }}>No suggestions generated. Try again.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}