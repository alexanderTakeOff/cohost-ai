# Cohost AI MVP Execution Board

Last Updated: 2026-04-01  
Source of Truth: This file is the canonical execution tracker for MVP operations and delivery.

## Status Legend

- `PLANNED`
- `IN_PROGRESS`
- `DONE`
- `BLOCKED`

## Active Roadmap (n8n Hardening First)

| ID | Task | Status | Acceptance Criteria | Risk | Owner | Evidence / Notes |
|---|---|---|---|---|---|---|
| A1 | Remove hardcoded Hostify API keys in n8n HTTP nodes | IN_PROGRESS | No `x-api-key` literal values remain in runtime Hostify nodes; values come from centralized config/variable | Medium | Team | A1 patch artifact prepared: `docs/ops/n8n/cohost-tenant-sync.A1-key-centralization.json` + apply guide |
| A2 | Improve Telegram error alerts with full execution context | DONE | Error alert contains `workflow_name`, `workflow_id`, `execution_id`, `failed_node_name`, `error_message`, `tenant_id` (if available), and timestamp | Low | Team | Live alert sample confirmed with execution context in Telegram |
| A3 | Protect webhook nodes from accidental edits | IN_PROGRESS | Webhook nodes listed in protected inventory; runbook explicitly forbids changing `path`/`webhookId` without ADR | Low | Team | Policy captured in `N8N_RUNBOOK.md` + `N8N_PROTECTED_NODES.md` |
| A4 | Align runtime Hostify calls with tenant-specific config | PLANNED | Runtime flow resolves tenant config before Hostify calls (no static key path) | High | Team | Depends on A1 design choice |
| A5 | Standardize event taxonomy (`guest_message`, `ai_reply`, `n8n_sync_ok/error`) | PLANNED | Dashboard metrics and n8n callbacks use consistent event types | Medium | Team | Required for trustworthy metrics |

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
