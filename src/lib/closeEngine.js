import { money } from "./pricing";
import { specsToText } from "./floorSpecs";

// Good / Better / Best package tiers, per the Quote-to-Close package engine.
// factor is applied to the midpoint of the lead's preliminary estimate range.
export const PACKAGE_TIERS = [
  { id: "good", name: "Essential", margin: 0.32, factor: 0.85, blurb: "Core scope, standard surface protection, 1-year workmanship warranty placeholder." },
  { id: "better", name: "Recommended", margin: 0.38, factor: 1.0, blurb: "Enhanced prep, premium guard sealer, extended protection, priority scheduling.", recommended: true },
  { id: "best", name: "Premier", margin: 0.43, factor: 1.22, blurb: "Phased execution, highest finish level, dedicated crew, priority support." },
];

export function buildPackages(lead, rangeOverride) {
  const low = Number(rangeOverride?.low ?? lead.adjusted_low ?? lead.estimate_low ?? 0);
  const high = Number(rangeOverride?.high ?? lead.adjusted_high ?? lead.estimate_high ?? 0);
  const base = (low + high) / 2 || 0;
  return PACKAGE_TIERS.map((t) => ({
    id: t.id,
    name: t.name,
    margin: t.margin,
    recommended: !!t.recommended,
    price: Math.max(Math.round((base * t.factor) / 25) * 25, 0),
    detail: t.blurb,
  }));
}

export function proposalPrompt(lead, packages, brand) {
  const pkgLines = packages
    .map((p) => `- ${p.name}: ${money(p.price)} (target gross margin ${Math.round(p.margin * 100)}%) — ${p.detail}`)
    .join("\n");
  return [
    "Write a professional, branded flooring proposal in Markdown for a contractor to review before sending.",
    `Brand: ${brand?.company_name || "VisualQuote Pro"}`,
    brand?.tagline ? `Tagline: ${brand.tagline}` : "",
    `Customer: ${lead.customer_name}`,
    `Project address: ${lead.project_address || "—"}`,
    `Space: ${lead.space_type}`,
    `System: ${lead.system_name || "—"} · finish ${lead.finish || "—"} · color ${lead.color_name || "—"}`,
    `Area: ${lead.square_feet || "—"} sq ft, condition ${lead.condition}`,
    `Prep: ${lead.needs_grinding ? "diamond grinding" : "no grinding"}${lead.needs_moisture_mitigation ? ", moisture mitigation" : ""}`,
    `Crack repair: ${lead.linear_feet_cracks || 0} lf, coving: ${lead.linear_feet_coving || 0} lf`,
    lead.has_joints ? `Joints: present — joint filler required` : "",
    `Preliminary range: ${money(lead.adjusted_low ?? lead.estimate_low)} – ${money(lead.adjusted_high ?? lead.estimate_high)}`,
    "",
    lead.specifications && lead.specifications.length > 0
      ? `Full scope of work specifications (${lead.floor_type || lead.system_name || ""}):\n${specsToText(lead.specifications)}`
      : "",
    "",
    "Packages:",
    pkgLines,
    "",
    "Include these sections as Markdown headings:",
    "# Cover (company name, customer, date, proposal title)",
    "## Executive Summary",
    "## Understanding of the Project",
    "## Scope of Work (include every specification item listed above as a detailed line item — concrete grinding, surface preparation, perimeter protection with plastic and tape, moisture mitigation, joint filler, base coats, color coats, topcoats including polyaspartic / urethane / T200, cove base, and final inspection)",
    "## Deliverables",
    "## Packages (Good / Better / Best with the prices above)",
    "## Schedule (placeholder, subject to site verification)",
    "## Pricing (preliminary, non-binding)",
    "## Assumptions",
    "## Exclusions",
    "## Allowances",
    "## Warranty (placeholder — requires qualified review)",
    "## Change-Order Process",
    "## Payment Schedule (draft only)",
    "## Acceptance",
    "## Disclosures",
    "",
    "Rules: Never state a final price, fixed completion date, warranty, engineering suitability, or code compliance. Describe pricing only as a preliminary range subject to site verification. Label assumptions explicitly. Under 650 words.",
  ].filter(Boolean).join("\n");
}

export const EMAIL_TYPES = [
  { id: "clarification", label: "Clarification request" },
  { id: "proposal_delivery", label: "Proposal delivery" },
  { id: "viewed_no_response", label: "Viewed, no response" },
  { id: "reminder", label: "Reminder" },
  { id: "objection", label: "Objection response" },
  { id: "revised_proposal", label: "Revised proposal" },
  { id: "acceptance_confirmation", label: "Acceptance confirmation" },
  { id: "signature_reminder", label: "Signature reminder" },
  { id: "deposit_reminder", label: "Deposit reminder" },
  { id: "lost_feedback", label: "Lost-deal feedback" },
];

export function emailPrompt(lead, typeId, brand) {
  const type = EMAIL_TYPES.find((t) => t.id === typeId) || { label: typeId };
  return [
    "Write a professional follow-up email DRAFT from a flooring contractor to a prospective customer.",
    `From: ${brand?.company_name || "VisualQuote Pro"}`,
    brand?.tagline ? `Brand line: ${brand.tagline}` : "",
    `To customer: ${lead.customer_name}`,
    `Project: ${lead.space_type} — ${lead.system_name || "flooring"} (${lead.square_feet || "—"} sq ft)`,
    `Preliminary range: ${money(lead.adjusted_low ?? lead.estimate_low)} – ${money(lead.adjusted_high ?? lead.estimate_high)}`,
    `Message purpose: ${type.label}`,
    "",
    'Return JSON with "subject" (string) and "body" (string, plain text, under 220 words).',
    "Rules: No false scarcity or invented savings. No final price, fixed date, or warranty claim. No signature, payment, or e-sign activation language. This is a draft for human review. Do not claim it was sent.",
  ].filter(Boolean).join("\n");
}

export const EMAIL_JSON_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
  },
  required: ["subject", "body"],
};