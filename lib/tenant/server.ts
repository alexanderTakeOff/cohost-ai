import { decryptSecret, encryptSecret } from "@/lib/security/secret-box";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { parseTenantMode } from "./validators";
import type {
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
  hostifyAccountRef: string | null;
};

type UpsertHostAccountListingInput = {
  listingName?: string | null;
  channelListingId?: string | null;
  hostifyAccountRef?: string | null;
  active?: boolean;
  lastSeenAt?: string | null;
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
    hostify_account_ref: toStringOrNull(row.hostify_account_ref),
    active: Boolean(row.active),
    last_seen_at: toStringOrNull(row.last_seen_at),
    created_at: toStringOrNull(row.created_at) ?? "",
    updated_at: toStringOrNull(row.updated_at) ?? "",
  };
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
    channelListingId: toStringOrNull(
      item.channel_listing_id ?? item.channelListingId ?? item.channel_id ?? item.channelId,
    ),
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
    !isMissingColumnError(firstAttempt.error, "last_seen_at")
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
      isMissingColumnError(firstAttempt.error, "last_seen_at");

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

  return {
    fetched: listings.length,
    upserted: payload.length,
  };
}

export async function resolveRuntimeConfigByListing(listingId: string) {
  const supabase = createAdminClient();
  const { data: mapping, error: mappingError } = await supabase
    .from("host_account_listings")
    .select("*")
    .eq("listing_id", listingId)
    .eq("active", true)
    .maybeSingle<HostAccountListingRecord>();

  if (mappingError) {
    throw new Error(mappingError.message);
  }

  if (!mapping) {
    return null;
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", mapping.tenant_id)
    .maybeSingle<TenantRecord>();

  if (tenantError) {
    throw new Error(tenantError.message);
  }

  if (!tenant || !tenant.is_active) {
    return null;
  }

  return {
    tenant,
    mapping,
    hostifyApiKey: getDecryptedHostifyKey(tenant),
  };
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
