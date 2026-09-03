import { useState } from 'react';
import { SYSTEM_PROMPTS } from '@/lib/systemPrompts';
import { base44 } from '@/api/base44Client';
import { Copy, Check, Terminal, ChevronDown, ChevronRight, Play } from 'lucide-react';

const CATEGORY_COLORS = {
  Master: '#C89B3C',
  Autonomous: '#7c3aed',
  Validation: '#2563eb',
  Discovery: '#059669',
  Taxonomy: '#8b5cf6',
  Security: '#C63D34',
  Performance: '#f59e0b',
  Content: '#ec4899',
  Reliability: '#237A4B',
};

export default function PromptLibraryPanel() {
  const [expanded, setExpanded] = useState({});
  const [copied, setCopied] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);

  async function copyPrompt(prompt) {
    try {
      await navigator.clipboard.writeText(prompt.prompt_text);
      setCopied(prompt.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  }

  async function seedPrompts() {
    setSeeding(true);
    setSeedResult(null);
    try {
      const me = await base44.auth.me().catch(() => null);
      const orgId = me?.data?.organization_id || 'default';

      // Check existing prompts
      const existing = await base44.entities.PromptTemplate.filter({ organization_id: orgId }).catch(() => []);
      const existingIds = new Set(existing.map(p => p.prompt_id));

      let created = 0;
      for (const p of SYSTEM_PROMPTS) {
        if (existingIds.has(p.id)) continue;
        try {
          await base44.entities.PromptTemplate.create({
            organization_id: orgId,
            prompt_id: p.id,
            tool_id: 'capabilities-matrix',
            tool_name: 'Capabilities Matrix',
            title: p.title,
            prompt_type: 'SYSTEM',
            description: p.description,
            prompt_text: p.prompt_text,
            tags: [p.category, 'system-maximization', 'autonomous'],
            status: 'active',
            version: '1.0.0',
          });
          created++;
        } catch (e) {
          console.error('Failed to seed prompt:', p.id, e);
        }
      }
      setSeedResult({ created, total: SYSTEM_PROMPTS.length, skipped: existingIds.size });
    } catch (e) {
      setSeedResult({ error: e.message });
    }
    setSeeding(false);
  }

  const categories = [...new Set(SYSTEM_PROMPTS.map(p => p.category))];

  return (
    <div>
      {/* Header + Seed button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 13, color: '#555', margin: 0 }}>
            {SYSTEM_PROMPTS.length} system prompts designed to invoke full system implementation,
            100/100 maximization, and max autonomous operations.
          </p>
        </div>
        <button
          onClick={seedPrompts}
          disabled={seeding}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            background: seeding ? '#333' : 'linear-gradient(135deg, #E7C86E, #C89B3C)',
            color: '#111', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 12,
            cursor: seeding ? 'wait' : 'pointer', whiteSpace: 'nowrap',
          }}
        >
          {seeding ? 'Seeding...' : 'Seed All Prompts to Library'}
        </button>
      </div>

      {seedResult && (
        <div style={{
          marginBottom: 16, padding: '12px 16px', borderRadius: 8,
          background: seedResult.error ? '#f5d8d5' : '#e8f5ec',
          border: `1px solid ${seedResult.error ? '#C63D34' : '#237A4B'}`,
          fontSize: 12,
        }}>
          {seedResult.error ? (
            <span style={{ color: '#a52d23' }}>Error: {seedResult.error}</span>
          ) : (
            <span style={{ color: '#237A4B' }}>
              ✓ Seeded {seedResult.created} new prompts ({seedResult.skipped} already existed)
            </span>
          )}
        </div>
      )}

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {categories.map(cat => (
          <span key={cat} style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600,
            background: `${CATEGORY_COLORS[cat] || '#666'}15`,
            color: CATEGORY_COLORS[cat] || '#666',
          }}>
            {cat}
          </span>
        ))}
      </div>

      {/* Prompt cards */}
      <div style={{ display: 'grid', gap: 10 }}>
        {SYSTEM_PROMPTS.map(prompt => {
          const isOpen = expanded[prompt.id];
          const color = CATEGORY_COLORS[prompt.category] || '#666';
          return (
            <div key={prompt.id} style={{
              background: '#fff', border: '1px solid #e5e1da', borderRadius: 8, overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: `${color}15`, display: 'grid', placeItems: 'center',
                }}>
                  <Terminal size={16} style={{ color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 13 }}>{prompt.title}</b>
                    <span style={{
                      padding: '2px 7px', borderRadius: 10, fontSize: 9, fontWeight: 600,
                      background: `${color}15`, color,
                    }}>
                      {prompt.category}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: '#888', margin: '3px 0 0' }}>{prompt.description}</p>
                </div>
                <button
                  onClick={() => copyPrompt(prompt)}
                  style={{
                    padding: '7px 10px', background: '#f5f5f5', border: '1px solid #ddd',
                    borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontWeight: 600, color: '#666',
                  }}
                >
                  {copied === prompt.id ? <Check size={13} style={{ color: '#237A4B' }} /> : <Copy size={13} />}
                  {copied === prompt.id ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={() => setExpanded(prev => ({ ...prev, [prompt.id]: !prev[prompt.id] }))}
                  style={{
                    padding: '7px 8px', background: 'none', border: '1px solid #ddd',
                    borderRadius: 6, cursor: 'pointer', color: '#888',
                  }}
                >
                  {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              </div>

              {isOpen && (
                <div style={{ padding: '0 16px 16px' }}>
                  <pre style={{
                    background: '#0a0a0a', color: '#e0e0e0', padding: 16, borderRadius: 8,
                    fontSize: 11, lineHeight: 1.6, overflow: 'auto', maxHeight: 400,
                    whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  }}>
                    {prompt.prompt_text}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}