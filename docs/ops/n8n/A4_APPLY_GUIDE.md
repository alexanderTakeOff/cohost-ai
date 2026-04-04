# A4 Apply Guide — Runtime host-account config resolution by listing_id

This step enables runtime multi-account routing by resolving config via app API before Hostify calls.

## Goal

For each runtime event, use `listing_id` to resolve:

- `hostAccountId` (legacy `tenantId`)
- `hostifyApiKey`
- `telegramChatId`
- `mode`

Then use resolved `hostifyApiKey` in Hostify HTTP nodes instead of a single global key.

## Backend prerequisites (already prepared in repo)

1. Apply SQL migration in Supabase:
   - `supabase/2026-04-02-a4-host-account-listing-mapping.sql`
2. Deploy app backend changes so endpoint exists:
   - `POST /api/n8n/runtime-config`
3. Ensure n8n variable still exists:
   - `N8N_WEBHOOK_SECRET` (used for signed request to app)

## Patch file

- `docs/ops/n8n/cohost-tenant-sync.A4-runtime-resolver.json`

## Safe apply (minimal manual)

1. Open workflow `cohost-tenant-sync`.
2. Import patch JSON into a draft copy.
3. Verify added nodes:
   - `Build_Runtime_Config_Request`
   - `Sign_Runtime_Config_Request`
   - `Resolve_Runtime_Config`
   - `Normalize_Runtime_Config`
4. Verify rewired chain:
   - after `Code_Adapter_to_Old_Logic` resolver path runs before Hostify runtime HTTP nodes.
   - `Build_Runtime_Config_Request` includes topic ARN from webhook headers:
     - `topicArn = {{ $json.headers?.["x-amz-sns-topic-arn"] ?? null }}`
5. Verify Hostify runtime HTTP headers use:
   - `x-api-key = {{$json.runtime_config.hostifyApiKey}}`
6. Save and activate.

## Smoke test

1. Send a runtime message from a listing that is mapped in `host_account_listings`.
2. Confirm resolver node returns `ok: true` and includes runtime config.
3. Confirm Hostify request/reply nodes use resolved key and succeed.
4. Confirm no webhook node settings changed.

## Rollback

1. Revert workflow to previous version in n8n history.
2. Re-run one smoke test.
