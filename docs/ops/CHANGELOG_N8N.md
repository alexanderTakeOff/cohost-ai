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
