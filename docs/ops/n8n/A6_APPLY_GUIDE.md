# A6 Apply Guide — Runtime-first resolver by account + alias fallback

This update keeps runtime processing alive when webhook `listing_id` is missing from onboarding cache.

## Goal

Runtime resolver should:

1. Resolve by direct canonical mapping (`listing_id`).
2. Resolve by alias mapping (`target_id`, `parent_listing_id`, `channel_listing_id`, `webhook_listing_id`).
3. Fallback by account-scoped listing details lookup when mapping is missing.

## Backend prerequisites

Apply in Supabase SQL editor:

1. `supabase/2026-04-03-a41-host-account-listings-metadata.sql` (if not already)
2. `supabase/2026-04-04-a6-host-account-aliases.sql`

Then deploy app backend so updated `/api/n8n/runtime-config` logic is live.

## n8n workflow requirements

1. In `Build_Runtime_Config_Request`, include:
   - `listingId`
   - `threadId`
   - `reservationId`
   - `hostifyAccountRef` parsed from `x-amz-sns-topic-arn` (`hostify-webhook-go-<id>-...`)
   - `topicArn` (raw header value)
2. Keep signed request flow (`Sign_Runtime_Config_Request`) unchanged.
3. Ensure `Resolve_Runtime_Config` sends JSON body from `runtime_resolver_request`.

## Expected resolver outputs

Success output now includes:

- `resolutionPath`: `direct_mapping` | `alias_mapping` | `details_fallback`
- `accountId` (when available)

404 output now includes:

- `resolutionPath: "unresolved"`
- `hostifyAccountRef` (if available)

## Smoke test checklist

1. Send message from listing already present in mapping:
   - expect `resolutionPath = direct_mapping`.
2. Send message with webhook ID that is alias of known listing:
   - expect `resolutionPath = alias_mapping`.
3. Send message with valid account ID but unmapped listing:
   - expect `resolutionPath = details_fallback`,
   - and new mapping/alias rows created.
4. Confirm protected webhook node paths/IDs are unchanged.

## Rollback

1. Revert workflow to previous version in n8n history.
2. Revert app commit and redeploy.
3. Keep SQL migration as-is (safe additive schema).
