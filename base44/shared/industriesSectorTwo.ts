// Backend business industry taxonomy — Sector 2.
// Mirrors src/lib/industries/sectorTwo.js — keep in sync.
// Covers: Manufacturing, Transportation, Real Estate, Education, Legal, Media,
// Marketing, Professional Services, Automotive, Beauty, Fitness, Agriculture,
// Energy, Telecom, Insurance, Non-Profit, Pet, Event, Security, Environmental,
// Aerospace, Pharma, Entertainment, Cleaning, Fashion, Jewelry, Government,
// Arts, Funeral, Children & Family Services.

export const SECTOR_TWO_INDUSTRIES = [
  // ==================== MANUFACTURING & INDUSTRIAL ====================
  {
    id: 'heavy-machinery', label: 'Heavy Machinery & Equipment', group: 'Manufacturing & Industrial',
    businesses: [
      { name: 'Caterpillar', url: 'https://www.caterpillar.com' },
      { name: 'John Deere', url: 'https://www.deere.com' },
      { name: 'Komatsu', url: 'https://www.komatsu.com' },
    ],
  },
  {
    id: 'auto-manufacturing', label: 'Automotive Manufacturing', group: 'Manufacturing & Industrial',
    businesses: [
      { name: 'Ford', url: 'https://www.ford.com' },
      { name: 'GM', url: 'https://www.gm.com' },
      { name: 'Toyota', url: 'https://www.toyota.com' },
      { name: 'Tesla', url: 'https://www.tesla.com' },
    ],
  },
  {
    id: 'aerospace-manufacturing', label: 'Aerospace Manufacturing', group: 'Manufacturing & Industrial',
    businesses: [
      { name: 'Boeing', url: 'https://www.boeing.com' },
      { name: 'Lockheed Martin', url: 'https://www.lockheedmartin.com' },
      { name: 'Northrop Grumman', url: 'https://www.northropgrumman.com' },
    ],
  },
  {
    id: 'textile-apparel-mfg', label: 'Textile & Apparel Manufacturing', group: 'Manufacturing & Industrial',
    businesses: [
      { name: 'Gildan', url: 'https://www.gildan.com' },
      { name: 'Fruit of the Loom', url: 'https://www.fruit.com' },
    ],
  },
  {
    id: 'furniture-manufacturing', label: 'Furniture Manufacturing', group: 'Manufacturing & Industrial',
    businesses: [
      { name: 'La-Z-Boy', url: 'https://www.la-z-boy.com' },
      { name: 'Flexsteel', url: 'https://www.flexsteel.com' },
      { name: 'Ethan Allen', url: 'https://www.ethanallen.com' },
    ],
  },
  {
    id: 'chemical-manufacturing', label: 'Chemical Manufacturing', group: 'Manufacturing & Industrial',
    businesses: [
      { name: 'Dow', url: 'https://www.dow.com' },
      { name: 'DuPont', url: 'https://www.dupont.com' },
      { name: 'BASF', url: 'https://www.basf.com' },
    ],
  },
  {
    id: 'plastics-rubber', label: 'Plastics & Rubber', group: 'Manufacturing & Industrial',
    businesses: [
      { name: 'Berry Global', url: 'https://www.berryglobal.com' },
      { name: 'Sealed Air', url: 'https://www.sealedair.com' },
    ],
  },
  {
    id: 'metal-fabrication', label: 'Metal Fabrication & Machining', group: 'Manufacturing & Industrial',
    businesses: [
      { name: "O'Neal Industries", url: 'https://www.onealind.com' },
      { name: 'Reliance Steel', url: 'https://www.rsac.com' },
    ],
  },
  {
    id: 'welding-metalworking', label: 'Welding & Metalworking', group: 'Manufacturing & Industrial',
    businesses: [
      { name: 'Lincoln Electric', url: 'https://www.lincolnelectric.com' },
      { name: 'Miller Electric', url: 'https://www.millerwelds.com' },
    ],
  },
  {
    id: 'packaging-containers', label: 'Packaging & Containers', group: 'Manufacturing & Industrial',
    businesses: [
      { name: 'International Paper', url: 'https://www.internationalpaper.com' },
      { name: 'WestRock', url: 'https://www.westrock.com' },
      { name: 'Ball Corporation', url: 'https://www.ball.com' },
    ],
  },
  {
    id: 'glass-ceramics-mfg', label: 'Glass & Ceramics', group: 'Manufacturing & Industrial',
    businesses: [
      { name: 'Corning', url: 'https://www.corning.com' },
      { name: 'Owens-Illinois', url: 'https://www.o-i.com' },
    ],
  },
  {
    id: 'wood-products', label: 'Wood Products & Lumber', group: 'Manufacturing & Industrial',
    businesses: [
      { name: 'Weyerhaeuser', url: 'https://www.weyerhaeuser.com' },
      { name: 'Georgia-Pacific', url: 'https://www.gp.com' },
    ],
  },
  {
    id: 'construction-materials', label: 'Construction Materials', group: 'Manufacturing & Industrial',
    businesses: [
      { name: 'Vulcan Materials', url: 'https://www.vulcanmaterials.com' },
      { name: 'Martin Marietta', url: 'https://www.martinmarietta.com' },
      { name: 'CRH', url: 'https://www.crh.com' },
    ],
  },
  {
    id: 'industrial-automation', label: 'Industrial Automation & Robotics', group: 'Manufacturing & Industrial',
    businesses: [
      { name: 'Rockwell Automation', url: 'https://www.rockwellautomation.com' },
      { name: 'Fanuc', url: 'https://www.fanucamerica.com' },
      { name: 'ABB Robotics', url: 'https://new.abb.com/products/robotics' },
    ],
  },
  {
    id: 'mining-extraction', label: 'Mining & Extraction', group: 'Manufacturing & Industrial',
    businesses: [
      { name: 'Newmont', url: 'https://www.newmont.com' },
      { name: 'Freeport-McMoRan', url: 'https://www.fcx.com' },
    ],
  },

  // ==================== TRANSPORTATION & LOGISTICS ====================
  {
    id: 'freight-trucking', label: 'Freight Trucking & Hauling', group: 'Transportation & Logistics',
    businesses: [
      { name: 'J.B. Hunt', url: 'https://www.jbhunt.com' },
      { name: 'Swift Transportation', url: 'https://www.swifttrans.com' },
      { name: 'XPO Logistics', url: 'https://www.xpo.com' },
    ],
  },
  {
    id: 'ocean-freight', label: 'Shipping & Ocean Freight', group: 'Transportation & Logistics',
    businesses: [
      { name: 'Maersk', url: 'https://www.maersk.com' },
      { name: 'MSC', url: 'https://www.msc.com' },
      { name: 'CMA CGM', url: 'https://www.cma-cgm.com' },
    ],
  },
  {
    id: 'air-cargo', label: 'Air Cargo & Freight', group: 'Transportation & Logistics',
    businesses: [
      { name: 'FedEx', url: 'https://www.fedex.com' },
      { name: 'DHL', url: 'https://www.dhl.com' },
      { name: 'UPS', url: 'https://www.ups.com' },
    ],
  },
  {
    id: 'warehousing-storage', label: 'Warehousing & Storage', group: 'Transportation & Logistics',
    businesses: [
      { name: 'Prologis', url: 'https://www.prologis.com' },
      { name: 'Lineage Logistics', url: 'https://www.lineagelogistics.com' },
    ],
  },
  {
    id: '3pl-logistics', label: 'Third-Party Logistics (3PL)', group: 'Transportation & Logistics',
    businesses: [
      { name: 'C.H. Robinson', url: 'https://www.chrobinson.com' },
      { name: 'Kuehne+Nagel', url: 'https://home.kuehne-nagel.com' },
    ],
  },
  {
    id: 'supply-chain', label: 'Supply Chain Management', group: 'Transportation & Logistics',
    businesses: [
      { name: 'Flexport', url: 'https://www.flexport.com' },
      { name: 'Project44', url: 'https://www.project44.com' },
    ],
  },
  {
    id: 'cold-chain', label: 'Cold Chain & Refrigerated Transport', group: 'Transportation & Logistics',
    businesses: [
      { name: 'Lineage Logistics', url: 'https://www.lineagelogistics.com' },
      { name: 'United States Cold Storage', url: 'https://www.uscold.com' },
    ],
  },
  {
    id: 'courier-delivery', label: 'Courier & Express Delivery', group: 'Transportation & Logistics',
    businesses: [
      { name: 'FedEx', url: 'https://www.fedex.com' },
      { name: 'UPS', url: 'https://www.ups.com' },
      { name: 'OnTrac', url: 'https://www.ontrac.com' },
    ],
  },
  {
    id: 'last-mile-delivery', label: 'Last-Mile Delivery', group: 'Transportation & Logistics',
    businesses: [
      { name: 'DoorDash', url: 'https://www.doordash.com' },
      { name: 'Instacart', url: 'https://www.instacart.com' },
      { name: 'Shipt', url: 'https://www.shipt.com' },
    ],
  },
  {
    id: 'moving-relocation', label: 'Moving & Relocation Services', group: 'Transportation & Logistics',
    businesses: [
      { name: 'U-Haul', url: 'https://www.uhaul.com' },
      { name: 'Two Men and a Truck', url: 'https://www.twomenandatruck.com' },
      { name: 'Allied Van Lines', url: 'https://www.allied.com' },
    ],
  },
  {
    id: 'waste-management', label: 'Waste Management & Recycling', group: 'Transportation & Logistics',
    businesses: [
      { name: 'Waste Management', url: 'https://www.wm.com' },
      { name: 'Republic Services', url: 'https://www.republicservices.com' },
      { name: 'Waste Connections', url: 'https://www.wasteconnections.com' },
    ],
  },

  // ==================== REAL ESTATE & PROPERTY ====================
  {
    id: 'residential-brokerage', label: 'Residential Real Estate Brokerage', group: 'Real Estate & Property',
    businesses: [
      { name: 'Compass', url: 'https://www.compass.com' },
      { name: 'Redfin', url: 'https://www.redfin.com' },
      { name: 'Zillow', url: 'https://www.zillow.com' },
      { name: 'RE/MAX', url: 'https://www.remax.com' },
    ],
  },
  {
    id: 'commercial-real-estate', label: 'Commercial Real Estate', group: 'Real Estate & Property',
    businesses: [
      { name: 'CBRE', url: 'https://www.cbre.com' },
      { name: 'JLL', url: 'https://www.jll.com' },
      { name: 'Cushman & Wakefield', url: 'https://www.cushmanwakefield.com' },
    ],
  },
  {
    id: 'industrial-real-estate', label: 'Industrial Real Estate', group: 'Real Estate & Property',
    businesses: [
      { name: 'Prologis', url: 'https://www.prologis.com' },
      { name: 'Rexford Industrial', url: 'https://www.rexfordindustrial.com' },
    ],
  },
  {
    id: 'property-management', label: 'Property Management', group: 'Real Estate & Property',
    businesses: [
      { name: 'FirstService Residential', url: 'https://www.fsresidential.com' },
      { name: 'Associa', url: 'https://www.associa.com' },
      { name: 'Greystar', url: 'https://www.greystar.com' },
    ],
  },
  {
    id: 'real-estate-development', label: 'Real Estate Development', group: 'Real Estate & Property',
    businesses: [
      { name: 'Lennar', url: 'https://www.lennar.com' },
      { name: 'D.R. Horton', url: 'https://www.drhorton.com' },
      { name: 'PulteGroup', url: 'https://www.pultegroup.com' },
    ],
  },
  {
    id: 'home-building', label: 'Home Building & Construction', group: 'Real Estate & Property',
    businesses: [
      { name: 'Lennar', url: 'https://www.lennar.com' },
      { name: 'Toll Brothers', url: 'https://www.tollbrothers.com' },
      { name: 'Meritage Homes', url: 'https://www.meritagehomes.com' },
    ],
  },
  {
    id: 'real-estate-investment', label: 'Real Estate Investment', group: 'Real Estate & Property',
    businesses: [
      { name: 'Realty Income', url: 'https://www.realtyincome.com' },
      { name: 'Simon Property Group', url: 'https://www.simon.com' },
    ],
  },
  {
    id: 'property-appraisal', label: 'Property Appraisal', group: 'Real Estate & Property',
    businesses: [
      { name: 'CoreLogic', url: 'https://www.corelogic.com' },
      { name: 'Appraisal Institute', url: 'https://www.appraisalinstitute.org' },
    ],
  },
  {
    id: 'home-inspection', label: 'Home Inspection', group: 'Real Estate & Property',
    businesses: [
      { name: 'AmeriSpec', url: 'https://www.amerispec.com' },
      { name: 'HouseMaster', url: 'https://www.housemaster.com' },
    ],
  },
  {
    id: 'title-escrow', label: 'Title & Escrow Services', group: 'Real Estate & Property',
    businesses: [
      { name: 'First American Title', url: 'https://www.firstam.com' },
      { name: 'Old Republic Title', url: 'https://www.oldrepublictitle.com' },
    ],
  },
  {
    id: 'coworking-office', label: 'Co-working & Office Space', group: 'Real Estate & Property',
    businesses: [
      { name: 'WeWork', url: 'https://www.wework.com' },
      { name: 'Regus', url: 'https://www.regus.com' },
      { name: 'Industrious', url: 'https://www.industriousoffice.com' },
    ],
  },
  {
    id: 'self-storage', label: 'Self-Storage Facilities', group: 'Real Estate & Property',
    businesses: [
      { name: 'Public Storage', url: 'https://www.publicstorage.com' },
      { name: 'Extra Space Storage', url: 'https://www.extraspace.com' },
      { name: 'CubeSmart', url: 'https://www.cubesmart.com' },
    ],
  },

  // ==================== EDUCATION & TRAINING ====================
  {
    id: 'k12-private', label: 'K-12 Schools (Private)', group: 'Education & Training',
    businesses: [
      { name: 'BASIS Charter Schools', url: 'https://www.basised.com' },
      { name: 'Niche Schools', url: 'https://www.niche.com' },
    ],
  },
  {
    id: 'colleges-universities', label: 'Colleges & Universities', group: 'Education & Training',
    businesses: [
      { name: 'University of Phoenix', url: 'https://www.phoenix.edu' },
      { name: 'Southern New Hampshire University', url: 'https://www.snhu.edu' },
      { name: 'Grand Canyon University', url: 'https://www.gcu.edu' },
    ],
  },
  {
    id: 'vocational-trade', label: 'Vocational & Trade Schools', group: 'Education & Training',
    businesses: [
      { name: 'Lincoln Tech', url: 'https://www.lincolntech.edu' },
      { name: 'Universal Technical Institute', url: 'https://www.uti.edu' },
    ],
  },
  {
    id: 'online-learning', label: 'Online Learning Platforms', group: 'Education & Training',
    businesses: [
      { name: 'Coursera', url: 'https://www.coursera.org' },
      { name: 'Udemy', url: 'https://www.udemy.com' },
      { name: 'Pluralsight', url: 'https://www.pluralsight.com' },
    ],
  },
  {
    id: 'tutoring-testprep', label: 'Tutoring & Test Prep', group: 'Education & Training',
    businesses: [
      { name: 'Kaplan', url: 'https://www.kaplan.com' },
      { name: 'Princeton Review', url: 'https://www.princetonreview.com' },
      { name: 'Kumon', url: 'https://www.kumon.com' },
    ],
  },
  {
    id: 'language-schools', label: 'Language Schools', group: 'Education & Training',
    businesses: [
      { name: 'Berlitz', url: 'https://www.berlitz.com' },
      { name: 'Rosetta Stone', url: 'https://www.rosettastone.com' },
    ],
  },
  {
    id: 'music-arts-schools', label: 'Music & Arts Schools', group: 'Education & Training',
    businesses: [
      { name: 'School of Rock', url: 'https://www.schoolofrock.com' },
      { name: 'Kindermusik', url: 'https://www.kindermusik.com' },
    ],
  },
  {
    id: 'driving-schools', label: 'Driving Schools', group: 'Education & Training',
    businesses: [
      { name: 'DriversEd.com', url: 'https://www.driversed.com' },
      { name: 'AAA Driving School', url: 'https://www.aaa.com' },
    ],
  },
  {
    id: 'professional-certification', label: 'Professional Certification', group: 'Education & Training',
    businesses: [
      { name: 'CompTIA', url: 'https://www.comptia.org' },
      { name: 'PMI', url: 'https://www.pmi.org' },
    ],
  },
  {
    id: 'corporate-training', label: 'Corporate Training', group: 'Education & Training',
    businesses: [
      { name: 'Dale Carnegie', url: 'https://www.dalecarnegie.com' },
      { name: 'FranklinCovey', url: 'https://www.franklincovey.com' },
    ],
  },
  {
    id: 'childcare-daycare', label: 'Childcare & Daycare', group: 'Education & Training',
    businesses: [
      { name: 'KinderCare', url: 'https://www.kindercare.com' },
      { name: 'Bright Horizons', url: 'https://www.brighthorizons.com' },
      { name: 'La Petite Academy', url: 'https://www.lapetite.com' },
    ],
  },
  {
    id: 'special-education', label: 'Special Education Services', group: 'Education & Training',
    businesses: [
      { name: 'Blythedale Children', url: 'https://www.blythedale.org' },
      { name: 'CIP', url: 'https://www.cipworldwide.org' },
    ],
  },

  // ==================== LEGAL SERVICES ====================
  {
    id: 'general-practice-law', label: 'General Practice Law', group: 'Legal Services',
    businesses: [
      { name: 'LegalZoom', url: 'https://www.legalzoom.com' },
      { name: 'Rocket Lawyer', url: 'https://www.rocketlawyer.com' },
    ],
  },
  {
    id: 'corporate-law', label: 'Corporate & Business Law', group: 'Legal Services',
    businesses: [
      { name: 'Latham & Watkins', url: 'https://www.lw.com' },
      { name: 'Skadden', url: 'https://www.skadden.com' },
      { name: 'Kirkland & Ellis', url: 'https://www.kirkland.com' },
    ],
  },
  {
    id: 'criminal-defense', label: 'Criminal Defense', group: 'Legal Services',
    businesses: [
      { name: 'NACDL', url: 'https://www.nacdl.org' },
      { name: 'Avvo Criminal Defense', url: 'https://www.avvo.com' },
    ],
  },
  {
    id: 'family-divorce-law', label: 'Family & Divorce Law', group: 'Legal Services',
    businesses: [
      { name: 'Cordell & Cordell', url: 'https://www.cordellcordell.com' },
      { name: 'Weinberger Law', url: 'https://www.weinbergerlaw.com' },
    ],
  },
  {
    id: 'personal-injury-law', label: 'Personal Injury Law', group: 'Legal Services',
    businesses: [
      { name: 'Morgan & Morgan', url: 'https://www.forthepeople.com' },
      { name: 'Cellino Law', url: 'https://www.cellinolaw.com' },
    ],
  },
  {
    id: 'immigration-law', label: 'Immigration Law', group: 'Legal Services',
    businesses: [
      { name: 'Boundless', url: 'https://www.boundless.com' },
      { name: 'RapidVisa', url: 'https://www.rapidvisa.com' },
    ],
  },
  {
    id: 'estate-planning-law', label: 'Estate Planning & Probate', group: 'Legal Services',
    businesses: [
      { name: 'Trust & Will', url: 'https://www.trustandwill.com' },
    ],
  },
  {
    id: 'real-estate-law', label: 'Real Estate Law', group: 'Legal Services',
    businesses: [
      { name: 'American Bar Association', url: 'https://www.americanbar.org' },
    ],
  },
  {
    id: 'ip-law', label: 'Intellectual Property Law', group: 'Legal Services',
    businesses: [
      { name: 'Fish & Richardson', url: 'https://www.fr.com' },
      { name: 'Knobbe Martens', url: 'https://www.knobbe.com' },
    ],
  },
  {
    id: 'bankruptcy-law', label: 'Bankruptcy Law', group: 'Legal Services',
    businesses: [
      { name: 'Upsolve', url: 'https://upsolve.org' },
      { name: 'NACBA', url: 'https://www.nacba.com' },
    ],
  },
  {
    id: 'employment-law', label: 'Employment & Labor Law', group: 'Legal Services',
    businesses: [
      { name: 'Littler', url: 'https://www.littler.com' },
      { name: 'Ogletree Deakins', url: 'https://www.ogletree.com' },
    ],
  },
  {
    id: 'patent-trademark', label: 'Patent & Trademark', group: 'Legal Services',
    businesses: [
      { name: 'USPTO', url: 'https://www.uspto.gov' },
      { name: 'WIPO', url: 'https://www.wipo.int' },
    ],
  },
  {
    id: 'mediation-arbitration', label: 'Mediation & Arbitration', group: 'Legal Services',
    businesses: [
      { name: 'JAMS', url: 'https://www.jamsadr.com' },
      { name: 'AAA Arbitration', url: 'https://www.adr.org' },
    ],
  },

  // ==================== MEDIA & ENTERTAINMENT ====================
  {
    id: 'film-video-production', label: 'Film & Video Production', group: 'Media & Entertainment',
    businesses: [
      { name: 'Lionsgate', url: 'https://www.lionsgate.com' },
      { name: 'A24', url: 'https://a24films.com' },
      { name: 'Blumhouse', url: 'https://www.blumhouse.com' },
    ],
  },
  {
    id: 'television-broadcasting', label: 'Television & Broadcasting', group: 'Media & Entertainment',
    businesses: [
      { name: 'ABC', url: 'https://abc.com' },
      { name: 'NBC', url: 'https://www.nbc.com' },
      { name: 'CBS', url: 'https://www.cbs.com' },
    ],
  },
  {
    id: 'music-production', label: 'Music Production & Labels', group: 'Media & Entertainment',
    businesses: [
      { name: 'Universal Music', url: 'https://www.universalmusic.com' },
      { name: 'Sony Music', url: 'https://www.sonymusic.com' },
      { name: 'Warner Music', url: 'https://www.wmg.com' },
    ],
  },
  {
    id: 'streaming-services', label: 'Streaming Services', group: 'Media & Entertainment',
    businesses: [
      { name: 'Netflix', url: 'https://www.netflix.com' },
      { name: 'Disney+', url: 'https://www.disneyplus.com' },
      { name: 'Spotify', url: 'https://www.spotify.com' },
    ],
  },
  {
    id: 'publishing-print', label: 'Publishing & Print Media', group: 'Media & Entertainment',
    businesses: [
      { name: 'Penguin Random House', url: 'https://www.penguinrandomhouse.com' },
      { name: 'HarperCollins', url: 'https://www.harpercollins.com' },
    ],
  },
  {
    id: 'news-journalism', label: 'News & Journalism', group: 'Media & Entertainment',
    businesses: [
      { name: 'The New York Times', url: 'https://www.nytimes.com' },
      { name: 'Washington Post', url: 'https://www.washingtonpost.com' },
      { name: 'Reuters', url: 'https://www.reuters.com' },
    ],
  },
  {
    id: 'radio-podcasts', label: 'Radio & Podcasts', group: 'Media & Entertainment',
    businesses: [
      { name: 'iHeartMedia', url: 'https://www.iheart.com' },
      { name: 'Spotify Podcasts', url: 'https://www.spotify.com/podcasts' },
    ],
  },
  {
    id: 'photography-studios', label: 'Photography Studios', group: 'Media & Entertainment',
    businesses: [
      { name: 'Lifetouch', url: 'https://lifetouch.com' },
      { name: 'Picture People', url: 'https://www.picturepeople.com' },
    ],
  },
  {
    id: 'animation-vfx', label: 'Animation & VFX', group: 'Media & Entertainment',
    businesses: [
      { name: 'Pixar', url: 'https://www.pixar.com' },
      { name: 'DreamWorks', url: 'https://www.dreamworks.com' },
      { name: 'ILM', url: 'https://www.ilm.com' },
    ],
  },
  {
    id: 'talent-agencies', label: 'Talent Agencies & Management', group: 'Media & Entertainment',
    businesses: [
      { name: 'CAA', url: 'https://www.caa.com' },
      { name: 'WME', url: 'https://www.wmeagency.com' },
      { name: 'UTA', url: 'https://www.unitedtalent.com' },
    ],
  },
  {
    id: 'theater-performing-arts', label: 'Theater & Performing Arts', group: 'Media & Entertainment',
    businesses: [
      { name: 'Broadway.com', url: 'https://www.broadway.com' },
      { name: 'Cirque du Soleil', url: 'https://www.cirquedusoleil.com' },
    ],
  },
  {
    id: 'museums-galleries', label: 'Museums & Galleries', group: 'Media & Entertainment',
    businesses: [
      { name: 'The Met', url: 'https://www.metmuseum.org' },
      { name: 'MoMA', url: 'https://www.moma.org' },
      { name: 'Smithsonian', url: 'https://www.si.edu' },
    ],
  },
  {
    id: 'theme-parks', label: 'Theme Parks & Attractions', group: 'Media & Entertainment',
    businesses: [
      { name: 'Disney Parks', url: 'https://disneyparks.com' },
      { name: 'Universal Studios', url: 'https://www.universalorlando.com' },
      { name: 'Six Flags', url: 'https://www.sixflags.com' },
    ],
  },
  {
    id: 'sports-teams', label: 'Sports Teams & Franchises', group: 'Media & Entertainment',
    businesses: [
      { name: 'Dallas Cowboys', url: 'https://www.dallascowboys.com' },
      { name: 'Lakers', url: 'https://www.nba.com/lakers' },
      { name: 'Yankees', url: 'https://www.mlb.com/yankees' },
    ],
  },
  {
    id: 'esports-gaming', label: 'Esports & Gaming', group: 'Media & Entertainment',
    businesses: [
      { name: 'Twitch', url: 'https://www.twitch.tv' },
      { name: 'FaZe Clan', url: 'https://www.fazeclan.com' },
      { name: 'TSM', url: 'https://tsm.gg' },
    ],
  },

  // ==================== MARKETING & ADVERTISING ====================
  {
    id: 'digital-marketing-agencies', label: 'Digital Marketing Agencies', group: 'Marketing & Advertising',
    businesses: [
      { name: 'WebFX', url: 'https://www.webfx.com' },
      { name: 'Disruptive Advertising', url: 'https://www.disruptiveadvertising.com' },
      { name: 'Ignite Visibility', url: 'https://www.ignitevisibility.com' },
    ],
  },
  {
    id: 'advertising-agencies', label: 'Advertising Agencies', group: 'Marketing & Advertising',
    businesses: [
      { name: 'Ogilvy', url: 'https://www.ogilvy.com' },
      { name: 'BBDO', url: 'https://www.bbdo.com' },
      { name: 'DDB', url: 'https://www.ddb.com' },
    ],
  },
  {
    id: 'public-relations', label: 'Public Relations Firms', group: 'Marketing & Advertising',
    businesses: [
      { name: 'Edelman', url: 'https://www.edelman.com' },
      { name: 'Weber Shandwick', url: 'https://www.webershandwick.com' },
      { name: 'FleishmanHillard', url: 'https://www.fleishmanhillard.com' },
    ],
  },
  {
    id: 'seo-search-marketing', label: 'SEO & Search Marketing', group: 'Marketing & Advertising',
    businesses: [
      { name: 'SEMrush', url: 'https://www.semrush.com' },
      { name: 'Ahrefs', url: 'https://ahrefs.com' },
      { name: 'Moz', url: 'https://moz.com' },
    ],
  },
  {
    id: 'social-media-marketing', label: 'Social Media Marketing', group: 'Marketing & Advertising',
    businesses: [
      { name: 'Sprout Social', url: 'https://sproutsocial.com' },
      { name: 'Hootsuite', url: 'https://www.hootsuite.com' },
      { name: 'Buffer', url: 'https://buffer.com' },
    ],
  },
  {
    id: 'content-marketing', label: 'Content Marketing & Copywriting', group: 'Marketing & Advertising',
    businesses: [
      { name: 'Brafton', url: 'https://www.brafton.com' },
      { name: 'Express Writers', url: 'https://expresswriters.com' },
    ],
  },
  {
    id: 'branding-design-agencies', label: 'Branding & Design Agencies', group: 'Marketing & Advertising',
    businesses: [
      { name: 'Pentagram', url: 'https://www.pentagram.com' },
      { name: 'Landor', url: 'https://www.landor.com' },
      { name: 'MetaDesign', url: 'https://www.metadesign.com' },
    ],
  },
  {
    id: 'market-research', label: 'Market Research & Insights', group: 'Marketing & Advertising',
    businesses: [
      { name: 'Nielsen', url: 'https://www.nielsen.com' },
      { name: 'Kantar', url: 'https://www.kantar.com' },
      { name: 'Ipsos', url: 'https://www.ipsos.com' },
    ],
  },
  {
    id: 'direct-mail-print', label: 'Direct Mail & Print Marketing', group: 'Marketing & Advertising',
    businesses: [
      { name: 'Vistaprint', url: 'https://www.vistaprint.com' },
      { name: 'MOO', url: 'https://www.moo.com' },
    ],
  },
  {
    id: 'outdoor-advertising', label: 'Outdoor & Billboard Advertising', group: 'Marketing & Advertising',
    businesses: [
      { name: 'Clear Channel', url: 'https://clearchannel.com' },
      { name: 'Lamar Advertising', url: 'https://www.lamar.com' },
    ],
  },
  {
    id: 'influencer-marketing', label: 'Influencer Marketing Platforms', group: 'Marketing & Advertising',
    businesses: [
      { name: 'Aspire', url: 'https://aspire.io' },
      { name: 'Grin', url: 'https://grin.co' },
    ],
  },
  {
    id: 'affiliate-marketing', label: 'Affiliate Marketing Networks', group: 'Marketing & Advertising',
    businesses: [
      { name: 'ShareASale', url: 'https://www.shareasale.com' },
      { name: 'CJ Affiliate', url: 'https://www.cj.com' },
      { name: 'Impact', url: 'https://impact.com' },
    ],
  },
  {
    id: 'print-signage', label: 'Print & Signage', group: 'Marketing & Advertising',
    businesses: [
      { name: 'FASTSIGNS', url: 'https://www.fastsigns.com' },
      { name: 'Signarama', url: 'https://www.signarama.com' },
    ],
  },

  // ==================== PROFESSIONAL SERVICES ====================
  {
    id: 'management-consulting', label: 'Management Consulting', group: 'Professional Services',
    businesses: [
      { name: 'McKinsey', url: 'https://www.mckinsey.com' },
      { name: 'Bain & Company', url: 'https://www.bain.com' },
      { name: 'BCG', url: 'https://www.bcg.com' },
      { name: 'Deloitte Consulting', url: 'https://www2.deloitte.com' },
    ],
  },
  {
    id: 'hr-recruiting', label: 'HR & Recruiting Agencies', group: 'Professional Services',
    businesses: [
      { name: 'Robert Half', url: 'https://www.roberthalf.com' },
      { name: 'Randstad', url: 'https://www.randstadusa.com' },
      { name: 'Adecco', url: 'https://www.adecco.com' },
    ],
  },
  {
    id: 'executive-search', label: 'Executive Search & Headhunting', group: 'Professional Services',
    businesses: [
      { name: 'Korn Ferry', url: 'https://www.kornferry.com' },
      { name: 'Heidrick & Struggles', url: 'https://www.heidrick.com' },
      { name: 'Spencer Stuart', url: 'https://www.spencerstuart.com' },
    ],
  },
  {
    id: 'translation-interpretation', label: 'Translation & Interpretation', group: 'Professional Services',
    businesses: [
      { name: 'TransPerfect', url: 'https://www.transperfect.com' },
      { name: 'Lionbridge', url: 'https://www.lionbridge.com' },
    ],
  },
  {
    id: 'notary-services', label: 'Notary Services', group: 'Professional Services',
    businesses: [
      { name: 'Notarize.com', url: 'https://www.notarize.com' },
      { name: 'National Notary Association', url: 'https://www.nationalnotary.org' },
    ],
  },
  {
    id: 'background-checks', label: 'Background Check Services', group: 'Professional Services',
    businesses: [
      { name: 'Checkr', url: 'https://www.checkr.com' },
      { name: 'Sterling', url: 'https://www.sterlingcheck.com' },
    ],
  },
  {
    id: 'virtual-assistant', label: 'Virtual Assistant Services', group: 'Professional Services',
    businesses: [
      { name: 'Belay', url: 'https://belaysolutions.com' },
      { name: 'Time etc', url: 'https://timeetc.com' },
    ],
  },
  {
    id: 'temp-staffing', label: 'Temp Agencies & Staffing', group: 'Professional Services',
    businesses: [
      { name: 'Manpower', url: 'https://www.manpower.com' },
      { name: 'Kelly Services', url: 'https://www.kellyservices.com' },
    ],
  },

  // ==================== AUTOMOTIVE ====================
  {
    id: 'auto-dealerships-new', label: 'Auto Dealerships (New)', group: 'Automotive',
    businesses: [
      { name: 'AutoNation', url: 'https://www.autonation.com' },
      { name: 'Lithia Motors', url: 'https://www.lithia.com' },
      { name: 'CarMax', url: 'https://www.carmax.com' },
    ],
  },
  {
    id: 'used-car-dealers', label: 'Used Car Dealerships', group: 'Automotive',
    businesses: [
      { name: 'CarMax', url: 'https://www.carmax.com' },
      { name: 'Carvana', url: 'https://www.carvana.com' },
      { name: 'Vroom', url: 'https://www.vroom.com' },
    ],
  },
  {
    id: 'auto-repair', label: 'Auto Repair & Mechanics', group: 'Automotive',
    businesses: [
      { name: 'Midas', url: 'https://www.midas.com' },
      { name: 'Meineke', url: 'https://www.meineke.com' },
      { name: 'Jiffy Lube', url: 'https://www.jiffylube.com' },
    ],
  },
  {
    id: 'auto-body-collision', label: 'Auto Body & Collision', group: 'Automotive',
    businesses: [
      { name: 'Caliber Collision', url: 'https://www.calibercollision.com' },
      { name: 'Gerber Collision', url: 'https://www.gerbercollision.com' },
    ],
  },
  {
    id: 'tire-wheel-services', label: 'Tire & Wheel Services', group: 'Automotive',
    businesses: [
      { name: 'Discount Tire', url: 'https://www.discounttire.com' },
      { name: 'Les Schwab', url: 'https://www.lesschwab.com' },
      { name: 'Goodyear Tire', url: 'https://www.goodyear.com' },
    ],
  },
  {
    id: 'auto-detailing', label: 'Auto Detailing & Car Wash', group: 'Automotive',
    businesses: [
      { name: 'Mister Car Wash', url: 'https://www.mistercarwash.com' },
      { name: 'Ziebart', url: 'https://www.ziebart.com' },
    ],
  },
  {
    id: 'towing-recovery', label: 'Towing & Recovery', group: 'Automotive',
    businesses: [
      { name: 'AAA Towing', url: 'https://www.aaa.com' },
    ],
  },
  {
    id: 'motorcycle-dealers', label: 'Motorcycle Dealers & Service', group: 'Automotive',
    businesses: [
      { name: 'Harley-Davidson', url: 'https://www.harley-davidson.com' },
      { name: 'RevZilla', url: 'https://www.revzilla.com' },
    ],
  },
  {
    id: 'boat-marine-dealers', label: 'Boat & Marine Dealers', group: 'Automotive',
    businesses: [
      { name: 'MarineMax', url: 'https://www.marinemax.com' },
      { name: 'Bass Pro Shops', url: 'https://www.basspro.com' },
    ],
  },
  {
    id: 'auto-glass', label: 'Auto Glass & Windshield', group: 'Automotive',
    businesses: [
      { name: 'Safelite', url: 'https://www.safelite.com' },
      { name: 'Glass Doctor', url: 'https://www.glassdoctor.com' },
    ],
  },
  {
    id: 'ev-charging', label: 'EV Charging Stations', group: 'Automotive',
    businesses: [
      { name: 'ChargePoint', url: 'https://www.chargepoint.com' },
      { name: 'EVgo', url: 'https://www.evgo.com' },
      { name: 'Electrify America', url: 'https://www.electrifyamerica.com' },
    ],
  },

  // ==================== BEAUTY & PERSONAL CARE ====================
  {
    id: 'hair-salons', label: 'Hair Salons & Barbershops', group: 'Beauty & Personal Care',
    businesses: [
      { name: 'Great Clips', url: 'https://www.greatclips.com' },
      { name: 'Supercuts', url: 'https://www.supercuts.com' },
      { name: 'Sport Clips', url: 'https://www.sportclips.com' },
    ],
  },
  {
    id: 'nail-salons', label: 'Nail Salons & Spas', group: 'Beauty & Personal Care',
    businesses: [
      { name: 'Happy Nails', url: 'https://www.happynails.com' },
    ],
  },
  {
    id: 'skin-care-esthetics', label: 'Skin Care & Esthetics', group: 'Beauty & Personal Care',
    businesses: [
      { name: 'European Wax Center', url: 'https://www.waxcenter.com' },
      { name: 'Hand & Stone', url: 'https://www.handandstone.com' },
    ],
  },
  {
    id: 'massage-therapy', label: 'Massage Therapy & Spas', group: 'Beauty & Personal Care',
    businesses: [
      { name: 'Massage Envy', url: 'https://www.massageenvy.com' },
      { name: 'Elements Massage', url: 'https://www.elementsmassage.com' },
    ],
  },
  {
    id: 'tattoo-piercing', label: 'Tattoo & Piercing Studios', group: 'Beauty & Personal Care',
    businesses: [
      { name: 'Tattoo Dojo', url: 'https://www.tattoodo.com' },
    ],
  },
  {
    id: 'makeup-artistry', label: 'Makeup Artistry', group: 'Beauty & Personal Care',
    businesses: [
      { name: 'MAC Cosmetics', url: 'https://www.maccosmetics.com' },
      { name: 'Bobbi Brown', url: 'https://www.bobbibrown.com' },
    ],
  },

  // ==================== FITNESS & WELLNESS ====================
  {
    id: 'gyms-fitness', label: 'Gyms & Fitness Centers', group: 'Fitness & Wellness',
    businesses: [
      { name: 'Planet Fitness', url: 'https://www.planetfitness.com' },
      { name: 'LA Fitness', url: 'https://www.lafitness.com' },
      { name: 'Anytime Fitness', url: 'https://www.anytimefitness.com' },
    ],
  },
  {
    id: 'personal-training', label: 'Personal Training', group: 'Fitness & Wellness',
    businesses: [
      { name: 'F45 Training', url: 'https://f45training.com' },
      { name: "Barry's", url: 'https://www.barrys.com' },
    ],
  },
  {
    id: 'yoga-studios', label: 'Yoga Studios', group: 'Fitness & Wellness',
    businesses: [
      { name: 'CorePower Yoga', url: 'https://www.corepoweryoga.com' },
      { name: 'YogaWorks', url: 'https://www.yogaworks.com' },
    ],
  },
  {
    id: 'pilates-studios', label: 'Pilates Studios', group: 'Fitness & Wellness',
    businesses: [
      { name: 'Club Pilates', url: 'https://www.clubpilates.com' },
      { name: 'Pure Barre', url: 'https://www.purebarre.com' },
    ],
  },
  {
    id: 'crossfit', label: 'CrossFit & Functional Training', group: 'Fitness & Wellness',
    businesses: [
      { name: 'CrossFit HQ', url: 'https://www.crossfit.com' },
      { name: 'Orangetheory', url: 'https://www.orangetheory.com' },
    ],
  },
  {
    id: 'martial-arts', label: 'Martial Arts & Dojos', group: 'Fitness & Wellness',
    businesses: [
      { name: 'ATA Martial Arts', url: 'https://www.ataonline.com' },
      { name: 'Gracie Barra', url: 'https://gbhq.graciebarra.com' },
    ],
  },
  {
    id: 'dance-studios', label: 'Dance Studios', group: 'Fitness & Wellness',
    businesses: [
      { name: 'Arthur Murray', url: 'https://arthurmurray.com' },
      { name: 'Fred Astaire', url: 'https://www.fredastaire.com' },
    ],
  },
  {
    id: 'nutrition-dietetics', label: 'Nutrition & Dietetics', group: 'Fitness & Wellness',
    businesses: [
      { name: 'Noom', url: 'https://www.noom.com' },
      { name: 'MyFitnessPal', url: 'https://www.myfitnesspal.com' },
    ],
  },
  {
    id: 'wellness-retreats', label: 'Wellness Centers & Retreats', group: 'Fitness & Wellness',
    businesses: [
      { name: 'Canyon Ranch', url: 'https://www.canyonranch.com' },
      { name: 'Miraval Resorts', url: 'https://www.miravalresorts.com' },
    ],
  },
  {
    id: 'weight-loss', label: 'Weight Loss Programs', group: 'Fitness & Wellness',
    businesses: [
      { name: 'Weight Watchers', url: 'https://www.weightwatchers.com' },
      { name: 'Jenny Craig', url: 'https://www.jennycraig.com' },
    ],
  },

  // ==================== AGRICULTURE & FARMING ====================
  {
    id: 'crop-farming', label: 'Crop Farming & Agriculture', group: 'Agriculture & Farming',
    businesses: [
      { name: 'Bayer Crop Science', url: 'https://www.cropscience.bayer.com' },
      { name: 'Corteva', url: 'https://www.corteva.com' },
    ],
  },
  {
    id: 'livestock', label: 'Livestock & Animal Husbandry', group: 'Agriculture & Farming',
    businesses: [
      { name: 'Tyson Foods', url: 'https://www.tysonfoods.com' },
      { name: 'JBS USA', url: 'https://jbssa.com' },
    ],
  },
  {
    id: 'dairy-farming', label: 'Dairy Farming', group: 'Agriculture & Farming',
    businesses: [
      { name: 'Dean Foods', url: 'https://www.deanfoods.com' },
      { name: 'Darigold', url: 'https://www.darigold.com' },
    ],
  },
  {
    id: 'poultry', label: 'Poultry & Egg Production', group: 'Agriculture & Farming',
    businesses: [
      { name: 'Cal-Maine Foods', url: 'https://www.calmainefoods.com' },
      { name: 'Perdue Farms', url: 'https://www.perduefarms.com' },
    ],
  },
  {
    id: 'aquaculture', label: 'Aquaculture & Fish Farming', group: 'Agriculture & Farming',
    businesses: [
      { name: 'AquaBounty', url: 'https://www.aquabounty.com' },
      { name: 'Cermaq', url: 'https://www.cermaq.com' },
    ],
  },
  {
    id: 'orchards-fruit', label: 'Orchards & Fruit Farming', group: 'Agriculture & Farming',
    businesses: [
      { name: 'Stemilt', url: 'https://www.stemilt.com' },
      { name: 'Sunkist', url: 'https://www.sunkist.com' },
    ],
  },
  {
    id: 'agricultural-equipment', label: 'Agricultural Equipment & Supplies', group: 'Agriculture & Farming',
    businesses: [
      { name: 'John Deere', url: 'https://www.deere.com' },
      { name: 'Tractor Supply', url: 'https://www.tractorsupply.com' },
    ],
  },
  {
    id: 'organic-farming', label: 'Organic Farming', group: 'Agriculture & Farming',
    businesses: [
      { name: 'Organic Valley', url: 'https://www.organicvalley.coop' },
      { name: 'Whole Foods Market', url: 'https://www.wholefoodsmarket.com' },
    ],
  },
  {
    id: 'hydroponics', label: 'Hydroponics & Vertical Farming', group: 'Agriculture & Farming',
    businesses: [
      { name: 'Plenty', url: 'https://www.plenty.ag' },
      { name: 'AeroFarms', url: 'https://aerofarms.com' },
    ],
  },
  {
    id: 'forestry-timber', label: 'Forestry & Timber', group: 'Agriculture & Farming',
    businesses: [
      { name: 'Weyerhaeuser', url: 'https://www.weyerhaeuser.com' },
      { name: 'Rayonier', url: 'https://www.rayonier.com' },
    ],
  },

  // ==================== ENERGY & UTILITIES ====================
  {
    id: 'solar-energy', label: 'Solar Energy & Installation', group: 'Energy & Utilities',
    businesses: [
      { name: 'Sunrun', url: 'https://www.sunrun.com' },
      { name: 'SunPower', url: 'https://us.sunpower.com' },
      { name: 'Tesla Energy', url: 'https://www.tesla.com/solarpanels' },
    ],
  },
  {
    id: 'wind-energy', label: 'Wind Energy', group: 'Energy & Utilities',
    businesses: [
      { name: 'NextEra Energy', url: 'https://www.nexteraenergy.com' },
      { name: 'Vestas', url: 'https://www.vestas.com' },
    ],
  },
  {
    id: 'oil-gas', label: 'Oil & Gas Extraction', group: 'Energy & Utilities',
    businesses: [
      { name: 'ExxonMobil', url: 'https://corporate.exxonmobil.com' },
      { name: 'Chevron', url: 'https://www.chevron.com' },
      { name: 'ConocoPhillips', url: 'https://www.conocophillips.com' },
    ],
  },
  {
    id: 'refining-petrochemicals', label: 'Refining & Petrochemicals', group: 'Energy & Utilities',
    businesses: [
      { name: 'Valero', url: 'https://www.valero.com' },
      { name: 'Phillips 66', url: 'https://www.phillips66.com' },
    ],
  },
  {
    id: 'electric-utilities', label: 'Electric Utilities', group: 'Energy & Utilities',
    businesses: [
      { name: 'Duke Energy', url: 'https://www.duke-energy.com' },
      { name: 'NextEra Energy', url: 'https://www.nexteraenergy.com' },
      { name: 'Dominion Energy', url: 'https://www.dominionenergy.com' },
    ],
  },
  {
    id: 'gas-utilities', label: 'Gas Utilities', group: 'Energy & Utilities',
    businesses: [
      { name: 'Southern Company Gas', url: 'https://www.southerncompanygas.com' },
      { name: 'Atmos Energy', url: 'https://www.atmosenergy.com' },
    ],
  },
  {
    id: 'water-utilities', label: 'Water & Wastewater Utilities', group: 'Energy & Utilities',
    businesses: [
      { name: 'American Water', url: 'https://www.amwater.com' },
      { name: 'Aqua America', url: 'https://www.aquaamerica.com' },
    ],
  },
  {
    id: 'energy-storage', label: 'Energy Storage & Batteries', group: 'Energy & Utilities',
    businesses: [
      { name: 'Tesla Energy', url: 'https://www.tesla.com/powerwall' },
      { name: 'Fluence', url: 'https://fluenceenergy.com' },
    ],
  },
  {
    id: 'energy-consulting', label: 'Energy Consulting & Audits', group: 'Energy & Utilities',
    businesses: [
      { name: 'DNV', url: 'https://www.dnv.com' },
      { name: 'Energy Solutions', url: 'https://www.energy-solutions.com' },
    ],
  },

  // ==================== TELECOMMUNICATIONS ====================
  {
    id: 'mobile-carriers', label: 'Mobile/Cellular Carriers', group: 'Telecommunications',
    businesses: [
      { name: 'Verizon', url: 'https://www.verizon.com' },
      { name: 'AT&T', url: 'https://www.att.com' },
      { name: 'T-Mobile', url: 'https://www.t-mobile.com' },
    ],
  },
  {
    id: 'isp', label: 'Internet Service Providers (ISP)', group: 'Telecommunications',
    businesses: [
      { name: 'Comcast Xfinity', url: 'https://www.xfinity.com' },
      { name: 'Spectrum', url: 'https://www.spectrum.com' },
      { name: 'Cox Communications', url: 'https://www.cox.com' },
    ],
  },
  {
    id: 'cable-satellite-tv', label: 'Cable & Satellite TV', group: 'Telecommunications',
    businesses: [
      { name: 'DISH', url: 'https://www.dish.com' },
      { name: 'DIRECTV', url: 'https://www.directv.com' },
    ],
  },
  {
    id: 'voip-phone', label: 'VoIP & Business Phone Systems', group: 'Telecommunications',
    businesses: [
      { name: 'RingCentral', url: 'https://www.ringcentral.com' },
      { name: 'Vonage', url: 'https://www.vonage.com' },
      { name: 'Nextiva', url: 'https://www.nextiva.com' },
    ],
  },
  {
    id: 'fiber-optic', label: 'Fiber Optic Networks', group: 'Telecommunications',
    businesses: [
      { name: 'Lumen', url: 'https://www.lumen.com' },
      { name: 'Zayo', url: 'https://www.zayo.com' },
    ],
  },
  {
    id: 'data-centers', label: 'Data Centers & Colocation', group: 'Telecommunications',
    businesses: [
      { name: 'Equinix', url: 'https://www.equinix.com' },
      { name: 'Digital Realty', url: 'https://www.digitalrealty.com' },
    ],
  },

  // ==================== INSURANCE ====================
  {
    id: 'life-insurance', label: 'Life Insurance', group: 'Insurance',
    businesses: [
      { name: 'MetLife', url: 'https://www.metlife.com' },
      { name: 'Prudential', url: 'https://www.prudential.com' },
      { name: 'New York Life', url: 'https://www.newyorklife.com' },
    ],
  },
  {
    id: 'health-insurance', label: 'Health Insurance', group: 'Insurance',
    businesses: [
      { name: 'UnitedHealthcare', url: 'https://www.uhc.com' },
      { name: 'Blue Cross Blue Shield', url: 'https://www.bcbs.com' },
      { name: 'Aetna', url: 'https://www.aetna.com' },
    ],
  },
  {
    id: 'auto-insurance', label: 'Auto Insurance', group: 'Insurance',
    businesses: [
      { name: 'GEICO', url: 'https://www.geico.com' },
      { name: 'Progressive', url: 'https://www.progressive.com' },
      { name: 'State Farm', url: 'https://www.statefarm.com' },
    ],
  },
  {
    id: 'home-insurance', label: 'Home & Property Insurance', group: 'Insurance',
    businesses: [
      { name: 'Allstate', url: 'https://www.allstate.com' },
      { name: 'Liberty Mutual', url: 'https://www.libertymutual.com' },
      { name: 'Farmers', url: 'https://www.farmers.com' },
    ],
  },
  {
    id: 'commercial-insurance', label: 'Business & Commercial Insurance', group: 'Insurance',
    businesses: [
      { name: 'Hiscox', url: 'https://www.hiscox.com' },
      { name: 'The Hartford', url: 'https://www.thehartford.com' },
    ],
  },
  {
    id: 'pet-insurance', label: 'Pet Insurance', group: 'Insurance',
    businesses: [
      { name: 'Trupanion', url: 'https://trupanion.com' },
      { name: 'Healthy Paws', url: 'https://www.healthypawspetinsurance.com' },
    ],
  },
  {
    id: 'insurance-brokerage', label: 'Insurance Brokerage', group: 'Insurance',
    businesses: [
      { name: 'Marsh', url: 'https://www.marsh.com' },
      { name: 'Aon', url: 'https://www.aon.com' },
      { name: 'Gallagher', url: 'https://www.ajg.com' },
    ],
  },

  // ==================== NON-PROFIT & SOCIAL SERVICES ====================
  {
    id: 'charitable-foundations', label: 'Charitable Foundations', group: 'Non-Profit & Social Services',
    businesses: [
      { name: 'Bill & Melinda Gates Foundation', url: 'https://www.gatesfoundation.org' },
      { name: 'Ford Foundation', url: 'https://www.fordfoundation.org' },
    ],
  },
  {
    id: 'religious-organizations', label: 'Religious Organizations', group: 'Non-Profit & Social Services',
    businesses: [
      { name: 'Catholic Charities', url: 'https://www.catholiccharitiesusa.org' },
      { name: 'Salvation Army', url: 'https://www.salvationarmyusa.org' },
    ],
  },
  {
    id: 'food-banks', label: 'Food Banks & Pantries', group: 'Non-Profit & Social Services',
    businesses: [
      { name: 'Feeding America', url: 'https://www.feedingamerica.org' },
      { name: 'Second Harvest', url: 'https://www.secondharvest.org' },
    ],
  },
  {
    id: 'homeless-shelters', label: 'Homeless Shelters & Housing', group: 'Non-Profit & Social Services',
    businesses: [
      { name: 'Habitat for Humanity', url: 'https://www.habitat.org' },
      { name: 'National Coalition for Homeless', url: 'https://nationalhomeless.org' },
    ],
  },
  {
    id: 'youth-programs', label: 'Youth Programs & Scouts', group: 'Non-Profit & Social Services',
    businesses: [
      { name: 'Boys & Girls Clubs', url: 'https://www.bgca.org' },
      { name: 'Boy Scouts of America', url: 'https://www.scouting.org' },
    ],
  },
  {
    id: 'animal-rescue', label: 'Animal Rescue & Shelters', group: 'Non-Profit & Social Services',
    businesses: [
      { name: 'ASPCA', url: 'https://www.aspca.org' },
      { name: 'Humane Society', url: 'https://www.humanesociety.org' },
    ],
  },
  {
    id: 'environmental-conservation', label: 'Environmental Conservation', group: 'Non-Profit & Social Services',
    businesses: [
      { name: 'WWF', url: 'https://www.worldwildlife.org' },
      { name: 'Sierra Club', url: 'https://www.sierraclub.org' },
    ],
  },

  // ==================== PET SERVICES ====================
  {
    id: 'pet-grooming-boarding', label: 'Pet Grooming & Boarding', group: 'Pet Services',
    businesses: [
      { name: 'PetSmart', url: 'https://www.petsmart.com' },
      { name: 'Petco', url: 'https://www.petco.com' },
    ],
  },
  {
    id: 'dog-walking', label: 'Dog Walking & Pet Sitting', group: 'Pet Services',
    businesses: [
      { name: 'Rover', url: 'https://www.rover.com' },
      { name: 'Wag!', url: 'https://wagwalking.com' },
    ],
  },
  {
    id: 'pet-training', label: 'Pet Training & Obedience', group: 'Pet Services',
    businesses: [
      { name: 'PetSmart Training', url: 'https://www.petsmart.com/training' },
      { name: 'Bark Busters', url: 'https://www.barkbusters.com' },
    ],
  },
  {
    id: 'pet-food-supplies', label: 'Pet Food & Supplies Retail', group: 'Pet Services',
    businesses: [
      { name: 'Chewy', url: 'https://www.chewy.com' },
      { name: 'PetSmart', url: 'https://www.petsmart.com' },
    ],
  },
  {
    id: 'equine-services', label: 'Equine Services & Stables', group: 'Pet Services',
    businesses: [
      { name: 'SmartPak', url: 'https://www.smartpakequine.com' },
      { name: 'Dover Saddlery', url: 'https://www.doversaddlery.com' },
    ],
  },

  // ==================== EVENT PLANNING & SERVICES ====================
  {
    id: 'wedding-planning', label: 'Wedding Planning', group: 'Event Planning & Services',
    businesses: [
      { name: 'The Knot', url: 'https://www.theknot.com' },
      { name: 'Zola', url: 'https://www.zola.com' },
    ],
  },
  {
    id: 'corporate-event-planning', label: 'Corporate Event Planning', group: 'Event Planning & Services',
    businesses: [
      { name: 'BI Worldwide', url: 'https://www.biworldwide.com' },
      { name: 'Maritz', url: 'https://www.maritz.com' },
    ],
  },
  {
    id: 'party-rentals', label: 'Party & Event Rentals', group: 'Event Planning & Services',
    businesses: [
      { name: 'Party City', url: 'https://www.partycity.com' },
    ],
  },
  {
    id: 'event-venues', label: 'Event Venues & Banquet Halls', group: 'Event Planning & Services',
    businesses: [
      { name: 'Wedding Spot', url: 'https://www.wedding-spot.com' },
      { name: 'Peerspace', url: 'https://www.peerspace.com' },
    ],
  },
  {
    id: 'photo-video-services', label: 'Photography & Videography', group: 'Event Planning & Services',
    businesses: [
      { name: 'Lifetouch', url: 'https://lifetouch.com' },
      { name: 'WeddingWire', url: 'https://www.weddingwire.com' },
    ],
  },
  {
    id: 'florists', label: 'Florists & Floral Design', group: 'Event Planning & Services',
    businesses: [
      { name: '1-800-Flowers', url: 'https://www.1800flowers.com' },
      { name: 'FTD', url: 'https://www.ftd.com' },
    ],
  },
  {
    id: 'dj-entertainment', label: 'DJ & Entertainment Services', group: 'Event Planning & Services',
    businesses: [
      { name: 'Complete Music', url: 'https://www.completemusic.com' },
      { name: 'GigMasters', url: 'https://www.gigmasters.com' },
    ],
  },

  // ==================== SECURITY & INVESTIGATION ====================
  {
    id: 'security-guards', label: 'Security Guard Services', group: 'Security & Investigation',
    businesses: [
      { name: 'Allied Universal', url: 'https://www.aus.com' },
      { name: 'G4S', url: 'https://www.g4s.com' },
      { name: 'Securitas', url: 'https://www.securitasinc.com' },
    ],
  },
  {
    id: 'alarm-surveillance', label: 'Alarm & Surveillance Systems', group: 'Security & Investigation',
    businesses: [
      { name: 'ADT', url: 'https://www.adt.com' },
      { name: 'Vivint', url: 'https://www.vivint.com' },
      { name: 'SimpliSafe', url: 'https://simplisafe.com' },
    ],
  },
  {
    id: 'private-investigation', label: 'Private Investigation', group: 'Security & Investigation',
    businesses: [
      { name: 'Pinkerton', url: 'https://www.pinkerton.com' },
    ],
  },
  {
    id: 'executive-protection', label: 'Executive Protection', group: 'Security & Investigation',
    businesses: [
      { name: 'GardaWorld', url: 'https://www.garda.com' },
      { name: 'Constellis', url: 'https://www.constellis.com' },
    ],
  },
  {
    id: 'fire-life-safety', label: 'Fire & Life Safety', group: 'Security & Investigation',
    businesses: [
      { name: 'Johnson Controls', url: 'https://www.johnsoncontrols.com' },
      { name: 'Kidde', url: 'https://www.kidde.com' },
    ],
  },

  // ==================== ENVIRONMENTAL SERVICES ====================
  {
    id: 'hazardous-waste', label: 'Hazardous Waste Disposal', group: 'Environmental Services',
    businesses: [
      { name: 'Clean Harbors', url: 'https://www.cleanharbors.com' },
      { name: 'US Ecology', url: 'https://www.usecology.com' },
    ],
  },
  {
    id: 'environmental-consulting', label: 'Environmental Consulting', group: 'Environmental Services',
    businesses: [
      { name: 'ERM', url: 'https://www.erm.com' },
      { name: 'Arcadis', url: 'https://www.arcadis.com' },
    ],
  },
  {
    id: 'asbestos-lead-abatement', label: 'Asbestos & Lead Abatement', group: 'Environmental Services',
    businesses: [
      { name: 'ERS', url: 'https://www.ers.com' },
    ],
  },
  {
    id: 'mold-remediation', label: 'Mold Remediation', group: 'Environmental Services',
    businesses: [
      { name: 'SERVPRO', url: 'https://www.servpro.com' },
      { name: 'PuroClean', url: 'https://www.puroclean.com' },
    ],
  },
  {
    id: 'site-remediation', label: 'Site Assessment & Remediation', group: 'Environmental Services',
    businesses: [
      { name: 'AECOM Environmental', url: 'https://www.aecom.com' },
      { name: 'Terracon', url: 'https://www.terracon.com' },
    ],
  },
  {
    id: 'green-building', label: 'Green Building & LEED Consulting', group: 'Environmental Services',
    businesses: [
      { name: 'USGBC', url: 'https://www.usgbc.org' },
      { name: 'WELL', url: 'https://wellcertified.com' },
    ],
  },

  // ==================== AEROSPACE & DEFENSE ====================
  {
    id: 'defense-contracting', label: 'Defense Contracting', group: 'Aerospace & Defense',
    businesses: [
      { name: 'Lockheed Martin', url: 'https://www.lockheedmartin.com' },
      { name: 'Raytheon', url: 'https://www.rtx.com' },
      { name: 'General Dynamics', url: 'https://www.gd.com' },
    ],
  },
  {
    id: 'drone-uav', label: 'Drone/UAV Services', group: 'Aerospace & Defense',
    businesses: [
      { name: 'DJI', url: 'https://www.dji.com' },
      { name: 'Skydio', url: 'https://www.skydio.com' },
    ],
  },
  {
    id: 'space-satellite', label: 'Space & Satellite', group: 'Aerospace & Defense',
    businesses: [
      { name: 'SpaceX', url: 'https://www.spacex.com' },
      { name: 'Blue Origin', url: 'https://www.blueorigin.com' },
      { name: 'Iridium', url: 'https://www.iridium.com' },
    ],
  },
  {
    id: 'aircraft-mro', label: 'Aircraft Maintenance & Repair (MRO)', group: 'Aerospace & Defense',
    businesses: [
      { name: 'AAR Corp', url: 'https://www.aarcorp.com' },
      { name: 'StandardAero', url: 'https://www.standardaero.com' },
    ],
  },
  {
    id: 'flight-training', label: 'Flight Training Schools', group: 'Aerospace & Defense',
    businesses: [
      { name: 'ATP Flight School', url: 'https://www.atpflightschool.com' },
      { name: 'CAE', url: 'https://www.cae.com' },
    ],
  },
  {
    id: 'aircraft-charter', label: 'Aircraft Charter & Leasing', group: 'Aerospace & Defense',
    businesses: [
      { name: 'NetJets', url: 'https://www.netjets.com' },
      { name: 'VistaJet', url: 'https://www.vistajet.com' },
    ],
  },

  // ==================== PHARMACEUTICALS & BIOTECH ====================
  {
    id: 'pharma-manufacturing', label: 'Pharmaceutical Manufacturing', group: 'Pharmaceuticals & Biotech',
    businesses: [
      { name: 'Pfizer', url: 'https://www.pfizer.com' },
      { name: 'Johnson & Johnson', url: 'https://www.jnj.com' },
      { name: 'Merck', url: 'https://www.merck.com' },
    ],
  },
  {
    id: 'biotech-rd', label: 'Biotech Research & Development', group: 'Pharmaceuticals & Biotech',
    businesses: [
      { name: 'Amgen', url: 'https://www.amgen.com' },
      { name: 'Genentech', url: 'https://www.gene.com' },
      { name: 'Moderna', url: 'https://www.modernatx.com' },
    ],
  },
  {
    id: 'medical-devices', label: 'Medical Devices', group: 'Pharmaceuticals & Biotech',
    businesses: [
      { name: 'Medtronic', url: 'https://www.medtronic.com' },
      { name: 'Boston Scientific', url: 'https://www.bostonscientific.com' },
      { name: 'Abbott', url: 'https://www.abbott.com' },
    ],
  },
  {
    id: 'clinical-trials', label: 'Clinical Trials & CRO', group: 'Pharmaceuticals & Biotech',
    businesses: [
      { name: 'IQVIA', url: 'https://www.iqvia.com' },
      { name: 'Parexel', url: 'https://www.parexel.com' },
    ],
  },
  {
    id: 'diagnostic-labs', label: 'Diagnostic Labs', group: 'Pharmaceuticals & Biotech',
    businesses: [
      { name: 'Quest Diagnostics', url: 'https://www.questdiagnostics.com' },
      { name: 'LabCorp', url: 'https://www.labcorp.com' },
    ],
  },
  {
    id: 'genomics', label: 'Genomics & Genetic Testing', group: 'Pharmaceuticals & Biotech',
    businesses: [
      { name: '23andMe', url: 'https://www.23andme.com' },
      { name: 'Illumina', url: 'https://www.illumina.com' },
    ],
  },
  {
    id: 'nutraceuticals', label: 'Nutraceuticals & Supplements', group: 'Pharmaceuticals & Biotech',
    businesses: [
      { name: 'GNC', url: 'https://www.gnc.com' },
      { name: 'Vitamin Shoppe', url: 'https://www.vitaminshoppe.com' },
    ],
  },
  {
    id: 'telemedicine', label: 'Telemedicine & Digital Health', group: 'Pharmaceuticals & Biotech',
    businesses: [
      { name: 'Teladoc', url: 'https://www.teladochealth.com' },
      { name: 'Amwell', url: 'https://amwell.com' },
    ],
  },

  // ==================== ENTERTAINMENT & RECREATION ====================
  {
    id: 'amusement-parks', label: 'Amusement Parks & Arcades', group: 'Entertainment & Recreation',
    businesses: [
      { name: 'Six Flags', url: 'https://www.sixflags.com' },
      { name: 'Cedar Fair', url: 'https://www.cedarfair.com' },
    ],
  },
  {
    id: 'bowling-alleys', label: 'Bowling Alleys', group: 'Entertainment & Recreation',
    businesses: [
      { name: 'Bowlero', url: 'https://www.bowlero.com' },
      { name: 'AMF Bowling', url: 'https://www.amf.com' },
    ],
  },
  {
    id: 'escape-rooms', label: 'Escape Rooms', group: 'Entertainment & Recreation',
    businesses: [
      { name: 'Escape the Room', url: 'https://www.escapetheroom.com' },
      { name: 'The Escape Game', url: 'https://theescapegame.com' },
    ],
  },
  {
    id: 'trampoline-parks', label: 'Trampoline Parks', group: 'Entertainment & Recreation',
    businesses: [
      { name: 'Sky Zone', url: 'https://www.skyzone.com' },
      { name: 'Altitude', url: 'https://www.altitudetrampolinepark.com' },
    ],
  },
  {
    id: 'golf-courses', label: 'Golf Courses & Country Clubs', group: 'Entertainment & Recreation',
    businesses: [
      { name: 'Topgolf', url: 'https://www.topgolf.com' },
      { name: 'PGA Tour', url: 'https://www.pgatour.com' },
    ],
  },
  {
    id: 'ski-resorts', label: 'Ski Resorts & Winter Sports', group: 'Entertainment & Recreation',
    businesses: [
      { name: 'Vail Resorts', url: 'https://www.vailresorts.com' },
      { name: 'Aspen Skiing', url: 'https://www.aspensnowmass.com' },
    ],
  },
  {
    id: 'water-parks', label: 'Water Parks & Aquatic Centers', group: 'Entertainment & Recreation',
    businesses: [
      { name: 'Great Wolf Lodge', url: 'https://www.greatwolf.com' },
      { name: 'Aquatica', url: 'https://www.aquatica.com' },
    ],
  },
  {
    id: 'fishing-hunting', label: 'Fishing & Hunting Charters', group: 'Entertainment & Recreation',
    businesses: [
      { name: 'Bass Pro Shops', url: 'https://www.basspro.com' },
      { name: 'Cabelas', url: 'https://www.cabelas.com' },
    ],
  },

  // ==================== CLEANING & JANITORIAL ====================
  {
    id: 'residential-cleaning', label: 'Residential Cleaning Services', group: 'Cleaning & Janitorial',
    businesses: [
      { name: 'Molly Maid', url: 'https://www.mollymaid.com' },
      { name: 'The Maids', url: 'https://www.maids.com' },
      { name: 'MaidPro', url: 'https://www.maidpro.com' },
    ],
  },
  {
    id: 'commercial-janitorial', label: 'Commercial Janitorial', group: 'Cleaning & Janitorial',
    businesses: [
      { name: 'ABM Industries', url: 'https://www.abm.com' },
      { name: 'ServiceMaster Clean', url: 'https://www.servicemasterclean.com' },
    ],
  },
  {
    id: 'window-cleaning', label: 'Window Cleaning', group: 'Cleaning & Janitorial',
    businesses: [
      { name: 'Fish Window Cleaning', url: 'https://www.fishwindowcleaning.com' },
      { name: 'Window Genie', url: 'https://www.windowgenie.com' },
    ],
  },
  {
    id: 'pressure-washing', label: 'Pressure Washing & Power Washing', group: 'Cleaning & Janitorial',
    businesses: [
      { name: 'ProShine Power Washing', url: 'https://proshinepowerwashing.com' },
    ],
  },
  {
    id: 'post-construction-cleaning', label: 'Post-Construction Cleaning', group: 'Cleaning & Janitorial',
    businesses: [
      { name: 'ServiceMaster Recovery', url: 'https://www.servicemasterrecovery.com' },
      { name: 'PuroClean', url: 'https://www.puroclean.com' },
    ],
  },
  {
    id: 'duct-hvac-cleaning', label: 'Duct & HVAC Cleaning', group: 'Cleaning & Janitorial',
    businesses: [
      { name: 'Stanley Steemer', url: 'https://www.stanleysteemer.com' },
      { name: 'DUCTZ', url: 'https://www.ductz.com' },
    ],
  },
  {
    id: 'crime-scene-cleanup', label: 'Crime Scene & Trauma Cleanup', group: 'Cleaning & Janitorial',
    businesses: [
      { name: 'Aftermath', url: 'https://www.aftermath.com' },
      { name: 'Bio-One', url: 'https://www.bioone.com' },
    ],
  },

  // ==================== FASHION & APPAREL ====================
  {
    id: 'clothing-brands', label: 'Clothing Brands & Designers', group: 'Fashion & Apparel',
    businesses: [
      { name: 'Ralph Lauren', url: 'https://www.ralphlauren.com' },
      { name: 'Calvin Klein', url: 'https://www.calvinklein.com' },
      { name: 'Tommy Hilfiger', url: 'https://usa.tommy.com' },
    ],
  },
  {
    id: 'activewear', label: 'Activewear & Sportswear', group: 'Fashion & Apparel',
    businesses: [
      { name: 'Lululemon', url: 'https://www.lululemon.com' },
      { name: 'Nike', url: 'https://www.nike.com' },
      { name: 'Under Armour', url: 'https://www.underarmour.com' },
    ],
  },
  {
    id: 'formalwear-suits', label: 'Formalwear & Suits', group: 'Fashion & Apparel',
    businesses: [
      { name: "Men's Wearhouse", url: 'https://menswearhouse.com' },
      { name: 'Jos. A. Bank', url: 'https://www.josbank.com' },
    ],
  },
  {
    id: 'streetwear', label: 'Streetwear & Urban', group: 'Fashion & Apparel',
    businesses: [
      { name: 'Supreme', url: 'https://www.supremenewyork.com' },
      { name: 'Stussy', url: 'https://www.stussy.com' },
    ],
  },
  {
    id: 'vintage-thrift', label: 'Vintage & Thrift', group: 'Fashion & Apparel',
    businesses: [
      { name: 'Goodwill', url: 'https://www.goodwill.org' },
      { name: 'ThredUp', url: 'https://www.thredup.com' },
    ],
  },
  {
    id: 'workwear-uniforms', label: 'Workwear & Uniforms', group: 'Fashion & Apparel',
    businesses: [
      { name: 'Carhartt', url: 'https://www.carhartt.com' },
      { name: 'Dickies', url: 'https://www.dickies.com' },
      { name: 'Cintas', url: 'https://www.cintas.com' },
    ],
  },

  // ==================== JEWELRY & ACCESSORIES ====================
  {
    id: 'fine-jewelry', label: 'Fine Jewelry', group: 'Jewelry & Accessories',
    businesses: [
      { name: 'Tiffany & Co.', url: 'https://www.tiffany.com' },
      { name: 'Cartier', url: 'https://www.cartier.com' },
    ],
  },
  {
    id: 'watches', label: 'Watches', group: 'Jewelry & Accessories',
    businesses: [
      { name: 'Rolex', url: 'https://www.rolex.com' },
      { name: 'Omega', url: 'https://www.omegawatches.com' },
      { name: 'Fossil', url: 'https://www.fossil.com' },
    ],
  },
  {
    id: 'engagement-bridal-jewelry', label: 'Engagement & Bridal Jewelry', group: 'Jewelry & Accessories',
    businesses: [
      { name: 'Blue Nile', url: 'https://www.bluenile.com' },
      { name: 'Brilliant Earth', url: 'https://www.brilliantearth.com' },
    ],
  },
  {
    id: 'custom-jewelry', label: 'Custom Jewelry Design', group: 'Jewelry & Accessories',
    businesses: [
      { name: 'CustomMade', url: 'https://www.custommade.com' },
      { name: 'Gemvara', url: 'https://www.gemvara.com' },
    ],
  },
  {
    id: 'eyewear-sunglasses', label: 'Eyewear & Sunglasses', group: 'Jewelry & Accessories',
    businesses: [
      { name: 'Warby Parker', url: 'https://www.warbyparker.com' },
      { name: 'Ray-Ban', url: 'https://www.ray-ban.com' },
    ],
  },
  {
    id: 'handbags-leather-goods', label: 'Handbags & Leather Goods', group: 'Jewelry & Accessories',
    businesses: [
      { name: 'Coach', url: 'https://www.coach.com' },
      { name: 'Michael Kors', url: 'https://www.michaelkors.com' },
    ],
  },

  // ==================== GOVERNMENT & PUBLIC SERVICES ====================
  {
    id: 'municipal-government', label: 'Municipal/Government Offices', group: 'Government & Public Services',
    businesses: [
      { name: 'USA.gov', url: 'https://www.usa.gov' },
      { name: 'Gov.uk', url: 'https://www.gov.uk' },
    ],
  },
  {
    id: 'public-safety', label: 'Public Safety & Emergency Services', group: 'Government & Public Services',
    businesses: [
      { name: 'FEMA', url: 'https://www.fema.gov' },
      { name: 'Ready.gov', url: 'https://www.ready.gov' },
    ],
  },
  {
    id: 'postal-services', label: 'Postal Services', group: 'Government & Public Services',
    businesses: [
      { name: 'USPS', url: 'https://www.usps.com' },
    ],
  },
  {
    id: 'public-works', label: 'Public Works & Infrastructure', group: 'Government & Public Services',
    businesses: [
      { name: 'FHWA', url: 'https://www.fhwa.dot.gov' },
      { name: 'APWA', url: 'https://www.apwa.org' },
    ],
  },
  {
    id: 'libraries', label: 'Libraries', group: 'Government & Public Services',
    businesses: [
      { name: 'Library of Congress', url: 'https://www.loc.gov' },
      { name: 'ALA', url: 'https://www.ala.org' },
    ],
  },
  {
    id: 'public-transportation', label: 'Public Transportation', group: 'Government & Public Services',
    businesses: [
      { name: 'MTA', url: 'https://new.mta.info' },
      { name: 'Amtrak', url: 'https://www.amtrak.com' },
    ],
  },

  // ==================== ARTS & CRAFTS ====================
  {
    id: 'art-galleries-dealers', label: 'Art Galleries & Dealers', group: 'Arts & Crafts',
    businesses: [
      { name: 'Saatchi Art', url: 'https://www.saatchiart.com' },
      { name: 'Artsy', url: 'https://www.artsy.net' },
    ],
  },
  {
    id: 'craft-supplies', label: 'Craft Supplies & Materials', group: 'Arts & Crafts',
    businesses: [
      { name: 'Michaels', url: 'https://www.michaels.com' },
      { name: 'Joann', url: 'https://www.joann.com' },
    ],
  },
  {
    id: 'pottery-ceramics', label: 'Pottery & Ceramics Studios', group: 'Arts & Crafts',
    businesses: [
      { name: 'Color Me Mine', url: 'https://www.colormemine.com' },
      { name: 'Paint Nite', url: 'https://www.paintnite.com' },
    ],
  },
  {
    id: 'woodworking-crafts', label: 'Woodworking & Carpentry Crafts', group: 'Arts & Crafts',
    businesses: [
      { name: 'Rockler', url: 'https://www.rockler.com' },
      { name: 'Woodcraft', url: 'https://www.woodcraft.com' },
    ],
  },

  // ==================== FUNERAL & CEMETERY SERVICES ====================
  {
    id: 'funeral-homes', label: 'Funeral Homes & Services', group: 'Funeral & Cemetery Services',
    businesses: [
      { name: 'Service Corporation International', url: 'https://www.sci-corp.com' },
      { name: 'Dignity Memorial', url: 'https://www.dignitymemorial.com' },
    ],
  },
  {
    id: 'cremation-services', label: 'Cremation Services', group: 'Funeral & Cemetery Services',
    businesses: [
      { name: 'Neptune Society', url: 'https://www.neptunesociety.com' },
      { name: 'Trident Society', url: 'https://www.tridentsociety.com' },
    ],
  },
  {
    id: 'cemetery-services', label: 'Cemetery & Burial Services', group: 'Funeral & Cemetery Services',
    businesses: [
      { name: 'StoneMor', url: 'https://www.stonemor.com' },
      { name: 'Park Lawn', url: 'https://www.parklawn.com' },
    ],
  },
  {
    id: 'monument-headstone', label: 'Monument & Headstone', group: 'Funeral & Cemetery Services',
    businesses: [
      { name: 'Granite Industries', url: 'https://www.graniteind.com' },
      { name: 'Milano Monuments', url: 'https://www.milanomonuments.com' },
    ],
  },

  // ==================== CHILDREN & FAMILY SERVICES ====================
  {
    id: 'after-school-programs', label: 'After-School Programs', group: 'Children & Family Services',
    businesses: [
      { name: 'YMCA', url: 'https://www.ymca.org' },
      { name: 'Boys & Girls Clubs', url: 'https://www.bgca.org' },
    ],
  },
  {
    id: 'nanny-agencies', label: 'Nanny & Au Pair Agencies', group: 'Children & Family Services',
    businesses: [
      { name: 'Care.com', url: 'https://www.care.com' },
      { name: 'AuPairCare', url: 'https://www.aupaircare.com' },
    ],
  },
  {
    id: 'babysitting-services', label: 'Babysitting Services', group: 'Children & Family Services',
    businesses: [
      { name: 'Sittercity', url: 'https://www.sittercity.com' },
      { name: 'UrbanSitter', url: 'https://www.urbansitter.com' },
    ],
  },
];