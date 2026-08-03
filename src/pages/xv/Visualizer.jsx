import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import SectionCard from "@/components/vq/SectionCard";
import PageHeader from "@/components/vq/PageHeader";
import PhotoUpload from "@/components/visualizer/PhotoUpload";
import ConceptPreview from "@/components/visualizer/ConceptPreview";
import FloorControls from "@/components/visualizer/FloorControls";
import MultiColorPicker from "@/components/visualizer/MultiColorPicker";
import SalesMeasurementForm from "@/components/visualizer/SalesMeasurementForm";
import SalesCustomerForm from "@/components/visualizer/SalesCustomerForm";
import ProposalPreview from "@/components/visualizer/ProposalPreview";
import SharePanel from "@/components/visualizer/SharePanel";
import SignaturePad from "@/components/visualizer/SignaturePad";
import CustomLineItems from "@/components/visualizer/CustomLineItems";
import { computeRange, money } from "@/lib/pricing";
import { buildLineItems, applyDiscount, buildProposalText } from "@/lib/proposalBuilder";
import { generateSpecs } from "@/lib/floorSpecs";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Check } from "lucide-react";

const FLOOR_TYPES = [
  { key: "metallic", label: "Metallic" },
  { key: "metallic_multi", label: "Multi-Color Metallic" },
  { key: "flake", label: "Flake" },
  { key: "quartz", label: "Quartz" },
  { key: "solid", label: "Solid" },
  { key: "glitter", label: "Glitter" },
  { key: "dye_stain", label: "Stained Concrete" },
  { key: "joint_filler", label: "Joint Filler" },
];

const FLOOR_TYPE_DISPLAY = {
  metallic: "Metallic Epoxy",
  metallic_multi: "Multi-Color Metallic Epoxy",
  flake: "Flake Epoxy",
  quartz: "Quartz System",
  solid: "Solid Epoxy",
  glitter: "Glitter Epoxy",
  dye_stain: "Stained Concrete",
  joint_filler: "Joint Filler",
};

const SHEEN_TONES = {
  "Matte": "matte flat finish with low sheen",
  "Satin": "satin finish with soft sheen",
  "Semi-Gloss": "semi-gloss finish with moderate reflectivity",
  "High Gloss": "high-gloss polished reflective finish",
  "Wet Look": "wet-look glossy sealed finish",
  "Textured": "textured slip-resistant finish",
};

const SYSTEM_MAP = {
  metallic: "metallic-epoxy",
  metallic_multi: "metallic-epoxy",
  flake: "flake-epoxy",
  quartz: "quartz-system",
  solid: "solid-color-epoxy",
  glitter: "glitter-epoxy",
  dye_stain: "stained-concrete",
  joint_filler: "joint-fill-repair",
};

export default function Visualizer() {
  const [systems, setSystems] = useState([]);
  const [rules, setRules] = useState(null);
  const [brand, setBrand] = useState(null);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [floorType, setFloorType] = useState("metallic");
  const [colors, setColors] = useState([]);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedColorIds, setSelectedColorIds] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [measure, setMeasure] = useState({
    space_type: "garage", condition: "fair", needs_grinding: true, needs_moisture_mitigation: false,
    linear_feet_cracks: 0, linear_feet_coving: 0, linear_feet_joints: 0, patch_count: 0,
    excessive_patch_count: 0, large_patch_count: 0, demolition_sqft: 0, extra_prep: false,
  });
  const [customer, setCustomer] = useState({
    customer_name: "", email: "", phone: "", project_address: "",
    desired_install_date: "", discount_type: "amount", discount_value: 0,
    floor_logo_description: "", notes: "",
  });
  const [proposalData, setProposalData] = useState(null);
  const [proposalText, setProposalText] = useState("");
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [signed, setSigned] = useState(false);
  const [leadId, setLeadId] = useState(null);
  const [customItems, setCustomItems] = useState([]);

  useEffect(() => {
    (async () => {
      const [sys, pr, brands] = await Promise.all([
        base44.entities.FloorSystem.filter({ active: true }),
        base44.entities.PricingRule.filter({ status: "active" }),
        base44.entities.BrandAsset.list(),
      ]);
      setSystems(sys);
      setRules(pr[0] || null);
      setBrand(brands[0] || null);
      setLoadingRefs(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const querySystem = floorType === "metallic_multi" ? "metallic" : floorType;
      const cols = await base44.entities.ColorChart.filter({ system: querySystem }, "rank", 24);
      setColors(cols || []);
      setSelectedColor(cols && cols[0] ? cols[0] : null);
      setSelectedColorIds([]);
      setConcepts([]);
      setSelectedConcept(null);
    })();
  }, [floorType]);

  const system = systems.find((s) => s.slug === SYSTEM_MAP[floorType]) || systems[0];
  const range = system
    ? computeRange({ ...measure, base_rate_low: system.base_rate_low, base_rate_high: system.base_rate_high }, rules)
    : null;

  const generate = async () => {
    if (!photoUrls.length) return;
    if (floorType === "metallic_multi" && selectedColorIds.length < 2) return;
    if (floorType !== "metallic_multi" && !selectedColor) return;
    setGenerating(true);
    setConcepts([]);
    setSelectedConcept(null);
    try {
      const sheenLevels = (system?.sheen_levels || ["High Gloss"]).slice(0, 3);
      const tones = sheenLevels.map((s) => ({ short: s, tone: SHEEN_TONES[s] || s.toLowerCase() }));
      const multiColors = selectedColorIds.map((id) => colors.find((c) => c.id === id)).filter(Boolean);
      const colorDesc = floorType === "metallic_multi"
        ? `a multi-color metallic epoxy floor blending ${multiColors.map((c) => `${c.color_name} (${c.code || ""})`).join(", ")}`
        : floorType === "joint_filler"
          ? `a floor with ${selectedColor.color_name} (${selectedColor.code || ""}) semi-rigid polyurea joint filler in all control joints`
          : `a ${floorType.replace(/_/g, " ")} floor in ${selectedColor.color_name} (${selectedColor.code || ""})`;
      const results = await Promise.all(
        tones.map(async (ft) => {
          const crackNote = measure.linear_feet_cracks > 0
            ? ` The original concrete floor has ${measure.linear_feet_cracks} linear feet of cracks — show these cracks filled with repair material but still subtly visible as faint lines in the finished floor surface, to honestly represent the existing slab condition. Do not hide or erase the crack locations.`
            : "";
          const jointNote = (measure.linear_feet_joints || 0) > 0
            ? " The floor has control joints — show them filled with joint filler as visible joint lines in the finished surface."
            : "";
          const prompt = `Photorealistic interior visualization of this exact space with the floor replaced by ${colorDesc}, ${ft.tone}. Match the color shown in the reference swatch. Keep the original camera perspective, walls, ceiling, lighting, and all non-floor surfaces identical and unmodified. Only the floor surface changes.${crackNote}${jointNote} Professional flooring contractor concept render.`;
          const refUrls = [...photoUrls];
          if (floorType === "metallic_multi") {
            multiColors.forEach((c) => { if (c.image_url) refUrls.push(c.image_url); });
          } else if (selectedColor?.image_url) {
            refUrls.push(selectedColor.image_url);
          }
          const { url } = await base44.integrations.Core.GenerateImage({ prompt, existing_image_urls: refUrls });
          const labelColors = floorType === "metallic_multi"
            ? multiColors.map((c) => c.color_name).join(" + ")
            : selectedColor.color_name;
          const labelHex = floorType === "metallic_multi"
            ? multiColors.map((c) => c.hex).join(",")
            : selectedColor.hex;
          return { image_url: url, short: ft.short, label: `${labelColors} — ${ft.short}`, prompt, color_name: labelColors, color_hex: labelHex };
        })
      );
      setConcepts(results);
    } finally {
      setGenerating(false);
    }
  };

  const generateProposal = async () => {
    if (!customer.customer_name || !customer.email) return;
    if (!measure.square_feet) return;
    setGeneratingProposal(true);
    try {
      const { items: baseItems, subtotal: baseSubtotal } = buildLineItems(measure, system, rules);
      const customWithAmount = customItems.map((ci) => ({ ...ci, amount: ci.unit === "flat" ? ci.rate : ci.qty * ci.rate }));
      const items = [...baseItems, ...customWithAmount];
      const subtotal = baseSubtotal + customWithAmount.reduce((s, i) => s + i.amount, 0);
      const discount = customer.discount_type === "pct"
        ? { pct: customer.discount_value || 0, amount: 0 }
        : { amount: customer.discount_value || 0, pct: 0 };
      const { discountAmount, total } = applyDiscount(subtotal, discount);

      const specKey = FLOOR_TYPE_DISPLAY[floorType] || "Metallic Epoxy";
      const specs = generateSpecs(specKey, {
        needs_moisture_mitigation: measure.needs_moisture_mitigation,
        has_cracks: (measure.linear_feet_cracks || 0) > 0,
        has_joints: (measure.linear_feet_joints || 0) > 0,
        has_coving: measure.linear_feet_coving || 0,
        needs_perimeter: true,
      });

      const colorName = floorType === "metallic_multi"
        ? selectedColorIds.map((id) => colors.find((c) => c.id === id)?.color_name).filter(Boolean).join(" + ")
        : selectedColor?.color_name || "";
      const colorHex = floorType === "metallic_multi"
        ? selectedColorIds.map((id) => colors.find((c) => c.id === id)?.hex).filter(Boolean).join(",")
        : selectedColor?.hex || "";

      const proposalNumber = `VQ-${Date.now().toString().slice(-6)}`;
      const proposal = {
        company: { name: brand?.company_name || "Xtreme Polishing Systems", tagline: brand?.tagline || "National Concrete Polishing Division", logo_url: brand?.logo_url },
        customer: { name: customer.customer_name, email: customer.email, phone: customer.phone, address: customer.project_address },
        project: { systemName: system?.name, floorType: FLOOR_TYPE_DISPLAY[floorType], colorName, colorHex, sqft: measure.square_feet, spaceType: measure.space_type, condition: measure.condition },
        lineItems: items,
        subtotal,
        discount,
        discountAmount,
        total,
        desiredInstallDate: customer.desired_install_date,
        floorLogoDescription: customer.floor_logo_description,
        specs,
        proposalNumber,
      };
      const pText = buildProposalText(proposal);

      const discountExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const lead = await base44.entities.Lead.create({
        customer_name: customer.customer_name,
        email: customer.email,
        phone: customer.phone,
        project_address: customer.project_address,
        space_type: measure.space_type,
        photo_url: photoUrls[0] || "",
        system_id: system?.id,
        system_name: system?.name,
        finish: floorType,
        floor_type: FLOOR_TYPE_DISPLAY[floorType],
        color_name: colorName,
        color_hex: colorHex,
        square_feet: measure.square_feet,
        linear_feet_cracks: measure.linear_feet_cracks || 0,
        linear_feet_coving: measure.linear_feet_coving || 0,
        linear_feet_joints: measure.linear_feet_joints || 0,
        patch_count: measure.patch_count || 0,
        excessive_patch_count: measure.excessive_patch_count || 0,
        large_patch_count: measure.large_patch_count || 0,
        demolition_sqft: measure.demolition_sqft || 0,
        extra_prep: !!measure.extra_prep,
        has_joints: (measure.linear_feet_joints || 0) > 0,
        condition: measure.condition,
        needs_grinding: measure.needs_grinding,
        needs_moisture_mitigation: measure.needs_moisture_mitigation,
        discount_amount: discount.amount,
        discount_pct: discount.pct,
        discount_expires: discountExpires,
        desired_install_date: customer.desired_install_date || undefined,
        floor_logo_description: customer.floor_logo_description,
        proposal_total: total,
        specifications: specs,
        estimate_low: total,
        estimate_high: total,
        pricing_version: rules?.version,
        source: "visualizer",
        status: "proposal_sent",
        division: "National Concrete Polishing",
        notes: customer.notes,
      });

      await base44.entities.Proposal.create({
        lead_id: lead.id,
        company_name: brand?.company_name || "Xtreme Polishing Systems",
        scope_summary: `${FLOOR_TYPE_DISPLAY[floorType]} — ${measure.square_feet} sq ft — ${money(total)}`,
        packages: items,
        content_markdown: pText,
        version: "v1",
        status: "sent",
      });

      if (concepts.length) {
        await base44.entities.Visualization.bulkCreate(
          concepts.map((c, i) => ({
            lead_id: lead.id,
            option_index: i + 1,
            label: c.label,
            image_url: c.image_url,
            source_photo_url: photoUrls[0] || "",
            system_name: system?.name,
            finish: floorType,
            color_name: c.color_name,
            prompt: c.prompt,
            selected: (selectedConcept ?? 0) === i,
          }))
        );
      }

      await base44.entities.ActivityReceipt.create({
        lead_id: lead.id,
        actor: "Salesperson",
        action: "Proposal generated on-site",
        detail: `${FLOOR_TYPE_DISPLAY[floorType]} · ${measure.square_feet} sq ft · ${money(total)}`,
        category: "proposal",
      });

      setProposalData({ ...proposal, leadId: lead.id });
      setProposalText(pText);
      setLeadId(lead.id);
      setSigned(false);
      setTimeout(() => {
        document.getElementById("proposal-output")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } finally {
      setGeneratingProposal(false);
    }
  };

  const saveSignature = async (file) => {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Lead.update(leadId, {
        signature_url: file_url,
        signed_date: new Date().toISOString(),
        status: "won",
      });
      setSigned(true);
    } catch (e) {
      console.error(e);
    }
  };

  if (loadingRefs) {
    return <div className="py-24 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  const controls = floorType === "metallic_multi" ? (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] text-slate-500 mb-2">Floor type</p>
        <div className="flex flex-wrap gap-2">
          {FLOOR_TYPES.map((f) => (
            <button key={f.key} onClick={() => setFloorType(f.key)}
              className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${floorType === f.key ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <MultiColorPicker colors={colors} selectedIds={selectedColorIds} onChange={setSelectedColorIds} />
    </div>
  ) : (
    <FloorControls floorTypes={FLOOR_TYPES} floorType={floorType} onFloorType={setFloorType} colors={colors} selectedColorId={selectedColor?.id} onColor={setSelectedColor} />
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="On-site sales tool"
        title="Photo to proposal in seconds"
        description="Take a photo, pick the floor system, enter measurements, and generate a branded proposal with line-item pricing while you're standing on the job site."
      />

      <SectionCard index="01" title="Take / upload a photo of the floor" tag="On-site" tagTone="slate">
        <PhotoUpload photoUrls={photoUrls} onUploaded={(urls) => { setPhotoUrls(urls); setConcepts([]); setProposalData(null); }} />
      </SectionCard>

      <SectionCard index="02" title="Choose floor type & color, then generate a concept" tag="AI concept">
        <ConceptPreview
          photoUrls={photoUrls}
          concepts={concepts}
          loading={generating}
          onGenerate={generate}
          onSelect={setSelectedConcept}
          selectedIndex={selectedConcept}
          controls={controls}
          canGenerate={floorType === "metallic_multi" ? selectedColorIds.length >= 2 : !!selectedColor}
        />
      </SectionCard>

      <SectionCard index="03" title="Measurements & conditions" tag="Scope">
        <SalesMeasurementForm value={measure} onChange={setMeasure} />
      </SectionCard>

      <SectionCard index="04" title="Customer info, discount & install date" tag="Close" tagTone="green">
        <SalesCustomerForm value={customer} onChange={setCustomer} />
      </SectionCard>

      <SectionCard index="04b" title="Custom line items (add-ons & modifications)" tag="Flexible">
        <CustomLineItems items={customItems} onChange={setCustomItems} />
      </SectionCard>

      <div className="flex justify-center">
        <Button
          onClick={generateProposal}
          disabled={generatingProposal || !customer.customer_name || !customer.email || !measure.square_feet}
          className="bg-slate-900 hover:bg-slate-800 h-12 px-8 text-[14px] font-medium"
        >
          {generatingProposal ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
          {generatingProposal ? "Generating..." : "Generate Proposal"}
        </Button>
      </div>
      {!measure.square_feet && <p className="text-center text-[12px] text-slate-400">Enter square footage and customer info to generate the proposal.</p>}

      {proposalData && (
        <div id="proposal-output" className="space-y-5">
          <div className="flex items-center gap-2 text-emerald-600">
            <Check className="w-5 h-5" />
            <p className="text-[14px] font-medium">Proposal generated & saved to CRM</p>
          </div>
          <SectionCard index="05" title="Proposal preview" tag="Branded" tagTone="gold">
            <ProposalPreview proposal={proposalData} />
          </SectionCard>
          <SectionCard index="06" title="Client signature (e-sign)" tag="Sign" tagTone="gold">
            {signed ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                <Check className="w-5 h-5 mx-auto text-emerald-600" />
                <p className="mt-2 text-[14px] font-medium text-emerald-900">Proposal signed!</p>
                <p className="text-[12px] text-emerald-700 mt-1">Signature saved and lead marked as won.</p>
              </div>
            ) : (
              <>
                <p className="text-[12px] text-slate-500 mb-3">Hand your phone to the client to sign on screen, or send them the proposal link to sign remotely.</p>
                <SignaturePad onSave={saveSignature} />
              </>
            )}
          </SectionCard>
          <SectionCard index="07" title="Send / share the proposal" tag="Deliver" tagTone="green">
            <SharePanel proposalText={proposalText} customerEmail={customer.email} />
          </SectionCard>
        </div>
      )}
    </div>
  );
}