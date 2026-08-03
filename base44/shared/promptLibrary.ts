// Prompt Library — shared module for all backend generators
// Loads structured prompts from the PromptTemplate entity, renders {{VARIABLE}}
// placeholders, and falls back to built-in defaults when the DB is empty.
//
// Usage in a backend function:
//   import { getPrompt, renderPrompt } from '../../shared/promptLibrary.ts';
//   const tpl = await getPrompt(base44, 'fl-website', 'GENERATE');
//   const prompt = renderPrompt(tpl, { BUSINESS_NAME, INDUSTRY, ... });

// ── In-memory cache (per isolate) ─────────────────────────────
let _cache = null;       // { [tool_id]: { [prompt_type]: template } }
let _cacheOrg = null;    // org id the cache was loaded for
let _cacheTime = 0;
const CACHE_TTL_MS = 60_000; // refresh every 60s

/**
 * Load all active prompt templates for an org into the cache.
 * @param {object} base44 - base44 client (asServiceRole)
 * @param {string} orgId
 */
async function loadCache(base44, orgId) {
  if (!orgId) return;
  const now = Date.now();
  if (_cache && _cacheOrg === orgId && now - _cacheTime < CACHE_TTL_MS) return;

  try {
    const templates = await base44.asServiceRole.entities.PromptTemplate.filter(
      { organization_id: orgId, status: 'active' },
      '-created_date',
      500
    );
    _cache = {};
    for (const t of templates) {
      if (!_cache[t.tool_id]) _cache[t.tool_id] = {};
      _cache[t.tool_id][t.prompt_type] = t;
    }
    _cacheOrg = orgId;
    _cacheTime = now;
  } catch (e) {
    console.error('promptLibrary.loadCache error:', e.message);
    // leave existing cache or null
  }
}

/**
 * Get a single prompt template (raw entity, unrendered).
 * @returns {Promise<object|null>}
 */
export async function getPrompt(base44, orgId, toolId, promptType) {
  await loadCache(base44, orgId);
  return _cache?.[toolId]?.[promptType] || null;
}

/**
 * Get the prompt text for a tool+type, rendered with variables.
 * Falls back to `fallback` if no template is found in the DB.
 *
 * @param {object} base44 - base44 client
 * @param {string} orgId
 * @param {string} toolId - e.g. 'fl-website', 'website-studio', 'global'
 * @param {string} promptType - SYSTEM | DISCOVERY | GENERATE | REVISE | VALIDATE | COACH
 * @param {object} variables - { BUSINESS_NAME: 'Acme', INDUSTRY: 'HVAC', ... }
 * @param {string} fallback - inline prompt to use if DB has nothing
 * @returns {Promise<string>} rendered prompt
 */
export async function resolvePrompt(base44, orgId, toolId, promptType, variables = {}, fallback = '') {
  const tpl = await getPrompt(base44, orgId, toolId, promptType);
  const text = tpl?.prompt_text || fallback;
  if (!text) {
    console.warn(`promptLibrary: no prompt found for ${toolId}/${promptType} and no fallback`);
    return '';
  }
  return renderPrompt(text, variables);
}

/**
 * Replace {{VARIABLE}} placeholders in a prompt string.
 * Supports {{VAR}} and {{VAR|default}} syntax.
 */
export function renderPrompt(template, variables = {}) {
  if (!template) return '';
  return template.replace(/\{\{(\w+)(?:\|([^}]*))?\}\}/g, (match, key, defaultVal) => {
    const val = variables[key];
    if (val !== undefined && val !== null && val !== '') return String(val);
    if (defaultVal !== undefined) return defaultVal;
    return match; // leave the placeholder if no value and no default
  });
}

/**
 * Record a prompt run for audit trail.
 */
export async function logRun(base44, orgId, { prompt_id, tool_id, project_id, input_snapshot, output_snapshot, status = 'complete' }) {
  try {
    return await base44.asServiceRole.entities.PromptRun.create({
      organization_id: orgId,
      prompt_id,
      tool_id,
      project_id: project_id || '',
      input_snapshot: input_snapshot || {},
      output_snapshot: output_snapshot || {},
      status
    });
  } catch (e) {
    console.error('promptLibrary.logRun error:', e.message);
    return null;
  }
}

/**
 * Clear the in-memory cache (useful after seeding new prompts).
 */
export function clearCache() {
  _cache = null;
  _cacheOrg = null;
  _cacheTime = 0;
}