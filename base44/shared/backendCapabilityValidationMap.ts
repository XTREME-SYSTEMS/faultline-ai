// BACKEND_CAPABILITY_VALIDATION_MAP — P0-5
//
// Maps all 37 v75 backend capabilities to validation chains.
// A capability becomes VALIDATED only when ALL its required chain evidence passes.
//
// Chains are EVIDENCE MECHANISMS for capabilities — they are NOT the denominator.
// BACKEND_VALIDATION_COVERAGE = VALIDATED_CAPABILITIES / 37.
//
// Chain → Capability mapping:
//   CHAIN-AUTH:       IDENTITY, AUTHENTICATION, SESSIONS, PROFILE, ACCOUNT_STATE
//   CHAIN-SEARCH:     SEARCH, FILTER, SORT, PAGINATION, CATALOG, CATEGORY_BROWSE,
//                     SUBCATEGORY_BROWSE, TAXONOMY, TAGGING, FACETS, ITEM_DETAIL,
//                     RELATED_CONTENT, AUTHORS, MEDIA
//   CHAIN-CHECKOUT:   SUBSCRIPTIONS, CHECKOUT, ENTITLEMENTS, DOWNLOADS,
//                     DOWNLOAD_HISTORY, LICENSE_RECORDS
//   CHAIN-AI:         AI_TOOLS, AI_USAGE, MEDIA_PROCESSING, CONTENT_INGESTION
//   CHAIN-FORM:       FORM_PROCESSING, AUDIT, FAVORITES, COLLECTIONS, LIBRARY,
//                     ADMIN_CATALOG, RATE_CONTROL, ERROR_RECOVERY

export interface CapabilityValidationEntry {
  capability_id: string;
  validation_chain_ids: string[];
  required_steps: string[];
  critical: boolean;
  implementation_status: 'not_discovered' | 'discovered' | 'modeled' | 'implemented' | 'validated' | 'partial' | 'blocked' | 'not_applicable_with_proof';
  latest_evidence: string;
  validated_status: 'pending' | 'validated' | 'failed';
}

export const VALIDATION_CHAINS = {
  'CHAIN-AUTH': {
    chain_name: 'Authentication Chain',
    chain_id: 'CHAIN-AUTH',
    capabilities: ['IDENTITY', 'AUTHENTICATION', 'SESSIONS', 'PROFILE', 'ACCOUNT_STATE'],
    required_steps: [
      'signup_or_login_route_present',
      'credentials_form_renders',
      'auth_request_executed',
      'session_created',
      'protected_state_accessible',
      'logout_destroys_session',
      'unauthorized_access_denied',
    ],
    repair_function: 'repairBackendChain',
    safe_to_autofix: true,
    approval_required: false,
  },
  'CHAIN-SEARCH': {
    chain_name: 'Search & Browse Chain',
    chain_id: 'CHAIN-SEARCH',
    capabilities: ['SEARCH', 'FILTER', 'SORT', 'PAGINATION', 'CATALOG', 'CATEGORY_BROWSE', 'SUBCATEGORY_BROWSE', 'TAXONOMY', 'TAGGING', 'FACETS', 'ITEM_DETAIL', 'RELATED_CONTENT', 'AUTHORS', 'MEDIA'],
    required_steps: [
      'search_input_present',
      'search_query_executes',
      'results_render',
      'filter_controls_present',
      'sort_controls_present',
      'pagination_present',
      'category_browse_works',
      'item_detail_loads',
    ],
    repair_function: 'repairBackendChain',
    safe_to_autofix: true,
    approval_required: false,
  },
  'CHAIN-CHECKOUT': {
    chain_name: 'Checkout & Subscription Chain',
    chain_id: 'CHAIN-CHECKOUT',
    capabilities: ['SUBSCRIPTIONS', 'CHECKOUT', 'ENTITLEMENTS', 'DOWNLOADS', 'DOWNLOAD_HISTORY', 'LICENSE_RECORDS'],
    required_steps: [
      'pricing_plan_selection_present',
      'test_subscription_state_created',
      'entitlement_state_set',
      'ui_confirmation_shown',
      'subscription_persisted',
      'reload_preserves_state',
      'download_endpoint_exists',
      'license_record_created',
    ],
    repair_function: 'repairBackendChain',
    safe_to_autofix: true,
    approval_required: false, // Test/fixture mode — no real charges
  },
  'CHAIN-AI': {
    chain_name: 'AI Tool Chain',
    chain_id: 'CHAIN-AI',
    capabilities: ['AI_TOOLS', 'AI_USAGE', 'MEDIA_PROCESSING', 'CONTENT_INGESTION'],
    required_steps: [
      'ai_route_present',
      'prompt_input_renders',
      'ai_request_executed',
      'backend_execution_proven',
      'loading_state_shown',
      'result_rendered',
      'error_path_handled',
      'usage_tracked',
    ],
    repair_function: 'repairBackendChain',
    safe_to_autofix: true,
    approval_required: false,
  },
  'CHAIN-FORM': {
    chain_name: 'Form & Persistence Chain',
    chain_id: 'CHAIN-FORM',
    capabilities: ['FORM_PROCESSING', 'AUDIT', 'FAVORITES', 'COLLECTIONS', 'LIBRARY', 'ADMIN_CATALOG', 'RATE_CONTROL', 'ERROR_RECOVERY'],
    required_steps: [
      'form_present_on_page',
      'form_submit_handler_wired',
      'validation_performed',
      'backend_persistence_proven',
      'response_rendered',
      'ui_state_updated',
      'reload_preserves_data',
    ],
    repair_function: 'repairBackendChain',
    safe_to_autofix: true,
    approval_required: false,
  },
} as const;

export const CHAIN_IDS = Object.keys(VALIDATION_CHAINS) as (keyof typeof VALIDATION_CHAINS)[];

// ─── CAPABILITY → CHAIN REVERSE MAP ────────────────────────────────────
export const CAPABILITY_TO_CHAINS: Record<string, string[]> = {};
for (const [chainId, chain] of Object.entries(VALIDATION_CHAINS)) {
  for (const capId of chain.capabilities) {
    if (!CAPABILITY_TO_CHAINS[capId]) CAPABILITY_TO_CHAINS[capId] = [];
    CAPABILITY_TO_CHAINS[capId].push(chainId);
  }
}

// ─── GET CAPABILITIES FOR A CHAIN ──────────────────────────────────────
export function getCapabilitiesForChain(chainId: string): string[] {
  return (VALIDATION_CHAINS as any)[chainId]?.capabilities || [];
}

// ─── GET CHAIN IDS FOR A CAPABILITY ─────────────────────────────────────
export function getChainsForCapability(capabilityId: string): string[] {
  return CAPABILITY_TO_CHAINS[capabilityId] || [];
}

// ─── GET REQUIRED STEPS FOR A CHAIN ─────────────────────────────────────
export function getRequiredStepsForChain(chainId: string): string[] {
  return (VALIDATION_CHAINS as any)[chainId]?.required_steps || [];
}

// ─── GET REPAIR FUNCTION FOR A CHAIN ────────────────────────────────────
export function getRepairFunctionForChain(chainId: string): string {
  return (VALIDATION_CHAINS as any)[chainId]?.repair_function || 'repairBackendChain';
}

// ─── CHECK IF CAPABILITY IS CRITICAL ────────────────────────────────────
export function isCapabilityCritical(capabilityId: string): boolean {
  const criticalCaps = new Set([
    'IDENTITY', 'AUTHENTICATION', 'SESSIONS', 'CHECKOUT', 'ENTITLEMENTS',
    'DOWNLOADS', 'LICENSE_RECORDS', 'SUBSCRIPTIONS',
  ]);
  return criticalCaps.has(capabilityId);
}

// ─── GET ALL 37 CAPABILITY IDS ──────────────────────────────────────────
export function getAllCapabilityIds(): string[] {
  return Object.keys(CAPABILITY_TO_CHAINS);
}

// ─── DEFECT STRUCTURE (P0-2) ────────────────────────────────────────────
export interface ChainDefect {
  defect_id: string;
  chain_id: string;
  capabilities_affected: string[];
  failure_step: string;
  expected_behavior: string;
  actual_behavior: string;
  root_cause_layer: 'frontend_missing' | 'backend_missing' | 'persistence_missing' | 'integration_missing' | 'configuration_missing' | 'auth_missing' | 'not_applicable';
  repair_function: string;
  safe_to_autofix: boolean;
  approval_required: boolean;
  test_plan: string;
  rollback_plan: string;
}