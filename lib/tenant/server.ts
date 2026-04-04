import { decryptSecret, encryptSecret } from "@/lib/security/secret-box";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { parseTenantMode } from "./validators";
import { type CanonicalEventType, normalizeTenantEventPayload } from "./events";
import type {
  AiCostEstimation,
  HostAccountListingAliasType,
  ListingEconomicsRow,
  TenantEconomicsMetrics,
  HostAccountListingRecord,
  TenantMetrics,
  TenantMode,
  TenantRecord,
} from "./types";

export type OnboardingInput = {
  hostifyApiKey?: string;
  telegramChatId: string;
  globalInstructions?: string | null;
  mode: TenantMode;
};

type HostifyListingSyncRecord = {
  listingId: string;
  listingName: string | null;
  channelListingId: string | null;
  targetId: string | null;
  parentListingId: string | null;
  accountId: string | null;
  hostifyAccountRef: string | null;
};

type UpsertHostAccountListingInput = {
  listingName?: string | null;
  channelListingId?: string | null;
  targetId?: string | null;
  parentListingId?: string | null;
  accountId?: string | null;
  hostifyAccountRef?: string | null;
  active?: boolean;
  lastSeenAt?: string | null;
};

type RuntimeResolverContext = {
  threadId?: string | null;
  reservationId?: string | null;
  hostifyAccountRef?: string | null;
};

type HostifyListingsResponseEnvelope = {
  listings?: unknown;
  data?: unknown;
  body?: unknown;
  response?: unknown;
};

const HOSTIFY_LISTINGS_ENDPOINT = "https://api-rms.hostify.com/listings";

function isMissingColumnError(error: { message?: string } | null, columnName: string) {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes(`column`) && message.includes(columnName.toLowerCase()) && message.includes("does not exist");
}

function normalizeListingRow(row: Record<string, unknown>): HostAccountListingRecord {
  return {
    id: toStringOrNull(row.id) ?? "",
    tenant_id: toStringOrNull(row.tenant_id) ?? "",
    listing_id: toStringOrNull(row.listing_id) ?? "",
    listing_name: toStringOrNull(row.listing_name),
    channel_listing_id: toStringOrNull(row.channel_listing_id),
    target_id: toStringOrNull(row.target_id),
    parent_listing_id: toStringOrNull(row.parent_listing_id),
    account_id: toStringOrNull(row.account_id),
    hostify_account_ref: toStringOrNull(row.hostify_account_ref),
    active: Boolean(row.active),
    last_seen_at: toStringOrNull(row.last_seen_at),
    created_at: toStringOrNull(row.created_at) ?? "",
    updated_at: toStringOrNull(row.updated_at) ?? "",
  };
}

function toLosslessId(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Number.isSafeInteger(value)) {
      return String(value);
    }
    return null;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function pickListingArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  const envelope = payload as HostifyListingsResponseEnvelope;

  if (Array.isArray(envelope.listings)) {
    return envelope.listings;
  }
  if (Array.isArray(envelope.data)) {
    return envelope.data;
  }
  if (isRecord(envelope.data) && Array.isArray(envelope.data.listings)) {
    return envelope.data.listings;
  }
  if (isRecord(envelope.body) && Array.isArray(envelope.body.listings)) {
    return envelope.body.listings;
  }
  if (isRecord(envelope.response)) {
    const response = envelope.response as HostifyListingsResponseEnvelope;
    if (isRecord(response.body) && Array.isArray(response.body.listings)) {
      return response.body.listings;
    }
    if (Array.isArray(response.listings)) {
      return response.listings;
    }
  }

  return [];
}

function normalizeHostifyListing(item: unknown): HostifyListingSyncRecord | null {
  if (!isRecord(item)) {
    return null;
  }

  const listingId = toStringOrNull(item.id);
  if (!listingId) {
    return null;
  }

  return {
    listingId,
    listingName: toStringOrNull(item.name),
    channelListingId: toLosslessId(
      item.channel_listing_id ?? item.channelListingId ?? item.channel_id ?? item.channelId,
    ),
    targetId: toLosslessId(item.target_id ?? item.targetId),
    parentListingId: toLosslessId(item.parent_listing_id ?? item.parentListingId),
    accountId: toLosslessId(item.customer_id ?? item.customerId),
    hostifyAccountRef: toStringOrNull(
      item.hostify_account_ref ?? item.hostifyAccountRef ?? item.account_id ?? item.accountId,
    ),
  };
}

async function fetchHostifyListings(hostifyApiKey: string): Promise<HostifyListingSyncRecord[]> {
  const perPage = 50;
  const maxPages = 100;
  const allListings: HostifyListingSyncRecord[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const url = new URL(HOSTIFY_LISTINGS_ENDPOINT);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("include_related_objects", "1");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "content-type": "application/json",
        "x-api-key": hostifyApiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Hostify listings fetch failed (${response.status}): ${responseText.slice(0, 500)}`,
      );
    }

    const payload = (await response.json()) as unknown;
    const pageItems = pickListingArray(payload);
    const normalized = pageItems
      .map((item) => normalizeHostifyListing(item))
      .filter((item): item is HostifyListingSyncRecord => item !== null);

    if (normalized.length === 0) {
      break;
    }

    allListings.push(...normalized);

    if (pageItems.length < perPage) {
      break;
    }
  }

  const deduped = new Map<string, HostifyListingSyncRecord>();
  for (const listing of allListings) {
    deduped.set(listing.listingId, listing);
  }

  return [...deduped.values()];
}

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
    global_instructions:
      input.globalInstructions !== undefined
        ? input.globalInstructions
        : existingTenant?.global_instructions ?? null,
    mode: parseTenantMode(input.mode),
    is_active: true,
  };

  const firstAttempt = await supabase
    .from("tenants")
    .upsert(payload, {
      onConflict: "user_id",
    })
    .select("*")
    .single<TenantRecord>();

  if (!firstAttempt.error) {
    return firstAttempt.data;
  }

  if (!isMissingColumnError(firstAttempt.error, "global_instructions")) {
    throw new Error(firstAttempt.error.message);
  }

  // Backward compatibility: allow save before global_instructions migration is applied.
  const legacyPayload = {
    user_id: userId,
    hostify_api_key_encrypted: encryptedHostifyKey,
    telegram_chat_id: input.telegramChatId,
    mode: parseTenantMode(input.mode),
    is_active: true,
  };
  const legacyAttempt = await supabase
    .from("tenants")
    .upsert(legacyPayload, {
      onConflict: "user_id",
    })
    .select("*")
    .single<TenantRecord>();

  if (legacyAttempt.error) {
    throw new Error(legacyAttempt.error.message);
  }

  return legacyAttempt.data;
}

export async function getTenantMetrics(tenantId: string): Promise<TenantMetrics> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tenant_events")
    .select("event_type,created_at,payload")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error(error.message);
  }

  const events = data ?? [];
  let aiReplies = 0;
  let guestMessages = 0;
  let aiCostUsd = 0;
  let aiInputTokens = 0;
  let aiOutputTokens = 0;

  for (const event of events) {
    if (event.event_type === "ai_reply") {
      aiReplies += 1;
      const payload = (event.payload ?? {}) as Record<string, unknown>;
      const costValue = payload.aiCostUsd;
      const inputTokens = payload.aiInputTokens;
      const outputTokens = payload.aiOutputTokens;
      if (typeof costValue === "number" && Number.isFinite(costValue)) {
        aiCostUsd += costValue;
      }
      if (typeof inputTokens === "number" && Number.isFinite(inputTokens)) {
        aiInputTokens += inputTokens;
      }
      if (typeof outputTokens === "number" && Number.isFinite(outputTokens)) {
        aiOutputTokens += outputTokens;
      }
    }
    if (event.event_type === "guest_message") {
      guestMessages += 1;
    }
  }

  return {
    totalEvents: events.length,
    aiReplies,
    guestMessages,
    aiCostUsd,
    aiInputTokens,
    aiOutputTokens,
    lastEventAt: events[0]?.created_at ?? null,
  };
}

export async function addTenantEvent(
  tenantId: string,
  eventType: CanonicalEventType,
  payload: Record<string, unknown>,
  idempotencyKey?: string,
) {
  const supabase = await createClient();
  const normalizedPayload = normalizeTenantEventPayload(eventType, payload, {
    tenantId,
    source: "app",
  });
  const insertPayload = {
    tenant_id: tenantId,
    event_type: eventType,
    payload: normalizedPayload,
    idempotency_key: idempotencyKey ?? null,
  };

  const { error } = await supabase.from("tenant_events").insert(insertPayload);

  if (error) {
    throw new Error(error.message);
  }
}

export async function addTenantEventWithAdmin(
  tenantId: string,
  eventType: CanonicalEventType,
  payload: Record<string, unknown>,
  idempotencyKey?: string,
) {
  const supabase = createAdminClient();
  const normalizedPayload = normalizeTenantEventPayload(eventType, payload, {
    tenantId,
    source: "n8n_callback",
  });
  const insertPayload = {
    tenant_id: tenantId,
    event_type: eventType,
    payload: normalizedPayload,
    idempotency_key: idempotencyKey ?? null,
  };

  const { error } = await supabase.from("tenant_events").insert(insertPayload);
  if (error) {
    throw new Error(error.message);
  }
}

export async function getTenantEconomicsMetrics(tenantId: string): Promise<TenantEconomicsMetrics> {
  const supabase = await createClient();
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .maybeSingle<TenantRecord>();
  if (tenantError) {
    throw new Error(tenantError.message);
  }
  if (!tenant) {
    throw new Error("Tenant not found.");
  }

  const { data, error } = await supabase
    .from("tenant_events")
    .select("event_type,payload")
    .eq("tenant_id", tenantId)
    .in("event_type", ["guest_message", "ai_reply"]);

  if (error) {
    throw new Error(error.message);
  }

  let guestMessages = 0;
  let aiReplies = 0;
  let aiCostUsd = 0;
  let aiInputTokens = 0;
  let aiOutputTokens = 0;

  for (const event of data ?? []) {
    if (event.event_type === "guest_message") {
      guestMessages += 1;
      continue;
    }
    if (event.event_type === "ai_reply") {
      aiReplies += 1;
      const payload = (event.payload ?? {}) as Record<string, unknown>;
      if (typeof payload.aiCostUsd === "number" && Number.isFinite(payload.aiCostUsd)) {
        aiCostUsd += payload.aiCostUsd;
      }
      if (typeof payload.aiInputTokens === "number" && Number.isFinite(payload.aiInputTokens)) {
        aiInputTokens += payload.aiInputTokens;
      }
      if (typeof payload.aiOutputTokens === "number" && Number.isFinite(payload.aiOutputTokens)) {
        aiOutputTokens += payload.aiOutputTokens;
      }
    }
  }

  const laborRate = Number(tenant.labor_hourly_rate_usd ?? 0);
  const avgMinutes = Number(tenant.avg_handle_minutes_per_message ?? 0);
  const estimatedHoursSaved = aiReplies * (avgMinutes / 60);
  const estimatedLaborSavedUsd = estimatedHoursSaved * laborRate;
  const netValueUsd = estimatedLaborSavedUsd - aiCostUsd;

  return {
    guestMessages,
    aiReplies,
    aiCostUsd,
    aiInputTokens,
    aiOutputTokens,
    laborRateUsd: laborRate,
    avgHandleMinutesPerMessage: avgMinutes,
    estimatedHoursSaved,
    estimatedLaborSavedUsd,
    netValueUsd,
  };
}

export async function getListingEconomicsForCurrentUser(): Promise<ListingEconomicsRow[]> {
  const tenant = await getTenantForCurrentUser();
  if (!tenant) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenant_events")
    .select("event_type,payload")
    .eq("tenant_id", tenant.id)
    .in("event_type", ["guest_message", "ai_reply"]);

  if (error) {
    throw new Error(error.message);
  }

  const map = new Map<string, ListingEconomicsRow>();
  for (const event of data ?? []) {
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    const listingId =
      typeof payload.listingId === "string"
        ? payload.listingId
        : typeof payload.listing_id === "string"
          ? payload.listing_id
          : null;
    if (!listingId) {
      continue;
    }

    const row =
      map.get(listingId) ??
      ({
        listingId,
        guestMessages: 0,
        aiReplies: 0,
        aiCostUsd: 0,
      } satisfies ListingEconomicsRow);

    if (event.event_type === "guest_message") {
      row.guestMessages += 1;
    } else if (event.event_type === "ai_reply") {
      row.aiReplies += 1;
      if (typeof payload.aiCostUsd === "number" && Number.isFinite(payload.aiCostUsd)) {
        row.aiCostUsd += payload.aiCostUsd;
      }
    }

    map.set(listingId, row);
  }

  return [...map.values()].sort((a, b) => a.listingId.localeCompare(b.listingId));
}

export async function updateTenantEconomicsSettingsForCurrentUser(input: {
  laborRateUsd: number;
  avgMinutesPerMessage: number;
}) {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("You must be logged in.");
  }

  const laborRate = Number.isFinite(input.laborRateUsd) ? Math.max(input.laborRateUsd, 0) : 0;
  const avgMinutes = Number.isFinite(input.avgMinutesPerMessage)
    ? Math.max(input.avgMinutesPerMessage, 0)
    : 0;

  const supabase = await createClient();
  const firstAttempt = await supabase
    .from("tenants")
    .update({
      labor_hourly_rate_usd: laborRate,
      avg_handle_minutes_per_message: avgMinutes,
    })
    .eq("user_id", userId)
    .select("*")
    .single<TenantRecord>();

  if (!firstAttempt.error) {
    return firstAttempt.data;
  }

  const isLegacySchemaError =
    isMissingColumnError(firstAttempt.error, "labor_hourly_rate_usd") ||
    isMissingColumnError(firstAttempt.error, "avg_handle_minutes_per_message");
  if (!isLegacySchemaError) {
    throw new Error(firstAttempt.error.message);
  }

  const fallbackAttempt = await supabase
    .from("tenants")
    .select("*")
    .eq("user_id", userId)
    .single<TenantRecord>();
  if (fallbackAttempt.error) {
    throw new Error(fallbackAttempt.error.message);
  }
  return fallbackAttempt.data;
}

export function estimateAiCostFromUsage(input: {
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
}): AiCostEstimation {
  const model = (input.model ?? "unknown").toString();
  const inputTokens = Number(input.inputTokens ?? 0);
  const outputTokens = Number(input.outputTokens ?? 0);
  const totalTokens =
    Number(input.totalTokens ?? 0) || (Number.isFinite(inputTokens) ? inputTokens : 0) + (Number.isFinite(outputTokens) ? outputTokens : 0);

  const safeInput = Number.isFinite(inputTokens) && inputTokens > 0 ? inputTokens : 0;
  const safeOutput = Number.isFinite(outputTokens) && outputTokens > 0 ? outputTokens : 0;
  const safeTotal = Number.isFinite(totalTokens) && totalTokens > 0 ? totalTokens : safeInput + safeOutput;

  const ratesByModel: Record<string, { inPer1k: number; outPer1k: number }> = {
    "gpt-4o-mini": { inPer1k: 0.00015, outPer1k: 0.0006 },
    "gpt-4o": { inPer1k: 0.005, outPer1k: 0.015 },
  };
  const rates = ratesByModel[model] ?? ratesByModel["gpt-4o-mini"];
  const estimatedCostUsd = (safeInput / 1000) * rates.inPer1k + (safeOutput / 1000) * rates.outPer1k;

  return {
    model,
    inputTokens: safeInput,
    outputTokens: safeOutput,
    totalTokens: safeTotal,
    estimatedCostUsd,
  };
}

export async function upsertHostAccountListing(
  tenantId: string,
  listingId: string,
  input?: UpsertHostAccountListingInput,
) {
  const supabase = createAdminClient();
  const payload: Record<string, unknown> = {
    tenant_id: tenantId,
    listing_id: listingId,
    listing_name: input?.listingName ?? null,
    channel_listing_id: input?.channelListingId ?? null,
    target_id: input?.targetId ?? null,
    parent_listing_id: input?.parentListingId ?? null,
    account_id: input?.accountId ?? null,
    hostify_account_ref: input?.hostifyAccountRef ?? null,
    active: input?.active ?? true,
    last_seen_at: input?.lastSeenAt ?? null,
  };

  const firstAttempt = await supabase
    .from("host_account_listings")
    .upsert(payload, { onConflict: "tenant_id,listing_id" })
    .select("*")
    .single<HostAccountListingRecord>();
  if (!firstAttempt.error) {
    return firstAttempt.data;
  }

  if (
    !isMissingColumnError(firstAttempt.error, "listing_name") &&
    !isMissingColumnError(firstAttempt.error, "channel_listing_id") &&
    !isMissingColumnError(firstAttempt.error, "last_seen_at") &&
    !isMissingColumnError(firstAttempt.error, "target_id") &&
    !isMissingColumnError(firstAttempt.error, "parent_listing_id") &&
    !isMissingColumnError(firstAttempt.error, "account_id")
  ) {
    throw new Error(firstAttempt.error.message);
  }

  const legacyPayload = {
    tenant_id: tenantId,
    listing_id: listingId,
    hostify_account_ref: input?.hostifyAccountRef ?? null,
    active: input?.active ?? true,
  };
  const legacyAttempt = await supabase
    .from("host_account_listings")
    .upsert(legacyPayload, { onConflict: "tenant_id,listing_id" })
    .select("*")
    .single<HostAccountListingRecord>();

  if (legacyAttempt.error) {
    throw new Error(legacyAttempt.error.message);
  }

  return legacyAttempt.data;
}

async function upsertHostAccountListingAlias(input: {
  tenantId: string;
  canonicalListingId: string;
  aliasType: HostAccountListingAliasType;
  aliasValue: string;
}) {
  const supabase = createAdminClient();
  const aliasValue = input.aliasValue.trim();
  if (!aliasValue) {
    return;
  }
  const payload = {
    tenant_id: input.tenantId,
    canonical_listing_id: input.canonicalListingId,
    alias_type: input.aliasType,
    alias_value: aliasValue,
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("host_account_listing_aliases")
    .upsert(payload, { onConflict: "tenant_id,alias_type,alias_value" });

  if (!error) {
    return;
  }
  if (isMissingColumnError(error, "alias_type") || error.message.toLowerCase().includes("relation \"host_account_listing_aliases\" does not exist")) {
    return;
  }
  throw new Error(error.message);
}

async function findCanonicalListingByAlias(input: {
  listingId: string;
  accountId?: string | null;
}): Promise<HostAccountListingRecord | null> {
  const supabase = createAdminClient();
  const listingId = input.listingId.trim();
  if (!listingId) {
    return null;
  }

  const aliasAttempt = await supabase
    .from("host_account_listing_aliases")
    .select("tenant_id,canonical_listing_id,last_seen_at")
    .eq("alias_value", listingId)
    .order("last_seen_at", { ascending: false })
    .limit(20);

  if (!aliasAttempt.error && (aliasAttempt.data ?? []).length > 0) {
    const candidates = aliasAttempt.data ?? [];
    for (const row of candidates) {
      const canonicalListingId = toStringOrNull(row.canonical_listing_id);
      const tenantId = toStringOrNull(row.tenant_id);
      if (!canonicalListingId || !tenantId) {
        continue;
      }
      const mappingAttempt = await supabase
        .from("host_account_listings")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("listing_id", canonicalListingId)
        .eq("active", true)
        .maybeSingle<HostAccountListingRecord>();
      if (mappingAttempt.error) {
        throw new Error(mappingAttempt.error.message);
      }
      const mapping = mappingAttempt.data;
      if (!mapping) {
        continue;
      }
      if (input.accountId && mapping.account_id && mapping.account_id !== input.accountId) {
        continue;
      }
      return mapping;
    }
  }

  const fallbackAttempt = await supabase
    .from("host_account_listings")
    .select("*")
    .eq("active", true)
    .or(`target_id.eq.${listingId},parent_listing_id.eq.${listingId}`)
    .limit(20);
  if (fallbackAttempt.error) {
    const msg = fallbackAttempt.error.message.toLowerCase();
    if (
      msg.includes("column") &&
      (msg.includes("target_id") || msg.includes("parent_listing_id")) &&
      msg.includes("does not exist")
    ) {
      return null;
    }
    throw new Error(fallbackAttempt.error.message);
  }

  const rows = (fallbackAttempt.data ?? []) as Record<string, unknown>[];
  for (const row of rows) {
    const mapping = normalizeListingRow(row);
    if (input.accountId && mapping.account_id && mapping.account_id !== input.accountId) {
      continue;
    }
    return mapping;
  }
  return null;
}

async function backfillListingIdentity(input: {
  mapping: HostAccountListingRecord;
  webhookListingId: string;
  context?: RuntimeResolverContext;
}) {
  const tenantId = input.mapping.tenant_id;
  const canonicalListingId = input.mapping.listing_id;
  const nowIso = new Date().toISOString();

  await upsertHostAccountListing(tenantId, canonicalListingId, {
    listingName: input.mapping.listing_name,
    channelListingId: input.mapping.channel_listing_id,
    targetId: input.mapping.target_id,
    parentListingId: input.mapping.parent_listing_id,
    accountId: input.mapping.account_id ?? input.context?.hostifyAccountRef ?? null,
    hostifyAccountRef: input.mapping.hostify_account_ref ?? input.context?.hostifyAccountRef ?? null,
    active: true,
    lastSeenAt: nowIso,
  });

  const aliases: Array<{ aliasType: HostAccountListingAliasType; aliasValue: string | null }> = [
    { aliasType: "webhook_listing_id", aliasValue: input.webhookListingId },
    { aliasType: "target_id", aliasValue: input.mapping.target_id },
    { aliasType: "parent_listing_id", aliasValue: input.mapping.parent_listing_id },
    { aliasType: "channel_listing_id", aliasValue: input.mapping.channel_listing_id },
  ];

  for (const alias of aliases) {
    if (!alias.aliasValue) {
      continue;
    }
    await upsertHostAccountListingAlias({
      tenantId,
      canonicalListingId,
      aliasType: alias.aliasType,
      aliasValue: alias.aliasValue,
    });
  }
}

export async function getHostAccountListingsForCurrentUser() {
  const tenant = await getTenantForCurrentUser();
  if (!tenant) {
    return [];
  }

  const supabase = await createClient();
  const firstAttempt = await supabase
    .from("host_account_listings")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("listing_name", { ascending: true, nullsFirst: false })
    .order("listing_id", { ascending: true });
  if (!firstAttempt.error) {
    return ((firstAttempt.data ?? []) as Record<string, unknown>[]).map(normalizeListingRow);
  }

  if (!isMissingColumnError(firstAttempt.error, "listing_name")) {
    throw new Error(firstAttempt.error.message);
  }

  const legacyAttempt = await supabase
    .from("host_account_listings")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("listing_id", { ascending: true });

  if (legacyAttempt.error) {
    throw new Error(legacyAttempt.error.message);
  }

  return ((legacyAttempt.data ?? []) as Record<string, unknown>[]).map(normalizeListingRow);
}

export async function setHostAccountListingActive(
  tenantId: string,
  listingId: string,
  active: boolean,
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("host_account_listings")
    .update({ active })
    .eq("tenant_id", tenantId)
    .eq("listing_id", listingId)
    .select("*")
    .single<HostAccountListingRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateTenantGlobalInstructionsForCurrentUser(globalInstructions: string | null) {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("You must be logged in.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenants")
    .update({
      global_instructions: globalInstructions,
    })
    .eq("user_id", userId)
    .select("*")
    .single<TenantRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateTenantEconomicAssumptionsForCurrentUser(input: {
  laborCostPerHourUsd: number;
  avgHandleMinutesPerMessage: number;
}) {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("You must be logged in.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenants")
    .update({
      labor_hourly_rate_usd: input.laborCostPerHourUsd,
      avg_handle_minutes_per_message: input.avgHandleMinutesPerMessage,
    })
    .eq("user_id", userId)
    .select("*")
    .single<TenantRecord>();

  if (!error) {
    return data;
  }

  if (
    !isMissingColumnError(error, "labor_hourly_rate_usd") &&
    !isMissingColumnError(error, "avg_handle_minutes_per_message")
  ) {
    throw new Error(error.message);
  }

  // Backward compatibility before economic assumptions migration.
  const { data: existingTenant, error: existingError } = await supabase
    .from("tenants")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<TenantRecord>();
  if (existingError) {
    throw new Error(existingError.message);
  }
  if (!existingTenant) {
    throw new Error("Tenant not found.");
  }
  return existingTenant;
}

export async function setHostAccountListingActiveForCurrentUser(listingId: string, active: boolean) {
  const tenant = await getTenantForCurrentUser();
  if (!tenant) {
    throw new Error("You must be logged in.");
  }

  return setHostAccountListingActive(tenant.id, listingId, active);
}

function normalizeListingIds(values: string[]) {
  const set = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed) {
      set.add(trimmed);
    }
  }
  return [...set];
}

export async function replaceHostAccountListingActiveSet(
  tenantId: string,
  activeListingIds: string[],
) {
  const normalizedIds = normalizeListingIds(activeListingIds);
  const supabase = createAdminClient();

  const { error: disableError } = await supabase
    .from("host_account_listings")
    .update({ active: false })
    .eq("tenant_id", tenantId);

  if (disableError) {
    throw new Error(disableError.message);
  }

  if (normalizedIds.length === 0) {
    return {
      disabledAll: true,
      activated: 0,
    };
  }

  const { error: enableError } = await supabase
    .from("host_account_listings")
    .update({ active: true })
    .eq("tenant_id", tenantId)
    .in("listing_id", normalizedIds);

  if (enableError) {
    throw new Error(enableError.message);
  }

  return {
    disabledAll: false,
    activated: normalizedIds.length,
  };
}

export async function replaceHostAccountListingActiveSetForCurrentUser(activeListingIds: string[]) {
  const tenant = await getTenantForCurrentUser();
  if (!tenant) {
    throw new Error("You must be logged in.");
  }

  return replaceHostAccountListingActiveSet(tenant.id, activeListingIds);
}

export async function syncHostAccountListingsFromHostify(
  tenantId: string,
  hostifyApiKey: string,
) {
  const supabase = createAdminClient();
  const { data: existingMappings, error: existingError } = await supabase
    .from("host_account_listings")
    .select("listing_id,active")
    .eq("tenant_id", tenantId)
    .returns<Array<{ listing_id: string; active: boolean }>>();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingActiveMap = new Map<string, boolean>(
    (existingMappings ?? []).map((row) => [row.listing_id, Boolean(row.active)]),
  );

  const listings = await fetchHostifyListings(hostifyApiKey);
  if (listings.length === 0) {
    return {
      fetched: 0,
      upserted: 0,
    };
  }

  const syncedAt = new Date().toISOString();
  const payload = listings.map((listing) => ({
    tenant_id: tenantId,
    listing_id: listing.listingId,
    listing_name: listing.listingName,
    channel_listing_id: listing.channelListingId,
    target_id: listing.targetId,
    parent_listing_id: listing.parentListingId,
    account_id: listing.accountId,
    hostify_account_ref: listing.hostifyAccountRef,
    active: existingActiveMap.get(listing.listingId) ?? true,
    last_seen_at: syncedAt,
  }));
  const firstAttempt = await supabase
    .from("host_account_listings")
    .upsert(payload, { onConflict: "tenant_id,listing_id" });
  if (firstAttempt.error) {
    const isLegacySchemaError =
      isMissingColumnError(firstAttempt.error, "listing_name") ||
      isMissingColumnError(firstAttempt.error, "channel_listing_id") ||
      isMissingColumnError(firstAttempt.error, "last_seen_at") ||
      isMissingColumnError(firstAttempt.error, "target_id") ||
      isMissingColumnError(firstAttempt.error, "parent_listing_id") ||
      isMissingColumnError(firstAttempt.error, "account_id");

    if (!isLegacySchemaError) {
      throw new Error(firstAttempt.error.message);
    }

    const legacyPayload = listings.map((listing) => ({
      tenant_id: tenantId,
      listing_id: listing.listingId,
      hostify_account_ref: listing.hostifyAccountRef,
      active: existingActiveMap.get(listing.listingId) ?? true,
    }));
    const legacyAttempt = await supabase
      .from("host_account_listings")
      .upsert(legacyPayload, { onConflict: "tenant_id,listing_id" });

    if (legacyAttempt.error) {
      throw new Error(legacyAttempt.error.message);
    }
  }

  for (const listing of listings) {
    const aliases: Array<{ aliasType: HostAccountListingAliasType; aliasValue: string | null }> = [
      { aliasType: "target_id", aliasValue: listing.targetId },
      { aliasType: "parent_listing_id", aliasValue: listing.parentListingId },
      { aliasType: "channel_listing_id", aliasValue: listing.channelListingId },
    ];
    for (const alias of aliases) {
      if (!alias.aliasValue) {
        continue;
      }
      await upsertHostAccountListingAlias({
        tenantId,
        canonicalListingId: listing.listingId,
        aliasType: alias.aliasType,
        aliasValue: alias.aliasValue,
      });
    }
  }

  return {
    fetched: listings.length,
    upserted: payload.length,
  };
}

export async function resolveRuntimeConfigByListing(listingId: string) {
  const supabase = createAdminClient();
  const normalizedListingId = listingId.trim();
  const { data: mapping, error: mappingError } = await supabase
    .from("host_account_listings")
    .select("*")
    .eq("listing_id", normalizedListingId)
    .eq("active", true)
    .maybeSingle<HostAccountListingRecord>();

  if (mappingError) {
    throw new Error(mappingError.message);
  }

  const resolvedMapping =
    mapping ?? (await findCanonicalListingByAlias({ listingId: normalizedListingId }));
  if (!resolvedMapping) {
    return null;
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", resolvedMapping.tenant_id)
    .maybeSingle<TenantRecord>();

  if (tenantError) {
    throw new Error(tenantError.message);
  }

  if (!tenant || !tenant.is_active) {
    return null;
  }

  await backfillListingIdentity({
    mapping: resolvedMapping,
    webhookListingId: normalizedListingId,
  });

  return {
    tenant,
    mapping: resolvedMapping,
    hostifyApiKey: getDecryptedHostifyKey(tenant),
  };
}

function extractHostifyAccountRefFromTopicArn(topicArn: string | null | undefined) {
  if (!topicArn) {
    return null;
  }
  const match = topicArn.match(/hostify-webhook-go-([0-9]+)-/i);
  return match?.[1] ?? null;
}

async function getTenantByHostifyAccountRef(accountRef: string): Promise<TenantRecord | null> {
  const supabase = createAdminClient();
  const mappingAttempt = await supabase
    .from("host_account_listings")
    .select("tenant_id,hostify_account_ref,account_id")
    .eq("active", true)
    .or(`hostify_account_ref.eq.${accountRef},account_id.eq.${accountRef}`)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (mappingAttempt.error) {
    const message = mappingAttempt.error.message.toLowerCase();
    const isMissingAccountId =
      message.includes("column") && message.includes("account_id") && message.includes("does not exist");
    if (!isMissingAccountId) {
      throw new Error(mappingAttempt.error.message);
    }
    const legacyAttempt = await supabase
      .from("host_account_listings")
      .select("tenant_id,hostify_account_ref")
      .eq("active", true)
      .eq("hostify_account_ref", accountRef)
      .order("updated_at", { ascending: false })
      .limit(20);
    if (legacyAttempt.error) {
      throw new Error(legacyAttempt.error.message);
    }
    for (const row of legacyAttempt.data ?? []) {
      const tenantId = toStringOrNull((row as Record<string, unknown>).tenant_id);
      if (!tenantId) {
        continue;
      }
      const tenantAttempt = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .maybeSingle<TenantRecord>();
      if (tenantAttempt.error) {
        throw new Error(tenantAttempt.error.message);
      }
      if (tenantAttempt.data?.is_active) {
        return tenantAttempt.data;
      }
    }
    return null;
  }

  for (const row of (mappingAttempt.data ?? []) as Record<string, unknown>[]) {
    const tenantId = toStringOrNull(row.tenant_id);
    if (!tenantId) {
      continue;
    }
    const tenantAttempt = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .maybeSingle<TenantRecord>();
    if (tenantAttempt.error) {
      throw new Error(tenantAttempt.error.message);
    }
    if (tenantAttempt.data?.is_active) {
      return tenantAttempt.data;
    }
  }
  return null;
}

async function fetchHostifyListingDetailsByListingId(hostifyApiKey: string, listingId: string) {
  const url = `https://api-rms.hostify.com/listings/${encodeURIComponent(listingId)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "content-type": "application/json",
      "x-api-key": hostifyApiKey,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as unknown;
  const listingRoot = isRecord(payload) ? payload : null;
  const body = listingRoot && isRecord(listingRoot.body) ? listingRoot.body : listingRoot;
  const listingObj = body && isRecord(body.listing) ? body.listing : body;
  if (!listingObj || !isRecord(listingObj)) {
    return null;
  }
  const canonicalListingId = toStringOrNull(listingObj.id);
  if (!canonicalListingId) {
    return null;
  }
  return {
    canonicalListingId,
    listingName: toStringOrNull(listingObj.name ?? listingObj.nickname),
    channelListingId: toLosslessId(
      listingObj.channel_listing_id ?? listingObj.channelListingId ?? listingObj.channel_id ?? listingObj.channelId,
    ),
    targetId: toLosslessId(listingObj.target_id ?? listingObj.targetId),
    parentListingId: toLosslessId(listingObj.parent_listing_id ?? listingObj.parentListingId),
    accountId: toLosslessId(listingObj.customer_id ?? listingObj.customerId),
    hostifyAccountRef: toLosslessId(listingObj.customer_id ?? listingObj.customerId),
  };
}

export async function resolveRuntimeConfigByAccountAndListing(input: {
  listingId: string;
  hostifyAccountRef?: string | null;
  threadId?: string | null;
  reservationId?: string | null;
}): Promise<{
  tenant: TenantRecord;
  mapping: HostAccountListingRecord;
  hostifyApiKey: string | null;
  resolutionPath: "direct_mapping" | "alias_mapping" | "details_fallback";
} | null> {
  const listingId = input.listingId.trim();
  if (!listingId) {
    return null;
  }

  const direct = await resolveRuntimeConfigByListing(listingId);
  if (direct) {
    return {
      ...direct,
      resolutionPath: direct.mapping.listing_id === listingId ? "direct_mapping" : "alias_mapping",
    };
  }

  const accountRef = input.hostifyAccountRef?.trim() ?? null;
  if (!accountRef) {
    return null;
  }

  const tenant = await getTenantByHostifyAccountRef(accountRef);
  if (!tenant) {
    return null;
  }
  const hostifyApiKey = getDecryptedHostifyKey(tenant);
  if (!hostifyApiKey) {
    return null;
  }

  const details = await fetchHostifyListingDetailsByListingId(hostifyApiKey, listingId);
  if (!details) {
    return null;
  }

  const upserted = await upsertHostAccountListing(tenant.id, details.canonicalListingId, {
    listingName: details.listingName,
    channelListingId: details.channelListingId,
    targetId: details.targetId,
    parentListingId: details.parentListingId,
    accountId: details.accountId ?? accountRef,
    hostifyAccountRef: details.hostifyAccountRef ?? accountRef,
    active: true,
    lastSeenAt: new Date().toISOString(),
  });

  await backfillListingIdentity({
    mapping: upserted,
    webhookListingId: listingId,
    context: {
      threadId: input.threadId ?? null,
      reservationId: input.reservationId ?? null,
      hostifyAccountRef: accountRef,
    },
  });

  return {
    tenant,
    mapping: upserted,
    hostifyApiKey,
    resolutionPath: "details_fallback",
  };
}

export { extractHostifyAccountRefFromTopicArn };

export type RuntimeResolverResolutionPath =
  | "direct_mapping"
  | "alias_mapping"
  | "details_fallback"
  | "unresolved";

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
