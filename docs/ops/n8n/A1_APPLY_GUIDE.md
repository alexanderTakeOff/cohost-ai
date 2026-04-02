# A1 Apply Guide — Remove hardcoded Hostify API keys

This step centralizes Hostify key usage in n8n by replacing literal `x-api-key` values with a variable reference.

## Goal

Remove hardcoded Hostify API keys from runtime HTTP nodes.

## Required n8n variable

Create (or verify) this variable in n8n Cloud:

- `HOSTIFY_API_KEY`

Set it to the current production Hostify API key value.

## Patch file

- `docs/ops/n8n/cohost-tenant-sync.A1-key-centralization.json`

## Safe apply (minimal manual)

Recommended:
1. Open workflow `cohost-tenant-sync`.
2. Import patch JSON into a draft copy.
3. Verify only these nodes changed:
   - `HOSTIFY Request  Messages`
   - `HTTPR Calendar Tool`
   - `GetListingDetailsTool`
   - `getReservationTool`
   - `SEND Jennys reply  to HOSTIFY`
4. For each node above, header `x-api-key` must be:
   - `{{$vars.HOSTIFY_API_KEY}}`
5. Save and activate.

Alternative (manual quick edit):
- Edit the five nodes above and replace `x-api-key` value with `{{$vars.HOSTIFY_API_KEY}}`.

## Smoke test

1. Trigger one inbound message path end-to-end.
2. Confirm Hostify requests succeed (no auth errors).
3. Confirm assistant reply still sends to Hostify.
4. Confirm tenant sync flow still passes (A2 alert branch unchanged).

## Rollback

1. Restore previous workflow version from n8n history.
2. Re-run one smoke test.
