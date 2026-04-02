# ADR-0001: Hybrid architecture for Cohost AI MVP

- Status: Accepted
- Date: 2026-04-01
- Decision owners: Product + Engineering

## Context

The current system combines:

- Next.js app (auth, onboarding, dashboard, tenant config)
- Supabase (auth + data)
- n8n workflows (orchestration, tool calls, Hostify/Telegram integration)

The n8n workflow is already feature-rich and operationally complex (multiple triggers, agents, tools, code nodes).
Immediate full rewrite into app code would introduce high regression risk and high implementation cost.

## Decision

Adopt a hybrid architecture for MVP:

1. Keep n8n as runtime orchestration engine for AI and external integrations.
2. Keep Next.js + Supabase as identity, configuration, and operational control plane.
3. Incrementally harden n8n (remove hardcoded secrets, improve error telemetry, tenant-safe config usage).
4. Defer full rewrite until scaling and operational metrics justify migration.

## Rationale

- Lowest delivery risk for current stage.
- Fastest path to stable multi-tenant MVP.
- Preserves existing working automations.
- Enables gradual migration later without service interruption.

## Consequences

Positive:

- Faster iteration speed now.
- Lower probability of breakage in guest communication flows.
- Clear split between control plane and execution plane.

Trade-offs:

- Temporary dual-stack complexity (app + n8n).
- Need for process discipline around n8n changes and runbooks.

## Exit criteria for reconsidering full migration

Re-open architecture decision when one or more are true:

- sustained throughput/latency limits in n8n
- operational overhead exceeds acceptable threshold
- frequent incidents caused by orchestration complexity
- product roadmap requires capabilities better served by custom runtime
