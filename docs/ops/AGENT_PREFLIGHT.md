# Agent Preflight (Token-Optimized)

Read this file at every run.

## Always Read

1. `docs/ops/AGENT_PREFLIGHT.md`
2. `docs/ops/OPS_META.json`

## Read Full Ops Docs Only If

- UTC date changed since last full read
- `ops_version` changed
- task touches n8n/workflows/secrets/incident handling

## Full Ops Docs

- `docs/ops/MVP_EXECUTION_BOARD.md`
- `docs/ops/N8N_RUNBOOK.md`
- `docs/ops/N8N_PROTECTED_NODES.md`
- `docs/ops/CHANGELOG_N8N.md` (required on workflow edits)
- `docs/ops/GLOSSARY.md` (required when discussing architecture/schema naming)

## Non-Negotiable Rule

Do not modify protected webhook nodes unless explicitly requested and tracked.
