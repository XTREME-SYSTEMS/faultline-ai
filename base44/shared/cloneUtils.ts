// Shared clone utility functions used by getCloneGallery, cleanupBrokenClones,
// and other clone-related backend functions.

// Derive a readable site name from any URL (e.g. https://gong.io → "Gong.io", https://revolut.com → "Revolut")
export function deriveNameFromUrl(url) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const parts = host.split('.');
    if (parts.length >= 2) {
      const domain = parts[0];
      if (parts.length === 2 && parts[1].length <= 3) {
        return domain.charAt(0).toUpperCase() + domain.slice(1) + '.' + parts[1];
      }
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    }
    return host.charAt(0).toUpperCase() + host.slice(1);
  } catch { return null; }
}

// Decode common HTML entities in names
export function decodeHtmlEntities(str) {
  if (!str) return str;
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

// Find the parent project ID from a heal tracker's logs
export function findParentId(p) {
  const log = p.metadata?.log || [];
  const healLog = log.find(l => l.includes('Heal mode: loading project'));
  if (healLog) {
    const match = healLog.match(/loading project ([a-f0-9]+)/);
    return match ? match[1] : null;
  }
  return null;
}

// Trace the heal chain to find the original benchmark_url
export function traceBenchmarkUrl(p, projectMap, visited = new Set()) {
  if (!p || visited.has(p.id)) return null;
  visited.add(p.id);
  if (p.benchmark_url) return p.benchmark_url;
  const parentId = findParentId(p);
  if (parentId && projectMap.has(parentId)) {
    return traceBenchmarkUrl(projectMap.get(parentId), projectMap, visited);
  }
  return null;
}

// Check if a project name is generic (auto-generated, not from the original site)
export function isGenericName(name) {
  if (!name) return true;
  if (name.startsWith('Autonomous Clone')) return true;
  if (name === 'Clone' || name === 'CLONE') return true;
  if (/^Clone (heal\d+|[a-z0-9]{3,})$/.test(name)) return true;
  // Names that don't end with "Clone" are from the old naming scheme and need renaming
  if (!/\bClone\b/.test(name)) return true;
  return false;
}