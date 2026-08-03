import { money } from "./pricing";
import { generateSpecs } from "./floorSpecs";

export const ADDER_DEFS = [
  { key: "excessive_patch_count", label: "Excessive patchwork (beyond normal)", rateField: "excess_patch_rate", unit: "each" },
  { key: "large_patch_count", label: "Large hole / deep spall repair", rateField: "large_patch_rate", unit: "each" },
  { key: "demolition_sqft", label: "Demolition / coating removal", rateField: "demolition_rate", unit: "sq ft" },
];

export const DEFAULT_SALES_RATES = {
  joint_filler_rate: 4.5,
  patch_rate: 35,
  excess_patch_rate: 25,
  large_patch_rate: 150,
  demolition_rate: 3,
  extra_prep_rate: 250,
};

export function buildLineItems(measure, system, rules) {
  const r = { ...DEFAULT_SALES_RATES, ...(rules || {}) };
  const sqft = Number(measure.square_feet) || 0;
  const items = [];

  const baseRate = ((Number(system?.base_rate_low) || 0) + (Number(system?.base_rate_high) || 0)) / 2;
  if (sqft && baseRate) {
    items.push({ label: `${system?.name || "Floor system"} — ${sqft.toLocaleString()} sq ft`, detail: system?.description || "", qty: sqft, unit: "sq ft", rate: baseRate, amount: sqft * baseRate });
  }
  if (measure.needs_grinding && sqft) {
    items.push({ label: "Diamond grinding surface prep", detail: "Mechanical grind to CSP-2/CSP-3 profile", qty: sqft, unit: "sq ft", rate: r.prep_grinding_rate, amount: sqft * r.prep_grinding_rate });
  }
  if (measure.needs_moisture_mitigation && sqft) {
    items.push({ label: "Moisture mitigation barrier", detail: "Vapor barrier primer per mfg specs", qty: sqft, unit: "sq ft", rate: r.moisture_mitigation_rate, amount: sqft * r.moisture_mitigation_rate });
  }
  const cracks = Number(measure.linear_feet_cracks) || 0;
  if (cracks) {
    items.push({ label: "Crack repair", detail: "Epoxy repair mortar, ground flush", qty: cracks, unit: "lf", rate: r.crack_repair_rate, amount: cracks * r.crack_repair_rate });
  }
  const joints = Number(measure.linear_feet_joints) || 0;
  if (joints) {
    items.push({ label: "Joint filler (polyurea)", detail: "Semi-rigid polyurea, shaved flush", qty: joints, unit: "lf", rate: r.joint_filler_rate, amount: joints * r.joint_filler_rate });
  }
  const patches = Number(measure.patch_count) || 0;
  if (patches) {
    items.push({ label: "Surface patchwork / spall repair", detail: "Epoxy repair mortar for pop-outs & defects", qty: patches, unit: "each", rate: r.patch_rate, amount: patches * r.patch_rate });
  }
  const coving = Number(measure.linear_feet_coving) || 0;
  if (coving) {
    items.push({ label: "Cove base installation", detail: "Epoxy cove base at perimeter walls", qty: coving, unit: "lf", rate: r.coving_rate, amount: coving * r.coving_rate });
  }
  for (const ad of ADDER_DEFS) {
    const qty = Number(measure[ad.key]) || 0;
    if (qty > 0) {
      const rate = r[ad.rateField] || 0;
      items.push({ label: ad.label, detail: "", qty, unit: ad.unit, rate, amount: qty * rate });
    }
  }
  if (measure.extra_prep) {
    items.push({ label: "Excessive job site prep (extra plastics, masking)", detail: "Additional containment & surface protection", qty: 1, unit: "flat", rate: r.extra_prep_rate, amount: r.extra_prep_rate });
  }
  items.push({ label: "Mobilization & site setup", detail: "Equipment, materials, crew mobilization", qty: 1, unit: "flat", rate: r.mobilization_fee, amount: r.mobilization_fee });

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  return { items, subtotal };
}

export function applyDiscount(subtotal, discount) {
  const amt = Number(discount?.amount) || 0;
  const pct = Number(discount?.pct) || 0;
  const discountAmount = amt > 0 ? amt : Math.round(subtotal * (pct / 100));
  return { discountAmount, total: Math.max(subtotal - discountAmount, 0) };
}

export const WARRANTY_TEXT = `WORKMANSHIP WARRANTY

Xtreme Polishing Systems — National Concrete Polishing Division warrants that the flooring installation will be free from defects in workmanship for a period of two (2) years from the date of substantial completion. This warranty covers peeling, delamination, and blistering of the applied floor system under normal use and maintenance conditions.

This warranty does not cover:
• Damage caused by moisture vapor transmission exceeding manufacturer specifications
• Structural movement, cracking, or settling of the concrete substrate
• Abuse, impact damage, or improper maintenance
• Chemical exposure beyond the system's published resistance specifications
• Damage from acts of nature, flooding, or fire
• Normal wear and tear in high-traffic areas

To file a warranty claim, contact your local Xtreme Polishing Systems location in writing within the warranty period. Xtreme Polishing Systems will, at its option, repair or replace the defective portion of the installation at no cost to the customer.`;

export const FINE_PRINT = `TERMS AND CONDITIONS

1. PROPOSAL VALIDITY: This proposal is valid for 30 days from the date of issue. Prices are based on the measurements and site conditions described above and are subject to change if actual site conditions differ.

2. DEPOSIT: A 50% deposit is required to secure your installation date and order materials. The remaining 50% is due upon substantial completion of the work.

3. SCHEDULE: The desired installation date is subject to crew availability and weather conditions. Final scheduling will be confirmed upon deposit receipt.

4. SITE CONDITIONS: Customer is responsible for ensuring the work area is clear of all personal belongings, vehicles, equipment, and obstructions prior to the crew's arrival. Xtreme Polishing Systems is not responsible for damage to items left in the work area.

5. UTILITIES: Customer must provide adequate electrical power (minimum 30A/220V for grinding equipment), water access, and climate control (50°F–90°F) for the duration of the installation.

6. CHANGE ORDERS: Any work beyond the scope described in this proposal will be billed as a change order at the rates listed above, subject to customer approval before work begins.

7. EXCLUSIONS: This proposal does not include moving heavy objects, demolition of existing flooring (unless specified above), plumbing or electrical modifications, or repair of structural defects.

8. INSURANCE: Xtreme Polishing Systems is a fully licensed and insured contractor. Certificates of insurance are available upon request.

9. PAYMENT: Net due upon completion. Late payments subject to 1.5% monthly interest. A mechanics lien may be filed on unpaid balances per state law.

10. GOVERNING LAW: This agreement shall be governed by the laws of the state in which the project is located.`;

export function buildProposalText(proposal) {
  const { company, customer, project, lineItems, subtotal, discount, discountAmount, total, desiredInstallDate, floorLogoDescription, specs, proposalNumber } = proposal;
  const L = [];
  L.push(`${company.name || "Xtreme Polishing Systems"}`);
  L.push(company.tagline || "National Concrete Polishing Division");
  L.push("");
  L.push("FLOORING PROPOSAL");
  L.push(`Date: ${new Date().toLocaleDateString()}`);
  L.push(`Proposal #: ${proposalNumber || "—"}`);
  L.push("");
  L.push("CUSTOMER:");
  L.push(`  ${customer.name}`);
  if (customer.address) L.push(`  ${customer.address}`);
  if (customer.phone) L.push(`  ${customer.phone}`);
  if (customer.email) L.push(`  ${customer.email}`);
  L.push("");
  L.push("PROJECT SCOPE:");
  L.push(`  Floor System: ${project.systemName}`);
  L.push(`  Floor Type: ${project.floorType}`);
  L.push(`  Color: ${project.colorName}`);
  L.push(`  Area: ${project.sqft.toLocaleString()} sq ft`);
  L.push(`  Space: ${project.spaceType}`);
  L.push(`  Slab Condition: ${project.condition}`);
  if (desiredInstallDate) L.push(`  Desired Installation Date: ${desiredInstallDate}`);
  if (floorLogoDescription) L.push(`  Floor Logo: ${floorLogoDescription}`);
  L.push("");
  L.push("SCOPE OF WORK:");
  if (specs && specs.length) {
    specs.forEach((s, i) => {
      L.push(`  ${i + 1}. ${s.label}`);
      if (s.detail) L.push(`     ${s.detail}`);
    });
  }
  L.push("");
  L.push("PRICING BREAKDOWN:");
  lineItems.forEach((item) => {
    L.push(`  ${item.label}  —  ${item.qty} ${item.unit} @ ${money(item.rate)} = ${money(item.amount)}`);
  });
  L.push("");
  L.push(`  Subtotal: ${money(subtotal)}`);
  if (discountAmount > 0) {
    L.push(`  Discount: -${money(discountAmount)}${discount.pct ? ` (${discount.pct}%)` : ""}`);
    L.push(`  ** 24-HOUR OFFER: This discount is valid only if you sign or call back within 24 hours. **`);
  }
  L.push(`  TOTAL: ${money(total)}`);
  L.push("");
  L.push(WARRANTY_TEXT);
  L.push("");
  L.push(FINE_PRINT);
  L.push("");
  L.push("ACCEPTANCE:");
  L.push("  By signing below, the customer agrees to the scope, price, and terms above.");
  L.push("");
  L.push("  Customer Signature: ____________________________  Date: __________");
  L.push("");
  L.push("  XPS Representative: ____________________________  Date: __________");
  L.push("");
  L.push("This proposal was generated on-site by your Xtreme Polishing Systems sales representative.");
  return L.join("\n");
}