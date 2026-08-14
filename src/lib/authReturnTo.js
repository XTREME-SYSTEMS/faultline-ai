// Shared by the auth pages (Login, Register, and any page that resumes a flow
// after sign-in, e.g. the MCP OAuth consent page). Keep the redirect
// validation in one place — it is security-sensitive and easy to drift.

// Resolve ?returnTo= to a safe same-origin path, else "/".
//
// The same-origin check alone is not enough: a value like /.//evil.com or
// /\evil.com parses same-origin but normalizes to a protocol-relative
// //evil.com when assigned to location.href — an open redirect. So require the
// resolved path to be exactly one leading slash (no "//" prefix, no backslash).
export function safeReturnTo() {
  const raw = new URLSearchParams(window.location.search).get("returnTo");
  if (!raw) return "/app";
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return "/app";
    // Strip app-bootstrap params: app-params.js persists these from the URL into
    // localStorage before the SDK initializes, so a crafted returnTo could
    // otherwise poison the freshly issued session — repointing the app at an
    // attacker's backend (app_base_url/app_id/functions_version) or overwriting
    // the token. Normal app-flow params (e.g. the OAuth consent ctx) are kept.
    // The full app-params.js bootstrap set (src/lib/app-params.js) — any of
    // these in a crafted returnTo would be persisted at next load.
    for (const p of ["access_token", "clear_access_token", "app_id", "app_base_url", "functions_version", "from_url"]) {
      url.searchParams.delete(p);
    }
    const path = url.pathname + url.search;
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return "/app";
    return path;
  } catch {
    return "/app";
  }
}

// Branded variant: defaults to a consumer destination (e.g. /lgny) and never
// sends a visitor into the builder admin (/app). Used by the AUTO LEADS
// branded auth pages so rebranded-clone visitors don't land in XtremeOS.
export function brandedSafeReturnTo(defaultPath = "/lgny") {
  const raw = new URLSearchParams(window.location.search).get("returnTo");
  if (!raw) return defaultPath;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return defaultPath;
    for (const p of ["access_token", "clear_access_token", "app_id", "app_base_url", "functions_version", "from_url"]) {
      url.searchParams.delete(p);
    }
    const path = url.pathname + url.search;
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return defaultPath;
    if (path === "/app" || path.startsWith("/app/")) return defaultPath;
    return path;
  } catch {
    return defaultPath;
  }
}

export function sanitizeBrandedReturnToInUrl(defaultPath = "/lgny") {
  const safe = brandedSafeReturnTo(defaultPath);
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("returnTo", safe);
    window.history.replaceState({}, "", url);
  } catch {
    // non-fatal
  }
  return safe;
}

// Sanitize the ?returnTo= in the actual URL bar before calling SDK auth
// functions (loginViaEmailPassword, verifyOtp, loginWithProvider). The SDK
// does its own internal hard redirect by reading ?returnTo= from the URL —
// if a returnTo pointing to an external site (e.g. a rebranded clone) is
// sitting in the URL, the SDK could redirect there before our own
// window.location.href line runs. This replaces it with the safe same-origin
// destination so both the SDK's redirect and our fallback agree.
export function sanitizeReturnToInUrl() {
  const safe = safeReturnTo();
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("returnTo", safe);
    window.history.replaceState({}, "", url);
  } catch {
    // non-fatal — the safe value is still returned
  }
  return safe;
}