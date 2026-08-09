export const publicNav = [
  ['Product', '/product'], ['Solutions', '/solutions'], ['Industries', '/industries'],
  ['How It Works', '/how-it-works'], ['Pricing', '/pricing'], ['Resources', '/resources']
];

export const portalNavCategories = [
  {
    step: 1,
    label: 'Command',
    icon: '◈',
    items: [
      ['Overview', '/app'],
      ['Command Center', '/app/command-center'],
      ['ROI Dashboard', '/app/roi'],
      ['Chat', '/app/chat'],
      ['Trends', '/app/trends']
    ]
  },
  {
    step: 2,
    label: 'Discover & Diagnose',
    icon: '◇',
    items: [
      ['Discovery Engine', '/app/discovery-engine'],
      ['Company Discovery', '/app/company-discovery'],
      ['System Clone', '/app/system-clone'],
      ['Security Pipeline', '/app/security-pipeline'],
      ['Industry Opportunities', '/app/industry-opportunities'],
      ['Audits', '/app/audits'],
      ['Website Intelligence', '/app/website-intelligence'],
      ['System Map', '/app/system-map'],
      ['Revenue Leaks', '/app/revenue-leaks'],
      ['Risk Register', '/app/risk-register'],
      ['AI Readiness', '/app/ai-readiness']
    ]
  },
  {
    step: 3,
    label: 'Build & Generate',
    icon: '⬡',
    items: [
      ['Website Generator', '/app/website-generator'],
      ['App Generator', '/app/app-generator'],
      ['Business Generator', '/app/business'],
      ['Universal Generator', '/app/universal-generator'],
      ['Brand & Image Studio', '/app/brand-generator'],
      ['Universal Builder', '/app/universal-builder'],
      ['Visual Media Studio', '/app/visual-studio'],
      ['Autonomous Launch', '/app/projects']
    ]
  },
  {
    step: 4,
    label: 'Client Delivery',
    icon: '◐',
    items: [
      ['Client Projects', '/app/client-projects'],
      ['Client Portal', '/app/client-portal'],
      ['Client Portal Wizard', '/app/client-setup'],
      ['Client Demo Portal', '/app/demo-portal'],
      ['Deliverable Studio', '/app/deliverable-studio'],
      ['QA & Validation', '/app/qa-center'],
      ['Repair Plans', '/app/repair-plans'],
      ['Repair Board', '/app/repair-board']
    ]
  },
  {
    step: 5,
    label: 'Grow & Sell',
    icon: '◆',
    items: [
      ['Competitive Intel', '/app/competitive-intel'],
      ['Implementation Marketplace', '/app/marketplace'],
      ['PCU Marketplace', '/app/pcu-marketplace'],
      ['Audit Templates', '/app/audit-templates'],
      ['Leads', '/app/leads'],
      ['Outreach', '/app/outreach'],
      ['Business Builder', '/app/business-builder']
    ]
  },
  {
    step: 6,
    label: 'Operations',
    icon: '⬢',
    items: [
      ['Enhancement Engine', '/app/enhancement-engine'],
      ['PCU Control Center', '/app/pcu-control'],
      ['AI Control Panel', '/app/ai-control'],
      ['AI Tool Advisor', '/app/tool-advisor'],
      ['XPS Catalog', '/app/xps-catalog'],
      ['Xtreme Visualizer', '/app/xv'],
      ['Monitoring', '/app/monitoring'],
      ['Reports', '/app/reports'],
      ['Tasks', '/app/tasks'],
      ['Team', '/app/team']
    ]
  },
  {
    step: 7,
    label: 'Financials',
    icon: '◈',
    items: [
      ['FaultBooks', '/app/books'],
      ['QuickBooks Sync', '/app/financial-sync'],
      ['FaultSign (E-Sign)', '/app/esign'],
      ['E-Signature (Legacy)', '/app/e-signature'],
      ['Billing', '/app/billing']
    ]
  },
  {
    step: 8,
    label: 'Admin',
    icon: '⚙',
    items: [
      ['Setup Wizard', '/app/setup'],
      ['White-Label', '/app/white-label'],
      ['Partner API', '/app/partner-api'],
      ['Integrations', '/app/integrations'],
      ['Drive Sync', '/app/drive-sync'],
      ['Drive Workspace', '/app/drive-workspace'],
      ['Settings', '/app/settings']
    ]
  }
];

// Flat list kept for backward compatibility (search, etc.)
export const portalNav = portalNavCategories.flatMap(c => c.items);

export const modules = {
  audits: { title: 'AI Audits', eyebrow: 'Diagnose', description: 'Run scoped business, website, operational, and AI-readiness audits with evidence-backed findings.', outcomes: ['Audit scope builder', 'Evidence timeline', 'Human review queue', 'Executive report'] },
  'website-intelligence': { title: 'Website Intelligence', eyebrow: 'Analyze', description: 'Evaluate positioning, content, conversion, accessibility, trust, mobile experience, and technical fundamentals.', outcomes: ['Page inventory', 'Conversion gap map', 'Trust review', 'Repair brief'] },
  'company-discovery': { title: 'Company Discovery', eyebrow: 'Discover', description: 'Research authorized public information and create private opportunity records.', outcomes: ['Allowlisted sources', 'Source provenance', 'Opportunity scoring', 'Research receipts'] },
  'system-map': { title: 'System Map', eyebrow: 'Map', description: 'Visualize tools, teams, handoffs, approvals, data movement, and failure points.', outcomes: ['System nodes', 'Workflow edges', 'Ownership gaps', 'Integration risks'] },
  'revenue-leaks': { title: 'Revenue Leaks', eyebrow: 'Quantify', description: 'Model the financial impact of missed leads, pricing leakage, unbilled work, churn, and friction.', outcomes: ['Impact ranges', 'Assumptions log', 'Confidence scoring', 'Recovery scenarios'] },
  'risk-register': { title: 'Risk Register', eyebrow: 'Control', description: 'Track operational, data, security, compliance, and dependency risks with ownership.', outcomes: ['Likelihood and impact', 'Control recommendations', 'Responsible owner', 'Resolution evidence'] },
  'ai-readiness': { title: 'AI Readiness', eyebrow: 'Prepare', description: 'Score data, process, technology, governance, security, and people readiness before automating.', outcomes: ['Readiness score', 'Gap analysis', 'Governance checklist', '90-day preparation plan'] },
  'repair-plans': { title: 'Repair Plans', eyebrow: 'Repair', description: 'Turn findings into prioritized 30-, 60-, and 90-day plans with owners and time to value.', outcomes: ['Quick wins', 'Priority roadmap', 'Task generation', 'Outcome tracking'] },
  'business-builder': { title: 'Business Builder', eyebrow: 'Build', description: 'Define offers, operating procedures, go-to-market systems, roles, and measurement plans.', outcomes: ['Offer architecture', 'Workflow blueprint', 'SOP drafts', 'Growth cadence'] },
  outreach: { title: 'Outreach', eyebrow: 'Offer value', description: 'Create helpful, evidence-based outreach drafts that remain approval-gated before sending.', outcomes: ['Value-first drafts', 'Evidence references', 'Approval queue', 'Opt-out controls'] },
  leads: { title: 'Leads', eyebrow: 'Pipeline', description: 'Track discovered opportunities, qualification, conversations, and next actions.', outcomes: ['Opportunity scores', 'Research status', 'Contact history', 'Conversion stages'] },
  tasks: { title: 'Tasks', eyebrow: 'Execute', description: 'Assign, prioritize, and verify repair actions across teams.', outcomes: ['Owner and due date', 'Evidence attachments', 'Approval states', 'Completion validation'] },
  projects: { title: 'Projects', eyebrow: 'Deliver', description: 'Coordinate customer audits, repair programs, and implementation handoffs.', outcomes: ['Milestones', 'Workstreams', 'Dependencies', 'Client visibility'] },
  reports: { title: 'Reports', eyebrow: 'Explain', description: 'Generate executive summaries, failure maps, revenue reports, and repair plans.', outcomes: ['Board-ready exports', 'Source appendix', 'Confidence notes', 'Version history'] },
  monitoring: { title: 'Monitoring', eyebrow: 'Watch', description: 'Continuously observe approved signals and surface meaningful changes.', outcomes: ['Monitoring rules', 'Alert thresholds', 'Five-minute orchestration', 'Dead-letter recovery'] },
  team: { title: 'Team', eyebrow: 'Govern', description: 'Manage members, roles, permissions, reviewers, and ownership.', outcomes: ['Role-based access', 'Workspace invitations', 'Reviewer assignments', 'Audit history'] },
  integrations: { title: 'Integrations', eyebrow: 'Connect', description: 'Configure data sources through controlled, least-privilege connectors.', outcomes: ['Connector status', 'Scope review', 'Sync history', 'Revocation controls'] },
  billing: { title: 'Billing', eyebrow: 'Subscribe', description: 'Manage plans, invoices, usage, and test-mode subscription entitlements.', outcomes: ['Plan management', 'Usage records', 'Invoice history', 'Cancellation controls'] },
  settings: { title: 'Settings', eyebrow: 'Configure', description: 'Manage workspace settings, retention, exports, and deletion controls.', outcomes: ['Organization profile', 'Data controls', 'Notifications', 'Security settings'] }
};

export const marketing = {
  product: ['The product', 'Business intelligence built for action.', 'FaultLine AI connects diagnosis, evidence, prioritization, repair, and monitoring in one private operating system.', ['Evidence-centered audits', 'Revenue and risk modeling', 'Human approval', 'Repair roadmaps', 'Continuous monitoring', 'Secure customer delivery']],
  solutions: ['Solutions', 'Find the cracks that matter most.', 'Run focused diagnostics or use the full operating system across website, revenue, operations, technology, and AI readiness.', ['Website intelligence', 'Operational audits', 'Revenue leak detection', 'System mapping', 'AI readiness', 'Repair and monitoring']],
  industries: ['Industries', 'Designed for operationally complex businesses.', 'FaultLine AI begins where handoffs, field operations, estimating, fulfillment, and fragmented systems create expensive blind spots.', ['Construction', 'Manufacturing', 'Distribution', 'Multi-location services', 'Agencies', 'Professional services']],
  'how-it-works': ['How it works', 'From uncertainty to an accountable repair plan.', 'The platform follows a disciplined cycle: discover, diagnose, quantify, repair, and validate.', ['Define audit scope', 'Connect approved sources', 'Collect evidence', 'Review findings', 'Generate actions', 'Measure results']],
  pricing: ['Pricing', 'Start with a focused diagnostic.', 'Launch with a small defensible engagement and expand only when the evidence supports more work.', ['Free initial scan', 'Paid diagnostic', 'Full operational audit', 'Repair roadmap', 'Continuous monitoring', 'Enterprise governance']],
  resources: ['Resources', 'Practical intelligence for operators.', 'Playbooks, audit guides, readiness checklists, and repair templates built to turn insight into action.', ['AI readiness checklist', 'Website conversion audit', 'Revenue worksheet', 'System mapping guide', 'Repair template', 'Evidence policy']],
  security: ['Trust center', 'Private by design. Evidence before accusation.', 'FaultLine AI is designed for confidential diagnostics, controlled access, tenant isolation, and human review.', ['Role-based access', 'Organization isolation', 'Private evidence storage', 'Audit logs', 'Deletion controls', 'Approval gates']],
  about: ['About', 'A better way to confront business failure.', 'The platform replaces vague consulting theater with source-backed findings and accountable repair.', ['Private diagnostics', 'Transparent confidence', 'Operational focus', 'Measured outcomes', 'Responsible AI', 'Human judgment']],
  contact: ['Talk to us', 'Bring one expensive question.', 'Start with a focused issue such as lost leads, weak conversion, pricing leakage, broken handoffs, or AI readiness.', ['Confidential discovery', 'Clear scope', 'No public exposure', 'No surprise implementation', 'Evidence-first', 'Operator-led']]
};

export const problems = [
  ['Missed leads', 'Prospects fall through gaps between marketing, sales, and delivery.'],
  ['Weak websites', 'Unclear positioning and poor trust signals suppress conversion.'],
  ['Broken workflows', 'Manual handoffs and duplicate work slow execution.'],
  ['Pricing leakage', 'Discounts and unbilled work quietly drain margin.'],
  ['Disconnected systems', 'Fragmented tools hide the truth and create rework.'],
  ['Poor AI readiness', 'Automating unstable processes creates faster failure.']
];

export const capabilities = [
  'Website Intelligence', 'Operational Audits', 'System Mapping', 'Revenue Leak Detection',
  'Risk Register', 'AI Readiness', 'Repair Roadmaps', 'Business Builder',
  'Outreach Assistance', 'Customer Portal', 'Reports', 'Continuous Monitoring'
];

export const steps = [
  ['01', 'Connect & discover', 'Share goals, approved sources, and the question that matters.'],
  ['02', 'Analyze & diagnose', 'Specialized agents map evidence across systems and workflows.'],
  ['03', 'Quantify & prioritize', 'Score confidence, impact, effort, and ownership.'],
  ['04', 'Repair & improve', 'Create 30-, 60-, and 90-day actions with measurable outcomes.'],
  ['05', 'Monitor & scale', 'Validate results and surface meaningful changes.']
];