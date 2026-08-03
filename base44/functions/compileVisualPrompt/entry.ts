import { createClientFromRequest } from "npm:@base44/sdk";

export default async function handler(request: Request) {
  const base44 = createClientFromRequest(request);
  const user = await base44.auth.me();
  const orgId = user.data?.organization_id;
  const body = await request.json();

  if (!orgId) {
    return Response.json({ ok: false, error: "No organization found" }, { status: 400 });
  }

  const { finish_id, environment_id, marketing_use, camera_id, media_type, aspect_ratio, platform_id } = body;

  try {
    // Fetch finish and environment profiles
    const finish = await base44.entities.FinishProfile.filter({ organization_id: orgId, finish_id }).then(r => r[0]);
    const environment = await base44.entities.EnvironmentProfile.filter({ organization_id: orgId, environment_id }).then(r => r[0]);

    if (!finish || !environment) {
      return Response.json({ ok: false, error: "Finish or environment profile not found" }, { status: 404 });
    }

    // Camera profiles (inline since they're in shared lib)
    const cameras = {
      wide_architectural: { image: "24mm wide architectural photograph with corrected vertical lines and natural perspective", video: "a slow stabilized dolly-in from the doorway, preserving straight architectural lines" },
      floor_forward: { image: "24mm low waist-height composition with the finished surface occupying the lower two-thirds", video: "a slow low-angle slider move across the floor, keeping the surface dominant in frame" },
      three_quarter: { image: "35mm three-quarter room perspective with realistic depth and no fisheye distortion", video: "a gentle three-quarter orbit that reveals the floor and surrounding room without warping geometry" },
      detail_50mm: { image: "50mm close detail photograph showing texture, sheen and edge behavior", video: "a slow macro push-in revealing surface texture and reflectivity" },
      overhead: { image: "direct overhead photograph showing the full floor layout and material continuity", video: "a slow overhead crane move revealing the complete floor plan" },
      entry_reveal: { image: "shot from the entrance showing the floor leading into the space", video: "a smooth forward push from the entryway into the room" },
      corner_perspective: { image: "corner-to-corner composition showing two walls and the floor plane", video: "a slow corner-to-corner slider move" },
      garage_hero: { image: "garage interior shot with the finished floor as the hero element", video: "a slow pan across the garage floor showing the finish" },
      commercial_wide: { image: "wide commercial space photograph showing scale and floor continuity", video: "a wide commercial space flythrough" },
      exterior_approach: { image: "exterior approach photograph showing the building and entry", video: "a slow exterior approach to the building entrance" }
    };
    const camera = cameras[camera_id] || cameras.wide_architectural;

    // Compile the prompt
    const installationDetails = [...(finish.installation_details || []), ...(environment.installation_details || [])].join(", ");
    const lighting = (environment.lighting_options || [])[0] || "natural daylight";
    const colorDirection = (finish.colors || []).join(", ");
    const marketingModifier = marketing_use || "professional contractor portfolio";

    let compiledPrompt;
    if (media_type === "video") {
      compiledPrompt = `${camera.video} through ${environment.name} featuring ${finish.name}. The surface shows ${finish.surface_description} with ${finish.sheen || "natural sheen"}. The environment includes ${environment.scene_details}. Lighting is ${lighting}. Live-action architectural contractor footage, natural material response, stable geometry, realistic scale and restrained motion.`;
    } else {
      compiledPrompt = `Ultra-realistic professional contractor portfolio photograph of ${finish.name} in ${environment.name}. Surface: ${finish.surface_description}. Color direction: ${colorDirection}. Sheen: ${finish.sheen}. Installation details: ${installationDetails}. Space: ${environment.scene_details}. Lighting: ${lighting}. Camera: ${camera.image}. Composition: ${marketingModifier}. Natural material behavior, correct scale, physically plausible reflectivity, stable architectural geometry, subtle real-world imperfections, clean contractor-grade workmanship. Restrictions: ${(finish.avoid || []).join(", ")}. Disclosure: AI-generated project concept. Not an installed customer project.`;
    }

    // Save the compiled prompt
    const visualPrompt = await base44.asServiceRole.entities.VisualPrompt.create({
      organization_id: orgId,
      media_type,
      finish_id,
      environment_id,
      marketing_use: marketing_use || "",
      aspect_ratio: aspect_ratio || (media_type === "video" ? "16:9" : "4:3"),
      camera_id: camera_id || "wide_architectural",
      image_prompt: media_type === "image" ? compiledPrompt : "",
      video_prompt: media_type === "video" ? compiledPrompt : "",
      negative_prompt: (finish.avoid || []).join(", "),
      disclosure_label: "AI-generated project concept. Not an installed customer project.",
      version: 1,
      status: "approved"
    });

    return Response.json({
      ok: true,
      prompt: compiledPrompt,
      prompt_id: visualPrompt.id,
      finish: finish.name,
      environment: environment.name,
      camera: camera_id || "wide_architectural"
    });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}