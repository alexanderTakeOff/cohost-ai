# A6 Runtime-First Routing Plan (Decouple Runtime from Onboarding Cache)

Status: PLANNED  
Owner: Team  
Scope: Next.js app + n8n workflow contract (no protected webhook path changes)

## 1) Problem Statement

Observed production failures show that webhook `listing_id` can be valid for runtime processing while missing in onboarding-synced listing cache.  
Current strict resolver behavior (`listing_id` must already exist in mapping table) can stop guest message processing.

## 2) Goal

Guarantee runtime continuity for guest messages while preserving onboarding UX and listing controls.

- Runtime path must continue for valid tenant/account traffic even if onboarding cache is incomplete.
- Onboarding listing table remains useful for operator visibility and enable/disable policy, but does not act as single runtime truth.

## 3) Non-Goals

- No full workflow rewrite.
- No changes to protected webhook node paths/IDs.
- No migration to separate execution infrastructure in this chunk.

## 4) Design Principles

1. Runtime-first continuity.
2. Account-scoped routing before listing-level routing.
3. Canonical ID + alias model for listing identity.
4. Safe fallback with explicit observability.

## 5) Source-of-Truth Hierarchy

1. Tenant/account identity: trusted transport metadata (SNS topic account marker).
2. Runtime message identity: webhook `listing_id`, `reservation_id`, `thread_id`.
3. Onboarding listing cache: UI and policy layer.

## 6) Data Model Changes

Option A (preferred): new alias table.

- `host_account_listing_aliases`
  - `tenant_id` (uuid, fk)
  - `canonical_listing_id` (text)
  - `alias_type` (text: `target_id`, `parent_listing_id`, `channel_listing_id`, `webhook_listing_id`)
  - `alias_value` (text)
  - `first_seen_at`, `last_seen_at` (timestamptz)
  - unique (`tenant_id`, `alias_type`, `alias_value`)

Option B (minimal fallback): extend existing mapping with explicit alias columns (less flexible).

## 7) Runtime Resolution Algorithm

1. Resolve tenant by account marker (SNS topic account id).
2. Try mapping by canonical `listing_id`.
3. If not found: try alias lookup by webhook `listing_id`.
4. If still not found:
   - fetch details using runtime key + webhook listing id and/or reservation/thread context,
   - extract canonical/alias IDs,
   - validate same account scope,
   - upsert alias mapping,
   - retry resolution once.
5. If still unresolved:
   - emit controlled event (`runtime_config_missing` with context),
   - send operator alert,
   - stop branch gracefully (no unhandled red-fail).

## 8) Onboarding Behavior

- Keep `/listings` sync for operator visibility.
- Preserve per-listing enable/disable control on canonical listings.
- Show warning badge when runtime discovered aliases not yet represented in onboarding cache.

## 9) Observability and Events

Add or standardize event payload fields:

- `accountId`
- `webhookListingId`
- `canonicalListingId`
- `resolutionPath` (`direct_mapping` | `alias_mapping` | `details_fallback` | `unresolved`)
- `threadId`
- `reservationId`

New events:

- `listing_mapping_backfilled`
- `runtime_config_missing`

## 10) Rollout Plan

Phase 1: Shadow mode
- Compute fallback resolution and log decisions; keep current behavior.

Phase 2: Controlled fallback
- Enable alias/details fallback for unresolved runtime listing IDs.
- Keep alerts on every fallback path.

Phase 3: Policy alignment
- Reflect runtime-discovered aliases in onboarding UI cues.

## 11) Acceptance Criteria

1. Guest messages with previously unmapped but valid listing IDs are processed.
2. Resolver no longer fails hard for known account traffic due only to onboarding cache miss.
3. All unresolved cases produce structured events + operator alerts with IDs.
4. Onboarding listing controls remain intact for canonical listings.

## 12) Rollback

- Feature flag fallback path off.
- Keep direct canonical mapping only.
- Preserve emitted logs/events for postmortem analysis.
