export const TOOL_CATEGORIES = [
  {
    id: 'discover',
    name: 'Discover & Scrape',
    icon: '🔍',
    color: '#5b7a9e',
    tools: [
      { id: 'discoverCompanies', label: 'Discover Companies', desc: 'Find new companies to audit by industry and location', params: [{ key: 'industry', label: 'Industry', type: 'text', placeholder: 'HVAC' }, { key: 'location', label: 'Location', type: 'text', placeholder: 'Texas' }] },
      { id: 'discoverIndustryOpportunities', label: 'Discover Industry Opportunities', desc: 'Scan an industry for automation, revenue, and competitive gaps', params: [{ key: 'industry', label: 'Industry', type: 'text', placeholder: 'dental' }, { key: 'location', label: 'Location', type: 'text', placeholder: 'California' }] },
      { id: 'scanIndustriesForNiches', label: 'Scan Industries for Niches', desc: 'Deep scan to find high-ROI niche opportunities (~45s)', params: [{ key: 'industry', label: 'Industry', type: 'text', placeholder: 'plumbing' }, { key: 'location', label: 'Location', type: 'text', placeholder: 'Florida' }] },
      { id: 'discoverMissingOpportunities', label: 'Discover Missing Opportunities', desc: 'Find opportunities not yet captured for a company', params: [{ key: 'company_id', label: 'Company', type: 'company_select' }] },
      { id: 'scanCompany', label: 'Scan Company', desc: 'Security and website intelligence scan', params: [{ key: 'company_id', label: 'Company', type: 'company_select' }] },
      { id: 'scanCompetitors', label: 'Scan Competitors', desc: 'Benchmark a company against its competitors', params: [{ key: 'company_id', label: 'Company', type: 'company_select' }] },
      { id: 'deepDiscoveryScan', label: 'Deep Discovery Scan', desc: 'Scrape all pages, detect exposed API keys/secrets, enumerate all faults', params: [{ key: 'company_id', label: 'Company', type: 'company_select' }] },
      { id: 'deepSecurityScan', label: 'Deep Security Scan', desc: 'Full security scan with header analysis and vulnerability detection', params: [{ key: 'company_id', label: 'Company', type: 'company_select' }] },
    ]
  },
  {
    id: 'audit',
    name: 'Audit & Security',
    icon: '🛡️',
    color: '#C63D34',
    tools: [
      { id: 'runSecurityPipeline', label: 'Run Security Pipeline', desc: 'Full 20-step security and business audit pipeline', params: [{ key: 'company_id', label: 'Company', type: 'company_select' }] },
      { id: 'securityComplianceCheck', label: 'Compliance Check', desc: 'Audit SOC 2, GDPR, HIPAA, PCI-DSS, CCPA readiness', params: [] },
      { id: 'securityPenTest', label: 'Security Pen Test', desc: 'Simulate adversarial attacks: cross-org access, injection, prompt injection', params: [] },
      { id: 'quantifyFindings', label: 'Quantify Findings', desc: 'Calculate revenue leak dollar ranges from audit findings', params: [{ key: 'audit_id', label: 'Audit', type: 'audit_select' }] },
      { id: 'computeSystemScore', label: 'Compute System Score', desc: 'Aggregate health score from QA, function, security, and autonomy metrics', params: [] },
    ]
  },
  {
    id: 'build',
    name: 'Build & Generate',
    icon: '🏗️',
    color: '#237A4B',
    tools: [
      { id: 'generateReport', label: 'Generate Report', desc: 'Board-ready executive report from audit findings', params: [{ key: 'audit_id', label: 'Audit', type: 'audit_select' }] },
      { id: 'generateRepairPlan', label: 'Generate Repair Plan', desc: 'Prioritized 30/60/90-day plan with owners, KPIs, effort estimates', params: [{ key: 'audit_id', label: 'Audit', type: 'audit_select' }] },
      { id: 'generateSecurityProposal', label: 'Generate Security Proposal', desc: 'Pricing breakdown and enhanced system summary', params: [{ key: 'company_id', label: 'Company', type: 'company_select' }] },
      { id: 'generateDeliverable', label: 'Generate Deliverable', desc: 'Proposal, website, brand, cost-ROI, or AI operating system', params: [{ key: 'company_id', label: 'Company', type: 'company_select' }, { key: 'deliverable_type', label: 'Type', type: 'select', options: ['client_proposal', 'website', 'brand', 'cost_roi', 'ai_operating_system'] }] },
      { id: 'generateUniversalPlan', label: 'Generate Universal Plan', desc: 'Full business plan + 8-asset brand pack from an idea or industry scan', params: [{ key: 'idea', label: 'Idea (optional)', type: 'text', placeholder: 'AI-powered dental practice management' }] },
      { id: 'generateAutomationEnhancements', label: 'Generate Automation Blueprints', desc: 'Industry-specific automation blueprints with ROI estimates', params: [{ key: 'industry', label: 'Industry', type: 'text', placeholder: 'HVAC' }, { key: 'opportunity_id', label: 'Opportunity ID (optional)', type: 'text', placeholder: 'opp_...' }] },
      { id: 'generateEnhancedSystem', label: 'Generate Enhanced System', desc: 'AI-enhanced system map with before/after states', params: [{ key: 'company_id', label: 'Company', type: 'company_select' }] },
      { id: 'mapCompanySystems', label: 'Map Company Systems', desc: "Clone a company's operational system map — nodes, edges, leak points", params: [{ key: 'company_id', label: 'Company', type: 'company_select' }] },
    ]
  },
  {
    id: 'outreach',
    name: 'Outreach',
    icon: '✉️',
    color: '#B88214',
    tools: [
      { id: 'draftOutreach', label: 'Draft Outreach', desc: 'Value-first outreach email from audit findings (auto-validated by QA gate)', params: [{ key: 'company_id', label: 'Company', type: 'company_select' }] },
      { id: 'sendApprovedOutreach', label: 'Send Approved Outreach', desc: 'Send an approved email — blocked unless QA passed', params: [{ key: 'draft_id', label: 'Draft ID', type: 'text', placeholder: 'draft_...' }] },
      { id: 'outreachGate', label: 'Outreach Gate', desc: 'Check approval status of an outreach draft', params: [{ key: 'draft_id', label: 'Draft ID', type: 'text', placeholder: 'draft_...' }] },
    ]
  },
  {
    id: 'sync',
    name: 'Sync & Export',
    icon: '🔄',
    color: '#5b7a9e',
    tools: [
      { id: 'syncToHubSpot', label: 'Sync to HubSpot', desc: 'Sync a company or opportunity to HubSpot CRM', params: [{ key: 'company_id', label: 'Company', type: 'company_select' }] },
      { id: 'pushOpportunityToHubSpot', label: 'Push Opportunity to HubSpot', desc: 'Create a HubSpot deal from an industry opportunity', params: [{ key: 'opportunity_id', label: 'Opportunity ID', type: 'text', placeholder: 'opp_...' }] },
      { id: 'exportToSheets', label: 'Export to Google Sheets', desc: 'Export audit data to a connected Google Sheet', params: [] },
      { id: 'driveSync', label: 'Drive Sync', desc: 'Export backups to or import evidence from Google Drive', params: [{ key: 'direction', label: 'Direction', type: 'select', options: ['export', 'import'] }] },
    ]
  },
  {
    id: 'heal',
    name: 'Auto-Heal & Auto-Code',
    icon: '🤖',
    color: '#8A641C',
    tools: [
      { id: 'sentinelReflect', label: 'Sentinel Reflect', desc: 'Root-cause analysis on failures — produces specific file:line fix recommendations', params: [{ key: 'flow_goal', label: 'Flow Goal', type: 'text', placeholder: 'Full system sweep' }] },
      { id: 'applyAutoFix', label: 'Apply Auto-Fix', desc: 'Generate structured code patches from root-cause analyses', params: [{ key: 'root_causes', label: 'Root Causes (JSON)', type: 'textarea', placeholder: '[{"failure":"...","root_cause":"...","file_path":"...","fix_recommendation":"..."}]' }] },
      { id: 'qaValidateStep', label: 'QA Validate', desc: 'Double-check any generated output for problems before client exposure', params: [{ key: 'target_type', label: 'Target Type', type: 'select', options: ['deliverable', 'plan', 'finding', 'system', 'website', 'workflow', 'outreach', 'general'] }, { key: 'content', label: 'Content', type: 'textarea', placeholder: 'Paste content to validate...' }] },
    ]
  },
  {
    id: 'headless',
    name: 'Headless Browser',
    icon: '🖥️',
    color: '#5b7a9e',
    tools: [
      { id: 'runHeadlessTest', label: 'Run Headless Test', desc: 'Simulate navigating pages, filling forms, typing, scrolling, clicking', params: [{ key: 'flow_goal', label: 'Flow Goal', type: 'text', placeholder: 'Login and navigate to overview' }] },
      { id: 'autonomousHeadlessScan', label: 'Autonomous Headless Scan', desc: 'Full autonomous sweep of all portal pages with verification', params: [] },
    ]
  },
  {
    id: 'monitor',
    name: 'Monitor',
    icon: '📊',
    color: '#237A4B',
    tools: [
      { id: 'monitoringOrchestrator', label: 'Monitoring Orchestrator', desc: 'Run all active monitoring rules and check for threshold breaches', params: [] },
      { id: 'rescanMonitor', label: 'Rescan Monitor', desc: 'Check which companies are due for a rescan', params: [] },
      { id: 'weeklyDigest', label: 'Weekly Digest', desc: 'Generate a weekly summary of all system activity', params: [] },
    ]
  },
  {
    id: 'system',
    name: 'System',
    icon: '⚙️',
    color: '#666',
    tools: [
      { id: 'setupRagDatabase', label: 'Setup RAG Database', desc: 'Initialize the RAG search database with existing data', params: [] },
      { id: 'getPortalData', label: 'Get Portal Data', desc: 'Fetch all portal data for the current organization', params: [] },
      { id: 'getCustomerPortalData', label: 'Get Customer Portal Data', desc: 'Fetch customer-facing portal data for a specific company', params: [{ key: 'company_id', label: 'Company', type: 'company_select' }] },
    ]
  },
];

export const AGENTS = [
  { id: 'faultline_qa', name: 'FaultLine QA', desc: 'Autonomous QA, validation, headless testing, and compliance agent', icon: '🛡️' },
  { id: 'faultline_builder', name: 'FaultLine Builder', desc: 'Guides creation of client-ready assets and automation improvements', icon: '🏗️' },
  { id: 'faultline_assistant', name: 'FaultLine Assistant', desc: 'Business diagnostic expert — analyzes audit findings and revenue leaks', icon: '🧠' },
  { id: 'faultline_sentinel', name: 'FaultLine Sentinel', desc: 'Autonomous headless testing with self-reflection and self-healing', icon: '🤖' },
  { id: 'faultline_autocoder', name: 'FaultLine AutoCoder', desc: 'Autonomous coding agent — generates code patches from QA reports', icon: '🔧' },
];