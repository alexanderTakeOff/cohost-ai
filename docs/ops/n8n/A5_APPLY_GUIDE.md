# A5 Apply Guide — Telegram runtime routing (tenant-aware)

This step removes tenant Telegram hardcodes from workflow nodes and routes tenant-facing Telegram traffic via runtime config resolved by listing.

## Goal

For runtime message processing:

- tenant-facing Telegram nodes use `runtime_config.telegramChatId`
- if `runtime_config.telegramChatId` is empty, tenant-facing Telegram nodes fall back to `{{$vars.JENNY_TENANT_FALLBACK_CHAT_ID}}`
- platform-owner alerts stay isolated in dedicated global channels
- hardcoded chat IDs are removed from workflow JSON

## Patch file

- `docs/ops/n8n/cohost-tenant-sync.A5-telegram-runtime-routing.json`

## Required n8n variables

Set these in n8n variables before activation:

- `JENNY_OWNER_ALERT_CHAT_ID` — global owner incident chat
- `JENNY_GLOBAL_INSTRUCTIONS_CHAT_ID` — global instructions source chat
- `JENNY_TENANT_FALLBACK_CHAT_ID` — internal fallback chat used when tenant Telegram is not configured

## Node mapping in this patch

- `forward message to Telegram` -> `chatId = {{ $('Normalize_Runtime_Config').first().json.runtime_config.telegramChatId || $vars.JENNY_TENANT_FALLBACK_CHAT_ID }}`
- `Guest_Alerts_Tool` -> `chatId = {{ $('Normalize_Runtime_Config').first().json.runtime_config.telegramChatId || $vars.JENNY_TENANT_FALLBACK_CHAT_ID }}`
- `Team_Messages_Tool` -> `chatId = {{ $('Normalize_Runtime_Config').first().json.runtime_config.telegramChatId || $vars.JENNY_TENANT_FALLBACK_CHAT_ID }}`
- `Error` -> `chatId = {{$vars.JENNY_OWNER_ALERT_CHAT_ID}}`
- `Global_Instructions_Tool` -> `chatId = {{$vars.JENNY_GLOBAL_INSTRUCTIONS_CHAT_ID}}`

## Safe apply (minimal manual)

1. Open workflow `cohost-tenant-sync`.
2. Duplicate workflow to draft.
3. Import `cohost-tenant-sync.A5-telegram-runtime-routing.json`.
4. Verify the 5 node mappings above.
5. Save draft, run smoke checks, then promote.

## Smoke test checklist

1. Webhook event with mapped listing:
   - `Normalize_Runtime_Config` returns runtime config successfully (telegram can be `null`).
2. Tenant path:
   - With tenant chat configured: `forward message to Telegram` sends to tenant chat.
   - Without tenant chat configured: `forward message to Telegram` sends to fallback chat `JENNY_TENANT_FALLBACK_CHAT_ID`.
3. Agent escalation:
   - With tenant chat configured: `Guest_Alerts_Tool` posts into tenant chat.
   - Without tenant chat configured: `Guest_Alerts_Tool` posts into fallback chat.
4. Team assistant path:
   - With tenant chat configured: `Team_Messages_Tool` posts into tenant chat/thread.
   - Without tenant chat configured: `Team_Messages_Tool` posts into fallback chat/thread.
5. Error path:
   - `Error` alert still goes to owner alert channel.

## Rollback

1. Revert workflow to previous version in n8n version history.
2. Re-run one runtime message smoke test.
3. Record rollback in `docs/ops/CHANGELOG_N8N.md`.
