# n8n Change Runbook (MVP)

## Purpose
This runbook defines safe, repeatable steps for updating n8n workflows with minimal manual error risk.

## Scope
- Applies to Cohost AI n8n workflows in MVP stage.
- Applies to both production and test edits.

## Safety Rules
1. Do not change protected Webhook nodes (path/webhookId) unless explicitly approved.
2. Prefer editing existing nodes over recreating nodes.
3. Apply one logical change set at a time.
4. After each change set, run smoke tests and record results in `CHANGELOG_N8N.md`.
5. Keep secrets out of node hardcoded values. Use variables/secure storage.

## Required Pre-Change Checklist
- [ ] Confirm target workflow name and environment.
- [ ] Confirm latest execution is healthy (or known failing case documented).
- [ ] Confirm rollback path (previous workflow version/export available).
- [ ] Confirm protected nodes are not part of this edit.

## Change Procedure (Standard)
1. Open workflow and duplicate to a safe draft (if needed).
2. Update only nodes listed in the task checklist.
3. Save workflow.
4. Run test execution for the changed path.
5. Verify expected output and no regression on critical route.
6. Update `CHANGELOG_N8N.md`:
   - Date
   - What changed
   - Node names/ids
   - Test evidence (execution id / result)
7. Mark task status in `MVP_EXECUTION_BOARD.md`.

## Smoke Test Minimum
- Tenant sync webhook returns success for valid signed request.
- Hostify validation path returns expected status.
- Callback to app endpoint returns 200.
- Main guest message processing still sends reply (if should_reply=true).
- Error trigger still sends readable alert message.

## Rollback Procedure
1. Open workflow version history.
2. Revert to last known good version.
3. Re-run one smoke test.
4. Record rollback in `CHANGELOG_N8N.md`.

## Anti-Patterns to Avoid
- Editing multiple unrelated workflows in one pass.
- Mixing architecture changes with urgent bugfixes.
- Keeping hardcoded API keys in HTTP headers.
- Silent changes without changelog/update board entries.
