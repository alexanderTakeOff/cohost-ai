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

Never modify protected webhook nodes unless explicitly requested.
