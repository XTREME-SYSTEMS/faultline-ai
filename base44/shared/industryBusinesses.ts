// Real business references for construction industries.
// Used by backend functions to classify and categorize cloned sites.
// Mirrors src/lib/cloneIndustries.js — keep in sync.

export const INDUSTRY_BUSINESSES: Record<string, { name: string; url: string }[]> = {
  'Epoxy & Garage Flooring': [
    { name: 'Contec Supply', url: 'https://contecsupply.com' },
    { name: 'Epoxy Floors by Welch', url: 'https://www.epoxyfloorsbywelch.com' },
    { name: 'American Dream Epoxy', url: 'https://www.americandreamepoxy.com' },
    { name: 'Shinecrete', url: 'https://www.shinecrete.com' },
  ],
  'Concrete & Polishing': [
    { name: 'Los Angeles Concrete Polishing', url: 'https://losangelesconcretepolishing.com' },
    { name: 'Polished Concrete Solutions', url: 'https://www.polishedconcretesolution.com' },
    { name: 'Rose Restoration', url: 'https://www.roserestoration.com' },
    { name: 'StoneShine', url: 'https://www.stoneshine.net' },
    { name: 'Concepts in Concrete', url: 'https://philadelphiaconcretefloor.com' },
  ],
  'Tile & Stone Installation': [
    { name: 'TilesMax Remodeling', url: 'https://www.tilesmax.com' },
    { name: 'Universal Stone', url: 'https://universalstonenc.com' },
  ],
  'Flooring Installation': [
    { name: 'Empire Today', url: 'https://www.empiretoday.com' },
    { name: 'Luna Carpet', url: 'https://www.lunacarpet.com' },
  ],
  'Countertops & Surfaces': [
    { name: 'Universal Stone', url: 'https://universalstonenc.com' },
    { name: 'IGS Countertops', url: 'https://www.igscountertops.com' },
    { name: 'Stone & Beyond', url: 'https://www.stoneandbeyond.com' },
    { name: 'Kitchen Man', url: 'https://kitchenmannc.com' },
  ],
  'Roofing': [
    { name: 'Tecta America', url: 'https://www.tectaamerica.com' },
    { name: 'CentiMark', url: 'https://www.centimark.com' },
    { name: 'Flynn Group', url: 'https://flynncompanies.com' },
    { name: 'Baker Roofing', url: 'https://www.bakerroofing.com' },
    { name: 'Erie Home', url: 'https://www.eriehome.com' },
    { name: 'Nations Roof', url: 'https://www.nationsroof.com' },
    { name: 'RoofConnect', url: 'https://www.roofconnect.com' },
    { name: 'Owl Roofing', url: 'https://owlroofing.com' },
  ],
  'Siding & Exterior': [
    { name: 'James Hardie', url: 'https://www.jameshardie.com' },
    { name: 'CertainTeed Siding', url: 'https://www.certainteed.com/siding' },
  ],
  'Windows & Doors': [
    { name: 'Renewal by Andersen', url: 'https://www.renewalbyandersen.com' },
    { name: 'Window World', url: 'https://www.windowworld.com' },
    { name: 'Pella Windows', url: 'https://www.pella.com' },
  ],
  'Gutters & Drainage': [
    { name: 'LeafFilter', url: 'https://www.leaffilter.com' },
    { name: 'Gutter Helmet', url: 'https://www.gutterhelmet.com' },
  ],
  'Stucco & EIFS': [
    { name: 'Dryvit Systems', url: 'https://www.dryvit.com' },
    { name: 'Parex USA', url: 'https://www.parexusa.com' },
  ],
  'Foundation Repair': [
    { name: 'Olshan Foundation Repair', url: 'https://www.olshanfoundation.com' },
    { name: 'Groundworks', url: 'https://www.groundworks.com' },
    { name: 'Baird Foundation Repair', url: 'https://www.bairdfoundation.com' },
    { name: 'Ram Jack', url: 'https://www.ramjack.com' },
    { name: 'Allied Foundation Repair', url: 'https://www.crackedslab.com' },
    { name: 'Deep Rock Foundations', url: 'https://www.deeprockfoundations.com' },
  ],
  'Waterproofing': [
    { name: 'Basement Systems', url: 'https://www.basementsystems.com' },
    { name: 'Healthy Basement Systems', url: 'https://www.healthybasement.com' },
  ],
  'HVAC & Air Conditioning': [
    { name: 'Goettl Air Conditioning & Plumbing', url: 'https://www.goettl.com' },
    { name: 'Reliable Heating & Air', url: 'https://www.reliableheatingandair.com' },
    { name: 'PV Heating Cooling & Plumbing', url: 'https://www.pvheatingcooling.com' },
    { name: 'Hiller Plumbing Heating Cooling & Electrical', url: 'https://www.hillerplumbing.com' },
    { name: 'Absolute Comfort Air', url: 'https://www.absolutecomfortair.com' },
  ],
  'Plumbing': [
    { name: 'Roto-Rooter', url: 'https://www.rotorooter.com' },
    { name: 'Mr. Rooter Plumbing', url: 'https://www.mrrooter.com' },
    { name: 'Goettl Plumbing', url: 'https://www.goettl.com' },
    { name: 'Hiller Plumbing', url: 'https://www.hillerplumbing.com' },
    { name: 'F.W. Webb Company', url: 'https://www.fwwebb.com' },
    { name: 'High Priority Plumbing', url: 'https://www.highpriorityplumbing.com' },
  ],
  'Electrical': [
    { name: 'Mister Sparky', url: 'https://www.mistersparky.com' },
    { name: 'Mr. Electric', url: 'https://www.mrelectric.com' },
  ],
  'Solar Installation': [
    { name: 'Blue Raven Solar', url: 'https://www.blueravensolar.com' },
    { name: 'Palmetto Solar', url: 'https://www.palmetto.com' },
    { name: 'SunLux', url: 'https://www.sunlux.com' },
    { name: 'Green Home Systems', url: 'https://www.greenhomesystems.com' },
    { name: 'Affordable Solar Roof & Air', url: 'https://www.affordablesolarroofandair.com' },
    { name: 'Lumina Solar', url: 'https://www.luminasolar.com' },
    { name: 'SUNation Energy', url: 'https://www.sunation.com' },
    { name: 'All Energy Solar', url: 'https://www.allenergysolar.com' },
  ],
  'Insulation': [
    { name: 'Insulation Corporation of America', url: 'https://www.icainsulation.com' },
    { name: 'USA Insulation', url: 'https://www.usainsulation.net' },
  ],
  'Smart Home & Security': [
    { name: 'Vivint Smart Home', url: 'https://www.vivint.com' },
    { name: 'ADT', url: 'https://www.adt.com' },
  ],
  'Kitchen Remodeling': [
    { name: 'McCullough Construction', url: 'https://www.mcculloughconstruction.com' },
    { name: 'Limitless Renovations Statewide', url: 'https://www.limitlessrenovations.com' },
    { name: 'Custom Professional Remodeling', url: 'https://www.customproremodeling.com' },
    { name: 'BCM London', url: 'https://www.bcmlondon.com' },
    { name: 'Interiors by Abraham', url: 'https://www.interiorsbyabraham.com' },
    { name: 'Cabinets of Atlanta', url: 'https://www.cabinetsofatlanta.com' },
  ],
  'Bathroom Remodeling': [
    { name: 'TilesMax Remodeling', url: 'https://www.tilesmax.com' },
    { name: 'StoneUnlimited Kitchen and Bath', url: 'https://www.stoneunlimited.net' },
    { name: 'Dream Renovations', url: 'https://www.dreamrenovations.com' },
    { name: 'Avatar Contractor Group', url: 'https://www.avatarcontractor.com' },
    { name: 'Chambless Hall Design', url: 'https://www.chambleshall.com' },
  ],
  'Basement Finishing': [
    { name: 'Total Basement Finishing', url: 'https://www.totalbasementfinishing.com' },
    { name: 'Basement Systems', url: 'https://www.basementsystems.com' },
  ],
  'Drywall Installation': [
    { name: 'M&R Drywall and Painting', url: 'https://www.mrdrywallandpainting.com' },
    { name: 'Drywall by Design', url: 'https://www.drywallbydesign.com' },
  ],
  'Painting': [
    { name: 'CertaPro Painters', url: 'https://www.certapro.com' },
    { name: 'Cutting Edge Painting', url: 'https://www.cuttingedgepaintingnm.com' },
    { name: "Mike's Quality Painting", url: 'https://www.mikesqualitypainting.com' },
    { name: 'Masterson Painting', url: 'https://mastersonpainting.com' },
    { name: "Andy's Painting", url: 'https://andyspainting.com' },
    { name: 'Five Star Painting', url: 'https://www.fivestarpainting.com' },
  ],
  'Cabinets & Refacing': [
    { name: 'Cabinets of Atlanta', url: 'https://www.cabinetsofatlanta.com' },
    { name: 'Berkeley Architectural Interior Woodworking', url: 'https://www.berkeleyarchitectural.com' },
    { name: 'Kitchen Solvers', url: 'https://www.kitchensolvers.com' },
  ],
  'Landscaping & Hardscaping': [
    { name: 'BrightView Holdings', url: 'https://www.brightview.com' },
    { name: 'Park West Companies', url: 'https://www.parkwestcompanies.com' },
    { name: 'Bemus Landscape', url: 'https://www.bemuslandscape.com' },
    { name: 'Flores Artscape', url: 'https://www.floresartscape.com' },
    { name: 'Green Advisor', url: 'https://greenadvisorinc.com' },
    { name: 'Gothic Landscape', url: 'https://www.gothiclandscape.com' },
    { name: 'Cagwin & Sagara', url: 'https://www.cagwinsagara.com' },
  ],
  'Deck Building': [
    { name: 'The Deck & Fence Company', url: 'https://www.thedeckandfencecompany.com' },
    { name: 'Loudoun Deck and Fence', url: 'https://loudoundeckandfence.com' },
    { name: 'Northern Virginia Deck & Fence', url: 'https://www.nvdeck.com' },
    { name: 'Loudoun Decks', url: 'https://www.loudoundecks.com' },
    { name: 'Nova Deck Doctor', url: 'https://www.novadeckdoctor.com' },
  ],
  'Fencing & Gates': [
    { name: 'Fence & Deck Connection', url: 'https://www.fenceanddeckconnection.com' },
    { name: 'Builders Fence Co', url: 'https://www.buildersfenceco.com' },
    { name: 'Tri-County Fence', url: 'https://www.tricountyfence.com' },
    { name: 'All About Fences', url: 'https://www.allaboutfences.com' },
  ],
  'Paving & Asphalt': [
    { name: 'Rose Paving', url: 'https://www.rosepaving.com' },
    { name: 'Pavement Coatings', url: 'https://www.pavementcoatings.com' },
  ],
  'Patio & Outdoor Living': [
    { name: 'Green Advisor', url: 'https://greenadvisorinc.com' },
    { name: 'Artisan Outdoor Living', url: 'https://www.artisanoutdoorliving.com' },
  ],
  'Tree Service': [
    { name: "Davey Tree Expert", url: 'https://www.davey.com' },
    { name: 'SavATree', url: 'https://www.savatree.com' },
  ],
  'Excavation & Grading': [
    { name: 'Arrow Land + Structures', url: 'https://www.arrowlandandstructures.com' },
    { name: 'Alluvium Landscapes', url: 'https://www.alluviumlandscapes.com' },
  ],
  'Fire & Water Restoration': [
    { name: 'SERVPRO', url: 'https://www.servpro.com' },
    { name: 'ServiceMaster Restore', url: 'https://www.servicemasterrestore.com' },
    { name: 'PuroClean', url: 'https://www.puroclean.com' },
  ],
  'Mold & Air Quality': [
    { name: 'Mold Medics', url: 'https://www.moldmedics.com' },
    { name: 'Indoor Science', url: 'https://indoor.science' },
  ],
  'Pest Control': [
    { name: 'Orkin', url: 'https://www.orkin.com' },
    { name: 'Terminix', url: 'https://www.terminix.com' },
    { name: 'Aptive Environmental', url: 'https://www.aptive.com' },
  ],
  'Pool & Spa': [
    { name: 'Leslie’s Pool Supplies', url: 'https://www.lesliespool.com' },
    { name: 'Pool Corp', url: 'https://www.poolcorp.com' },
  ],
  'Septic & Well Services': [
    { name: 'Wind River Environmental', url: 'https://www.windriverenvironmental.com' },
    { name: 'Zaar Septic', url: 'https://www.zaarseptic.com' },
  ],
  'Masonry & Stone': [
    { name: 'Masonry & Stone by Flores Artscape', url: 'https://www.floresartscape.com' },
    { name: 'Belden Brick', url: 'https://www.beldenbrick.com' },
  ],
  'General Contractor': [
    { name: 'McCullough Construction', url: 'https://www.mcculloughconstruction.com' },
    { name: 'Limitless Renovations Statewide', url: 'https://www.limitlessrenovations.com' },
    { name: 'Custom Professional Remodeling', url: 'https://www.customproremodeling.com' },
    { name: 'Avatar Contractor Group', url: 'https://www.avatarcontractor.com' },
    { name: 'Sequoia Build Co', url: 'https://www.sequoiabuildco.com' },
    { name: 'Loyal Construction and Services', url: 'https://www.loyalconstruction.com' },
  ],
  'Commercial Construction': [
    { name: 'Turner Construction', url: 'https://www.turnerconstruction.com' },
    { name: 'Bechtel', url: 'https://www.bechtel.com' },
    { name: 'DPR Construction', url: 'https://www.dpr.com' },
    { name: 'Whiting-Turner', url: 'https://www.whiting-turner.com' },
  ],
  'Home Builder': [
    { name: 'Lennar', url: 'https://www.lennar.com' },
    { name: 'D.R. Horton', url: 'https://www.drhorton.com' },
    { name: 'Pulte Homes', url: 'https://www.pulte.com' },
    { name: 'Taylor Morrison', url: 'https://www.taylormorrison.com' },
  ],
  'Garage Builder': [
    { name: 'Danley’s Garage World', url: 'https://www.danleysgarageworld.com' },
    { name: 'Heartland Garage Builders', url: 'https://www.heartlandgarages.com' },
  ],
  'Property Maintenance': [
    { name: 'FirstService Residential', url: 'https://www.fsresidential.com' },
    { name: 'Associa', url: 'https://www.associa.com' },
  ],
};

// Flatten to a list of { name, url, industry } for easy iteration.
export function getAllBusinessRefs() {
  const out: { name: string; url: string; industry: string }[] = [];
  for (const [industry, businesses] of Object.entries(INDUSTRY_BUSINESSES)) {
    for (const biz of businesses) out.push({ ...biz, industry });
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