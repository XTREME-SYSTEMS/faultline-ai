// Construction & contractor industry taxonomy for the Clone Gallery.
// Each industry belongs to a group for organized display.
// The `label` is the canonical industry string stored on LaunchProject and CloneQueue records.
// The `businesses` array contains REAL businesses found via web search — used as
// reference sites for cloning, categorization, and classification matching.

export const CLONE_INDUSTRIES = [
  // Flooring & Surfaces
  {
    id: 'epoxy-flooring', label: 'Epoxy & Garage Flooring', group: 'Flooring & Surfaces',
    businesses: [
      { name: 'Contec Supply', url: 'https://contecsupply.com' },
      { name: 'Epoxy Floors by Welch', url: 'https://www.epoxyfloorsbywelch.com' },
      { name: 'American Dream Epoxy', url: 'https://www.americandreamepoxy.com' },
      { name: 'Shinecrete', url: 'https://www.shinecrete.com' },
    ],
  },
  {
    id: 'concrete-polishing', label: 'Concrete & Polishing', group: 'Flooring & Surfaces',
    businesses: [
      { name: 'Los Angeles Concrete Polishing', url: 'https://losangelesconcretepolishing.com' },
      { name: 'Polished Concrete Solutions', url: 'https://www.polishedconcretesolution.com' },
      { name: 'Rose Restoration', url: 'https://www.roserestoration.com' },
      { name: 'StoneShine', url: 'https://www.stoneshine.net' },
      { name: 'Concepts in Concrete', url: 'https://philadelphiaconcretefloor.com' },
    ],
  },
  {
    id: 'tile-stone', label: 'Tile & Stone Installation', group: 'Flooring & Surfaces',
    businesses: [
      { name: 'TilesMax Remodeling', url: 'https://www.tilesmax.com' },
      { name: 'Universal Stone', url: 'https://universalstonenc.com' },
    ],
  },
  {
    id: 'flooring-installation', label: 'Flooring Installation', group: 'Flooring & Surfaces',
    businesses: [
      { name: 'Empire Today', url: 'https://www.empiretoday.com' },
      { name: 'Luna Carpet', url: 'https://www.lunacarpet.com' },
    ],
  },
  {
    id: 'countertops', label: 'Countertops & Surfaces', group: 'Flooring & Surfaces',
    businesses: [
      { name: 'Universal Stone', url: 'https://universalstonenc.com' },
      { name: 'IGS Countertops', url: 'https://www.igscountertops.com' },
      { name: 'Stone & Beyond', url: 'https://www.stoneandbeyond.com' },
      { name: 'Kitchen Man', url: 'https://kitchenmannc.com' },
    ],
  },
  // Exterior & Structure
  {
    id: 'roofing', label: 'Roofing', group: 'Exterior & Structure',
    businesses: [
      { name: 'Tecta America', url: 'https://www.tectaamerica.com' },
      { name: 'CentiMark', url: 'https://www.centimark.com' },
      { name: 'Flynn Group', url: 'https://flynncompanies.com' },
      { name: 'Baker Roofing', url: 'https://www.bakerroofing.com' },
      { name: 'Erie Home', url: 'https://www.eriehome.com' },
      { name: 'Nations Roof', url: 'https://www.nationsroof.com' },
      { name: 'RoofConnect', url: 'https://www.roofconnect.com' },
      { name: 'Owl Roofing', url: 'https://owlroofing.com' },
    ],
  },
  {
    id: 'siding', label: 'Siding & Exterior', group: 'Exterior & Structure',
    businesses: [
      { name: 'James Hardie', url: 'https://www.jameshardie.com' },
      { name: 'CertainTeed Siding', url: 'https://www.certainteed.com/siding' },
    ],
  },
  {
    id: 'windows-doors', label: 'Windows & Doors', group: 'Exterior & Structure',
    businesses: [
      { name: 'Renewal by Andersen', url: 'https://www.renewalbyandersen.com' },
      { name: 'Window World', url: 'https://www.windowworld.com' },
      { name: 'Pella Windows', url: 'https://www.pella.com' },
    ],
  },
  {
    id: 'gutters', label: 'Gutters & Drainage', group: 'Exterior & Structure',
    businesses: [
      { name: 'LeafFilter', url: 'https://www.leaffilter.com' },
      { name: 'Gutter Helmet', url: 'https://www.gutterhelmet.com' },
    ],
  },
  {
    id: 'stucco-eifs', label: 'Stucco & EIFS', group: 'Exterior & Structure',
    businesses: [
      { name: 'Dryvit Systems', url: 'https://www.dryvit.com' },
      { name: 'Parex USA', url: 'https://www.parexusa.com' },
    ],
  },
  {
    id: 'foundation-repair', label: 'Foundation Repair', group: 'Exterior & Structure',
    businesses: [
      { name: 'Olshan Foundation Repair', url: 'https://www.olshanfoundation.com' },
      { name: 'Groundworks', url: 'https://www.groundworks.com' },
      { name: 'Baird Foundation Repair', url: 'https://www.bairdfoundation.com' },
      { name: 'Ram Jack', url: 'https://www.ramjack.com' },
      { name: 'Allied Foundation Repair', url: 'https://www.crackedslab.com' },
      { name: 'Deep Rock Foundations', url: 'https://www.deeprockfoundations.com' },
    ],
  },
  {
    id: 'waterproofing', label: 'Waterproofing', group: 'Exterior & Structure',
    businesses: [
      { name: 'Basement Systems', url: 'https://www.basementsystems.com' },
      { name: 'Healthy Basement Systems', url: 'https://www.healthybasement.com' },
    ],
  },
  // Mechanical & Systems
  {
    id: 'hvac', label: 'HVAC & Air Conditioning', group: 'Mechanical & Systems',
    businesses: [
      { name: 'Goettl Air Conditioning & Plumbing', url: 'https://www.goettl.com' },
      { name: 'Reliable Heating & Air', url: 'https://www.reliableheatingandair.com' },
      { name: 'PV Heating Cooling & Plumbing', url: 'https://www.pvheatingcooling.com' },
      { name: 'Hiller Plumbing Heating Cooling & Electrical', url: 'https://www.hillerplumbing.com' },
      { name: 'Absolute Comfort Air', url: 'https://www.absolutecomfortair.com' },
    ],
  },
  {
    id: 'plumbing', label: 'Plumbing', group: 'Mechanical & Systems',
    businesses: [
      { name: 'Roto-Rooter', url: 'https://www.rotorooter.com' },
      { name: 'Mr. Rooter Plumbing', url: 'https://www.mrrooter.com' },
      { name: 'Goettl Plumbing', url: 'https://www.goettl.com' },
      { name: 'Hiller Plumbing', url: 'https://www.hillerplumbing.com' },
      { name: 'F.W. Webb Company', url: 'https://www.fwwebb.com' },
      { name: 'High Priority Plumbing', url: 'https://www.highpriorityplumbing.com' },
    ],
  },
  {
    id: 'electrical', label: 'Electrical', group: 'Mechanical & Systems',
    businesses: [
      { name: 'Mister Sparky', url: 'https://www.mistersparky.com' },
      { name: 'Mr. Electric', url: 'https://www.mrelectric.com' },
    ],
  },
  {
    id: 'solar', label: 'Solar Installation', group: 'Mechanical & Systems',
    businesses: [
      { name: 'Blue Raven Solar', url: 'https://www.blueravensolar.com' },
      { name: 'Palmetto Solar', url: 'https://www.palmetto.com' },
      { name: 'SunLux', url: 'https://www.sunlux.com' },
      { name: 'Green Home Systems', url: 'https://www.greenhomesystems.com' },
      { name: 'Affordable Solar Roof & Air', url: 'https://www.affordablesolarroofandair.com' },
      { name: 'Lumina Solar', url: 'https://www.luminasolar.com' },
      { name: 'SUNation Energy', url: 'https://www.sunation.com' },
      { name: 'All Energy Solar', url: 'https://www.allenergysolar.com' },
    ],
  },
  {
    id: 'insulation', label: 'Insulation', group: 'Mechanical & Systems',
    businesses: [
      { name: 'Insulation Corporation of America', url: 'https://www.icainsulation.com' },
      { name: 'USA Insulation', url: 'https://www.usainsulation.net' },
    ],
  },
  {
    id: 'smart-home', label: 'Smart Home & Security', group: 'Mechanical & Systems',
    businesses: [
      { name: 'Vivint Smart Home', url: 'https://www.vivint.com' },
      { name: 'ADT', url: 'https://www.adt.com' },
    ],
  },
  // Remodeling & Interior
  {
    id: 'kitchen-remodeling', label: 'Kitchen Remodeling', group: 'Remodeling & Interior',
    businesses: [
      { name: 'McCullough Construction', url: 'https://www.mcculloughconstruction.com' },
      { name: 'Limitless Renovations Statewide', url: 'https://www.limitlessrenovations.com' },
      { name: 'Custom Professional Remodeling', url: 'https://www.customproremodeling.com' },
      { name: 'BCM London', url: 'https://www.bcmlondon.com' },
      { name: 'Interiors by Abraham', url: 'https://www.interiorsbyabraham.com' },
      { name: 'Cabinets of Atlanta', url: 'https://www.cabinetsofatlanta.com' },
    ],
  },
  {
    id: 'bathroom-remodeling', label: 'Bathroom Remodeling', group: 'Remodeling & Interior',
    businesses: [
      { name: 'TilesMax Remodeling', url: 'https://www.tilesmax.com' },
      { name: 'StoneUnlimited Kitchen and Bath', url: 'https://www.stoneunlimited.net' },
      { name: 'Dream Renovations', url: 'https://www.dreamrenovations.com' },
      { name: 'Avatar Contractor Group', url: 'https://www.avatarcontractor.com' },
      { name: 'Chambless Hall Design', url: 'https://www.chambleshall.com' },
    ],
  },
  {
    id: 'basement-finishing', label: 'Basement Finishing', group: 'Remodeling & Interior',
    businesses: [
      { name: 'Total Basement Finishing', url: 'https://www.totalbasementfinishing.com' },
      { name: 'Basement Systems', url: 'https://www.basementsystems.com' },
    ],
  },
  {
    id: 'drywall', label: 'Drywall Installation', group: 'Remodeling & Interior',
    businesses: [
      { name: 'M&R Drywall and Painting', url: 'https://www.mrdrywallandpainting.com' },
      { name: 'Drywall by Design', url: 'https://www.drywallbydesign.com' },
    ],
  },
  {
    id: 'painting', label: 'Painting', group: 'Remodeling & Interior',
    businesses: [
      { name: 'CertaPro Painters', url: 'https://www.certapro.com' },
      { name: 'Cutting Edge Painting', url: 'https://www.cuttingedgepaintingnm.com' },
      { name: "Mike's Quality Painting", url: 'https://www.mikesqualitypainting.com' },
      { name: 'Masterson Painting', url: 'https://mastersonpainting.com' },
      { name: "Andy's Painting", url: 'https://andyspainting.com' },
      { name: 'Five Star Painting', url: 'https://www.fivestarpainting.com' },
    ],
  },
  {
    id: 'cabinets', label: 'Cabinets & Refacing', group: 'Remodeling & Interior',
    businesses: [
      { name: 'Cabinets of Atlanta', url: 'https://www.cabinetsofatlanta.com' },
      { name: 'Berkeley Architectural Interior Woodworking', url: 'https://www.berkeleyarchitectural.com' },
      { name: 'Kitchen Solvers', url: 'https://www.kitchensolvers.com' },
    ],
  },
  // Outdoor & Landscape
  {
    id: 'landscaping', label: 'Landscaping & Hardscaping', group: 'Outdoor & Landscape',
    businesses: [
      { name: 'BrightView Holdings', url: 'https://www.brightview.com' },
      { name: 'Park West Companies', url: 'https://www.parkwestcompanies.com' },
      { name: 'Bemus Landscape', url: 'https://www.bemuslandscape.com' },
      { name: 'Flores Artscape', url: 'https://www.floresartscape.com' },
      { name: 'Green Advisor', url: 'https://greenadvisorinc.com' },
      { name: 'Gothic Landscape', url: 'https://www.gothiclandscape.com' },
      { name: 'Cagwin & Sagara', url: 'https://www.cagwinsagara.com' },
    ],
  },
  {
    id: 'deck-building', label: 'Deck Building', group: 'Outdoor & Landscape',
    businesses: [
      { name: 'The Deck & Fence Company', url: 'https://www.thedeckandfencecompany.com' },
      { name: 'Loudoun Deck and Fence', url: 'https://loudoundeckandfence.com' },
      { name: 'Northern Virginia Deck & Fence', url: 'https://www.nvdeck.com' },
      { name: 'Loudoun Decks', url: 'https://www.loudoundecks.com' },
      { name: 'Nova Deck Doctor', url: 'https://www.novadeckdoctor.com' },
    ],
  },
  {
    id: 'fencing', label: 'Fencing & Gates', group: 'Outdoor & Landscape',
    businesses: [
      { name: 'Fence & Deck Connection', url: 'https://www.fenceanddeckconnection.com' },
      { name: 'Builders Fence Co', url: 'https://www.buildersfenceco.com' },
      { name: 'Tri-County Fence', url: 'https://www.tricountyfence.com' },
      { name: 'All About Fences', url: 'https://www.allaboutfences.com' },
    ],
  },
  {
    id: 'paving-asphalt', label: 'Paving & Asphalt', group: 'Outdoor & Landscape',
    businesses: [
      { name: 'Rose Paving', url: 'https://www.rosepaving.com' },
      { name: 'Pavement Coatings', url: 'https://www.pavementcoatings.com' },
    ],
  },
  {
    id: 'patio-outdoor-living', label: 'Patio & Outdoor Living', group: 'Outdoor & Landscape',
    businesses: [
      { name: 'Green Advisor', url: 'https://greenadvisorinc.com' },
      { name: 'Artisan Outdoor Living', url: 'https://www.artisanoutdoorliving.com' },
    ],
  },
  {
    id: 'tree-service', label: 'Tree Service', group: 'Outdoor & Landscape',
    businesses: [
      { name: "Davey Tree Expert", url: 'https://www.davey.com' },
      { name: 'SavATree', url: 'https://www.savatree.com' },
    ],
  },
  {
    id: 'excavation', label: 'Excavation & Grading', group: 'Outdoor & Landscape',
    businesses: [
      { name: 'Arrow Land + Structures', url: 'https://www.arrowlandandstructures.com' },
      { name: 'Alluvium Landscapes', url: 'https://www.alluviumlandscapes.com' },
    ],
  },
  // Specialty & Restoration
  {
    id: 'restoration', label: 'Fire & Water Restoration', group: 'Specialty & Restoration',
    businesses: [
      { name: 'SERVPRO', url: 'https://www.servpro.com' },
      { name: 'ServiceMaster Restore', url: 'https://www.servicemasterrestore.com' },
      { name: 'PuroClean', url: 'https://www.puroclean.com' },
    ],
  },
  {
    id: 'mold-remediation', label: 'Mold & Air Quality', group: 'Specialty & Restoration',
    businesses: [
      { name: 'Mold Medics', url: 'https://www.moldmedics.com' },
      { name: 'Indoor Science', url: 'https://indoor.science' },
    ],
  },
  {
    id: 'pest-control', label: 'Pest Control', group: 'Specialty & Restoration',
    businesses: [
      { name: 'Orkin', url: 'https://www.orkin.com' },
      { name: 'Terminix', url: 'https://www.terminix.com' },
      { name: 'Aptive Environmental', url: 'https://www.aptive.com' },
    ],
  },
  {
    id: 'pool-spa', label: 'Pool & Spa', group: 'Specialty & Restoration',
    businesses: [
      { name: 'Leslie’s Pool Supplies', url: 'https://www.lesliespool.com' },
      { name: 'Pool Corp', url: 'https://www.poolcorp.com' },
    ],
  },
  {
    id: 'septic-well', label: 'Septic & Well Services', group: 'Specialty & Restoration',
    businesses: [
      { name: 'Wind River Environmental', url: 'https://www.windriverenvironmental.com' },
      { name: 'Zaar Septic', url: 'https://www.zaarseptic.com' },
    ],
  },
  {
    id: 'masonry', label: 'Masonry & Stone', group: 'Specialty & Restoration',
    businesses: [
      { name: 'Masonry & Stone by Flores Artscape', url: 'https://www.floresartscape.com' },
      { name: 'Belden Brick', url: 'https://www.beldenbrick.com' },
    ],
  },
  // General & Commercial
  {
    id: 'general-contractor', label: 'General Contractor', group: 'General & Commercial',
    businesses: [
      { name: 'McCullough Construction', url: 'https://www.mcculloughconstruction.com' },
      { name: 'Limitless Renovations Statewide', url: 'https://www.limitlessrenovations.com' },
      { name: 'Custom Professional Remodeling', url: 'https://www.customproremodeling.com' },
      { name: 'Avatar Contractor Group', url: 'https://www.avatarcontractor.com' },
      { name: 'Sequoia Build Co', url: 'https://www.sequoiabuildco.com' },
      { name: 'Loyal Construction and Services', url: 'https://www.loyalconstruction.com' },
    ],
  },
  {
    id: 'commercial-construction', label: 'Commercial Construction', group: 'General & Commercial',
    businesses: [
      { name: 'Turner Construction', url: 'https://www.turnerconstruction.com' },
      { name: 'Bechtel', url: 'https://www.bechtel.com' },
      { name: 'DPR Construction', url: 'https://www.dpr.com' },
      { name: 'Whiting-Turner', url: 'https://www.whiting-turner.com' },
    ],
  },
  {
    id: 'home-builder', label: 'Home Builder', group: 'General & Commercial',
    businesses: [
      { name: 'Lennar', url: 'https://www.lennar.com' },
      { name: 'D.R. Horton', url: 'https://www.drhorton.com' },
      { name: 'Pulte Homes', url: 'https://www.pulte.com' },
      { name: 'Taylor Morrison', url: 'https://www.taylormorrison.com' },
    ],
  },
  {
    id: 'garage-builder', label: 'Garage Builder', group: 'General & Commercial',
    businesses: [
      { name: 'Danley’s Garage World', url: 'https://www.danleysgarageworld.com' },
      { name: 'Heartland Garage Builders', url: 'https://www.heartlandgarages.com' },
    ],
  },
  {
    id: 'property-maintenance', label: 'Property Maintenance', group: 'General & Commercial',
    businesses: [
      { name: 'FirstService Residential', url: 'https://www.fsresidential.com' },
      { name: 'Associa', url: 'https://www.associa.com' },
    ],
  },
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

// Returns a flat list of all real business reference sites across all industries.
// Used by the backend to seed discovery and classify sites by matching business names/URLs.
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
// Used for auto-categorization when a clone matches a known business.
export function classifyByBusinessReference(name, url) {
  if (!name && !url) return null;
  const refs = getAllBusinessReferences();
  const nameLower = (name || '').toLowerCase();
  const urlLower = (url || '').toLowerCase();

  // Try exact name match first
  for (const ref of refs) {
    if (nameLower && ref.name.toLowerCase() === nameLower) return ref.industry;
  }
  // Try URL domain match
  for (const ref of refs) {
    if (urlLower && ref.url) {
      try {
        const refHost = new URL(ref.url).hostname.replace(/^www\./, '');
        const siteHost = new URL(urlLower).hostname.replace(/^www\./, '');
        if (refHost === siteHost) return ref.industry;
      } catch {}
    }
  }
  // Try partial name match (business name contains site name or vice versa)
  for (const ref of refs) {
    if (nameLower && ref.name.toLowerCase().includes(nameLower) && nameLower.length > 3) return ref.industry;
    if (nameLower && nameLower.includes(ref.name.toLowerCase()) && ref.name.length > 3) return ref.industry;
  }
  return null;
}