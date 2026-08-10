// Construction & contractor industry taxonomy for the Clone Gallery.
// Each industry belongs to a group for organized display.
// The `label` is the canonical industry string stored on LaunchProject and CloneQueue records.

export const CLONE_INDUSTRIES = [
  // Flooring & Surfaces
  { id: 'epoxy-flooring', label: 'Epoxy & Garage Flooring', group: 'Flooring & Surfaces' },
  { id: 'concrete-polishing', label: 'Concrete & Polishing', group: 'Flooring & Surfaces' },
  { id: 'tile-stone', label: 'Tile & Stone Installation', group: 'Flooring & Surfaces' },
  { id: 'flooring-installation', label: 'Flooring Installation', group: 'Flooring & Surfaces' },
  { id: 'countertops', label: 'Countertops & Surfaces', group: 'Flooring & Surfaces' },
  // Exterior & Structure
  { id: 'roofing', label: 'Roofing', group: 'Exterior & Structure' },
  { id: 'siding', label: 'Siding & Exterior', group: 'Exterior & Structure' },
  { id: 'windows-doors', label: 'Windows & Doors', group: 'Exterior & Structure' },
  { id: 'gutters', label: 'Gutters & Drainage', group: 'Exterior & Structure' },
  { id: 'stucco-eifs', label: 'Stucco & EIFS', group: 'Exterior & Structure' },
  { id: 'foundation-repair', label: 'Foundation Repair', group: 'Exterior & Structure' },
  { id: 'waterproofing', label: 'Waterproofing', group: 'Exterior & Structure' },
  // Mechanical & Systems
  { id: 'hvac', label: 'HVAC & Air Conditioning', group: 'Mechanical & Systems' },
  { id: 'plumbing', label: 'Plumbing', group: 'Mechanical & Systems' },
  { id: 'electrical', label: 'Electrical', group: 'Mechanical & Systems' },
  { id: 'solar', label: 'Solar Installation', group: 'Mechanical & Systems' },
  { id: 'insulation', label: 'Insulation', group: 'Mechanical & Systems' },
  { id: 'smart-home', label: 'Smart Home & Security', group: 'Mechanical & Systems' },
  // Remodeling & Interior
  { id: 'kitchen-remodeling', label: 'Kitchen Remodeling', group: 'Remodeling & Interior' },
  { id: 'bathroom-remodeling', label: 'Bathroom Remodeling', group: 'Remodeling & Interior' },
  { id: 'basement-finishing', label: 'Basement Finishing', group: 'Remodeling & Interior' },
  { id: 'drywall', label: 'Drywall Installation', group: 'Remodeling & Interior' },
  { id: 'painting', label: 'Painting', group: 'Remodeling & Interior' },
  { id: 'cabinets', label: 'Cabinets & Refacing', group: 'Remodeling & Interior' },
  // Outdoor & Landscape
  { id: 'landscaping', label: 'Landscaping & Hardscaping', group: 'Outdoor & Landscape' },
  { id: 'deck-building', label: 'Deck Building', group: 'Outdoor & Landscape' },
  { id: 'fencing', label: 'Fencing & Gates', group: 'Outdoor & Landscape' },
  { id: 'paving-asphalt', label: 'Paving & Asphalt', group: 'Outdoor & Landscape' },
  { id: 'patio-outdoor-living', label: 'Patio & Outdoor Living', group: 'Outdoor & Landscape' },
  { id: 'tree-service', label: 'Tree Service', group: 'Outdoor & Landscape' },
  { id: 'excavation', label: 'Excavation & Grading', group: 'Outdoor & Landscape' },
  // Specialty & Restoration
  { id: 'restoration', label: 'Fire & Water Restoration', group: 'Specialty & Restoration' },
  { id: 'mold-remediation', label: 'Mold & Air Quality', group: 'Specialty & Restoration' },
  { id: 'pest-control', label: 'Pest Control', group: 'Specialty & Restoration' },
  { id: 'pool-spa', label: 'Pool & Spa', group: 'Specialty & Restoration' },
  { id: 'septic-well', label: 'Septic & Well Services', group: 'Specialty & Restoration' },
  { id: 'masonry', label: 'Masonry & Stone', group: 'Specialty & Restoration' },
  // General & Commercial
  { id: 'general-contractor', label: 'General Contractor', group: 'General & Commercial' },
  { id: 'commercial-construction', label: 'Commercial Construction', group: 'General & Commercial' },
  { id: 'home-builder', label: 'Home Builder', group: 'General & Commercial' },
  { id: 'garage-builder', label: 'Garage Builder', group: 'General & Commercial' },
  { id: 'property-maintenance', label: 'Property Maintenance', group: 'General & Commercial' },
];

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