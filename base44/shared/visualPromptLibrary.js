// Camera library for visual prompt compilation
// 10 camera and motion profiles for image and video generation

export const cameraLibrary = [
  { id: "wide_architectural", name: "Wide architectural reveal", image: "24mm wide architectural photograph with corrected vertical lines and natural perspective", video: "a slow stabilized dolly-in from the doorway, preserving straight architectural lines" },
  { id: "floor_forward", name: "Floor-forward hero", image: "24mm low waist-height composition with the finished surface occupying the lower two-thirds", video: "a slow low-angle slider move across the floor, keeping the surface dominant in frame" },
  { id: "three_quarter", name: "Three-quarter room view", image: "35mm three-quarter room perspective with realistic depth and no fisheye distortion", video: "a gentle three-quarter orbit that reveals the floor and surrounding room without warping geometry" },
  { id: "detail_50mm", name: "Material detail", image: "50mm close detail photograph showing texture, sheen and edge behavior", video: "a slow macro push-in revealing surface texture and reflectivity" },
  { id: "overhead", name: "Overhead plan view", image: "direct overhead photograph showing the full floor layout and material continuity", video: "a slow overhead crane move revealing the complete floor plan" },
  { id: "entry_reveal", name: "Entry reveal", image: "shot from the entrance showing the floor leading into the space", video: "a smooth forward push from the entryway into the room" },
  { id: "corner_perspective", name: "Corner perspective", image: "corner-to-corner composition showing two walls and the floor plane", video: "a slow corner-to-corner slider move" },
  { id: "garage_hero", name: "Garage hero", image: "garage interior shot with the finished floor as the hero element", video: "a slow pan across the garage floor showing the finish" },
  { id: "commercial_wide", name: "Commercial wide", image: "wide commercial space photograph showing scale and floor continuity", video: "a wide commercial space flythrough" },
  { id: "exterior_approach", name: "Exterior approach", image: "exterior approach photograph showing the building and entry", video: "a slow exterior approach to the building entrance" }
];

// QA rules for visual media validation
export const qaRules = [
  { rule_id: "material_accuracy", severity: "critical", description: "Material must match the selected finish profile" },
  { rule_id: "scale_correct", severity: "critical", description: "Material scale must be physically plausible" },
  { rule_id: "reflection_behavior", severity: "critical", description: "Reflections must match the sheen level" },
  { rule_id: "no_warping", severity: "critical", description: "No geometric warping or fisheye distortion" },
  { rule_id: "stable_architecture", severity: "critical", description: "Architectural geometry must be stable" },
  { rule_id: "lighting_consistency", severity: "high", description: "Lighting must be consistent across the scene" },
  { rule_id: "no_oversaturation", severity: "high", description: "Colors must not be oversaturated" },
  { rule_id: "edge_behavior", severity: "high", description: "Edge transitions must be clean and contractor-grade" },
  { rule_id: "no_artifacts", severity: "high", description: "No AI artifacts or pattern drift" },
  { rule_id: "disclosure_present", severity: "high", description: "AI-generated concept disclosure must be present" }
];

// Image master template
export const imageMasterTemplate = `Ultra-realistic professional contractor portfolio photograph of {{finish_name}} in {{environment_name}}.
Surface: {{surface_description}}. Color direction: {{color_direction}}. Sheen: {{sheen}}.
Installation details: {{installation_details}}.
Space: {{scene_details}}. Lighting: {{lighting}}. Camera: {{camera}}.
Composition: {{marketing_modifier}}.
Natural material behavior, correct scale, physically plausible reflectivity, stable architectural geometry, subtle real-world imperfections, clean contractor-grade workmanship.
Restrictions: {{negative_prompt}}.
Disclosure: AI-generated project concept. Not an installed customer project.`;

// Video text-to-video template
export const videoTextToVideoTemplate = `{{camera_motion}} through {{environment_name}} featuring {{finish_name}}.
The surface shows {{surface_description}} with {{sheen}}. The environment includes {{scene_details}}.
Lighting is {{lighting}}. Live-action architectural contractor footage, natural material response, stable geometry, realistic scale and restrained motion.`;

// Video image-to-video template
export const videoImageToVideoTemplate = `{{camera_motion}}. Reflections and highlights shift naturally across the {{finish_name}} while the room remains geometrically stable.
{{environmental_motion}}. Live-action contractor portfolio footage, smooth restrained motion, accurate edges, no morphing, no pattern drift.`;