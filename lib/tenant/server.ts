import { decryptSecret, encryptSecret } from "@/lib/security/secret-box";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { parseTenantMode } from "./validators";
import type { TenantMetrics, TenantMode, TenantRecord } from "./types";

export type OnboardingInput = {
  hostifyApiKey?: string;
  telegramChatId: string;
  mode: TenantMode;
};

export async function getCurrentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user.id;
}

export async function getTenantForCurrentUser() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<TenantRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function upsertTenantForCurrentUser(input: OnboardingInput) {
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("You must be logged in.");
  }

  const supabase = await createClient();
  const { data: existingTenant, error: existingTenantError } = await supabase
    .from("tenants")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<TenantRecord>();

  if (existingTenantError) {
    throw new Error(existingTenantError.message);
  }

  const encryptedHostifyKey = input.hostifyApiKey
    ? encryptSecret(input.hostifyApiKey)
    : existingTenant?.hostify_api_key_encrypted ?? null;

  if (!encryptedHostifyKey) {
    throw new Error("Hostify API key is required.");
  }

  const payload = {
    user_id: userId,
    hostify_api_key_encrypted: encryptedHostifyKey,
    telegram_chat_id: input.telegramChatId,
    mode: parseTenantMode(input.mode),
    is_active: true,
  };

  const { data, error } = await supabase
    .from("tenants")
    .upsert(payload, {
      onConflict: "user_id",
    })
    .select("*")
    .single<TenantRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getTenantMetrics(tenantId: string): Promise<TenantMetrics> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tenant_events")
    .select("event_type,created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error(error.message);
  }

  const events = data ?? [];
  let aiReplies = 0;
  let guestMessages = 0;

  for (const event of events) {
    if (event.event_type === "ai_reply") {
      aiReplies += 1;
    }
    if (event.event_type === "guest_message") {
      guestMessages += 1;
    }
  }

  return {
    totalEvents: events.length,
    aiReplies,
    guestMessages,
    lastEventAt: events[0]?.created_at ?? null,
  };
}

export async function addTenantEvent(
  tenantId: string,
  eventType: string,
  payload: Record<string, unknown>,
  idempotencyKey?: string,
) {
  const supabase = await createClient();
  const insertPayload = {
    tenant_id: tenantId,
    event_type: eventType,
    payload,
    idempotency_key: idempotencyKey ?? null,
  };

  const { error } = await supabase.from("tenant_events").insert(insertPayload);

  if (error) {
    throw new Error(error.message);
  }
}

export async function addTenantEventWithAdmin(
  tenantId: string,
  eventType: string,
  payload: Record<string, unknown>,
  idempotencyKey?: string,
) {
  const supabase = createAdminClient();
  const insertPayload = {
    tenant_id: tenantId,
    event_type: eventType,
    payload,
    idempotency_key: idempotencyKey ?? null,
  };

  const { error } = await supabase.from("tenant_events").insert(insertPayload);
  if (error) {
    throw new Error(error.message);
  }
}

export function getMaskedHostifyKey(record: TenantRecord | null) {
  if (!record?.hostify_api_key_encrypted) {
    return null;
  }

  try {
    const decrypted = decryptSecret(record.hostify_api_key_encrypted);
    if (decrypted.length <= 8) {
      return "********";
    }

    return `${decrypted.slice(0, 4)}...${decrypted.slice(-4)}`;
  } catch {
    return "********";
  }
}

export function getDecryptedHostifyKey(record: TenantRecord | null) {
  if (!record?.hostify_api_key_encrypted) {
    return null;
  }

  return decryptSecret(record.hostify_api_key_encrypted);
}
