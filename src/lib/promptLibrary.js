// Xtreme AI Visual Prompt Library — prompt compilation module
// Provides structured finish profiles, environment profiles, and camera angles
// compiled into a master template for ultra-realistic image generation.

export const CAMERA_LIBRARY = [
  { id: "wide_architectural", name: "Wide architectural reveal", image: "24mm wide architectural photograph with corrected vertical lines and natural perspective" },
  { id: "floor_forward", name: "Floor-forward hero", image: "24mm low waist-height composition with the finished surface occupying the lower two-thirds" },
  { id: "three_quarter", name: "Three-quarter room view", image: "35mm three-quarter room perspective with realistic depth and no fisheye distortion" },
  { id: "detail_50mm", name: "Material detail", image: "50mm close detail photograph showing texture, sheen and edge behavior" },
  { id: "top_down_detail", name: "Top-down sample", image: "50mm top-down detail composition with even scale and controlled side light" },
  { id: "aisle_tracking", name: "Aisle tracking", image: "24mm centered aisle composition emphasizing scale and joint alignment" },
  { id: "handheld_documentary", name: "Handheld documentary", image: "35mm documentary contractor photo with natural framing and restrained realism" },
  { id: "crane_reveal", name: "Elevated reveal", image: "24mm slightly elevated wide view showing the entire finished area" },
  { id: "doorway_reveal", name: "Doorway reveal", image: "24mm doorway-framed reveal with realistic threshold and edge details" },
];

const MASTER_TEMPLATE = `Ultra-realistic professional contractor portfolio photograph of {finishName} in {environmentName}.
Surface: {surfaceDescription}. Color direction: {colorDirection}. Sheen: {sheen}.
Installation details: {installationDetails}.
Space: {sceneDetails}. Lighting: {lighting}. Camera: {camera}.
Composition: {marketingModifier}.
Natural material behavior, correct scale, physically plausible reflectivity, stable architectural geometry, subtle real-world imperfections, clean contractor-grade workmanship.
Restrictions: {negativePrompt}.
Disclosure: AI-generated project concept. Not an installed customer project.`;

export function compilePrompt({ finish, environment, camera, colorName, hex, marketingUse }) {
  const colorDirection = colorName
    ? `${colorName} (${hex})`
    : "natural material tone";
  const installationDetails = [
    ...(finish.installation_details || []),
    ...(environment.installation_details || []),
  ].join(", ");
  const lighting = (environment.lighting_options || [])[0] || "balanced professional lighting";
  const cameraDesc = camera?.image || CAMERA_LIBRARY[0].image;
  const negativePrompt = (finish.avoid || []).join(", ");
  const marketingModifier = marketingUse || "portfolio hero composition";

  return MASTER_TEMPLATE
    .replace("{finishName}", finish.name)
    .replace("{environmentName}", environment.name)
    .replace("{surfaceDescription}", finish.surface_description)
    .replace("{colorDirection}", colorDirection)
    .replace("{sheen}", finish.sheen || "satin")
    .replace("{installationDetails}", installationDetails)
    .replace("{sceneDetails}", environment.scene_details || environment.name)
    .replace("{lighting}", lighting)
    .replace("{camera}", cameraDesc)
    .replace("{marketingModifier}", marketingModifier)
    .replace("{negativePrompt}", negativePrompt || "people, text, watermark, fisheye distortion, cartoonish rendering");
}

// Map a finish_id to the XPS ColorChart systems that supply its colors.
export function finishToColorSystems(finishId) {
  const id = (finishId || "").toLowerCase();
  if (id.includes("flake")) return ["flake"];
  if (id.includes("metallic")) return ["metallic"];
  if (id.includes("quartz")) return ["quartz"];
  if (id.includes("glitter")) return ["glitter"];
  if (id.includes("stained")) return ["dye_stain"];
  if (id.includes("countertop") && id.includes("epoxy")) return ["metallic"];
  if (id.includes("countertop")) return ["solid"];
  if (id.includes("polished") || id.includes("sealed") || id.includes("overlay") || id.includes("microtopping")) return ["solid"];
  return ["solid"];
}