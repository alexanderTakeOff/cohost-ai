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

const EXTERNAL_EVENT_ALIASES: Record<string, TenantEventType> = {
  onboarding_saved: TenantEventType.ONBOARDING_UPDATED,
  tenant_config_updated: TenantEventType.ONBOARDING_UPDATED,
  n8n_sync_ok: TenantEventType.N8N_SYNC_OK,
  n8n_sync_error: TenantEventType.N8N_SYNC_ERROR,
  n8n_sync_sent: TenantEventType.N8N_SYNC_SENT,
  listings_refreshed: TenantEventType.LISTINGS_REFRESHED,
  listing_status_changed: TenantEventType.LISTING_STATUS_CHANGED,
  guest_message: TenantEventType.GUEST_MESSAGE,
  ai_reply: TenantEventType.AI_REPLY,
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
  const normalized = eventTypeRaw.trim().toLowerCase();
  return EXTERNAL_EVENT_ALIASES[normalized] ?? TenantEventType.N8N_SYNC_ERROR;
}

export function createEventPayload(payload: EventPayloadBase & Record<string, unknown>) {
  return enrichEventPayload(payload, {
    tenantId: payload.tenantId,
    source: payload.source ?? "app",
  });
}

export function enrichEventPayload(payload: Record<string, unknown>, context: PayloadContext) {
  const eventVersion =
    typeof payload.eventVersion === "number" && Number.isFinite(payload.eventVersion)
      ? payload.eventVersion
      : 1;
  return {
    ...payload,
    tenantId: asString(payload.tenantId) ?? context.tenantId,
    source: asString(payload.source) ?? context.source,
    listingId: asString(payload.listingId) ?? asString(payload.listing_id),
    threadId: asString(payload.threadId) ?? asString(payload.thread_id),
    reservationId: asString(payload.reservationId) ?? asString(payload.reservation_id),
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
