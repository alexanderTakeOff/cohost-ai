import { NextResponse } from "next/server";

import { hasN8nEnv } from "@/lib/n8n/env";
import { sendTenantConfigToN8n } from "@/lib/n8n/client";
import { createClient } from "@/lib/supabase/server";
import { createEventPayload, TenantEventType } from "@/lib/tenant/events";
import {
  addTenantEvent,
  getDecryptedHostifyKey,
  getTenantForCurrentUser,
  syncHostAccountListingsFromHostify,
  syncTenantHostifyBindingForCurrentUser,
  upsertTenantForCurrentUser,
} from "@/lib/tenant/server";
import { isLikelyTelegramChatId } from "@/lib/tenant/validators";
import type { TenantMode } from "@/lib/tenant/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      hostifyApiKey?: string;
      telegramChatId?: string;
      mode?: TenantMode;
    };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const telegramChatId = typeof body.telegramChatId === "string" ? body.telegramChatId.trim() : "";
    if (!telegramChatId) {
      return NextResponse.json({ error: "Telegram chat id is required." }, { status: 400 });
    }
    if (!isLikelyTelegramChatId(telegramChatId)) {
      return NextResponse.json(
        { error: "Telegram chat id must be numeric (example: -1001234567890)." },
        { status: 400 },
      );
    }

    const existingTenant = await getTenantForCurrentUser();
    const hostifyApiKey =
      typeof body.hostifyApiKey === "string" && body.hostifyApiKey.trim()
        ? body.hostifyApiKey.trim()
        : undefined;

    const tenant = await upsertTenantForCurrentUser({
      hostifyApiKey,
      telegramChatId,
      globalInstructions: existingTenant?.global_instructions ?? "",
      mode: body.mode === "autopilot" ? "autopilot" : "draft",
    });

    const decryptedHostifyKey = getDecryptedHostifyKey(tenant);
    if (!decryptedHostifyKey) {
      return NextResponse.json({ error: "Hostify API key is required." }, { status: 400 });
    }

    const binding = await syncTenantHostifyBindingForCurrentUser(decryptedHostifyKey);
    const syncSummary = await syncHostAccountListingsFromHostify(tenant.id, decryptedHostifyKey);

    await addTenantEvent(
      tenant.id,
      TenantEventType.ONBOARDING_UPDATED,
      createEventPayload({
        tenantId: tenant.id,
        source: "app",
        scope: "chat-account-setup",
        mode: tenant.mode,
        telegramChatId: tenant.telegram_chat_id,
        hostifyCustomerId: binding.binding.customerId,
        hostifyCustomerName: binding.binding.customerName,
        listingsFetched: syncSummary.fetched,
        listingsUpserted: syncSummary.upserted,
      }),
    );

    if (hasN8nEnv()) {
      const idempotencyKey = await sendTenantConfigToN8n(tenant, decryptedHostifyKey);
      await addTenantEvent(
        tenant.id,
        TenantEventType.N8N_SYNC_SENT,
        createEventPayload({
          tenantId: tenant.id,
          source: "app",
          mode: tenant.mode,
        }),
        idempotencyKey,
      );
    }

    return NextResponse.json({
      ok: true,
      tenant: {
        id: tenant.id,
        hostifyCustomerId: binding.binding.customerId,
        hostifyCustomerName: binding.binding.customerName,
        telegramChatId: tenant.telegram_chat_id,
        mode: tenant.mode,
        listingsFetched: syncSummary.fetched,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Account setup failed." },
      { status: 500 },
    );
  }
}
