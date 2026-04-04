# N8N Change Log

Track every production-facing n8n change with enough detail to audit and roll back safely.

## Entry format

- Date (UTC):
- Operator:
- Workflow:
- Node(s):
- Change summary:
- Reason:
- Verification:
- Rollback reference:

---

## 2026-04-01

- Date (UTC): 2026-04-03
- Operator: Cursor
- Workflow: Planning docs (no runtime node edits)
- Node(s): n/a
- Change summary:
  - Added product-first runtime incident guardrails for agents in `AGENTS.md`.
  - Added implementation blueprint `docs/ops/A6_RUNTIME_FIRST_ROUTING_PLAN.md` for account-scoped resolver + alias fallback.
  - Updated preflight/meta docs to require reading A6 plan for runtime routing incident tasks.
- Reason:
  - Repeated runtime resolver 404 failures on valid guest messages when webhook listing IDs are missing in onboarding cache mapping.
- Verification:
  - Documentation updates committed; no workflow JSON/node changes in this entry.
- Rollback reference:
  - Revert docs-only commit if policy wording needs revision.

- Date (UTC): 2026-04-01
- Operator: Alexander + Cursor
- Workflow: `cohost-tenant-sync`
- Node(s): `Process_Tenant_Sync` (Code)
- Change summary:
  - Fixed Cloud runtime incompatibility (`fetch is not defined`) by moving HTTP calls to `this.helpers.httpRequest`.
  - Corrected callback idempotency header to avoid collision with application-side event key.
  - Aligned Hostify auth usage toward `x-api-key` pattern.
- Reason:
  - Runtime errors during sync validation and duplicate-idempotency inserts in `tenant_events`.
- Verification:
  - `hostifyStatus: 200`
  - `callbackStatus: 200`
  - `eventType: n8n_sync_ok`
- Rollback reference:
  - Revert `Process_Tenant_Sync` code to previous saved revision in n8n history if needed.

- Date (UTC): 2026-04-01
- Operator: Cursor
- Workflow: `cohost-tenant-sync`
- Node(s): `Error Trigger`, `Build_Error_Alert_Context` (new), `Error` (Telegram)
- Change summary:
  - Prepared A2 patch artifact to enrich error alerts with workflow/execution/node identifiers and contextual IDs.
  - Added import-ready workflow patch JSON and minimal apply guide.
- Reason:
  - Improve incident triage when multiple workflows/tenants are active.
- Verification:
  - Patch artifact generated at `docs/ops/n8n/cohost-tenant-sync.A2-error-alert.json`
  - Apply guide created at `docs/ops/n8n/A2_APPLY_GUIDE.md`
- Rollback reference:
  - Keep current workflow version untouched; apply artifact in draft first, then promote after smoke test.

- Date (UTC): 2026-04-03
- Operator: Cursor
- Workflow: App backend + metrics dashboard + onboarding economics tab (no direct n8n node edits)
- Node(s): n/a
- Change summary:
  - Standardized app-side tenant event taxonomy through `lib/tenant/events.ts` with canonical types and alias mapping for external callbacks.
  - Added normalized event payload enrichment (`tenantId`, `listingId`, `threadId`, `reservationId`, `eventVersion`, `emittedAt`) for consistent callbacks and internal events.
  - Hardened `/api/n8n/tenant-events` to canonicalize incoming `eventType` values before writing to `tenant_events`.
  - Added economics assumptions persistence fields in tenants (`labor_hourly_rate_usd`, `avg_handle_minutes_per_message`) via migration.
  - Added economics aggregation in server layer and exposed MVP economics UI on dashboard (assistant cost, estimated saved labor, net value, listing-level breakdown).
  - Added onboarding "Economics" tab to save tenant assumptions from UI.
- Reason:
  - Implement chunks C2/C3/C4/C5 for consistent event analytics and transparent economic value reporting per tenant/listing.
- Verification:
  - `npm run lint` passed.
  - `npm run build` passed.
- Rollback reference:
  - Revert this chunk's commit and keep previous dashboard/onboarding metrics behavior.

- Date (UTC): 2026-04-03
- Operator: Cursor
- Workflow: App backend + onboarding UI + runtime resolver contract
- Node(s): n/a (no direct n8n node edits in this chunk)
- Change summary:
  - Added tenant-level `global_instructions` support to app data model and onboarding save flow.
  - Added onboarding tabs (`Account`, `Listings`, `Assistant`) to reduce UX coupling and avoid one monolithic settings form.
  - Added assistant settings section with dedicated save scope; assistant-only save skips Hostify listings resync.
  - Extended runtime resolver response and tenant sync payload with `globalInstructions` so n8n can consume app-managed global policy text.
  - Added migration `supabase/2026-04-03-a6-tenant-global-instructions.sql`.
- Reason:
  - Replace fragile Telegram pinned-message dependency with tenant-owned source of truth in the app while keeping MVP complexity controlled.
- Verification:
  - `npm run lint` passed.
  - `npm run build` passed.
- Rollback reference:
  - Revert app commit for A6 and keep prior onboarding layout + Telegram-only global instructions flow.

- Date (UTC): 2026-04-02
- Operator: Cursor
- Workflow: `cohost-tenant-sync`
- Node(s): `HOSTIFY Request  Messages`, `HTTPR Calendar Tool`, `GetListingDetailsTool`, `getReservationTool`, `SEND Jennys reply  to HOSTIFY`
- Change summary:
  - Prepared A1 patch artifact to replace hardcoded `x-api-key` values with n8n Cloud variable expression.
  - Standardized Hostify auth header value to `{{$vars.HOSTIFY_API_KEY}}` across runtime Hostify HTTP nodes.
- Reason:
  - Remove hardcoded secrets and centralize key management for safer operations.
- Verification:
  - Patch artifact generated at `docs/ops/n8n/cohost-tenant-sync.A1-key-centralization.json`
  - Apply guide created at `docs/ops/n8n/A1_APPLY_GUIDE.md`
- Rollback reference:
  - Keep current workflow version untouched; apply artifact in draft first, then promote after smoke test.

- Date (UTC): 2026-04-02
- Operator: Cursor
- Workflow: `cohost-tenant-sync`
- Node(s): `Build_Runtime_Config_Request`, `Sign_Runtime_Config_Request`, `Resolve_Runtime_Config`, `Normalize_Runtime_Config`, Hostify runtime HTTP nodes
- Change summary:
  - Prepared A4 backend + n8n patch artifacts for runtime host-account config resolution by `listing_id`.
  - Added signed resolver call to app endpoint and normalized runtime config object for downstream nodes.
  - Updated runtime Hostify headers to use resolved key `{{$json.runtime_config.hostifyApiKey}}`.
- Reason:
  - Move from single global Hostify key to per-host-account runtime routing.
- Verification:
  - Patch artifact generated at `docs/ops/n8n/cohost-tenant-sync.A4-runtime-resolver.json`
  - Apply guide created at `docs/ops/n8n/A4_APPLY_GUIDE.md`
  - Backend resolver route added at `app/api/n8n/runtime-config/route.ts`
- Rollback reference:
  - Restore prior workflow version and keep A1 key variable mode until A4 is validated.

- Date (UTC): 2026-04-03
- Operator: Cursor
- Workflow: App backend + onboarding UI (no n8n node edits)
- Node(s): n/a
- Change summary:
  - Added Hostify listings auto-sync from app onboarding save using `GET /listings` with pagination.
  - Extended host-account listing model with UI metadata (`listing_name`, `channel_listing_id`, `last_seen_at`) and added migration.
  - Added onboarding listings table showing `channel_listing_id` (UI) and `listing_id` (webhook key), plus per-listing enable/disable and manual refresh.
  - Preserved resolver routing on canonical `listing_id` and `active=true`.
- Reason:
  - Remove manual listing ID entry, improve operator trust/visibility, and allow selective listing disable for MVP.
- Verification:
  - `npm run lint` passed.
  - `npm run build` passed.
- Rollback reference:
  - Revert app commit for A4.1 and keep prior manual mapping flow.

- Date (UTC): 2026-04-03
- Operator: Cursor
- Workflow: `cohost-tenant-sync`
- Node(s): `forward message to Telegram`, `Guest_Alerts_Tool`, `Team_Messages_Tool`, `Error`, `Global_Instructions_Tool`
- Change summary:
  - Prepared A5 patch artifact to remove hardcoded tenant Telegram chat IDs and route tenant-facing Telegram traffic through runtime resolver output.
  - Kept global platform-owner channels separated via n8n variables for incident alerts and global instructions source.
  - Stripped export-only `pinData`/meta from artifact to reduce accidental secret leakage in shared JSON files.
- Reason:
  - Enforce multi-tenant Telegram routing and prevent cross-tenant chat bleed due to hardcoded chat IDs.
- Verification:
  - Patch artifact generated at `docs/ops/n8n/cohost-tenant-sync.A5-telegram-runtime-routing.json`
  - Apply guide created at `docs/ops/n8n/A5_APPLY_GUIDE.md`
- Rollback reference:
  - Keep current workflow version untouched; apply artifact in draft first, then promote after smoke test.
