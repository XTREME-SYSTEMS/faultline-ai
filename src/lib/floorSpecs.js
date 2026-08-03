// Floor type specification templates — maps a general floor type to a full
// scope-of-work item list for proposals. Conditional items (perimeter
// protection, moisture mitigation, joint filler, cove base) are included or
// excluded based on the lead's measurement data.

export const FLOOR_TYPE_OPTIONS = [
  "Metallic Epoxy",
  "Multi-Color Metallic Epoxy",
  "Flake Epoxy",
  "Quartz System",
  "Solid Epoxy",
  "Stained Concrete",
  "Polished Concrete",
  "Glitter Epoxy",
  "Joint Filler",
  "Concrete Overlayment",
  "Sealed Concrete",
];

// Each spec item: { label, detail, conditional? }
// conditional items are only included when the matching option is true.
export const FLOOR_SPECS = {
  "Metallic Epoxy": [
    { label: "Concrete surface preparation", detail: "Diamond grind the existing concrete substrate to remove existing coatings, adhesives, oil, and contaminants. Open the surface to a CSP-2/CSP-3 profile." },
    { label: "Crack and surface repair", detail: "Fill all cracks, spalls, pop-outs, and surface defects with two-part epoxy repair mortar. Grind flush after cure.", conditional: "cracks" },
    { label: "Perimeter protection", detail: "Apply plastic sheeting and painter's tape to all walls, baseboards, door frames, and adjacent surfaces to protect from overspray and splatter.", conditional: "perimeter" },
    { label: "Moisture mitigation", detail: "If calcium chloride or RH testing indicates elevated moisture vapor emission, apply a moisture vapor barrier primer to the prepared substrate.", conditional: "moisture" },
    { label: "Prime coat", detail: "Apply a penetrating epoxy primer / bond coat to the prepared substrate to promote adhesion of the metallic system." },
    { label: "Metallic epoxy base coat", detail: "Apply 100% solids metallic epoxy base coat (15–20 mils) with the selected metallic pigment color." },
    { label: "Metallic effect manipulation", detail: "Manipulate metallic pigments using solvents, denatured alcohol, or specialized tools to achieve the desired 3D swirl, river, or cloud effect." },
    { label: "Joint filler", detail: "Fill all control joints and construction joints with semi-rigid polyurea or epoxy joint filler, then shave flush.", conditional: "joints" },
    { label: "Topcoat — polyaspartic / urethane / T200", detail: "Apply two coats of high-performance polyaspartic, urethane, or T200 topcoat for UV stability, chemical resistance, and long-term wear protection." },
    { label: "Cove base installation", detail: "Install epoxy cove base at perimeter walls where specified.", conditional: "coving" },
    { label: "Final walk-through inspection", detail: "Conduct a final walk-through inspection with the customer to confirm finish quality, color match, and surface integrity." },
  ],
  "Multi-Color Metallic Epoxy": [
    { label: "Concrete surface preparation", detail: "Diamond grind the existing concrete substrate to remove existing coatings, adhesives, oil, and contaminants. Open the surface to a CSP-2/CSP-3 profile." },
    { label: "Crack and surface repair", detail: "Fill all cracks, spalls, pop-outs, and surface defects with two-part epoxy repair mortar. Grind flush after cure.", conditional: "cracks" },
    { label: "Perimeter protection", detail: "Apply plastic sheeting and painter's tape to all walls, baseboards, door frames, and adjacent surfaces to protect from overspray and splatter.", conditional: "perimeter" },
    { label: "Moisture mitigation", detail: "If calcium chloride or RH testing indicates elevated moisture vapor emission, apply a moisture vapor barrier primer to the prepared substrate.", conditional: "moisture" },
    { label: "Prime coat", detail: "Apply a penetrating epoxy primer / bond coat to the prepared substrate to promote adhesion of the metallic system." },
    { label: "Multi-color metallic base coat", detail: "Apply 100% solids metallic epoxy base coat (15–20 mils) using the selected blend of two or more metallic pigment colors, blended on the floor to create a seamless multi-tone effect." },
    { label: "Metallic effect manipulation", detail: "Manipulate multiple metallic pigments using solvents, denatured alcohol, squeegees, and specialized tools to achieve a blended 3D river, cloud, or gradient effect with smooth color transitions." },
    { label: "Joint filler", detail: "Fill all control joints and construction joints with semi-rigid polyurea or epoxy joint filler, then shave flush.", conditional: "joints" },
    { label: "Topcoat — polyaspartic / urethane / T200", detail: "Apply two coats of high-performance polyaspartic, urethane, or T200 topcoat for UV stability, chemical resistance, and long-term wear protection." },
    { label: "Cove base installation", detail: "Install epoxy cove base at perimeter walls where specified.", conditional: "coving" },
    { label: "Final walk-through inspection", detail: "Conduct a final walk-through inspection with the customer to confirm finish quality, color blend, and surface integrity." },
  ],
  "Flake Epoxy": [
    { label: "Concrete surface preparation", detail: "Diamond grind the existing concrete substrate to remove existing coatings, adhesives, oil, and contaminants. Open the surface to a CSP-2/CSP-3 profile." },
    { label: "Crack and surface repair", detail: "Fill all cracks, spalls, pop-outs, and surface defects with two-part epoxy repair mortar. Grind flush after cure.", conditional: "cracks" },
    { label: "Perimeter protection", detail: "Apply plastic sheeting and painter's tape to all walls, baseboards, door frames, and adjacent surfaces to protect from overspray and splatter.", conditional: "perimeter" },
    { label: "Moisture mitigation", detail: "If calcium chloride or RH testing indicates elevated moisture vapor emission, apply a moisture vapor barrier primer to the prepared substrate.", conditional: "moisture" },
    { label: "Base coat", detail: "Apply epoxy base coat (pigmented to match or complement the flake color)." },
    { label: "Flake broadcast", detail: "Broadcast vinyl flake to refusal (100% coverage) into the wet base coat. Allow to cure, then scrape, sweep, and vacuum all loose flake." },
    { label: "Joint filler", detail: "Fill all control joints and construction joints with semi-rigid polyurea or epoxy joint filler, then shave flush.", conditional: "joints" },
    { label: "Topcoat — polyaspartic / urethane / T200", detail: "Apply two coats of clear polyaspartic, urethane, or T200 topcoat to encapsulate the flake and provide UV stability, chemical resistance, and wear protection." },
    { label: "Cove base installation", detail: "Install epoxy cove base at perimeter walls where specified.", conditional: "coving" },
    { label: "Final walk-through inspection", detail: "Conduct a final walk-through inspection with the customer to confirm flake distribution, finish quality, and surface integrity." },
  ],
  "Quartz System": [
    { label: "Concrete surface preparation", detail: "Diamond grind the existing concrete substrate to remove existing coatings, adhesives, oil, and contaminants. Open the surface to a CSP-2/CSP-3 profile." },
    { label: "Crack and surface repair", detail: "Fill all cracks, spalls, pop-outs, and surface defects with two-part epoxy repair mortar. Grind flush after cure.", conditional: "cracks" },
    { label: "Perimeter protection", detail: "Apply plastic sheeting and painter's tape to all walls, baseboards, door frames, and adjacent surfaces to protect from overspray and splatter.", conditional: "perimeter" },
    { label: "Moisture mitigation", detail: "If calcium chloride or RH testing indicates elevated moisture vapor emission, apply a moisture vapor barrier primer to the prepared substrate.", conditional: "moisture" },
    { label: "Prime coat", detail: "Apply epoxy primer / bond coat to the prepared substrate." },
    { label: "First quartz broadcast", detail: "Apply epoxy base coat and broadcast colored quartz to refusal into the wet coat." },
    { label: "Second quartz broadcast", detail: "Apply a second epoxy coat and broadcast a second layer of colored quartz to refusal for double-broadcast thickness and texture." },
    { label: "Joint filler", detail: "Fill all control joints and construction joints with semi-rigid polyurea or epoxy joint filler, then shave flush.", conditional: "joints" },
    { label: "Topcoat — polyaspartic / urethane / T200", detail: "Apply two coats of clear polyaspartic, urethane, or T200 topcoat to encapsulate the quartz and provide a slip-resistant, wear-resistant finish." },
    { label: "Cove base installation", detail: "Install epoxy cove base at perimeter walls where specified.", conditional: "coving" },
    { label: "Final walk-through inspection", detail: "Conduct a final walk-through inspection with the customer to confirm quartz coverage, texture, and surface integrity." },
  ],
  "Solid Epoxy": [
    { label: "Concrete surface preparation", detail: "Diamond grind the existing concrete substrate to remove existing coatings, adhesives, oil, and contaminants. Open the surface to a CSP-2/CSP-3 profile." },
    { label: "Crack and surface repair", detail: "Fill all cracks, spalls, pop-outs, and surface defects with two-part epoxy repair mortar. Grind flush after cure.", conditional: "cracks" },
    { label: "Perimeter protection", detail: "Apply plastic sheeting and painter's tape to all walls, baseboards, door frames, and adjacent surfaces to protect from overspray and splatter.", conditional: "perimeter" },
    { label: "Moisture mitigation", detail: "If calcium chloride or RH testing indicates elevated moisture vapor emission, apply a moisture vapor barrier primer to the prepared substrate.", conditional: "moisture" },
    { label: "Prime coat", detail: "Apply epoxy primer / bond coat to the prepared substrate." },
    { label: "Solid color epoxy coat", detail: "Apply 100% solids epoxy in the selected uniform color (two coats for full hide and uniform coverage)." },
    { label: "Joint filler", detail: "Fill all control joints and construction joints with semi-rigid polyurea or epoxy joint filler, then shave flush.", conditional: "joints" },
    { label: "Topcoat — polyaspartic / urethane / T200", detail: "Apply one to two coats of polyaspartic, urethane, or T200 topcoat for UV stability, chemical resistance, and wear protection." },
    { label: "Cove base installation", detail: "Install epoxy cove base at perimeter walls where specified.", conditional: "coving" },
    { label: "Final walk-through inspection", detail: "Conduct a final walk-through inspection with the customer to confirm color uniformity, finish quality, and surface integrity." },
  ],
  "Stained Concrete": [
    { label: "Concrete surface preparation", detail: "Mechanically clean and degrease the existing concrete substrate. Light grind or hone to open the surface for stain penetration without removing existing character." },
    { label: "Crack and surface repair", detail: "Fill all cracks, spalls, and surface defects with cementitious or epoxy repair material. Grind flush after cure.", conditional: "cracks" },
    { label: "Perimeter protection", detail: "Apply plastic sheeting and painter's tape to all walls, baseboards, and adjacent surfaces to protect from stain overspray.", conditional: "perimeter" },
    { label: "Stain application", detail: "Apply acid-based or water-based concrete stain in the selected color(s) using sprayers and brushes. Allow to react and dry. Multiple coats for depth of color." },
    { label: "Neutralization and rinse", detail: "Neutralize acid stain residue (if acid-based) and thoroughly rinse the surface. Allow to dry completely." },
    { label: "Joint filler", detail: "Fill all control joints and construction joints with semi-rigid polyurea or epoxy joint filler, then shave flush.", conditional: "joints" },
    { label: "Sealer / topcoat — polyaspartic / urethane / T200", detail: "Apply one to two coats of concrete sealer followed by a polyaspartic, urethane, or T200 topcoat for protection and sheen." },
    { label: "Cove base installation", detail: "Install cove base at perimeter walls where specified.", conditional: "coving" },
    { label: "Final walk-through inspection", detail: "Conduct a final walk-through inspection with the customer to confirm stain color, mottling effect, and finish quality." },
  ],
  "Polished Concrete": [
    { label: "Concrete surface preparation", detail: "Mechanically grind the existing concrete substrate with progressively finer diamond tooling (metal-bond then resin-bond) to remove coatings and open the surface." },
    { label: "Crack and surface repair", detail: "Fill all cracks, spalls, and surface defects with cementitious or epoxy repair material. Grind flush.", conditional: "cracks" },
    { label: "Densifier application", detail: "Apply liquid concrete densifier/hardener to the floor during the polishing process to densify and harden the surface." },
    { label: "Progressive polishing", detail: "Polish through successive grits (up to 800, 1500, or 3000 grit depending on desired sheen) to achieve the specified level of reflectivity." },
    { label: "Joint filler", detail: "Fill all control joints and construction joints with semi-rigid polyurea or epoxy joint filler, then shave flush.", conditional: "joints" },
    { label: "Guard / sealer application", detail: "Apply a concrete guard or penetrating sealer to enhance sheen and provide stain protection." },
    { label: "Final walk-through inspection", detail: "Conduct a final walk-through inspection with the customer to confirm sheen level, clarity, and surface integrity." },
  ],
  "Glitter Epoxy": [
    { label: "Concrete surface preparation", detail: "Diamond grind the existing concrete substrate to remove existing coatings, adhesives, oil, and contaminants. Open the surface to a CSP-2/CSP-3 profile." },
    { label: "Crack and surface repair", detail: "Fill all cracks, spalls, pop-outs, and surface defects with two-part epoxy repair mortar. Grind flush after cure.", conditional: "cracks" },
    { label: "Perimeter protection", detail: "Apply plastic sheeting and painter's tape to all walls, baseboards, door frames, and adjacent surfaces to protect from overspray and splatter.", conditional: "perimeter" },
    { label: "Moisture mitigation", detail: "If calcium chloride or RH testing indicates elevated moisture vapor emission, apply a moisture vapor barrier primer to the prepared substrate.", conditional: "moisture" },
    { label: "Prime coat", detail: "Apply epoxy primer / bond coat to the prepared substrate." },
    { label: "Base coat", detail: "Apply a pigmented or clear epoxy base coat." },
    { label: "Glitter broadcast", detail: "Broadcast glitter additive into the wet epoxy or polyaspartic coat for a sparkling decorative effect. Multiple colors may be blended." },
    { label: "Joint filler", detail: "Fill all control joints and construction joints with semi-rigid polyurea or epoxy joint filler, then shave flush.", conditional: "joints" },
    { label: "Topcoat — polyaspartic / urethane / T200", detail: "Apply one to two coats of clear polyaspartic, urethane, or T200 topcoat to encapsulate the glitter and provide UV stability and wear protection." },
    { label: "Cove base installation", detail: "Install epoxy cove base at perimeter walls where specified.", conditional: "coving" },
    { label: "Final walk-through inspection", detail: "Conduct a final walk-through inspection with the customer to confirm glitter distribution, sparkle effect, and finish quality." },
  ],
  "Joint Filler": [
    { label: "Concrete surface preparation", detail: "Clean and vacuum all control joints, construction joints, and saw cuts to remove dust, debris, and loose material. Route or widen joints as needed." },
    { label: "Joint priming", detail: "Apply primer to the walls of the joints as specified by the filler manufacturer." },
    { label: "Joint filler installation", detail: "Fill all control joints and construction joints with semi-rigid polyurea or epoxy joint filler in the selected color. Overfill slightly, then shave or grind flush after cure." },
    { label: "Perimeter protection", detail: "Apply plastic sheeting and painter's tape to all walls, baseboards, and adjacent surfaces to protect from filler splatter.", conditional: "perimeter" },
    { label: "Final walk-through inspection", detail: "Conduct a final walk-through inspection with the customer to confirm joint fill quality, flush finish, and color match." },
  ],
  "Concrete Overlayment": [
    { label: "Concrete surface preparation", detail: "Mechanically prepare the existing concrete substrate by grinding, shot blasting, or scarifying to remove coatings and contaminants. Profile to CSP-3/CSP-5 depending on the overlay system." },
    { label: "Crack and surface repair", detail: "Fill all cracks, spalls, and surface defects with cementitious or epoxy repair material. Grind flush.", conditional: "cracks" },
    { label: "Perimeter protection", detail: "Apply plastic sheeting and painter's tape to all walls, baseboards, and adjacent surfaces to protect from splatter.", conditional: "perimeter" },
    { label: "Primer application", detail: "Apply the manufacturer-specified primer to the prepared substrate to promote bond of the overlayment." },
    { label: "Overlayment placement", detail: "Place cementitious micro-topping or self-leveling overlayment per manufacturer specifications. Trowel, gauge rake, or squeegee to the specified thickness." },
    { label: "Decorative finish (if applicable)", detail: "Apply stain, dye, or integral color to the overlayment as specified. Trowel finishes, textures, or patterns as requested." },
    { label: "Joint filler", detail: "Fill all control joints and construction joints with semi-rigid polyurea or epoxy joint filler, then shave flush.", conditional: "joints" },
    { label: "Sealer / topcoat — polyaspartic / urethane / T200", detail: "Apply one to two coats of sealer followed by a polyaspartic, urethane, or T200 topcoat for protection and sheen." },
    { label: "Final walk-through inspection", detail: "Conduct a final walk-through inspection with the customer to confirm finish quality, color, and surface integrity." },
  ],
  "Sealed Concrete": [
    { label: "Concrete surface preparation", detail: "Mechanically clean and degrease the existing concrete substrate. Light grind or hone to open the surface without removing existing character." },
    { label: "Crack and surface repair", detail: "Fill all cracks, spalls, and surface defects with cementitious or epoxy repair material. Grind flush.", conditional: "cracks" },
    { label: "Perimeter protection", detail: "Apply plastic sheeting and painter's tape to all walls, baseboards, and adjacent surfaces to protect from sealer overspray.", conditional: "perimeter" },
    { label: "Joint filler", detail: "Fill all control joints and construction joints with semi-rigid polyurea or epoxy joint filler, then shave flush.", conditional: "joints" },
    { label: "Sealer application", detail: "Apply penetrating or film-forming concrete sealer in one to two coats per manufacturer specifications." },
    { label: "Topcoat — polyaspartic / urethane / T200 (optional)", detail: "If specified, apply a polyaspartic, urethane, or T200 topcoat over the sealer for enhanced wear and sheen." },
    { label: "Final walk-through inspection", detail: "Conduct a final walk-through inspection with the customer to confirm sealer coverage, sheen, and surface integrity." },
  ],
};

// Generate the spec list for a floor type, filtering conditional items.
// opts: { needs_grinding, needs_moisture_mitigation, has_cracks, has_coving, has_joints, needs_perimeter }
export function generateSpecs(floorType, opts = {}) {
  const template = FLOOR_SPECS[floorType];
  if (!template) return [];
  return template.filter((item) => {
    if (!item.conditional) return true;
    if (item.conditional === "moisture") return !!opts.needs_moisture_mitigation;
    if (item.conditional === "cracks") return !!opts.has_cracks;
    if (item.conditional === "joints") return !!opts.has_joints;
    if (item.conditional === "coving") return (Number(opts.has_coving) || 0) > 0;
    if (item.conditional === "perimeter") return opts.needs_perimeter !== false; // default true
    return true;
  });
}

// Format specs as a readable text block for LLM prompts.
export function specsToText(specs) {
  if (!specs || !specs.length) return "";
  return specs.map((s, i) => `${i + 1}. ${s.label}: ${s.detail}`).join("\n");
}