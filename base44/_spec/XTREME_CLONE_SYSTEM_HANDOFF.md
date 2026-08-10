# Xtreme Clone System — Full Handoff Document

**Domain:** xtremeclonesystems.com
**Platform:** Base44 (Vite + React + Tailwind, BaaS backend)
**Last Updated:** 2026-08-10

---

## 1. System Overview

The Xtreme Clone System is an autonomous, AI-driven platform that discovers, clones, audits, hardens, and deploys websites to 100/100 visual and operational parity. It then forms businesses around those clones and builds custom tools/apps to round out each operation.

### The 6-Step User Workflow
1. **Niche Search** → Find top-ranking sites in a target industry
2. **Clone Queue** → Queue sites for autonomous cloning (type a URL, voice input, or bulk paste)
3. **Clone Studio** → Customize branding, apply rebrands, surgical content edits
4. **Clone Gallery** → Browse finished clones with live Vercel deployment links
5. **Business Hub** → Form a DBA or LLC to legitimize the new cloned business
6. **Build Studio** → Build custom apps, websites, and tools from scratch

### What Runs Autonomously (No User Action Needed)
- **Discovery:** Top sites for 80+ industries auto-discovered every 2 hours
- **Cloning:** Queue processed every 30 minutes (1 item per cycle)
- **Instant trigger:** New queue items fire immediately via entity-create workflow
- **Healing:** All gallery clones batch-healed to 100/100 every 30 min
- **Forensic audit:** Security headers, HTML structure, form handlers audited every 2 hours
- **Stuck recovery:** Stalled projects detected every 5 min and auto-resumed
- **Marketplace stocking:** New products generated nightly
- **System health:** Computed hourly; below 90 = auto-heal, below 75 = pen test + heal

---

## 2. Architecture & Tech Stack

### Frontend
- **React 18** + **Vite** (ESM, no CommonJS)
- **Tailwind CSS** with custom design tokens (gold/charcoal/ivory palette)
- **shadcn/ui** component library
- **lucide-react** icons
- **framer-motion** page transitions
- **next-themes** dark/light mode
- **PWA** installable (manifest + service worker + Apple touch icons)

### Backend
- **Base44 BaaS** — entities, backend functions (Deno/TypeScript), workflows, agents
- **Supabase** — production database, auth, RLS
- **Vercel** — clone deployments (VERCEL_TOKEN, VERCEL_TEAM_ID)
- **Browserbase** — stealth browser for scraping JS-heavy SPA sites (BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID)
- **GitHub** — repo creation for clones (GITHUB_TOKEN)
- **Stripe** — payments (test mode; STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET)

### Design System
- Fonts: `Libre Caslon Display` (headings), `DM Sans` (body)
- Colors: Gold `#C89B3C`, Charcoal `#090909`, Ivory `#FAF8F2`
- Token system in `src/index.css` → mapped in `tailwind.config.js`
- All pages use `XtremeOSSidebar` (240px fixed left) + content area

---

## 3. The Clone Pipeline (Core Lifecycle)

```
User adds URL → CloneQueue (status: queued)
                    ↓
         categorizeWebsite (AI auto-detects industry)
                    ↓
         Instant Clone Queue workflow fires (entity-create trigger)
                    ↓
         processCloneQueue picks item → marks "cloning"
                    ↓
         autonomousCloneTo100 (recursive engine):
           ├── deepCloneTarget (stealth scrape → design DNA + layout blueprint)
           ├── deterministicClone OR LLM generation (based on site complexity)
           ├── validateFullStack (parity score 0-100)
           ├── If < 100: heal loop (max 5 retries, convergence detection)
           └── LaunchProject tracks progress (0-100)
                    ↓
         forensicAuditAndHarden:
           ├── Security headers check
           ├── HTML structure validation
           ├── Form handler verification
           ├── Content depth audit
           ├── Auto-fix → auto-harden → re-validate
           └── QAReport created
                    ↓
         rigorousCloneGate (final 100/100 gate)
                    ↓
         assignVercelDomain → live deployment URL
                    ↓
         CloneQueue status: "passed" → appears in Clone Gallery
```

### 524 Gateway Timeout Handling
- Clones take 5-10 min; Base44 gateway times out at ~100s (524)
- 524s are treated as "in-progress" — the pipeline continues server-side
- `LaunchProject.progress` field (0-100) is the source of truth
- `Stuck Clone Recovery` workflow (every 5 min) resumes stalled projects
- Max 5 retry attempts per clone; after 5 failures → moved to Failed Clones card

---

## 4. Autonomous Workflows (Scheduled)

| Workflow | Schedule | Function | Purpose |
|---|---|---|---|
| **Instant Clone Queue** | On CloneQueue create | `processCloneQueue` | Process new item immediately (no 30-min wait) |
| **Clone Queue Processor** | Every 30 min | `processCloneQueue` | Process 1 queued item per cycle |
| **Auto Discovery & Queue** | Every 2 hours | `autoDiscoverAndQueue` | Discover top 5 sites for 10 random industries |
| **Recursive Auto-Heal to 100** | Every 30 min | `healAllClonesTo100` → `forensicAuditAndHarden` | Batch-heal all clones + forensic audit |
| **Rigorous Gallery Guard** | Every 2 hours | `rigorousGalleryGuard` | Re-audit every gallery clone back to 100/100 |
| **Stuck Clone Recovery** | Every 5 min | `resumeStuckClones` | Detect + resume stalled projects (killed waitUntil) |
| **Nightly Autonomous Operations** | Every 30 min (6pm–noon) | `healAllClonesTo100` → `forensicAuditAndHarden` → `autonomousMarketplaceStocker` → `discoverTopPerformers` | Full nightly cycle: heal, audit, stock, discover |
| **Persistent Hardening** | Every hour | `computeSystemScore` → (switch) → `securityPenTest` / `sentinelReflect` + `applyAutoFix` | Health score gate: <90 heal, <75 pen test + heal |
| **Auto Heal Loop** | Every 6 hours | `sentinelReflect` → `applyAutoFix` → `computeSystemScore` | Detect → reflect → fix → re-test closed loop |
| **Top Performer Discovery** | Daily 3am | `discoverTopPerformers` | Scan high-profit industries for top sites |
| **Autonomous Discovery** | Daily 9am | `discoverCompanies` | Web search for new businesses |

### Additional Workflows (Legacy/Supporting)
- Lead Follow-up, Lead Nurture Sequence, Outreach Approval Gate
- Security Sentinel, Competitive Intel Alert
- XPS Catalog Sync, PCU Fulfillment Flow
- Re-scan Monitor, Re-scan Notification
- Autonomous Code Engine, Autonomous Build Loop
- Autonomous Wealth Engine, Universal Discovery Loop
- Autonomous Headless Scanner, Autonomous Scanner
- Autonomous Launch Pipeline, Autonomous Reporter
- Monitoring Orchestrator, Auto Quantify & Repair
- Opportunity to HubSpot Deal, Weekly Digest
- Deposit Onboarding

---

## 5. Key Entities

### Clone System Core
| Entity | Purpose |
|---|---|
| **CloneQueue** | Queue of sites to clone (URL, industry, status, score, vercel_url) |
| **LaunchProject** | Tracks a clone through the pipeline (progress 0-100, parity_score, status) |
| **TopPerformer** | Discovered top sites with full analysis (DNA, benchmark report) |
| **UniversalCatalog** | Master catalog of discovered platforms/tools/sites |
| **IndustryOpportunity** | Industry-level opportunity analysis |
| **QAReport** | QA validation results (parity, security, compliance) |
| **WorkflowRun** | Tracks workflow execution state |

### Business & Commerce
| Entity | Purpose |
|---|---|
| **BusinessProject** | Business formation projects (DBA/LLC) |
| **ToolProduct** | Digital products in the Toolio marketplace |
| **ProductPackage** | Bundled product packages |
| **Subscription** | Customer subscriptions (Stripe-linked) |
| **CartOrder** | Store cart orders |
| **CustomerAccount** | CRM customer accounts |
| **ProductEntitlement** | Product access entitlements |

### Operations & Finance
| Entity | Purpose |
|---|---|
| **Invoice** / **Expense** / **LedgerAccount** | Books/accounting |
| **SignatureEnvelope** | E-signature documents |
| **Receipt** | System activity receipts (audit trail) |
| **SystemConfig** | Organization-level configuration |
| **WhiteLabelConfig** | White-label agency settings |
| **Organization** / **Membership** | Multi-tenant org + user roles |

### Build Studio
| Entity | Purpose |
|---|---|
| **DesignPack** | Uploaded design references |
| **BrandAsset** | Generated brand kit assets |
| **MediaAsset** / **MediaGenerationJob** | Media generation pipeline |
| **SocialPost** | Social media content |
| **BuildQueueItem** | Build queue for custom apps/sites |

### Security & Diagnostics (Legacy FaultLine)
| Entity | Purpose |
|---|---|
| **Finding** / **Risk** / **RepairPlan** / **RepairTask** | Diagnostic findings + repair |
| **SystemNode** / **SystemEdge** / **SystemHealthScore** | System mapping |
| **Audit** / **AuditEvent** / **AuditTemplate** | Audit framework |
| **Evidence** / **Approval** / **GateReview** | Evidence + approval chain |

### RLS Pattern
All entities use organization-based RLS:
- `read/create/update`: `data.organization_id == {{user.data.organization_id}}`
- `delete`: admin-only (`user_condition: { role: "admin" }`)

---

## 6. Backend Functions (Categorized)

### Clone Pipeline
| Function | Purpose |
|---|---|
| `categorizeWebsite` | AI auto-categorizes a URL by industry + queues it |
| `processCloneQueue` | Picks queued item → starts clone pipeline |
| `autonomousCloneTo100` | Recursive engine: scrape → generate → validate → heal to 100 |
| `deepCloneTarget` | Stealth scrape → design DNA + layout blueprint |
| `deterministicClone` | Deterministic re-hosting clone |
| `healAllClonesTo100` | Batch-heal all clones below 100/100 |
| `forensicAuditAndHarden` | Full audit → fix → heal → harden cycle |
| `rigorousCloneGate` | Final 100/100 quality gate |
| `rigorousGalleryGuard` | Re-audit all gallery clones |
| `resumeStuckClones` | Detect + resume stalled projects |
| `cleanupBrokenClones` | Clean up broken/failed clones |
| `stitchSite` | Stitch multi-page sites together |
| `clonePlatform` | Clone an entire platform |
| `cloneTopWebsites` | Clone top sites in an industry |

### Discovery
| Function | Purpose |
|---|---|
| `autoDiscoverAndQueue` | Discover top sites for N industries + queue them |
| `discoverTopPerformers` | Scan industries for top profit sites |
| `discoverCloneCandidates` | Find clone candidate sites |
| `discoverBenchmarkSite` | Discover benchmark site for comparison |
| `searchTopWebsitesByIndustry` | LLM + web search for top sites in an industry |
| `nicheWebsiteEngine` | Niche website discovery engine |
| `deepDiscoveryScan` | Deep scan of a target site |
| `scanTopSitesInCategory` | Scan top sites in a category |
| `discoverCompanies` | Web search for new businesses |
| `discoverIndustryOpportunities` | Industry opportunity analysis |
| `scanCompetitors` | Competitive intelligence scan |

### Generation & Build
| Function | Purpose |
|---|---|
| `generateWebsite` / `generateApp` / `generateSiteAll` / `generateSiteBatch` | Generate sites/apps |
| `generateBrandAssets` | Generate 32-asset brand kits |
| `generateRebrandPackages` | Generate rebrand options for a clone |
| `generateCustomizationOptions` / `generateCustomizationStudio` | Customization options |
| `applyCustomization` | Apply branding/customization to a clone |
| `rebuildCustomClone` | Rebuild a custom clone |
| `editGeneratedContent` | Surgical find/replace edit on content |
| `identifyChangeableParts` | Identify changeable parts of a clone |
| `generateTemplatePack` / `generateDesignPack` | Template/design pack generation |
| `generateIndustryImage` | Industry-specific image generation |
| `generateMarketingVideo` / `generateSocialContent` | Media generation |
| `compileGenerator` / `compileVisualPrompt` | Generator compilation |

### Launch & Deploy
| Function | Purpose |
|---|---|
| `provisionProject` | Provision a new project (Vercel + GitHub) |
| `launchProject` | Launch through the pipeline |
| `launchPipelineStart` / `launchPipelineValidate` / `launchPipelineFinalize` / `launchPipelineRetry` | Pipeline stages |
| `assignVercelDomain` | Assign a Vercel domain to a project |
| `suggestBusinessDomains` / `suggestDomains` | Domain suggestions |

### Security
| Function | Purpose |
|---|---|
| `deepSecurityScan` | Deep security scan |
| `securityComplianceCheck` | Compliance check |
| `runSecurityPipeline` | Full security pipeline |
| `securityPenTest` | Penetration test |
| `applyAutoFix` | Apply automatic fixes |
| `runHeadlessTest` / `autonomousHeadlessScan` | Headless browser tests |
| `publicScan` | Public website scan |

### Autonomous Systems
| Function | Purpose |
|---|---|
| `autonomousBuildCycle` | Autonomous build cycle |
| `autonomousCodeSystem` | Autonomous code generation |
| `autonomousMarketplaceStocker` | Auto-stock marketplace products |
| `universalDiscovery` / `universalOrchestrator` | Universal discovery + orchestration |
| `businessOrchestrator` | Business formation orchestrator |
| `monitoringOrchestrator` | Monitoring coordination |
| `sentinelReflect` | System self-analysis / root-cause |
| `computeSystemScore` | System health score computation |
| `computeIndustryBenchmarks` | Industry benchmark computation |
| `computeClientSuccess` | Client success score |

### Commerce & Finance
| Function | Purpose |
|---|---|
| `createCheckout` / `createStoreCheckout` / `createImplementationCheckout` / `toolioCheckout` | Stripe checkout |
| `stripeWebhook` | Stripe webhook handler |
| `createInvoice` / `sendInvoice` / `recordInvoicePayment` | Invoicing |
| `getFinancialSummary` / `syncQuickBooks` / `exportToSheets` | Finance |
| `getStoreCatalog` | Store catalog |
| `autonomousMarketplaceStocker` | Auto-stock products |

### CRM & Outreach
| Function | Purpose |
|---|---|
| `draftOutreach` / `sendApprovedOutreach` / `outreachGate` | Outreach drafting + approval |
| `pushOpportunityToHubSpot` / `syncToHubSpot` | HubSpot CRM sync |
| `sendLeadFollowup` | Lead follow-up automation |
| `ingestCloneLead` | Ingest clone leads |
| `facebookManager` | Facebook page management |
| `sendSmsAlert` | SMS alerts (Twilio) |
| `weeklyDigest` | Weekly digest report |

### E-Signature
| Function | Purpose |
|---|---|
| `createSignatureEnvelope` / `getSignatureEnvelope` / `signEnvelope` / `sendForSignature` | E-signature pipeline |

### Utilities
| Function | Purpose |
|---|---|
| `validateFullStack` / `validateArtifact` | Validation |
| `qaValidateStep` / `createQAReview` | QA |
| `quantifyFindings` / `logRecommendations` | Finding quantification |
| `mapCompanySystems` | System mapping |
| `extractReusableTemplates` | Template extraction |
| `recommendToolStack` | Tool stack recommendations |
| `generateReport` / `generateDeliverable` / `generateUniversalPlan` / `generateRepairPlan` / `generateBidProposal` / `generateSecurityProposal` / `generateEnhancedSystem` / `generateAutomationEnhancements` | Report/plan generation |
| `seedColorCharts` / `seedPromptLibrary` / `refreshXpsCatalog` / `scrapeXpsCatalog` | Data seeding |
| `setupRagDatabase` / `ragIngest` / `ragQuery` | RAG system |
| `inferTargetBackend` / `buildInferredBackend` | Backend inference |
| `partnerApi` | Partner API |
| `driveSync` | Google Drive sync |
| `triggerDepositOnboarding` / `processFulfillmentStep` | Onboarding/fulfillment |
| `processCodeQueue` / `processQueue` | Queue processing |
| `testProvisioning` / `cleanupTestResources` / `deleteUserAccount` | Test/cleanup |

---

## 7. Frontend Pages & Routes

### Public Marketing (no auth)
| Route | Page |
|---|---|
| `/` | Home (landing page) |
| `/product` `/solutions` `/industries` `/how-it-works` `/pricing` `/resources` `/security` `/about` `/contact` | MarketingPage |
| `/checkout` | Checkout |
| `/consultation` | Consultation booking |
| `/web-packs` | WebPackGallery |
| `/store` | Store |
| `/tools/ai-bid-writer` | AiBidWriter |
| `/portal/:companyId` | CustomerPortal |
| `/funnel` | ClientFunnel |
| `/sign/:token` | SignDocument |

### Auth
| Route | Page |
|---|---|
| `/login` `/register` `/forgot-password` `/reset-password` | Auth pages |

### Protected Portal (auth required, under PortalLayout)
**Xtreme Clone System (primary):**
| Route | Page |
|---|---|
| `/app` | XtremeOS (dashboard) |
| `/app/niche-websites` | NicheWebsiteStudio |
| `/app/clone-queue` | CloneQueue |
| `/app/clone-studio` | CloneStudio |
| `/app/clone-gallery` | CloneGallery |
| `/app/business` | BusinessHub |
| `/app/business/:projectId/chat` | IdeaIntake |
| `/app/build-studio` | BuildStudio |

**Xtreme OS (core operations):**
| Route | Page |
|---|---|
| `/app/command-center` | CommandCenter |
| `/app/chat` | Chat |
| `/app/tool-advisor` | ToolAdvisor |
| `/app/xps-catalog` | XPSCatalog |
| `/app/marketplace` | Marketplace / ImplementationMarketplace |
| `/app/books` | BooksDashboard (+ invoices, expenses, accounts, reports) |
| `/app/visual-studio` | VisualMediaStudio |
| `/app/video-studio` | VideoStudio |
| `/app/social-media` | SocialMediaManager |
| `/app/ai-control` | AiControlPanel |
| `/app/database` | UniversalDatabase |
| `/app/settings` | Settings |

**FaultLine AI (archived — collapsed in sidebar):**
| Route | Page |
|---|---|
| `/app/discovery-engine` | DiscoveryEngine |
| `/app/industry-opportunities` | IndustryOpportunities |
| `/app/competitive-intel` | CompetitiveIntel |
| `/app/security-pipeline` | SecurityPipeline |
| `/app/qa-center` | QADashboard |
| `/app/enhancement-engine` | EnhancementEngine |
| `/app/roi` | ClientROI |
| `/app/financial-sync` | FinancialSync |
| `/app/white-label` | WhiteLabel |
| `/app/audit-templates` | AuditTemplates |
| `/app/partner-api` | PartnerPortal |
| `/app/pcu-control` | PCUControlCenter |
| `/app/client-projects` | ClientProjects |
| `/app/client-portal` | ClientPortal |
| `/app/demo-portal` | ClientDemoPortal |
| `/app/deliverable-studio` | DeliverableStudio |
| `/app/drive-sync` | DriveSync |
| `/app/esign` | ESignDashboard (+ new, detail, sign) |

---

## 8. AI Agent — Xtreme Commander

**Config:** `base44/agents/xtreme_commander.jsonc`

The Xtreme Commander is a full-access AI agent with read/write/execute permissions across **every entity** and **every backend function** in the system. It's embedded in the XtremeOS dashboard via `XtremeAIChat` component (expandable right panel).

### Capabilities
- Add URLs to clone queue + trigger processing
- Edit cloned sites (surgical find/replace, branding changes)
- Clone sites (deep clone, deterministic clone)
- Heal/fix clones (forensic audit, auto-heal)
- Discover sites (industry search, competitor scan)
- Generate assets (websites, apps, brand kits, media)
- Deploy projects (provision, launch, assign domains)
- Manage commerce (invoices, checkout, store)
- E-signature, CRM, outreach, books

### UI Integration
- `src/components/fl/XtremeAIChat.jsx` — expandable chat panel in XtremeOS
- Toggled via `chatExpanded` state in `XtremeOS.jsx`
- When expanded, content area gets `marginRight: 420`

---

## 9. Integrations & Secrets

### Secrets (stored in Base44)
| Secret | Purpose |
|---|---|
| `BROWSERBASE_API_KEY` + `BROWSERBASE_PROJECT_ID` | Stealth browser scraping |
| `VERCEL_TOKEN` + `VERCEL_TEAM_ID` | Clone deployments |
| `GITHUB_TOKEN` | Repo creation for clones |
| `SUPABASE_ACCESS_TOKEN` | Database management |
| `STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY` + `STRIPE_WEBHOOK_SECRET` | Payments |
| `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM_NUMBER` | SMS alerts |

### OAuth Connectors (authorized)
| Connector | Scopes |
|---|---|
| **Gmail** | gmail.send, email |
| **Google Drive** | drive, email |
| **Google Sheets** | spreadsheets, email |
| **HubSpot** | CRM objects (contacts, companies, deals, products, lists, schemas), tickets |
| **GitHub** | repo, delete_repo |
| **Facebook Pages** | pages_show_list, pages_read_engagement, pages_manage_posts, read_insights, pages_messaging |
| **DocuSign** | signature, extended |
| **Supabase** | projects:read/write, database:read/write, organizations:read |

### Workspace-Registered Connectors
Supabase, Google Docs, Google Calendar, HubSpot, Google Tasks, Gmail, Google Sheets, Google Drive

---

## 10. Stripe Products

| Product | Price | Mode |
|---|---|---|
| Toolio App Pack — Lifetime Access | $99.00 one-time | Test |
| Toolio Web Pack — Lifetime Access | $49.00 one-time | Test |
| Toolio AI Tool — Lifetime Access | $29.00 one-time | Test |
| Growth Plan | $299.00/month | Test |
| Operating System Plan | $699.00/month | Test |

**Webhook:** `stripeWebhook` function handles `checkout.session.completed`
**Test card:** 4242 4242 4242 4242
**Going live:** Dashboard → Integrations → Stripe → provide live API keys

---

## 11. Key Design Decisions & Constraints

### Decisions
- **Original product strategy** over affiliate redirects (build, don't link)
- **Directory-based** legal pages (Terms, Privacy, Refund) for compliance
- **HTTPS enforced** with secure POST forms for Stripe checkout
- **524 = in-progress** (not failure) — linked to LaunchProject trackers
- **Max 5 retries** per clone, then moved to Failed Clones card
- **Interval-based schedules** (not explicit cycle loops) for system continuity
- **Batched processing** (not sequential) to prevent timeouts
- **Basic fetch first** for cloning, stealth browser only for JS-heavy SPAs
- **371-industry taxonomy** with rotating index for full coverage
- **Manual bulk-queue** trigger for high-priority niches

### Dead Ends (Do Not Retry)
- Affiliate redirect model (rejected — "for people who don't know how to build")
- Explicit cycle loops in workflows (rejected — use interval schedules)
- Ad-hoc manual clone repairs (use centralized queue-based system)
- LLM schema-based categorization (failed — use simplified array processing)
- Sequential forensic audit on all projects (causes timeouts — use batched)
- Auto-cloning JS-heavy SPA sites like Hostinger/Envato (persistent 524s — use manual build flag)
- Xtreme Visualizer (XV) module (removed — redundant distraction)

### Known Issues
- Deterministic clones of JS-heavy sites (Hostinger, Envato) struggle to reach 100/100 parity
- 524 gateway timeouts on long-running clones (handled via background tracker monitoring)

---

## 12. Operating Instructions

### For a New Operator
1. **To add a site to clone:** Go to Clone Queue (`/app/clone-queue`), type a URL or paste a bulk list. The AI auto-categorizes and queues it. The Instant Clone Queue workflow fires immediately.
2. **To monitor progress:** Watch the Clone Queue page or the XtremeOS dashboard (clone health %, active builds, failed clones card).
3. **To customize a clone:** Go to Clone Studio (`/app/clone-studio`), select a clone, apply branding/rebrand, or use surgical edits.
4. **To view finished clones:** Go to Clone Gallery (`/app/clone-gallery`) — each shows the original URL, live Vercel URL, and parity score.
5. **To form a business:** Go to Business Hub (`/app/business`), start a new project, chat with the AI to generate a business name, domain, and plan.
6. **To build from scratch:** Go to Build Studio (`/app/build-studio`), choose a type (website/app/system/tool), configure, generate, and deploy.
7. **To command via AI:** Use the Xtreme Commander chat panel (right side of XtremeOS dashboard) — it can operate every function via natural language.

### To Manually Trigger Processing
- **Process next clone:** Click "Process Next Clone" on Clone Queue page
- **Auto-discover:** Click "Auto-Discover 10 Industries" on Clone Queue page
- **Auto-heal all:** Click "Auto Audit · Analyze · Fix · Heal · Harden" on XtremeOS dashboard
- **Bulk process:** Ask Base44 in chat to "process all queued clones" — it fires multiple `processCloneQueue` calls in parallel batches

### To Go Live with Payments
1. Dashboard → Integrations → Stripe
2. Provide live Stripe API keys
3. Update webhook endpoint to live mode
4. Test with real card

---

## 13. File Structure Reference

```
src/
  App.jsx                          # Router (all routes)
  index.css                        # Design tokens + component styles
  pages/
    XtremeOS.jsx                   # Main dashboard
    CloneQueue.jsx                 # Clone queue management
    CloneStudio.jsx                # Clone customization
    CloneGallery.jsx               # Finished clones gallery
    BuildStudio.jsx                # Build from scratch
    business/BusinessHub.jsx       # Business formation
    ...                             # 60+ pages
  components/
    fl/
      XtremeOSSidebar.jsx          # 3-module sidebar (Clone System, Xtreme OS, FaultLine)
      XtremeOSRightPanel.jsx       # System status panel
      XtremeAIChat.jsx             # AI commander chat
      CloneList.jsx                # Categorized clone list with search
      FailedClonesCard.jsx         # Failed clones dashboard card
    clone-queue/
      BulkUpload.jsx               # Bulk URL paste uploader
    clone-studio/                  # Clone customization steps
    clone-gallery/                 # Gallery components
    build-studio/                  # Build studio steps
    PwaInstallButton.jsx           # PWA install prompt
  lib/
    cloneIndustries.js             # 371-industry taxonomy
    industries/sectorOne.js       # Industry definitions + reference companies
    industries/sectorTwo.js

base44/
  entities/                        # 90+ entity schemas (JSON)
  functions/                        # 120+ backend functions (TypeScript)
  workflows/                        # 30+ scheduled workflows (JSON)
  agents/
    xtreme_commander.jsonc         # Full-access AI agent
  shared/                           # Shared modules (scraper, stealthBrowser, etc.)
  _spec/                            # This handoff document + legacy specs
```

---

## 14. Rollback & Recovery

- **Checkpoint:** Create a Base44 checkpoint before major changes
- **Failed clones:** Auto-retry 5×, then appear in Failed Clones card on dashboard for manual retry or auto-heal trigger
- **Stuck clones:** Auto-detected every 5 min and resumed once
- **Gallery integrity:** Rigorous Gallery Guard re-audits all clones every 2 hours
- **System health:** Persistent Hardening workflow triggers heal/pen-test if score drops below 90/75

---

*This document supersedes the legacy `BASE44_HANDOFF.md`, `PRD.md`, and `ARCHITECTURE.md` which described the old FaultLine AI diagnostic system. The Xtreme Clone System is the current active platform.*