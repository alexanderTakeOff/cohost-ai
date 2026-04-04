<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Cohost AI Agent Preflight (Token-Optimized)

Always read before any substantial task:

1. `docs/ops/AGENT_PREFLIGHT.md`
2. `docs/ops/OPS_META.json`

Read full ops docs only when at least one condition is true:

- UTC date changed since last full read
- `ops_version` changed in `OPS_META.json`
- task touches n8n/workflows/secrets/incident handling

Full ops docs set:

- `docs/ops/MVP_EXECUTION_BOARD.md`
- `docs/ops/N8N_RUNBOOK.md`
- `docs/ops/N8N_PROTECTED_NODES.md`
- `docs/ops/CHANGELOG_N8N.md` (required when workflow changes are made)
- `docs/ops/A6_RUNTIME_FIRST_ROUTING_PLAN.md` (required for runtime routing incident tasks)

Never modify protected webhook nodes unless explicitly requested.

## Product-First Incident Guardrails (Mandatory)

When diagnosing runtime incidents, optimize for continuity first.

1. Start with business path, not local stack trace:
   - Priority: guest message processing continuity > onboarding UI consistency.
2. Separate architecture planes before proposing fixes:
   - Runtime plane: webhook -> routing -> response.
   - Control plane: onboarding tables/forms and operator UX.
3. Runtime must not hard-fail because onboarding cache is stale:
   - onboarding listing table is cache/policy, not the sole runtime source of truth.
4. Resolve identity in this order:
   - account identity from trusted transport metadata (e.g. topic/account id),
   - runtime identifiers from webhook/reservation/thread,
   - onboarding cache for display and policy flags.
5. For ID mismatches:
   - avoid strict one-field equality assumptions,
   - prefer canonical ID + alias strategy with safe fallback resolution.
6. Every incident response must include:
   - immediate recovery action,
   - structural long-term fix,
   - explicit distinction between symptom and root cause.
