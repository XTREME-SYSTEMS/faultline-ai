// Shared helpers for clone-queue processing functions.
// Used by processCloneQueue and processEpoxyBatch.

export const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms)
    )
  ]);

export const isGatewayTimeout = (err) => {
  const msg = (err?.message || '').toLowerCase();
  return msg.includes('524') || msg.includes('gateway') || msg.includes('timed out') || msg.includes('timeout');
};

export async function findTracker(base44, orgId, targetUrl) {
  try {
    const candidates = await base44.asServiceRole.entities.LaunchProject.filter(
      { organization_id: orgId, benchmark_url: targetUrl }, '-created_date', 3
    );
    return candidates[0] || null;
  } catch { return null; }
}