// Comprehensive business industry taxonomy for the Clone Gallery.
// Covers every major business sector with sub-industries.
// Data is split across two sector files for maintainability.
// This file combines them and provides helper functions for grouping, filtering, and classification.

import { SECTOR_ONE_INDUSTRIES } from '@/lib/industries/sectorOne';
import { SECTOR_TWO_INDUSTRIES } from '@/lib/industries/sectorTwo';

export const CLONE_INDUSTRIES = [...SECTOR_ONE_INDUSTRIES, ...SECTOR_TWO_INDUSTRIES];

// Returns industries grouped by their group label, sorted alphabetically.
export function getIndustryGroups() {
  const groupMap = {};
  for (const ind of CLONE_INDUSTRIES) {
    if (!groupMap[ind.group]) groupMap[ind.group] = [];
    groupMap[ind.group].push(ind);
  }
  return Object.entries(groupMap)
    .map(([group, industries]) => ({ group, industries }))
    .sort((a, b) => a.group.localeCompare(b.group));
}

// Returns all unique group names, sorted.
export function getIndustryGroupNames() {
  return [...new Set(CLONE_INDUSTRIES.map(i => i.group))].sort();
}

// Returns a flat list of all real business reference sites across all industries.
export function getAllBusinessReferences() {
  return CLONE_INDUSTRIES.flatMap(ind =>
    (ind.businesses || []).map(biz => ({
      ...biz,
      industry: ind.label,
      industry_id: ind.id,
      group: ind.group,
    }))
  );
}

// Matches a site name or URL against known business references and returns the industry label.
export function classifyByBusinessReference(name, url) {
  if (!name && !url) return null;
  const refs = getAllBusinessReferences();
  const nameLower = (name || '').toLowerCase();
  const urlLower = (url || '').toLowerCase();

  // Exact name match
  for (const ref of refs) {
    if (nameLower && ref.name.toLowerCase() === nameLower) return ref.industry;
  }
  // URL domain match
  for (const ref of refs) {
    if (urlLower && ref.url) {
      try {
        const refHost = new URL(ref.url).hostname.replace(/^www\./, '');
        const siteHost = new URL(urlLower).hostname.replace(/^www\./, '');
        if (refHost === siteHost) return ref.industry;
      } catch {}
    }
  }
  // Partial name match
  for (const ref of refs) {
    if (nameLower && ref.name.toLowerCase().includes(nameLower) && nameLower.length > 3) return ref.industry;
    if (nameLower && nameLower.includes(ref.name.toLowerCase()) && ref.name.length > 3) return ref.industry;
  }
  return null;
}