import { COLOR_DATA } from '../../base44/shared/colorData';

// 6 coating systems — even grid, each maps to a color chart in the visualizer package
export const COATING_SYSTEMS = [
  { id: 'flake', name: 'Full Chip System', desc: 'Most popular — decorative 3-layer chip system, installed in a day, back on floor in 24hrs', image: 'https://garageforce.com/wp-content/uploads/2022/11/square-full-chip.png', systemKey: 'flake' },
  { id: 'metallic', name: 'Metallic System', desc: 'Pearlescent metallic look — flowing, luxurious, like liquid metal or natural marble', image: 'https://garageforce.com/wp-content/uploads/2024/02/Metallic-Empty-Store.png', systemKey: 'metallic' },
  { id: 'solid', name: 'Solid Color System', desc: 'Rich, vibrant direct-to-concrete coating with cyclo-aliphatic hybrid properties', image: 'https://garageforce.com/wp-content/uploads/2024/02/Solid-Color-Pallet-Jack.png', systemKey: 'solid' },
  { id: 'quartz', name: 'Quartz System', desc: 'Extreme abrasion resistance with textured finish — meets OSHA slip requirements', image: 'https://garageforce.com/wp-content/uploads/2024/02/Quartz-Fork-Lift.png', systemKey: 'quartz' },
  { id: 'glitter', name: 'Glitter System', desc: 'Sparkling decorative finish — metallic glitter broadcast into clear epoxy or polyaspartic topcoat', image: 'https://garageforce.com/wp-content/uploads/2022/11/garageforce-45.jpg', systemKey: 'glitter' },
  { id: 'polished', name: 'Polished Concrete', desc: 'Mechanically ground and densified concrete polished to a refined sheen — no coating, minimal maintenance', image: 'https://garageforce.com/wp-content/uploads/2022/11/garageforce-13.jpg', systemKey: 'dye_stain' }
];

export const GALLERY_IMAGES = [
  'https://garageforce.com/wp-content/uploads/2022/11/garageforce-42.jpg',
  'https://garageforce.com/wp-content/uploads/2022/11/garageforce-41.jpg',
  'https://garageforce.com/wp-content/uploads/2022/11/garageforce-40.jpg',
  'https://garageforce.com/wp-content/uploads/2022/11/garageforce-46.jpg',
  'https://garageforce.com/wp-content/uploads/2022/11/garageforce-45.jpg',
  'https://garageforce.com/wp-content/uploads/2022/11/garageforce-13.jpg'
];

// Get colors from the visualizer package's COLOR_DATA, filtered by system
export function getColorsBySystem(systemKey) {
  return COLOR_DATA.filter(c => c.system === systemKey && c.in_stock);
}