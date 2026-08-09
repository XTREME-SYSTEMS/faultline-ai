import { COLOR_DATA } from '../../base44/shared/colorData';

// 6 coating systems for Epoxy Garage Floors Near You
export const COATING_SYSTEMS = [
  { id: 'flake', name: 'Full Chip System', desc: 'The Full Chip, or Decorative Chip, System is our most popular concrete coating system. This three-layer system is easy to install in as little as a day and you\'ll be back on your floor in just 24 hours!', image: 'https://garageforce.com/wp-content/uploads/2022/11/square-full-chip.png', systemKey: 'flake' },
  { id: 'medici', name: 'XPS Signature System', desc: 'The XPS Signature Polyurea Coating System creates a custom, decorative finish that will outlast any other acrylic or acid stain system on the market. This system is easy to maintain without waxing or re-coating.', image: 'https://garageforce.com/wp-content/uploads/2022/11/garageforce-41.jpg', systemKey: 'flake' },
  { id: 'metallic', name: 'Metallic System', desc: 'The pearlescent Metallic Coating System is a durable, high-end flooring system that uses metallic powder tints to create a flowing, metallic look. Tough and luxurious, the Metallic System gives the appearance of movement and variation, similar to liquid metal or natural marble.', image: 'https://garageforce.com/wp-content/uploads/2024/02/Metallic-Empty-Store.png', systemKey: 'metallic' },
  { id: 'solid', name: 'Solid Color System', desc: 'The Solid Color Concrete Coating System is an incredibly durable flooring option that provides rich, vibrant colors. This direct-to-concrete coating system is made of cyclo-aliphatic hybrid properties.', image: 'https://garageforce.com/wp-content/uploads/2024/02/Solid-Color-Pallet-Jack.png', systemKey: 'solid' },
  { id: 'quartz', name: 'Quartz System', desc: 'The Quartz Concrete Coating System is a super durable concrete coating that offers extreme abrasion resistance and a rough texture that conforms to all Occupational Safety and Health Administration (OSHA) slip requirements.', image: 'https://garageforce.com/wp-content/uploads/2024/02/Quartz-Fork-Lift.png', systemKey: 'quartz' },
  { id: 'polished', name: 'Polished Concrete', desc: 'Mechanically ground and densified concrete polished to a refined sheen. No coating, minimal maintenance. Can be dyed for color with the Ameripolish® signature palette.', image: 'https://garageforce.com/wp-content/uploads/2022/11/garageforce-13.jpg', systemKey: 'dye_stain' }
];

export const GALLERY_IMAGES = [
  'https://garageforce.com/wp-content/uploads/2022/11/garageforce-42.jpg',
  'https://garageforce.com/wp-content/uploads/2022/11/garageforce-41.jpg',
  'https://garageforce.com/wp-content/uploads/2022/11/garageforce-40.jpg',
  'https://garageforce.com/wp-content/uploads/2022/11/garageforce-46.jpg',
  'https://garageforce.com/wp-content/uploads/2022/11/garageforce-45.jpg',
  'https://garageforce.com/wp-content/uploads/2022/11/garageforce-13.jpg'
];

export const APPLICATIONS = [
  { name: 'Garages', image: 'https://garageforce.com/wp-content/uploads/2022/11/garageforce_0007_Layer-1.png' },
  { name: 'Patios', image: 'https://garageforce.com/wp-content/uploads/2022/11/garageforce_0006_Layer-2.png' },
  { name: 'Shops', image: 'https://garageforce.com/wp-content/uploads/2022/11/garageforce_0005_Layer-3.png' },
  { name: 'Walkways', image: 'https://garageforce.com/wp-content/uploads/2022/11/garageforce_0004_Layer-4.png' },
  { name: 'Commercial', image: 'https://garageforce.com/wp-content/uploads/2022/11/garageforce_0003_Layer-5.png' },
  { name: 'Basements', image: 'https://garageforce.com/wp-content/uploads/2022/11/garageforce_0002_Layer-6.png' },
  { name: 'Pool Decks', image: 'https://garageforce.com/wp-content/uploads/2022/11/garageforce_0001_Layer-7.png' },
  { name: 'Services & Medical', image: 'https://garageforce.com/wp-content/uploads/2022/11/garageforce_0000_Layer-8.png' }
];

export const TESTIMONIALS = [
  { text: "We have a two car garage in an older condo development. We researched various floor treatments for upgrading the appearance and utility of our garage. XPS made the best case for the quality and durability of their process. The bonus was a lifetime warranty that other epoxy vendors were not offering. After a site visit and very reasonable estimate they were able to schedule us for installation. The crew came out precisely at the time scheduled and got to work promptly. The final result is everything promised. Flawlessly installed with enough tooth to the floor to ensure a relatively no-slip surface without losing the gloss.", author: "Beacher2" },
  { text: "From sales to completion, XPS did an excellent job on our garage floor. We are enjoying the finished product, and have peace of mind knowing that the work is covered by a lifetime warranty. Thanks for a job well-done!", author: "Michael Kohen" },
  { text: "Excellent work by XPS. On time, friendly, great work and the results are amazing.", author: "Brian Hunnius" },
  { text: "Our garage floor looks beautiful! Only regret is that we didn't do it sooner! Thank you XPS team!", author: "Nicole Niven" },
  { text: "XPS did an excellent job of communicating with me. They were on time and the results are great.", author: "Mark Nash" },
  { text: "I got quotes from multiple companies before deciding on XPS. One of the main reasons was how responsive our local expert was — he was the only one to consistently respond within 24 hours. His pricing was transparent and up-front. I would use XPS again in the future.", author: "Seth Kinast" }
];

export const SHEEN_OPTIONS = [
  { id: 'matte', name: 'Matte', desc: 'Low reflection, flat finish' },
  { id: 'satin', name: 'Satin', desc: 'Soft sheen, subtle reflection' },
  { id: 'gloss', name: 'Gloss', desc: 'High shine, mirror-like reflection' }
];

export function getColorsBySystem(systemKey) {
  return COLOR_DATA.filter(c => c.system === systemKey && c.in_stock);
}