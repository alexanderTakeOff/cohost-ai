# A2 Apply Guide — Enhanced n8n Error Alerts

This guide applies the A2 patch with minimal manual edits.

## Goal

Enhance Telegram error alerts with execution context:

- workflow name/id
- execution id/url
- failed node name
- tenant/thread/reservation identifiers (when available)
- UTC timestamp
- raw error message

## Files

- Patch workflow JSON:
  - `docs/ops/n8n/cohost-tenant-sync.A2-error-alert.json`

## Apply steps (minimal manual)

1. In n8n, open workflow `cohost-tenant-sync`.
2. Import `docs/ops/n8n/cohost-tenant-sync.A2-error-alert.json` into a draft copy.
3. Verify only error branch changed:
   - `Error Trigger` now routes to `Build_Error_Alert_Context`
   - `Build_Error_Alert_Context` routes to `Error`
   - `Error` Telegram node text is `{{$json.alert_text}}`
4. Save and activate.

## Smoke test

Trigger any controlled error path and verify Telegram alert includes:

- Workflow + execution identifiers
- Failed node name
- Tenant/thread/reservation context (if present)
- UTC timestamp
- Error summary

## Rollback

Revert to previous workflow version in n8n history.
