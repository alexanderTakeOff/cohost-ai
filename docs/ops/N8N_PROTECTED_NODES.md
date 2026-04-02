# n8n Protected Nodes (Do Not Edit By Default)

These nodes are considered critical and should **not** be modified unless the task explicitly requires it.

## Rules

- Do not change webhook paths or webhook IDs without an approved plan.
- Do not rename protected nodes unless migration notes are prepared.
- Do not re-create protected nodes if a field-level edit is possible.

## Current Protected Nodes

From workflow `cohost-tenant-sync`:

- `Webhook` (`n8n-nodes-base.webhook`)  
  Purpose: inbound Hostify/SNS pipeline trigger.
- `Webhook_tenant_sync` (`n8n-nodes-base.webhook`)  
  Purpose: tenant config sync endpoint from app backend.
- `Respond_to_Webhook` (`n8n-nodes-base.respondToWebhook`)  
  Purpose: explicit webhook response path for tenant sync.
- `Trigger` (`n8n-nodes-base.telegramTrigger`)  
  Purpose: Telegram command/testing trigger.
- `Error Trigger` (`n8n-nodes-base.errorTrigger`)  
  Purpose: centralized error handling entrypoint.

## Change Protocol for Protected Nodes

1. Create or update an ADR explaining why the protected node must change.
2. Record node names + IDs in `CHANGELOG_N8N.md` before and after.
3. Run full smoke tests:
   - onboarding save
   - tenant sync
   - one real message processing path
4. Keep rollback instructions in the change log entry.
