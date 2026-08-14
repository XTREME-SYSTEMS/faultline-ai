# MASTER PROMPT: Rebuild the Autonomous Clone System

## CONTEXT

You are rebuilding the autonomous website cloning pipeline in an existing Base44 app (FaultLine AI / AUTO LEADS). The current system clones websites, scores them for parity (0-100), heals broken clones, and deploys them to Vercel. The system is functional but has systemic problems discovered during a deep forensic audit. Your job is to rebuild the clone engine, heal logic, and queue management to be reliable, efficient, and self-correcting.

## CURRENT PROBLEMS (what you must fix)

1. **504 Gateway Timeouts** — heal functions run >300s and get killed by the platform. Batch sizes were too large. The fix was to reduce batches to 1, but the real problem is a monolithic heal function that does everything in one call.
2. **Score-0 Heal Failures** — `autonomousCloneTo100` returns score 0 on hard targets (JS-heavy SPAs, dead sites). The heal logic rebuilds from scratch instead of surgically fixing specific issues, often producing a worse result than the original clone.
3. **Duplicate Clone Proliferation** — the system creates new LaunchProject records for the same URL without checking if one already exists. 11 duplicates were cleaned up manually. There is no deduplication on queue entry.
4. **Dead-Site Waste** — unreachable/parked domains get queued and cloned repeatedly, wasting Vercel quota and heal cycles. There is no liveness pre-check before cloning starts.
5. **No Security Headers** — clones deployed without CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy. (A `vercel.json` injection was added to `deployToVercel` as a stopgap — your rebuild must make this the default architecture, not a patch.)
6. **Vercel Project Proliferation** — each heal/redeploy creates a NEW Vercel project instead of redeploying to the existing one, burning quota.
7. **Stale QA Reports** — QA report statuses don't match actual clone scores, making the system health score inaccurate.
8. **No Content Validation** — a clone can deploy (200 OK) but render blank or missing sections, and still get queued for healing that can't fix it.
9. **Synchronous Blocking** — the pipeline runs synchronously, so a single slow clone blocks the entire queue.

## DESIGN PRINCIPLES

1. **Audit-first, deduplicate on entry** — never clone a URL that's already been cloned or is already in the queue. Check liveness before queuing.
2. **Surgical healing, not rebuild-from-scratch** — identify the specific failure (missing section, broken image, score gap) and fix only that. Never rebuild a clone that already has a score >0 unless the score gap is >50 points.
3. **One Vercel project per clone, redeploy forever** — create the project once, redeploy updated HTML to the same project. Never create a second project for the same clone.
4. **Security by default** — every deployment includes a `vercel.json` with all 5 security headers. This is architecture, not a patch.
5. **Score-gated progression** — a clone advances through pipeline stages only when it passes the gate for that stage. A score-0 clone doesn't get healing attempts; it gets one rebuild, then quarantine if it fails again.
6. **Dead-site quarantine** — automatically detect unreachable/parked domains and quarantine them so they never re-enter the queue.
7. **Modular pipeline** — separate functions for each step: `preflightCheck` → `cloneTarget` → `validateClone` → `scoreClone` → `healClone` (surgical) → `deployClone`. Each runs in <60s. No monolithic 300s functions.
8. **Background processing with progress tracking** — the queue processor moves items to the next stage and exits. A scheduled workflow picks up items in intermediate stages. No synchronous end-to-end processing.
9. **Content validation before scoring** — verify the deployed clone has real content (title, body text, images loaded) before running the parity score. A blank render is a build failure, not a score-0.
10. **Exponential backoff on heal failures** — a clone that fails healing N times gets quarantined, not retried forever.

---

## ENTITY CHANGES

### 1. Modify `CloneQueue` entity (`base44/entities/CloneQueue.jsonc`)

Add these fields:
```jsonc
{
  "url_hash": { "type": "string", "description": "SHA-256 of the normalized target_url — used for deduplication. Unique index." },
  "liveness_checked": { "type": "boolean", "default": false },
  "liveness_status": { "type": "string", "enum": ["alive", "dead", "parked", "redirected", "unknown"], "default": "unknown" },
  "final_vercel_project_id": { "type": "string", "description": "The single Vercel project for this clone — reused across all redeployments" },
  "heal_attempts": { "type": "number", "default": 0 },
  "max_heal_attempts": { "type": "number", "default": 3 },
  "last_heal_action": { "type": "string", "enum": ["rebuild", "surgical_fix", "quarantined", "none"], "default": "none" },
  "content_validated": { "type": "boolean", "default": false },
  "quarantined": { "type": "boolean", "default": false },
  "quarantine_reason": { "type": "string" }
}
```

Add `quarantined` to the status enum.

### 2. Modify `LaunchProject` entity (`base44/entities/LaunchProject.jsonc`)

Add these fields:
```jsonc
{
  "url_hash": { "type": "string", "description": "SHA-256 of the normalized benchmark_url — dedup key" },
  "vercel_project_id": { "type": "string", "description": "Single Vercel project — reused for all redeployments, never duplicated" },
  "content_hash": { "type": "string", "description": "SHA-256 of the deployed HTML — skip redeploy if unchanged" },
  "validation_stage": { "type": "string", "enum": ["pending", "content_validated", "scored", "healed", "passed", "failed"], "default": "pending" },
  "heal_history": { "type": "array", "items": { "type": "object", "properties": { "action": { "type": "string" }, "before_score": { "type": "number" }, "after_score": { "type": "number" }, "timestamp": { "type": "string", "format": "date-time" }, "fix_applied": { "type": "string" } } } }
}
```

---

## BACKEND FUNCTIONS TO CREATE

Create each as a separate file in `base44/functions/<name>/entry.ts`. Each must complete in <60 seconds.

### 1. `preflightCheck` — Liveness + Dedup Gate
**Input:** `{ target_url }`
**Logic:**
- Normalize the URL (strip trailing slash, lowercase domain, remove tracking params).
- Compute `url_hash = SHA-256(normalized_url)`.
- Check if a `CloneQueue` or `LaunchProject` with the same `url_hash` already exists. If yes, return `{ status: "duplicate", existing_id }`.
- Fetch the URL with a 15s timeout. Check: is it alive (200)? Is it parked (contains "domain is for sale" / registrar page)? Did it redirect to a different domain?
- If dead/parked/redirected: return `{ status: "quarantine", reason }`.
- If alive: return `{ status: "proceed", url_hash, final_url, title }`.

### 2. `cloneTarget` — Single Clone Step
**Input:** `{ queue_id, target_url }`
**Logic:**
- Fetch the target HTML (use Browserbase for JS-heavy sites if a simple fetch returns <5KB or has no `<body>`).
- Strip all scripts that reference the original domain's analytics/tracking.
- Inject the security header meta tags as a fallback (the `vercel.json` handles HTTP headers, but meta tags are belt-and-suspenders).
- Create ONE Vercel project (store `vercel_project_id` on the LaunchProject). If a project already exists for this clone, reuse it.
- Deploy via `deployToVercel` (which now includes `vercel.json` with security headers).
- Update the LaunchProject: `status = "validating"`, `vercel_deployment_url`, `content_hash`.
- Return the deployment URL. Do NOT score here — that's a separate step.

### 3. `validateCloneContent` — Content Validation Gate
**Input:** `{ launch_project_id }`
**Logic:**
- Fetch the deployed clone URL.
- Check: does it have a `<title>`? Does the `<body>` have >500 chars of text content? Are there images (and do at least 50% have valid `src` attributes)?
- If content is blank/broken: mark `validation_stage = "failed"`, return `{ status: "failed", reason: "blank_render" | "missing_content" }`.
- If content is present: mark `validation_stage = "content_validated"`, return `{ status: "proceed" }`.
- This gate prevents score-0 clones from entering the heal loop — a blank render is a build failure, not a low score.

### 4. `scoreClone` — Parity Scoring
**Input:** `{ launch_project_id }`
**Logic:**
- Fetch both the original target and the deployed clone.
- Compare: title match, meta description match, heading structure (H1/H2 count), image count, text content similarity (cosine similarity on text vectors or simpler: Jaccard on word sets), link structure.
- Score 0-100. Store as `parity_score`.
- If score >= 80: `validation_stage = "scored"`, `status = "passed"`.
- If score 50-79: `validation_stage = "scored"`, `status = "validating"` (needs surgical heal).
- If score < 50: `validation_stage = "scored"`, `status = "failed"` (needs rebuild).
- Return the score and the specific gaps (missing headings, image count diff, text similarity).

### 5. `healCloneSurgical` — Targeted Fix (NOT rebuild)
**Input:** `{ launch_project_id }`
**Logic:**
- Read the score gaps from the last `scoreClone` run.
- Apply ONLY the specific fix needed:
  - Missing headings → inject heading structure from the original.
  - Image count mismatch → re-fetch and re-inject missing images.
  - Text similarity low → re-fetch the original's body text and replace the clone's body.
  - Title mismatch → replace the `<title>`.
- Redeploy to the SAME Vercel project (never create a new one).
- Re-score. If score improved, keep. If score dropped, ROLL BACK to the previous HTML (store the previous `content_hash` and redeploy it).
- Record the heal in `heal_history` with before/after scores and the fix applied.
- If `heal_attempts >= max_heal_attempts` and still < 80: quarantine.

### 6. `rebuildClone` — Full Rebuild (only for score < 50 or blank render)
**Input:** `{ launch_project_id }`
**Logic:**
- Only called when `scoreClone` returns < 50 OR `validateCloneContent` fails.
- Re-clone from scratch using Browserbase (the simple fetch likely failed).
- Deploy to the SAME Vercel project.
- Re-validate content. If still blank: quarantine.
- If content is present: re-score. If still < 50 after one rebuild: quarantine (don't rebuild twice).

### 7. `quarantineClone` — Dead-Site Isolation
**Input:** `{ launch_project_id, reason }`
**Logic:**
- Set `status = "quarantined"`, `quarantined = true`, `quarantine_reason = reason`.
- Update the linked CloneQueue item to `status = "cancelled"`, `quarantined = true`.
- Do NOT delete the Vercel project (keep it for reference, but it won't be healed).
- Return the quarantine record.

### 8. `processCloneQueueV2` — Queue Orchestrator (replaces `processCloneQueue`)
**Input:** `{ batch_limit = 3 }`
**Logic:**
- Select up to `batch_limit` queue items in status `queued` that have passed preflight (or haven't been preflighted yet).
- For each: call `preflightCheck` if not done. If duplicate or dead: skip/quarantine. If alive: create a LaunchProject, call `cloneTarget`, then exit.
- Select up to `batch_limit` items in `validating` status: call `validateCloneContent`. If failed: call `rebuildClone` or `quarantineClone`. If passed: advance to scoring.
- Select up to `batch_limit` items ready for scoring: call `scoreClone`. Based on score: advance to `passed`, queue for `healCloneSurgical`, or `rebuildClone`.
- Select up to `batch_limit` items needing heal: call `healCloneSurgical`.
- Each sub-step is a separate function call that completes in <60s. The orchestrator just moves items between stages and exits. A scheduled workflow re-invokes it every 2 minutes.
- **Critical:** the orchestrator never blocks. It processes one stage per item per run, then exits. The workflow handles re-invocation.

---

## WORKFLOWS

### 1. `Clone Pipeline Orchestrator` (replaces all existing clone workflows)
- **Trigger:** `scheduled` — every 2 minutes.
- **Activity:** `invoke_backend_function` → `processCloneQueueV2` with `{ batch_limit: 3 }`.
- This single workflow replaces the 5+ separate workflows (Clone Queue Processor, Finish Stalled Clones, Force Clones to 100, Recursive Auto-Heal, Nightly Operations). One orchestrator, one schedule.

### 2. `Nightly System Health Recompute`
- **Trigger:** `scheduled` — daily at 3 AM.
- **Activity:** `invoke_backend_function` → `computeSystemScore`.
- **Then:** `invoke_backend_function` → bulk-recalculate QA report statuses based on actual clone scores (score >= 80 → passed, 50-79 → warnings, < 50 → failed).

---

## SHARED INFRASTRUCTURE CHANGES

### `base44/shared/launchInfra.ts`

The `deployToVercel` function must ALWAYS include a `vercel.json` file with security headers in every deployment. This is already implemented — keep it. The rebuild must:

1. Add a `redeployToVercel` function that redeploys to an EXISTING project (pass `projectId` to the deployment API, don't create a new project). This is the only deploy function the heal pipeline should call.

2. Add a `computeUrlHash(url)` utility that normalizes and hashes URLs — used by `preflightCheck` and dedup logic.

3. Keep `deployToVercel` for first-time deploys (creates the project), and add `redeployToVercel` for subsequent deploys (reuses the project). The heal pipeline calls `redeployToVercel` exclusively.

---

## IMPLEMENTATION STEPS

Execute in this order:

1. **Add `url_hash` and new fields** to `CloneQueue` and `LaunchProject` entities. Backfill `url_hash` for all existing records using `exec_tool` (compute SHA-256 of normalized `target_url` / `benchmark_url`).

2. **Create `base44/shared/launchInfra.ts` additions:** `redeployToVercel` and `computeUrlHash`. Keep the existing `deployToVercel` with the `vercel.json` security headers.

3. **Create the 8 backend functions** listed above. Each in its own `base44/functions/<name>/entry.ts`. Test each individually with `test_backend_function` before wiring the orchestrator.

4. **Create the `Clone Pipeline Orchestrator` workflow** — scheduled every 2 minutes, calls `processCloneQueueV2`. Archive the 5 old clone workflows (Clone Queue Processor, Finish Stalled Clones, Force Clones to 100, Recursive Auto-Heal, Nightly Autonomous Operations).

5. **Create the `Nightly System Health Recompute` workflow.**

6. **Migrate existing data:** For all existing LaunchProjects with `parity_score >= 80`, set `validation_stage = "passed"` and `status = "passed"`. For score 50-79, set `validation_stage = "scored"` and `status = "validating"`. For score < 50, set `validation_stage = "scored"` and `status = "failed"`. Quarantine any with dead/unreachable `vercel_deployment_url`.

7. **Deduplicate existing clones:** For each `url_hash` group, keep the highest-scoring LaunchProject, quarantine the rest (don't delete — keep for reference).

8. **Test end-to-end:** Queue a new URL → verify it goes through preflight → clone → validate → score → (heal if needed) → passed. Queue a dead URL → verify it gets quarantined. Queue a duplicate URL → verify it's rejected.

---

## ACCEPTANCE CRITERIA

The rebuild is complete when:

1. **No 504 timeouts** — every backend function completes in < 60 seconds. The orchestrator processes items in small batches and exits.

2. **No duplicate clones** — queuing a URL that's already cloned or in the queue returns "duplicate" and does not create a new record.

3. **Dead sites quarantined within 1 cycle** — a dead/parked URL is detected at preflight and never enters the clone pipeline.

4. **Security headers on every deployment** — all clones (new and healed) return CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy in their HTTP response headers.

5. **One Vercel project per clone** — healing a clone redeploys to the same Vercel project. No new projects are created for existing clones. Vercel project count stays stable.

6. **Surgical heals improve scores** — a heal that drops the score is rolled back automatically. Heals never produce a score lower than the input. If 3 heal attempts don't reach 80, the clone is quarantined (not retried forever).

7. **Content validation gates scoring** — a blank/broken render is caught at `validateCloneContent` and either rebuilt or quarantined — it never enters the score-0 heal loop.

8. **System health score > 85** — `computeSystemScore` returns overall > 85, with QA pass rate > 70%, after the rebuild stabilizes. The trend is "improving" or "stable".

9. **Gallery health > 80%** — > 80% of gallery clones have parity_score >= 80.

10. **Queue drains** — the CloneQueue backlog processes to completion (all items reach `passed`, `failed`, or `quarantined` — none stuck in `queued` or `cloning`).

---

## IMPORTANT CONSTRAINTS

- **Use only installed packages** — React, tailwind, shadcn/ui, lucide-react, @base44/sdk, etc. Do not install new npm packages.
- **Use the pre-initialized `base44` client** — `import { base44 } from '@/api/base44Client'` on the frontend; `createClientFromRequest(req)` in backend functions.
- **Secrets are already set** — VERCEL_TOKEN, VERCEL_TEAM_ID, BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, GITHUB_TOKEN, SUPABASE_ACCESS_TOKEN. Read them via `secrets.get('NAME')` in backend functions.
- **Backend functions use Deno runtime** — `import { secrets } from 'base44:runtime'`, `import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40'`. No `require()`.
- **Each function must complete in < 60 seconds** — the platform kills functions at ~300s. Design for 60s max. If a step takes longer, split it.
- **Vercel API** — `https://api.vercel.com/v13/deployments`. Send `Authorization: Bearer ${token}`. Include `vercel.json` in the files array for security headers. To redeploy to an existing project, pass `project: projectId` in the deployment body.
- **Browserbase** — for JS-heavy SPA sites that return blank on simple fetch. Use the existing `base44/shared/browserbase.ts` helper. Only use Browserbase when a simple fetch fails (it's slow and costs credits).
- **Do not delete existing functions** — create new ones (V2 variants where needed). Once the new pipeline is stable and the old workflows are archived, the old functions can be removed in a cleanup pass.
- **RLS** — all entities use organization-scoped RLS: `data.organization_id = {{user.data.organization_id}}` for read/create/update. Keep this pattern on all new/modified entities.
- **Keep the `deployToVercel` security-header injection** — it's already in `base44/shared/launchInfra.ts`. Your `redeployToVercel` must also include the `vercel.json`.

---

## SUMMARY OF THE ARCHITECTURE

```
URL enters → preflightCheck (dedup + liveness)
                ↓ duplicate → reject
                ↓ dead → quarantineClone
                ↓ alive → cloneTarget (fetch + deploy to NEW Vercel project)
                              ↓
                        validateCloneContent (is the render blank?)
                              ↓ blank → rebuildClone (Browserbase) → re-validate → still blank → quarantine
                              ↓ OK → scoreClone (parity 0-100)
                                          ↓ >= 80 → PASSED
                                          ↓ 50-79 → healCloneSurgical (targeted fix + redeploy to SAME project + re-score + rollback if worse)
                                          ↓ < 50 → rebuildClone → re-score → still < 50 → quarantine
```

Every step is a separate < 60s function. The `Clone Pipeline Orchestrator` workflow runs every 2 minutes, calls `processCloneQueueV2`, which moves items between stages and exits. No synchronous end-to-end processing. No monolithic 300s functions. No duplicate clones. No dead-site waste. Security headers on every deploy. Surgical heals with rollback. Score-gated progression with quarantine as the terminal state for unfixable clones.