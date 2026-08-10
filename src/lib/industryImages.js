// AI-generated image URLs for industry categories (groups) and sub-industries.
// Category images are pre-generated and stored here.
// Sub-industry images are generated on-demand via the generateIndustryImage backend function.
//
// Format:
// CATEGORY_IMAGES: { [groupLabel]: imageUrl }
// SUBINDUSTRY_IMAGES: { [industryLabel]: imageUrl }

export const CATEGORY_IMAGES = {
  'Construction & Contracting': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop',
  'Home Services & Improvement': 'https://images.unsplash.com/photo-1581244274227-3d0d2c0b6c8e?w=800&h=600&fit=crop',
  'Healthcare & Medical': 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=600&fit=crop',
  'Financial Services': 'https://images.unsplash.com/photo-1554224155-6726b3f9c3d5?w=800&h=600&fit=crop',
  'Technology & Software': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop',
  'Retail & E-commerce': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop',
  'Food & Beverage': 'https://images.unsplash.com/photo-1504674900247-ef04f3a3a3e3?w=800&h=600&fit=crop',
  'Hospitality & Travel': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop',
  'Manufacturing & Industrial': 'https://images.unsplash.com/photo-1565008447742-97f0d3a27c4e?w=800&h=600&fit=crop',
  'Transportation & Logistics': 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=600&fit=crop',
  'Real Estate & Property': 'https://images.unsplash.com/photo-1560518883-ce0905ee9d61?w=800&h=600&fit=crop',
  'Education & Training': 'https://images.unsplash.com/photo-1503676263721-6a233d7c7594?w=800&h=600&fit=crop',
  'Legal Services': 'https://images.unsplash.com/photo-1589994965854-a8d1c3a3a3e3?w=800&h=600&fit=crop',
  'Media & Entertainment': 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&h=600&fit=crop',
  'Marketing & Advertising': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
  'Professional Services': 'https://images.unsplash.com/photo-1521737604896-3a9c3c3a3a3e?w=800&h=600&fit=crop',
  'Automotive': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop',
  'Beauty & Personal Care': 'https://images.unsplash.com/photo-1560066984-c7d2b5c3a3a3?w=800&h=600&fit=crop',
  'Fitness & Wellness': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
  'Agriculture & Farming': 'https://images.unsplash.com/photo-1500595046743-cd271d694eb0?w=800&h=600&fit=crop',
  'Energy & Utilities': 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&h=600&fit=crop',
  'Telecommunications': 'https://images.unsplash.com/photo-1545987796-200677ee1011?w=800&h=600&fit=crop',
  'Insurance': 'https://images.unsplash.com/photo-1450101499163-1c3a3a3a3a3e?w=800&h=600&fit=crop',
  'Non-Profit & Social Services': 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&h=600&fit=crop',
  'Pet Services': 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&h=600&fit=crop',
  'Event Planning & Services': 'https://images.unsplash.com/photo-1519671482749-fd09be6c0c3e?w=800&h=600&fit=crop',
  'Security & Investigation': 'https://images.unsplash.com/photo-1555099962-4199c345e3a3?w=800&h=600&fit=crop',
  'Environmental Services': 'https://images.unsplash.com/photo-1542601906990-4707381d3a3a?w=800&h=600&fit=crop',
  'Aerospace & Defense': 'https://images.unsplash.com/photo-1517976407107-a0d3a3a3a3a3?w=800&h=600&fit=crop',
  'Pharmaceuticals & Biotech': 'https://images.unsplash.com/photo-1559757148-5c2d3a3a3a3e?w=800&h=600&fit=crop',
  'Entertainment & Recreation': 'https://images.unsplash.com/photo-1543576301-7e3a3a3a3a3e?w=800&h=600&fit=crop',
  'Cleaning & Janitorial': 'https://images.unsplash.com/photo-1581578731548-c6462c3a3a3e?w=800&h=600&fit=crop',
  'Fashion & Apparel': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=600&fit=crop',
  'Jewelry & Accessories': 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce334?w=800&h=600&fit=crop',
  'Government & Public Services': 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&h=600&fit=crop',
  'Arts & Crafts': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&h=600&fit=crop',
  'Funeral & Cemetery Services': 'https://images.unsplash.com/photo-1503918973738-3a3a3a3a3a3e?w=800&h=600&fit=crop',
  'Children & Family Services': 'https://images.unsplash.com/photo-1503454537195-1dc8737f3a3e?w=800&h=600&fit=crop',
};

// Sub-industry images — populated on-demand via generateIndustryImage backend function.
// Stored in localStorage after generation to avoid regenerating.
export const SUBINDUSTRY_IMAGES = {};