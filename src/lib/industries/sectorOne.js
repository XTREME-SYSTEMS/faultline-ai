// Business industry taxonomy — Sector 1.
// Covers: Construction, Home Services, Healthcare, Financial, Technology, Retail, Food, Hospitality.
// Each industry has real business references for classification and cloning.

export const SECTOR_ONE_INDUSTRIES = [
  // ==================== CONSTRUCTION & CONTRACTING ====================
  {
    id: 'general-contracting', label: 'General Contracting', group: 'Construction & Contracting',
    businesses: [
      { name: 'Turner Construction', url: 'https://www.turnerconstruction.com' },
      { name: 'Bechtel', url: 'https://www.bechtel.com' },
      { name: 'Skanska', url: 'https://www.skanska.com' },
      { name: 'Kiewit', url: 'https://www.kiewit.com' },
    ],
  },
  {
    id: 'roofing', label: 'Roofing', group: 'Construction & Contracting',
    businesses: [
      { name: 'Tecta America', url: 'https://www.tectaamerica.com' },
      { name: 'CentiMark', url: 'https://www.centimark.com' },
      { name: 'Flynn Group', url: 'https://www.flynngroup.com' },
      { name: 'Erie Home', url: 'https://www.eriehome.com' },
    ],
  },
  {
    id: 'hvac', label: 'HVAC & Air Conditioning', group: 'Construction & Contracting',
    businesses: [
      { name: 'Goettl', url: 'https://www.goettl.com' },
      { name: 'Reliable Heating & Air', url: 'https://www.reliableair.com' },
      { name: 'Hiller', url: 'https://www.hillerplumbing.com' },
    ],
  },
  {
    id: 'plumbing', label: 'Plumbing', group: 'Construction & Contracting',
    businesses: [
      { name: 'Roto-Rooter', url: 'https://www.rotorooter.com' },
      { name: 'Mr. Rooter', url: 'https://www.mrrooter.com' },
      { name: 'F.W. Webb', url: 'https://www.fwwebb.com' },
    ],
  },
  {
    id: 'electrical', label: 'Electrical Contracting', group: 'Construction & Contracting',
    businesses: [
      { name: 'Mister Sparky', url: 'https://www.mistersparky.com' },
      { name: 'Mr. Electric', url: 'https://www.mrelectric.com' },
      { name: 'Morrow-Meadows', url: 'https://www.morrow-meadows.com' },
    ],
  },
  {
    id: 'foundation-repair', label: 'Foundation Repair', group: 'Construction & Contracting',
    businesses: [
      { name: 'Ram Jack', url: 'https://www.ramjack.com' },
      { name: 'Olshan Foundation', url: 'https://www.olshanfoundation.com' },
      { name: 'Foundation Supportworks', url: 'https://www.foundationsupportworks.com' },
    ],
  },
  {
    id: 'remodeling', label: 'Remodeling & Renovation', group: 'Construction & Contracting',
    businesses: [
      { name: 'Power Home Remodeling', url: 'https://www.powerhrg.com' },
      { name: 'West Shore Home', url: 'https://www.westshorehome.com' },
      { name: 'Kitchen Magic', url: 'https://www.kitchenmagic.com' },
    ],
  },
  {
    id: 'drywall-insulation', label: 'Drywall & Insulation', group: 'Construction & Contracting',
    businesses: [
      { name: 'USG', url: 'https://www.usg.com' },
      { name: 'CertainTeed', url: 'https://www.certainteed.com' },
      { name: 'Owens Corning', url: 'https://www.owenscorning.com' },
    ],
  },
  {
    id: 'framing-carpentry', label: 'Framing & Carpentry', group: 'Construction & Contracting',
    businesses: [
      { name: '84 Lumber', url: 'https://www.84lumber.com' },
      { name: 'Builders FirstSource', url: 'https://www.bldrs.com' },
    ],
  },
  {
    id: 'siding-exterior', label: 'Siding & Exterior', group: 'Construction & Contracting',
    businesses: [
      { name: 'James Hardie', url: 'https://www.jameshardie.com' },
      { name: 'CertainTeed Siding', url: 'https://www.certainteed.com/siding' },
      { name: 'LP Building Solutions', url: 'https://www.lpcorp.com' },
    ],
  },
  {
    id: 'windows-doors', label: 'Windows & Doors', group: 'Construction & Contracting',
    businesses: [
      { name: 'Andersen Windows', url: 'https://www.andersenwindows.com' },
      { name: 'Pella Windows', url: 'https://www.pella.com' },
      { name: 'Marvin', url: 'https://www.marvin.com' },
      { name: 'Renewal by Andersen', url: 'https://www.renewalbyandersen.com' },
    ],
  },
  {
    id: 'deck-patio', label: 'Deck & Patio Building', group: 'Construction & Contracting',
    businesses: [
      { name: 'Trex Decking', url: 'https://www.trex.com' },
      { name: 'TimberTech', url: 'https://www.timbertech.com' },
      { name: 'Archadeck', url: 'https://www.archadeck.com' },
    ],
  },
  {
    id: 'fencing', label: 'Fencing', group: 'Construction & Contracting',
    businesses: [
      { name: 'Jerith Fencing', url: 'https://www.jerith.com' },
      { name: 'Master Halco', url: 'https://www.masterhalco.com' },
    ],
  },
  {
    id: 'pools-spas', label: 'Pools & Spas', group: 'Construction & Contracting',
    businesses: [
      { name: 'Leslie Pool Supplies', url: 'https://www.lesliespool.com' },
      { name: 'Pool Corp', url: 'https://www.poolcorp.com' },
      { name: 'Anthony & Sylvan', url: 'https://www.anthonysylvan.com' },
    ],
  },
  {
    id: 'demolition', label: 'Demolition', group: 'Construction & Contracting',
    businesses: [
      { name: 'Demco', url: 'https://www.demco.com' },
      { name: 'Brandenburg', url: 'https://www.brandenburg.com' },
    ],
  },
  {
    id: 'land-surveying', label: 'Land Surveying', group: 'Construction & Contracting',
    businesses: [
      { name: 'Stantec', url: 'https://www.stantec.com' },
      { name: 'Terracon', url: 'https://www.terracon.com' },
    ],
  },
  {
    id: 'architecture', label: 'Architecture & Design', group: 'Construction & Contracting',
    businesses: [
      { name: 'Gensler', url: 'https://www.gensler.com' },
      { name: 'Perkins&Will', url: 'https://www.perkinswill.com' },
      { name: 'HOK', url: 'https://www.hok.com' },
      { name: 'SOM', url: 'https://www.som.com' },
    ],
  },
  {
    id: 'engineering-services', label: 'Engineering Services', group: 'Construction & Contracting',
    businesses: [
      { name: 'AECOM', url: 'https://www.aecom.com' },
      { name: 'Jacobs', url: 'https://www.jacobs.com' },
      { name: 'WSP', url: 'https://www.wsp.com' },
    ],
  },

  // ==================== HOME SERVICES & IMPROVEMENT ====================
  {
    id: 'epoxy-flooring', label: 'Epoxy & Garage Flooring', group: 'Home Services & Improvement',
    businesses: [
      { name: 'Contec Supply', url: 'https://contecsupply.com' },
      { name: 'Epoxy Floors by Welch', url: 'https://www.epoxyfloorsbywelch.com' },
      { name: 'Shinecrete', url: 'https://www.shinecrete.com' },
    ],
  },
  {
    id: 'concrete-polishing', label: 'Concrete & Polishing', group: 'Home Services & Improvement',
    businesses: [
      { name: 'Polished Concrete Solutions', url: 'https://www.polishedconcretesolution.com' },
      { name: 'Rose Restoration', url: 'https://www.roserestoration.com' },
      { name: 'StoneShine', url: 'https://www.stoneshine.net' },
    ],
  },
  {
    id: 'tile-stone', label: 'Tile & Stone Installation', group: 'Home Services & Improvement',
    businesses: [
      { name: 'TilesMax Remodeling', url: 'https://www.tilesmax.com' },
      { name: 'Universal Stone', url: 'https://universalstonenc.com' },
      { name: 'Daltile', url: 'https://www.daltile.com' },
    ],
  },
  {
    id: 'flooring-installation', label: 'Flooring Installation', group: 'Home Services & Improvement',
    businesses: [
      { name: 'Empire Today', url: 'https://www.empiretoday.com' },
      { name: 'Luna Carpet', url: 'https://www.lunacarpet.com' },
      { name: 'LL Flooring', url: 'https://www.llflooring.com' },
    ],
  },
  {
    id: 'countertops', label: 'Countertops & Surfaces', group: 'Home Services & Improvement',
    businesses: [
      { name: 'IGS Countertops', url: 'https://www.igscountertops.com' },
      { name: 'Stone & Beyond', url: 'https://www.stoneandbeyond.com' },
      { name: 'Cambria', url: 'https://www.cambriausa.com' },
    ],
  },
  {
    id: 'painting', label: 'Painting (Interior/Exterior)', group: 'Home Services & Improvement',
    businesses: [
      { name: 'CertaPro Painters', url: 'https://www.certapro.com' },
      { name: 'Five Star Painting', url: 'https://www.fivestarpainting.com' },
      { name: 'ProTect Painters', url: 'https://www.protectpainters.com' },
    ],
  },
  {
    id: 'carpet-cleaning', label: 'Carpet & Upholstery Cleaning', group: 'Home Services & Improvement',
    businesses: [
      { name: 'Stanley Steemer', url: 'https://www.stanleysteemer.com' },
      { name: 'Chem-Dry', url: 'https://www.chemdry.com' },
      { name: 'SERVPRO', url: 'https://www.servpro.com' },
    ],
  },
  {
    id: 'landscaping', label: 'Landscaping & Lawn Care', group: 'Home Services & Improvement',
    businesses: [
      { name: 'TruGreen', url: 'https://www.trugreen.com' },
      { name: 'The Grounds Guys', url: 'https://www.groundsguys.com' },
    ],
  },
  {
    id: 'tree-service', label: 'Tree Service & Arboriculture', group: 'Home Services & Improvement',
    businesses: [
      { name: 'Davey Tree', url: 'https://www.davey.com' },
      { name: 'SavATree', url: 'https://www.savatree.com' },
      { name: 'Bartlett Tree', url: 'https://www.bartlett.com' },
    ],
  },
  {
    id: 'pest-control', label: 'Pest Control', group: 'Home Services & Improvement',
    businesses: [
      { name: 'Terminix', url: 'https://www.terminix.com' },
      { name: 'Orkin', url: 'https://www.orkin.com' },
      { name: 'Aptive Environmental', url: 'https://www.aptive.com' },
    ],
  },
  {
    id: 'handyman', label: 'Handyman Services', group: 'Home Services & Improvement',
    businesses: [
      { name: 'Mr. Handyman', url: 'https://www.mrhandyman.com' },
      { name: 'Ace Handyman Services', url: 'https://www.acehandyman.com' },
      { name: 'House Doctors', url: 'https://www.housedoctors.com' },
    ],
  },
  {
    id: 'appliance-repair', label: 'Appliance Repair', group: 'Home Services & Improvement',
    businesses: [
      { name: 'Mr. Appliance', url: 'https://www.mrappliance.com' },
      { name: 'Sears Home Services', url: 'https://www.searshomeservices.com' },
    ],
  },
  {
    id: 'locksmith', label: 'Locksmith Services', group: 'Home Services & Improvement',
    businesses: [
      { name: 'Pop-A-Lock', url: 'https://www.popalock.com' },
      { name: 'Mr. Rekey', url: 'https://www.mrrekey.com' },
    ],
  },
  {
    id: 'garage-door', label: 'Garage Door Services', group: 'Home Services & Improvement',
    businesses: [
      { name: 'Precision Garage Door', url: 'https://www.precisiondoor.net' },
      { name: 'Overhead Door', url: 'https://www.overheaddoor.com' },
    ],
  },
  {
    id: 'chimney-fireplace', label: 'Chimney & Fireplace', group: 'Home Services & Improvement',
    businesses: [
      { name: 'Ashbusters', url: 'https://www.ashbusters.net' },
      { name: 'CSIA', url: 'https://www.csia.org' },
    ],
  },
  {
    id: 'gutter-services', label: 'Gutter Services', group: 'Home Services & Improvement',
    businesses: [
      { name: 'LeafFilter', url: 'https://www.leaffilter.com' },
      { name: 'Gutter Helmet', url: 'https://www.gutterhelmet.com' },
    ],
  },
  {
    id: 'waterproofing', label: 'Waterproofing & Drainage', group: 'Home Services & Improvement',
    businesses: [
      { name: 'Basement Systems', url: 'https://www.basementsystems.com' },
      { name: 'Healthy Way', url: 'https://www.healthyway.com' },
    ],
  },
  {
    id: 'water-treatment', label: 'Water Treatment & Filtration', group: 'Home Services & Improvement',
    businesses: [
      { name: 'Culligan', url: 'https://www.culligan.com' },
      { name: 'Kinetico', url: 'https://www.kinetico.com' },
      { name: 'RainSoft', url: 'https://www.rainsoft.com' },
    ],
  },
  {
    id: 'septic-services', label: 'Septic & Sewer Services', group: 'Home Services & Improvement',
    businesses: [
      { name: 'Wind River Environmental', url: 'https://www.windriverenvironmental.com' },
    ],
  },

  // ==================== HEALTHCARE & MEDICAL ====================
  {
    id: 'primary-care', label: 'Primary Care / General Practice', group: 'Healthcare & Medical',
    businesses: [
      { name: 'One Medical', url: 'https://www.onemedical.com' },
      { name: 'Oak Street Health', url: 'https://www.oakstreethealth.com' },
      { name: 'Carbon Health', url: 'https://carbonhealth.com' },
    ],
  },
  {
    id: 'dentistry', label: 'Dentistry & Dental', group: 'Healthcare & Medical',
    businesses: [
      { name: 'Aspen Dental', url: 'https://www.aspendental.com' },
      { name: 'Heartland Dental', url: 'https://www.heartland.com' },
      { name: 'Smile Generation', url: 'https://www.smilegeneration.com' },
    ],
  },
  {
    id: 'orthodontics', label: 'Orthodontics', group: 'Healthcare & Medical',
    businesses: [
      { name: 'Invisalign', url: 'https://www.invisalign.com' },
      { name: 'SmileDirectClub', url: 'https://www.smiledirectclub.com' },
    ],
  },
  {
    id: 'optometry', label: 'Optometry & Eye Care', group: 'Healthcare & Medical',
    businesses: [
      { name: 'LensCrafters', url: 'https://www.lenscrafters.com' },
      { name: 'Vision Source', url: 'https://www.visionsource.com' },
      { name: 'Pearle Vision', url: 'https://www.pearlevision.com' },
    ],
  },
  {
    id: 'dermatology', label: 'Dermatology', group: 'Healthcare & Medical',
    businesses: [
      { name: 'Forefront Dermatology', url: 'https://www.forefrontdermatology.com' },
      { name: 'Midwest Dermatology', url: 'https://www.midwestderm.com' },
    ],
  },
  {
    id: 'pediatrics', label: 'Pediatrics', group: 'Healthcare & Medical',
    businesses: [
      { name: 'PM Pediatrics', url: 'https://www.pmpediatrics.com' },
      { name: 'Childrens Health', url: 'https://www.childrens.com' },
    ],
  },
  {
    id: 'physical-therapy', label: 'Physical Therapy & Rehab', group: 'Healthcare & Medical',
    businesses: [
      { name: 'Select Medical', url: 'https://www.selectmedical.com' },
      { name: 'ATI Physical Therapy', url: 'https://www.atipt.com' },
      { name: 'BenchMark Physical Therapy', url: 'https://www.benchmarkpt.com' },
    ],
  },
  {
    id: 'chiropractic', label: 'Chiropractic', group: 'Healthcare & Medical',
    businesses: [
      { name: 'The Joint Chiropractic', url: 'https://www.thejoint.com' },
      { name: 'Chiro One', url: 'https://www.chiroone.net' },
    ],
  },
  {
    id: 'mental-health', label: 'Mental Health & Counseling', group: 'Healthcare & Medical',
    businesses: [
      { name: 'BetterHelp', url: 'https://www.betterhelp.com' },
      { name: 'Talkspace', url: 'https://www.talkspace.com' },
      { name: 'Cerebral', url: 'https://cerebral.com' },
    ],
  },
  {
    id: 'substance-abuse', label: 'Substance Abuse Treatment', group: 'Healthcare & Medical',
    businesses: [
      { name: 'Hazelden Betty Ford', url: 'https://www.hazeldenbettyford.org' },
      { name: 'Caron Treatment', url: 'https://www.caron.org' },
    ],
  },
  {
    id: 'senior-care', label: 'Senior Care & Assisted Living', group: 'Healthcare & Medical',
    businesses: [
      { name: 'Brookdale', url: 'https://www.brookdale.com' },
      { name: 'Atria', url: 'https://www.atriaseniorliving.com' },
      { name: 'Sunrise Senior Living', url: 'https://www.sunriseseniorliving.com' },
    ],
  },
  {
    id: 'home-healthcare', label: 'Home Healthcare', group: 'Healthcare & Medical',
    businesses: [
      { name: 'Amedisys', url: 'https://www.amedisys.com' },
      { name: 'Encompass Health', url: 'https://www.encompasshealth.com' },
      { name: 'Kindred at Home', url: 'https://www.kindredathome.com' },
    ],
  },
  {
    id: 'urgent-care', label: 'Urgent Care & Walk-in Clinics', group: 'Healthcare & Medical',
    businesses: [
      { name: 'GoHealth Urgent Care', url: 'https://www.gohealthuc.com' },
      { name: 'CareNow', url: 'https://www.carenow.com' },
      { name: 'MedExpress', url: 'https://www.medexpress.com' },
    ],
  },
  {
    id: 'med-spa', label: 'Cosmetic Surgery & Med Spa', group: 'Healthcare & Medical',
    businesses: [
      { name: 'Ideal Image', url: 'https://www.idealimage.com' },
      { name: 'LaserAway', url: 'https://www.laseraway.com' },
    ],
  },
  {
    id: 'fertility', label: 'Fertility & Reproductive', group: 'Healthcare & Medical',
    businesses: [
      { name: 'IVF Florida', url: 'https://www.ivfflorida.com' },
      { name: 'Shady Grove Fertility', url: 'https://www.shadygrovefertility.com' },
    ],
  },
  {
    id: 'medical-imaging', label: 'Medical Imaging & Diagnostics', group: 'Healthcare & Medical',
    businesses: [
      { name: 'RadNet', url: 'https://www.radnet.com' },
      { name: 'SimonMed Imaging', url: 'https://www.simonmed.com' },
    ],
  },
  {
    id: 'veterinary', label: 'Veterinary Services', group: 'Healthcare & Medical',
    businesses: [
      { name: 'Banfield Pet Hospital', url: 'https://www.banfield.com' },
      { name: 'VCA Animal Hospitals', url: 'https://vcahospitals.com' },
      { name: 'BluePearl', url: 'https://bluepearlvet.com' },
    ],
  },

  // ==================== FINANCIAL SERVICES ====================
  {
    id: 'banking', label: 'Banking & Credit Unions', group: 'Financial Services',
    businesses: [
      { name: 'Bank of America', url: 'https://www.bankofamerica.com' },
      { name: 'Chase', url: 'https://www.chase.com' },
      { name: 'Navy Federal Credit Union', url: 'https://www.navyfederal.org' },
    ],
  },
  {
    id: 'investment-management', label: 'Investment Management', group: 'Financial Services',
    businesses: [
      { name: 'Fidelity', url: 'https://www.fidelity.com' },
      { name: 'Vanguard', url: 'https://www.vanguard.com' },
      { name: 'Charles Schwab', url: 'https://www.schwab.com' },
      { name: 'BlackRock', url: 'https://www.blackrock.com' },
    ],
  },
  {
    id: 'financial-planning', label: 'Financial Planning & Advisory', group: 'Financial Services',
    businesses: [
      { name: 'Northwestern Mutual', url: 'https://www.northwesternmutual.com' },
      { name: 'Edward Jones', url: 'https://www.edwardjones.com' },
      { name: 'Raymond James', url: 'https://www.raymondjames.com' },
    ],
  },
  {
    id: 'accounting', label: 'Accounting & Bookkeeping', group: 'Financial Services',
    businesses: [
      { name: 'Deloitte', url: 'https://www.deloitte.com' },
      { name: 'PwC', url: 'https://www.pwc.com' },
      { name: 'BDO', url: 'https://www.bdo.com' },
      { name: 'Block Advisors', url: 'https://www.blockadvisors.com' },
    ],
  },
  {
    id: 'tax-preparation', label: 'Tax Preparation', group: 'Financial Services',
    businesses: [
      { name: 'H&R Block', url: 'https://www.hrblock.com' },
      { name: 'Jackson Hewitt', url: 'https://www.jacksonhewitt.com' },
      { name: 'Liberty Tax', url: 'https://www.libertytax.com' },
    ],
  },
  {
    id: 'payroll-services', label: 'Payroll Services', group: 'Financial Services',
    businesses: [
      { name: 'ADP', url: 'https://www.adp.com' },
      { name: 'Paychex', url: 'https://www.paychex.com' },
      { name: 'Gusto', url: 'https://gusto.com' },
    ],
  },
  {
    id: 'mortgage-lending', label: 'Mortgage & Lending', group: 'Financial Services',
    businesses: [
      { name: 'Quicken Loans', url: 'https://www.quickenloans.com' },
      { name: 'Rocket Mortgage', url: 'https://www.rocketmortgage.com' },
      { name: 'loanDepot', url: 'https://www.loandepot.com' },
    ],
  },
  {
    id: 'private-equity', label: 'Private Equity & Venture Capital', group: 'Financial Services',
    businesses: [
      { name: 'KKR', url: 'https://www.kkr.com' },
      { name: 'Blackstone', url: 'https://www.blackstone.com' },
      { name: 'Sequoia Capital', url: 'https://www.sequoiacap.com' },
      { name: 'Andreessen Horowitz', url: 'https://a16z.com' },
    ],
  },
  {
    id: 'collections', label: 'Collections & Debt Recovery', group: 'Financial Services',
    businesses: [
      { name: 'Encore Capital', url: 'https://www.encorecapital.com' },
      { name: 'Portfolio Recovery', url: 'https://www.portfoliorecovery.com' },
    ],
  },
  {
    id: 'fintech-payments', label: 'FinTech & Payments', group: 'Financial Services',
    businesses: [
      { name: 'Stripe', url: 'https://stripe.com' },
      { name: 'Square', url: 'https://squareup.com' },
      { name: 'PayPal', url: 'https://www.paypal.com' },
      { name: 'Plaid', url: 'https://plaid.com' },
    ],
  },
  {
    id: 'cryptocurrency', label: 'Cryptocurrency & Blockchain', group: 'Financial Services',
    businesses: [
      { name: 'Coinbase', url: 'https://www.coinbase.com' },
      { name: 'Kraken', url: 'https://www.kraken.com' },
      { name: 'Binance', url: 'https://www.binance.com' },
    ],
  },

  // ==================== TECHNOLOGY & SOFTWARE ====================
  {
    id: 'saas', label: 'SaaS / Software as a Service', group: 'Technology & Software',
    businesses: [
      { name: 'Salesforce', url: 'https://www.salesforce.com' },
      { name: 'HubSpot', url: 'https://www.hubspot.com' },
      { name: 'Notion', url: 'https://www.notion.so' },
      { name: 'Slack', url: 'https://slack.com' },
    ],
  },
  {
    id: 'it-consulting', label: 'IT Consulting & Managed Services', group: 'Technology & Software',
    businesses: [
      { name: 'Accenture', url: 'https://www.accenture.com' },
      { name: 'IBM', url: 'https://www.ibm.com' },
      { name: 'Rackspace', url: 'https://www.rackspace.com' },
    ],
  },
  {
    id: 'cybersecurity', label: 'Cybersecurity', group: 'Technology & Software',
    businesses: [
      { name: 'CrowdStrike', url: 'https://www.crowdstrike.com' },
      { name: 'Palo Alto Networks', url: 'https://www.paloaltonetworks.com' },
      { name: 'Norton', url: 'https://us.norton.com' },
    ],
  },
  {
    id: 'cloud-computing', label: 'Cloud Computing & Hosting', group: 'Technology & Software',
    businesses: [
      { name: 'AWS', url: 'https://aws.amazon.com' },
      { name: 'Google Cloud', url: 'https://cloud.google.com' },
      { name: 'Microsoft Azure', url: 'https://azure.microsoft.com' },
      { name: 'DigitalOcean', url: 'https://www.digitalocean.com' },
    ],
  },
  {
    id: 'web-development', label: 'Web Development & Design', group: 'Technology & Software',
    businesses: [
      { name: 'Toptal', url: 'https://www.toptal.com' },
      { name: 'WillowTree', url: 'https://willowtreeapps.com' },
      { name: 'DockYard', url: 'https://dockyard.com' },
    ],
  },
  {
    id: 'mobile-app-dev', label: 'Mobile App Development', group: 'Technology & Software',
    businesses: [
      { name: 'Savvy Apps', url: 'https://savvyapps.com' },
      { name: 'Y Media Labs', url: 'https://ymedialabs.com' },
    ],
  },
  {
    id: 'game-development', label: 'Game Development', group: 'Technology & Software',
    businesses: [
      { name: 'Epic Games', url: 'https://www.epicgames.com' },
      { name: 'Unity', url: 'https://unity.com' },
      { name: 'Electronic Arts', url: 'https://www.ea.com' },
    ],
  },
  {
    id: 'ai-ml', label: 'AI & Machine Learning', group: 'Technology & Software',
    businesses: [
      { name: 'OpenAI', url: 'https://openai.com' },
      { name: 'Anthropic', url: 'https://www.anthropic.com' },
      { name: 'Hugging Face', url: 'https://huggingface.co' },
    ],
  },
  {
    id: 'iot-hardware', label: 'IoT & Hardware', group: 'Technology & Software',
    businesses: [
      { name: 'Particle', url: 'https://www.particle.io' },
      { name: 'Adafruit', url: 'https://www.adafruit.com' },
    ],
  },
  {
    id: 'semiconductor', label: 'Semiconductor & Electronics', group: 'Technology & Software',
    businesses: [
      { name: 'Intel', url: 'https://www.intel.com' },
      { name: 'AMD', url: 'https://www.amd.com' },
      { name: 'NVIDIA', url: 'https://www.nvidia.com' },
      { name: 'TSMC', url: 'https://www.tsmc.com' },
    ],
  },
  {
    id: 'enterprise-software', label: 'Enterprise Software', group: 'Technology & Software',
    businesses: [
      { name: 'Oracle', url: 'https://www.oracle.com' },
      { name: 'SAP', url: 'https://www.sap.com' },
      { name: 'ServiceNow', url: 'https://www.servicenow.com' },
    ],
  },
  {
    id: 'crm-sales-tech', label: 'CRM & Sales Tech', group: 'Technology & Software',
    businesses: [
      { name: 'Gong', url: 'https://www.gong.io' },
      { name: 'Outreach', url: 'https://www.outreach.io' },
      { name: 'Apollo.io', url: 'https://www.apollo.io' },
    ],
  },
  {
    id: 'hr-tech', label: 'HR Tech & People Operations', group: 'Technology & Software',
    businesses: [
      { name: 'BambooHR', url: 'https://www.bamboohr.com' },
      { name: 'Workday', url: 'https://www.workday.com' },
      { name: 'Rippling', url: 'https://www.rippling.com' },
    ],
  },
  {
    id: 'edtech', label: 'EdTech & Learning Platforms', group: 'Technology & Software',
    businesses: [
      { name: 'Coursera', url: 'https://www.coursera.org' },
      { name: 'Udemy', url: 'https://www.udemy.com' },
      { name: 'Khan Academy', url: 'https://www.khanacademy.org' },
    ],
  },
  {
    id: 'healthtech', label: 'HealthTech & MedTech', group: 'Technology & Software',
    businesses: [
      { name: 'Epic Systems', url: 'https://www.epic.com' },
      { name: 'Teladoc', url: 'https://www.teladochealth.com' },
      { name: 'Oscar Health', url: 'https://www.hioscar.com' },
    ],
  },
  {
    id: 'legaltech', label: 'LegalTech', group: 'Technology & Software',
    businesses: [
      { name: 'Clio', url: 'https://www.clio.com' },
      { name: 'LegalZoom', url: 'https://www.legalzoom.com' },
      { name: 'Ironclad', url: 'https://ironclad.com' },
    ],
  },
  {
    id: 'martech-adtech', label: 'MarTech & AdTech', group: 'Technology & Software',
    businesses: [
      { name: 'HubSpot Marketing', url: 'https://www.hubspot.com/marketing' },
      { name: 'Mailchimp', url: 'https://mailchimp.com' },
      { name: 'The Trade Desk', url: 'https://www.thetradedesk.com' },
    ],
  },
  {
    id: 'devops', label: 'DevOps & CI/CD', group: 'Technology & Software',
    businesses: [
      { name: 'GitLab', url: 'https://about.gitlab.com' },
      { name: 'GitHub', url: 'https://github.com' },
      { name: 'CircleCI', url: 'https://circleci.com' },
    ],
  },

  // ==================== RETAIL & E-COMMERCE ====================
  {
    id: 'ecommerce-general', label: 'General E-commerce', group: 'Retail & E-commerce',
    businesses: [
      { name: 'Amazon', url: 'https://www.amazon.com' },
      { name: 'eBay', url: 'https://www.ebay.com' },
      { name: 'Etsy', url: 'https://www.etsy.com' },
      { name: 'Wayfair', url: 'https://www.wayfair.com' },
    ],
  },
  {
    id: 'fashion-retail', label: 'Fashion & Apparel Retail', group: 'Retail & E-commerce',
    businesses: [
      { name: 'Zara', url: 'https://www.zara.com' },
      { name: 'H&M', url: 'https://www2.hm.com' },
      { name: 'Nordstrom', url: 'https://www.nordstrom.com' },
      { name: 'ASOS', url: 'https://www.asos.com' },
    ],
  },
  {
    id: 'footwear-retail', label: 'Footwear & Shoes', group: 'Retail & E-commerce',
    businesses: [
      { name: 'Nike', url: 'https://www.nike.com' },
      { name: 'Foot Locker', url: 'https://www.footlocker.com' },
      { name: 'Zappos', url: 'https://www.zappos.com' },
    ],
  },
  {
    id: 'beauty-retail', label: 'Beauty & Cosmetics Retail', group: 'Retail & E-commerce',
    businesses: [
      { name: 'Sephora', url: 'https://www.sephora.com' },
      { name: 'Ulta Beauty', url: 'https://www.ulta.com' },
      { name: 'Glossier', url: 'https://www.glossier.com' },
    ],
  },
  {
    id: 'electronics-retail', label: 'Electronics & Gadgets Retail', group: 'Retail & E-commerce',
    businesses: [
      { name: 'Best Buy', url: 'https://www.bestbuy.com' },
      { name: 'B&H Photo', url: 'https://www.bhphotovideo.com' },
      { name: 'Newegg', url: 'https://www.newegg.com' },
    ],
  },
  {
    id: 'home-goods-retail', label: 'Home Goods & Furniture', group: 'Retail & E-commerce',
    businesses: [
      { name: 'IKEA', url: 'https://www.ikea.com' },
      { name: 'Ashley Furniture', url: 'https://www.ashleyfurniture.com' },
      { name: 'Crate & Barrel', url: 'https://www.crateandbarrel.com' },
    ],
  },
  {
    id: 'sporting-goods', label: 'Sporting Goods', group: 'Retail & E-commerce',
    businesses: [
      { name: 'Dicks Sporting Goods', url: 'https://www.dickssportinggoods.com' },
      { name: 'REI', url: 'https://www.rei.com' },
      { name: 'Academy Sports', url: 'https://www.academy.com' },
    ],
  },
  {
    id: 'books-media-retail', label: 'Books & Media', group: 'Retail & E-commerce',
    businesses: [
      { name: 'Barnes & Noble', url: 'https://www.barnesandnoble.com' },
      { name: 'Bookshop.org', url: 'https://bookshop.org' },
    ],
  },
  {
    id: 'toys-games', label: 'Toys & Games', group: 'Retail & E-commerce',
    businesses: [
      { name: 'Toys R Us', url: 'https://www.toysrus.com' },
      { name: 'Melissa & Doug', url: 'https://www.melissaanddoug.com' },
    ],
  },
  {
    id: 'jewelry-retail', label: 'Jewelry & Watches Retail', group: 'Retail & E-commerce',
    businesses: [
      { name: 'Kay Jewelers', url: 'https://www.kay.com' },
      { name: 'Zales', url: 'https://www.zales.com' },
      { name: 'Blue Nile', url: 'https://www.bluenile.com' },
    ],
  },
  {
    id: 'auto-parts-retail', label: 'Auto Parts & Accessories', group: 'Retail & E-commerce',
    businesses: [
      { name: 'AutoZone', url: 'https://www.autozone.com' },
      { name: 'Advance Auto Parts', url: 'https://www.advanceautoparts.com' },
      { name: "O'Reilly Auto", url: 'https://www.oreillyauto.com' },
    ],
  },
  {
    id: 'hardware-supplies', label: 'Hardware & Building Supplies', group: 'Retail & E-commerce',
    businesses: [
      { name: 'Home Depot', url: 'https://www.homedepot.com' },
      { name: "Lowe's", url: 'https://www.lowes.com' },
      { name: 'Ace Hardware', url: 'https://www.acehardware.com' },
    ],
  },
  {
    id: 'office-supplies', label: 'Office Supplies', group: 'Retail & E-commerce',
    businesses: [
      { name: 'Staples', url: 'https://www.staples.com' },
      { name: 'Office Depot', url: 'https://www.officedepot.com' },
    ],
  },
  {
    id: 'cannabis-dispensary', label: 'Cannabis & CBD Dispensaries', group: 'Retail & E-commerce',
    businesses: [
      { name: 'Curaleaf', url: 'https://www.curaleaf.com' },
      { name: 'Trulieve', url: 'https://www.trulieve.com' },
      { name: 'MedMen', url: 'https://www.medmen.com' },
    ],
  },
  {
    id: 'subscription-boxes', label: 'Subscription Boxes', group: 'Retail & E-commerce',
    businesses: [
      { name: 'BarkBox', url: 'https://www.barkbox.com' },
      { name: 'HelloFresh', url: 'https://www.hellofresh.com' },
      { name: 'Dollar Shave Club', url: 'https://www.dollarshaveclub.com' },
    ],
  },

  // ==================== FOOD & BEVERAGE ====================
  {
    id: 'fine-dining', label: 'Restaurants (Fine Dining)', group: 'Food & Beverage',
    businesses: [
      { name: 'Ruth Chris', url: 'https://www.ruthschris.com' },
      { name: 'The Capital Grille', url: 'https://www.capitalgrille.com' },
      { name: 'Ocean Prime', url: 'https://www.ocean-prime.com' },
    ],
  },
  {
    id: 'casual-dining', label: 'Restaurants (Casual)', group: 'Food & Beverage',
    businesses: [
      { name: 'Olive Garden', url: 'https://www.olivegarden.com' },
      { name: 'Applebees', url: 'https://www.applebees.com' },
      { name: 'Chilis', url: 'https://www.chilis.com' },
    ],
  },
  {
    id: 'fast-food', label: 'Restaurants (Fast Food / QSR)', group: 'Food & Beverage',
    businesses: [
      { name: "McDonald's", url: 'https://www.mcdonalds.com' },
      { name: 'Burger King', url: 'https://www.bk.com' },
      { name: 'Subway', url: 'https://www.subway.com' },
      { name: 'Chick-fil-A', url: 'https://www.chick-fil-a.com' },
    ],
  },
  {
    id: 'cafes-coffee', label: 'Cafes & Coffee Shops', group: 'Food & Beverage',
    businesses: [
      { name: 'Starbucks', url: 'https://www.starbucks.com' },
      { name: 'Dunkin', url: 'https://www.dunkindonuts.com' },
      { name: 'Peets Coffee', url: 'https://www.peets.com' },
    ],
  },
  {
    id: 'bakeries', label: 'Bakeries & Pastry', group: 'Food & Beverage',
    businesses: [
      { name: 'Nothing Bundt Cakes', url: 'https://www.nothingbundtcakes.com' },
      { name: 'Crumbl Cookies', url: 'https://crumblcookies.com' },
      { name: 'Krispy Kreme', url: 'https://www.krispykreme.com' },
    ],
  },
  {
    id: 'bars-nightclubs', label: 'Bars & Nightclubs', group: 'Food & Beverage',
    businesses: [
      { name: 'TGI Fridays', url: 'https://www.tgifridays.com' },
      { name: 'Dave & Busters', url: 'https://www.daveandbusters.com' },
    ],
  },
  {
    id: 'breweries', label: 'Breweries & Craft Beer', group: 'Food & Beverage',
    businesses: [
      { name: 'Sierra Nevada', url: 'https://sierranevada.com' },
      { name: 'Boston Beer Company', url: 'https://www.bostonbeer.com' },
      { name: 'Dogfish Head', url: 'https://www.dogfish.com' },
    ],
  },
  {
    id: 'wineries', label: 'Wineries & Vineyards', group: 'Food & Beverage',
    businesses: [
      { name: 'Robert Mondavi', url: 'https://www.robertmondavi.com' },
      { name: 'Beringer', url: 'https://www.beringer.com' },
      { name: 'Chateau Ste. Michelle', url: 'https://www.ste-michelle.com' },
    ],
  },
  {
    id: 'distilleries', label: 'Distilleries', group: 'Food & Beverage',
    businesses: [
      { name: 'Jack Daniels', url: 'https://www.jackdaniels.com' },
      { name: 'Jim Beam', url: 'https://www.jimbeam.com' },
    ],
  },
  {
    id: 'catering', label: 'Catering Services', group: 'Food & Beverage',
    businesses: [
      { name: 'Culinary Productions', url: 'https://www.culinaryproductions.com' },
      { name: 'Great Events Catering', url: 'https://www.greateventscatering.com' },
    ],
  },
  {
    id: 'food-trucks', label: 'Food Trucks & Mobile Vendors', group: 'Food & Beverage',
    businesses: [
      { name: "Roxy's Gourmet", url: 'https://www.roxysgrilledcheese.com' },
      { name: 'Food Truck Empire', url: 'https://www.foodtruckempire.com' },
    ],
  },
  {
    id: 'meal-delivery', label: 'Meal Delivery & Meal Kits', group: 'Food & Beverage',
    businesses: [
      { name: 'HelloFresh', url: 'https://www.hellofresh.com' },
      { name: 'Blue Apron', url: 'https://www.blueapron.com' },
      { name: 'Freshly', url: 'https://www.freshly.com' },
    ],
  },
  {
    id: 'grocery-supermarkets', label: 'Grocery & Supermarkets', group: 'Food & Beverage',
    businesses: [
      { name: 'Kroger', url: 'https://www.kroger.com' },
      { name: 'Whole Foods', url: 'https://www.wholefoodsmarket.com' },
      { name: 'Trader Joes', url: 'https://www.traderjoes.com' },
      { name: 'Safeway', url: 'https://www.safeway.com' },
    ],
  },
  {
    id: 'food-manufacturing', label: 'Food Manufacturing & Processing', group: 'Food & Beverage',
    businesses: [
      { name: 'Tyson Foods', url: 'https://www.tysonfoods.com' },
      { name: 'Nestle', url: 'https://www.nestle.com' },
      { name: 'General Mills', url: 'https://www.generalmills.com' },
    ],
  },

  // ==================== HOSPITALITY & TRAVEL ====================
  {
    id: 'hotels-resorts', label: 'Hotels & Resorts', group: 'Hospitality & Travel',
    businesses: [
      { name: 'Marriott', url: 'https://www.marriott.com' },
      { name: 'Hilton', url: 'https://www.hilton.com' },
      { name: 'Hyatt', url: 'https://www.hyatt.com' },
      { name: 'Four Seasons', url: 'https://www.fourseasons.com' },
    ],
  },
  {
    id: 'budget-lodging', label: 'Motels & Budget Lodging', group: 'Hospitality & Travel',
    businesses: [
      { name: 'Motel 6', url: 'https://www.motel6.com' },
      { name: 'Super 8', url: 'https://www.wyndhamhotels.com/super-8' },
    ],
  },
  {
    id: 'vacation-rentals', label: 'Vacation Rentals & Airbnb Management', group: 'Hospitality & Travel',
    businesses: [
      { name: 'Airbnb', url: 'https://www.airbnb.com' },
      { name: 'VRBO', url: 'https://www.vrbo.com' },
      { name: 'Vacasa', url: 'https://www.vacasa.com' },
    ],
  },
  {
    id: 'travel-agencies', label: 'Travel Agencies & Tour Operators', group: 'Hospitality & Travel',
    businesses: [
      { name: 'Expedia', url: 'https://www.expedia.com' },
      { name: 'Booking.com', url: 'https://www.booking.com' },
      { name: 'TripAdvisor', url: 'https://www.tripadvisor.com' },
    ],
  },
  {
    id: 'cruise-lines', label: 'Cruise Lines', group: 'Hospitality & Travel',
    businesses: [
      { name: 'Carnival', url: 'https://www.carnival.com' },
      { name: 'Royal Caribbean', url: 'https://www.royalcaribbean.com' },
      { name: 'Norwegian Cruise Line', url: 'https://www.ncl.com' },
    ],
  },
  {
    id: 'airlines', label: 'Airlines & Aviation', group: 'Hospitality & Travel',
    businesses: [
      { name: 'Delta', url: 'https://www.delta.com' },
      { name: 'American Airlines', url: 'https://www.aa.com' },
      { name: 'United', url: 'https://www.united.com' },
      { name: 'Southwest', url: 'https://www.southwest.com' },
    ],
  },
  {
    id: 'car-rental', label: 'Car Rental Services', group: 'Hospitality & Travel',
    businesses: [
      { name: 'Enterprise', url: 'https://www.enterprise.com' },
      { name: 'Hertz', url: 'https://www.hertz.com' },
      { name: 'Avis', url: 'https://www.avis.com' },
    ],
  },
  {
    id: 'ride-sharing', label: 'Ride-Sharing & Taxi', group: 'Hospitality & Travel',
    businesses: [
      { name: 'Uber', url: 'https://www.uber.com' },
      { name: 'Lyft', url: 'https://www.lyft.com' },
      { name: 'Curb', url: 'https://www.gocurb.com' },
    ],
  },
  {
    id: 'limousine-chauffeur', label: 'Limousine & Chauffeur', group: 'Hospitality & Travel',
    businesses: [
      { name: 'EmpireCLS', url: 'https://www.empirecls.com' },
      { name: 'Carey', url: 'https://www.carey.com' },
    ],
  },
  {
    id: 'bus-charter', label: 'Bus & Charter Services', group: 'Hospitality & Travel',
    businesses: [
      { name: 'Greyhound', url: 'https://www.greyhound.com' },
      { name: 'Megabus', url: 'https://us.megabus.com' },
      { name: 'Coach USA', url: 'https://www.coachusa.com' },
    ],
  },
  {
    id: 'adventure-tourism', label: 'Adventure & Eco-Tourism', group: 'Hospitality & Travel',
    businesses: [
      { name: 'G Adventures', url: 'https://www.gadventures.com' },
      { name: 'Intrepid Travel', url: 'https://www.intrepidtravel.com' },
    ],
  },
  {
    id: 'convention-centers', label: 'Convention & Event Centers', group: 'Hospitality & Travel',
    businesses: [
      { name: 'Las Vegas Convention Center', url: 'https://www.lvcva.com' },
      { name: 'Orange County Convention Center', url: 'https://www.occc.net' },
    ],
  },
  {
    id: 'rv-parks', label: 'RV Parks & Campgrounds', group: 'Hospitality & Travel',
    businesses: [
      { name: 'KOA', url: 'https://koa.com' },
      { name: 'Yogi Bear Jellystone', url: 'https://campjellystone.com' },
    ],
  },
];