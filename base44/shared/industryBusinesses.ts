// Real business references for ALL business industries.
// Used by backend functions to classify and categorize cloned sites.
// Mirrors src/lib/cloneIndustries.js — keep in sync.
// Data is split across two sector files for maintainability.

import { SECTOR_ONE_INDUSTRIES } from './industriesSectorOne.ts';
import { SECTOR_TWO_INDUSTRIES } from './industriesSectorTwo.ts';

export const ALL_INDUSTRIES = [...SECTOR_ONE_INDUSTRIES, ...SECTOR_TWO_INDUSTRIES];

// Flatten to a list of { name, url, industry } for easy iteration.
export function getAllBusinessRefs(): { name: string; url: string; industry: string }[] {
  const out: { name: string; url: string; industry: string }[] = [];
  for (const ind of ALL_INDUSTRIES) {
    for (const biz of (ind.businesses || [])) {
      out.push({ ...biz, industry: ind.label });
    }
  }
  return out;
}

// Classify a site by matching its name or URL against known business references.
// Returns the industry label, or null if no match.
export function classifyByBusinessRef(name: string | null, url: string | null): string | null {
  if (!name && !url) return null;
  const refs = getAllBusinessRefs();
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
    if (nameLower && ref.name.length > 3) {
      if (ref.name.toLowerCase().includes(nameLower) || nameLower.includes(ref.name.toLowerCase())) {
        return ref.industry;
      }
    }
  }
  return null;
}