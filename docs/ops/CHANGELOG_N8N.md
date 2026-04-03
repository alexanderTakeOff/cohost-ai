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
