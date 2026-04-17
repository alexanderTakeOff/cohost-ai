export const TenantEventType = {
  GUEST_MESSAGE: "guest_message",
  AI_REPLY: "ai_reply",
  N8N_SYNC_OK: "n8n_sync_ok",
  N8N_SYNC_ERROR: "n8n_sync_error",
  N8N_SYNC_SENT: "n8n_sync_sent",
  ONBOARDING_UPDATED: "onboarding_updated",
  LISTINGS_REFRESHED: "listings_refreshed",
  LISTING_STATUS_CHANGED: "listing_status_changed",
  LISTING_INACTIVE_BLOCKED: "listing_inactive_blocked",
  RUNTIME_RESOLUTION_OBSERVED: "runtime_resolution_observed",
  LISTING_MAPPING_BACKFILLED: "listing_mapping_backfilled",
  RUNTIME_CONFIG_MISSING: "runtime_config_missing",
} as const;

export type TenantEventType = (typeof TenantEventType)[keyof typeof TenantEventType];
export type CanonicalEventType = TenantEventType;

type EventPayloadBase = {
  tenantId: string;
  source?: "app" | "n8n_callback";
  listingId?: string | null;
  threadId?: string | null;
  reservationId?: string | null;
  eventVersion?: number;
  emittedAt?: string;
};

type PayloadContext = {
  tenantId: string;
  source: "app" | "n8n_callback";
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstString(payload: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = asString(payload[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

const EXTERNAL_EVENT_ALIASES: Record<string, TenantEventType> = {
  onboarding_saved: TenantEventType.ONBOARDING_UPDATED,
  tenant_config_updated: TenantEventType.ONBOARDING_UPDATED,
  onboarding_updated: TenantEventType.ONBOARDING_UPDATED,
  n8n_sync_ok: TenantEventType.N8N_SYNC_OK,
  n8n_sync_success: TenantEventType.N8N_SYNC_OK,
  n8n_sync_error: TenantEventType.N8N_SYNC_ERROR,
  n8n_sync_sent: TenantEventType.N8N_SYNC_SENT,
  listings_refreshed: TenantEventType.LISTINGS_REFRESHED,
  listing_status_changed: TenantEventType.LISTING_STATUS_CHANGED,
  guest_message: TenantEventType.GUEST_MESSAGE,
  guest_message_received: TenantEventType.GUEST_MESSAGE,
  inbound_guest_message: TenantEventType.GUEST_MESSAGE,
  ai_reply: TenantEventType.AI_REPLY,
  ai_response: TenantEventType.AI_REPLY,
  assistant_reply: TenantEventType.AI_REPLY,
  assistant_response: TenantEventType.AI_REPLY,
  listing_inactive_blocked: TenantEventType.LISTING_INACTIVE_BLOCKED,
  runtime_resolution_observed: TenantEventType.RUNTIME_RESOLUTION_OBSERVED,
  listing_mapping_backfilled: TenantEventType.LISTING_MAPPING_BACKFILLED,
  runtime_config_missing: TenantEventType.RUNTIME_CONFIG_MISSING,
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

export function canonicalizeExternalEventType(eventTypeRaw: string): TenantEventType {
  const normalized = eventTypeRaw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (EXTERNAL_EVENT_ALIASES[normalized]) {
    return EXTERNAL_EVENT_ALIASES[normalized];
  }
  // Runtime-safe heuristics for callback payloads with inconsistent naming.
  if (normalized.includes("guest") && normalized.includes("message")) {
    return TenantEventType.GUEST_MESSAGE;
  }
  if (
    (normalized.includes("ai") || normalized.includes("assistant")) &&
    (normalized.includes("reply") || normalized.includes("response") || normalized.includes("message"))
  ) {
    return TenantEventType.AI_REPLY;
  }
  if (normalized.includes("runtime") && normalized.includes("config") && normalized.includes("missing")) {
    return TenantEventType.RUNTIME_CONFIG_MISSING;
  }
  if (normalized.includes("runtime") && normalized.includes("resolution")) {
    return TenantEventType.RUNTIME_RESOLUTION_OBSERVED;
  }
  if (normalized.includes("listing") && normalized.includes("backfill")) {
    return TenantEventType.LISTING_MAPPING_BACKFILLED;
  }
  if (normalized.includes("listing") && normalized.includes("inactive")) {
    return TenantEventType.LISTING_INACTIVE_BLOCKED;
  }
  if (normalized.includes("listing") && normalized.includes("refresh")) {
    return TenantEventType.LISTINGS_REFRESHED;
  }
  if (normalized.includes("listing") && normalized.includes("status")) {
    return TenantEventType.LISTING_STATUS_CHANGED;
  }
  if (normalized.includes("sync") && (normalized.includes("ok") || normalized.includes("success"))) {
    return TenantEventType.N8N_SYNC_OK;
  }
  if (normalized.includes("sync") && normalized.includes("sent")) {
    return TenantEventType.N8N_SYNC_SENT;
  }
  if (normalized.includes("sync") && (normalized.includes("error") || normalized.includes("fail"))) {
    return TenantEventType.N8N_SYNC_ERROR;
  }
  if (
    (normalized.includes("onboarding") || normalized.includes("tenant_config")) &&
    (normalized.includes("save") || normalized.includes("update"))
  ) {
    return TenantEventType.ONBOARDING_UPDATED;
  }
  return TenantEventType.N8N_SYNC_ERROR;
}

export function createEventPayload(payload: EventPayloadBase & Record<string, unknown>) {
  return enrichEventPayload(payload, {
    tenantId: payload.tenantId,
    source: payload.source ?? "app",
  });
}

export function enrichEventPayload(payload: Record<string, unknown>, context: PayloadContext) {
  const listingObject = asRecord(payload.listing);
  const threadObject = asRecord(payload.thread);
  const reservationObject = asRecord(payload.reservation);
  const eventVersion =
    typeof payload.eventVersion === "number" && Number.isFinite(payload.eventVersion)
      ? payload.eventVersion
      : 1;
  return {
    ...payload,
    tenantId: asString(payload.tenantId) ?? context.tenantId,
    source: asString(payload.source) ?? context.source,
    listingId:
      firstString(
        payload,
        "listingId",
        "listing_id",
        "canonicalListingId",
        "canonical_listing_id",
        "webhookListingId",
        "webhook_listing_id",
      ) ??
      firstString(listingObject, "id", "listingId", "listing_id"),
    threadId:
      firstString(payload, "threadId", "thread_id") ??
      firstString(threadObject, "id", "threadId", "thread_id"),
    reservationId:
      firstString(payload, "reservationId", "reservation_id", "bookingId", "booking_id") ??
      firstString(reservationObject, "id", "reservationId", "reservation_id", "bookingId", "booking_id"),
    eventVersion,
    emittedAt: asString(payload.emittedAt) ?? new Date().toISOString(),
  };
}

export function normalizeTenantEventPayload(
  eventType: TenantEventType,
  payload: Record<string, unknown>,
  context: PayloadContext,
) {
  const enriched = enrichEventPayload(payload, context);
  if (eventType !== TenantEventType.AI_REPLY) {
    return enriched;
  }

  const aiCostUsd = asNumber(payload.aiCostUsd ?? payload.ai_cost_usd);
  const aiInputTokens = asNumber(payload.aiInputTokens ?? payload.ai_input_tokens);
  const aiOutputTokens = asNumber(payload.aiOutputTokens ?? payload.ai_output_tokens);
  const aiTotalTokens =
    asNumber(payload.aiTotalTokens ?? payload.ai_total_tokens) ??
    Math.max(0, (aiInputTokens ?? 0) + (aiOutputTokens ?? 0));
  const aiModel = asString(payload.aiModel ?? payload.ai_model);

  return {
    ...enriched,
    aiCostUsd: aiCostUsd ?? 0,
    aiInputTokens: aiInputTokens ?? 0,
    aiOutputTokens: aiOutputTokens ?? 0,
    aiTotalTokens,
    aiModel,
  };
}
