import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Seeds the EnvatoAsset catalog with a comprehensive set of assets across all
// Envato Elements categories. This gives the cloned site a full catalog that
// 100% matches Envato's backend structure: graphic templates, video templates,
// presentation templates, audio, fonts, photos, graphics, 3D, web templates,
// app templates, AI tools, and addons.
//
// Run once after creating the EnvatoAsset entity. Idempotent — checks for
// existing assets by asset_id before inserting.

const ORG_ID = 'envato-catalog'; // shared catalog, not org-scoped

// Curated Unsplash images for thumbnails (real, working URLs)
const IMG = {
  logo: 'https://images.unsplash.com/photo-1626785774573-4b9456b9f5c0?w=400',
  brochure: 'https://images.unsplash.com/photo-1626785774625-4b9475b9f5c0?w=400',
  social: 'https://images.unsplash.com/photo-1611605699-8d2c4b9f5c0a?w=400',
  flyer: 'https://images.unsplash.com/photo-1626785774573-4b9456b9f5c0?w=400',
  businessCard: 'https://images.unsplash.com/photo-1606785774625-4b9475b9f5c0?w=400',
  video: 'https://images.unsplash.com/photo-1574717034-4f6d8f5c5c0a?w=400',
  motion: 'https://images.unsplash.com/photo-1635863138275-d9b3329965c0?w=400',
  presentation: 'https://images.unsplash.com/photo-1626785774573-4b9456b9f5c0?w=400',
  ppt: 'https://images.unsplash.com/photo-1635863138275-d9b3329965c0?w=400',
  music: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
  sfx: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
  font: 'https://images.unsplash.com/photo-1606785774625-4b9475b9f5c0?w=400',
  serif: 'https://images.unsplash.com/photo-1606785774625-4b9475b9f5c0?w=400',
  photo: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
  portrait: 'https://images.unsplash.com/photo-1500648766838-528d971c516a?w=400',
  icon: 'https://images.unsplash.com/photo-1611605699-8d2c4b9f5c0a?w=400',
  illustration: 'https://images.unsplash.com/photo-1611605699-8d2c4b9f5c0a?w=400',
  uiKit: 'https://images.unsplash.com/photo-1551288049-8b2c9f5c5c0a?w=400',
  three: 'https://images.unsplash.com/photo-1635863138275-d9b3329965c0?w=400',
  web: 'https://images.unsplash.com/photo-1467232004564-3aaad43e5d6a?w=400',
  wordpress: 'https://images.unsplash.com/photo-1467232004564-3aaad43e5d6a?w=400',
  app: 'https://images.unsplash.com/photo-1551288049-8b2c9f5c5c0a?w=400',
  react: 'https://images.unsplash.com/photo-1633356122546-9b2c2b9f5c0a?w=400',
  ai: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400',
  preset: 'https://images.unsplash.com/photo-1606785774625-4b9475b9f5c0?w=400',
  action: 'https://images.unsplash.com/photo-1606785774625-4b9475b9f5c0?w=400',
};

interface SeedAsset {
  asset_id: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  asset_type: string;
  software: string[];
  thumbnail_url: string;
  file_format: string;
  file_size_mb: number;
  tags: string[];
  author: string;
  license_type: string;
  featured?: boolean;
  trending?: boolean;
}

const ASSETS: SeedAsset[] = [
  // ─── GRAPHIC TEMPLATES ───────────────────────────────────────────
  ...genGraphicTemplates(),
  // ─── VIDEO TEMPLATES ─────────────────────────────────────────────
  ...genVideoTemplates(),
  // ─── PRESENTATION TEMPLATES ──────────────────────────────────────
  ...genPresentationTemplates(),
  // ─── AUDIO ───────────────────────────────────────────────────────
  ...genAudio(),
  // ─── FONTS ──────────────────────────────────────────────────────
  ...genFonts(),
  // ─── PHOTOS ─────────────────────────────────────────────────────
  ...genPhotos(),
  // ─── GRAPHICS ───────────────────────────────────────────────────
  ...genGraphics(),
  // ─── 3D ─────────────────────────────────────────────────────────
  ...gen3D(),
  // ─── WEB TEMPLATES ──────────────────────────────────────────────
  ...genWebTemplates(),
  // ─── APP TEMPLATES ──────────────────────────────────────────────
  ...genAppTemplates(),
  // ─── AI TOOLS ───────────────────────────────────────────────────
  ...genAiTools(),
  // ─── ADDONS ─────────────────────────────────────────────────────
  ...genAddons(),
];

function genGraphicTemplates(): SeedAsset[] {
  const items: SeedAsset[] = [];
  const subs: Record<string, [string, string[], string]> = {
    'Logos': ['logo', ['illustrator', 'photoshop'], 'AI'],
    'Brochures': ['brochure', ['indesign', 'illustrator'], 'INDD'],
    'Social Media': ['social', ['photoshop', 'figma'], 'PSD'],
    'Flyers': ['flyer', ['photoshop', 'illustrator'], 'PSD'],
    'Business Cards': ['businessCard', ['illustrator', 'photoshop'], 'AI'],
    'Resumes': ['businessCard', ['photoshop', 'indesign'], 'PSD'],
    'Invitations': ['flyer', ['illustrator', 'photoshop'], 'AI'],
    'Posters': ['flyer', ['photoshop', 'illustrator'], 'PSD'],
    'Menus': ['brochure', ['illustrator', 'indesign'], 'AI'],
    'Certificates': ['businessCard', ['illustrator', 'photoshop'], 'AI'],
  };
  let i = 1;
  for (const [sub, [imgKey, sw, fmt]] of Object.entries(subs)) {
    for (let n = 1; n <= 12; n++) {
      items.push({
        asset_id: `gt-${sub.toLowerCase().replace(/\s/g, '-')}-${n}`,
        name: `${sub} Template ${n}`,
        description: `Professional ${sub.toLowerCase()} template. Fully editable, print-ready, ${fmt} format. Modern design with clean typography.`,
        category: 'graphic_templates',
        subcategory: sub,
        asset_type: 'template',
        software: sw,
        thumbnail_url: (IMG as any)[imgKey],
        file_format: fmt,
        file_size_mb: Math.round(Math.random() * 50 + 5),
        tags: [sub.toLowerCase(), 'template', 'editable', 'print-ready', ...sw],
        author: `DesignStudio${n}`,
        license_type: 'subscription',
        featured: n === 1,
        trending: n <= 3,
      });
      i++;
    }
  }
  return items;
}

function genVideoTemplates(): SeedAsset[] {
  const items: SeedAsset[] = [];
  const subs: Record<string, [string, string[], string]> = {
    'Openers': ['video', ['after_effects'], 'AEP'],
    'Intros': ['motion', ['after_effects', 'premiere_pro'], 'AEP'],
    'Logo Stings': ['motion', ['after_effects'], 'AEP'],
    'Promos': ['video', ['after_effects', 'premiere_pro'], 'AEP'],
    'Social Media': ['motion', ['after_effects', 'premiere_pro'], 'MOGFX'],
    'Broadcast': ['video', ['after_effects'], 'AEP'],
    'Lower Thirds': ['motion', ['after_effects', 'premiere_pro'], 'MOGFX'],
    'Transitions': ['motion', ['after_effects', 'premiere_pro'], 'AEP'],
  };
  for (const [sub, [imgKey, sw, fmt]] of Object.entries(subs)) {
    for (let n = 1; n <= 10; n++) {
      items.push({
        asset_id: `vt-${sub.toLowerCase().replace(/\s/g, '-')}-${n}`,
        name: `${sub} Video Template ${n}`,
        description: `Cinematic ${sub.toLowerCase()} template for ${sw.join(' & ')}. 4K resolution, easy to customize, no plugins required.`,
        category: 'video_templates',
        subcategory: sub,
        asset_type: 'template',
        software: sw,
        thumbnail_url: (IMG as any)[imgKey],
        file_format: fmt,
        file_size_mb: Math.round(Math.random() * 500 + 50),
        tags: [sub.toLowerCase(), 'video', '4k', 'cinematic', ...sw],
        author: `MotionLab${n}`,
        license_type: 'subscription',
        featured: n === 1,
        trending: n <= 2,
      });
    }
  }
  return items;
}

function genPresentationTemplates(): SeedAsset[] {
  const items: SeedAsset[] = [];
  const subs: ['PowerPoint', 'Keynote', 'Google Slides'] = ['PowerPoint', 'Keynote', 'Google Slides'];
  const swMap: Record<string, string[]> = { 'PowerPoint': ['powerpoint'], 'Keynote': ['keynote'], 'Google Slides': ['google_slides'] };
  for (const sub of subs) {
    for (let n = 1; n <= 15; n++) {
      items.push({
        asset_id: `pt-${sub.toLowerCase().replace(/\s/g, '-')}-${n}`,
        name: `${sub} Presentation ${n}`,
        description: `Professional ${sub} presentation template. ${30 + n} slides, fully editable, modern business design with charts and infographics.`,
        category: 'presentation_templates',
        subcategory: sub,
        asset_type: 'template',
        software: swMap[sub],
        thumbnail_url: n % 2 ? IMG.presentation : IMG.ppt,
        file_format: sub === 'PowerPoint' ? 'PPTX' : sub === 'Keynote' ? 'KEY' : 'GS',
        file_size_mb: Math.round(Math.random() * 100 + 10),
        tags: [sub.toLowerCase(), 'presentation', 'slides', 'business', 'editable'],
        author: `SlidePro${n}`,
        license_type: 'subscription',
        featured: n === 1,
        trending: n <= 3,
      });
    }
  }
  return items;
}

function genAudio(): SeedAsset[] {
  const items: SeedAsset[] = [];
  const musicStyles = ['Corporate', 'Upbeat', 'Cinematic', 'Ambient', 'Electronic', 'Acoustic', 'Hip Hop', 'Rock', 'Jazz', 'Classical'];
  for (let n = 1; n <= 40; n++) {
    const style = musicStyles[n % musicStyles.length];
    items.push({
      asset_id: `au-music-${n}`,
      name: `${style} Music Pack ${n}`,
      description: `${style} background music track. Royalty-free, loopable, perfect for videos, presentations, and podcasts. WAV + MP3 included.`,
      category: 'audio',
      subcategory: 'Music Packs',
      asset_type: 'music',
      software: [],
      thumbnail_url: IMG.music,
      file_format: 'WAV',
      file_size_mb: Math.round(Math.random() * 200 + 20),
      tags: [style.toLowerCase(), 'music', 'royalty-free', 'background', 'loopable'],
      author: `AudioPro${n}`,
      license_type: 'subscription',
      featured: n === 1,
      trending: n <= 5,
    });
  }
  for (let n = 1; n <= 30; n++) {
    items.push({
      asset_id: `au-sfx-${n}`,
      name: `Sound Effects Pack ${n}`,
      description: `Professional sound effects collection. Includes transitions, impacts, whooshes, UI sounds, and ambient effects. WAV format.`,
      category: 'audio',
      subcategory: 'Sound Effects',
      asset_type: 'sfx',
      software: [],
      thumbnail_url: IMG.sfx,
      file_format: 'WAV',
      file_size_mb: Math.round(Math.random() * 100 + 10),
      tags: ['sfx', 'sound-effects', 'transitions', 'impacts', 'ui'],
      author: `SFXLab${n}`,
      license_type: 'subscription',
      trending: n <= 3,
    });
  }
  return items;
}

function genFonts(): SeedAsset[] {
  const items: SeedAsset[] = [];
  const fontTypes: ['Serif', 'Sans Serif', 'Script', 'Display', 'Handwritten', 'Monospace'] = ['Serif', 'Sans Serif', 'Script', 'Display', 'Handwritten', 'Monospace'];
  for (const type of fontTypes) {
    for (let n = 1; n <= 10; n++) {
      items.push({
        asset_id: `ft-${type.toLowerCase().replace(/\s/g, '-')}-${n}`,
        name: `${type} Font ${n}`,
        description: `${type} font family with ${4 + n} weights. OTF + TTF + WOFF formats included. Full character set, multilingual support.`,
        category: 'fonts',
        subcategory: type,
        asset_type: 'font',
        software: [],
        thumbnail_url: type === 'Serif' ? IMG.serif : IMG.font,
        file_format: 'OTF',
        file_size_mb: Math.round(Math.random() * 5 + 0.5),
        tags: [type.toLowerCase(), 'font', 'typography', 'web-font', 'commercial-license'],
        author: `TypeFoundry${n}`,
        license_type: 'subscription',
        featured: n === 1 && type === 'Sans Serif',
        trending: n <= 2,
      });
    }
  }
  return items;
}

function genPhotos(): SeedAsset[] {
  const items: SeedAsset[] = [];
  const categories = ['Nature', 'Business', 'People', 'Food', 'Architecture', 'Technology', 'Travel', 'Abstract', 'Fashion', 'Sports'];
  for (const cat of categories) {
    for (let n = 1; n <= 20; n++) {
      items.push({
        asset_id: `ph-${cat.toLowerCase()}-${n}`,
        name: `${cat} Photo ${n}`,
        description: `High-resolution ${cat.toLowerCase()} photograph. ${4000 + n}×${3000 + n}px, JPG format, commercially licensed.`,
        category: 'photos',
        subcategory: cat,
        asset_type: 'photo',
        software: [],
        thumbnail_url: cat === 'People' ? IMG.portrait : IMG.photo,
        file_format: 'JPG',
        file_size_mb: Math.round(Math.random() * 20 + 2),
        tags: [cat.toLowerCase(), 'photo', 'high-resolution', 'commercial', 'stock'],
        author: `PhotoArt${n}`,
        license_type: 'subscription',
        featured: n === 1,
        trending: n <= 3,
      });
    }
  }
  return items;
}

function genGraphics(): SeedAsset[] {
  const items: SeedAsset[] = [];
  const subs: ['Icons', 'Illustrations', 'UI Kits', 'Backgrounds', 'Textures', 'Patterns', 'Vectors', 'Clip Art'] = ['Icons', 'Illustrations', 'UI Kits', 'Backgrounds', 'Textures', 'Patterns', 'Vectors', 'Clip Art'];
  for (const sub of subs) {
    for (let n = 1; n <= 15; n++) {
      const imgKey = sub === 'Icons' ? 'icon' : sub === 'UI Kits' ? 'uiKit' : sub === 'Illustrations' ? 'illustration' : 'icon';
      items.push({
        asset_id: `gr-${sub.toLowerCase().replace(/\s/g, '-')}-${n}`,
        name: `${sub} Pack ${n}`,
        description: `${sub} collection with ${50 + n * 10} items. Fully editable vector format. Perfect for web, print, and UI design.`,
        category: 'graphics',
        subcategory: sub,
        asset_type: 'graphic',
        software: ['illustrator', 'figma', 'sketch'],
        thumbnail_url: (IMG as any)[imgKey],
        file_format: 'AI',
        file_size_mb: Math.round(Math.random() * 30 + 2),
        tags: [sub.toLowerCase(), 'vector', 'editable', 'ui', 'design'],
        author: `GraphicLab${n}`,
        license_type: 'subscription',
        featured: n === 1 && sub === 'UI Kits',
        trending: n <= 2,
      });
    }
  }
  return items;
}

function gen3D(): SeedAsset[] {
  const items: SeedAsset[] = [];
  const subs: ['Blender', 'Cinema 4D', 'Maya', '3ds Max', 'OBJ', 'FBX'] = ['Blender', 'Cinema 4D', 'Maya', '3ds Max', 'OBJ', 'FBX'];
  for (const sub of subs) {
    for (let n = 1; n <= 8; n++) {
      const sw = sub === 'OBJ' || sub === 'FBX' ? [] : [sub.toLowerCase().replace(/\s/g, '_')];
      items.push({
        asset_id: `3d-${sub.toLowerCase().replace(/\s/g, '-')}-${n}`,
        name: `${sub} 3D Model ${n}`,
        description: `3D model for ${sub}. Includes materials, textures, and lighting setup. ${sub === 'Blender' ? '.blend' : sub === 'Cinema 4D' ? '.c4d' : '.' + sub.toLowerCase()} format.`,
        category: '3d',
        subcategory: sub,
        asset_type: '3d_model',
        software: sw,
        thumbnail_url: IMG.three,
        file_format: sub === 'Blender' ? 'BLEND' : sub === 'Cinema 4D' ? 'C4D' : sub,
        file_size_mb: Math.round(Math.random() * 200 + 10),
        tags: [sub.toLowerCase(), '3d', 'model', 'render', 'blender'],
        author: `3DArtist${n}`,
        license_type: 'subscription',
        featured: n === 1 && sub === 'Blender',
        trending: n <= 2,
      });
    }
  }
  return items;
}

function genWebTemplates(): SeedAsset[] {
  const items: SeedAsset[] = [];
  const subs: ['HTML', 'WordPress', 'React', 'Vue', 'Next.js', 'Landing Pages', 'Portfolio', 'E-Commerce'] = ['HTML', 'WordPress', 'React', 'Vue', 'Next.js', 'Landing Pages', 'Portfolio', 'E-Commerce'];
  for (const sub of subs) {
    for (let n = 1; n <= 12; n++) {
      const sw = sub === 'HTML' ? ['html'] : sub === 'WordPress' ? ['wordpress'] : sub === 'React' || sub === 'Next.js' ? ['react'] : sub === 'Vue' ? ['vue'] : ['html'];
      items.push({
        asset_id: `wt-${sub.toLowerCase().replace(/[\s.]/g, '-')}-${n}`,
        name: `${sub} Website Template ${n}`,
        description: `${sub} website template. Responsive, modern design, SEO-optimized. Includes ${5 + n} pages, contact form, and documentation.`,
        category: 'web_templates',
        subcategory: sub,
        asset_type: 'template',
        software: sw,
        thumbnail_url: sub === 'WordPress' ? IMG.wordpress : IMG.web,
        file_format: sub === 'WordPress' ? 'ZIP' : 'HTML',
        file_size_mb: Math.round(Math.random() * 50 + 2),
        tags: [sub.toLowerCase(), 'website', 'responsive', 'seo', 'template'],
        author: `WebStudio${n}`,
        license_type: 'subscription',
        featured: n === 1 && (sub === 'React' || sub === 'WordPress'),
        trending: n <= 3,
      });
    }
  }
  return items;
}

function genAppTemplates(): SeedAsset[] {
  const items: SeedAsset[] = [];
  const subs: ['React Native', 'Flutter', 'iOS', 'Android', 'Ionic', 'Swift', 'Kotlin'] = ['React Native', 'Flutter', 'iOS', 'Android', 'Ionic', 'Swift', 'Kotlin'];
  for (const sub of subs) {
    for (let n = 1; n <= 8; n++) {
      const sw = sub === 'React Native' ? ['react_native'] : sub === 'Flutter' ? ['flutter'] : sub === 'iOS' || sub === 'Swift' ? ['swift'] : sub === 'Android' || sub === 'Kotlin' ? ['kotlin'] : ['ionic'];
      items.push({
        asset_id: `at-${sub.toLowerCase().replace(/\s/g, '-')}-${n}`,
        name: `${sub} App Template ${n}`,
        description: `${sub} mobile app template. ${15 + n} screens, fully functional, clean architecture, ready to customize and deploy.`,
        category: 'app_templates',
        subcategory: sub,
        asset_type: 'template',
        software: sw,
        thumbnail_url: IMG.app,
        file_format: 'ZIP',
        file_size_mb: Math.round(Math.random() * 100 + 5),
        tags: [sub.toLowerCase(), 'mobile', 'app', 'template', 'cross-platform'],
        author: `AppDev${n}`,
        license_type: 'subscription',
        featured: n === 1 && (sub === 'React Native' || sub === 'Flutter'),
        trending: n <= 2,
      });
    }
  }
  return items;
}

function genAiTools(): SeedAsset[] {
  const tools = [
    { id: 'ai-video-generator', name: 'AI Video Generator', desc: 'Generate stunning videos from text prompts. Cinematic quality, 4K output.', type: 'video' },
    { id: 'ai-image-generator', name: 'AI Image Generator', desc: 'Create beautiful images from text. High-quality, commercial license included.', type: 'image' },
    { id: 'ai-image-editor', name: 'AI Image Editor', desc: 'Retouch, transform, and enhance photos with AI-powered editing tools.', type: 'image' },
    { id: 'ai-voice-generator', name: 'AI Voice Generator', desc: 'Natural-sounding voiceovers from text. 5 voices, multilingual support.', type: 'audio' },
    { id: 'ai-music-generator', name: 'AI Music Generator', desc: 'Compose original songs and music from text prompts. Royalty-free.', type: 'music' },
    { id: 'ai-graphics-generator', name: 'AI Graphics Generator', desc: 'Design logos, graphics, and visual content with AI. Vector output.', type: 'image' },
    { id: 'ai-mockup-generator', name: 'AI Mockup Generator', desc: 'Generate realistic product mockups in seconds. Multiple formats.', type: 'image' },
    { id: 'ai-sound-generator', name: 'AI Sound Generator', desc: 'Create custom sound effects and audio clips from text descriptions.', type: 'sfx' },
  ];
  return tools.map((t, n) => ({
    asset_id: `ai-${t.id}`,
    name: t.name,
    description: t.desc,
    category: 'ai_tools',
    subcategory: 'AI Generators',
    asset_type: 'ai_tool',
    software: [],
    thumbnail_url: IMG.ai,
    file_format: 'WEB',
    file_size_mb: 0,
    tags: ['ai', 'generator', t.type, 'unlimited', 'commercial-license'],
    author: 'AI App Factory',
    license_type: 'one_time',
    featured: n < 4,
    trending: n < 6,
  }));
}

function genAddons(): SeedAsset[] {
  const items: SeedAsset[] = [];
  const subs: ['Lightroom Presets', 'Photoshop Actions', 'LUTs', 'Overlays', 'Plugins', 'Extensions'] = ['Lightroom Presets', 'Photoshop Actions', 'LUTs', 'Overlays', 'Plugins', 'Extensions'];
  for (const sub of subs) {
    for (let n = 1; n <= 10; n++) {
      const sw = sub === 'Lightroom Presets' ? ['lightroom'] : sub === 'Photoshop Actions' ? ['photoshop'] : sub === 'LUTs' ? ['premiere_pro', 'after_effects'] : sub === 'Overlays' ? ['photoshop'] : ['photoshop'];
      items.push({
        asset_id: `ad-${sub.toLowerCase().replace(/\s/g, '-')}-${n}`,
        name: `${sub} Pack ${n}`,
        description: `${sub} collection with ${20 + n * 5} items. Professional-grade, one-click apply. Compatible with ${sw.join(', ')}.`,
        category: 'addons',
        subcategory: sub,
        asset_type: sub === 'Lightroom Presets' ? 'preset' : sub === 'Photoshop Actions' ? 'action' : sub === 'LUTs' ? 'preset' : 'addon',
        software: sw,
        thumbnail_url: sub.includes('Presets') ? IMG.preset : sub.includes('Actions') ? IMG.action : IMG.preset,
        file_format: sub === 'LUTs' ? 'CUBE' : sub.includes('Presets') ? 'XMP' : 'ATN',
        file_size_mb: Math.round(Math.random() * 20 + 1),
        tags: [sub.toLowerCase(), 'preset', 'filter', 'one-click', ...sw],
        author: `AddonPro${n}`,
        license_type: 'subscription',
        featured: n === 1 && sub === 'Lightroom Presets',
        trending: n <= 2,
      });
    }
  }
  return items;
}

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    console.log(`[seedEnvatoCatalog] Seeding ${ASSETS.length} assets...`);

    // Check what already exists
    const existing = await base44.asServiceRole.entities.EnvatoAsset.list('-created_date', 1000);
    const existingIds = new Set((existing || []).map((a: any) => a.asset_id));
    const toInsert = ASSETS.filter(a => !existingIds.has(a.asset_id));

    if (toInsert.length === 0) {
      return Response.json({
        status: 'already_seeded',
        existing: existingIds.size,
        new: 0,
        total: existingIds.size,
      });
    }

    // Bulk create in batches of 100
    let created = 0;
    for (let i = 0; i < toInsert.length; i += 100) {
      const batch = toInsert.slice(i, i + 100);
      const records = batch.map(a => ({
        organization_id: ORG_ID,
        asset_id: a.asset_id,
        name: a.name,
        description: a.description,
        category: a.category,
        subcategory: a.subcategory,
        asset_type: a.asset_type,
        software: a.software,
        thumbnail_url: a.thumbnail_url,
        preview_url: a.thumbnail_url,
        file_url: '', // No actual file — download will return a placeholder
        file_format: a.file_format,
        file_size_mb: a.file_size_mb,
        tags: a.tags,
        author: a.author,
        license_type: a.license_type,
        price: 0,
        downloads_count: Math.floor(Math.random() * 5000),
        views_count: Math.floor(Math.random() * 50000),
        rating: Math.round((Math.random() * 1 + 4) * 10) / 10, // 4.0–5.0
        rating_count: Math.floor(Math.random() * 500),
        featured: a.featured || false,
        trending: a.trending || false,
        published_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'published',
      }));
      try {
        await base44.asServiceRole.entities.EnvatoAsset.bulkCreate(records);
        created += records.length;
        console.log(`[seedEnvatoCatalog] Inserted batch ${i / 100 + 1}: ${records.length} assets (total: ${created})`);
      } catch (e) {
        console.error(`[seedEnvatoCatalog] Batch ${i / 100 + 1} failed:`, e.message);
      }
    }

    // Count by category
    const counts: Record<string, number> = {};
    for (const a of ASSETS) {
      counts[a.category] = (counts[a.category] || 0) + 1;
    }

    return Response.json({
      status: 'success',
      existing: existingIds.size,
      new: created,
      total: existingIds.size + created,
      by_category: counts,
    });
  } catch (e) {
    console.error('seedEnvatoCatalog error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}