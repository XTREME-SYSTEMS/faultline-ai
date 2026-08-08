// Double-validation system for resource cleanup.
// Ensures the system can autonomously delete test/stalled resources during
// provisioning WITHOUT ever touching important (passed/deployed) data.
//
// Two validation layers:
//   1. CLASSIFY — sort LaunchProjects into PROTECTED (good) vs CANDIDATE (test)
//   2. VERIFY — before deleting any resource, confirm it is NOT linked to a
//      PROTECTED project and the linked CANDIDATE project is still stalled.
//
// Any resource that fails verification is BLOCKED and logged, never deleted.

export function classifyProject(p) {
  if (!p) return 'unknown';
  // PROTECTED = successfully launched and validated — never delete
  if (p.status === 'passed') return 'protected';
  if (p.vercel_deployment_url && (p.parity_score || 0) >= 60) return 'protected';
  // CANDIDATE = stalled, failed, or never deployed — safe to clean up
  if (['generating', 'failed', 'queued', 'retrying', 'provisioning', 'validating', 'testing'].includes(p.status)) return 'candidate';
  // Default: treat as protected (safer)
  return 'protected';
}

// Build a set of resource identifiers that must NEVER be deleted (from protected projects)
export function buildProtectedRegistry(projects) {
  const registry = { github: new Set(), vercel: new Set(), supabase: new Set(), drive: new Set() };
  for (const p of projects) {
    if (classifyProject(p) !== 'protected') continue;
    if (p.github_repo_url) registry.github.add(normalizeGithubUrl(p.github_repo_url));
    if (p.vercel_deployment_url) registry.vercel.add(normalizeVercelName(p.vercel_deployment_url));
    if (p.vercel_project_url) registry.vercel.add(normalizeVercelName(p.vercel_project_url));
    if (p.supabase_project_url) registry.supabase.add(extractSupabaseRef(p.supabase_project_url));
    if (p.drive_folder_url) registry.drive.add(extractDriveId(p.drive_folder_url));
  }
  return registry;
}

// Extract a normalized identifier from each URL type
export function normalizeGithubUrl(url) {
  if (!url) return null;
  const m = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  return m ? `${m[1]}/${m[2]}`.toLowerCase() : null;
}
export function normalizeVercelName(url) {
  if (!url) return null;
  // vercel.com/team/name or https://project-name.vercel.app
  const m = url.match(/vercel\.com\/[^/]+\/([^/?#]+)/) || url.match(/^https?:\/\/([^./]+)\.vercel\.app/);
  return m ? m[1].toLowerCase() : null;
}
export function extractSupabaseRef(url) {
  if (!url) return null;
  const m = url.match(/project\/([^/?#]+)/);
  return m ? m[1] : null;
}
export function extractDriveId(url) {
  if (!url) return null;
  const m = url.match(/folders\/([^?#]+)/) || url.match(/file\/d\/([^?#]+)/);
  return m ? m[1] : null;
}

// Double-validation: returns { safe: bool, reason: string }
// Layer 1: Is this resource in the PROTECTED registry? → BLOCK
// Layer 2: Is the linked project still a CANDIDATE (re-checked)? → BLOCK if not
export function validateDeletion(resourceType, resourceId, linkedProject, protectedRegistry) {
  if (!resourceId) return { safe: false, reason: 'No resource ID provided' };

  const id = typeof resourceId === 'string' ? resourceId.toLowerCase() : resourceId;

  // Layer 1: Protected registry check
  if (protectedRegistry && protectedRegistry[resourceType]) {
    for (const protectedId of protectedRegistry[resourceType]) {
      if (protectedId && id === protectedId) {
        return { safe: false, reason: `BLOCKED: resource ${id} is linked to a PROTECTED (passed/deployed) project` };
      }
    }
  }

  // Layer 2: Linked project re-verification
  if (linkedProject) {
    const classification = classifyProject(linkedProject);
    if (classification !== 'candidate') {
      return { safe: false, reason: `BLOCKED: linked project ${linkedProject.project_name} is classified as ${classification} (not candidate)` };
    }
  }

  // Layer 3: Test pattern check (fl-test-* is always safe)
  const isTestPattern = /^fl-test-/i.test(String(resourceId));
  if (isTestPattern) return { safe: true, reason: 'Test pattern (fl-test-*) — validated' };

  // If linked to a candidate project, safe
  if (linkedProject && classifyProject(linkedProject) === 'candidate') {
    return { safe: true, reason: `Linked to stalled project ${linkedProject.project_name} (status: ${linkedProject.status})` };
  }

  // No linked project and not a test pattern — block for safety
  return { safe: false, reason: 'BLOCKED: no linked candidate project and not a test pattern — requires manual review' };
}