# Cohost AI MVP Execution Board

Last Updated: 2026-04-06  
Source of Truth: This file is the canonical execution tracker for MVP operations and delivery.

## Status Legend

- `PLANNED`
- `IN_PROGRESS`
- `DONE`
- `BLOCKED`

## Active Roadmap (n8n Hardening First)

| ID | Task | Status | Acceptance Criteria | Risk | Owner | Evidence / Notes |
|---|---|---|---|---|---|---|
| A1 | Remove hardcoded Hostify API keys in n8n HTTP nodes | DONE | No `x-api-key` literal values remain in runtime Hostify nodes; values come from centralized config/variable | Medium | Team | Applied in n8n with `{{$vars.HOSTIFY_API_KEY}}` on 5 runtime nodes; smoke test confirmed by operator |
| A2 | Improve Telegram error alerts with full execution context | DONE | Error alert contains `workflow_name`, `workflow_id`, `execution_id`, `failed_node_name`, `error_message`, `tenant_id` (if available), and timestamp | Low | Team | Live alert sample confirmed with execution context in Telegram |
| A3 | Protect webhook nodes from accidental edits | IN_PROGRESS | Webhook nodes listed in protected inventory; runbook explicitly forbids changing `path`/`webhookId` without ADR | Low | Team | Policy captured in `N8N_RUNBOOK.md` + `N8N_PROTECTED_NODES.md` |
| A4 | Align runtime Hostify calls with host-account-specific config | IN_PROGRESS | Runtime flow resolves host-account config by `listing_id` before Hostify calls | High | Team | Backend resolver + mapping schema + n8n patch artifacts prepared; A4.1 added auto-sync listings from Hostify API and onboarding listings UI (enable/disable); A6 adds tenant-level `global_instructions` in onboarding + runtime-config response |
| A5 | Standardize event taxonomy (`guest_message`, `ai_reply`, `n8n_sync_ok/error`) | DONE | Dashboard metrics and n8n callbacks use consistent event types | Medium | Team | Canonical taxonomy implemented in app (`lib/tenant/events.ts`), callback route now canonicalizes external eventType aliases, payload enrichment normalized for app and n8n callback sources |
| A6 | Runtime-first routing with alias fallback | IN_PROGRESS | Guest messages continue when webhook listing id is valid for account but missing in onboarding cache mapping | High | Team | Plan documented in `docs/ops/A6_RUNTIME_FIRST_ROUTING_PLAN.md`; implementation started in app runtime resolver route + server alias/backfill logic |

## Current Implementation Chunks (Economics)

| ID | Task | Status | Acceptance Criteria | Risk | Owner | Evidence / Notes |
|---|---|---|---|---|---|---|
| C2 | Event taxonomy + payload contract hardening | DONE | Canonical event list + normalized payload fields used across emitters and callback ingestion | Medium | Team | `lib/tenant/events.ts`, `app/actions.ts`, `app/api/n8n/tenant-events/route.ts` |
| C3 | AI cost telemetry aggregation | DONE | `aiCostUsd`, `aiInputTokens`, `aiOutputTokens` aggregated from `ai_reply` events | Medium | Team | `getTenantMetrics`, `getTenantEconomicsMetrics`, listing economics aggregation |
| C4 | Tenant economic assumptions | DONE | Tenant stores labor/hour + avg minutes/message and formulas produce labor-saved + net value | Medium | Team | migration `supabase/2026-04-03-a7-tenant-economic-assumptions.sql`, onboarding economics tab save action |
| C5 | MVP economics UI | DONE | Dashboard shows cost/savings/net + listing-level table; onboarding has economics settings tab | Medium | Team | `app/dashboard/page.tsx`, `app/onboarding/onboarding-form.tsx` |
| C6 | Runtime identity hardening (account marker + listing aliases) | DONE | Resolver uses account-scoped routing and alias fallback before graceful unresolved handling | High | Team | App runtime resolver now uses account marker extraction, alias fallback, details fallback, and graceful unresolved handling; see `app/api/n8n/runtime-config/route.ts`, `lib/tenant/server.ts`, `docs/ops/n8n/A6_APPLY_GUIDE.md` |
| C7 | Runtime observability + closed beta UX readiness | DONE | Resolution paths are tracked (`direct_mapping`, `alias_mapping`, `details_fallback`, `unresolved`), dashboard shows runtime counters, and onboarding/dashboard/home/login explain beta status and next steps without making onboarding a runtime SPOF | Medium | Team | App-side telemetry added for runtime resolution outcomes and backfills; dashboard exposes runtime counters and issue summary; control plane now reflects closed beta limits (10 clients / 30 active listings) and guidance in `app/dashboard/page.tsx`, `app/onboarding/*`, `app/page.tsx`, `app/login/login-form.tsx` |
| C8 | Tenant <-> Hostify account binding hardening | DONE | Tenant stores canonical Hostify account binding (`customer_id`) and warns on attempted reassignment to a different Hostify account | Medium | Team | Tenant-level Hostify binding fields, onboarding mismatch validation, and UI visibility for connected Hostify account are live in app pages and server actions |
| C9 | Conversational onboarding shell | DONE | Jenny can guide tester onboarding in a chat shell, render auth/account setup cards, and open dashboard/onboarding sections through structured navigation intents | High | Team | New chat-first shell in `app/chat/page.tsx`, assistant APIs in `app/api/assistant/*`, skill/runtime layer in `lib/ai/*`, and reusable drawer launcher on `/`, `/onboarding`, `/dashboard` |

## Recently Completed Product Chunks

| ID | Task | Status | Evidence |
|---|---|---|---|
| P1 | Next.js + TS + Tailwind scaffold | DONE | repo commit history |
| P2 | Supabase auth + login page | DONE | `/login` live and validated |
| P3 | Tenant onboarding + dashboard basics | DONE | `/onboarding`, `/dashboard` live |
| P4 | Signed n8n sync and callback path | DONE | `n8n_sync_ok` callback observed |
| P5 | MVP UX simplification (dashboard read-only, onboarding edit-first) | DONE | commit `8e86b53` |

## Update Rules (Mandatory)

1. After each implementation chunk, update:
   - status in this board
   - evidence note (execution ID / commit hash / screenshot link)
2. Do not mark `DONE` without measurable acceptance criteria.
3. Any webhook path or webhook ID change requires:
   - ADR update
   - explicit rollback note in changelog
