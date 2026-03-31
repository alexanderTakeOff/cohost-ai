import { randomUUID } from "node:crypto";

import { getN8nEnv } from "@/lib/n8n/env";
import { signPayload } from "@/lib/n8n/signer";
import type { TenantRecord } from "@/lib/tenant/types";

type N8nSyncPayload = {
  event: "tenant_config_sync";
  tenantId: string;
  mode: TenantRecord["mode"];
  telegramChatId: string | null;
  hostifyApiKey: string | null;
  sentAt: string;
};

export async function sendTenantConfigToN8n(
  tenant: TenantRecord,
  decryptedHostifyKey: string | null,
) {
  const { webhookUrl, webhookSecret } = getN8nEnv();

  const payload: N8nSyncPayload = {
    event: "tenant_config_sync",
    tenantId: tenant.id,
    mode: tenant.mode,
    telegramChatId: tenant.telegram_chat_id,
    hostifyApiKey: decryptedHostifyKey,
    sentAt: new Date().toISOString(),
  };

  const body = JSON.stringify(payload);
  const timestamp = Date.now().toString();
  const signature = signPayload(body, timestamp, webhookSecret);
  const idempotencyKey = randomUUID();
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cohost-signature": signature,
      "x-cohost-timestamp": timestamp,
      "x-cohost-idempotency-key": idempotencyKey,
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`n8n webhook failed (${response.status}): ${text}`);
  }

  return idempotencyKey;
}
