export type TenantMode = "draft" | "autopilot";

export type TenantRecord = {
  id: string;
  user_id: string;
  hostify_api_key_encrypted: string | null;
  telegram_chat_id: string | null;
  global_instructions: string | null;
  labor_hourly_rate_usd: number | null;
  avg_handle_minutes_per_message: number | null;
  mode: TenantMode;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TenantMetrics = {
  totalEvents: number;
  aiReplies: number;
  guestMessages: number;
  aiCostUsd: number;
  aiInputTokens: number;
  aiOutputTokens: number;
  lastEventAt: string | null;
};

export type TenantEconomicsMetrics = {
  guestMessages: number;
  aiReplies: number;
  aiCostUsd: number;
  aiInputTokens: number;
  aiOutputTokens: number;
  laborRateUsd: number;
  avgHandleMinutesPerMessage: number;
  estimatedHoursSaved: number;
  estimatedLaborSavedUsd: number;
  netValueUsd: number;
};

export type ListingEconomicsRow = {
  listingId: string;
  guestMessages: number;
  aiReplies: number;
  aiCostUsd: number;
};

export type AiCostEstimation = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
};

export type HostAccountListingRecord = {
  id: string;
  tenant_id: string;
  listing_id: string;
  listing_name: string | null;
  channel_listing_id: string | null;
  target_id: string | null;
  parent_listing_id: string | null;
  account_id: string | null;
  hostify_account_ref: string | null;
  active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HostAccountListingAliasType =
  | "webhook_listing_id"
  | "target_id"
  | "parent_listing_id"
  | "channel_listing_id";

export type HostAccountListingAliasRecord = {
  id: string;
  tenant_id: string;
  canonical_listing_id: string;
  alias_type: HostAccountListingAliasType;
  alias_value: string;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};
